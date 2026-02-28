import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';

let migrationDone = false;

/** Auto-migrate: add missing columns to Exams table */
export const ensureSchema = async (pool: any) => {
    if (migrationDone) return;
    try {
        // Add ExamType if missing
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'ExamType'
            )
            BEGIN
                ALTER TABLE Exams ADD ExamType NVARCHAR(50) DEFAULT 'Quiz'
            END
        `);

        // Add TotalMarks if missing or update to decimal
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'TotalMarks'
            )
            BEGIN
                ALTER TABLE Exams ADD TotalMarks DECIMAL(6, 2) NULL
            END
            ELSE
            BEGIN
                -- Ensure it is decimal if it was int before
                IF EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'TotalMarks' AND DATA_TYPE = 'int'
                )
                BEGIN
                    ALTER TABLE Exams ALTER COLUMN TotalMarks DECIMAL(6, 2) NULL
                END
            END
        `);

        // Make DurationMinutes nullable if it has NOT NULL constraint
        await pool.request().query(`
            IF EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'DurationMinutes'
                AND IS_NULLABLE = 'NO'
            )
            BEGIN
                ALTER TABLE Exams ALTER COLUMN DurationMinutes INT NULL
            END
        `);

        // Add Status to Users if missing
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Status'
            )
            BEGIN
                ALTER TABLE Users ADD Status NVARCHAR(20) DEFAULT 'Active'
            END
        `);

        // Add Deadline to Announcements if missing
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Announcements' AND COLUMN_NAME = 'Deadline'
            )
            BEGIN
                ALTER TABLE Announcements ADD Deadline DATETIME NULL
            END
        `);

        // Add SemesterId to Exams if missing
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'SemesterId'
            )
            BEGIN
                ALTER TABLE Exams ADD SemesterId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Exams_Semesters')
                BEGIN
                    ALTER TABLE Exams ADD CONSTRAINT FK_Exams_Semesters FOREIGN KEY (SemesterId) REFERENCES Semesters(Id);
                END
            END
        `);

        // Add AcademicYearId to Exams if missing
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'AcademicYearId'
            )
            BEGIN
                ALTER TABLE Exams ADD AcademicYearId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Exams_AcademicYears')
                BEGIN
                    ALTER TABLE Exams ADD CONSTRAINT FK_Exams_AcademicYears FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(Id);
                END

                -- One-time migration: Populate from Semesters
                EXEC('UPDATE e SET e.AcademicYearId = s.AcademicYearId FROM Exams e JOIN Semesters s ON e.SemesterId = s.Id WHERE e.AcademicYearId IS NULL AND e.SemesterId IS NOT NULL');
            END
        `);

        // Add AssessmentId to Exams if missing
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'AssessmentId')
            BEGIN
                ALTER TABLE Exams ADD AssessmentId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Exams_Assessments')
                BEGIN
                    ALTER TABLE Exams ADD CONSTRAINT FK_Exams_Assessments FOREIGN KEY (AssessmentId) REFERENCES Assessments(Id);
                END
            END
        `);

        // Create StudentExamAssignment table if missing
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StudentExamAssignment')
            BEGIN
                CREATE TABLE StudentExamAssignment (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    StudentId INT NOT NULL,
                    ExamId INT NOT NULL,
                    AssignedBy INT NULL,
                    AssignedDate DATETIME DEFAULT GETDATE(),
                    Status NVARCHAR(20) DEFAULT 'Assigned', -- Assigned, Started, Completed, Missed
                    MakeupReason NVARCHAR(MAX) NULL,
                    ApprovalDate DATETIME NULL,
                    ApprovedBy INT NULL,
                    CONSTRAINT FK_SEA_Student FOREIGN KEY (StudentId) REFERENCES Users(UserId),
                    CONSTRAINT FK_SEA_Exam FOREIGN KEY (ExamId) REFERENCES Exams(ExamId) ON DELETE CASCADE,
                    CONSTRAINT FK_SEA_Assigner FOREIGN KEY (AssignedBy) REFERENCES Users(UserId),
                    CONSTRAINT FK_SEA_Approver FOREIGN KEY (ApprovedBy) REFERENCES Users(UserId)
                );
            END
        `);

        // Add OverrideStartTime & OverrideEndTime to StudentExamAssignment
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'StudentExamAssignment' AND COLUMN_NAME = 'OverrideStartTime'
            )
            BEGIN
                ALTER TABLE StudentExamAssignment ADD OverrideStartTime DATETIME NULL;
                ALTER TABLE StudentExamAssignment ADD OverrideEndTime DATETIME NULL;
            END
        `);

        // Add SemesterId and AcademicYearId to Assignments if missing
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Assignments' AND COLUMN_NAME = 'SemesterId')
            BEGIN
                ALTER TABLE Assignments ADD SemesterId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Assignments_Semesters')
                BEGIN
                    ALTER TABLE Assignments ADD CONSTRAINT FK_Assignments_Semesters FOREIGN KEY (SemesterId) REFERENCES Semesters(Id);
                END
            END

            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Assignments' AND COLUMN_NAME = 'AcademicYearId')
            BEGIN
                ALTER TABLE Assignments ADD AcademicYearId INT NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_Assignments_AcademicYears')
                BEGIN
                    ALTER TABLE Assignments ADD CONSTRAINT FK_Assignments_AcademicYears FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(Id);
                END
                
                -- One-time migration: Populate from Semesters
                EXEC('UPDATE a SET a.AcademicYearId = s.AcademicYearId FROM Assignments a JOIN Semesters s ON a.SemesterId = s.Id WHERE a.AcademicYearId IS NULL AND a.SemesterId IS NOT NULL');
            END
        `);

        migrationDone = true;
        console.log('[Schema] Auto-migration complete');
    } catch (err) {
        console.warn('[Schema] Migration warning (non-fatal):', (err as any).message);
        migrationDone = true; // don't retry endlessly
    }
};

