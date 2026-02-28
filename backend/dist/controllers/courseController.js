import { sql, poolPromise } from '../config/db.js';
export const getCourses = async (req, res) => {
    const { academicYearId, semesterId, gradeId, sectionId } = req.query;
    try {
        const pool = await poolPromise;
        let query = `
            SELECT 
                c.*, 
                ay.Name as AcademicYearName,
                s.Name as SemesterName,
                (SELECT COUNT(DISTINCT ClassId) FROM TeacherAssignments ta WHERE ta.CourseId = c.CourseId) as ClassCount,
                (
                    SELECT 
                        ta.AssignmentId,
                        ta.ClassId,
                        cl.GradeName,
                        cl.Section,
                        ta.TeacherId,
                        u.FullName as TeacherName
                    FROM TeacherAssignments ta
                    JOIN Classes cl ON ta.ClassId = cl.ClassId
                    JOIN Users u ON ta.TeacherId = u.UserId
                    WHERE ta.CourseId = c.CourseId
                    FOR JSON PATH
                ) as Assignments
            FROM Courses c
            LEFT JOIN AcademicYears ay ON c.AcademicYearId = ay.Id
            LEFT JOIN Semesters s ON c.SemesterId = s.Id
            WHERE 1=1
        `;
        const request = pool.request();
        if (academicYearId) {
            query += ' AND c.AcademicYearId = @ayId';
            request.input('ayId', sql.Int, academicYearId);
        }
        if (semesterId) {
            // Relaxed filter: show courses assigned to this semester OR courses in the same year
            query += ` AND (c.SemesterId = @semId OR (c.AcademicYearId IS NOT NULL AND c.AcademicYearId = (SELECT TOP 1 AcademicYearId FROM Semesters WHERE Id = @semId)))`;
            request.input('semId', sql.Int, semesterId);
        }
        if (gradeId) {
            // Courses assigned to this grade in GradeCourses OR courses assigned to a teacher for a class in this grade
            query += ` AND (
                EXISTS (SELECT 1 FROM GradeCourses gc WHERE gc.CourseId = c.CourseId AND gc.GradeId = @gradeId)
                OR EXISTS (
                    SELECT 1 FROM TeacherAssignments ta 
                    JOIN Classes cl ON ta.ClassId = cl.ClassId 
                    JOIN Grades g ON (CASE WHEN cl.GradeName LIKE 'Grade %' THEN REPLACE(cl.GradeName, 'Grade ', '') ELSE cl.GradeName END = CAST(g.GradeNumber AS VARCHAR(10)))
                    WHERE ta.CourseId = c.CourseId AND g.Id = @gradeId
                )
            )`;
            request.input('gradeId', sql.Int, gradeId);
        }
        // Note: Filtering by SectionId for a course is a bit ambiguous since a course is global or linked to assignments.
        // If a section is provided, we probably mean courses that have assignments in that specific section.
        if (sectionId) {
            query += ` AND EXISTS (
                SELECT 1 FROM TeacherAssignments ta 
                JOIN Classes cl ON ta.ClassId = cl.ClassId
                JOIN Sections sec ON cl.Section = sec.Name 
                JOIN Grades g ON (CASE WHEN cl.GradeName LIKE 'Grade %' THEN REPLACE(cl.GradeName, 'Grade ', '') ELSE cl.GradeName END = CAST(g.GradeNumber AS VARCHAR(10)))
                WHERE ta.CourseId = c.CourseId AND sec.Id = @sectionId AND sec.GradeId = g.Id
            )`;
            request.input('sectionId', sql.Int, sectionId);
        }
        const result = await request.query(query);
        // Parse the Assignments JSON string for each course
        const courses = result.recordset.map(course => ({
            ...course,
            Assignments: course.Assignments ? JSON.parse(course.Assignments) : []
        }));
        res.json(courses);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching courses' });
    }
};
export const createCourse = async (req, res) => {
    const { courseName, courseCode, description, academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('courseName', sql.NVarChar, courseName)
            .input('courseCode', sql.NVarChar, courseCode)
            .input('description', sql.NVarChar, description)
            .input('ayId', sql.Int, academicYearId || null)
            .input('semId', sql.Int, semesterId || null)
            .query('INSERT INTO Courses (CourseName, CourseCode, Description, AcademicYearId, SemesterId) VALUES (@courseName, @courseCode, @description, @ayId, @semId)');
        res.status(201).json({ message: 'Course created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating course' });
    }
};
export const updateCourse = async (req, res) => {
    const { id } = req.params;
    const { courseName, courseCode, description, academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('courseName', sql.NVarChar, courseName)
            .input('courseCode', sql.NVarChar, courseCode)
            .input('description', sql.NVarChar, description)
            .input('ayId', sql.Int, academicYearId || null)
            .input('semId', sql.Int, semesterId || null)
            .query('UPDATE Courses SET CourseName = @courseName, CourseCode = @courseCode, Description = @description, AcademicYearId = @ayId, SemesterId = @semId WHERE CourseId = @id');
        res.json({ message: 'Course updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating course' });
    }
};
export const deleteCourse = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Courses WHERE CourseId = @id');
        res.json({ message: 'Course deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting course' });
    }
};
