import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';
import { ensureSchema } from './examController.js';

export const getTeacherResults = async (req: Request, res: Response) => {
    const { id: userId, role } = (req as any).user;
    const isAdmin = role === 'Admin' || role === 'admin' || role === 'Director';
    const { semesterId: querySemesterId, academicYearId, gradeId, sectionId, status, courseId, examType } = req.query;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        // Get active semester if none provided
        const activeSem = await pool.request().query("SELECT Id FROM Semesters WHERE IsActive = 1");
        const activeSemesterId = activeSem.recordset[0]?.Id;
        const semesterId = querySemesterId || activeSemesterId;

        // 1. Get all submission records with dynamic filtering
        let filterClause = isAdmin ? '1=1' : 'e.TeacherId = @teacherId';

        if (semesterId) filterClause += " AND (e.SemesterId = @semesterId OR e.SemesterId IS NULL)";
        if (academicYearId) filterClause += " AND (ISNULL(e.AcademicYearId, sem.AcademicYearId) = @ayId)";
        if (gradeId) filterClause += " AND ISNULL(g.Id, 0) = @gradeId";

        if (sectionId) {
            // In the frontend: teachers use ClassId, admins use SectionId
            if (isAdmin) {
                filterClause += " AND ISNULL(sec.Id, 0) = @sectionId";
            } else {
                filterClause += " AND e.ClassId = @sectionId";
            }
        }

        if (status && status !== 'All') {
            filterClause += " AND se.Status = @status";
        } else {
            filterClause += " AND se.Status IN ('Submitted', 'Graded')";
        }

        let query = `
            WITH MainResults AS (
                -- 1. Online Exams
                SELECT 
                    se.AttemptId,
                    u.FullName as StudentName,
                    e.Title as ExamTitle,
                    CASE 
                        WHEN (se.Score IS NULL OR se.Score = 0) AND ISNULL(se.CorrectCount, 0) > 0 
                        THEN (CAST(ISNULL(se.CorrectCount, 0) AS FLOAT) / NULLIF(qSum.TotalQuestions, 0)) * qSum.TotalPoints
                        ELSE se.Score 
                    END as Score,
                    ISNULL(e.TotalMarks, qSum.TotalPoints) as MaxPoints,
                    se.Status,
                    se.EndTime as Date,
                    c.GradeName,
                    c.Section,
                    t.FullName as TeacherName,
                    co.CourseName,
                    qSum.TotalQuestions,
                    u.ProfileImage,
                    ISNULL(se.CorrectCount, 0) as CorrectQuestions,
                    e.SemesterId,
                    ISNULL(e.AcademicYearId, sem.AcademicYearId) as AcademicYearId,
                    g.Id as GradeId,
                    sec.Id as SectionId,
                    e.TeacherId,
                    'Exam' as Type
                FROM StudentExams se
                JOIN Exams e ON se.ExamId = e.ExamId
                JOIN Courses co ON e.CourseId = co.CourseId
                JOIN Users u ON se.StudentId = u.UserId
                JOIN Users t ON e.TeacherId = t.UserId
                LEFT JOIN Classes c ON e.ClassId = c.ClassId
                LEFT JOIN Semesters sem ON e.SemesterId = sem.Id
                OUTER APPLY (
                    SELECT TOP 1 g_inner.Id, g_inner.GradeNumber 
                    FROM Grades g_inner 
                    WHERE (c.GradeName = 'Grade ' + CAST(g_inner.GradeNumber AS NVARCHAR(10)) OR c.GradeName = CAST(g_inner.GradeNumber AS NVARCHAR(10)))
                ) g
                OUTER APPLY (
                    SELECT TOP 1 sec_inner.Id 
                    FROM Sections sec_inner 
                    WHERE c.Section = sec_inner.Name AND sec_inner.GradeId = g.Id
                    ${academicYearId ? "AND sec_inner.AcademicYearId = @ayId" : ""}
                ) sec
                OUTER APPLY (
                    SELECT 
                        SUM(CASE 
                            WHEN q.Type = 'Matching' THEN q.Points * ISNULL(mpCount.cnt, 0)
                            ELSE q.Points 
                        END) as TotalPoints,
                        SUM(CASE 
                            WHEN q.Type = 'Matching' THEN ISNULL(mpCount.cnt, 0)
                            ELSE 1 
                        END) as TotalQuestions
                    FROM Questions q 
                    JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                    OUTER APPLY (
                        SELECT COUNT(*) as cnt FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId
                    ) mpCount
                    WHERE sqo.AttemptId = se.AttemptId
                ) qSum

                UNION ALL

                -- 2. Manual Assessments
                SELECT
                    sas.Id as AttemptId,
                    u.FullName as StudentName,
                    a.Title as ExamTitle,
                    sas.MarksObtained as Score,
                    a.TotalMarks as MaxPoints,
                    sas.Status,
                    sas.GradedAt as Date,
                    'Grade ' + CAST(gr.GradeNumber AS NVARCHAR) as GradeName,
                    s.Name as Section,
                    ISNULL(t.FullName, 'System') as TeacherName,
                    co.CourseName,
                    0 as TotalQuestions,
                    u.ProfileImage,
                    0 as CorrectQuestions,
                    a.SemesterId,
                    a.AcademicYearId,
                    a.GradeId,
                    s.Id as SectionId,
                    ISNULL(ta.TeacherId, a.CreatedBy) as TeacherId,
                    'Manual' as Type
                FROM StudentAssessmentScores sas
                JOIN Assessments a ON sas.AssessmentId = a.Id
                JOIN Courses co ON a.CourseId = co.CourseId
                JOIN Users u ON sas.StudentId = u.UserId
                LEFT JOIN Users t ON sas.GradedBy = t.UserId
                LEFT JOIN StudentEnrollments sen ON u.UserId = sen.StudentId AND a.AcademicYearId = sen.AcademicYearId
                LEFT JOIN Grades gr ON sen.GradeId = gr.Id
                LEFT JOIN Sections s ON sen.SectionId = s.Id
                OUTER APPLY (
                    SELECT TOP 1 ta_inner.TeacherId 
                    FROM TeacherAssignments ta_inner
                    JOIN StudentClasses sc ON ta_inner.ClassId = sc.ClassId
                    WHERE sc.StudentId = sas.StudentId AND ta_inner.CourseId = a.CourseId
                    AND ta_inner.Status = 'Active'
                ) ta

                UNION ALL

                -- 3. Assignments
                SELECT 
                    sub.SubmissionId as AttemptId,
                    u.FullName as StudentName,
                    ass.Title as ExamTitle,
                    sub.Score,
                    ass.Points as MaxPoints,
                    sub.Status,
                    sub.SubmissionDate as Date,
                    'Grade ' + CAST(gr.GradeNumber AS NVARCHAR) as GradeName,
                    s.Name as Section,
                    ISNULL(t.FullName, 'System') as TeacherName,
                    co.CourseName,
                    0 as TotalQuestions,
                    u.ProfileImage,
                    0 as CorrectQuestions,
                    ass.SemesterId,
                    ass.AcademicYearId,
                    NULL as GradeId, -- Grade resolved via Enrollment
                    s.Id as SectionId,
                    ass.TeacherId,
                    'Assignment' as Type
                FROM AssignmentSubmissions sub
                JOIN Assignments ass ON sub.AssignmentId = ass.AssignmentId
                JOIN Courses co ON ass.CourseId = co.CourseId
                JOIN Users u ON sub.StudentId = u.UserId
                LEFT JOIN Users t ON ass.TeacherId = t.UserId
                LEFT JOIN StudentEnrollments sen ON u.UserId = sen.StudentId AND ass.AcademicYearId = sen.AcademicYearId
                LEFT JOIN Grades gr ON sen.GradeId = gr.Id
                LEFT JOIN Sections s ON sen.SectionId = s.Id
            )
            SELECT * FROM MainResults
            WHERE 1=1
        `;

        // Apply filters to the unified results
        if (!isAdmin) query += " AND TeacherId = @teacherId";
        if (semesterId) query += " AND (SemesterId = @semesterId OR SemesterId IS NULL)";
        if (academicYearId) query += " AND AcademicYearId = @ayId";
        if (gradeId) {
            query += " AND (GradeId = @gradeId OR GradeName = (SELECT 'Grade ' + CAST(GradeNumber AS NVARCHAR) FROM Grades WHERE Id = @gradeId))";
        }

        if (sectionId) {
            // Include results matched to this specific section OR section-wide if matches section name
            query += " AND (SectionId = @sectionId OR SectionId IS NULL)";
        }

        if (courseId) {
            query += " AND CourseName = (SELECT CourseName FROM Courses WHERE CourseId = @courseId)";
        }

        if (examType && examType !== 'All') {
            query += " AND Type = @examType";
        }

        if (status && status !== 'All') {
            query += " AND Status = @status";
        } else {
            query += " AND Status IN ('Submitted', 'Graded')";
        }

        query += " ORDER BY Date DESC";

        const request = pool.request();
        if (!isAdmin) request.input('teacherId', sql.Int, Number(userId));
        if (semesterId) request.input('semesterId', sql.Int, Number(semesterId));
        if (academicYearId) request.input('ayId', sql.Int, Number(academicYearId));
        if (gradeId) request.input('gradeId', sql.Int, Number(gradeId));
        if (sectionId) request.input('sectionId', sql.Int, Number(sectionId));
        if (status && status !== 'All') request.input('status', sql.NVarChar, status);
        if (courseId) request.input('courseId', sql.Int, Number(courseId));
        if (examType && examType !== 'All') request.input('examType', sql.NVarChar, examType);

        const debugInfo = {
            isAdmin,
            userId,
            semesterId,
            academicYearId,
            gradeId,
            sectionId,
            status,
            filterClause
        };
        console.log('[Debug] getTeacherResults params:', debugInfo);
        // console.log('[Debug] SQL Query:', query); // Uncomment if needed for deep debugging

        const submissionsResult = await request.query(query);
        const submissions = submissionsResult.recordset;

        // 2. Calculate Stats
        let topScore = 0;
        let totalScoreSum = 0;
        let gradedCount = 0;
        let pendingCount = 0;

        submissions.forEach(s => {
            if (s.Status === 'Graded' || s.Status === 'Submitted') {
                const score = s.Score || 0;
                const total = s.MaxPoints || 1;
                const percentage = (score / total) * 100;

                if (percentage > topScore) topScore = percentage;

                if (s.Status === 'Graded' || (s.Status === 'Submitted' && s.Score !== null)) {
                    totalScoreSum += percentage;
                    gradedCount++;
                }
            }
            if (s.Status === 'Submitted' && s.Score === null) {
                pendingCount++;
            }
        });

        const classAverage = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : 0;

        // 3. Apply Re-grade Permissions
        const permsRes = await pool.request().query("SELECT * FROM SystemSettings WHERE SettingKey = 'TeacherRegrade'");
        const permissions = permsRes.recordset;

        const enrichedSubmissions = submissions.map(s => {
            if (isAdmin) return { ...s, canRegrade: true };

            // Default: only allowed for active semester/year
            const isFromActiveSemOrYear = (activeSemesterId && String(s.SemesterId) === String(activeSemesterId)) ||
                (!s.SemesterId && s.AcademicYearId); // Full year assignment

            // Hierarchical check: Section -> Grade -> Semester -> AY
            const findSetting = (type: string, id: number | string | null) =>
                id ? permissions.find(p => p.EntityType === type && String(p.EntityId) === String(id)) : null;

            const aySetting = findSetting('AcademicYear', s.AcademicYearId);
            const semSetting = findSetting('Semester', s.SemesterId);
            const gradeSetting = findSetting('Grade', s.GradeId);
            const sectionSetting = findSetting('Section', s.SectionId);

            let allowed = isFromActiveSemOrYear;
            // Overrides: more specific overrides less specific
            if (aySetting) allowed = aySetting.SettingValue === 'true';
            if (semSetting) allowed = semSetting.SettingValue === 'true';
            if (gradeSetting) allowed = gradeSetting.SettingValue === 'true';
            if (sectionSetting) allowed = sectionSetting.SettingValue === 'true';

            return { ...s, canRegrade: allowed };
        });

        res.json({
            stats: {
                topScore: topScore.toFixed(1),
                classAverage,
                pendingCount
            },
            submissions: enrichedSubmissions
        });
    } catch (err: any) {
        console.error('getTeacherResults error:', err.message, err.stack);
        res.status(500).json({ message: 'Error fetching results' });
    }
};