export const getExams = async (req: Request, res: Response) => {
    const teacherId = (req as any).user?.id;
    const { courseId } = req.query;

    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        const request = pool.request();
        let query = `
             SELECT e.ExamId, e.Title, e.Description, e.ClassId, e.CourseId, e.TeacherId,
            e.DurationMinutes, e.StartTime, e.EndTime, e.IsPublished, e.CreatedAt,
            e.SemesterId, s.Name as SemesterName, s.EndDate as SemesterEndDate,
            ay.Name as AcademicYearName,
            ISNULL(e.ExamType, 'Quiz') AS ExamType,
                e.TotalMarks,
                e.IsMakeup, e.ParentExamId,
                pe.Title as ParentExamTitle,
                c.GradeName, c.Section,
                co.CourseName,
                e.AssessmentId
             FROM Exams e
             LEFT JOIN Exams pe ON e.ParentExamId = pe.ExamId
             LEFT JOIN Classes c ON e.ClassId = c.ClassId
             LEFT JOIN Courses co ON e.CourseId = co.CourseId
             LEFT JOIN Semesters s ON e.SemesterId = s.Id
             LEFT JOIN AcademicYears ay ON s.AcademicYearId = ay.Id OR e.AcademicYearId = ay.Id
            WHERE 1 = 1
            `;

        if (teacherId) {
            request.input('teacherId', sql.Int, teacherId);
            query += ` AND e.TeacherId = @teacherId`;
        }
        if (courseId) {
            request.input('courseId', sql.Int, Number(courseId));
            query += ` AND e.CourseId = @courseId`;
        }

        query += ` ORDER BY e.ExamId DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getExams error:', err);
        res.status(500).json({ message: 'Error fetching exams' });
    }
};


export const createExam = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { title, description, classId, courseId, examType, durationMinutes, totalMarks, startTime, endTime, semesterId, isMakeup, parentExamId, assessmentId } = req.body;

    let transaction;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        // --- NEW VALIDATION: Course-Class Mark Budget (Max 100) ---
        if (courseId && classId && totalMarks && !isMakeup) {
            const checkResult = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('classId', sql.Int, classId)
                .query(`
                    SELECT 
                        (SELECT ISNULL(SUM(TotalMarks), 0) FROM Exams WHERE CourseId = @courseId AND ClassId = @classId AND IsMakeup = 0) +
                        (SELECT ISNULL(SUM(Points), 0) FROM Assignments WHERE CourseId = @courseId AND ClassId = @classId)
                    as UsedMarks
                `);

            const used = checkResult.recordset[0].UsedMarks;
            if (used + Number(totalMarks) > 100) {
                return res.status(400).json({
                    message: `Cannot allocate ${totalMarks} marks. This course/class already has ${used} marks used (Standard Exams + Assignments). Only ${100 - used} marks remaining.`
                });
            }
        }

        // Resolve AcademicYearId if semesterId is provided
        let ayId = null;
        if (semesterId) {
            const semRes = await pool.request().input('sid', sql.Int, semesterId).query('SELECT AcademicYearId FROM Semesters WHERE Id = @sid');
            if (semRes.recordset.length > 0) ayId = semRes.recordset[0].AcademicYearId;
        }

        // Start Transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const result = await transaction.request()
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('classId', sql.Int, classId ? Number(classId) : null)
            .input('courseId', sql.Int, courseId ? Number(courseId) : null)
            .input('teacherId', sql.Int, teacherId)
            .input('examType', sql.NVarChar, examType || 'Quiz')
            .input('durationMinutes', sql.Int, durationMinutes ? Number(durationMinutes) : null)
            .input('totalMarks', sql.Decimal(6, 2), totalMarks ? Number(totalMarks) : null)
            .input('startTime', sql.DateTime, startTime ? new Date(startTime) : null)
            .input('endTime', sql.DateTime, endTime ? new Date(endTime) : null)
            .input('semesterId', sql.Int, semesterId ? Number(semesterId) : null)
            .input('ayId', sql.Int, ayId)
            .input('isMakeup', sql.Bit, isMakeup ? 1 : 0)
            .input('parentExamId', sql.Int, parentExamId || null)
            .input('assessmentId', sql.Int, assessmentId || null)
            .query(`
                INSERT INTO Exams
                    (Title, Description, ClassId, CourseId, TeacherId, ExamType, DurationMinutes, TotalMarks, StartTime, EndTime, IsPublished, SemesterId, AcademicYearId, IsMakeup, ParentExamId, AssessmentId)
                VALUES
                    (@title, @description, @classId, @courseId, @teacherId, @examType, @durationMinutes, @totalMarks, @startTime, @endTime, 0, @semesterId, @ayId, @isMakeup, @parentExamId, @assessmentId);
                SELECT SCOPE_IDENTITY() AS ExamId;
            `);

        const newExamId = result.recordset[0].ExamId;

        // Auto-assign students if NOT a makeup
        if (!isMakeup && classId) {
            await transaction.request()
                .input('examId', sql.Int, newExamId)
                .input('classId', sql.Int, classId)
                .input('adminId', sql.Int, teacherId)
                .query(`
                    INSERT INTO StudentExamAssignment (StudentId, ExamId, AssignedBy, Status)
                    SELECT StudentId, @examId, @adminId, 'Assigned'
                    FROM StudentClasses
                    WHERE ClassId = @classId
                `);
        }

        await transaction.commit();
        res.status(201).json({ message: 'Exam created successfully', examId: newExamId });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('createExam error:', err);
        if (err instanceof Error) {
            console.error('Stack:', err.stack);
        }
        res.status(500).json({ message: 'Error creating exam', error: err instanceof Error ? err.message : String(err) });
    }
};

export const getAvailableMarks = async (req: Request, res: Response) => {
    const { courseId, classId } = req.query;
    if (!courseId || !classId) return res.status(400).json({ message: 'Missing courseId or classId' });

    try {
        const pool = await poolPromise;
        await ensureSchema(pool);
        const result = await pool.request()
            .input('courseId', sql.Int, courseId)
            .input('classId', sql.Int, classId)
            .query(`
        SELECT
            (SELECT ISNULL(SUM(TotalMarks), 0) FROM Exams WHERE CourseId = @courseId AND ClassId = @classId AND IsMakeup = 0) +
            (SELECT ISNULL(SUM(Points), 0) FROM Assignments WHERE CourseId = @courseId AND ClassId = @classId)
                as UsedMarks
            `);

        const used = result.recordset[0].UsedMarks;
        res.json({
            usedMarks: used,
            availableMarks: 100 - used
        });
    } catch (err) {
        console.error('getAvailableMarks error:', err);
        if (err instanceof Error) console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : String(err) });
    }
};

export const publishExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const teacherId = (req as any).user.id;
    try {
        const pool = await poolPromise;

        // 1. Get Exam Details and calculate current total points
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT
                    e.ExamId, e.TotalMarks as MaxMarks, e.ClassId, e.IsMakeup,
                    (
                        SELECT ISNULL(SUM(calc.QTotal), 0)
                        FROM (
                            SELECT 
                                q.QuestionId,
                                CASE 
                                    WHEN q.Type = 'Matching' THEN q.Points * (SELECT COUNT(*) FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId)
                                    ELSE q.Points
                                END as QTotal
                            FROM Questions q
                            WHERE q.ExamId = e.ExamId
                        ) as calc
                    ) as CurrentTotal
                FROM Exams e
                WHERE e.ExamId = @id
            `);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const { MaxMarks, CurrentTotal, ClassId, IsMakeup } = checkResult.recordset[0];

        // 2. Validation
        if (!ClassId && !IsMakeup) {
            return res.status(400).json({ message: 'Please assign this exam to a Class first in settings.' });
        }

        if (MaxMarks === null || MaxMarks === undefined) {
            return res.status(400).json({ message: 'Please set the Max Marks for this exam first in settings.' });
        }

        if (Number(MaxMarks) !== Number(CurrentTotal)) {
            return res.status(400).json({
                message: `Cannot publish. The total points of your questions (${CurrentTotal}) does not match the exam Max Marks (${MaxMarks}). Please adjust your questions or settings.`
            });
        }

        // 3. Ensure Student Assignments exist (as a backup/sync)
        if (ClassId && !IsMakeup) {
            await pool.request()
                .input('examId', sql.Int, id)
                .input('classId', sql.Int, ClassId)
                .input('adminId', sql.Int, teacherId)
                .query(`
                    INSERT INTO StudentExamAssignment (StudentId, ExamId, AssignedBy, Status)
                    SELECT StudentId, @examId, @adminId, 'Assigned'
                    FROM StudentClasses
                    WHERE ClassId = @classId
                    AND NOT EXISTS (
                        SELECT 1 FROM StudentExamAssignment 
                        WHERE ExamId = @examId AND StudentId = StudentClasses.StudentId
                    )
                `);
        }

        // 4. Update Status
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Exams SET IsPublished = 1 WHERE ExamId = @id');

        res.json({ message: 'Exam published successfully' });
    } catch (err: any) {
        console.error('publishExam error:', err);
        res.status(500).json({
            message: 'Internal server error while publishing.',
            error: err.message
        });
    }
};

