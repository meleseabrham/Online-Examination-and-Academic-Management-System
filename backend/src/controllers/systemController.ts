import { Request, Response, NextFunction } from 'express';
import { sql, poolPromise } from '../config/db.js';
import fs from 'fs';
import path from 'path';

export const ensureSystemSchema = async () => {
    try {
        const pool = await poolPromise;

        // Basic table creation
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

        // Check columns
        const cols = [
            { name: 'EntityType', type: 'NVARCHAR(50)' },
            { name: 'EntityId', type: 'INT' },
            { name: 'UpdatedAt', type: 'DATETIME DEFAULT GETDATE()' }
        ];

        for (const col of cols) {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SystemSettings') AND name = '${col.name}')
                BEGIN
                    ALTER TABLE SystemSettings ADD ${col.name} ${col.type}
                END
            `);
        }

    } catch (err) {
        console.error('System Schema Migration Error:', err);
    }
};

export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM SystemSettings');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching system settings' });
    }
};

export const getPublicSettings = async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT SettingKey, SettingValue 
            FROM SystemSettings 
            WHERE SettingKey IN ('SchoolName', 'SystemVersion', 'SupportEmail', 'SchoolLogo', 'SchoolPhone', 'SchoolAddress', 'LoginBg', 'MaintenanceMode') 
            AND EntityType IS NULL
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching public settings' });
    }
};

export const updateSystemSetting = async (req: Request, res: Response) => {
    const { key, value, entityType, entityId } = req.body;
    try {
        const pool = await poolPromise;
        const eType = entityType || null;
        const eId = (entityId === '' || isNaN(Number(entityId))) ? null : Number(entityId);

        await pool.request()
            .input('key', sql.NVarChar, key)
            .input('value', sql.NVarChar, value)
            .input('et', sql.NVarChar, eType)
            .input('ei', sql.Int, eId)
            .query(`
                IF EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = @key AND (EntityType = @et OR (EntityType IS NULL AND @et IS NULL)) AND (EntityId = @ei OR (EntityId IS NULL AND @ei IS NULL)))
                BEGIN
                    UPDATE SystemSettings SET SettingValue = @value, UpdatedAt = GETDATE()
                    WHERE SettingKey = @key AND (EntityType = @et OR (EntityType IS NULL AND @et IS NULL)) AND (EntityId = @ei OR (EntityId IS NULL AND @ei IS NULL))
                END
                ELSE
                BEGIN
                    INSERT INTO SystemSettings (SettingKey, SettingValue, EntityType, EntityId)
                    VALUES (@key, @value, @et, @ei)
                END
            `);
        res.json({ message: 'Setting updated successfully' });
    } catch (err: any) {
        console.error('Update Setting Error:', err);
        res.status(500).json({ message: 'Error updating system setting', error: err.message });
    }
};

export const deleteSystemSetting = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('DELETE FROM SystemSettings WHERE Id = @id');
        res.json({ message: 'Setting removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting system setting' });
    }
};

// Helper: build full HTTP URL from request and a relative path
const buildUrl = (req: Request, relativePath: string): string => {
    const protocol = req.protocol || 'http';
    const rawHost = req.get('host') || 'localhost';
    const hostname = rawHost.split(':')[0];
    const port = process.env.PORT || 5000;
    return `${protocol}://${hostname}:${port}/${relativePath.replace(/^\//, '')}`;
};

// Helper: extract relative path from a full URL or return as-is
const toRelativePath = (urlOrPath: string): string => {
    if (!urlOrPath) return '';
    try {
        if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
            const u = new URL(urlOrPath);
            return u.pathname.replace(/^\//, '');
        }
        return urlOrPath.replace(/^\//, '');
    } catch {
        return urlOrPath.replace(/^\//, '');
    }
};

const safeDeleteFile = (settingValue: string) => {
    try {
        if (!settingValue) return;
        const oldRel = toRelativePath(settingValue);
        if (!oldRel) return;
        const p = path.join(process.cwd(), oldRel);
        if (fs.existsSync(p)) {
            fs.unlinkSync(p);
        }
    } catch (e) {
        console.warn('Could not delete physical file from disk:', e);
    }
};

export const updateLogo = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const relPath = `uploads/branding/${req.file.filename}`;
        const fullUrl = buildUrl(req, relPath);
        const pool = await poolPromise;

        // Cleanup old logo file safely
        const old = await pool.request().input('k', sql.NVarChar, 'SchoolLogo').query("SELECT SettingValue FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL");
        if (old.recordset.length > 0) {
            safeDeleteFile(old.recordset[0].SettingValue);
        }

        await pool.request().input('k', sql.NVarChar, 'SchoolLogo').input('v', sql.NVarChar, fullUrl).query(`
            IF EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL)
                UPDATE SystemSettings SET SettingValue = @v, UpdatedAt = GETDATE() WHERE SettingKey = @k AND EntityType IS NULL
            ELSE
                INSERT INTO SystemSettings (SettingKey, SettingValue) VALUES (@k, @v)
        `);
        res.json({ message: 'Logo updated successfully', url: fullUrl });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error updating logo' }); }
};

export const deleteLogo = async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const old = await pool.request().input('k', sql.NVarChar, 'SchoolLogo').query("SELECT SettingValue FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL");
        if (old.recordset.length > 0) {
            safeDeleteFile(old.recordset[0].SettingValue);
        }
        await pool.request().input('k', sql.NVarChar, 'SchoolLogo').query("DELETE FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL");
        res.json({ message: 'Logo removed' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error deleting logo' }); }
};

export const updateLoginBg = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const relPath = `uploads/branding/${req.file.filename}`;
        const fullUrl = buildUrl(req, relPath);
        const pool = await poolPromise;

        // Cleanup old background file safely
        const old = await pool.request().input('k', sql.NVarChar, 'LoginBg').query("SELECT SettingValue FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL");
        if (old.recordset.length > 0) {
            safeDeleteFile(old.recordset[0].SettingValue);
        }

        await pool.request().input('k', sql.NVarChar, 'LoginBg').input('v', sql.NVarChar, fullUrl).query(`
            IF EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL)
                UPDATE SystemSettings SET SettingValue = @v, UpdatedAt = GETDATE() WHERE SettingKey = @k AND EntityType IS NULL
            ELSE
                INSERT INTO SystemSettings (SettingKey, SettingValue) VALUES (@k, @v)
        `);
        res.json({ message: 'Login background updated successfully', url: fullUrl });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error updating login background' }); }
};

export const deleteLoginBg = async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const old = await pool.request().input('k', sql.NVarChar, 'LoginBg').query("SELECT SettingValue FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL");
        if (old.recordset.length > 0) {
            safeDeleteFile(old.recordset[0].SettingValue);
        }
        await pool.request().input('k', sql.NVarChar, 'LoginBg').query("DELETE FROM SystemSettings WHERE SettingKey = @k AND EntityType IS NULL");
        res.json({ message: 'Login background removed' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error deleting login background' }); }
};

export const checkMaintenanceMode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('key', sql.NVarChar, 'MaintenanceMode')
            .query('SELECT SettingValue FROM SystemSettings WHERE SettingKey = @key AND EntityType IS NULL');

        const isMain = result.recordset.length > 0 && result.recordset[0].SettingValue === 'true';
        if (isMain) {
            const user = (req as any).user;
            const role = (user?.role || user?.Role || '').toLowerCase();
            if (role === 'admin') return next();
            return res.status(503).json({ message: 'System under maintenance', underMaintenance: true });
        }
        next();
    } catch (err) {
        console.error('Maintenance error:', err);
        next();
    }
};