export const getStudentProgress = async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { id: userId, role } = (req as any).user;
    const isAdmin = role === 'Admin' || role === 'admin' || role === 'Director';
    const { semesterId: querySemesterId } = req.query;
    try {
        const pool = await poolPromise;

        // Get active semester
        const activeSem = await pool.request().query("SELECT Id FROM Semesters WHERE IsActive = 1");
        const activeSemesterId = activeSem.recordset[0]?.Id;
        const semesterId = querySemesterId || activeSemesterId;

        // Get student info
        const studentRes = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query('SELECT UserId, FullName, Email, ProfileImage FROM Users WHERE UserId = @studentId');

        if (studentRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const student = studentRes.recordset[0];

        let query = `
            SELECT * FROM (
                SELECT 
                    se.AttemptId,
                    e.Title as ExamTitle,
                    'Exam' as Type,
                    CAST(CASE 
                        WHEN (se.Score IS NULL OR se.Score = 0) AND ISNULL(se.CorrectCount, 0) > 0 
                        THEN (CAST(ISNULL(se.CorrectCount, 0) AS FLOAT) / NULLIF(CAST(qSum.TotalQuestions AS FLOAT), 0)) * CAST(qSum.TotalPoints AS FLOAT)
                        ELSE se.Score 
                    END AS FLOAT) as Score,
                    CAST(ISNULL(e.TotalMarks, qSum.TotalPoints) AS FLOAT) as MaxPoints,
                    se.Status,
                    CAST(se.EndTime AS DATETIME) as Date,
                    ISNULL(t.FullName, 'Unknown') as TeacherName,
                    co.CourseName,
                    CAST(ISNULL(qSum.TotalQuestions, 0) AS INT) as TotalQuestions,
                    CAST(ISNULL(se.CorrectCount, 0) AS INT) as CorrectQuestions,
                    e.SemesterId
                FROM StudentExams se
                JOIN Exams e ON se.ExamId = e.ExamId
                JOIN Courses co ON e.CourseId = co.CourseId
                JOIN Users t ON e.TeacherId = t.UserId
                OUTER APPLY (
                    SELECT 
                        SUM(CASE 
                            WHEN q.Type = 'Matching' THEN q.Points * ISNULL(mpCount.cnt, 0)
                            ELSE q.Points 
                        END) as TotalPoints,
                        SUM(CASE 
                            WHEN q.Type = 'Matching' THEN ISNULL(mpCount.cnt, 0)
                            ELSE 1 
                        END) as TotalQuestions
                    FROM Questions q 
                    JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                    OUTER APPLY (
                        SELECT COUNT(*) as cnt FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId
                    ) mpCount
                    WHERE sqo.AttemptId = se.AttemptId
                ) qSum
                WHERE se.StudentId = @studentId 
                AND (${isAdmin ? '1=1' : 'e.TeacherId = @teacherId'})
                AND se.Status IN ('Submitted', 'Graded')

                UNION ALL

                SELECT 
                    sas.Id as AttemptId,
                    a.Title as ExamTitle,
                    'Manual' as Type,
                    CAST(sas.MarksObtained AS FLOAT) as Score,
                    CAST(a.TotalMarks AS FLOAT) as MaxPoints,
                    sas.Status,
                    CAST(sas.GradedAt AS DATETIME) as Date,
                    ISNULL(t.FullName, 'Unknown') as TeacherName,
                    co.CourseName,
                    0 as TotalQuestions,
                    0 as CorrectQuestions,
                    a.SemesterId
                FROM StudentAssessmentScores sas
                JOIN Assessments a ON sas.AssessmentId = a.Id
                JOIN Courses co ON a.CourseId = co.CourseId
                OUTER APPLY (
                    SELECT TOP 1 u.FullName, ta.TeacherId 
                    FROM TeacherAssignments ta
                    JOIN StudentClasses sc ON ta.ClassId = sc.ClassId
                    JOIN Users u ON ta.TeacherId = u.UserId
                    WHERE sc.StudentId = sas.StudentId AND ta.CourseId = a.CourseId
                ) t
                WHERE sas.StudentId = @studentId
                AND (${isAdmin ? '1=1' : 't.TeacherId = @teacherId'})
                AND sas.Status = 'Graded'

                UNION ALL

                SELECT 
                    asub.SubmissionId as AttemptId,
                    ass.Title as ExamTitle,
                    'Assignment' as Type,
                    CAST(asub.Score AS FLOAT) as Score,
                    CAST(ass.Points AS FLOAT) as MaxPoints,
                    asub.Status,
                    CAST(asub.SubmissionDate AS DATETIME) as Date,
                    ISNULL(t.FullName, 'Unknown') as TeacherName,
                    co.CourseName,
                    0 as TotalQuestions,
                    0 as CorrectQuestions,
                    ass.SemesterId
                FROM AssignmentSubmissions asub
                JOIN Assignments ass ON asub.AssignmentId = ass.AssignmentId
                JOIN Courses co ON ass.CourseId = co.CourseId
                JOIN Users t ON ass.TeacherId = t.UserId
                WHERE asub.StudentId = @studentId
                AND (${isAdmin ? '1=1' : 'ass.TeacherId = @teacherId'})
                AND asub.Status = 'Graded'
            ) AllAssessments
            WHERE 1=1
        `;

        if (semesterId) {
            query += " AND (SemesterId = @semesterId OR SemesterId IS NULL)";
        }

        query += " ORDER BY Date DESC";


        const request = pool.request();
        request.input('studentId', sql.Int, studentId);
        if (!isAdmin) request.input('teacherId', sql.Int, userId);
        if (semesterId) request.input('semesterId', sql.Int, semesterId);

        const submissionsResult = await request.query(query);

        res.json({
            student,
            submissions: submissionsResult.recordset
        });
    } catch (err) {
        console.error('getStudentProgress error:', err);
        res.status(500).json({ message: 'Error fetching student progress' });
    }
};

