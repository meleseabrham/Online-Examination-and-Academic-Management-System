import { sql, poolPromise } from '../config/db.js';
/* --- Academic Years --- */
export const getAcademicYears = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM AcademicYears ORDER BY StartDate DESC');
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching academic years' });
    }
};
export const createAcademicYear = async (req, res) => {
    const { name, startDate, endDate, isActive } = req.body;
    try {
        const pool = await poolPromise;
        if (isActive) {
            await pool.request().query('UPDATE AcademicYears SET IsActive = 0');
        }
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('startDate', sql.DateTime, startDate)
            .input('endDate', sql.DateTime, endDate)
            .input('isActive', sql.Bit, isActive ? 1 : 0)
            .query('INSERT INTO AcademicYears (Name, StartDate, EndDate, IsActive) VALUES (@name, @startDate, @endDate, @isActive)');
        res.status(201).json({ message: 'Academic Year created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating academic year' });
    }
};
export const updateAcademicYear = async (req, res) => {
    const { id } = req.params;
    const { name, startDate, endDate, isActive } = req.body;
    try {
        const pool = await poolPromise;
        if (isActive) {
            await pool.request().query('UPDATE AcademicYears SET IsActive = 0');
        }
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('startDate', sql.DateTime, startDate)
            .input('endDate', sql.DateTime, endDate)
            .input('isActive', sql.Bit, isActive ? 1 : 0)
            .query('UPDATE AcademicYears SET Name = @name, StartDate = @startDate, EndDate = @endDate, IsActive = @isActive WHERE Id = @id');
        res.json({ message: 'Academic Year updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating academic year' });
    }
};
export const deleteAcademicYear = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('DELETE FROM AcademicYears WHERE Id = @id');
        res.json({ message: 'Academic Year deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting academic year' });
    }
};
/* --- Semesters --- */
export const getSemesters = async (req, res) => {
    const { academicYearId } = req.query;
    try {
        const pool = await poolPromise;
        let query = 'SELECT s.*, ay.Name as AcademicYearName FROM Semesters s JOIN AcademicYears ay ON s.AcademicYearId = ay.Id';
        const request = pool.request();
        if (academicYearId) {
            query += ' WHERE s.AcademicYearId = @academicYearId';
            request.input('academicYearId', sql.Int, academicYearId);
        }
        query += ' ORDER BY s.StartDate DESC';
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching semesters' });
    }
};
export const createSemester = async (req, res) => {
    const { academicYearId, name, startDate, endDate, isActive } = req.body;
    try {
        const pool = await poolPromise;
        if (isActive) {
            await pool.request().query('UPDATE Semesters SET IsActive = 0');
        }
        await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .input('name', sql.NVarChar, name)
            .input('startDate', sql.DateTime, startDate)
            .input('endDate', sql.DateTime, endDate)
            .input('isActive', sql.Bit, isActive ? 1 : 0)
            .query('INSERT INTO Semesters (AcademicYearId, Name, StartDate, EndDate, IsActive) VALUES (@ayId, @name, @startDate, @endDate, @isActive)');
        res.status(201).json({ message: 'Semester created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating semester' });
    }
};
export const updateSemester = async (req, res) => {
    const { id } = req.params;
    const { academicYearId, name, startDate, endDate, isActive } = req.body;
    try {
        const pool = await poolPromise;
        if (isActive) {
            await pool.request().query('UPDATE Semesters SET IsActive = 0');
        }
        await pool.request()
            .input('id', sql.Int, id)
            .input('ayId', sql.Int, academicYearId)
            .input('name', sql.NVarChar, name)
            .input('startDate', sql.DateTime, startDate)
            .input('endDate', sql.DateTime, endDate)
            .input('isActive', sql.Bit, isActive ? 1 : 0)
            .query('UPDATE Semesters SET AcademicYearId = @ayId, Name = @name, StartDate = @startDate, EndDate = @endDate, IsActive = @isActive WHERE Id = @id');
        res.json({ message: 'Semester updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating semester' });
    }
};
export const deleteSemester = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Semesters WHERE Id = @id');
        res.json({ message: 'Semester deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting semester' });
    }
};
/* --- Grades & Sections --- */
export const getGrades = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Grades ORDER BY GradeNumber');
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching grades' });
    }
};
export const getSections = async (req, res) => {
    const { gradeId, academicYearId } = req.query;
    try {
        const pool = await poolPromise;
        let query = 'SELECT s.*, g.GradeNumber FROM Sections s JOIN Grades g ON s.GradeId = g.Id';
        const request = pool.request();
        let whereClause = '';
        if (gradeId) {
            whereClause += 's.GradeId = @gradeId';
            request.input('gradeId', sql.Int, gradeId);
        }
        if (academicYearId) {
            whereClause += (whereClause ? ' AND ' : '') + 's.AcademicYearId = @academicYearId';
            request.input('academicYearId', sql.Int, academicYearId);
        }
        if (whereClause) {
            query += ' WHERE ' + whereClause;
        }
        const result = await request.query(query);
        let sections = result.recordset;
        // Smart Discovery: If no sections exist for this grade in this year, check legacy Classes table
        if (gradeId && academicYearId && sections.length === 0) {
            const gradeRes = await pool.request().input('gid', sql.Int, gradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
            if (gradeRes.recordset.length > 0) {
                const gradeNum = gradeRes.recordset[0].GradeNumber;
                const legacyRes = await pool.request()
                    .input('gradeName', sql.NVarChar, `Grade ${gradeNum}`)
                    .input('gradeNum', sql.Int, gradeNum)
                    .query("SELECT Section FROM Classes WHERE GradeName = @gradeName OR GradeName = CAST(@gradeNum as NVARCHAR)");
                if (legacyRes.recordset.length > 0) {
                    // Auto-migrate legacy sections to specific academic year
                    for (const cls of legacyRes.recordset) {
                        try {
                            await pool.request()
                                .input('gid', sql.Int, gradeId)
                                .input('name', sql.NVarChar, cls.Section)
                                .input('ayid', sql.Int, academicYearId)
                                .query('INSERT INTO Sections (GradeId, Name, AcademicYearId) VALUES (@gid, @name, @ayid)');
                        }
                        catch (e) {
                            // Ignore duplicates if any race condition
                        }
                    }
                    // Re-fetch after migration
                    const refreshedResult = await pool.request()
                        .input('gradeId', sql.Int, gradeId)
                        .input('academicYearId', sql.Int, academicYearId)
                        .query('SELECT s.*, g.GradeNumber FROM Sections s JOIN Grades g ON s.GradeId = g.Id WHERE s.GradeId = @gradeId AND s.AcademicYearId = @academicYearId');
                    sections = refreshedResult.recordset;
                }
            }
        }
        res.json(sections);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching sections' });
    }
};
export const createSection = async (req, res) => {
    const { gradeId, name, academicYearId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('gradeId', sql.Int, gradeId)
            .input('name', sql.NVarChar, name)
            .input('ayId', sql.Int, academicYearId)
            .query('INSERT INTO Sections (GradeId, Name, AcademicYearId) VALUES (@gradeId, @name, @ayId)');
        // Sync with legacy Classes table
        try {
            const gradeRes = await pool.request().input('gid', sql.Int, gradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
            if (gradeRes.recordset.length > 0) {
                const gradeName = `Grade ${gradeRes.recordset[0].GradeNumber}`;
                await pool.request()
                    .input('gn', sql.NVarChar, gradeName)
                    .input('sec', sql.NVarChar, name)
                    .query('IF NOT EXISTS (SELECT 1 FROM Classes WHERE GradeName = @gn AND Section = @sec) INSERT INTO Classes (GradeName, Section) VALUES (@gn, @sec)');
            }
        }
        catch (syncErr) {
            console.error('Sync Create Error:', syncErr);
        }
        res.status(201).json({ message: 'Section created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating section' });
    }
};
export const updateSection = async (req, res) => {
    const { id } = req.params;
    const { gradeId, name, academicYearId } = req.body;
    try {
        const pool = await poolPromise;
        const oldSection = await pool.request().input('id', sql.Int, id).query('SELECT s.*, g.GradeNumber FROM Sections s JOIN Grades g ON s.GradeId = g.Id WHERE s.Id = @id');
        await pool.request()
            .input('id', sql.Int, id)
            .input('gradeId', sql.Int, gradeId)
            .input('name', sql.NVarChar, name)
            .input('ayId', sql.Int, academicYearId)
            .query('UPDATE Sections SET GradeId = @gradeId, Name = @name, AcademicYearId = @ayId WHERE Id = @id');
        // Sync update with legacy Classes table
        try {
            if (oldSection.recordset.length > 0) {
                const oldSec = oldSection.recordset[0];
                const gradeRes = await pool.request().input('gid', sql.Int, gradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
                if (gradeRes.recordset.length > 0) {
                    const oldGradeName = `Grade ${oldSec.GradeNumber}`;
                    const newGradeName = `Grade ${gradeRes.recordset[0].GradeNumber}`;
                    await pool.request()
                        .input('oldGn', sql.NVarChar, oldGradeName)
                        .input('oldSec', sql.NVarChar, oldSec.Name)
                        .input('newGn', sql.NVarChar, newGradeName)
                        .input('newSec', sql.NVarChar, name)
                        .query('UPDATE Classes SET GradeName = @newGn, Section = @newSec WHERE GradeName = @oldGn AND Section = @oldSec');
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Update Error:', syncErr);
        }
        res.json({ message: 'Section updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating section' });
    }
};
export const deleteSection = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const section = await pool.request().input('id', sql.Int, id).query('SELECT s.*, g.GradeNumber FROM Sections s JOIN Grades g ON s.GradeId = g.Id WHERE s.Id = @id');
        // Sync deletion with legacy Classes table
        try {
            if (section.recordset.length > 0) {
                const sec = section.recordset[0];
                const gradeName = `Grade ${sec.GradeNumber}`;
                // Only delete if no other year uses this same section name for this grade
                const otherYears = await pool.request()
                    .input('gid', sql.Int, sec.GradeId)
                    .input('name', sql.NVarChar, sec.Name)
                    .input('sid', sql.Int, id)
                    .query('SELECT 1 FROM Sections WHERE GradeId = @gid AND Name = @name AND Id <> @sid');
                if (otherYears.recordset.length === 0) {
                    await pool.request()
                        .input('gn', sql.NVarChar, gradeName)
                        .input('sec', sql.NVarChar, sec.Name)
                        .query('DELETE FROM Classes WHERE GradeName = @gn AND Section = @sec');
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Delete Error:', syncErr);
        }
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Sections WHERE Id = @id');
        res.json({ message: 'Section deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting section' });
    }
};
/* --- Grade Courses --- */
export const getGradeCourses = async (req, res) => {
    const { gradeId } = req.params;
    const { academicYearId, semesterId } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('gradeId', sql.Int, gradeId)
            .input('ayId', sql.Int, academicYearId || null)
            .input('semId', sql.Int, semesterId || null)
            .query(`
                SELECT 
                    c.CourseId, 
                    c.CourseName, 
                    c.CourseCode, 
                    MAX(gc.Id) as Id,
                    MAX(s.Name) as SemesterName,
                    (
                        SELECT u.FullName + ' (' + cl.Section + ')' as Name
                        FROM TeacherAssignments ta
                        JOIN Users u ON ta.TeacherId = u.UserId
                        JOIN Classes cl ON ta.ClassId = cl.ClassId
                        JOIN Grades g2 ON (
                            CASE 
                                WHEN cl.GradeName LIKE 'Grade %' THEN REPLACE(cl.GradeName, 'Grade ', '')
                                ELSE cl.GradeName 
                            END = CAST(g2.GradeNumber AS VARCHAR(10))
                        )
                        WHERE ta.CourseId = c.CourseId 
                        AND g2.Id = @gradeId
                        AND (ta.AcademicYearId = @ayId OR ta.AcademicYearId IS NULL)
                        AND (@semId IS NULL OR ta.SemesterId = @semId OR ta.SemesterId IS NULL)
                        FOR JSON PATH
                    ) as Teachers
                FROM (
                    -- Explicitly assigned to grade
                    SELECT Id, CourseId, GradeId, AcademicYearId, SemesterId FROM GradeCourses
                    
                    UNION ALL

                    -- Implicitly assigned via Teacher Assignments
                    SELECT 0 as Id, ta.CourseId, g.Id as GradeId, ta.AcademicYearId, ta.SemesterId
                    FROM TeacherAssignments ta
                    JOIN Classes cl ON ta.ClassId = cl.ClassId
                    JOIN Grades g ON (
                        CASE 
                            WHEN cl.GradeName LIKE 'Grade %' THEN REPLACE(cl.GradeName, 'Grade ', '')
                            ELSE cl.GradeName 
                        END = CAST(g.GradeNumber AS VARCHAR(10))
                    )
                ) gc
                JOIN Courses c ON gc.CourseId = c.CourseId
                LEFT JOIN Semesters s ON gc.SemesterId = s.Id
                WHERE gc.GradeId = @gradeId 
                AND (gc.AcademicYearId = @ayId OR gc.AcademicYearId IS NULL)
                AND (@semId IS NULL OR gc.SemesterId = @semId OR gc.SemesterId IS NULL)
                GROUP BY c.CourseId, c.CourseName, c.CourseCode
            `);
        const data = result.recordset.map(row => ({
            ...row,
            Teachers: row.Teachers ? JSON.parse(row.Teachers) : []
        }));
        res.json(data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching grade courses' });
    }
};
export const assignCourseToGrade = async (req, res) => {
    const { gradeId, courseId, academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('gradeId', sql.Int, gradeId)
            .input('courseId', sql.Int, courseId)
            .input('ayId', sql.Int, academicYearId)
            .input('semId', sql.Int, semesterId || null)
            .query('INSERT INTO GradeCourses (GradeId, CourseId, AcademicYearId, SemesterId) VALUES (@gradeId, @courseId, @ayId, @semId)');
        res.status(201).json({ message: 'Course assigned to grade successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error assigning course' });
    }
};
export const removeCourseFromGrade = async (req, res) => {
    const { gradeId, courseId } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('gradeId', sql.Int, gradeId)
            .input('courseId', sql.Int, courseId)
            .query('DELETE FROM GradeCourses WHERE GradeId = @gradeId AND CourseId = @courseId');
        res.json({ message: 'Course removed from grade' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error removing course' });
    }
};
/* --- Enrollment & Promotion --- */
export const getUnenrolledStudents = async (req, res) => {
    const { academicYearId } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query(`
                SELECT UserId, FullName, Email 
                FROM Users 
                WHERE Role = 'Student' 
                AND UserId NOT IN (
                    SELECT StudentId FROM StudentEnrollments WHERE AcademicYearId = @ayId
                )
            `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching unenrolled students' });
    }
};
export const enrollStudent = async (req, res) => {
    const { studentId, academicYearId, gradeId, sectionId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('ayId', sql.Int, academicYearId)
            .input('gradeId', sql.Int, gradeId)
            .input('sectionId', sql.Int, sectionId)
            .query(`
                INSERT INTO StudentEnrollments (StudentId, AcademicYearId, GradeId, SectionId, Status)
                VALUES (@studentId, @ayId, @gradeId, @sectionId, 'Active')
            `);
        // Sync with legacy StudentClasses
        try {
            const gradeRes = await pool.request().input('gid', sql.Int, gradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
            const secRes = await pool.request().input('sid', sql.Int, sectionId).query('SELECT Name FROM Sections WHERE Id = @sid');
            if (gradeRes.recordset.length > 0 && secRes.recordset.length > 0) {
                const gradeName = `Grade ${gradeRes.recordset[0].GradeNumber}`;
                const sectionName = secRes.recordset[0].Name;
                const classRes = await pool.request()
                    .input('gn', sql.NVarChar, gradeName)
                    .input('sec', sql.NVarChar, sectionName)
                    .query('SELECT ClassId FROM Classes WHERE GradeName = @gn AND Section = @sec');
                if (classRes.recordset.length > 0) {
                    const cid = classRes.recordset[0].ClassId;
                    await pool.request()
                        .input('uid', sql.Int, studentId)
                        .input('cid', sql.Int, cid)
                        .query('IF NOT EXISTS (SELECT 1 FROM StudentClasses WHERE StudentId = @uid AND ClassId = @cid) INSERT INTO StudentClasses (StudentId, ClassId) VALUES (@uid, @cid)');
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Academic Enroll Error:', syncErr);
        }
        res.status(201).json({ message: 'Student enrolled successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error enrolling student' });
    }
};
export const getEnrollments = async (req, res) => {
    const { academicYearId, gradeId, sectionId } = req.query;
    try {
        const pool = await poolPromise;
        let query = `
            SELECT se.*, u.FullName as StudentName, u.Email as StudentEmail, ay.Name as AcademicYearName, g.GradeNumber, s.Name as SectionName
            FROM StudentEnrollments se
            JOIN Users u ON se.StudentId = u.UserId
            JOIN AcademicYears ay ON se.AcademicYearId = ay.Id
            JOIN Grades g ON se.GradeId = g.Id
            JOIN Sections s ON se.SectionId = s.Id
            WHERE 1=1
        `;
        const request = pool.request();
        if (academicYearId) {
            query += ' AND se.AcademicYearId = @ayId';
            request.input('ayId', sql.Int, academicYearId);
        }
        if (gradeId) {
            query += ' AND se.GradeId = @gradeId';
            request.input('gradeId', sql.Int, gradeId);
        }
        if (sectionId) {
            query += ' AND se.SectionId = @sectionId';
            request.input('sectionId', sql.Int, sectionId);
        }
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching enrollments' });
    }
};
export const updateEnrollment = async (req, res) => {
    const { id } = req.params;
    const { gradeId, sectionId, status } = req.body;
    try {
        const pool = await poolPromise;
        const oldEnroll = await pool.request().input('id', sql.Int, id).query('SELECT * FROM StudentEnrollments WHERE Id = @id');
        await pool.request()
            .input('id', sql.Int, id)
            .input('gradeId', sql.Int, gradeId)
            .input('sectionId', sql.Int, sectionId)
            .input('status', sql.NVarChar, status)
            .query('UPDATE StudentEnrollments SET GradeId = @gradeId, SectionId = @sectionId, Status = @status WHERE Id = @id');
        // Sync update with StudentClasses
        try {
            if (oldEnroll.recordset.length > 0) {
                const en = oldEnroll.recordset[0];
                const studentId = en.StudentId;
                // Remove old class link
                const oldGradeRes = await pool.request().input('gid', sql.Int, en.GradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
                const oldSecRes = await pool.request().input('sid', sql.Int, en.SectionId).query('SELECT Name FROM Sections WHERE Id = @sid');
                if (oldGradeRes.recordset.length > 0 && oldSecRes.recordset.length > 0) {
                    const oldGn = `Grade ${oldGradeRes.recordset[0].GradeNumber}`;
                    const oldSn = oldSecRes.recordset[0].Name;
                    await pool.request().input('gn', sql.NVarChar, oldGn).input('sec', sql.NVarChar, oldSn).input('uid', sql.Int, studentId).query('DELETE FROM StudentClasses WHERE StudentId = @uid AND ClassId IN (SELECT ClassId FROM Classes WHERE GradeName = @gn AND Section = @sec)');
                }
                // Add new class link
                const newGradeRes = await pool.request().input('gid', sql.Int, gradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
                const newSecRes = await pool.request().input('sid', sql.Int, sectionId).query('SELECT Name FROM Sections WHERE Id = @sid');
                if (newGradeRes.recordset.length > 0 && newSecRes.recordset.length > 0) {
                    const newGn = `Grade ${newGradeRes.recordset[0].GradeNumber}`;
                    const newSn = newSecRes.recordset[0].Name;
                    const classRes = await pool.request().input('gn', sql.NVarChar, newGn).input('sec', sql.NVarChar, newSn).query('SELECT ClassId FROM Classes WHERE GradeName = @gn AND Section = @sec');
                    if (classRes.recordset.length > 0) {
                        await pool.request().input('uid', sql.Int, studentId).input('cid', sql.Int, classRes.recordset[0].ClassId).query('INSERT INTO StudentClasses (StudentId, ClassId) VALUES (@uid, @cid)');
                    }
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Academic Update Error:', syncErr);
        }
        res.json({ message: 'Enrollment updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating enrollment' });
    }
};
export const deleteEnrollment = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const enrollRes = await pool.request().input('id', sql.Int, id).query('SELECT * FROM StudentEnrollments WHERE Id = @id');
        await pool.request().input('id', sql.Int, id).query('DELETE FROM StudentEnrollments WHERE Id = @id');
        // Sync deletion with StudentClasses
        try {
            if (enrollRes.recordset.length > 0) {
                const en = enrollRes.recordset[0];
                const gradeRes = await pool.request().input('gid', sql.Int, en.GradeId).query('SELECT GradeNumber FROM Grades WHERE Id = @gid');
                const secRes = await pool.request().input('sid', sql.Int, en.SectionId).query('SELECT Name FROM Sections WHERE Id = @sid');
                if (gradeRes.recordset.length > 0 && secRes.recordset.length > 0) {
                    const gn = `Grade ${gradeRes.recordset[0].GradeNumber}`;
                    const sn = secRes.recordset[0].Name;
                    await pool.request().input('uid', sql.Int, en.StudentId).input('gn', sql.NVarChar, gn).input('sec', sql.NVarChar, sn).query('DELETE FROM StudentClasses WHERE StudentId = @uid AND ClassId IN (SELECT ClassId FROM Classes WHERE GradeName = @gn AND Section = @sec)');
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Academic Delete Error:', syncErr);
        }
        res.json({ message: 'Enrollment deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting enrollment' });
    }
};
export const promoteStudents = async (req, res) => {
    const { currentAcademicYearId, nextAcademicYearId, schoolId } = req.body;
    const user = req.user;
    if (!currentAcademicYearId || !nextAcademicYearId) {
        return res.status(400).json({ message: 'Missing current or next academic year IDs' });
    }
    try {
        const pool = await poolPromise;
        // 1. Pre-fetch Mapping Data (Grades, next Sections, next Classes)
        const gradesRes = await pool.request().query("SELECT Id, GradeNumber FROM Grades");
        const gradeMap = new Map(gradesRes.recordset.map(g => [g.GradeNumber, g.Id]));
        const nextSectionsRes = await pool.request()
            .input('ayId', sql.Int, nextAcademicYearId)
            .query("SELECT Id, GradeId, Name FROM Sections WHERE AcademicYearId = @ayId");
        const sectionMap = nextSectionsRes.recordset;
        const nextClassesRes = await pool.request().query("SELECT ClassId, GradeName, Section FROM Classes");
        const classMap = nextClassesRes.recordset;
        // 2. Fetch active students to promote
        const fetchRequest = pool.request();
        fetchRequest.input('ayId', sql.Int, currentAcademicYearId);
        let fetchQuery = `
            SELECT se.Id as EnrollmentId, se.StudentId, se.GradeId, se.SectionId, g.GradeNumber, se.SchoolId, sec.Name as SectionName
            FROM StudentEnrollments se
            JOIN Grades g ON se.GradeId = g.Id
            LEFT JOIN Sections sec ON se.SectionId = sec.Id
            WHERE se.AcademicYearId = @ayId AND se.Status IN ('Active', 'Promoted', 'Repeated')
        `;
        const targetSchoolId = schoolId || user.schoolId;
        if (targetSchoolId) {
            fetchQuery += " AND se.SchoolId = @schId";
            fetchRequest.input('schId', sql.Int, targetSchoolId);
        }
        const studentsRes = await fetchRequest.query(fetchQuery);
        const students = studentsRes.recordset;
        if (students.length === 0) {
            return res.status(200).json({ message: 'No students found to process.' });
        }
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        let processedCount = 0;
        let updatedCount = 0;
        try {
            for (const student of students) {
                // 3. Calculate Average
                const resultRes = await transaction.request()
                    .input('sid', sql.Int, student.StudentId)
                    .input('ayId', sql.Int, currentAcademicYearId)
                    .query(`
                        DECLARE @S1Id INT, @S2Id INT;
                        SELECT TOP 1 @S1Id = Id FROM Semesters WHERE AcademicYearId = @ayId ORDER BY StartDate ASC;
                        SELECT TOP 1 @S2Id = Id FROM Semesters WHERE AcademicYearId = @ayId AND Id <> @S1Id ORDER BY StartDate ASC;
                        DECLARE @S1Avg DECIMAL(5,2) = 0, @S2Avg DECIMAL(5,2) = 0;
                        SELECT @S1Avg = ISNULL(Average, 0) FROM SemesterResults WHERE StudentId = @sid AND SemesterId = @S1Id;
                        SELECT @S2Avg = ISNULL(Average, 0) FROM SemesterResults WHERE StudentId = @sid AND SemesterId = @S2Id;
                        SELECT (@S1Avg + @S2Avg) / 2.0 as FinalAverage
                    `);
                const finalAverage = resultRes.recordset[0]?.FinalAverage || 0;
                const isPassed = finalAverage >= 50;
                let status = isPassed ? 'Promoted' : 'Repeated';
                if (student.GradeNumber === 12 && isPassed)
                    status = 'Graduated';
                // 4. Update Current Enrollment & History
                await transaction.request()
                    .input('eid', sql.Int, student.EnrollmentId)
                    .input('status', sql.NVarChar, status)
                    .query('UPDATE StudentEnrollments SET Status = @status WHERE Id = @eid');
                await transaction.request()
                    .input('sid', sql.Int, student.StudentId)
                    .input('ayId', sql.Int, currentAcademicYearId)
                    .input('gid', sql.Int, student.GradeId)
                    .input('schId', sql.Int, student.SchoolId)
                    .input('avg', sql.Decimal(5, 2), finalAverage)
                    .input('status', sql.NVarChar, status)
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM AcademicHistory WHERE StudentId = @sid AND AcademicYearId = @ayId)
                        BEGIN
                            INSERT INTO AcademicHistory (StudentId, AcademicYearId, GradeId, SchoolId, FinalAverage, Status)
                            VALUES (@sid, @ayId, @gid, @schId, @avg, @status)
                        END
                        ELSE
                        BEGIN
                            UPDATE AcademicHistory SET FinalAverage = @avg, Status = @status
                            WHERE StudentId = @sid AND AcademicYearId = @ayId
                        END
                    `);
                // 5. Next Steps
                if (status !== 'Graduated') {
                    const nextGradeNumber = isPassed ? student.GradeNumber + 1 : student.GradeNumber;
                    const nextGradeId = gradeMap.get(nextGradeNumber);
                    if (nextGradeId) {
                        const nextSection = sectionMap.find(s => s.GradeId === nextGradeId && s.Name === student.SectionName);
                        const nextSecId = nextSection ? nextSection.Id : null;
                        // Idempotency check with ability to "re-assign"
                        const checkRes = await transaction.request()
                            .input('sid', sql.Int, student.StudentId)
                            .input('ayId', sql.Int, nextAcademicYearId)
                            .query("SELECT Id, SectionId FROM StudentEnrollments WHERE StudentId = @sid AND AcademicYearId = @ayId");
                        if (checkRes.recordset.length > 0) {
                            const existing = checkRes.recordset[0];
                            // If it exists but has no section and we FOUND one now, update it
                            if (existing.SectionId === null && nextSecId !== null) {
                                await transaction.request()
                                    .input('id', sql.Int, existing.Id)
                                    .input('secId', sql.Int, nextSecId)
                                    .query("UPDATE StudentEnrollments SET SectionId = @secId WHERE Id = @id");
                                updatedCount++;
                            }
                        }
                        else {
                            await transaction.request()
                                .input('sid', sql.Int, student.StudentId)
                                .input('ayId', sql.Int, nextAcademicYearId)
                                .input('gid', sql.Int, nextGradeId)
                                .input('secId', sql.Int, nextSecId)
                                .input('schId', sql.Int, student.SchoolId)
                                .query(`
                                    INSERT INTO StudentEnrollments (StudentId, AcademicYearId, GradeId, SectionId, SchoolId, Status)
                                    VALUES (@sid, @ayId, @gid, @secId, @schId, 'Active')
                                `);
                            processedCount++;
                        }
                        // Sync legacy classes
                        const gnStr = 'Grade ' + nextGradeNumber;
                        const match = classMap.find(c => (c.GradeName === gnStr || c.GradeName === nextGradeNumber.toString()) &&
                            (c.Section === (student.SectionName || null) || (!c.Section && !student.SectionName)));
                        if (match) {
                            await transaction.request().input('sid', sql.Int, student.StudentId).query("DELETE FROM StudentClasses WHERE StudentId = @sid");
                            await transaction.request()
                                .input('sid', sql.Int, student.StudentId)
                                .input('cid', sql.Int, match.ClassId)
                                .query("INSERT INTO StudentClasses (StudentId, ClassId) VALUES (@sid, @cid)");
                            // Announcement Logic
                            await transaction.request()
                                .input('ti', sql.NVarChar, 'Academic Promotion')
                                .input('co', sql.NVarChar, isPassed ? `Promoted to Grade ${nextGradeNumber}` : `Reenrolled in Grade ${nextGradeNumber}`)
                                .input('cr', sql.Int, user.id)
                                .input('cid', sql.Int, match.ClassId)
                                .query(`IF NOT EXISTS (SELECT 1 FROM Announcements WHERE Title = @ti AND Content = @co AND ClassId = @cid)
                                        INSERT INTO Announcements (Title, Content, TargetRole, CreatedBy, ClassId) VALUES (@ti, @co, 'Student', @cr, @cid)`);
                        }
                        processedCount++; // Increment for all successfully synced students
                    }
                }
                else {
                    await transaction.request().input('sid', sql.Int, student.StudentId).query("DELETE FROM StudentClasses WHERE StudentId = @sid");
                    await transaction.request()
                        .input('ti', sql.NVarChar, 'Graduation Congratulations')
                        .input('co', sql.NVarChar, 'Congratulations on your graduation from Grade 12!')
                        .input('cr', sql.Int, user.id)
                        .query(`IF NOT EXISTS (SELECT 1 FROM Announcements WHERE Title = @ti AND Content = @co)
                                INSERT INTO Announcements (Title, Content, TargetRole, CreatedBy) VALUES (@ti, @co, 'Student', @cr)`);
                    processedCount++;
                }
            }
            await transaction.commit();
            res.json({ message: `Successfully processed ${processedCount + updatedCount} students.` });
        }
        catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    catch (err) {
        console.error('Promotion error:', err);
        res.status(500).json({ message: 'Error during promotion process' });
    }
};
export const calculateSemesterResults = async (req, res) => {
    const { academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        // 1. Fetch all active students in the academic year
        const enrollments = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query(`
                SELECT se.StudentId, se.GradeId 
                FROM StudentEnrollments se 
                WHERE se.AcademicYearId = @ayId AND se.Status = 'Active'
            `);
        const students = enrollments.recordset;
        let processedCount = 0;
        for (const student of students) {
            // 2. Calculate average
            const resultRes = await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('gid', sql.Int, student.GradeId)
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .query(`
                    DECLARE @TotalCourses INT;
                    SELECT @TotalCourses = COUNT(*) FROM GradeCourses 
                    WHERE GradeId = @gid 
                    AND (AcademicYearId = @ayId OR AcademicYearId IS NULL)
                    AND (SemesterId = @semId OR SemesterId IS NULL);
                    
                    SELECT 
                        ISNULL(SUM(se.Score), 0) / CASE WHEN @TotalCourses = 0 THEN 1 ELSE @TotalCourses END as Average,
                        @TotalCourses as CourseCount
                    FROM StudentExams se
                    JOIN Exams e ON se.ExamId = e.ExamId
                    WHERE se.StudentId = @sid AND e.SemesterId = @semId
                    AND se.Status IN ('Submitted', 'Graded')
                `);
            const average = resultRes.recordset[0]?.Average || 0;
            const courseCount = resultRes.recordset[0]?.CourseCount || 0;
            // 3. Upsert into SemesterResults
            await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .input('semId', sql.Int, semesterId)
                .input('avg', sql.Decimal(5, 2), average)
                .input('count', sql.Int, courseCount)
                .query(`
                    IF EXISTS (SELECT 1 FROM SemesterResults WHERE StudentId = @sid AND AcademicYearId = @ayId AND SemesterId = @semId)
                    BEGIN
                        UPDATE SemesterResults SET Average = @avg, TotalCourses = @count, CalculatedAt = GETDATE()
                        WHERE StudentId = @sid AND AcademicYearId = @ayId AND SemesterId = @semId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO SemesterResults (StudentId, AcademicYearId, SemesterId, Average, TotalCourses)
                        VALUES (@sid, @ayId, @semId, @avg, @count)
                    END
                `);
            processedCount++;
        }
        res.json({ message: `Calculated results for ${processedCount} students.` });
    }
    catch (err) {
        console.error('calculateSemesterResults error:', err);
        res.status(500).json({ message: 'Error calculating semester results' });
    }
};
/* --- Rankings --- */
export const calculateFinalYearRankings = async (req, res) => {
    const { academicYearId, schoolId } = req.body;
    const user = req.user;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('ayId', sql.Int, academicYearId);
        let query = 'SELECT StudentId, GradeId, SectionId, SchoolId FROM StudentEnrollments WHERE AcademicYearId = @ayId AND Status = \'Active\'';
        const targetSchoolId = schoolId || user.schoolId;
        if (targetSchoolId) {
            query += " AND SchoolId = @schId";
            request.input('schId', sql.Int, targetSchoolId);
        }
        const studentsRes = await request.query(query);
        const students = studentsRes.recordset;
        for (const student of students) {
            const avgRes = await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .query('SELECT AVG(CAST(Average AS FLOAT)) as FinalAverage FROM SemesterResults WHERE StudentId = @sid AND AcademicYearId = @ayId');
            const finalAverage = avgRes.recordset[0]?.FinalAverage || 0;
            await pool.request()
                .input('sid', sql.Int, student.StudentId)
                .input('ayId', sql.Int, academicYearId)
                .input('gid', sql.Int, student.GradeId)
                .input('secId', sql.Int, student.SectionId)
                .input('schId', sql.Int, student.SchoolId)
                .input('avg', sql.Decimal(5, 2), finalAverage)
                .query(`
                    IF EXISTS (SELECT 1 FROM FinalYearResult WHERE StudentId = @sid AND AcademicYearId = @ayId)
                    BEGIN
                        UPDATE FinalYearResult SET FinalAverage = @avg, GradeId = @gid, SectionId = @secId, SchoolId = @schId, CreatedAt = GETDATE()
                        WHERE StudentId = @sid AND AcademicYearId = @ayId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO FinalYearResult (StudentId, AcademicYearId, GradeId, SectionId, SchoolId, FinalAverage)
                        VALUES (@sid, @ayId, @gid, @secId, @schId, @avg)
                    END
                `);
        }
        // Rank updates
        await pool.request().input('ayId', sql.Int, academicYearId).query(`
            WITH Ranked AS (SELECT Id, DENSE_RANK() OVER (PARTITION BY SchoolId, GradeId, SectionId ORDER BY FinalAverage DESC) as NewRank FROM FinalYearResult WHERE AcademicYearId = @ayId)
            UPDATE f SET f.ClassRank = r.NewRank FROM FinalYearResult f JOIN Ranked r ON f.Id = r.Id
        `);
        await pool.request().input('ayId', sql.Int, academicYearId).query(`
            WITH Ranked AS (SELECT Id, DENSE_RANK() OVER (PARTITION BY SchoolId, GradeId ORDER BY FinalAverage DESC) as NewRank FROM FinalYearResult WHERE AcademicYearId = @ayId)
            UPDATE f SET f.GradeRank = r.NewRank FROM FinalYearResult f JOIN Ranked r ON f.Id = r.Id
        `);
        await pool.request().input('ayId', sql.Int, academicYearId).query(`
            WITH Ranked AS (SELECT Id, DENSE_RANK() OVER (PARTITION BY SchoolId ORDER BY FinalAverage DESC) as NewRank FROM FinalYearResult WHERE AcademicYearId = @ayId)
            UPDATE f SET f.SchoolRank = r.NewRank FROM FinalYearResult f JOIN Ranked r ON f.Id = r.Id
        `);
        res.json({ message: "Final year rankings calculated successfully." });
    }
    catch (err) {
        console.error('calculateFinalYearRankings error:', err);
        res.status(500).json({ message: "Error calculating rankings." });
    }
};
export const getRankings = async (req, res) => {
    const { academicYearId, gradeId, sectionId, schoolId } = req.query;
    const user = req.user;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT f.*, u.FullName as StudentName, u.Email as StudentEmail, g.GradeNumber, s.Name as SectionName
            FROM FinalYearResult f
            JOIN Users u ON f.StudentId = u.UserId
            JOIN Grades g ON f.GradeId = g.Id
            JOIN Sections s ON f.SectionId = s.Id
            WHERE f.AcademicYearId = @ayId
        `;
        request.input('ayId', sql.Int, academicYearId);
        const targetSchoolId = schoolId || user.schoolId;
        if (targetSchoolId) {
            query += " AND f.SchoolId = @schId";
            request.input('schId', sql.Int, targetSchoolId);
        }
        if (user.role === 'Teacher') {
            query += ` AND f.SectionId IN (SELECT sec.Id FROM Sections sec JOIN Grades gra ON sec.GradeId = gra.Id JOIN Classes cls ON cls.Section = sec.Name AND cls.GradeName = 'Grade ' + CAST(gra.GradeNumber AS NVARCHAR) JOIN TeacherAssignments tasm ON tasm.ClassId = cls.ClassId WHERE tasm.TeacherId = @tId AND tasm.AcademicYearId = @ayId)`;
            request.input('tId', sql.Int, user.id);
        }
        if (gradeId) {
            query += " AND f.GradeId = @gradeId";
            request.input('gradeId', sql.Int, gradeId);
        }
        if (sectionId) {
            query += " AND f.SectionId = @secId";
            request.input('secId', sql.Int, sectionId);
        }
        query += " ORDER BY f.FinalAverage DESC, f.SchoolRank ASC";
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getRankings error:', err);
        res.status(500).json({ message: "Error fetching rankings." });
    }
};
export const getStudentRanking = async (req, res) => {
    const studentId = req.user.id;
    const { academicYearId, semesterId } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request().input('sid', sql.Int, studentId).input('ayId', sql.Int, academicYearId);
        let query = "";
        if (semesterId && semesterId !== 'full-year') {
            request.input('semId', sql.Int, semesterId);
            query = `
                SELECT sr.Average as FinalAverage, sr.ClassRank, sr.GradeRank, sr.SchoolRank, g.GradeNumber, s.Name as SectionName,
                    (SELECT COUNT(*) FROM SemesterResults sr2 JOIN StudentEnrollments se2 ON sr2.StudentId = se2.StudentId AND sr2.AcademicYearId = se2.AcademicYearId WHERE sr2.AcademicYearId = sr.AcademicYearId AND sr2.SemesterId = sr.SemesterId AND se2.SectionId = se.SectionId) as ClassTotal,
                    (SELECT COUNT(*) FROM SemesterResults sr2 JOIN StudentEnrollments se2 ON sr2.StudentId = se2.StudentId AND sr2.AcademicYearId = se2.AcademicYearId WHERE sr2.AcademicYearId = sr.AcademicYearId AND sr2.SemesterId = sr.SemesterId AND se2.GradeId = se.GradeId) as GradeTotal,
                    (SELECT COUNT(*) FROM SemesterResults sr2 WHERE sr2.AcademicYearId = sr.AcademicYearId AND sr2.SemesterId = sr.SemesterId AND sr2.SchoolId = sr.SchoolId) as SchoolTotal
                FROM SemesterResults sr
                JOIN StudentEnrollments se ON sr.StudentId = se.StudentId AND sr.AcademicYearId = se.AcademicYearId
                JOIN Grades g ON se.GradeId = g.Id
                JOIN Sections s ON se.SectionId = s.Id
                WHERE sr.StudentId = @sid AND sr.AcademicYearId = @ayId AND sr.SemesterId = @semId
            `;
        }
        else {
            query = `
                SELECT f.*, g.GradeNumber, s.Name as SectionName,
                (SELECT COUNT(*) FROM FinalYearResult WHERE AcademicYearId = f.AcademicYearId AND GradeId = f.GradeId AND SectionId = f.SectionId) as ClassTotal,
                (SELECT COUNT(*) FROM FinalYearResult WHERE AcademicYearId = f.AcademicYearId AND GradeId = f.GradeId) as GradeTotal,
                (SELECT COUNT(*) FROM FinalYearResult WHERE AcademicYearId = f.AcademicYearId) as SchoolTotal
                FROM FinalYearResult f
                JOIN Grades g ON f.GradeId = g.Id
                JOIN Sections s ON f.SectionId = s.Id
                WHERE f.StudentId = @sid AND f.AcademicYearId = @ayId
            `;
        }
        const result = await request.query(query);
        res.json(result.recordset[0] || null);
    }
    catch (err) {
        console.error('getStudentRanking error:', err);
        res.status(500).json({ message: "Error fetching student ranking." });
    }
};
