import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';

export const getMyClasses = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const { academicYearId } = req.query;
        const pool = await poolPromise;
        const request = pool.request();
        request.input('teacherId', sql.Int, teacherId);

        let query = `
            SELECT DISTINCT c.ClassId, c.GradeName, c.Section, g.Id as GradeId,
            ta.AcademicYearId, ta.SemesterId,
            ay.Name as AcademicYearName, s.Name as SemesterName,
            (SELECT COUNT(*) FROM StudentClasses sc WHERE sc.ClassId = c.ClassId) as StudentCount
            FROM Classes c
            JOIN TeacherAssignments ta ON c.ClassId = ta.ClassId
            LEFT JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
            LEFT JOIN Semesters s ON ta.SemesterId = s.Id
            LEFT JOIN Grades g ON (c.GradeName = 'Grade ' + CAST(g.GradeNumber AS NVARCHAR(10)) OR c.GradeName = CAST(g.GradeNumber AS NVARCHAR(10)))
            WHERE ta.TeacherId = @teacherId 
            AND (
                -- If specific AY/Semester filtered, allow it
                (@ayId IS NOT NULL)
                OR
                -- If specific semester is assigned, check its dates
                (ta.SemesterId IS NOT NULL AND GETDATE() BETWEEN s.StartDate AND s.EndDate)
                OR
                -- If assigned to both semesters (NULL), check academic year dates
                (ta.SemesterId IS NULL AND (ay.IsActive = 1 OR GETDATE() BETWEEN ay.StartDate AND ay.EndDate))
                OR
                -- Fallback for active academic year if no semester specific assignment is past its date
                (ay.IsActive = 1 AND (s.EndDate IS NULL OR GETDATE() <= s.EndDate))
            )
        `;

        if (academicYearId) {
            request.input('ayId', sql.Int, Number(academicYearId));
            query += " AND ta.AcademicYearId = @ayId";
        } else {
            request.input('ayId', sql.Int, null);
            query += " AND (ay.IsActive = 1 OR ta.AcademicYearId IS NULL)";
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching teacher classes' });
    }
};

export const getMyCourses = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { academicYearId, semesterId, gradeId, sectionId } = req.query;

    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('teacherId', sql.Int, teacherId);

        let query = `
            WITH DistinctAssignments AS (
                SELECT DISTINCT ta.CourseId, ta.AcademicYearId, ta.SemesterId, ta.TeacherId, ta.ClassId,
                    c.GradeName + ISNULL(' - ' + c.Section, '') as GradeSection
                FROM TeacherAssignments ta
                JOIN Classes c ON ta.ClassId = c.ClassId
                WHERE ta.TeacherId = @teacherId
            )
            SELECT co.CourseId, co.CourseName, co.Description,
                ay.Name as AcademicYearName,
                ISNULL(s.Name, 'Full Year') as SemesterName,
                STRING_AGG(ta.GradeSection, ', ') as Classes,
                (SELECT COUNT(*) FROM Exams e WHERE e.CourseId = co.CourseId AND e.TeacherId = @teacherId) as ExamCount
            FROM DistinctAssignments ta
            JOIN Courses co ON ta.CourseId = co.CourseId
            LEFT JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
            LEFT JOIN Semesters s ON ta.SemesterId = s.Id
            WHERE 1=1
        `;

        if (academicYearId) {
            request.input('ayId', sql.Int, Number(academicYearId));
            query += " AND ta.AcademicYearId = @ayId";
        }
        if (semesterId) {
            request.input('semId', sql.Int, Number(semesterId));
            query += " AND (ta.SemesterId = @semId OR ta.SemesterId IS NULL)";
        }
        if (gradeId) {
            request.input('gradeId', sql.Int, Number(gradeId));
            query += " AND (c.GradeName = 'Grade ' + CAST((SELECT GradeNumber FROM Grades WHERE Id = @gradeId) AS NVARCHAR(10)) OR c.GradeName = CAST((SELECT GradeNumber FROM Grades WHERE Id = @gradeId) AS NVARCHAR(10)))";
        }
        if (sectionId) {
            request.input('sectionId', sql.Int, Number(sectionId));
            query += " AND ta.ClassId = @sectionId";
        }

        if (!academicYearId && !semesterId && !gradeId && !sectionId) {
            query += `
                AND (
                    (ta.SemesterId IS NOT NULL AND GETDATE() BETWEEN s.StartDate AND s.EndDate)
                    OR
                    (ta.SemesterId IS NULL AND (ay.IsActive = 1 OR GETDATE() BETWEEN ay.StartDate AND ay.EndDate))
                    OR
                    (s.StartDate IS NULL AND ay.StartDate IS NULL AND (ay.IsActive = 1 OR ay.Id IS NULL))
                    OR
                    (ay.IsActive = 1)
                )
            `;
        }

        query += " GROUP BY co.CourseId, co.CourseName, co.Description, ay.Name, s.Name";

        const result = await request.query(query);
        // Correcting any potential nulls to ensure frontend shows something better than 'General'
        const processed = result.recordset.map(c => ({
            ...c,
            Classes: c.Classes || 'Not Assigned'
        }));
        res.json(processed);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching teacher courses' });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const pool = await poolPromise;

        const classCount = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`SELECT COUNT(DISTINCT ClassId) as count FROM TeacherAssignments ta LEFT JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id WHERE TeacherId = @teacherId AND (ay.IsActive = 1 OR ta.AcademicYearId IS NULL)`);

        const courseCount = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`SELECT COUNT(DISTINCT CourseId) as count FROM TeacherAssignments ta LEFT JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id WHERE TeacherId = @teacherId AND (ay.IsActive = 1 OR ta.AcademicYearId IS NULL)`);

        const examStats = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN IsPublished = 1 THEN 1 ELSE 0 END) as published
                FROM Exams WHERE TeacherId = @teacherId
            `);

        res.json({
            classCount: classCount.recordset[0].count,
            courseCount: courseCount.recordset[0].count,
            publishedExams: examStats.recordset[0].published || 0,
            totalExams: examStats.recordset[0].total || 0,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

export const getMyRecentExams = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`
                SELECT TOP 10 e.ExamId, e.Title, e.IsPublished, e.StartTime,
                    c.GradeName, c.Section, e.CreatedAt
                FROM Exams e
                LEFT JOIN Classes c ON e.ClassId = c.ClassId
                WHERE e.TeacherId = @teacherId
                    AND (
                        e.CreatedAt >= DATEADD(HOUR, -1, GETDATE())
                        OR e.StartTime >= DATEADD(HOUR, -1, GETDATE())
                    )
                ORDER BY e.ExamId DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching recent exams' });
    }
};

