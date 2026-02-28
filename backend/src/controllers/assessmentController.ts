import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';

// =============================================
// ASSESSMENT SETTINGS
// =============================================

export const getAssessmentSettings = async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        // Create settings table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
            CREATE TABLE SystemSettings (
                SettingKey NVARCHAR(100) PRIMARY KEY,
                SettingValue NVARCHAR(MAX),
                UpdatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        const result = await pool.request()
            .input('key', sql.NVarChar, 'adminOnlyAssessment')
            .query("SELECT SettingValue FROM SystemSettings WHERE SettingKey = @key");
        const value = result.recordset[0]?.SettingValue === 'true';
        res.json({ adminOnlyAssessment: value });
    } catch (err) {
        console.error('getAssessmentSettings error:', err);
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

export const updateAssessmentSettings = async (req: Request, res: Response) => {
    const { adminOnlyAssessment } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
            CREATE TABLE SystemSettings (
                SettingKey NVARCHAR(100) PRIMARY KEY,
                SettingValue NVARCHAR(MAX),
                UpdatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        await pool.request()
            .input('key', sql.NVarChar, 'adminOnlyAssessment')
            .input('val', sql.NVarChar, String(adminOnlyAssessment))
            .query(`
                MERGE SystemSettings AS target
                USING (SELECT @key AS SettingKey) AS source
                ON target.SettingKey = source.SettingKey
                WHEN MATCHED THEN UPDATE SET SettingValue = @val, UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN INSERT (SettingKey, SettingValue) VALUES (@key, @val);
            `);
        res.json({ message: 'Settings updated', adminOnlyAssessment });
    } catch (err) {
        console.error('updateAssessmentSettings error:', err);
        res.status(500).json({ message: 'Error updating settings' });
    }
};

// =============================================
// BULK ASSIGN ASSESSMENTS TO ALL COURSES
// =============================================

export const bulkAssignAssessments = async (req: Request, res: Response) => {
    const { assessments } = req.body;
    // assessments: [{ type, title, totalMarks, weightPercentage }]
    const user = (req as any).user;

    try {
        const pool = await poolPromise;

        // Get active academic year
        const ayResult = await pool.request().query("SELECT Id FROM AcademicYears WHERE IsActive = 1");
        if (ayResult.recordset.length === 0) {
            return res.status(400).json({ message: 'No active academic year found' });
        }
        const academicYearId = ayResult.recordset[0].Id;

        // Get active semester
        const semResult = await pool.request().query("SELECT Id FROM Semesters WHERE IsActive = 1");
        if (semResult.recordset.length === 0) {
            return res.status(400).json({ message: 'No active semester found' });
        }
        const semesterId = semResult.recordset[0].Id;

        // Get combinations from GradeCourses OR TeacherAssignments
        const gcResult = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .input('semId', sql.Int, semesterId)
            .query(`
                SELECT DISTINCT GradeId, CourseId, CourseName, GradeNumber
                FROM (
                    -- Explicit mappings
                    SELECT gc.GradeId, gc.CourseId, c.CourseName, g.GradeNumber
                    FROM GradeCourses gc
                    JOIN Courses c ON gc.CourseId = c.CourseId
                    JOIN Grades g ON gc.GradeId = g.Id
                    WHERE (gc.AcademicYearId = @ayId OR gc.AcademicYearId IS NULL)
                    AND (gc.SemesterId = @semId OR gc.SemesterId IS NULL)

                    UNION

                    -- Implicit mappings from active teacher assignments
                    SELECT g.Id as GradeId, ta.CourseId, c.CourseName, g.GradeNumber
                    FROM TeacherAssignments ta
                    JOIN Classes cl ON ta.ClassId = cl.ClassId
                    JOIN Grades g ON g.GradeNumber = (
                        CASE 
                            WHEN ISNUMERIC(REPLACE(cl.GradeName, 'Grade ', '')) = 1 
                            THEN CAST(REPLACE(cl.GradeName, 'Grade ', '') AS INT)
                            ELSE 0 
                        END
                    )
                    JOIN Courses c ON ta.CourseId = c.CourseId
                    WHERE ta.AcademicYearId = @ayId AND ta.Status = 'Active'
                ) AS Mappings
                ORDER BY GradeNumber, CourseName
            `);

        if (gcResult.recordset.length === 0) {
            return res.status(400).json({ message: 'No course-grade assignments found for the active academic year in either GradeCourses or TeacherAssignments' });
        }

        let created = 0;
        let skipped = 0;

        for (const gc of gcResult.recordset) {
            for (const assessment of assessments) {
                // Check if assessment already exists for this course+grade+semester+type
                const existing = await pool.request()
                    .input('courseId', sql.Int, gc.CourseId)
                    .input('gradeId', sql.Int, gc.GradeId)
                    .input('semId', sql.Int, semesterId)
                    .input('type', sql.NVarChar, assessment.type)
                    .query(`
                        SELECT Id FROM Assessments 
                        WHERE CourseId = @courseId AND GradeId = @gradeId AND SemesterId = @semId AND Type = @type
                    `);

                if (existing.recordset.length > 0) {
                    skipped++;
                    continue;
                }

                await pool.request()
                    .input('courseId', sql.Int, gc.CourseId)
                    .input('semId', sql.Int, semesterId)
                    .input('gradeId', sql.Int, gc.GradeId)
                    .input('ayId', sql.Int, academicYearId)
                    .input('type', sql.NVarChar, assessment.type)
                    .input('title', sql.NVarChar, assessment.title)
                    .input('totalMarks', sql.Decimal(6, 2), assessment.totalMarks)
                    .input('weight', sql.Decimal(5, 2), assessment.weightPercentage)
                    .input('createdBy', sql.Int, user?.id || null)
                    .query(`
                        INSERT INTO Assessments (CourseId, SemesterId, GradeId, AcademicYearId, ClassId, Type, Title, TotalMarks, WeightPercentage, CreatedBy)
                        VALUES (@courseId, @semId, @gradeId, @ayId, NULL, @type, @title, @totalMarks, @weight, @createdBy)
                    `);
                created++;
            }
        }

        res.status(201).json({
            message: `Assigned ${created} assessments across ${gcResult.recordset.length} course-grade combinations. ${skipped} skipped (already exist).`,
            created,
            skipped,
            totalCombinations: gcResult.recordset.length
        });
    } catch (err) {
        console.error('bulkAssignAssessments error:', err);
        res.status(500).json({ message: 'Error bulk assigning assessments' });
    }
};

// =============================================
// ASSESSMENT CRUD
// =============================================

export const getAssessments = async (req: Request, res: Response) => {
    const { courseId, semesterId, gradeId, academicYearId, classId } = req.query;
    try {
        const pool = await poolPromise;
        let query = `
            SELECT a.*, c.CourseName, c.CourseCode, g.GradeNumber, s.Name as SemesterName,
                u.FullName as CreatedByName, cl.Section as ClassSection
            FROM Assessments a
            JOIN Courses c ON a.CourseId = c.CourseId
            JOIN Grades g ON a.GradeId = g.Id
            JOIN Semesters s ON a.SemesterId = s.Id
            LEFT JOIN Users u ON a.CreatedBy = u.UserId
            LEFT JOIN Classes cl ON a.ClassId = cl.ClassId
            WHERE 1=1
        `;
        const request = pool.request();

        if (courseId) { query += ` AND a.CourseId = @courseId`; request.input('courseId', sql.Int, courseId); }
        if (semesterId) { query += ` AND a.SemesterId = @semesterId`; request.input('semesterId', sql.Int, semesterId); }
        if (gradeId) { query += ` AND a.GradeId = @gradeId`; request.input('gradeId', sql.Int, gradeId); }
        if (academicYearId) { query += ` AND a.AcademicYearId = @ayId`; request.input('ayId', sql.Int, academicYearId); }
        if (classId) { query += ` AND a.ClassId = @classId`; request.input('classId', sql.Int, classId); }

        // Filter for teachers: only assessments for their assigned courses/classes
        const user = (req as any).user;
        if (user && user.role === 'Teacher') {
            query += ` AND EXISTS (
                SELECT 1 FROM TeacherAssignments ta
                WHERE ta.TeacherId = @teacherId 
                AND ta.CourseId = a.CourseId
                AND (ta.ClassId = a.ClassId OR a.ClassId IS NULL)
                AND ta.Status = 'Active'
            )`;
            request.input('teacherId', sql.Int, user.id);
        }

        query += ` ORDER BY a.CourseId, a.Type`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getAssessments error:', err);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
};

export const createAssessment = async (req: Request, res: Response) => {
    const { courseId, semesterId, gradeId, academicYearId, classId, type, title, totalMarks, weightPercentage } = req.body;
    const user = (req as any).user;

    try {
        const pool = await poolPromise;

        // Validate total weight doesn't exceed 100% for this course+semester+grade
        const weightCheck = await pool.request()
            .input('courseId', sql.Int, courseId)
            .input('semesterId', sql.Int, semesterId)
            .input('gradeId', sql.Int, gradeId)
            .query(`
                SELECT ISNULL(SUM(WeightPercentage), 0) as TotalWeight 
                FROM Assessments 
                WHERE CourseId = @courseId AND SemesterId = @semesterId AND GradeId = @gradeId
            `);

        const currentWeight = weightCheck.recordset[0].TotalWeight;
        if (currentWeight + parseFloat(weightPercentage) > 100) {
            return res.status(400).json({
                message: `Total weight would exceed 100%. Current: ${currentWeight}%, Adding: ${weightPercentage}%, Available: ${100 - currentWeight}%`
            });
        }

        await pool.request()
            .input('courseId', sql.Int, courseId)
            .input('semesterId', sql.Int, semesterId)
            .input('gradeId', sql.Int, gradeId)
            .input('ayId', sql.Int, academicYearId)
            .input('classId', sql.Int, classId || null)
            .input('type', sql.NVarChar, type)
            .input('title', sql.NVarChar, title)
            .input('totalMarks', sql.Decimal(6, 2), totalMarks || 100)
            .input('weight', sql.Decimal(5, 2), weightPercentage)
            .input('createdBy', sql.Int, user?.id || null)
            .query(`
                INSERT INTO Assessments (CourseId, SemesterId, GradeId, AcademicYearId, ClassId, Type, Title, TotalMarks, WeightPercentage, CreatedBy)
                VALUES (@courseId, @semesterId, @gradeId, @ayId, @classId, @type, @title, @totalMarks, @weight, @createdBy)
            `);

        res.status(201).json({ message: 'Assessment created successfully' });
    } catch (err) {
        console.error('createAssessment error:', err);
        res.status(500).json({ message: 'Error creating assessment' });
    }
};

export const updateAssessment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, title, totalMarks, weightPercentage } = req.body;
    try {
        const pool = await poolPromise;

        // Get current assessment details to find its group
        const currentRes = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT CourseId, SemesterId, GradeId FROM Assessments WHERE Id = @id");

        if (currentRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const { CourseId, SemesterId, GradeId } = currentRes.recordset[0];

        // Validate total weight doesn't exceed 100% (excluding this assessment's current weight)
        const weightCheck = await pool.request()
            .input('id', sql.Int, id)
            .input('courseId', sql.Int, CourseId)
            .input('semesterId', sql.Int, SemesterId)
            .input('gradeId', sql.Int, GradeId)
            .query(`
                SELECT ISNULL(SUM(WeightPercentage), 0) as TotalWeight 
                FROM Assessments 
                WHERE CourseId = @courseId AND SemesterId = @semesterId AND GradeId = @gradeId 
                AND Id != @id
            `);

        const otherWeight = weightCheck.recordset[0].TotalWeight;
        const newWeight = parseFloat(weightPercentage);

        if (otherWeight + newWeight > 100) {
            return res.status(400).json({
                message: `Total weight would exceed 100%. Other assessments sum to ${otherWeight}%. Available for this: ${100 - otherWeight}%`
            });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('type', sql.NVarChar, type)
            .input('title', sql.NVarChar, title)
            .input('totalMarks', sql.Decimal(6, 2), totalMarks || 100)
            .input('weight', sql.Decimal(5, 2), weightPercentage)
            .query(`UPDATE Assessments SET Type = @type, Title = @title, TotalMarks = @totalMarks, WeightPercentage = @weight WHERE Id = @id`);

        res.json({ message: 'Assessment updated successfully' });
    } catch (err) {
        console.error('updateAssessment error:', err);
        res.status(500).json({ message: 'Error updating assessment' });
    }
};

export const deleteAssessment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Check if scores exist
        const check = await pool.request().input('id', sql.Int, id)
            .query(`SELECT COUNT(*) as cnt FROM StudentAssessmentScores WHERE AssessmentId = @id`);
        if (check.recordset[0].cnt > 0) {
            return res.status(400).json({ message: 'Cannot delete assessment with existing scores. Remove scores first.' });
        }
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM Assessments WHERE Id = @id`);
        res.json({ message: 'Assessment deleted' });
    } catch (err) {
        console.error('deleteAssessment error:', err);
        res.status(500).json({ message: 'Error deleting assessment' });
    }
};

// =============================================
// SCORE MANAGEMENT
// =============================================

export const getAssessmentScores = async (req: Request, res: Response) => {
    const { assessmentId } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('aId', sql.Int, assessmentId)
            .query(`
                SELECT sas.*, u.FullName as StudentName, u.RegistrationNumber,
                    a.TotalMarks, a.Type as AssessmentType, a.Title as AssessmentTitle,
                    grader.FullName as GradedByName
                FROM StudentAssessmentScores sas
                JOIN Users u ON sas.StudentId = u.UserId
                JOIN Assessments a ON sas.AssessmentId = a.Id
                LEFT JOIN Users grader ON sas.GradedBy = grader.UserId
                WHERE sas.AssessmentId = @aId
                ORDER BY u.FullName
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('getAssessmentScores error:', err);
        res.status(500).json({ message: 'Error fetching scores' });
    }
};

