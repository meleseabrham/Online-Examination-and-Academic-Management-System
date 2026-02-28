import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';

export const getAdminStats = async (req: Request, res: Response) => {
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
                (SELECT COUNT(DISTINCT e.ExamId) FROM Exams e
                 JOIN AcademicYears ay ON e.AcademicYearId = ay.Id
                 LEFT JOIN Semesters s ON e.SemesterId = s.Id
                 WHERE e.IsPublished = 1
                   AND ay.IsActive = 1
                   AND (e.SemesterId IS NULL OR s.IsActive = 1)
                   AND (e.StartTime IS NULL OR e.StartTime <= GETDATE())
                   AND (e.EndTime IS NULL OR e.EndTime >= GETDATE())
                ) as activeExamsNow
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
    } catch (err) {
        console.error('getAdminStats error:', err);
        res.status(500).json({ message: 'Error fetching admin stats' });
    }
};

export const getReportsData = async (req: Request, res: Response) => {
    let { range = '6', classId, schoolId } = req.query;
    let rangeInMonths = parseInt(range as string);
    if (isNaN(rangeInMonths)) rangeInMonths = 6;

    try {
        const pool = await poolPromise;

        // Base filters for Users
        let usersWhere = "Role IN ('Student', 'Teacher')";
        if (schoolId) usersWhere += ` AND SchoolId = ${schoolId}`;

        // Subquery for Class filtering (complex join)
        if (classId) {
            usersWhere += ` AND UserId IN (
                SELECT StudentId FROM StudentEnrollments WHERE GradeId = ${classId} AND Status = 'Active'
                UNION
                SELECT TeacherId FROM TeacherAssignments WHERE ClassId = ${classId}
            )`;
        }

        // 1. Course Wise Performance
        let coursePerfQuery = `
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
        `;
        if (classId) coursePerfQuery += ` AND e.ClassId = ${classId}`;
        coursePerfQuery += ` GROUP BY c.CourseName, c.CourseId`;
        const coursePerf = await pool.request().query(coursePerfQuery);

        // 2. Exam Participation Trend (By Date Range)
        let participationQuery = `
            SELECT 
                FORMAT(se.StartTime, 'MMM dd') as month,
                COUNT(*) as attempts,
                MIN(se.StartTime) as sortDate
            FROM StudentExams se
        `;
        if (classId) participationQuery += ` JOIN Exams e ON se.ExamId = e.ExamId WHERE e.ClassId = ${classId} AND `;
        else participationQuery += ` WHERE `;
        participationQuery += `se.StartTime >= DATEADD(MONTH, -${rangeInMonths}, GETDATE())
            GROUP BY FORMAT(se.StartTime, 'MMM dd')
            ORDER BY sortDate ASC
        `;
        const participationTrend = await pool.request().query(participationQuery);

        // 3. Class Distribution (Students per Class)
        let classDistQuery = `
            SELECT 
                'Grade ' + CAST(g.GradeNumber AS VARCHAR) + ISNULL(' - ' + s.Name, '') as className,
                COUNT(se.StudentId) as studentCount
            FROM StudentEnrollments se
            JOIN Grades g ON se.GradeId = g.Id
            LEFT JOIN Sections s ON se.SectionId = s.Id
            WHERE se.Status = 'Active'
        `;
        if (schoolId) classDistQuery += ` AND se.SchoolId = ${schoolId}`;
        if (classId) classDistQuery += ` AND se.GradeId = ${classId}`;
        classDistQuery += ` GROUP BY g.GradeNumber, s.Name ORDER BY g.GradeNumber, s.Name`;
        const classDist = await pool.request().query(classDistQuery);

        // 4. Teacher Performance (Avg Score per Teacher)
        let teacherPerfQuery = `
            SELECT 
                t.FullName as teacherName,
                AVG(CAST(se.Score as FLOAT)) as avgScore,
                COUNT(se.AttemptId) as totalGraded
            FROM Users t
            JOIN Exams e ON t.UserId = e.TeacherId
            JOIN StudentExams se ON e.ExamId = se.ExamId
            WHERE t.Role = 'Teacher' AND se.Status IN ('Submitted', 'Graded')
        `;
        if (classId) teacherPerfQuery += ` AND e.ClassId = ${classId}`;
        if (schoolId) teacherPerfQuery += ` AND t.SchoolId = ${schoolId}`;
        teacherPerfQuery += ` GROUP BY t.FullName`;
        const teacherPerf = await pool.request().query(teacherPerfQuery);

        // 5. Gender Distribution
        const genderDist = await pool.request().query(`
            SELECT Role, Gender, COUNT(*) as count
            FROM Users
            WHERE ${usersWhere} AND Gender IS NOT NULL
            GROUP BY Role, Gender
        `);

        // 6. Age Distribution
        const ageDist = await pool.request().query(`
            SELECT 
                Role,
                CASE 
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) < 13 THEN 'Child (<13)'
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) BETWEEN 13 AND 19 THEN 'Teen (13-19)'
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) BETWEEN 20 AND 29 THEN 'Young Adult (20-29)'
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) BETWEEN 30 AND 49 THEN 'Adult (30-49)'
                    ELSE 'Senior (50+)'
                END as ageGroup,
                COUNT(*) as count
            FROM Users
            WHERE ${usersWhere} AND DateOfBirth IS NOT NULL
            GROUP BY Role, 
                CASE 
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) < 13 THEN 'Child (<13)'
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) BETWEEN 13 AND 19 THEN 'Teen (13-19)'
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) BETWEEN 20 AND 29 THEN 'Young Adult (20-29)'
                    WHEN DATEDIFF(YEAR, DateOfBirth, GETDATE()) BETWEEN 30 AND 49 THEN 'Adult (30-49)'
                    ELSE 'Senior (50+)'
                END
        `);

        // 7. School Wise Breakdown
        const schoolBreakdown = await pool.request().query(`
            SELECT 
                s.Name as schoolName,
                (SELECT COUNT(*) FROM Users u WHERE u.SchoolId = s.Id AND u.Role = 'Student') as studentCount,
                (SELECT COUNT(*) FROM Users u WHERE u.SchoolId = s.Id AND u.Role = 'Teacher') as teacherCount
            FROM Schools s
        `);

        // 8. Gender breakdown in Classes
        const genderClassDist = await pool.request().query(`
            SELECT 
                'Grade ' + CAST(g.GradeNumber AS VARCHAR) + ISNULL(' - ' + sect.Name, '') as className,
                SUM(CASE WHEN u.Gender = 'Male' THEN 1 ELSE 0 END) as maleCount,
                SUM(CASE WHEN u.Gender = 'Female' THEN 1 ELSE 0 END) as femaleCount
            FROM StudentEnrollments se
            JOIN Users u ON se.StudentId = u.UserId
            JOIN Grades g ON se.GradeId = g.Id
            LEFT JOIN Sections sect ON se.SectionId = sect.Id
            WHERE se.Status = 'Active'
            GROUP BY g.GradeNumber, sect.Name
        `);

        // 9. Overall Statistics
        let overallQuery = `
            SELECT 
                AVG(CAST(Score as FLOAT)) as globalAverage,
                COUNT(*) as totalExamsTaken
            FROM StudentExams se
        `;
        if (classId) overallQuery += ` JOIN Exams e ON se.ExamId = e.ExamId WHERE e.ClassId = ${classId} AND `;
        else overallQuery += ` WHERE `;
        overallQuery += `se.Status IN ('Submitted', 'Graded')`;
        const overall = await pool.request().query(overallQuery);

        res.json({
            coursePerformance: coursePerf.recordset,
            participationTrend: participationTrend.recordset,
            classDistribution: classDist.recordset,
            teacherPerformance: teacherPerf.recordset,
            genderDistribution: genderDist.recordset,
            ageDistribution: ageDist.recordset,
            schoolWiseBreakdown: schoolBreakdown.recordset,
            genderClassDistribution: genderClassDist.recordset,
            overall: overall.recordset[0]
        });
    } catch (err) {
        console.error('getReportsData error:', err);
        res.status(500).json({ message: 'Error fetching reports data' });
    }
};

export const getAdminNotifications = async (req: Request, res: Response) => {
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
    } catch (err) {
        console.error('getAdminNotifications error:', err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};
export const getCourses = async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Courses ORDER BY CourseName');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching courses' });
    }
};