export const getClassStudents = async (req: Request, res: Response) => {
    const { classId } = req.params;
    const { academicYearId } = req.query;

    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('classId', sql.Int, classId);

        let query = '';
        if (academicYearId) {
            request.input('ayId', sql.Int, academicYearId);
            query = `
                SELECT DISTINCT u.UserId, u.FullName, u.Email, u.Status, u.ProfileImage
                FROM Users u
                JOIN StudentEnrollments se ON u.UserId = se.StudentId
                JOIN Grades g ON se.GradeId = g.Id
                JOIN Sections s ON se.SectionId = s.Id
                JOIN Classes c ON (
                    c.GradeName = 'Grade ' + CAST(g.GradeNumber AS NVARCHAR) 
                    OR c.GradeName = CAST(g.GradeNumber AS NVARCHAR)
                ) AND (ISNULL(c.Section, '') = ISNULL(s.Name, ''))
                WHERE c.ClassId = @classId 
                AND se.AcademicYearId = @ayId
                AND se.Status IN ('Active', 'Promoted', 'Repeated', 'Transferred')
            `;
        } else {
            query = `
                SELECT u.UserId, u.FullName, u.Email, u.Status, u.ProfileImage
                FROM Users u
                JOIN StudentClasses sc ON u.UserId = sc.StudentId
                WHERE sc.ClassId = @classId
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getClassStudents Error:', err);
        res.status(500).json({ message: 'Error fetching class students' });
    }
};

export const getLiveExamSessions = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const isAdmin = userRole === 'Admin' || userRole === 'admin' || userRole === 'Director' || userRole === 'director';
    const { ayId, semesterId, gradeId, courseId, examType } = req.query;

    try {
        const pool = await poolPromise;

        // Base input parameters
        const request = pool.request();
        if (!isAdmin) request.input('teacherId', sql.Int, userId);
        request.input('ayId', sql.Int, ayId || null)
            .input('semId', sql.Int, semesterId || null)
            .input('courseId', sql.Int, courseId || null)
            .input('gradeId', sql.Int, gradeId || null)
            .input('examType', sql.NVarChar, examType || null);

        let filterSql = '';
        if (ayId) filterSql += ' AND e.AcademicYearId = @ayId';
        if (semesterId) filterSql += ' AND e.SemesterId = @semId';
        if (courseId) filterSql += ' AND e.CourseId = @courseId';
        if (examType) filterSql += ' AND e.ExamType = @examType';
        if (gradeId) {
            filterSql += " AND (cl.GradeName = (SELECT 'Grade ' + CAST(GradeNumber AS NVARCHAR) FROM Grades WHERE Id = @gradeId) OR cl.GradeName = (SELECT CAST(GradeNumber AS NVARCHAR) FROM Grades WHERE Id = @gradeId))";
        }

        // Get all students currently taking or recently finished exams
        const liveStudentsQuery = `
            WITH LatestAttempts AS (
                SELECT 
                    AttemptId,
                    StudentId,
                    ExamId,
                    ROW_NUMBER() OVER (PARTITION BY StudentId, ExamId ORDER BY StartTime DESC) as rn
                FROM StudentExams
                WHERE Status = 'Started' OR (Status = 'Submitted' AND EndTime >= DATEADD(MONTH, -1, GETDATE()))
            )
            SELECT
                se.AttemptId,
                se.StartTime,
                se.EndTime,
                se.Status,
                se.Score,
                se.IsLocked,
                u.FullName as StudentName,
                u.Email as StudentEmail,
                e.ExamId,
                e.Title as ExamTitle,
                e.DurationMinutes,
                e.ExamType,
                co.CourseName,
                cl.GradeName,
                cl.Section,
                u.ProfileImage,
                t.FullName as TeacherName,
                DATEDIFF(MINUTE, se.StartTime, ISNULL(se.EndTime, GETDATE())) as ElapsedMinutes,
                ISNULL(e.TotalMarks, (
                    SELECT SUM(q.Points) FROM Questions q WHERE q.ExamId = e.ExamId
                )) as MaxPoints
            FROM StudentExams se
            JOIN LatestAttempts la ON se.AttemptId = la.AttemptId AND la.rn = 1
            JOIN Users u ON se.StudentId = u.UserId
            JOIN Exams e ON se.ExamId = e.ExamId
            JOIN Users t ON e.TeacherId = t.UserId
            JOIN Courses co ON e.CourseId = co.CourseId
            LEFT JOIN Classes cl ON e.ClassId = cl.ClassId
            WHERE (${isAdmin ? '1=1' : 'e.TeacherId = @teacherId'})
            ${filterSql}
            ORDER BY se.Status ASC, se.StartTime DESC
        `;

        const liveStudents = await request.query(liveStudentsQuery);

        // Get summary of active exams
        const activeExamsQuery = `
            WITH ExamData AS (
                SELECT 
                    e.ExamId,
                    e.Title,
                    e.DurationMinutes,
                    e.StartTime,
                    e.EndTime,
                    e.ExamType,
                    co.CourseName,
                    cl.GradeName,
                    cl.Section,
                    t.FullName as TeacherName,
                    (SELECT COUNT(DISTINCT se.StudentId) FROM StudentExams se WHERE se.ExamId = e.ExamId AND se.Status = 'Started') as PerExamActive,
                    (SELECT COUNT(DISTINCT se.StudentId) FROM StudentExams se WHERE se.ExamId = e.ExamId AND se.Status = 'Submitted') as PerExamSubmitted
                FROM Exams e
                JOIN Users t ON e.TeacherId = t.UserId
                JOIN Courses co ON e.CourseId = co.CourseId
                LEFT JOIN Classes cl ON e.ClassId = cl.ClassId
                WHERE (${isAdmin ? '1=1' : 'e.TeacherId = @teacherId'})
                AND (
                    (e.IsPublished = 1 AND (e.StartTime IS NULL OR e.StartTime <= GETDATE()) AND (e.EndTime IS NULL OR e.EndTime >= GETDATE()))
                    OR 
                    EXISTS (SELECT 1 FROM StudentExams se_active WHERE se_active.ExamId = e.ExamId AND se_active.Status = 'Started')
                )
                ${filterSql}
            )
            SELECT 
                MAX(ExamId) as ExamId,
                Title,
                DurationMinutes,
                MAX(StartTime) as StartTime,
                MAX(EndTime) as EndTime,
                MAX(ExamType) as ExamType,
                CourseName,
                GradeName,
                Section,
                TeacherName,
                SUM(PerExamActive) as ActiveStudents,
                SUM(PerExamSubmitted) as SubmittedStudents
            FROM ExamData
            GROUP BY Title, DurationMinutes, CourseName, GradeName, Section, TeacherName
            ORDER BY MAX(StartTime) DESC
        `;

        const activeExams = await request.query(activeExamsQuery);

        res.json({
            liveStudents: liveStudents.recordset,
            activeExams: activeExams.recordset,
            totalActive: liveStudents.recordset.filter((s: any) => s.Status === 'Started').length
        });
    } catch (err) {
        console.error('getLiveExamSessions error:', err);
        res.status(500).json({ message: 'Error fetching live exam sessions' });
    }
};

export const getTeacherAnnouncements = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as any).user.id;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`
                SELECT * FROM Announcements 
                WHERE (TargetRole IN ('Teacher', 'All'))
                AND (ClassId IS NULL OR ClassId IN (SELECT ClassId FROM TeacherAssignments WHERE TeacherId = @teacherId))
                AND (Deadline IS NULL OR Deadline >= CAST(GETDATE() AS DATE)) 
                ORDER BY CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('getTeacherAnnouncements error:', err);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
};

export const getTeacherNotifications = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as any).user.id;
        const pool = await poolPromise;

        // Count announcements matching criteria
        const announcementsResult = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`
                SELECT COUNT(*) as count
                FROM Announcements
                WHERE (TargetRole IN ('Teacher', 'All'))
                AND (ClassId IS NULL OR ClassId IN (SELECT ClassId FROM TeacherAssignments WHERE TeacherId = @teacherId))
                AND (Deadline IS NULL OR Deadline >= CAST(GETDATE() AS DATE))
            `);

        // Count currently ACTIVE student sessions for this teacher's exams
        const liveExamsResult = await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .query(`
                SELECT COUNT(DISTINCT se.AttemptId) as count 
                FROM StudentExams se
                JOIN Exams e ON se.ExamId = e.ExamId
                WHERE e.TeacherId = @teacherId
                AND se.Status = 'Started' AND se.IsLocked = 0
                AND DATEADD(MINUTE, e.DurationMinutes + 30, se.StartTime) > GETDATE()
            `);

        res.json({
            announcements: announcementsResult.recordset[0].count,
            liveExams: liveExamsResult.recordset[0].count
        });
    } catch (err) {
        console.error('getTeacherNotifications error:', err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};
export const getAttemptAnswers = async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    try {
        const pool = await poolPromise;
        const examData = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query('SELECT Score FROM StudentExams WHERE AttemptId = @attemptId');

        const result = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT q.QuestionId, q.Text as QuestionText, q.Type as QuestionType, q.Points as Points,
                       sa.SelectedOptionId, sa.MatchingAnswer, sa.EssayAnswer,
                       sa.MarksAwarded, sa.Feedback, sa.IsCorrect as IsCorrectAnswer,
                       (SELECT o.Text FROM Options o WHERE o.OptionId = sa.SelectedOptionId) as SelectedOptionText,
                       (SELECT o.Text FROM Options o WHERE o.QuestionId = q.QuestionId AND o.IsCorrect = 1) as CorrectOptionText,
                       (SELECT mp.PairId, mp.LeftText, mp.RightText FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId FOR JSON PATH) as MatchingPairs
                FROM Questions q
                JOIN StudentAnswers sa ON q.QuestionId = sa.QuestionId
                WHERE sa.AttemptId = @attemptId
            `);

        const answers = result.recordset.map(a => ({
            ...a,
            MatchingPairs: a.MatchingPairs ? JSON.parse(a.MatchingPairs) : []
        }));

        res.json({
            currentScore: examData.recordset[0]?.Score || 0,
            answers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching attempt answers' });
    }
};

export const gradeStudentExam = async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const { score } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .input('score', sql.Decimal(5, 2), score)
            .query("UPDATE StudentExams SET Score = @score, Status = 'Graded' WHERE AttemptId = @attemptId");
        res.json({ message: 'Exam graded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error grading exam' });
    }
};

export const unlockAttempt = async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    try {
        const pool = await poolPromise;

        // Reset IsLocked and increment TabSwitchCount slightly to give them one more chance or just reset it
        await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query("UPDATE StudentExams SET IsLocked = 0, TabSwitchCount = 0 WHERE AttemptId = @attemptId");

        res.json({ message: 'Exam attempt unlocked successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error unlocking exam attempt' });
    }
};
