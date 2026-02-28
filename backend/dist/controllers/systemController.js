import { sql, poolPromise } from '../config/db.js';
import fs from 'fs';
import path from 'path';
export const ensureSystemSchema = async () => {
    try {
        const pool = await poolPromise;
        // 1. Create table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
            BEGIN
                CREATE TABLE SystemSettings (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    SettingKey NVARCHAR(100) NOT NULL,
                    SettingValue NVARCHAR(MAX) NOT NULL,
                    EntityType NVARCHAR(50),
                    EntityId INT,
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
            END
        `);
        // 2. Add missing columns one by one
        if (pool) {
            // Check if Id column exists. If not, we might need to drop existing PK on SettingKey
            const tableCheck = await pool.request().query(`
                SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('SystemSettings') AND name = 'Id'
            `);
            if (tableCheck.recordset.length === 0) {
                // Id is missing. Check if there's a PK we need to drop
                await pool.request().query(`
                    DECLARE @PKName NVARCHAR(200);
                    SELECT @PKName = name FROM sys.indexes WHERE object_id = OBJECT_ID('SystemSettings') AND is_primary_key = 1;
                    IF @PKName IS NOT NULL
                    BEGIN
                        DECLARE @DropSQL NVARCHAR(MAX) = 'ALTER TABLE SystemSettings DROP CONSTRAINT ' + @PKName;
                        EXEC sp_executesql @DropSQL;
                    END
                    
                    -- Now add Id
                    ALTER TABLE SystemSettings ADD Id INT IDENTITY(1,1) PRIMARY KEY;
                `);
            }
            const columns = [
                { name: 'EntityType', type: 'NVARCHAR(50)' },
                { name: 'EntityId', type: 'INT' },
                { name: 'UpdatedAt', type: 'DATETIME DEFAULT GETDATE()' }
            ];
            for (const col of columns) {
                await pool.request().query(`
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SystemSettings') AND name = '${col.name}')
                    BEGIN
                        ALTER TABLE SystemSettings ADD ${col.name} ${col.type}
                    END
                `);
            }
        }
        // 3. Add unique constraint if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_SystemSettings_Key_Entity' AND type = 'UQ')
            BEGIN
                BEGIN TRY
                    ALTER TABLE SystemSettings ADD CONSTRAINT UQ_SystemSettings_Key_Entity UNIQUE (SettingKey, EntityType, EntityId)
                END TRY
                BEGIN CATCH
                    -- Ignore if constraint already exists or if data violates it
                END CATCH
            END
        `);
    }
    catch (err) {
        console.error('System Schema Migration Error:', err);
    }
};
export const getSystemSettings = async (req, res) => {
    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM SystemSettings');
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching system settings' });
    }
};
export const getPublicSettings = async (req, res) => {
    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT SettingKey, SettingValue 
            FROM SystemSettings 
            WHERE SettingKey IN ('SchoolName', 'SystemVersion', 'SupportEmail', 'SchoolLogo') 
            AND EntityType IS NULL
        `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching public settings' });
    }
};
export const updateSystemSetting = async (req, res) => {
    const { key, value, entityType, entityId } = req.body;
    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        // Handle potential empty strings or undefined as NULL
        const eType = entityType === '' || entityType === undefined ? null : entityType;
        const eId = (entityId === '' || entityId === undefined || isNaN(Number(entityId))) ? null : Number(entityId);
        await pool.request()
            .input('key', sql.NVarChar, key)
            .input('value', sql.NVarChar, value)
            .input('entityType', sql.NVarChar, eType)
            .input('entityId', sql.Int, eId)
            .query(`
                MERGE INTO SystemSettings AS target
                USING (SELECT @key AS SettingKey, @entityType AS EntityType, @entityId AS EntityId) AS source
                ON (target.SettingKey = source.SettingKey 
                    AND (target.EntityType = source.EntityType OR (target.EntityType IS NULL AND source.EntityType IS NULL))
                    AND (target.EntityId = source.EntityId OR (target.EntityId IS NULL AND source.EntityId IS NULL)))
                WHEN MATCHED THEN
                    UPDATE SET SettingValue = @value, UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (SettingKey, SettingValue, EntityType, EntityId)
                    VALUES (@key, @value, @entityType, @entityId);
            `);
        res.json({ message: 'Setting updated successfully' });
    }
    catch (err) {
        console.error('Update Setting Error:', err);
        res.status(500).json({
            message: 'Error updating system setting',
            error: err.message
        });
    }
};
export const deleteSystemSetting = async (req, res) => {
    const { id } = req.params;
    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM SystemSettings WHERE Id = @id');
        res.json({ message: 'Setting removed successfully' });
    }
    catch (err) {
        console.error('Delete Setting Error:', err);
        res.status(500).json({ message: 'Error deleting system setting' });
    }
};
export const updateLogo = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const logoUrl = `/uploads/branding/${req.file.filename}`;
        await ensureSystemSchema();
        const pool = await poolPromise;
        // Optional: Delete old file if exists
        const oldSetting = await pool.request()
            .input('key', sql.NVarChar, 'SchoolLogo')
            .query('SELECT SettingValue FROM SystemSettings WHERE SettingKey = @key AND EntityType IS NULL');
        if (oldSetting.recordset.length > 0) {
            const oldPath = path.join(process.cwd(), oldSetting.recordset[0].SettingValue);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        await pool.request()
            .input('key', sql.NVarChar, 'SchoolLogo')
            .input('value', sql.NVarChar, logoUrl)
            .query(`
                MERGE INTO SystemSettings AS target
                USING (SELECT @key AS SettingKey) AS source
                ON (target.SettingKey = source.SettingKey AND target.EntityType IS NULL)
                WHEN MATCHED THEN
                    UPDATE SET SettingValue = @value, UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (SettingKey, SettingValue)
                    VALUES (@key, @value);
            `);
        res.json({ message: 'Logo updated successfully', url: logoUrl });
    }
    catch (err) {
        console.error('Update Logo Error:', err);
        res.status(500).json({ message: 'Error updating logo' });
    }
};
export const deleteLogo = async (req, res) => {
    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        const oldSetting = await pool.request()
            .input('key', sql.NVarChar, 'SchoolLogo')
            .query('SELECT SettingValue FROM SystemSettings WHERE SettingKey = @key AND EntityType IS NULL');
        if (oldSetting.recordset.length > 0) {
            const oldPath = path.join(process.cwd(), oldSetting.recordset[0].SettingValue);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        await pool.request()
            .input('key', sql.NVarChar, 'SchoolLogo')
            .query('DELETE FROM SystemSettings WHERE SettingKey = @key AND EntityType IS NULL');
        res.json({ message: 'Logo deleted successfully' });
    }
    catch (err) {
        console.error('Delete Logo Error:', err);
        res.status(500).json({ message: 'Error deleting logo' });
    }
};
export const checkMaintenanceMode = async (req, res, next) => {
    try {
        await ensureSystemSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('key', sql.NVarChar, 'MaintenanceMode')
            .query('SELECT SettingValue FROM SystemSettings WHERE SettingKey = @key AND EntityType IS NULL');
        if (result.recordset.length > 0 && result.recordset[0].SettingValue === 'true') {
            const user = req.user;
            // Allow Admins to bypass maintenance
            if (user && (user.role?.toLowerCase() === 'admin' || user.Role?.toLowerCase() === 'admin')) {
                return next();
            }
            return res.status(503).json({
                message: 'System is under maintenance. Please try again later.',
                underMaintenance: true
            });
        }
        next();
    }
    catch (err) {
        console.error('Maintenance check error:', err);
        next();
    }
};