export const getClassRankings = async (req: Request, res: Response) => {
    const { classId } = req.params;
    const { semesterId: querySemesterId } = req.query;
    try {
        const pool = await poolPromise;

        // Get active semester
        const activeSem = await pool.request().query("SELECT Id FROM Semesters WHERE IsActive = 1");
        const activeSemesterId = activeSem.recordset[0]?.Id;
        const semesterId = querySemesterId || activeSemesterId;

        // Structured query to get cumulative scores per student per course
        const query = `
            WITH StudentCourseResults AS (
                SELECT 
                    u.UserId as StudentId,
                    u.FullName as StudentName,
                    co.CourseId,
                    co.CourseName,
                    ISNULL(SUM(se.Score), 0) as CourseTotal
                FROM Users u
                JOIN StudentClasses sc ON u.UserId = sc.StudentId
                CROSS JOIN (
                    SELECT DISTINCT ta.CourseId, c.CourseName
                    FROM TeacherAssignments ta
                    JOIN Courses c ON ta.CourseId = c.CourseId
                    WHERE ta.ClassId = @classId
                ) co
                LEFT JOIN Exams e ON e.CourseId = co.CourseId AND e.ClassId = @classId
                LEFT JOIN StudentExams se ON se.ExamId = e.ExamId AND se.StudentId = u.UserId AND se.Status IN ('Submitted', 'Graded')
                WHERE sc.ClassId = @classId
                ${semesterId ? 'AND (e.SemesterId = @semesterId OR e.SemesterId IS NULL)' : ''}
                GROUP BY u.UserId, u.FullName, co.CourseId, co.CourseName
            ),
            StudentAverages AS (
                SELECT 
                    StudentId,
                    StudentName,
                    AVG(CAST(CourseTotal AS FLOAT)) as SemesterAverage,
                    COUNT(CourseId) as CourseCount
                FROM StudentCourseResults
                GROUP BY StudentId, StudentName
            )
            SELECT 
                sa.*,
                RANK() OVER (ORDER BY sa.SemesterAverage DESC) as Rank,
                (
                    SELECT CourseName, CourseTotal 
                    FROM StudentCourseResults scr 
                    WHERE scr.StudentId = sa.StudentId 
                    FOR JSON PATH
                ) as DetailedResults
            FROM StudentAverages sa
            ORDER BY sa.SemesterAverage DESC
        `;

        const request = pool.request()
            .input('classId', sql.Int, classId);

        if (semesterId) request.input('semesterId', sql.Int, semesterId);

        const result = await request.query(query);

        // Parse JSON strings back to objects
        const rankings = result.recordset.map(row => ({
            ...row,
            DetailedResults: JSON.parse(row.DetailedResults || '[]')
        }));

        res.json(rankings);
    } catch (err) {
        console.error('getClassRankings error:', err);
        res.status(500).json({ message: 'Error calculating rankings' });
    }
};

