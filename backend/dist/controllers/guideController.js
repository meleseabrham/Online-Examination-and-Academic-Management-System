import { sql, poolPromise } from '../config/db.js';
// Ensure the SystemGuides table exists
const ensureTable = async () => {
    const pool = await poolPromise;
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SystemGuides')
        CREATE TABLE SystemGuides (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            Title NVARCHAR(255) NOT NULL,
            Description NVARCHAR(MAX),
            Content NVARCHAR(MAX),
            TargetRole NVARCHAR(50) NOT NULL DEFAULT 'All',
            FileName NVARCHAR(255),
            FilePath NVARCHAR(500),
            CreatedBy INT,
            CreatedAt DATETIME DEFAULT GETDATE(),
            UpdatedAt DATETIME DEFAULT GETDATE()
        )
    `);
};
// GET guides - admin sees all, teachers/students see only their role + 'All'
export const getGuides = async (req, res) => {
    try {
        await ensureTable();
        const pool = await poolPromise;
        const role = req.user.role;
        const { targetRole } = req.query;
        let query = `
            SELECT g.*, u.FullName as AuthorName
            FROM SystemGuides g
            LEFT JOIN Users u ON g.CreatedBy = u.UserId
        `;
        if (role === 'Admin' || role === 'admin') {
            if (targetRole && targetRole !== 'All') {
                query += ` WHERE g.TargetRole = @targetRole OR g.TargetRole = 'All'`;
            }
        }
        else if (role === 'Teacher' || role === 'teacher') {
            query += ` WHERE g.TargetRole IN ('Teacher', 'All')`;
        }
        else {
            query += ` WHERE g.TargetRole IN ('Student', 'All')`;
        }
        query += ` ORDER BY g.CreatedAt DESC`;
        const request = pool.request();
        if (targetRole && targetRole !== 'All' && (role === 'Admin' || role === 'admin')) {
            request.input('targetRole', sql.NVarChar, targetRole);
        }
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getGuides error:', err);
        res.status(500).json({ message: 'Error fetching guides' });
    }
};
// CREATE guide (admin only)
export const createGuide = async (req, res) => {
    try {
        await ensureTable();
        const pool = await poolPromise;
        const userId = req.user.id;
        const { title, description, content, targetRole } = req.body;
        const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
        const fileName = req.file ? req.file.originalname : null;
        await pool.request()
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('content', sql.NVarChar, content || '')
            .input('targetRole', sql.NVarChar, targetRole || 'All')
            .input('fileName', sql.NVarChar, fileName)
            .input('filePath', sql.NVarChar, filePath)
            .input('createdBy', sql.Int, userId)
            .query(`
                INSERT INTO SystemGuides (Title, Description, Content, TargetRole, FileName, FilePath, CreatedBy)
                VALUES (@title, @description, @content, @targetRole, @fileName, @filePath, @createdBy)
            `);
        res.status(201).json({ message: 'Guide created successfully' });
    }
    catch (err) {
        console.error('createGuide error:', err);
        res.status(500).json({ message: 'Error creating guide' });
    }
};
// UPDATE guide (admin only)
export const updateGuide = async (req, res) => {
    try {
        await ensureTable();
        const pool = await poolPromise;
        const { id } = req.params;
        const { title, description, content, targetRole } = req.body;
        const filePath = req.file ? req.file.path.replace(/\\/g, '/') : undefined;
        const fileName = req.file ? req.file.originalname : undefined;
        let query = `
            UPDATE SystemGuides SET 
                Title = @title,
                Description = @description,
                Content = @content,
                TargetRole = @targetRole,
                UpdatedAt = GETDATE()
        `;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('description', sql.NVarChar, description || '')
            .input('content', sql.NVarChar, content || '')
            .input('targetRole', sql.NVarChar, targetRole || 'All');
        if (filePath !== undefined) {
            query += `, FileName = @fileName, FilePath = @filePath`;
            request.input('fileName', sql.NVarChar, fileName);
            request.input('filePath', sql.NVarChar, filePath);
        }
        query += ` WHERE Id = @id`;
        await request.query(query);
        res.json({ message: 'Guide updated successfully' });
    }
    catch (err) {
        console.error('updateGuide error:', err);
        res.status(500).json({ message: 'Error updating guide' });
    }
};
// DELETE guide (admin only)
export const deleteGuide = async (req, res) => {
    try {
        await ensureTable();
        const pool = await poolPromise;
        const { id } = req.params;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM SystemGuides WHERE Id = @id');
        res.json({ message: 'Guide deleted successfully' });
    }
    catch (err) {
        console.error('deleteGuide error:', err);
        res.status(500).json({ message: 'Error deleting guide' });
    }
};