export const unpublishExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Exams SET IsPublished = 0 WHERE ExamId = @id');
        res.json({ message: 'Exam unpublished successfully' });
    } catch (err: any) {
        console.error('unpublishExam error:', err);
        res.status(500).json({ message: 'Failed to unpublish exam.', error: err.message });
    }
};

export const updateExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, classId, courseId, examType, durationMinutes, totalMarks, startTime, endTime, semesterId, isMakeup, parentExamId, assessmentId } = req.body;
    try {
        const pool = await poolPromise;

        // --- NEW VALIDATION: Course-Class Mark Budget (Max 100) ---
        if (courseId && classId && totalMarks) {
            const checkResult = await pool.request()
                .input('id', sql.Int, id)
                .input('courseId', sql.Int, courseId)
                .input('classId', sql.Int, classId)
                .query(`
SELECT
    (SELECT ISNULL(SUM(TotalMarks), 0) FROM Exams WHERE CourseId = @courseId AND ClassId = @classId AND ExamId <> @id) +
    (SELECT ISNULL(SUM(Points), 0) FROM Assignments WHERE CourseId = @courseId AND ClassId = @classId)
                    as UsedMarks
                `);

            const used = checkResult.recordset[0].UsedMarks;
            if (used + Number(totalMarks) > 100) {
                return res.status(400).json({
                    message: `Cannot update to ${totalMarks} marks.This course / class already has ${used} marks used(including Assignments, excluding this exam).Only ${100 - used} marks remaining.`
                });
            }
        }

        // Resolve AcademicYearId if semesterId is provided
        let ayId = null;
        if (semesterId) {
            const semRes = await pool.request().input('sid', sql.Int, semesterId).query('SELECT AcademicYearId FROM Semesters WHERE Id = @sid');
            if (semRes.recordset.length > 0) ayId = semRes.recordset[0].AcademicYearId;
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('classId', sql.Int, classId ? Number(classId) : null)
            .input('courseId', sql.Int, courseId ? Number(courseId) : null)
            .input('examType', sql.NVarChar, examType || 'Quiz')
            .input('durationMinutes', sql.Int, durationMinutes ? Number(durationMinutes) : null)
            .input('totalMarks', sql.Decimal(6, 2), totalMarks ? Number(totalMarks) : null)
            .input('startTime', sql.DateTime, startTime ? new Date(startTime) : null)
            .input('endTime', sql.DateTime, endTime ? new Date(endTime) : null)
            .input('semesterId', sql.Int, semesterId ? Number(semesterId) : null)
            .input('ayId', sql.Int, ayId)
            .input('isMakeup', sql.Bit, isMakeup ? 1 : 0)
            .input('parentExamId', sql.Int, parentExamId ? Number(parentExamId) : null)
            .input('assessmentId', sql.Int, assessmentId ? Number(assessmentId) : null)
            .query(`
                UPDATE Exams 
                SET Title = @title,
    Description = @description,
    ClassId = @classId,
    CourseId = @courseId,
    ExamType = @examType,
    DurationMinutes = @durationMinutes,
    TotalMarks = @totalMarks,
    StartTime = @startTime,
    EndTime = @endTime,
    SemesterId = @semesterId,
    AcademicYearId = @ayId,
    IsMakeup = @isMakeup,
    ParentExamId = @parentExamId,
    AssessmentId = @assessmentId
                WHERE ExamId = @id
    `);
        res.json({ message: 'Exam updated successfully' });
    } catch (err) {
        console.error('updateExam error:', err);
        res.status(500).json({ message: 'Error updating exam' });
    }
};