export const gradeEssayAnswers = async (req: Request, res: Response) => {
    const { attemptId, feedback, marks } = req.body; // marks = { questionId: points }
    const user = (req as any).user;

    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Update StudentAnswers with marks and feedback
            for (const [qId, points] of Object.entries(marks)) {
                await transaction.request()
                    .input('attemptId', sql.Int, attemptId)
                    .input('questionId', sql.Int, qId)
                    .input('points', sql.Decimal(5, 2), points)
                    .input('feedback', sql.NVarChar, feedback?.[qId] || null)
                    .query(`
                        UPDATE StudentAnswers 
                        SET MarksAwarded = @points, Feedback = @feedback 
                        WHERE AttemptId = @attemptId AND QuestionId = @questionId
                    `);
            }

            // 2. Fetch all questions to recalculate totals
            const questionsRes = await transaction.request()
                .input('attemptId', sql.Int, attemptId)
                .query(`
                    SELECT q.QuestionId, q.Type, q.Points,
                        sa.SelectedOptionId, sa.MatchingAnswer, sa.MarksAwarded,
                        (SELECT o.OptionId FROM Options o WHERE o.QuestionId = q.QuestionId AND o.IsCorrect = 1) as CorrectOptionId,
                        (SELECT mp.PairId, mp.RightText FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId FOR JSON PATH) as MatchingPairs,
                        e.TotalMarks
                    FROM Questions q
                    JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                    JOIN Exams e ON q.ExamId = e.ExamId
                    LEFT JOIN StudentAnswers sa ON q.QuestionId = sa.QuestionId AND sa.AttemptId = @attemptId
                    WHERE sqo.AttemptId = @attemptId
                `);

            if (questionsRes.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Questions for attempt not found' });
            }

            let earnedPoints = 0;
            let totalPossiblePoints = 0;
            let correctCount = 0;
            const examTotalMarks = Number(questionsRes.recordset[0].TotalMarks);

            for (const q of questionsRes.recordset) {
                const qPoints = Number(q.Points) || 0;
                if (q.Type === 'MCQ' || q.Type === 'TF') {
                    totalPossiblePoints += qPoints;
                    if (q.SelectedOptionId && q.SelectedOptionId === q.CorrectOptionId) {
                        earnedPoints += qPoints;
                        correctCount++;
                    }
                } else if (q.Type === 'Matching') {
                    const pairs = JSON.parse(q.MatchingPairs || '[]');
                    totalPossiblePoints += (qPoints * pairs.length);
                    if (q.MatchingAnswer) {
                        const studentPairs = JSON.parse(q.MatchingAnswer);
                        let qCorr = 0;
                        for (const p of pairs) {
                            const sAns = String(studentPairs[p.PairId] || studentPairs[String(p.PairId)] || '').trim().toLowerCase();
                            if (sAns === String(p.RightText || '').trim().toLowerCase() && sAns !== '') qCorr++;
                        }
                        earnedPoints += (qCorr * qPoints);
                        correctCount += qCorr;
                    }
                } else if (q.Type === 'Essay') {
                    totalPossiblePoints += qPoints;
                    earnedPoints += Number(q.MarksAwarded) || 0;
                    if (Number(q.MarksAwarded) >= qPoints * 0.5) correctCount++;
                }
            }

            const scaleFactor = examTotalMarks || totalPossiblePoints || 100;
            const percentage = (earnedPoints / scaleFactor) * 100;

            await transaction.request()
                .input('attemptId', sql.Int, attemptId)
                .input('score', sql.Decimal(10, 2), earnedPoints)
                .input('percentage', sql.Decimal(5, 2), percentage)
                .input('correctCount', sql.Int, correctCount)
                .query(`
                    UPDATE StudentExams 
                    SET Score = @score, Percentage = @percentage, CorrectCount = @correctCount, Status = 'Graded' 
                    WHERE AttemptId = @attemptId
                `);

            await transaction.commit();
            res.json({ message: 'Essay grading completed successfully', finalScore: earnedPoints, percentage });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('gradeEssayAnswers error:', err);
        res.status(500).json({ message: 'Error grading essay answers' });
    }
};