export const submitScores = async (req: Request, res: Response) => {
    const { assessmentId, scores } = req.body;
    // scores = [{ studentId, marksObtained, status, notes }]
    const user = (req as any).user;

    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const score of scores) {
                await transaction.request()
                    .input('sid', sql.Int, score.studentId)
                    .input('aid', sql.Int, assessmentId)
                    .input('marks', sql.Decimal(6, 2), score.marksObtained ?? null)
                    .input('status', sql.NVarChar, score.status || 'Graded')
                    .input('notes', sql.NVarChar, score.notes || null)
                    .input('gradedBy', sql.Int, user?.id || null)
                    .query(`
                        IF EXISTS (SELECT 1 FROM StudentAssessmentScores WHERE StudentId = @sid AND AssessmentId = @aid)
                        BEGIN
                            UPDATE StudentAssessmentScores 
                            SET MarksObtained = @marks, Status = @status, Notes = @notes, 
                                GradedBy = @gradedBy, GradedAt = GETDATE()
                            WHERE StudentId = @sid AND AssessmentId = @aid
                        END
                        ELSE
                        BEGIN
                            INSERT INTO StudentAssessmentScores (StudentId, AssessmentId, MarksObtained, Status, Notes, GradedBy, GradedAt)
                            VALUES (@sid, @aid, @marks, @status, @notes, @gradedBy, GETDATE())
                        END
                    `);
            }

            await transaction.commit();
            res.json({ message: `Scores submitted for ${scores.length} students` });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('submitScores error:', err);
        res.status(500).json({ message: 'Error submitting scores' });
    }
};