export const deleteExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Questions will be deleted automatically due to ON DELETE CASCADE if configured, 
        // but it's safer to check or handle it if not.
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Exams WHERE ExamId = @id');
        res.json({ message: 'Exam deleted successfully' });
    } catch (err) {
        console.error('deleteExam error:', err);
        res.status(500).json({ message: 'Error deleting exam' });
    }
};

/**
 * Manually assign students to an exam (primarily for make-ups)
 */
export const assignStudentsToExam = async (req: Request, res: Response) => {
    const adminId = (req as any).user.id;
    const { examId, studentIds, makeupReason } = req.body; // studentIds is an array

    if (!examId || !studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ message: 'Missing examId or studentIds array' });
    }

    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const studentId of studentIds) {
                // Check if already assigned
                const check = await transaction.request()
                    .input('eid', sql.Int, examId)
                    .input('sid', sql.Int, studentId)
                    .query('SELECT Id FROM StudentExamAssignment WHERE StudentId = @sid AND ExamId = @eid');

                if (check.recordset.length === 0) {
                    await transaction.request()
                        .input('eid', sql.Int, examId)
                        .input('sid', sql.Int, studentId)
                        .input('aid', sql.Int, adminId)
                        .input('reason', sql.NVarChar, makeupReason || 'Special Assignment')
                        .query(`
                            INSERT INTO StudentExamAssignment(StudentId, ExamId, AssignedBy, Status, MakeupReason, ApprovalDate, ApprovedBy)
VALUES(@sid, @eid, @aid, 'Assigned', @reason, GETDATE(), @aid)
                        `);
                }
            }
            await transaction.commit();
            res.json({ message: `Successfully assigned ${studentIds.length} students.` });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('assignStudentsToExam error:', err);
        res.status(500).json({ message: 'Error assigning students' });
    }
};

