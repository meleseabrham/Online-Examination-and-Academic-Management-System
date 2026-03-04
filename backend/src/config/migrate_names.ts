import { poolPromise, sql } from './db.js';

const migrate = async () => {
    try {
        const pool = await poolPromise;
        console.log('Adding name split columns to Users table...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'FirstName')
            BEGIN
                ALTER TABLE Users ADD FirstName NVARCHAR(100) NULL;
                ALTER TABLE Users ADD MiddleName NVARCHAR(100) NULL;
                ALTER TABLE Users ADD LastName NVARCHAR(100) NULL;
                PRINT 'Columns "FirstName", "MiddleName", "LastName" added successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Name split columns already exist.';
            END
        `);

        // Optionally migrate existing FullName to FirstName (as a temporary measure)
        await pool.request().query(`
            UPDATE Users SET FirstName = FullName WHERE FirstName IS NULL;
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
