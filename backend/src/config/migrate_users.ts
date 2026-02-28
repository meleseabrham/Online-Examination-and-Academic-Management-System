import { poolPromise, sql } from './db.js';

const migrate = async () => {
    try {
        const pool = await poolPromise;
        console.log('Adding "Title" column to Users table if not exists...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Title')
            BEGIN
                ALTER TABLE Users ADD Title NVARCHAR(100) NULL;
                PRINT 'Column "Title" added successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Column "Title" already exists.';
            END
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