/**
 * Get all assignments for a specific exam (to see who missed, etc.)
 */
export const getExamAssignments = async (req: Request, res: Response) => {
    const { examId } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('eid', sql.Int, examId)
            .query(`
                SELECT sea.*, u.FullName as StudentName, u.Email as StudentEmail,
                u2.FullName as AssignerName,
                (SELECT TOP 1 se.Status FROM StudentExams se WHERE se.ExamId = sea.ExamId AND se.StudentId = sea.StudentId ORDER BY se.AttemptId DESC) as AttemptStatus,
                (SELECT COUNT(*) FROM StudentExams se2 WHERE se2.ExamId = sea.ExamId AND se2.StudentId = sea.StudentId AND se2.Status IN ('Submitted', 'Graded')) as IsTaken
                FROM StudentExamAssignment sea
                JOIN Users u ON sea.StudentId = u.UserId
                LEFT JOIN Users u2 ON sea.AssignedBy = u2.UserId
                WHERE sea.ExamId = @eid
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('getExamAssignments error:', err);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};

/**
 * Utility to automatically mark students who haven't started as "Absent" after end date
 */
export const updateExpiredAssignments = async (pool: any, studentId?: number) => {
    try {
        const request = pool.request();
        let query = `
            UPDATE sea
            SET sea.Status = 'Absent'
            FROM StudentExamAssignment sea
            JOIN Exams e ON sea.ExamId = e.ExamId
            WHERE sea.Status = 'Assigned'
            AND (
                (sea.OverrideEndTime IS NOT NULL AND sea.OverrideEndTime < GETDATE())
                OR (sea.OverrideEndTime IS NULL AND e.EndTime IS NOT NULL AND e.EndTime < GETDATE())
            )
        `;

        if (studentId) {
            request.input('sid', sql.Int, studentId);
            query += " AND sea.StudentId = @sid";
        }

        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            console.log(`[Auto-Expire] Marked ${result.rowsAffected[0]} assignments as Absent ${studentId ? `for student ${studentId}` : '(Global)'}`);
        }
        return result.rowsAffected[0];
    } catch (err) {
        console.error('updateExpiredAssignments error:', err);
        return 0;
    }
};

/**
 * Manually mark students as "Absent" via API
 */
export const markMissedExams = async (req: Request, res: Response) => {
    const { examId } = req.body;
    try {
        const pool = await poolPromise;
        const request = pool.request();

        let query = `
            UPDATE sea
            SET sea.Status = 'Absent'
            FROM StudentExamAssignment sea
            JOIN Exams e ON sea.ExamId = e.ExamId
            WHERE sea.Status = 'Assigned'
            AND (
                (sea.OverrideEndTime IS NOT NULL AND sea.OverrideEndTime < GETDATE())
                OR (sea.OverrideEndTime IS NULL AND e.EndTime IS NOT NULL AND e.EndTime < GETDATE())
            )
        `;

        if (examId) {
            request.input('eid', sql.Int, examId);
            query += " AND sea.ExamId = @eid";
        }

        const result = await request.query(query);
        res.json({ message: `Marked ${result.rowsAffected[0]} assignments as Absent.` });
    } catch (err) {
        console.error('markMissedExams error:', err);
        res.status(500).json({ message: 'Error updating absent exams' });
    }
};

/**
 * Get students who missed a specific exam (expired + no submission)
 */
export const getMissedStudents = async (req: Request, res: Response) => {
    const { examId } = req.params;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        const result = await pool.request()
            .input('examId', sql.Int, examId)
            .query(`
                SELECT 
                    sea.Id as AssignmentId,
                    sea.StudentId,
                    sea.Status as AssignmentStatus,
                    u.FullName as StudentName,
                    u.Email as StudentEmail,
                    u.ProfileImage,
                    c.GradeName,
                    c.Section,
                    e.Title as ExamTitle,
                    e.EndTime,
                    sea.OverrideStartTime,
                    sea.OverrideEndTime
                FROM StudentExamAssignment sea
                JOIN Users u ON sea.StudentId = u.UserId
                JOIN Exams e ON sea.ExamId = e.ExamId
                LEFT JOIN StudentClasses sc ON sc.StudentId = sea.StudentId
                LEFT JOIN Classes c ON sc.ClassId = c.ClassId AND c.ClassId = e.ClassId
                WHERE sea.ExamId = @examId
                AND sea.StudentId NOT IN (
                    SELECT StudentId FROM StudentExams 
                    WHERE ExamId = @examId AND Status IN ('Submitted', 'Graded')
                )
                ORDER BY u.FullName
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('getMissedStudents error:', err);
        res.status(500).json({ message: 'Error fetching missed students' });
    }
};

