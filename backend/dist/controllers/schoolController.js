import { sql, poolPromise } from '../config/db.js';
// =============================================
// SCHOOL MANAGEMENT
// =============================================
export const getSchools = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT s.*, 
                (SELECT COUNT(*) FROM Users u WHERE u.SchoolId = s.Id AND u.Role = 'Student') as StudentCount,
                (SELECT COUNT(*) FROM Users u WHERE u.SchoolId = s.Id AND u.Role = 'Teacher') as TeacherCount
            FROM Schools s ORDER BY s.Name
        `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getSchools error:', err);
        res.status(500).json({ message: 'Error fetching schools' });
    }
};
export const createSchool = async (req, res) => {
    const { name, address, code, phone, email } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('address', sql.NVarChar, address || null)
            .input('code', sql.NVarChar, code)
            .input('phone', sql.NVarChar, phone || null)
            .input('email', sql.NVarChar, email || null)
            .query(`INSERT INTO Schools (Name, Address, Code, Phone, Email) VALUES (@name, @address, @code, @phone, @email)`);
        res.status(201).json({ message: 'School created successfully' });
    }
    catch (err) {
        if (err.message?.includes('UNIQUE')) {
            return res.status(400).json({ message: 'School code already exists' });
        }
        console.error('createSchool error:', err);
        res.status(500).json({ message: 'Error creating school' });
    }
};
export const updateSchool = async (req, res) => {
    const { id } = req.params;
    const { name, address, code, phone, email } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('address', sql.NVarChar, address || null)
            .input('code', sql.NVarChar, code)
            .input('phone', sql.NVarChar, phone || null)
            .input('email', sql.NVarChar, email || null)
            .query(`UPDATE Schools SET Name = @name, Address = @address, Code = @code, Phone = @phone, Email = @email WHERE Id = @id`);
        res.json({ message: 'School updated successfully' });
    }
    catch (err) {
        console.error('updateSchool error:', err);
        res.status(500).json({ message: 'Error updating school' });
    }
};
export const deleteSchool = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Check for linked data
        const check = await pool.request().input('id', sql.Int, id)
            .query(`SELECT COUNT(*) as cnt FROM Users WHERE SchoolId = @id`);
        if (check.recordset[0].cnt > 0) {
            return res.status(400).json({ message: 'Cannot delete school with linked users. Transfer them first.' });
        }
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM Schools WHERE Id = @id`);
        res.json({ message: 'School deleted' });
    }
    catch (err) {
        console.error('deleteSchool error:', err);
        res.status(500).json({ message: 'Error deleting school' });
    }
};
// =============================================
// STUDENT TRANSFER
// =============================================
export const transferStudent = async (req, res) => {
    const { studentId, toSchoolId, reason, newGradeId, newSectionId } = req.body;
    const user = req.user;
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            // 1. Get current active enrollment
            const enrollRes = await transaction.request()
                .input('sid', sql.Int, studentId)
                .query(`
                    SELECT TOP 1 se.*, g.GradeNumber, s.Name as SectionName, se.SchoolId as CurrentSchoolId
                    FROM StudentEnrollments se
                    JOIN Grades g ON se.GradeId = g.Id
                    JOIN Sections s ON se.SectionId = s.Id
                    WHERE se.StudentId = @sid AND se.Status = 'Active'
                    ORDER BY se.Id DESC
                `);
            if (enrollRes.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ message: 'No active enrollment found for this student' });
            }
            const currentEnroll = enrollRes.recordset[0];
            const fromSchoolId = currentEnroll.CurrentSchoolId || 1;
            if (fromSchoolId === parseInt(toSchoolId)) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Student is already in the target school' });
            }
            // 2. Calculate cumulative average (if semester results exist)
            const avgRes = await transaction.request()
                .input('sid', sql.Int, studentId)
                .query(`SELECT AVG(Average) as CumulativeAvg FROM SemesterResults WHERE StudentId = @sid`);
            const cumulativeAvg = avgRes.recordset[0]?.CumulativeAvg || null;
            // 3. Mark old enrollment as Transferred
            await transaction.request()
                .input('eid', sql.Int, currentEnroll.Id)
                .query(`
                    UPDATE StudentEnrollments 
                    SET Status = 'Transferred', TransferDate = GETDATE(), TransferNotes = 'Transferred to another school'
                    WHERE Id = @eid
                `);
            // 4. Determine grade/section for new school
            const targetGradeId = newGradeId || currentEnroll.GradeId;
            const targetSectionId = newSectionId || currentEnroll.SectionId;
            // 5. Create new enrollment at new school
            const newEnrollRes = await transaction.request()
                .input('sid', sql.Int, studentId)
                .input('ayId', sql.Int, currentEnroll.AcademicYearId)
                .input('gid', sql.Int, targetGradeId)
                .input('secId', sql.Int, targetSectionId)
                .input('schoolId', sql.Int, toSchoolId)
                .query(`
                    INSERT INTO StudentEnrollments (StudentId, AcademicYearId, GradeId, SectionId, SchoolId, Status)
                    OUTPUT INSERTED.Id
                    VALUES (@sid, @ayId, @gid, @secId, @schoolId, 'Active')
                `);
            const newEnrollId = newEnrollRes.recordset[0].Id;
            // 6. Update user's SchoolId
            await transaction.request()
                .input('sid', sql.Int, studentId)
                .input('schoolId', sql.Int, toSchoolId)
                .query(`UPDATE Users SET SchoolId = @schoolId WHERE UserId = @sid`);
            // 7. Record transfer history
            await transaction.request()
                .input('entityType', sql.NVarChar, 'Student')
                .input('entityId', sql.Int, studentId)
                .input('fromSchool', sql.Int, fromSchoolId)
                .input('toSchool', sql.Int, toSchoolId)
                .input('fromEnroll', sql.Int, currentEnroll.Id)
                .input('toEnroll', sql.Int, newEnrollId)
                .input('reason', sql.NVarChar, reason || null)
                .input('transferBy', sql.Int, user?.id || null)
                .input('cumAvg', sql.Decimal(5, 2), cumulativeAvg)
                .query(`
                    INSERT INTO TransferHistory (EntityType, EntityId, FromSchoolId, ToSchoolId, FromEnrollmentId, ToEnrollmentId, Reason, TransferredBy, CumulativeAverage)
                    VALUES (@entityType, @entityId, @fromSchool, @toSchool, @fromEnroll, @toEnroll, @reason, @transferBy, @cumAvg)
                `);
            await transaction.commit();
            res.json({
                message: 'Student transferred successfully',
                transfer: {
                    from: fromSchoolId,
                    to: toSchoolId,
                    newEnrollmentId: newEnrollId,
                    cumulativeAverage: cumulativeAvg
                }
            });
        }
        catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    catch (err) {
        console.error('transferStudent error:', err);
        res.status(500).json({ message: 'Error transferring student' });
    }
};
// =============================================
// TEACHER TRANSFER / REPLACEMENT
// =============================================
export const transferTeacher = async (req, res) => {
    const { teacherId, toSchoolId, replacementTeacherId, reason } = req.body;
    const user = req.user;
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            // 1. Get all active assignments for this teacher
            const assignRes = await transaction.request()
                .input('tid', sql.Int, teacherId)
                .query(`
                    SELECT * FROM TeacherAssignments 
                    WHERE TeacherId = @tid AND (Status = 'Active' OR Status IS NULL)
                `);
            const assignments = assignRes.recordset;
            const fromSchoolId = assignments[0]?.SchoolId || 1;
            // 2. Mark all current assignments as Replaced/Transferred
            for (const assign of assignments) {
                await transaction.request()
                    .input('aid', sql.Int, assign.AssignmentId)
                    .input('replacedBy', sql.Int, replacementTeacherId || null)
                    .query(`
                        UPDATE TeacherAssignments 
                        SET Status = 'Replaced', ReplacedBy = @replacedBy, ReplacedAt = GETDATE()
                        WHERE AssignmentId = @aid
                    `);
                // 3. Create new assignment for replacement teacher (if provided)
                if (replacementTeacherId) {
                    await transaction.request()
                        .input('newTid', sql.Int, replacementTeacherId)
                        .input('classId', sql.Int, assign.ClassId)
                        .input('courseId', sql.Int, assign.CourseId)
                        .input('ayId', sql.Int, assign.AcademicYearId)
                        .input('schoolId', sql.Int, assign.SchoolId || fromSchoolId)
                        .query(`
                            INSERT INTO TeacherAssignments (TeacherId, ClassId, CourseId, AcademicYearId, SchoolId, Status)
                            VALUES (@newTid, @classId, @courseId, @ayId, @schoolId, 'Active')
                        `);
                }
            }
            // 4. If transferring to new school, update user record and create stub assignments
            if (toSchoolId) {
                await transaction.request()
                    .input('tid', sql.Int, teacherId)
                    .input('schoolId', sql.Int, toSchoolId)
                    .query(`UPDATE Users SET SchoolId = @schoolId WHERE UserId = @tid`);
            }
            // 5. Record transfer history
            await transaction.request()
                .input('entityType', sql.NVarChar, 'Teacher')
                .input('entityId', sql.Int, teacherId)
                .input('fromSchool', sql.Int, fromSchoolId)
                .input('toSchool', sql.Int, toSchoolId || fromSchoolId)
                .input('reason', sql.NVarChar, reason || null)
                .input('transferBy', sql.Int, user?.id || null)
                .query(`
                    INSERT INTO TransferHistory (EntityType, EntityId, FromSchoolId, ToSchoolId, Reason, TransferredBy)
                    VALUES (@entityType, @entityId, @fromSchool, @toSchool, @reason, @transferBy)
                `);
            await transaction.commit();
            res.json({
                message: 'Teacher transfer completed',
                assignmentsProcessed: assignments.length,
                replacementAssigned: !!replacementTeacherId
            });
        }
        catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    catch (err) {
        console.error('transferTeacher error:', err);
        res.status(500).json({ message: 'Error transferring teacher' });
    }
};
// =============================================
// TRANSFER HISTORY
// =============================================
export const getTransferHistory = async (req, res) => {
    const { entityType, entityId } = req.query;
    try {
        const pool = await poolPromise;
        let query = `
            SELECT th.*, 
                fs.Name as FromSchoolName, ts.Name as ToSchoolName,
                u.FullName as EntityName, tb.FullName as TransferredByName
            FROM TransferHistory th
            JOIN Schools fs ON th.FromSchoolId = fs.Id
            JOIN Schools ts ON th.ToSchoolId = ts.Id
            LEFT JOIN Users u ON th.EntityId = u.UserId
            LEFT JOIN Users tb ON th.TransferredBy = tb.UserId
            WHERE 1=1
        `;
        const request = pool.request();
        if (entityType) {
            query += ` AND th.EntityType = @entityType`;
            request.input('entityType', sql.NVarChar, entityType);
        }
        if (entityId) {
            query += ` AND th.EntityId = @entityId`;
            request.input('entityId', sql.Int, entityId);
        }
        query += ` ORDER BY th.TransferDate DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('getTransferHistory error:', err);
        res.status(500).json({ message: 'Error fetching transfer history' });
    }
};