// Get students for a specific assessment (auto-populate from enrollment)
export const getStudentsForAssessment = async (req: Request, res: Response) => {
    const { assessmentId } = req.params;
    const { classId } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('aId', sql.Int, assessmentId);

        let query = `
            SELECT DISTINCT u.UserId as StudentId, u.FullName as StudentName, u.RegistrationNumber,
                COALESCE(
                    sas.MarksObtained,
                    (SELECT TOP 1 se.Score FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                     WHERE e.AssessmentId = a.Id AND se.StudentId = u.UserId AND se.Status IN ('Submitted', 'Graded')),
                    (SELECT TOP 1 asub.Score FROM AssignmentSubmissions asub JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                     WHERE ass.AssessmentId = a.Id AND asub.StudentId = u.UserId AND asub.Status = 'Graded'),
                    (SELECT TOP 1 se.Score FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                     WHERE e.CourseId = a.CourseId AND e.SemesterId = a.SemesterId AND LOWER(e.ExamType) = LOWER(a.Type) 
                     AND se.StudentId = u.UserId AND se.Status IN ('Submitted', 'Graded') AND e.AssessmentId IS NULL)
                ) as MarksObtained,
                COALESCE(
                    sas.Status,
                    (SELECT TOP 1 se.Status FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                     WHERE e.AssessmentId = a.Id AND se.StudentId = u.UserId),
                    (SELECT TOP 1 asub.Status FROM AssignmentSubmissions asub JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                     WHERE ass.AssessmentId = a.Id AND asub.StudentId = u.UserId),
                    'Pending'
                ) as ScoreStatus,
                sas.Notes,
                a.TotalMarks, a.WeightPercentage, a.Type as AssessmentType
            FROM Assessments a
            CROSS APPLY (
                SELECT DISTINCT se.StudentId
                FROM StudentEnrollments se
                JOIN StudentClasses sc ON sc.StudentId = se.StudentId
                WHERE se.GradeId = a.GradeId 
                  AND se.AcademicYearId = a.AcademicYearId 
                  AND se.Status = 'Active'
                  AND (a.ClassId IS NULL OR sc.ClassId = a.ClassId)
        `;

        if (classId) {
            query += " AND sc.ClassId = @classId";
            request.input('classId', sql.Int, classId);
        }

        query += `
            ) enrolled
            JOIN Users u ON u.UserId = enrolled.StudentId
            LEFT JOIN StudentAssessmentScores sas ON sas.StudentId = u.UserId AND sas.AssessmentId = a.Id
            WHERE a.Id = @aId
            ORDER BY u.FullName
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getStudentsForAssessment error:', err);
        res.status(500).json({ message: 'Error fetching students for assessment' });
    }
};

// =============================================
// WEIGHTED AVERAGE CALCULATION
// =============================================

export const calculateWeightedSemesterResults = async (req: Request, res: Response) => {
    const { academicYearId, semesterId, schoolId } = req.body;
    const user = (req as any).user;
    try {
        const pool = await poolPromise;

        // 1. Get all active students
        const request = pool.request();
        request.input('ayId', sql.Int, academicYearId);

        let query = `
            SELECT se.StudentId, se.GradeId, se.SchoolId
            FROM StudentEnrollments se 
            WHERE se.AcademicYearId = @ayId AND se.Status = 'Active'
        `;

        // Filter by school if provided or if user is tied to school
        const targetSchoolId = schoolId || user.schoolId;
        if (targetSchoolId) {
            query += " AND se.SchoolId = @schId";
            request.input('schId', sql.Int, targetSchoolId);
        }

        const enrollments = await request.query(query);

        let processedCount = 0;

        for (const student of enrollments.recordset) {
            // 2. For each student, get all assessments for their grade in this semester
            const scoreRes = await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('gid', sql.Int, student.GradeId)
                .input('semId', sql.Int, semesterId)
                .query(`
                    -- Get weighted course totals
                    WITH AssessmentData AS (
                        SELECT 
                            a.CourseId, c.CourseName, a.Id, a.WeightPercentage, a.TotalMarks,
                            COALESCE(
                                (SELECT TOP 1 MarksObtained FROM StudentAssessmentScores WHERE AssessmentId = a.Id AND StudentId = @sid AND Status = 'Graded'),
                                (SELECT TOP 1 se.Score FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                                 WHERE e.AssessmentId = a.Id AND se.StudentId = @sid AND se.Status IN ('Submitted', 'Graded')),
                                (SELECT TOP 1 asub.Score FROM AssignmentSubmissions asub JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                                 WHERE ass.AssessmentId = a.Id AND asub.StudentId = @sid AND asub.Status = 'Graded'),
                                (SELECT TOP 1 se.Score FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                                 WHERE e.CourseId = a.CourseId AND e.SemesterId = a.SemesterId AND e.ExamType = a.Type 
                                 AND se.StudentId = @sid AND se.Status IN ('Submitted', 'Graded') AND e.AssessmentId IS NULL)
                            ) as BestMark,
                            COALESCE(
                                (SELECT TOP 1 Status FROM StudentAssessmentScores WHERE AssessmentId = a.Id AND StudentId = @sid),
                                (SELECT TOP 1 se.Status FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                                 WHERE e.AssessmentId = a.Id AND se.StudentId = @sid),
                                (SELECT TOP 1 asub.Status FROM AssignmentSubmissions asub JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                                 WHERE ass.AssessmentId = a.Id AND asub.StudentId = @sid),
                                'Pending'
                            ) as ScoreStatus
                        FROM Assessments a
                        JOIN Courses c ON a.CourseId = c.CourseId
                        WHERE a.GradeId = @gid AND a.SemesterId = @semId
                    )
                    SELECT 
                        CourseId,
                        CourseName,
                        SUM(
                            CASE 
                                WHEN ScoreStatus IN ('Graded', 'Submitted') AND BestMark IS NOT NULL AND TotalMarks > 0
                                THEN (BestMark / TotalMarks) * WeightPercentage
                                ELSE 0 
                            END
                        ) as WeightedCourseTotal,
                        SUM(WeightPercentage) as DefinedWeight,
                        SUM(
                            CASE 
                                WHEN ScoreStatus IN ('Graded', 'Submitted') AND BestMark IS NOT NULL 
                                THEN WeightPercentage
                                ELSE 0 
                            END
                        ) as CompletedWeight,
                        COUNT(Id) as TotalAssessments,
                        SUM(CASE WHEN ScoreStatus IN ('Graded', 'Submitted') AND BestMark IS NOT NULL THEN 1 ELSE 0 END) as GradedAssessments
                    FROM AssessmentData
                    GROUP BY CourseId, CourseName
                `);

            const courses = scoreRes.recordset;

            if (courses.length === 0) continue;

            // 3. Calculate semester average (average of all course weighted totals)
            let totalCourseAvg = 0;
            let completedCourses = 0;

            for (const course of courses) {
                // If all assessments are defined, use direct weighted total
                // If only partial, normalize to the completed weight
                if (course.CompletedWeight > 0) {
                    // Normalize: scale up to 100 based on completed assessments
                    const normalizedTotal = (course.WeightedCourseTotal / course.CompletedWeight) * 100;
                    totalCourseAvg += Math.min(normalizedTotal, 100);
                    completedCourses++;
                }
            }

            const semesterAverage = completedCourses > 0 ? totalCourseAvg / completedCourses : 0;

            // 4. Upsert into SemesterResults
            await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .input('avg', sql.Decimal(5, 2), semesterAverage)
                .input('count', sql.Int, courses.length)
                .input('schId', sql.Int, student.SchoolId)
                .query(`
                    IF EXISTS (SELECT 1 FROM SemesterResults WHERE StudentId = @sid AND AcademicYearId = @ayId AND SemesterId = @semId)
                    BEGIN
                        UPDATE SemesterResults 
                        SET Average = @avg, TotalCourses = @count, SchoolId = @schId, CalculatedAt = GETDATE()
                        WHERE StudentId = @sid AND AcademicYearId = @ayId AND SemesterId = @semId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO SemesterResults (StudentId, AcademicYearId, SemesterId, Average, TotalCourses, SchoolId)
                        VALUES (@sid, @ayId, @semId, @avg, @count, @schId)
                    END
                `);

            processedCount++;
        }

        res.json({ message: `Calculated weighted results for ${processedCount} students.` });
    } catch (err) {
        console.error('calculateWeightedSemesterResults error:', err);
        res.status(500).json({ message: 'Error calculating weighted semester results' });
    }
};

// =============================================
// GET STUDENT COURSE BREAKDOWN (for transcript)
// =============================================

export const getStudentCourseBreakdown = async (req: Request, res: Response) => {
    const { studentId, semesterId, teacherId } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('sid', sql.Int, studentId)
            .input('semId', sql.Int, semesterId);

        let teacherFilter = '';
        if (teacherId) {
            request.input('teacherId', sql.Int, teacherId);
            teacherFilter = `
                AND EXISTS (
                    SELECT 1 FROM TeacherAssignments ta
                    JOIN StudentClasses sc ON sc.ClassId = ta.ClassId
                    WHERE ta.TeacherId = @teacherId
                    AND ta.CourseId = a.CourseId
                    AND sc.StudentId = @sid
                    AND ta.Status = 'Active'
                )
            `;
        }

        const result = await request.query(`
                SELECT 
                    a.CourseId, c.CourseName, c.CourseCode,
                    a.Id as AssessmentId, a.Type, a.Title, a.TotalMarks, a.WeightPercentage,
                    -- ...
                    COALESCE(
                        (SELECT TOP 1 MarksObtained FROM StudentAssessmentScores WHERE AssessmentId = a.Id AND StudentId = @sid AND Status = 'Graded'),
                        (SELECT TOP 1 se.Score FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                         WHERE e.AssessmentId = a.Id AND se.StudentId = @sid AND se.Status IN ('Submitted', 'Graded')),
                        (SELECT TOP 1 asub.Score FROM AssignmentSubmissions asub JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                         WHERE ass.AssessmentId = a.Id AND asub.StudentId = @sid AND asub.Status = 'Graded'),
                        (SELECT TOP 1 se.Score FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                         WHERE e.CourseId = a.CourseId AND e.SemesterId = a.SemesterId AND LOWER(e.ExamType) = LOWER(a.Type) 
                         AND se.StudentId = @sid AND se.Status IN ('Submitted', 'Graded') AND e.AssessmentId IS NULL)
                    ) as MarksObtained,
                    
                    COALESCE(
                        (SELECT TOP 1 Status FROM StudentAssessmentScores WHERE AssessmentId = a.Id AND StudentId = @sid),
                        (SELECT TOP 1 se.Status FROM StudentExams se JOIN Exams e ON se.ExamId = e.ExamId 
                         WHERE e.AssessmentId = a.Id AND se.StudentId = @sid),
                        (SELECT TOP 1 asub.Status FROM AssignmentSubmissions asub JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                         WHERE ass.AssessmentId = a.Id AND asub.StudentId = @sid),
                        'Pending'
                    ) as ScoreStatus
                FROM Assessments a
                JOIN Courses c ON a.CourseId = c.CourseId
                WHERE a.SemesterId = @semId
                AND a.GradeId IN (
                    SELECT se.GradeId FROM StudentEnrollments se 
                    WHERE se.StudentId = @sid AND se.Status IN ('Active', 'Promoted', 'Transferred')
                )
                ${teacherFilter}
                ORDER BY c.CourseName, a.Type
            `);

        // Group by course
        const courseMap: any = {};
        for (const row of result.recordset) {
            if (!courseMap[row.CourseId]) {
                courseMap[row.CourseId] = {
                    courseId: row.CourseId,
                    courseName: row.CourseName,
                    courseCode: row.CourseCode,
                    assessments: [],
                    totalWeightedScore: 0,
                    completedWeight: 0,
                    totalDefinedWeight: 0
                };
            }

            // Calculate weighted score for this specific assessment/exam
            let weightedScore = null;
            if (row.MarksObtained !== null && row.TotalMarks > 0) {
                weightedScore = (row.MarksObtained / row.TotalMarks) * row.WeightPercentage;
            }

            courseMap[row.CourseId].assessments.push({
                id: row.AssessmentId,
                type: row.Type,
                title: row.Title,
                totalMarks: row.TotalMarks,
                weightPercentage: row.WeightPercentage,
                marksObtained: row.MarksObtained,
                scoreStatus: row.ScoreStatus,
                weightedScore: weightedScore
            });

            courseMap[row.CourseId].totalDefinedWeight += row.WeightPercentage;
            if (weightedScore !== null) {
                courseMap[row.CourseId].totalWeightedScore += weightedScore;
                courseMap[row.CourseId].completedWeight += row.WeightPercentage;
            }
        }

        // Calculate final weighted average for each course
        // Note: The total is relative to 100% of the course weight
        const courses = Object.values(courseMap).map((c: any) => ({
            ...c,
            courseTotal: c.totalWeightedScore, // This is already weighted correctly
            status: c.completedWeight >= c.totalDefinedWeight ? 'Complete' : 'Incomplete'
        }));

        res.json(courses);
    } catch (err) {
        console.error('getStudentCourseBreakdown error:', err);
        res.status(500).json({ message: 'Error fetching course breakdown' });
    }
};