/**
 * Re-assign exam to specific students with new time window
 */
export const reassignExamToStudents = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { examId, studentIds, newStartTime, newEndTime, reason } = req.body;

    if (!examId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'Missing examId or studentIds array' });
    }
    if (!newStartTime || !newEndTime) {
        return res.status(400).json({ message: 'New start and end times are required' });
    }

    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const studentId of studentIds) {
                // Check if assignment exists
                const check = await transaction.request()
                    .input('eid', sql.Int, examId)
                    .input('sid', sql.Int, studentId)
                    .query('SELECT Id FROM StudentExamAssignment WHERE StudentId = @sid AND ExamId = @eid');

                if (check.recordset.length > 0) {
                    // Update existing assignment: reset status, set override times
                    await transaction.request()
                        .input('eid', sql.Int, examId)
                        .input('sid', sql.Int, studentId)
                        .input('start', sql.DateTime, new Date(newStartTime))
                        .input('end', sql.DateTime, new Date(newEndTime))
                        .input('reason', sql.NVarChar, reason || 'Makeup - Re-assigned by teacher')
                        .input('tid', sql.Int, teacherId)
                        .query(`
                            UPDATE StudentExamAssignment 
                            SET Status = 'Assigned',
                                OverrideStartTime = @start,
                                OverrideEndTime = @end,
                                MakeupReason = @reason,
                                AssignedBy = @tid,
                                AssignedDate = GETDATE()
                            WHERE StudentId = @sid AND ExamId = @eid
                        `);
                } else {
                    // Create new assignment with override times
                    await transaction.request()
                        .input('eid', sql.Int, examId)
                        .input('sid', sql.Int, studentId)
                        .input('tid', sql.Int, teacherId)
                        .input('start', sql.DateTime, new Date(newStartTime))
                        .input('end', sql.DateTime, new Date(newEndTime))
                        .input('reason', sql.NVarChar, reason || 'Makeup - Re-assigned by teacher')
                        .query(`
                            INSERT INTO StudentExamAssignment (StudentId, ExamId, AssignedBy, Status, MakeupReason, OverrideStartTime, OverrideEndTime, ApprovalDate, ApprovedBy)
                            VALUES (@sid, @eid, @tid, 'Assigned', @reason, @start, @end, GETDATE(), @tid)
                        `);
                }

                // Also delete any incomplete attempt so student starts fresh
                await transaction.request()
                    .input('eid', sql.Int, examId)
                    .input('sid', sql.Int, studentId)
                    .query(`
                        DELETE FROM StudentExams 
                        WHERE ExamId = @eid AND StudentId = @sid AND Status = 'Started'
                    `);
            }

            await transaction.commit();
            res.json({ message: `Successfully re-assigned exam to ${studentIds.length} student(s).` });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('reassignExamToStudents error:', err);
        res.status(500).json({ message: 'Error re-assigning exam' });
    }
};
/**
 * Create a brand new Make-up exam based on an original, and assign to specific students
 */
