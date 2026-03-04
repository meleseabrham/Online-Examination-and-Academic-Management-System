import { poolPromise } from './db.js';

async function setupAuditLog() {
    try {
        const pool = await poolPromise;

        // Check if table exists
        const checkTable = await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLog')
            BEGIN
                CREATE TABLE AuditLog (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id INT NOT NULL,
                    role VARCHAR(50),
                    action VARCHAR(100),
                    table_name VARCHAR(100),
                    record_id INT,
                    old_value NVARCHAR(MAX),
                    new_value NVARCHAR(MAX),
                    ip_address VARCHAR(50),
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'AuditLog table created.';
            END
            ELSE
            BEGIN
                PRINT 'AuditLog table already exists.';
            END
        `);

        // Create trigger to prevent updates/deletes
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_PreventAuditLogChanges')
            BEGIN
                EXEC('
                CREATE TRIGGER trg_PreventAuditLogChanges
                ON AuditLog
                FOR UPDATE, DELETE
                AS
                BEGIN
                    RAISERROR (''Audit logs are read-only and cannot be modified or deleted.'', 16, 1);
                    ROLLBACK TRANSACTION;
                END
                ');
                PRINT 'Trigger trg_PreventAuditLogChanges created.';
            END
            ELSE
            BEGIN
                PRINT 'Trigger trg_PreventAuditLogChanges already exists.';
            END
        `);

        console.log('Audit Log system setup complete.');
    } catch (err) {
        console.error('Error setting up Audit Log system:', err);
    }
}

setupAuditLog();
