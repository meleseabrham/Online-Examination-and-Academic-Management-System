const sql = require('mssql');
require('dotenv').config({ path: 'c:/project/Online Exam/backend/.env' });

const check = async () => {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_NAME,
            options: { encrypt: true, trustServerCertificate: true }
        });

        console.log('--- TABLES CHECK ---');
        const counts = await pool.request().query("SELECT (SELECT COUNT(*) FROM Users) as usersCount, (SELECT COUNT(*) FROM AcademicYears) as ayCount");
        console.log('Counts:', counts.recordset[0]);

        console.log('--- ADMIN STATS QUERY ---');
        const adminStats = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Users WHERE Role = 'Student') as studentCount,
                (SELECT COUNT(*) FROM Users WHERE Role = 'Teacher') as teacherCount
            FROM (SELECT 1 as d) as dummy
        `);
        console.log('Stats:', adminStats.recordset[0]);

        console.log('--- SYSTEM SETTINGS CHECK ---');
        const settings = await pool.request().query("SELECT SettingKey, SettingValue FROM SystemSettings");
        console.log('Settings:', settings.recordset);

    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        sql.close();
    }
};

check();