export const createMakeupFromMissed = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { originalExamId, studentIds, newTitle, newStartTime, newEndTime, reason } = req.body;

    if (!originalExamId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'Missing originalExamId or studentIds' });
    }

    let transaction;
    try {
        const pool = await poolPromise;
        const original = await pool.request()
            .input('id', sql.Int, originalExamId)
            .query('SELECT * FROM Exams WHERE ExamId = @id');

        if (original.recordset.length === 0) return res.status(404).json({ message: 'Original exam not found' });
        const exam = original.recordset[0];

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Create New Exam Record (Draft)
            const result = await transaction.request()
                .input('title', sql.NVarChar, newTitle || `Make-up: ${exam.Title}`)
                .input('desc', sql.NVarChar, exam.Description || '')
                .input('cid', sql.Int, exam.ClassId)
                .input('coid', sql.Int, exam.CourseId)
                .input('tid', sql.Int, teacherId)
                .input('type', sql.NVarChar, exam.ExamType)
                .input('dur', sql.Int, exam.DurationMinutes)
                .input('marks', sql.Decimal(6, 2), exam.TotalMarks)
                .input('start', sql.DateTime, newStartTime ? new Date(newStartTime) : null)
                .input('end', sql.DateTime, newEndTime ? new Date(newEndTime) : null)
                .input('sem', sql.Int, exam.SemesterId)
                .input('ay', sql.Int, exam.AcademicYearId)
                .input('parent', sql.Int, originalExamId)
                .input('assessment', sql.Int, exam.AssessmentId)
                .query(`
                    INSERT INTO Exams 
                        (Title, Description, ClassId, CourseId, TeacherId, ExamType, DurationMinutes, TotalMarks, StartTime, EndTime, IsPublished, SemesterId, AcademicYearId, IsMakeup, ParentExamId, AssessmentId)
                    VALUES 
                        (@title, @desc, @cid, @coid, @tid, @type, @dur, @marks, @start, @end, 0, @sem, @ay, 1, @parent, @assessment);
                    SELECT SCOPE_IDENTITY() AS ExamId;
                `);

            const newExamId = result.recordset[0].ExamId;

            // 2. Assign selected students to this NEW exam
            for (const studentId of studentIds) {
                await transaction.request()
                    .input('eid', sql.Int, newExamId)
                    .input('sid', sql.Int, studentId)
                    .input('tid', sql.Int, teacherId)
                    .input('reason', sql.NVarChar, reason || 'Make-up exam for missed original')
                    .query(`
                        INSERT INTO StudentExamAssignment (StudentId, ExamId, AssignedBy, Status, MakeupReason, AssignedDate)
                        VALUES (@sid, @eid, @tid, 'Assigned', @reason, GETDATE())
                    `);
            }

            await transaction.commit();
            res.status(201).json({
                message: 'New Make-up exam created and assigned.',
                examId: newExamId
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('createMakeupFromMissed error:', err);
        res.status(500).json({ message: 'Error creating makeup exam' });
    }
};
