import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: sql.config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'admin',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'OnlineExamDB',
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true, // for local dev
    },
};

export const poolPromise = sql.connect(dbConfig)
    .then(pool => {
        console.log('Connected to SQL Server');
        return pool;
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        throw err;
    });

export { sql };
