const sql = require('mssql');
require('dotenv').config({ path: 'c:/project/Online Exam/backend/.env' });

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'admin',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'OnlineExamDB',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

const check = async () => {
    try {
        console.log('Connecting to SQL Server...');
        const pool = await sql.connect(config);
        console.log('Connected!');

        const tables = await pool.request().query("SELECT name FROM sys.tables");
        console.log('Tables in DB:', tables.recordset.map(r => r.name).join(', '));

        const settings = await pool.request().query("SELECT * FROM SystemSettings");
        console.log('SystemSettings content:', settings.recordset);

        await pool.close();
    } catch (err) {
        console.error('ERROR:', err);
    }
};

check();
