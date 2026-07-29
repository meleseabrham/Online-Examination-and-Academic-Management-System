import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql, poolPromise } from '../config/db.js';
import { logAction } from '../utils/auditLogger.js';
import { ensureSystemSchema } from './systemController.js';

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];

        if (user) {
            // Maintenance Mode Check
            const maintenanceRes = await pool.request()
                .input('key', sql.NVarChar, 'MaintenanceMode')
                .query('SELECT SettingValue FROM SystemSettings WHERE SettingKey = @key AND EntityType IS NULL');

            const isMaintenance = maintenanceRes.recordset.length > 0 && maintenanceRes.recordset[0].SettingValue === 'true';
            const isAdmin = user.Role?.toLowerCase() === 'admin';

            if (isMaintenance && !isAdmin) {
                return res.status(503).json({
                    message: 'System is currently under maintenance !!',
                    underMaintenance: true
                });
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Status check: Only allow active users to login
        if (user.Status === 'Inactive') {
            return res.status(403).json({ message: 'Account is deactivated. Please contact administration.' });
        }

        const isMatch = await bcrypt.compare(password, user.Password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_online_exam_2026';
        const token = jwt.sign(
            { id: user.UserId, email: user.Email, role: user.Role },
            secret,
            { expiresIn: '1d' }
        );

        // Audit Log for Login
        await logAction({
            userId: user.UserId,
            role: user.Role,
            action: 'LOGIN',
            tableName: 'Users',
            recordId: user.UserId,
            ipAddress: req.ip
        });

        res.json({
            token,
            user: {
                id: user.UserId,
                fullName: user.FullName,
                firstName: user.FirstName,
                middleName: user.MiddleName,
                lastName: user.LastName,
                email: user.Email,
                role: user.Role,
                ProfileImage: user.ProfileImage,
                title: user.Title
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const register = async (req: Request, res: Response) => {
    const { firstName, middleName, lastName, email, password, role } = req.body;
    const fullName = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await poolPromise;

        await pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('firstName', sql.NVarChar, firstName)
            .input('middleName', sql.NVarChar, middleName)
            .input('lastName', sql.NVarChar, lastName)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, role)
            .query('INSERT INTO Users (FullName, FirstName, MiddleName, LastName, Email, Password, Role, Status) VALUES (@fullName, @firstName, @middleName, @lastName, @email, @password, @role, \'Active\')');

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Registration failed' });
    }
};
export const getProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    console.log(`Fetching profile for UID: ${userId}, Role: ${role}`);

    try {
        const pool = await poolPromise;

        // Base user info
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT UserId, FullName, FirstName, MiddleName, LastName, Email, Role, CreatedAt, ProfileImage, DateOfBirth, RegistrationNumber, Title FROM Users WHERE UserId = @userId');

        if (userResult.recordset.length === 0) {
            console.log(`User ${userId} not found in DB`);
            return res.status(404).json({ message: 'User not found' });
        }

        const profile: any = {
            user: userResult.recordset[0]
        };

        if (role === 'Student') {
            console.log('Fetching active student academic info...');
            const studentInfo = await pool.request()
                .input('studentId', sql.Int, userId)
                .query(`
                    SELECT 
                        'Grade ' + CAST(g.GradeNumber AS NVARCHAR) as GradeName,
                        ISNULL(s.Name, '') as Section,
                        co.CourseId, co.CourseName,
                        t.FullName as TeacherName,
                        ay.Name as AcademicYearName,
                        sem.Name as SemesterName
                    FROM StudentEnrollments se
                    JOIN Grades g ON se.GradeId = g.Id
                    LEFT JOIN Sections s ON se.SectionId = s.Id
                    JOIN AcademicYears ay ON se.AcademicYearId = ay.Id
                    CROSS JOIN (SELECT TOP 1 Id, Name FROM Semesters WHERE IsActive = 1) sem
                    LEFT JOIN TeacherAssignments ta ON (
                        ta.AcademicYearId = se.AcademicYearId 
                        AND ta.SemesterId = sem.Id
                        AND EXISTS (
                            SELECT 1 FROM Classes c 
                            WHERE c.ClassId = ta.ClassId 
                            AND (c.GradeName = 'Grade ' + CAST(g.GradeNumber AS NVARCHAR) OR c.GradeName = CAST(g.GradeNumber AS NVARCHAR))
                            AND (ISNULL(c.Section, '') = ISNULL(s.Name, ''))
                        )
                    )
                    LEFT JOIN Courses co ON ta.CourseId = co.CourseId
                    LEFT JOIN Users t ON ta.TeacherId = t.UserId
                    WHERE se.StudentId = @studentId 
                    AND ay.IsActive = 1
                    AND se.Status = 'Active'
                `);
            profile.studentData = studentInfo.recordset;
        } else if (role === 'Teacher') {
            const teacherInfo = await pool.request()
                .input('teacherId', sql.Int, userId)
                .query(`
                    SELECT 
                        ta.AssignmentId,
                        c.GradeName, c.Section,
                        co.CourseName,
                        ay.Name as AcademicYearName,
                        s.Name as SemesterName
                    FROM TeacherAssignments ta
                    JOIN Classes c ON ta.ClassId = c.ClassId
                    JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
                    JOIN Semesters s ON ta.SemesterId = s.Id
                    JOIN Courses co ON ta.CourseId = co.CourseId
                    WHERE ta.TeacherId = @teacherId
                    AND ay.IsActive = 1
                    AND s.IsActive = 1
                `);
            profile.teacherData = teacherInfo.recordset;
        }

        res.json(profile);
    } catch (err) {
        console.error('SERVER ERROR IN GET_PROFILE:', err);
        if (err instanceof Error) {
            console.error(err.stack);
        }
        res.status(500).json({ message: 'Server error fetching profile', error: String(err) });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT Password FROM Users WHERE UserId = @userId');

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.Password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('password', sql.NVarChar, hashedNewPassword)
            .query('UPDATE Users SET Password = @password WHERE UserId = @userId');

        // Audit Log
        await logAction({
            userId: userId,
            role: (req as any).user.role,
            action: 'UPDATE',
            tableName: 'Users',
            recordId: userId,
            newValue: { action: 'Password Change' },
            ipAddress: req.ip
        });

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error changing password' });
    }
};
export const updateProfileImage = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    if (!filePath) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('profileImage', sql.NVarChar, filePath)
            .query('UPDATE Users SET ProfileImage = @profileImage WHERE UserId = @userId');

        res.json({ message: 'Profile image updated successfully', profileImage: filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating profile image' });
    }
};
