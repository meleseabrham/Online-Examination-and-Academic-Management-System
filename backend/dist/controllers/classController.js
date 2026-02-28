import { sql, poolPromise } from '../config/db.js';
export const getClasses = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT c.*, g.Id as GradeId,
            (SELECT COUNT(*) FROM StudentClasses sc WHERE sc.ClassId = c.ClassId) as StudentCount,
            (SELECT TOP 1 u.FullName FROM Users u 
             JOIN TeacherAssignments ta ON ta.TeacherId = u.UserId 
             JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
             LEFT JOIN Semesters s ON ta.SemesterId = s.Id
             WHERE ta.ClassId = c.ClassId 
             AND ay.IsActive = 1
             AND (ta.SemesterId IS NULL OR s.IsActive = 1)) as TeacherName,
            (SELECT TOP 1 u.UserId FROM Users u 
             JOIN TeacherAssignments ta ON ta.TeacherId = u.UserId 
             JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
             LEFT JOIN Semesters s ON ta.SemesterId = s.Id
             WHERE ta.ClassId = c.ClassId 
             AND ay.IsActive = 1
             AND (ta.SemesterId IS NULL OR s.IsActive = 1)) as TeacherId,
            (SELECT TOP 1 CASE WHEN ta.SemesterId IS NULL THEN 1 ELSE 0 END FROM TeacherAssignments ta 
             JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
             LEFT JOIN Semesters s ON ta.SemesterId = s.Id
             WHERE ta.ClassId = c.ClassId 
             AND ay.IsActive = 1
             AND (ta.SemesterId IS NULL OR s.IsActive = 1)) as IsFullYear
            FROM Classes c
            LEFT JOIN Grades g ON (c.GradeName = 'Grade ' + CAST(g.GradeNumber AS NVARCHAR(10)) OR c.GradeName = CAST(g.GradeNumber AS NVARCHAR(10)))
        `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching classes' });
    }
};
export const createClass = async (req, res) => {
    const { gradeName, section } = req.body;
    try {
        const pool = await poolPromise;
        // Duplicate Check: Prevent multiple classes with same grade & section
        const checkResult = await pool.request()
            .input('gn', sql.NVarChar, gradeName)
            .input('sec', sql.NVarChar, section || null)
            .query(`
                SELECT 1 FROM Classes 
                WHERE GradeName = @gn 
                AND (Section = @sec OR (Section IS NULL AND @sec IS NULL))
            `);
        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ message: `Class ${gradeName} ${section || ''} already exists.` });
        }
        await pool.request()
            .input('gradeName', sql.NVarChar, gradeName)
            .input('section', sql.NVarChar, section || null)
            .query('INSERT INTO Classes (GradeName, Section) VALUES (@gradeName, @section)');
        // Sync with Academic Management (Sections table) for the active year
        try {
            const activeYear = await pool.request().query('SELECT Id FROM AcademicYears WHERE IsActive = 1');
            if (activeYear.recordset.length > 0) {
                const ayId = activeYear.recordset[0].Id;
                const gradeNum = parseInt(gradeName.replace(/\D/g, '') || '0');
                if (gradeNum > 0) {
                    const gradeRes = await pool.request().input('gn', sql.Int, gradeNum).query('SELECT Id FROM Grades WHERE GradeNumber = @gn');
                    if (gradeRes.recordset.length > 0) {
                        const gid = gradeRes.recordset[0].Id;
                        if (section) {
                            await pool.request()
                                .input('gid', sql.Int, gid)
                                .input('name', sql.NVarChar, section)
                                .input('ayid', sql.Int, ayId)
                                .query('IF NOT EXISTS (SELECT 1 FROM Sections WHERE GradeId = @gid AND Name = @name AND AcademicYearId = @ayid) INSERT INTO Sections (GradeId, Name, AcademicYearId) VALUES (@gid, @name, @ayid)');
                        }
                    }
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Error:', syncErr); // Non-blocking sync error
        }
        res.status(201).json({ message: 'Class created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating class' });
    }
};
export const updateClass = async (req, res) => {
    const { id } = req.params;
    const { gradeName, section } = req.body;
    try {
        const pool = await poolPromise;
        // Duplicate Check: Exclude current class
        const checkResult = await pool.request()
            .input('gn', sql.NVarChar, gradeName)
            .input('sec', sql.NVarChar, section || null)
            .input('id', sql.Int, id)
            .query(`
                SELECT 1 FROM Classes 
                WHERE GradeName = @gn 
                AND (Section = @sec OR (Section IS NULL AND @sec IS NULL))
                AND ClassId <> @id
            `);
        if (checkResult.recordset.length > 0) {
            return res.status(400).json({ message: `Class ${gradeName} ${section || ''} already exists.` });
        }
        // Get old values first to update section accordingly
        const oldClass = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Classes WHERE ClassId = @id');
        await pool.request()
            .input('id', sql.Int, id)
            .input('gradeName', sql.NVarChar, gradeName)
            .input('section', sql.NVarChar, section || null)
            .query('UPDATE Classes SET GradeName = @gradeName, Section = @section WHERE ClassId = @id');
        // Sync update with Sections table if possible
        try {
            if (oldClass.recordset.length > 0) {
                const activeYear = await pool.request().query('SELECT Id FROM AcademicYears WHERE IsActive = 1');
                if (activeYear.recordset.length > 0) {
                    const ayId = activeYear.recordset[0].Id;
                    const oldGradeNum = parseInt(oldClass.recordset[0].GradeName.replace(/\D/g, '') || '0');
                    const newGradeNum = parseInt(gradeName.replace(/\D/g, '') || '0');
                    const oldGradeRes = await pool.request().input('gn', sql.Int, oldGradeNum).query('SELECT Id FROM Grades WHERE GradeNumber = @gn');
                    const newGradeRes = await pool.request().input('gn', sql.Int, newGradeNum).query('SELECT Id FROM Grades WHERE GradeNumber = @gn');
                    if (oldGradeRes.recordset.length > 0 && newGradeRes.recordset.length > 0) {
                        const oldGid = oldGradeRes.recordset[0].Id;
                        const newGid = newGradeRes.recordset[0].Id;
                        await pool.request()
                            .input('oldGid', sql.Int, oldGid)
                            .input('oldName', sql.NVarChar, oldClass.recordset[0].Section)
                            .input('newGid', sql.Int, newGid)
                            .input('newName', sql.NVarChar, section)
                            .input('ayid', sql.Int, ayId)
                            .query('UPDATE Sections SET GradeId = @newGid, Name = @newName WHERE GradeId = @oldGid AND Name = @oldName AND AcademicYearId = @ayid');
                    }
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Error:', syncErr);
        }
        res.json({ message: 'Class updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating class' });
    }
};
export const deleteClass = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Sync deletion with Sections table
        try {
            const classRes = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Classes WHERE ClassId = @id');
            if (classRes.recordset.length > 0) {
                const cls = classRes.recordset[0];
                const activeYear = await pool.request().query('SELECT Id FROM AcademicYears WHERE IsActive = 1');
                if (activeYear.recordset.length > 0) {
                    const ayId = activeYear.recordset[0].Id;
                    const gradeNum = parseInt(cls.GradeName.replace(/\D/g, '') || '0');
                    const gradeRes = await pool.request().input('gn', sql.Int, gradeNum).query('SELECT Id FROM Grades WHERE GradeNumber = @gn');
                    if (gradeRes.recordset.length > 0) {
                        const gid = gradeRes.recordset[0].Id;
                        await pool.request()
                            .input('gid', sql.Int, gid)
                            .input('name', sql.NVarChar, cls.Section)
                            .input('ayid', sql.Int, ayId)
                            .query('DELETE FROM Sections WHERE GradeId = @gid AND Name = @name AND AcademicYearId = @ayid');
                    }
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Delete Error:', syncErr);
        }
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Classes WHERE ClassId = @id');
        res.json({ message: 'Class deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting class' });
    }
};
export const getStudentsByClass = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('classId', sql.Int, id)
            .query(`
                SELECT u.UserId, u.FullName, u.Email, u.ProfileImage 
                FROM Users u
                JOIN StudentClasses sc ON sc.StudentId = u.UserId
                WHERE sc.ClassId = @classId
            `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching students' });
    }
};
export const assignStudentToClass = async (req, res) => {
    const { studentId, classId } = req.body;
    try {
        const pool = await poolPromise;
        // Check if student already in class
        const check = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('classId', sql.Int, classId)
            .query('SELECT * FROM StudentClasses WHERE StudentId = @studentId AND ClassId = @classId');
        if (check.recordset.length > 0) {
            return res.status(400).json({ message: 'Student is already in this class' });
        }
        await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('classId', sql.Int, classId)
            .query('INSERT INTO StudentClasses (StudentId, ClassId) VALUES (@studentId, @classId)');
        // Sync with StudentEnrollments for Academic Management
        try {
            const classRes = await pool.request().input('cid', sql.Int, classId).query('SELECT * FROM Classes WHERE ClassId = @cid');
            const activeYear = await pool.request().query('SELECT Id FROM AcademicYears WHERE IsActive = 1');
            if (classRes.recordset.length > 0 && activeYear.recordset.length > 0) {
                const cls = classRes.recordset[0];
                const ayId = activeYear.recordset[0].Id;
                const gradeNum = parseInt(cls.GradeName.replace(/\D/g, '') || '0');
                const gradeRes = await pool.request().input('gn', sql.Int, gradeNum).query('SELECT Id FROM Grades WHERE GradeNumber = @gn');
                if (gradeRes.recordset.length > 0) {
                    const gid = gradeRes.recordset[0].Id;
                    const secRes = await pool.request()
                        .input('gid', sql.Int, gid)
                        .input('ayid', sql.Int, ayId)
                        .input('name', sql.NVarChar, cls.Section)
                        .query('SELECT Id FROM Sections WHERE GradeId = @gid AND AcademicYearId = @ayid AND Name = @name');
                    if (secRes.recordset.length > 0) {
                        const sid = secRes.recordset[0].Id;
                        await pool.request()
                            .input('uid', sql.Int, studentId)
                            .input('ayid', sql.Int, ayId)
                            .input('gid', sql.Int, gid)
                            .input('sid', sql.Int, sid)
                            .query(`
                                IF NOT EXISTS (SELECT 1 FROM StudentEnrollments WHERE StudentId = @uid AND AcademicYearId = @ayid)
                                INSERT INTO StudentEnrollments (StudentId, AcademicYearId, GradeId, SectionId, Status)
                                VALUES (@uid, @ayid, @gid, @sid, 'Active')
                                ELSE
                                UPDATE StudentEnrollments SET GradeId = @gid, SectionId = @sid 
                                WHERE StudentId = @uid AND AcademicYearId = @ayid
                            `);
                    }
                }
            }
        }
        catch (syncErr) {
            console.error('Sync Assign Error:', syncErr);
        }
        res.status(201).json({ message: 'Student assigned to class successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error assigning student' });
    }
};
export const getUnassignedStudents = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT u.UserId, u.FullName, u.Email, u.ProfileImage 
            FROM Users u
            WHERE u.Role = 'Student' 
            AND u.UserId NOT IN (SELECT StudentId FROM StudentClasses)
        `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching unassigned students' });
    }
};
export const removeStudentFromClass = async (req, res) => {
    const { studentId, classId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('classId', sql.Int, classId)
            .query('DELETE FROM StudentClasses WHERE StudentId = @studentId AND ClassId = @classId');
        // Sync deletion from StudentEnrollments
        try {
            const activeYear = await pool.request().query('SELECT Id FROM AcademicYears WHERE IsActive = 1');
            if (activeYear.recordset.length > 0) {
                await pool.request()
                    .input('uid', sql.Int, studentId)
                    .input('ayid', sql.Int, activeYear.recordset[0].Id)
                    .query('DELETE FROM StudentEnrollments WHERE StudentId = @uid AND AcademicYearId = @ayid');
            }
        }
        catch (syncErr) {
            console.error('Sync Remove Error:', syncErr);
        }
        res.json({ message: 'Student removed from class successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error removing student' });
    }
};
