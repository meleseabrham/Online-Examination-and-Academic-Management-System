import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';

export const getTeacherAssignments = async (req: Request, res: Response) => {
    const { academicYearId, semesterId } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT ta.AssignmentId, ta.TeacherId, ta.ClassId, ta.CourseId, ta.AcademicYearId, ta.SemesterId,
                   u.FullName as TeacherName, u.Email as TeacherEmail,
                   c.GradeName, c.Section,
                   co.CourseName,
                   ay.Name as AcademicYearName,
                   s.Name as SemesterName
            FROM TeacherAssignments ta
            JOIN Users u ON ta.TeacherId = u.UserId
            JOIN Classes c ON ta.ClassId = c.ClassId
            JOIN Courses co ON ta.CourseId = co.CourseId
            LEFT JOIN AcademicYears ay ON ta.AcademicYearId = ay.Id
            LEFT JOIN Semesters s ON ta.SemesterId = s.Id
            WHERE 1=1
        `;

        if (academicYearId) {
            request.input('ayId', sql.Int, academicYearId);
            query += " AND ta.AcademicYearId = @ayId";
        }
        if (semesterId) {
            request.input('semId', sql.Int, semesterId);
            // Relaxed filter: show assignments for this semester OR any assignment in the same year
            query += " AND (ta.SemesterId = @semId OR (ta.AcademicYearId IS NOT NULL AND ta.AcademicYearId = (SELECT TOP 1 AcademicYearId FROM Semesters WHERE Id = @semId)))";
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};

export const createTeacherAssignment = async (req: Request, res: Response) => {
    let { teacherId, classId, courseId, academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;

        // If no academic year is provided, try to find the active one
        if (!academicYearId) {
            const activeYearRes = await pool.request().query('SELECT Id FROM AcademicYears WHERE IsActive = 1');
            if (activeYearRes.recordset.length > 0) {
                academicYearId = activeYearRes.recordset[0].Id;
            }
        }
        // If no semester is provided, try to find the active one
        if (!semesterId) {
            const activeSemRes = await pool.request().query('SELECT Id FROM Semesters WHERE IsActive = 1');
            if (activeSemRes.recordset.length > 0) {
                semesterId = activeSemRes.recordset[0].Id;
            }
        }

        // Check if assignment already exists for this year/semester
        const checkRequest = pool.request()
            .input('teacherId', sql.Int, teacherId)
            .input('classId', sql.Int, classId)
            .input('courseId', sql.Int, courseId);

        let checkQuery = 'SELECT * FROM TeacherAssignments WHERE TeacherId = @teacherId AND ClassId = @classId AND CourseId = @courseId';

        if (academicYearId) {
            checkRequest.input('ayId', sql.Int, academicYearId);
            checkQuery += ' AND AcademicYearId = @ayId';
        } else {
            checkQuery += ' AND AcademicYearId IS NULL';
        }

        if (semesterId) {
            checkRequest.input('semId', sql.Int, semesterId);
            checkQuery += ' AND SemesterId = @semId';
        } else {
            checkQuery += ' AND SemesterId IS NULL';
        }

        const check = await checkRequest.query(checkQuery);

        if (check.recordset.length > 0) {
            return res.status(400).json({ message: 'This teacher is already assigned to this class/course for this period.' });
        }

        await pool.request()
            .input('teacherId', sql.Int, teacherId)
            .input('classId', sql.Int, classId)
            .input('courseId', sql.Int, courseId)
            .input('ayId', sql.Int, academicYearId || null)
            .input('semId', sql.Int, semesterId || null)
            .query(`
                INSERT INTO TeacherAssignments (TeacherId, ClassId, CourseId, AcademicYearId, SemesterId) 
                VALUES (@teacherId, @classId, @courseId, @ayId, @semId);

                -- Sync with GradeCourses (Academic Hierarchy)
                DECLARE @GradeId INT;
                SELECT TOP 1 @GradeId = g.Id 
                FROM Classes cl 
                JOIN Grades g ON (
                    CASE 
                        WHEN cl.GradeName LIKE 'Grade %' THEN REPLACE(cl.GradeName, 'Grade ', '')
                        ELSE cl.GradeName 
                    END = CAST(g.GradeNumber AS VARCHAR(10))
                )
                WHERE cl.ClassId = @classId;

                IF @GradeId IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM GradeCourses 
                    WHERE GradeId = @GradeId AND CourseId = @courseId 
                    AND (AcademicYearId = @ayId OR (AcademicYearId IS NULL AND @ayId IS NULL))
                    AND (SemesterId = @semId OR (SemesterId IS NULL AND @semId IS NULL))
                )
                BEGIN
                    INSERT INTO GradeCourses (GradeId, CourseId, AcademicYearId, SemesterId)
                    VALUES (@GradeId, @courseId, @ayId, @semId);
                END
            `);

        res.status(201).json({ message: 'Teacher assigned successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error assigning teacher' });
    }
};

export const deleteTeacherAssignment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM TeacherAssignments WHERE AssignmentId = @id');
        res.json({ message: 'Assignment removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error removing assignment' });
    }
};

export const updateTeacherAssignment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { teacherId, classId, courseId, academicYearId, semesterId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('teacherId', sql.Int, teacherId)
            .input('classId', sql.Int, classId)
            .input('courseId', sql.Int, courseId)
            .input('ayId', sql.Int, academicYearId || null)
            .input('semId', sql.Int, semesterId || null)
            .query(`
                UPDATE TeacherAssignments 
                SET TeacherId = @teacherId, ClassId = @classId, CourseId = @courseId, 
                    AcademicYearId = @ayId, SemesterId = @semId 
                WHERE AssignmentId = @id;

                -- Sync with GradeCourses
                DECLARE @GradeId INT;
                SELECT TOP 1 @GradeId = g.Id 
                FROM Classes cl 
                JOIN Grades g ON (
                    CASE 
                        WHEN cl.GradeName LIKE 'Grade %' THEN REPLACE(cl.GradeName, 'Grade ', '')
                        ELSE cl.GradeName 
                    END = CAST(g.GradeNumber AS VARCHAR(10))
                )
                WHERE cl.ClassId = @classId;

                IF @GradeId IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM GradeCourses 
                    WHERE GradeId = @GradeId AND CourseId = @courseId 
                    AND (AcademicYearId = @ayId OR (AcademicYearId IS NULL AND @ayId IS NULL))
                    AND (SemesterId = @semId OR (SemesterId IS NULL AND @semId IS NULL))
                )
                BEGIN
                    INSERT INTO GradeCourses (GradeId, CourseId, AcademicYearId, SemesterId)
                    VALUES (@GradeId, @courseId, @ayId, @semId);
                END
            `);
        res.json({ message: 'Assignment updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};
