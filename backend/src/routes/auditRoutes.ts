import { Router } from 'express';
import { poolPromise } from '../config/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import sql from 'mssql';

const router = Router();

// Only Admin and Director can view logs
router.get('/', authenticateToken, authorizeRoles('Admin', 'Director'), async (req, res) => {
    try {
        const { role, action, tableName, startDate, endDate, userId, date } = req.query;
        const pool = await poolPromise;
        const request = pool.request();

        let query = `
            SELECT A.*, U.FullName, U.Email
            FROM AuditLog A
            LEFT JOIN Users U ON A.user_id = U.UserId
            WHERE 1=1
        `;

        if (role) {
            request.input('role', sql.VarChar, role);
            query += ' AND A.role = @role';
        }
        if (action) {
            request.input('action', sql.VarChar, action);
            query += ' AND A.action = @action';
        }
        if (tableName) {
            request.input('tableName', sql.VarChar, tableName);
            query += ' AND A.table_name = @tableName';
        }
        if (userId) {
            request.input('userId', sql.Int, userId);
            query += ' AND A.user_id = @userId';
        }

        if (date) {
            const d = new Date(date as string);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
            const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
            request.input('startOfDay', sql.DateTime, start);
            request.input('endOfDay', sql.DateTime, end);
            query += ' AND A.created_at >= @startOfDay AND A.created_at <= @endOfDay';
        } else {
            if (startDate) {
                request.input('startDate', sql.DateTime, new Date(startDate as string));
                query += ' AND A.created_at >= @startDate';
            }
            if (endDate) {
                request.input('endDate', sql.DateTime, new Date(endDate as string));
                query += ' AND A.created_at <= @endDate';
            }
        }

        query += ' ORDER BY A.created_at DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ message: 'Error fetching audit logs' });
    }
});

export default router;
