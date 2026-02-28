import { sql, poolPromise } from '../config/db.js';
export const getAnnouncements = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Announcements ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
};
export const createAnnouncement = async (req, res) => {
    const { title, content, targetRole, deadline, classId } = req.body;
    const userId = req.user.id;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('targetRole', sql.NVarChar, targetRole)
            .input('deadline', sql.DateTime, deadline || null)
            .input('classId', sql.Int, classId || null)
            .input('createdBy', sql.Int, userId)
            .query('INSERT INTO Announcements (Title, Content, TargetRole, CreatedBy, Deadline, ClassId) VALUES (@title, @content, @targetRole, @createdBy, @deadline, @classId)');
        res.status(201).json({ message: 'Announcement created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating announcement' });
    }
};
export const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, content, targetRole, deadline, classId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('targetRole', sql.NVarChar, targetRole)
            .input('deadline', sql.DateTime, deadline || null)
            .input('classId', sql.Int, classId || null)
            .query('UPDATE Announcements SET Title = @title, Content = @content, TargetRole = @targetRole, Deadline = @deadline, ClassId = @classId WHERE Id = @id');
        res.json({ message: 'Announcement updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating announcement' });
    }
};
export const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Announcements WHERE Id = @id');
        res.json({ message: 'Announcement deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting announcement' });
    }
};
export const getLatestAnnouncement = async (req, res) => {
    const { role } = req.query;
    const userId = req.user?.id;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = "";
        let deadlineFilter = " AND (Deadline IS NULL OR Deadline >= CAST(GETDATE() AS DATE))";
        if (!role || role === 'undefined' || role === 'null') {
            // Guest User: Only show public announcements (All roles, No specific class)
            query = "SELECT * FROM Announcements WHERE TargetRole = 'All' AND ClassId IS NULL";
        }
        else if (role.toString().toLowerCase() === 'admin' || role.toString().toLowerCase() === 'director') {
            // Admin/Director: See everything
            query = "SELECT * FROM Announcements WHERE 1=1";
        }
        else if (role.toString().toLowerCase() === 'student' && userId) {
            // Student: global + role-specific + their classes
            request.input('userId', sql.Int, userId);
            query = `
                SELECT * FROM Announcements 
                WHERE (TargetRole IN ('Student', 'All'))
                AND (ClassId IS NULL OR ClassId IN (SELECT ClassId FROM StudentClasses WHERE StudentId = @userId))
            `;
        }
        else if (role.toString().toLowerCase() === 'teacher' && userId) {
            // Teacher: global + role-specific + their classes
            request.input('userId', sql.Int, userId);
            query = `
                SELECT * FROM Announcements 
                WHERE (TargetRole IN ('Teacher', 'All'))
                AND (ClassId IS NULL OR ClassId IN (SELECT ClassId FROM TeacherAssignments WHERE TeacherId = @userId))
            `;
        }
        else {
            // Fallback for logged in with unknown role or missing ID
            query = "SELECT * FROM Announcements WHERE TargetRole = 'All' AND ClassId IS NULL";
        }
        const result = await request.query(query + deadlineFilter + " ORDER BY CreatedAt DESC");
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching latest announcement' });
    }
};
