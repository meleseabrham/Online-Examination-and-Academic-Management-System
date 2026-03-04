import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'dotenv/config';
//import cron from 'node-cron';
import { performFullBackup, performDiffBackup, performLogBackup, cleanupOldBackups } from './controllers/backupController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('Online Examination System API is running...');
});

import { poolPromise } from './config/db.js';
app.get('/api/health', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT 1 as health');
        res.json({ status: 'ok', db: result.recordset[0] });
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message, stack: err.stack });
    }
});

// Import Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import directorRoutes from './routes/directorRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import { checkMaintenanceMode, ensureSystemSchema } from './controllers/systemController.js';
import auditRoutes from './routes/auditRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/audit', auditRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('--- GLOBAL ERROR ---');
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);

    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Ensure system schema is ready once on startup
    try {
        await ensureSystemSchema();
        console.log('System settings schema verified.');
    } catch (err) {
        console.error('Failed to verify system schema on startup:', err);
    }

    // --- SCHEDULED BACKUPS ---

    // 1. Full Backup - Daily at Midnight
    // cron.schedule('0 0 * * *', () => {
    //     console.log('Running scheduled Full Backup...');
    //     performFullBackup();
    // });

    // // 2. Differential Backup - Every 6 Hours
    // cron.schedule('0 */6 * * *', () => {
    //     console.log('Running scheduled Differential Backup...');
    //     performDiffBackup();
    // });

    // // 3. Transaction Log Backup - Every 15 Minutes
    // cron.schedule('*/15 * * * *', () => {
    //     console.log('Running scheduled Transaction Log Backup...');
    //     performLogBackup();
    // });

    // // 4. Cleanup Old Backups - Daily at 1 AM
    // cron.schedule('0 1 * * *', () => {
    //     console.log('Running scheduled Backup Cleanup...');
    //     cleanupOldBackups();
    // });
});

export default app;
