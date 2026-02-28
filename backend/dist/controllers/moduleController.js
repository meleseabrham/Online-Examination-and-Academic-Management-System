import { sql, poolPromise } from '../config/db.js';
export const getModules = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { courseId, gradeId, section, semesterId, ayId } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT m.*, c.CourseName, cl.GradeName, cl.Section, u.FullName as TeacherName,
                   ay.Name as AcademicYearName, s.Name as SemesterName
            FROM CourseModules m
            JOIN Courses c ON m.CourseId = c.CourseId
            LEFT JOIN Classes cl ON m.ClassId = cl.ClassId
            JOIN Users u ON m.TeacherId = u.UserId
            LEFT JOIN AcademicYears ay ON m.AcademicYearId = ay.Id
            LEFT JOIN Semesters s ON m.SemesterId = s.Id
            WHERE 1=1
        `;
        if (role === 'Teacher' || role === 'teacher') {
            query += " AND m.TeacherId = @userId";
            request.input('userId', sql.Int, userId);
        }
        else if (role === 'Student' || role === 'student') {
            // Students see modules for their enrolled classes/courses
            query += ` AND (
                m.ClassId IS NULL OR 
                m.ClassId IN (SELECT ClassId FROM StudentClasses WHERE StudentId = @userId)
            ) AND m.CourseId IN (
                SELECT ta.CourseId FROM TeacherAssignments ta 
                JOIN StudentClasses sc ON ta.ClassId = sc.ClassId 
                WHERE sc.StudentId = @userId
            )`;
            request.input('userId', sql.Int, userId);
        }
        if (courseId) {
            query += " AND m.CourseId = @courseId";
            request.input('courseId', sql.Int, courseId);
        }
        if (gradeId) {
            query += " AND cl.GradeName = (SELECT 'Grade ' + CAST(GradeNumber AS NVARCHAR) FROM Grades WHERE Id = @gradeId)";
            request.input('gradeId', sql.Int, gradeId);
        }
        if (section) {
            query += " AND cl.Section = @section";
            request.input('section', sql.NVarChar, section);
        }
        if (semesterId) {
            query += " AND m.SemesterId = @semesterId";
            request.input('semesterId', sql.Int, semesterId);
        }
        if (ayId) {
            query += " AND m.AcademicYearId = @ayId";
            request.input('ayId', sql.Int, ayId);
        }
        query += " ORDER BY m.CreatedAt DESC";
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getModules error:', err);
        res.status(500).json({ message: 'Error fetching modules' });
    }
};
export const createModule = async (req, res) => {
    const teacherId = req.user.id;
    const { title, description, courseId, classId, semesterId, academicYearId, externalLink } = req.body;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
    const fileName = req.file ? req.file.originalname : null;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('courseId', sql.Int, Number(courseId))
            .input('classId', sql.Int, classId ? Number(classId) : null)
            .input('semesterId', sql.Int, Number(semesterId))
            .input('academicYearId', sql.Int, Number(academicYearId))
            .input('teacherId', sql.Int, teacherId)
            .input('fileName', sql.NVarChar, fileName)
            .input('filePath', sql.NVarChar, filePath)
            .input('externalLink', sql.NVarChar, externalLink || null)
            .query(`
                INSERT INTO CourseModules (Title, Description, CourseId, ClassId, SemesterId, AcademicYearId, TeacherId, FileName, FilePath, ExternalLink)
                VALUES (@title, @description, @courseId, @classId, @semesterId, @academicYearId, @teacherId, @fileName, @filePath, @externalLink)
            `);
        res.status(201).json({ message: 'Module created successfully' });
    }
    catch (err) {
        console.error('createModule error:', err);
        res.status(500).json({ message: 'Error creating module' });
    }
};
export const updateModule = async (req, res) => {
    const { id } = req.params;
    const { title, description, courseId, classId, semesterId, academicYearId, externalLink } = req.body;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : undefined;
    const fileName = req.file ? req.file.originalname : undefined;
    try {
        const pool = await poolPromise;
        let query = `
            UPDATE CourseModules SET 
                Title = @title, 
                Description = @description, 
                CourseId = @courseId, 
                ClassId = @classId, 
                SemesterId = @semesterId, 
                AcademicYearId = @academicYearId,
                ExternalLink = @externalLink
        `;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('courseId', sql.Int, Number(courseId))
            .input('classId', sql.Int, classId ? Number(classId) : null)
            .input('semesterId', sql.Int, Number(semesterId))
            .input('academicYearId', sql.Int, Number(academicYearId))
            .input('externalLink', sql.NVarChar, externalLink || null);
        if (filePath !== undefined) {
            query += ", FilePath = @filePath, FileName = @fileName";
            request.input('filePath', sql.NVarChar, filePath);
            request.input('fileName', sql.NVarChar, fileName);
        }
        query += " WHERE ModuleId = @id";
        await request.query(query);
        res.json({ message: 'Module updated successfully' });
    }
    catch (err) {
        console.error('updateModule error:', err);
        res.status(500).json({ message: 'Error updating module' });
    }
};
export const deleteModule = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM CourseModules WHERE ModuleId = @id');
        res.json({ message: 'Module deleted successfully' });
    }
    catch (err) {
        console.error('deleteModule error:', err);
        res.status(500).json({ message: 'Error deleting module' });
    }
};
