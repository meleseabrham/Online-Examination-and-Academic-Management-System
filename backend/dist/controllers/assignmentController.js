import { sql, poolPromise } from '../config/db.js';
let migrationDone = false;
const ensureSchema = async (pool) => {
    if (migrationDone)
        return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Assignments' AND COLUMN_NAME = 'SemesterId'
            )
            BEGIN
                ALTER TABLE Assignments ADD SemesterId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Assignments_Semesters')
                BEGIN
                    ALTER TABLE Assignments ADD CONSTRAINT FK_Assignments_Semesters FOREIGN KEY (SemesterId) REFERENCES Semesters(Id);
                END
            END
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Assignments' AND COLUMN_NAME = 'AssessmentId'
            )
            BEGIN
                ALTER TABLE Assignments ADD AssessmentId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Assignments_Assessments')
                BEGIN
                    ALTER TABLE Assignments ADD CONSTRAINT FK_Assignments_Assessments FOREIGN KEY (AssessmentId) REFERENCES Assessments(Id);
                END
            END

            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Assignments' AND COLUMN_NAME = 'AcademicYearId'
            )
            BEGIN
                ALTER TABLE Assignments ADD AcademicYearId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Assignments_AcademicYears')
                BEGIN
                    ALTER TABLE Assignments ADD CONSTRAINT FK_Assignments_AcademicYears FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(Id);
                END
                
                -- One-time migration: Populate from Semesters
                EXEC('UPDATE a SET a.AcademicYearId = s.AcademicYearId FROM Assignments a JOIN Semesters s ON a.SemesterId = s.Id WHERE a.AcademicYearId IS NULL AND a.SemesterId IS NOT NULL');
            END

            -- Ensure Points column is Decimal
            IF EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'Assignments' AND COLUMN_NAME = 'Points' AND DATA_TYPE = 'int'
            )
            BEGIN
                ALTER TABLE Assignments ALTER COLUMN Points DECIMAL(6, 2) NULL
            END
        `);
        migrationDone = true;
    }
    catch (err) {
        console.warn('[Schema] Assignment Migration warning:', err.message);
        migrationDone = true;
    }
};
export const createAssignment = async (req, res) => {
    const teacherId = req.user.id;
    const { title, description, classId, courseId, deadline, points, semesterId, assessmentId } = req.body;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);
        // --- NEW VALIDATION: Course-Class Mark Budget (Max 100) ---
        if (courseId && classId && points) {
            const checkResult = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('classId', sql.Int, classId)
                .query(`
                    SELECT 
                        (SELECT ISNULL(SUM(TotalMarks), 0) FROM Exams WHERE CourseId = @courseId AND ClassId = @classId) +
                        (SELECT ISNULL(SUM(Points), 0) FROM Assignments WHERE CourseId = @courseId AND ClassId = @classId)
                    as UsedMarks
                `);
            const used = checkResult.recordset[0].UsedMarks;
            if (used + Number(points) > 100) {
                return res.status(400).json({
                    message: `Cannot allocate ${points} points. This course/class already has ${used} marks used (Exams + Assignments). Only ${100 - used} marks remaining.`
                });
            }
        }
        const result = await pool.request()
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('classId', sql.Int, classId ? Number(classId) : null)
            .input('courseId', sql.Int, courseId ? Number(courseId) : null)
            .input('teacherId', sql.Int, teacherId)
            .input('filePath', sql.NVarChar, filePath)
            .input('deadline', sql.DateTime, deadline ? new Date(deadline) : null)
            .input('points', sql.Decimal(6, 2), points ? Number(points) : 100)
            .input('semesterId', sql.Int, semesterId ? Number(semesterId) : null)
            .input('assessmentId', sql.Int, assessmentId ? Number(assessmentId) : null)
            .query(`
                DECLARE @ayId INT = NULL;
                IF @semesterId IS NOT NULL
                BEGIN
                    SELECT @ayId = AcademicYearId FROM Semesters WHERE Id = @semesterId;
                END

                INSERT INTO Assignments (Title, Description, ClassId, CourseId, TeacherId, FilePath, Deadline, Points, SemesterId, AssessmentId, AcademicYearId)
                VALUES (@title, @description, @classId, @courseId, @teacherId, @filePath, @deadline, @points, @semesterId, @assessmentId, @ayId);
                SELECT SCOPE_IDENTITY() AS AssignmentId;
            `);
        res.status(201).json({
            message: 'Assignment created successfully',
            assignmentId: result.recordset[0].AssignmentId
        });
    }
    catch (err) {
        console.error('createAssignment error:', err);
        res.status(500).json({ message: 'Error creating assignment' });
    }
};
export const getMyAssignments = async (req, res) => {
    const teacherId = req.user.id;
    const { courseId } = req.query;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);
        const request = pool.request();
        let query = `
            SELECT a.*, c.GradeName, c.Section, co.CourseName, a.AssessmentId,
            (SELECT COUNT(*) FROM AssignmentSubmissions WHERE AssignmentId = a.AssignmentId) as SubmissionCount,
            (SELECT COUNT(*) FROM StudentClasses WHERE ClassId = a.ClassId) as TotalStudents
            FROM Assignments a
            LEFT JOIN Classes c ON a.ClassId = c.ClassId
            LEFT JOIN Courses co ON a.CourseId = co.CourseId
            WHERE a.TeacherId = @teacherId
        `;
        request.input('teacherId', sql.Int, teacherId);
        if (courseId) {
            request.input('courseId', sql.Int, Number(courseId));
            query += ` AND a.CourseId = @courseId`;
        }
        query += ` ORDER BY a.CreatedAt DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getMyAssignments error:', err);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};
