import { sql, poolPromise } from '../config/db.js';
/**
 * Step 1: Calculate Weighted Course Totals for all students in a semester.
 * Combines Exams and Assessments.
 */
export const calculateCourseTotals = async (req, res) => {
    const { academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        // 1. Get all active enrollments
        const enrollments = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query("SELECT StudentId, GradeId, SectionId, SchoolId FROM StudentEnrollments WHERE AcademicYearId = @ayId AND Status = 'Active'");
        for (const enroll of enrollments.recordset) {
            // 2. Get all courses for this grade
            const coursesRes = await pool.request()
                .input('gid', sql.Int, enroll.GradeId)
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .query("SELECT CourseId FROM GradeCourses WHERE GradeId = @gid AND (AcademicYearId = @ayId OR AcademicYearId IS NULL) AND (SemesterId = @semId OR SemesterId IS NULL)");
            for (const course of coursesRes.recordset) {
                // 3. Calculate weighted total for this course
                const result = await pool.request()
                    .input('sid', sql.Int, enroll.StudentId)
                    .input('cid', sql.Int, course.CourseId)
                    .input('semId', sql.Int, semesterId)
                    .input('gid', sql.Int, enroll.GradeId)
                    .query(`
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
                                     WHERE e.CourseId = a.CourseId AND e.SemesterId = a.SemesterId AND LOWER(e.ExamType) = LOWER(a.Type) 
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
                            WHERE a.GradeId = @gid AND a.SemesterId = @semId AND a.CourseId = @cid
                        )
                        SELECT 
                            ISNULL(SUM(
                                CASE 
                                    WHEN ScoreStatus IN ('Graded', 'Submitted') AND BestMark IS NOT NULL AND TotalMarks > 0
                                    THEN (BestMark / TotalMarks) * WeightPercentage
                                    ELSE 0 
                                END
                            ), 0) as CourseTotal
                        FROM AssessmentData;
                    `);
                const weightedTotal = result.recordset[0].CourseTotal || 0;
                // 4. Upsert into StudentCourseResults
                await pool.request()
                    .input('sid', sql.Int, enroll.StudentId)
                    .input('cid', sql.Int, course.CourseId)
                    .input('semId', sql.Int, semesterId)
                    .input('ayId', sql.Int, academicYearId)
                    .input('gid', sql.Int, enroll.GradeId)
                    .input('weight', sql.Decimal(5, 2), weightedTotal)
                    .query(`
                        IF EXISTS (SELECT 1 FROM StudentCourseResults WHERE StudentId = @sid AND CourseId = @cid AND SemesterId = @semId AND AcademicYearId = @ayId)
                        BEGIN
                            UPDATE StudentCourseResults SET WeightedTotal = @weight, CalculatedAt = GETDATE()
                            WHERE StudentId = @sid AND CourseId = @cid AND SemesterId = @semId AND AcademicYearId = @ayId
                        END
                        ELSE
                        BEGIN
                            INSERT INTO StudentCourseResults (StudentId, CourseId, SemesterId, AcademicYearId, GradeId, WeightedTotal)
                            VALUES (@sid, @cid, @semId, @ayId, @gid, @weight)
                        END
                    `);
            }
        }
        res.json({ message: 'Course totals calculated successfully.' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error calculating course totals' });
    }
};
/**
 * Step 2: Calculate Semester Average and Rankings.
 * Uses StudentCourseResults.
 */
export const calculateSemesterRankings = async (req, res) => {
    const { academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        // 1. Calculate Average per student for the semester
        const students = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query("SELECT StudentId, GradeId, SectionId, SchoolId FROM StudentEnrollments WHERE AcademicYearId = @ayId AND Status = 'Active'");
        for (const student of students.recordset) {
            const avgRes = await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('semId', sql.Int, semesterId)
                .input('ayId', sql.Int, academicYearId)
                .query(`
                    SELECT AVG(WeightedTotal) as SemesterAverage, COUNT(*) as CourseCount
                    FROM StudentCourseResults 
                    WHERE StudentId = @sid AND SemesterId = @semId AND AcademicYearId = @ayId
                `);
            const average = avgRes.recordset[0].SemesterAverage || 0;
            const count = avgRes.recordset[0].CourseCount || 0;
            await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .input('avg', sql.Decimal(5, 2), average)
                .input('count', sql.Int, count)
                .input('schId', sql.Int, student.SchoolId)
                .query(`
                    IF EXISTS (SELECT 1 FROM SemesterResults WHERE StudentId = @sid AND AcademicYearId = @ayId AND SemesterId = @semId)
                    BEGIN
                        UPDATE SemesterResults SET Average = @avg, TotalCourses = @count, SchoolId = @schId, CalculatedAt = GETDATE()
                        WHERE StudentId = @sid AND AcademicYearId = @ayId AND SemesterId = @semId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO SemesterResults (StudentId, AcademicYearId, SemesterId, Average, TotalCourses, SchoolId)
                        VALUES (@sid, @ayId, @semId, @avg, @count, @schId)
                    END
                `);
        }
        // 2. Perform Rankings using DENSE_RANK()
        console.log('Calculating rankings for semester...');
        await pool.request().input('ayId', sql.Int, academicYearId).input('semId', sql.Int, semesterId).query(`
            -- Update Class Ranks
            WITH ClassRanked AS (
                SELECT sr.Id, DENSE_RANK() OVER (PARTITION BY se.SectionId ORDER BY sr.Average DESC) as NewRank
                FROM SemesterResults sr
                JOIN StudentEnrollments se ON sr.StudentId = se.StudentId AND sr.AcademicYearId = se.AcademicYearId
                WHERE sr.AcademicYearId = @ayId AND sr.SemesterId = @semId
            )
            UPDATE sr SET sr.ClassRank = cr.NewRank FROM SemesterResults sr JOIN ClassRanked cr ON sr.Id = cr.Id;

            -- Update Grade Ranks
            WITH GradeRanked AS (
                SELECT sr.Id, DENSE_RANK() OVER (PARTITION BY se.GradeId ORDER BY sr.Average DESC) as NewRank
                FROM SemesterResults sr
                JOIN StudentEnrollments se ON sr.StudentId = se.StudentId AND sr.AcademicYearId = se.AcademicYearId
                WHERE sr.AcademicYearId = @ayId AND sr.SemesterId = @semId
            )
            UPDATE sr SET sr.GradeRank = gr.NewRank FROM SemesterResults sr JOIN GradeRanked gr ON sr.Id = gr.Id;

            -- Update School Ranks
            WITH SchoolRanked AS (
                SELECT sr.Id, DENSE_RANK() OVER (PARTITION BY se.SchoolId ORDER BY sr.Average DESC) as NewRank
                FROM SemesterResults sr
                JOIN StudentEnrollments se ON sr.StudentId = se.StudentId AND sr.AcademicYearId = se.AcademicYearId
                WHERE sr.AcademicYearId = @ayId AND sr.SemesterId = @semId
            )
            UPDATE sr SET sr.SchoolRank = lr.NewRank FROM SemesterResults sr JOIN SchoolRanked lr ON sr.Id = lr.Id;
        `);
        res.json({ message: 'Semester rankings calculated successfully.' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error calculating semester rankings' });
    }
};
/**
 * Step 3: Final Year Calculation & Rankings.
 */
export const calculateFinalYearResults = async (req, res) => {
    const { academicYearId } = req.body;
    try {
        const pool = await poolPromise;
        const students = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query("SELECT StudentId, GradeId, SectionId, SchoolId FROM StudentEnrollments WHERE AcademicYearId = @ayId AND Status = 'Active'");
        for (const student of students.recordset) {
            const avgRes = await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .query("SELECT AVG(Average) as FinalAvg FROM SemesterResults WHERE StudentId = @sid AND AcademicYearId = @ayId");
            const finalAvg = avgRes.recordset[0].FinalAvg || 0;
            const status = finalAvg >= 50 ? 'Passed' : 'Failed';
            await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .input('gid', sql.Int, student.GradeId)
                .input('secId', sql.Int, student.SectionId)
                .input('schId', sql.Int, student.SchoolId)
                .input('avg', sql.Decimal(5, 2), finalAvg)
                .input('status', sql.NVarChar, status)
                .query(`
                    IF EXISTS (SELECT 1 FROM FinalYearResult WHERE StudentId = @sid AND AcademicYearId = @ayId)
                    BEGIN
                        UPDATE FinalYearResult SET FinalAverage = @avg, Status = @status, CreatedAt = GETDATE()
                        WHERE StudentId = @sid AND AcademicYearId = @ayId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO FinalYearResult (StudentId, AcademicYearId, GradeId, SectionId, SchoolId, FinalAverage, Status)
                        VALUES (@sid, @ayId, @gid, @secId, @schId, @avg, @status)
                    END
                `);
        }
        // Final Rankings
        await pool.request().input('ayId', sql.Int, academicYearId).query(`
            -- Final Class Ranks
            WITH Ranked AS (SELECT Id, DENSE_RANK() OVER (PARTITION BY SectionId ORDER BY FinalAverage DESC) as R FROM FinalYearResult WHERE AcademicYearId = @ayId)
            UPDATE f SET ClassRank = R FROM FinalYearResult f JOIN Ranked r ON f.Id = r.Id;

            -- Final Grade Ranks
            WITH Ranked AS (SELECT Id, DENSE_RANK() OVER (PARTITION BY GradeId ORDER BY FinalAverage DESC) as R FROM FinalYearResult WHERE AcademicYearId = @ayId)
            UPDATE f SET GradeRank = R FROM FinalYearResult f JOIN Ranked r ON f.Id = r.Id;

            -- Final School Ranks
            WITH Ranked AS (SELECT Id, DENSE_RANK() OVER (PARTITION BY SchoolId ORDER BY FinalAverage DESC) as R FROM FinalYearResult WHERE AcademicYearId = @ayId)
            UPDATE f SET SchoolRank = R FROM FinalYearResult f JOIN Ranked r ON f.Id = r.Id;
        `);
        res.json({ message: 'Final year results and rankings calculated.' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error calculating final results' });
    }
};
/**
 * Get detailed semester results for a student.
 */
export const getStudentSemesterResults = async (req, res) => {
    const studentId = req.user.id;
    const { academicYearId, semesterId } = req.query;
    try {
        const pool = await poolPromise;
        // 1. Get Semester Average & Ranks
        const summary = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('ayId', sql.Int, academicYearId)
            .input('semId', sql.Int, semesterId)
            .query(`
                SELECT sr.*, s.Name as SemesterName, ay.Name as AcademicYearName
                FROM SemesterResults sr
                JOIN Semesters s ON sr.SemesterId = s.Id
                JOIN AcademicYears ay ON sr.AcademicYearId = ay.Id
                WHERE sr.StudentId = @sid AND sr.AcademicYearId = @ayId AND sr.SemesterId = @semId
            `);
        // 2. Get Course-by-Course weighted totals
        const courses = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('ayId', sql.Int, academicYearId)
            .input('semId', sql.Int, semesterId)
            .query(`
                SELECT SCR.*, C.CourseName, C.CourseCode
                FROM StudentCourseResults SCR
                JOIN Courses C ON SCR.CourseId = C.CourseId
                WHERE SCR.StudentId = @sid AND SCR.AcademicYearId = @ayId AND SCR.SemesterId = @semId
            `);
        // 3. Get Breakdown per course (Exams vs Assessments)
        // This is a bit more complex, but we can return the totals for now.
        res.json({
            summary: summary.recordset[0] || null,
            courses: courses.recordset
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching semester results' });
    }
};
/**
 * Get rankings for a specific semester (Teacher/Admin).
 */
export const getSemesterRankings = async (req, res) => {
    const { academicYearId, semesterId, gradeId, sectionId, schoolId } = req.query;
    const user = req.user;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT sr.*, u.FullName as StudentName, u.Email as StudentEmail, g.GradeNumber, s.Name as SectionName
            FROM SemesterResults sr
            JOIN Users u ON sr.StudentId = u.UserId
            JOIN StudentEnrollments se ON sr.StudentId = se.StudentId AND sr.AcademicYearId = se.AcademicYearId
            JOIN Grades g ON se.GradeId = g.Id
            JOIN Sections s ON se.SectionId = s.Id
            WHERE sr.AcademicYearId = @ayId AND sr.SemesterId = @semId
        `;
        request.input('ayId', sql.Int, academicYearId);
        request.input('semId', sql.Int, semesterId);
        if (schoolId || user.schoolId) {
            query += " AND sr.SchoolId = @schId";
            request.input('schId', sql.Int, schoolId || user.schoolId);
        }
        if (user.role === 'Teacher') {
            query += ` AND se.SectionId IN (
                SELECT sec.Id FROM Sections sec
                JOIN Grades gra ON sec.GradeId = gra.Id
                JOIN Classes cls ON cls.Section = sec.Name AND cls.GradeName = 'Grade ' + CAST(gra.GradeNumber AS NVARCHAR)
                JOIN TeacherAssignments tasm ON tasm.ClassId = cls.ClassId
                WHERE tasm.TeacherId = @tId AND tasm.AcademicYearId = @ayId
            )`;
            request.input('tId', sql.Int, user.id);
        }
        if (gradeId) {
            query += " AND se.GradeId = @gradeId";
            request.input('gradeId', sql.Int, gradeId);
        }
        if (sectionId) {
            query += " AND se.SectionId = @secId";
            request.input('secId', sql.Int, sectionId);
        }
        query += " ORDER BY sr.Average DESC, sr.SchoolRank ASC";
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getSemesterRankings error:', err);
        res.status(500).json({ message: 'Error fetching semester rankings' });
    }
};
/**
 * Step 4: Check processing status.
 */
export const getAcademicProcessingStatus = async (req, res) => {
    const { academicYearId, semesterId } = req.query;
    try {
        const pool = await poolPromise;
        let courseTotalsExist = false;
        if (semesterId) {
            const ctRes = await pool.request()
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .query("SELECT TOP 1 1 as [Exists] FROM StudentCourseResults WHERE AcademicYearId = @ayId AND SemesterId = @semId");
            courseTotalsExist = ctRes.recordset.length > 0;
        }
        let ranksExist = false;
        if (semesterId) {
            const rRes = await pool.request()
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .query("SELECT TOP 1 1 as [Exists] FROM SemesterResults WHERE AcademicYearId = @ayId AND SemesterId = @semId AND ClassRank IS NOT NULL");
            ranksExist = rRes.recordset.length > 0;
        }
        const fyRes = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query("SELECT TOP 1 1 as [Exists] FROM FinalYearResult WHERE AcademicYearId = @ayId");
        const finalYearExist = fyRes.recordset.length > 0;
        // Check if both semesters have rankings (requirement for Final Year)
        const semsWithRanks = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query("SELECT COUNT(DISTINCT SemesterId) as Count FROM SemesterResults WHERE AcademicYearId = @ayId AND ClassRank IS NOT NULL");
        const rankingsDoneCount = semsWithRanks.recordset[0].Count || 0;
        res.json({
            courseTotalsCalculated: courseTotalsExist,
            ranksCalculated: ranksExist,
            finalYearCalculated: finalYearExist,
            rankingsDoneCount
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error checking processing status' });
    }
};
