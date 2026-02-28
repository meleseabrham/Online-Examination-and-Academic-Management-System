import { poolPromise } from '../config/db.js';
export const getAdminStats = async (req, res) => {
    try {
        const pool = await poolPromise;
        // 1. Basic Counts
        const counts = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Users WHERE Role = 'Student') as studentCount,
                (SELECT COUNT(*) FROM Users WHERE Role = 'Teacher') as teacherCount,
                (SELECT COUNT(*) FROM Courses) as courseCount,
                (SELECT COUNT(*) FROM Sections) as classCount,
                (SELECT COUNT(*) FROM Exams) as examCount,
                (SELECT COUNT(*) FROM StudentExams WHERE Status = 'Started') as activeExamsNow
            FROM (SELECT 1 as dummy) as t
        `);
        // 2. Recent Users (Registered in the last 1 hour)
        const recentUsers = await pool.request().query(`
            SELECT TOP 5 FullName as name, Role as role, Email as email, CreatedAt as date
            FROM Users
            WHERE CreatedAt >= DATEADD(HOUR, -1, GETDATE())
            ORDER BY CreatedAt DESC
        `);
        // 3. Monthly Registrations (Last 6 Months)
        const registrations = await pool.request().query(`
            SELECT 
                FORMAT(CreatedAt, 'MMM') as name,
                COUNT(*) as registrations,
                MIN(CreatedAt) as sortDate
            FROM Users
            WHERE CreatedAt >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY FORMAT(CreatedAt, 'MMM')
            ORDER BY sortDate ASC
        `);
        res.json({
            stats: counts.recordset[0],
            recentUsers: recentUsers.recordset,
            monthlyRegistrations: registrations.recordset
        });
    }
    catch (err) {
        console.error('getAdminStats error:', err);
        res.status(500).json({ message: 'Error fetching admin stats' });
    }
};
export const getReportsData = async (req, res) => {
    let { range = '6' } = req.query;
    let rangeInMonths = parseInt(range);
    if (isNaN(rangeInMonths))
        rangeInMonths = 6;
    try {
        const pool = await poolPromise;
        // 1. Course Wise Performance
        const coursePerf = await pool.request().query(`
            SELECT 
                c.CourseName,
                (SELECT TOP 1 u.FullName FROM Users u 
                 JOIN TeacherAssignments ta ON ta.TeacherId = u.UserId 
                 WHERE ta.CourseId = c.CourseId) as Instructor,
                COUNT(se.AttemptId) as TotalAttempts,
                AVG(CAST(se.Score as FLOAT)) as AverageScore,
                MAX(CAST(se.Score as FLOAT)) as TopScore
            FROM Courses c
            LEFT JOIN Exams e ON c.CourseId = e.CourseId
            LEFT JOIN StudentExams se ON e.ExamId = se.ExamId
            WHERE se.Status IN ('Submitted', 'Graded')
            GROUP BY c.CourseName, c.CourseId
        `);
        // 2. Exam Participation Trend (By Date Range)
        const participationTrend = await pool.request().query(`
            SELECT 
                FORMAT(StartTime, 'MMM dd') as month,
                COUNT(*) as attempts,
                MIN(StartTime) as sortDate
            FROM StudentExams
            WHERE StartTime >= DATEADD(MONTH, -${rangeInMonths}, GETDATE())
            GROUP BY FORMAT(StartTime, 'MMM dd')
            ORDER BY sortDate ASC
        `);
        // 3. Class Distribution (Students per Class)
        const classDist = await pool.request().query(`
            SELECT 
                'Grade ' + CAST(g.GradeNumber AS VARCHAR) + ISNULL(' - ' + s.Name, '') as className,
                COUNT(se.StudentId) as studentCount
            FROM StudentEnrollments se
            JOIN Grades g ON se.GradeId = g.Id
            LEFT JOIN Sections s ON se.SectionId = s.Id
            WHERE se.Status = 'Active'
            GROUP BY g.GradeNumber, s.Name
            ORDER BY g.GradeNumber, s.Name
        `);
        // 4. Teacher Performance (Avg Score per Teacher)
        const teacherPerf = await pool.request().query(`
            SELECT 
                t.FullName as teacherName,
                AVG(CAST(se.Score as FLOAT)) as avgScore,
                COUNT(se.AttemptId) as totalGraded
            FROM Users t
            JOIN Exams e ON t.UserId = e.TeacherId
            JOIN StudentExams se ON e.ExamId = se.ExamId
            WHERE t.Role = 'Teacher' AND se.Status IN ('Submitted', 'Graded')
            GROUP BY t.FullName
        `);
        // 5. Overall Statistics
        const overall = await pool.request().query(`
            SELECT 
                AVG(CAST(Score as FLOAT)) as globalAverage,
                COUNT(*) as totalExamsTaken
            FROM StudentExams
            WHERE Status IN ('Submitted', 'Graded')
        `);
        res.json({
            coursePerformance: coursePerf.recordset,
            participationTrend: participationTrend.recordset,
            classDistribution: classDist.recordset,
            teacherPerformance: teacherPerf.recordset,
            overall: overall.recordset[0]
        });
    }
    catch (err) {
        console.error('getReportsData error:', err);
        res.status(500).json({ message: 'Error fetching reports data' });
    }
};
export const getAdminNotifications = async (req, res) => {
    try {
        const pool = await poolPromise;
        const announcementsResult = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM Announcements
            WHERE (Deadline IS NULL OR Deadline >= CAST(GETDATE() AS DATE))
        `);
        // Count only active student exams that are within their time window
        const liveExamsResult = await pool.request().query(`
            SELECT COUNT(DISTINCT se.AttemptId) as count 
            FROM StudentExams se
            JOIN Exams e ON se.ExamId = e.ExamId
            WHERE se.Status = 'Started' AND se.IsLocked = 0
            AND DATEADD(MINUTE, e.DurationMinutes + 30, se.StartTime) > GETDATE()
        `);
        res.json({
            announcements: announcementsResult.recordset[0].count,
            liveExams: liveExamsResult.recordset[0].count
        });
    }
    catch (err) {
        console.error('getAdminNotifications error:', err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};
export const getCourses = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Courses ORDER BY CourseName');
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching courses' });
    }
};
