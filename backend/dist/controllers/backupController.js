import { sql, poolPromise } from '../config/db.js';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
const execPromise = promisify(exec);
const BACKUP_DIR = 'C:\\project\\Online Exam\\Backup';
/**
 * Mock Cloud Storage Upload (Placeholder for S3/Azure/GCP)
 */
const uploadToCloud = async (filePath) => {
    console.log(`[Cloud] Uploading ${path.basename(filePath)} to secondary storage...`);
    // In a real scenario, use AWS SDK (S3), Azure Storage SDK, or GCP Storage
    return true;
};
/**
 * Perform a Full Backup
 */
export const performFullBackup = async (req, res) => {
    try {
        const pool = await poolPromise;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `FullBackup_${timestamp}.bak`;
        const filePath = path.join(BACKUP_DIR, fileName);
        console.log(`Starting Full Backup: ${fileName}`);
        const query = `
            BACKUP DATABASE [${process.env.DB_NAME || 'OnlineExamDB'}]
            TO DISK = '${filePath}'
            WITH FORMAT, MEDIANAME = 'ExamFullBackup', NAME = 'Full Backup of ExamDB'
        `;
        await pool.request().query(query);
        // Upload to Cloud (Placeholder)
        await uploadToCloud(filePath);
        // Get file size
        const stats = fs.statSync(filePath);
        // Log to database
        await pool.request()
            .input('type', sql.NVarChar, 'Full')
            .input('name', sql.NVarChar, fileName)
            .input('path', sql.NVarChar, filePath)
            .input('size', sql.BigInt, stats.size)
            .input('status', sql.NVarChar, 'Success')
            .query("INSERT INTO BackupLogs (BackupType, FileName, FilePath, FileSize, Status) VALUES (@type, @name, @path, @size, @status)");
        if (res)
            res.json({ message: 'Full backup completed successfully', fileName });
        return { success: true, fileName };
    }
    catch (err) {
        console.error('Full Backup Error:', err);
        if (res)
            res.status(500).json({ message: 'Full backup failed', error: err.message });
        return { success: false, error: err.message };
    }
};
/**
 * Perform a Differential Backup
 */
export const performDiffBackup = async () => {
    try {
        const pool = await poolPromise;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `DiffBackup_${timestamp}.bak`;
        const filePath = path.join(BACKUP_DIR, fileName);
        const query = `
            BACKUP DATABASE [${process.env.DB_NAME || 'OnlineExamDB'}]
            TO DISK = '${filePath}'
            WITH DIFFERENTIAL, NAME = 'Differential Backup of ExamDB'
        `;
        await pool.request().query(query);
        const stats = fs.statSync(filePath);
        await pool.request()
            .input('type', sql.NVarChar, 'Differential')
            .input('name', sql.NVarChar, fileName)
            .input('path', sql.NVarChar, filePath)
            .input('size', sql.BigInt, stats.size)
            .input('status', sql.NVarChar, 'Success')
            .query("INSERT INTO BackupLogs (BackupType, FileName, FilePath, FileSize, Status) VALUES (@type, @name, @path, @size, @status)");
        return { success: true, fileName };
    }
    catch (err) {
        console.error('Diff Backup Error:', err);
        return { success: false, error: err.message };
    }
};
/**
 * Perform a Transaction Log Backup
 */
export const performLogBackup = async () => {
    try {
        const pool = await poolPromise;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `LogBackup_${timestamp}.trn`;
        const filePath = path.join(BACKUP_DIR, fileName);
        const query = `
            BACKUP LOG [${process.env.DB_NAME || 'OnlineExamDB'}]
            TO DISK = '${filePath}'
            WITH NAME = 'Log Backup of ExamDB'
        `;
        await pool.request().query(query);
        const stats = fs.statSync(filePath);
        await pool.request()
            .input('type', sql.NVarChar, 'Transaction Log')
            .input('name', sql.NVarChar, fileName)
            .input('path', sql.NVarChar, filePath)
            .input('size', sql.BigInt, stats.size)
            .input('status', sql.NVarChar, 'Success')
            .query("INSERT INTO BackupLogs (BackupType, FileName, FilePath, FileSize, Status) VALUES (@type, @name, @path, @size, @status)");
        return { success: true, fileName };
    }
    catch (err) {
        // Log failures can happen if DB is in Simple Recovery Model
        console.error('Log Backup Error (Check Recovery Model):', err);
        return { success: false, error: err.message };
    }
};
/**
 * Restore Database
 */
export const restoreDatabase = async (req, res) => {
    const { fileName } = req.body;
    if (!fileName)
        return res.status(400).json({ message: 'Backup file name is required' });
    try {
        const pool = await poolPromise;
        const filePath = path.join(BACKUP_DIR, fileName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Backup file not found on disk' });
        }
        // To restore, we must kick everyone off the DB
        const dbName = process.env.DB_NAME || 'OnlineExamDB';
        const query = `
            USE master;
            ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            RESTORE DATABASE [${dbName}] FROM DISK = '${filePath}' WITH REPLACE;
            ALTER DATABASE [${dbName}] SET MULTI_USER;
        `;
        await pool.request().query(query);
        res.json({ message: 'Database restored successfully' });
    }
    catch (err) {
        console.error('Restore Error:', err);
        res.status(500).json({ message: 'Database restore failed', error: err.message });
    }
};
/**
 * Get Backup Logs
 */
export const getBackupLogs = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM BackupLogs ORDER BY CreatedAt DESC");
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching backup logs' });
    }
};
/**
 * Cleanup Old Backups (30 days)
 */
export const cleanupOldBackups = async () => {
    const retentionDays = 30;
    const now = Date.now();
    const cutoff = now - (retentionDays * 24 * 60 * 60 * 1000);
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs < cutoff) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old backup: ${file}`);
            }
        }
    }
    catch (err) {
        console.error('Cleanup Error:', err);
    }
};