export const deleteAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Check for submissions first
        const checkSubmissions = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM AssignmentSubmissions WHERE AssignmentId = @id');
        if (checkSubmissions.recordset[0].count > 0) {
            return res.status(400).json({ message: 'Cannot delete assignment because it already has student submissions.' });
        }
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Assignments WHERE AssignmentId = @id');
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (err) {
        console.error('deleteAssignment error:', err);
        res.status(500).json({ message: 'Error deleting assignment' });
    }
};
export const updateAssignment = async (req, res) => {
    const { id } = req.params;
    const { title, description, classId, courseId, deadline, points, semesterId, assessmentId } = req.body;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : undefined;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);
        // --- NEW VALIDATION: Course-Class Mark Budget (Max 100) ---
        if (courseId && classId && points) {
            const checkResult = await pool.request()
                .input('id', sql.Int, id)
                .input('courseId', sql.Int, courseId)
                .input('classId', sql.Int, classId)
                .query(`
                    SELECT 
                        (SELECT ISNULL(SUM(TotalMarks), 0) FROM Exams WHERE CourseId = @courseId AND ClassId = @classId) +
                        (SELECT ISNULL(SUM(Points), 0) FROM Assignments WHERE CourseId = @courseId AND ClassId = @classId AND AssignmentId <> @id)
                    as UsedMarks
                `);
            const used = checkResult.recordset[0].UsedMarks;
            if (used + Number(points) > 100) {
                return res.status(400).json({
                    message: `Cannot update to ${points} points. This course/class already has ${used} marks used (including Exams, excluding this assignment). Only ${100 - used} marks remaining.`
                });
            }
        }
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('classId', sql.Int, classId ? Number(classId) : null)
            .input('courseId', sql.Int, courseId ? Number(courseId) : null)
            .input('deadline', sql.DateTime, deadline ? new Date(deadline) : null)
            .input('points', sql.Int, points ? Number(points) : null)
            .input('semesterId', sql.Int, semesterId ? Number(semesterId) : null)
            .input('assessmentId', sql.Int, assessmentId ? Number(assessmentId) : null);
        let query = `
            DECLARE @ayId INT = NULL;
            IF @semesterId IS NOT NULL
            BEGIN
                SELECT @ayId = AcademicYearId FROM Semesters WHERE Id = @semesterId;
            END

            UPDATE Assignments 
            SET Title = @title, 
                Description = @description, 
                ClassId = @classId, 
                CourseId = @courseId, 
                 Deadline = @deadline, 
                Points = @points,
                SemesterId = @semesterId,
                AssessmentId = @assessmentId,
                AcademicYearId = @ayId
        `;
        if (filePath !== undefined) {
            request.input('filePath', sql.NVarChar, filePath);
            query += `, FilePath = @filePath`;
        }
        query += ` WHERE AssignmentId = @id`;
        await request.query(query);
        res.json({ message: 'Assignment updated successfully' });
    }
    catch (err) {
        console.error('updateAssignment error:', err);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};
export const getAssignmentSubmissions = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('assignmentId', sql.Int, id)
            .query(`
            SELECT 
                asub.SubmissionId, 
                asub.StudentId, 
                asub.SubmissionFilePath, 
                asub.SubmissionDate, 
                asub.Score, 
                asub.Feedback, 
                asub.Status,
                u.FullName as StudentName,
                u.Email as StudentEmail
            FROM AssignmentSubmissions asub
            JOIN Users u ON asub.StudentId = u.UserId
            WHERE asub.AssignmentId = @assignmentId
            ORDER BY asub.SubmissionDate DESC
        `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getAssignmentSubmissions error:', err);
        res.status(500).json({ message: 'Error fetching submissions' });
    }
};
export const gradeSubmission = async (req, res) => {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('submissionId', sql.Int, submissionId)
            .input('score', sql.Decimal(10, 2), score)
            .input('feedback', sql.NVarChar, feedback || '')
            .query(`
            UPDATE AssignmentSubmissions 
            SET Score = @score, Feedback = @feedback, Status = 'Graded' 
            WHERE SubmissionId = @submissionId
        `);
        res.json({ message: 'Submission graded successfully' });
    }
    catch (err) {
        console.error('gradeSubmission error:', err);
        res.status(500).json({ message: 'Error grading submission' });
    }
};
