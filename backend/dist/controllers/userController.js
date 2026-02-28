import bcrypt from 'bcryptjs';
import { sql, poolPromise } from '../config/db.js';
export const getUsers = async (req, res) => {
    const { role } = req.query;
    try {
        const pool = await poolPromise;
        let query = 'SELECT UserId, FullName, Email, Role, Status, CreatedAt, ProfileImage, DateOfBirth, RegistrationNumber, Gender, Title FROM Users';
        const request = pool.request();
        if (role) {
            query += ' WHERE Role = @role';
            request.input('role', sql.NVarChar, role);
        }
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching users' });
    }
};
export const createUser = async (req, res) => {
    const { fullName, email, password, role, gender, title } = req.body;
    let { dateOfBirth } = req.body;
    if (dateOfBirth) {
        const year = parseInt(dateOfBirth.split('-')[0]);
        if (isNaN(year) || year > 9999 || year < 1753) {
            console.warn('Invalid date range for SQL Server:', dateOfBirth);
            dateOfBirth = null;
        }
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await poolPromise;
        // Generate Registration Number: RU/YEAR/XXXX
        const currentYear = new Date().getFullYear();
        const yearPrefix = `RU/${currentYear}/`;
        const countResult = await pool.request()
            .input('prefix', sql.NVarChar, yearPrefix + '%')
            .query('SELECT TOP 1 RegistrationNumber FROM Users WHERE RegistrationNumber LIKE @prefix ORDER BY RegistrationNumber DESC');
        let newNumber = 1;
        if (countResult.recordset.length > 0) {
            const lastReg = countResult.recordset[0].RegistrationNumber;
            const parts = lastReg.split('/');
            const lastNum = parseInt(parts[2]);
            if (!isNaN(lastNum)) {
                newNumber = lastNum + 1;
            }
        }
        const registrationNumber = `${yearPrefix}${newNumber.toString().padStart(5, '0')}`;
        const profileImage = req.file ? req.file.path.replace(/\\/g, '/') : null;
        await pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, role)
            .input('dob', sql.Date, dateOfBirth || null)
            .input('gender', sql.VarChar, gender || null)
            .input('profileImage', sql.NVarChar, profileImage)
            .input('regNo', sql.NVarChar, registrationNumber)
            .input('title', sql.NVarChar, title || null)
            .query('INSERT INTO Users (FullName, Email, Password, Role, Status, DateOfBirth, RegistrationNumber, Gender, ProfileImage, Title) VALUES (@fullName, @email, @password, @role, \'Active\', @dob, @regNo, @gender, @profileImage, @title)');
        res.status(201).json({ message: 'User created successfully', registrationNumber });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating user' });
    }
};
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const fullName = req.body.fullName || '';
    const email = req.body.email || '';
    const role = req.body.role || 'Student';
    const status = req.body.status || 'Active';
    const gender = req.body.gender || null;
    let dateOfBirth = req.body.dateOfBirth || null;
    if (dateOfBirth) {
        const year = parseInt(dateOfBirth.split('-')[0]);
        if (isNaN(year) || year > 9999 || year < 1753) {
            console.warn('Invalid date range for SQL Server:', dateOfBirth);
            dateOfBirth = null;
        }
    }
    console.log('UPDATING USER:', { id, fullName, email, role, status, dateOfBirth, gender });
    try {
        const pool = await poolPromise;
        const profileImage = req.file ? req.file.path.replace(/\\/g, '/') : null;
        let query = 'UPDATE Users SET FullName = @fullName, Email = @email, Role = @role, Status = @status, DateOfBirth = @dob, Gender = @gender, Title = @title WHERE UserId = @id';
        if (profileImage) {
            query = 'UPDATE Users SET FullName = @fullName, Email = @email, Role = @role, Status = @status, DateOfBirth = @dob, Gender = @gender, ProfileImage = @profileImage, Title = @title WHERE UserId = @id';
        }
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('fullName', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('role', sql.NVarChar, role)
            .input('status', sql.NVarChar, status)
            .input('gender', sql.VarChar, gender)
            .input('dob', sql.Date, dateOfBirth)
            .input('title', sql.NVarChar, req.body.title || null);
        if (profileImage) {
            request.input('profileImage', sql.NVarChar, profileImage);
        }
        await request.query(query);
        res.json({ message: 'User updated successfully' });
    }
    catch (err) {
        console.error('Update User Error:', err);
        res.status(500).json({ message: 'Error updating user' });
    }
};
export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Users WHERE UserId = @id');
        res.json({ message: 'User deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting user' });
    }
};
export const getUserProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // 1. Get Basic User Info
        const userRes = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT UserId, FullName, Email, Role, Status, CreatedAt, ProfileImage, DateOfBirth, RegistrationNumber, Gender, Title FROM Users WHERE UserId = @id');
        if (userRes.recordset.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = userRes.recordset[0];
        let additionalInfo = {};
        // Get Active Settings (Used by both Teacher and Student logic)
        const activeYearRes = await pool.request().query("SELECT TOP 1 Id, Name FROM AcademicYears WHERE IsActive = 1");
        const activeYearId = activeYearRes.recordset[0]?.Id;
        const activeYearName = activeYearRes.recordset[0]?.Name || 'N/A';
        const activeSemRes = await pool.request().query("SELECT TOP 1 Id, Name FROM Semesters WHERE IsActive = 1");
        const activeSemId = activeSemRes.recordset[0]?.Id;
        const activeSemName = activeSemRes.recordset[0]?.Name || 'N/A';
        additionalInfo.activeYearName = activeYearName;
        additionalInfo.activeSemesterName = activeSemName;
        if (user.Role === 'Teacher') {
            // Get Teacher Assignments (Filtered by Active context)
            const assignments = await pool.request()
                .input('id', sql.Int, id)
                .input('ayId', sql.Int, activeYearId || null)
                .input('semId', sql.Int, activeSemId || null)
                .query(`
                    SELECT ta.*, c.GradeName, c.Section, co.CourseName, ay.Name as AcademicYearName, s.Name as SemesterName
                    FROM TeacherAssignments ta
                    LEFT JOIN Classes c ON ta.ClassId = c.ClassId
                    LEFT JOIN Courses co ON ta.CourseId = co.CourseId
                    LEFT JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
                    LEFT JOIN Semesters s ON ta.SemesterId = s.Id
                    WHERE ta.TeacherId = @id
                    AND (@ayId IS NULL OR ta.AcademicYearId = @ayId)
                    AND (@semId IS NULL OR ta.SemesterId = @semId OR ta.SemesterId IS NULL)
                `);
            additionalInfo.assignments = assignments.recordset;
        }
        else if (user.Role === 'Student') {
            // 2. Get Current Enrollment
            const enrollmentRes = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT se.*, ay.Name as AcademicYearName, g.GradeNumber, s.Name as SectionName
                    FROM StudentEnrollments se
                    JOIN AcademicYears ay ON se.AcademicYearId = ay.Id
                    JOIN Grades g ON se.GradeId = g.Id
                    LEFT JOIN Sections s ON se.SectionId = s.Id
                    WHERE se.StudentId = @id AND se.Status = 'Active'
                `);
            const currentEnrollment = enrollmentRes.recordset[0] || null;
            additionalInfo.currentEnrollment = currentEnrollment;
            // 7. Get Current Courses (based on enrollment)
            if (currentEnrollment) {
                const coursesRes = await pool.request()
                    .input('gid', sql.Int, currentEnrollment.GradeId)
                    .input('ayid', sql.Int, currentEnrollment.AcademicYearId)
                    .input('sid', sql.Int, activeSemId || null)
                    .query(`
                        SELECT c.CourseId, c.CourseName, c.CourseCode, s.Name as SemesterName
                        FROM GradeCourses gc
                        JOIN Courses c ON gc.CourseId = c.CourseId
                        LEFT JOIN Semesters s ON gc.SemesterId = s.Id
                        WHERE gc.GradeId = @gid 
                        AND (gc.AcademicYearId = @ayid OR gc.AcademicYearId IS NULL)
                        AND (@sid IS NULL OR gc.SemesterId = @sid OR gc.SemesterId IS NULL)
                    `);
                additionalInfo.currentCourses = coursesRes.recordset;
            }
            // 3. Get Current Semester Rankings
            const semesterResults = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT sr.*, s.Name as SemesterName, ay.Name as AcademicYearName
                    FROM SemesterResults sr
                    JOIN Semesters s ON sr.SemesterId = s.Id
                    JOIN AcademicYears ay ON sr.AcademicYearId = ay.Id
                    WHERE sr.StudentId = @id
                    ORDER BY ay.StartDate DESC, s.StartDate DESC
                `);
            additionalInfo.semesterResults = semesterResults.recordset;
            // 4. Get Final Year Rankings
            const finalResults = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT fr.*, ay.Name as AcademicYearName, g.GradeNumber
                    FROM FinalYearResult fr
                    JOIN AcademicYears ay ON fr.AcademicYearId = ay.Id
                    JOIN Grades g ON fr.GradeId = g.Id
                    WHERE fr.StudentId = @id
                `);
            additionalInfo.finalResults = finalResults.recordset;
            // 5. Get Academic History
            const history = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT ah.*, ay.Name as AcademicYearName, g.GradeNumber,
                           fyr.ClassRank, fyr.GradeRank
                    FROM AcademicHistory ah
                    JOIN AcademicYears ay ON ah.AcademicYearId = ay.Id
                    JOIN Grades g ON ah.GradeId = g.Id
                    LEFT JOIN FinalYearResult fyr ON ah.StudentId = fyr.StudentId AND ah.AcademicYearId = fyr.AcademicYearId
                    WHERE ah.StudentId = @id
                    ORDER BY ay.StartDate DESC
                `);
            additionalInfo.history = history.recordset;
        }
        res.json({ user, ...additionalInfo });
    }
    catch (err) {
        console.error('getUserProfile error:', err);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
};
export const resetUserPassword = async (req, res) => {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) {
        return res.status(400).json({ message: 'Identifier and new password are required' });
    }
    try {
        const pool = await poolPromise;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Find user by Email OR RegistrationNumber
        const userCheck = await pool.request()
            .input('identifier', sql.NVarChar, identifier)
            .query('SELECT UserId FROM Users WHERE Email = @identifier OR RegistrationNumber = @identifier');
        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'User not found with provided Email or Reg No' });
        }
        const userId = userCheck.recordset[0].UserId;
        await pool.request()
            .input('id', sql.Int, userId)
            .input('password', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET Password = @password WHERE UserId = @id');
        res.json({ message: 'Password reset successfully' });
    }
    catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ message: 'Error resetting password' });
    }
};
