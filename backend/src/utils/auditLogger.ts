import { poolPromise } from '../config/db.js';
import sql from 'mssql';

export interface AuditLogEntry {
    userId: number;
    role: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'LOGIN' | 'LOGOUT';
    tableName: string;
    recordId?: number;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
}

/**
 * Logs an action to the AuditLog table.
 */
export async function logAction(entry: AuditLogEntry) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('user_id', sql.Int, entry.userId)
            .input('role', sql.VarChar(50), entry.role)
            .input('action', sql.VarChar(100), entry.action)
            .input('table_name', sql.VarChar(100), entry.tableName)
            .input('record_id', sql.Int, entry.recordId || null)
            .input('old_value', sql.NVarChar(sql.MAX), entry.oldValue ? JSON.stringify(entry.oldValue) : null)
            .input('new_value', sql.NVarChar(sql.MAX), entry.newValue ? JSON.stringify(entry.newValue) : null)
            .input('ip_address', sql.VarChar(50), entry.ipAddress || null)
            .query(`
                INSERT INTO AuditLog (user_id, role, action, table_name, record_id, old_value, new_value, ip_address)
                VALUES (@user_id, @role, @action, @table_name, @record_id, @old_value, @new_value, @ip_address)
            `);
    } catch (err) {
        console.error('Failed to write audit log:', err);
        // We don't throw here to avoid breaking the main operation if logging fails
    }
}
