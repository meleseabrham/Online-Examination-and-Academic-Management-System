import { poolPromise } from './src/config/db.js';

async function fixDB() {
    try {
        const pool = await poolPromise;
        console.log("Fixing DB records...");

        await pool.request().query("UPDATE Users SET SchoolId = 3 WHERE Role IN ('Student', 'Teacher')");
        console.log("Users updated.");

        await pool.request().query("UPDATE StudentEnrollments SET SchoolId = 3");
        console.log("Enrollments updated.");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixDB();
