
import { poolPromise } from '../backend/src/config/db.js';

async function check() {
    try {
        const pool = await poolPromise;
        console.log("--- Schools ---");
        const schools = await pool.request().query("SELECT * FROM Schools");
        console.table(schools.recordset);

        console.log("\n--- Users (Students & Teachers) ---");
        const users = await pool.request().query("SELECT Role, Gender, SchoolId, COUNT(*) as count FROM Users WHERE Role IN ('Student', 'Teacher') GROUP BY Role, Gender, SchoolId");
        console.table(users.recordset);

        console.log("\n--- StudentEnrollments ---");
        const enrollments = await pool.request().query("SELECT SchoolId, COUNT(*) as count FROM StudentEnrollments GROUP BY SchoolId");
        console.table(enrollments.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
