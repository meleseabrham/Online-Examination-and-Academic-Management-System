import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// =============================================
// GENERATE SEMESTER TRANSCRIPT PDF
// =============================================

export const generateTranscript = async (req: Request, res: Response) => {
    const { studentId, semesterId } = req.query;
    const user = (req as any).user;

    try {
        const pool = await poolPromise;

        // 1. Get student info
        const studentRes = await pool.request()
            .input('sid', sql.Int, studentId)
            .query(`
                SELECT u.UserId, u.FullName, u.Email, u.RegistrationNumber,
                    se.GradeId, se.SectionId, se.AcademicYearId, se.SchoolId,
                    g.GradeNumber, sec.Name as SectionName,
                    ay.Name as AcademicYearName,
                    sch.Name as SchoolName, sch.Address as SchoolAddress, sch.Code as SchoolCode, sch.Logo as SchoolLogo,
                    sch.Email as SchoolEmail, sch.Phone as SchoolPhone, sch.RegistrationNumber as SchoolRegNo,
                    u.ProfileImage as StudentPhoto, u.Gender as StudentGender
                FROM Users u
                LEFT JOIN StudentEnrollments se ON se.StudentId = u.UserId
                LEFT JOIN Grades g ON se.GradeId = g.Id
                LEFT JOIN Sections sec ON se.SectionId = sec.Id
                LEFT JOIN AcademicYears ay ON se.AcademicYearId = ay.Id
                LEFT JOIN Schools sch ON se.SchoolId = sch.Id
                WHERE u.UserId = @sid
                ORDER BY se.Id DESC
            `);

        if (studentRes.recordset.length === 0) {
            console.log(`404: Student enrollment not found for ID ${studentId}`);
            return res.status(404).json({ message: `Student enrollment not found for ID ${studentId}` });
        }

        const student = studentRes.recordset[0];

        // 1b. Get global settings (fallback)
        let globalSettings: any = {};
        try {
            const settingsRes = await pool.request().query("SELECT SettingKey, SettingValue FROM SystemSettings WHERE EntityType IS NULL");
            settingsRes.recordset.forEach((s: any) => globalSettings[s.SettingKey] = s.SettingValue);
        } catch (e) { console.log("SystemSettings table not ready yet"); }

        const finalSchoolLogo = student.SchoolLogo || globalSettings['SchoolLogo'];
        const finalSchoolName = student.SchoolName || globalSettings['SchoolName'] || 'Academic Institution';
        const finalSchoolAddress = student.SchoolAddress || globalSettings['SchoolAddress'] || '';
        const finalSchoolEmail = student.SchoolEmail || globalSettings['SchoolEmail'] || globalSettings['SupportEmail'] || 'N/A';
        const finalSchoolPhone = student.SchoolPhone || globalSettings['SchoolPhone'] || 'N/A';

        const getSafePath = (p: string | null) => {
            if (!p || p === '') return null;
            const cleanPath = p.replace(/\\/g, '/').replace(/^\/+/, '');

            const candidates = [
                path.join(process.cwd(), cleanPath),
                path.join(process.cwd(), 'backend', cleanPath),
                path.resolve(cleanPath)
            ];

            for (const cand of candidates) {
                if (fs.existsSync(cand)) return cand;
            }
            return null;
        };

        // 2. Get semester info
        const semRes = await pool.request()
            .input('semId', sql.Int, semesterId)
            .query(`SELECT * FROM Semesters WHERE Id = @semId`);

        if (semRes.recordset.length === 0) {
            console.log(`404: Semester not found for ID ${semesterId}`);
            return res.status(404).json({ message: `Semester not found for ID ${semesterId}` });
        }
        const semester = semRes.recordset[0];

        // 3. Get course assessment breakdown
        const coursesRes = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('semId', sql.Int, semesterId)
            .input('gid', sql.Int, student.GradeId)
            .query(`
                SELECT 
                    a.CourseId, c.CourseName, c.CourseCode,
                    a.Type, a.Title, a.TotalMarks, a.WeightPercentage,
                    sas.MarksObtained, sas.Status as ScoreStatus
                FROM Assessments a
                JOIN Courses c ON a.CourseId = c.CourseId
                LEFT JOIN StudentAssessmentScores sas ON sas.AssessmentId = a.Id AND sas.StudentId = @sid
                WHERE a.SemesterId = @semId AND a.GradeId = @gid
                ORDER BY c.CourseName, a.Type
            `);

        // Group by course
        const courseMap: Record<number, any> = {};
        for (const row of coursesRes.recordset) {
            if (!courseMap[row.CourseId]) {
                courseMap[row.CourseId] = {
                    name: row.CourseName,
                    code: row.CourseCode,
                    assessments: { Quiz: null, Mid: null, Final: null, Assignment: null, Participation: null },
                    totalWeighted: 0,
                    completedWeight: 0
                };
            }
            const marks = row.ScoreStatus === 'Graded' && row.MarksObtained !== null
                ? row.MarksObtained : null;
            courseMap[row.CourseId].assessments[row.Type] = {
                marks, total: row.TotalMarks, weight: row.WeightPercentage
            };
            if (marks !== null && row.TotalMarks > 0) {
                courseMap[row.CourseId].totalWeighted += (marks / row.TotalMarks) * row.WeightPercentage;
                courseMap[row.CourseId].completedWeight += row.WeightPercentage;
            }
        }

        const courses = Object.values(courseMap).map((c: any) => ({
            ...c,
            courseTotal: c.completedWeight > 0
                ? Math.round((c.totalWeighted / c.completedWeight) * 100 * 100) / 100
                : 0
        }));

        // 4. Get semester average and ranking
        const rankRes = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('semId', sql.Int, semesterId)
            .input('ayId', sql.Int, student.AcademicYearId)
            .query(`
                SELECT sr.Average, sr.TotalCourses,
                    fyr.ClassRank, fyr.GradeRank, fyr.SchoolRank
                FROM SemesterResults sr
                LEFT JOIN FinalYearResult fyr ON fyr.StudentId = sr.StudentId AND fyr.AcademicYearId = sr.AcademicYearId
                WHERE sr.StudentId = @sid AND sr.SemesterId = @semId AND sr.AcademicYearId = @ayId
            `);

        const semesterResult = rankRes.recordset[0] || {};
        const semesterAverage = courses.length > 0
            ? courses.reduce((sum, c) => sum + c.courseTotal, 0) / courses.length
            : (semesterResult.Average || 0);

        // 5. Generate PDF
        const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Transcript_${student.RegistrationNumber || student.UserId}_${semester.Name}.pdf"`);
        doc.pipe(res);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // --- HEADER ---
        const logoPath = getSafePath(finalSchoolLogo);
        if (logoPath) {
            doc.image(logoPath, 50, 40, { width: 55 });
            doc.fontSize(18).font('Helvetica-Bold')
                .text(finalSchoolName, 115, 45);
            doc.fontSize(8).font('Helvetica')
                .text(`${finalSchoolAddress} | Tel: ${finalSchoolPhone}`, 115, 63);

            let bottomText = `Email: ${finalSchoolEmail}`;
            if (student.SchoolRegNo && student.SchoolRegNo !== 'N/A') {
                bottomText += ` | Sch. Reg: ${student.SchoolRegNo}`;
            }
            doc.fontSize(7).fillColor('#666')
                .text(bottomText, 115, 75);
            doc.y = 105;
        } else {
            doc.fontSize(18).font('Helvetica-Bold')
                .text(finalSchoolName, { align: 'center' });
            doc.fontSize(9).font('Helvetica')
                .text(finalSchoolAddress, { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(8).fillColor('#666')
                .text(`School Code: ${student.SchoolCode || 'N/A'}`, { align: 'center' });
            doc.moveDown(0.5);
        }

        // Separator
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#333');
        doc.moveDown(0.5);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
            .text('OFFICIAL ACADEMIC TRANSCRIPT', { align: 'center' });
        doc.fontSize(10).font('Helvetica').fillColor('#444')
            .text(`${semester.Name} — ${student.AcademicYearName}`, { align: 'center' });
        doc.moveDown(1);

        // --- STUDENT INFO ---
        const infoY = doc.y;

        // Student Photo with Square Border
        const photoPath = getSafePath(student.StudentPhoto);
        const photoSize = 50;
        const photoX = pageWidth + 50 - photoSize + 50; // Align to right margin
        // Actually pageWidth is drawable width. Page is A4 (595). Right margin 50. Right edge 545. 
        // pageWidth is 595-50-50 = 495.
        // Let's just use absolute: doc.page.width - 100
        const pX = doc.page.width - 50 - photoSize;
        doc.rect(pX, infoY, photoSize, photoSize).lineWidth(0.5).stroke('#bbb');
        if (photoPath) {
            doc.image(photoPath, pX + 2, infoY + 2, { fit: [photoSize - 4, photoSize - 4], align: 'center', valign: 'center' });
        }

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
        doc.text('Student Name:', 50, infoY);
        doc.font('Helvetica').text(student.FullName, 160, infoY);

        doc.font('Helvetica-Bold').text('Reg. Number:', 320, infoY);
        doc.font('Helvetica').text(student.RegistrationNumber || 'N/A', 420, infoY);

        doc.font('Helvetica-Bold').text('Grade:', 50, infoY + 18);
        doc.font('Helvetica').text(`Grade ${student.GradeNumber}`, 160, infoY + 18);

        doc.font('Helvetica-Bold').text('Section:', 320, infoY + 18);
        doc.font('Helvetica').text(student.SectionName, 420, infoY + 18);

        doc.font('Helvetica-Bold').text('Gender:', 50, infoY + 36);
        doc.font('Helvetica').text(student.StudentGender || 'N/A', 160, infoY + 36);

        doc.y = infoY + 65;
        doc.moveDown(0.5);

        // Separator
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#ddd');
        doc.moveDown(0.8);

        // --- MARKS TABLE ---
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e')
            .text('ASSESSMENT BREAKDOWN', 50);
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        const colWidths = [130, 55, 55, 55, 55, 55, 55, 45];
        const colHeaders = ['Course', 'Quiz', 'Mid', 'Final', 'Assign.', 'Part.', 'Total', 'Grade'];
        const colX = [50];
        for (let i = 1; i < colWidths.length; i++) {
            colX.push(colX[i - 1] + colWidths[i - 1]);
        }

        // Header background
        doc.rect(50, tableTop - 2, pageWidth, 18).fill('#1a1a2e');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
        colHeaders.forEach((h, i) => {
            doc.text(h, colX[i] + 4, tableTop + 3, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'center' });
        });

        let rowY = tableTop + 20;
        doc.fillColor('#333');

        const getLetterGrade = (score: number): string => {
            if (score >= 90) return 'A+';
            if (score >= 85) return 'A';
            if (score >= 80) return 'A-';
            if (score >= 75) return 'B+';
            if (score >= 70) return 'B';
            if (score >= 65) return 'B-';
            if (score >= 60) return 'C+';
            if (score >= 55) return 'C';
            if (score >= 50) return 'D';
            return 'F';
        };

        courses.forEach((course: any, idx: number) => {
            // Alternate row background
            if (idx % 2 === 0) {
                doc.rect(50, rowY - 2, pageWidth, 16).fill('#f8f9fa');
            }

            doc.font('Helvetica').fontSize(7.5).fillColor('#333');
            doc.text(course.name, colX[0] + 4, rowY + 2, { width: colWidths[0] - 8 });

            const types = ['Quiz', 'Mid', 'Final', 'Assignment', 'Participation'];
            types.forEach((type, tIdx) => {
                const a = course.assessments[type];
                const displayVal = a && a.marks !== null ? `${a.marks}` : '-';
                doc.text(displayVal, colX[tIdx + 1] + 4, rowY + 2, { width: colWidths[tIdx + 1] - 8, align: 'center' });
            });

            // Total (weighted)
            doc.font('Helvetica-Bold')
                .text(`${course.courseTotal.toFixed(1)}%`, colX[6] + 4, rowY + 2, { width: colWidths[6] - 8, align: 'center' });

            // Grade letter
            const grade = getLetterGrade(course.courseTotal);
            doc.text(grade, colX[7] + 4, rowY + 2, { width: colWidths[7] - 8, align: 'center' });

            rowY += 18;
        });

        // Table bottom border
        doc.moveTo(50, rowY).lineTo(50 + pageWidth, rowY).stroke('#ddd');
        doc.y = rowY + 15;

        // --- SUMMARY ---
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#ddd');
        doc.moveDown(0.6);

        const summaryY = doc.y;

        // Left column: Average
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e');
        doc.text('SEMESTER AVERAGE', 50, summaryY);
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#2563eb');
        doc.text(`${semesterAverage.toFixed(1)}%`, 50, summaryY + 16);
        doc.fontSize(8).font('Helvetica').fillColor('#666');
        doc.text(`Grade: ${getLetterGrade(semesterAverage)}`, 50, summaryY + 42);

        // Right column: Rankings
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e');
        doc.text('RANKINGS', 300, summaryY);

        doc.fontSize(8).font('Helvetica').fillColor('#444');
        const classRank = semesterResult.ClassRank || 'N/A';
        const gradeRank = semesterResult.GradeRank || 'N/A';
        const schoolRank = semesterResult.SchoolRank || 'N/A';

        doc.text(`Class Rank:      #${classRank}`, 300, summaryY + 18);
        doc.text(`Grade Rank:      #${gradeRank}`, 300, summaryY + 32);
        doc.text(`School Rank:     #${schoolRank}`, 300, summaryY + 46);

        doc.y = summaryY + 70;
        doc.moveDown(2);

        // --- OFFICIAL FOOTER (NEW FORMAT) ---
        doc.moveDown(2);
        const footerY = doc.y;

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
        doc.text('IMPORTANT:-', 50, footerY);
        doc.fontSize(9).font('Helvetica');

        // 1. Prepared by / Checked by
        doc.text('1  This Transcript is Prepared by __________________ checked by __________________ date __________', 50, footerY + 18);

        // 2. Academic Record / Completed Grade
        const completionText = `2  The student's academic record shows he/she has completed Grade ${student.GradeNumber}`;
        doc.text(completionText, 50, footerY + 36);
        doc.moveTo(doc.widthOfString(completionText) + 55, footerY + 45).lineTo(50 + pageWidth, footerY + 45).stroke('#000');

        // 3. Validity notice
        doc.text('3  This Transcript is valid only when it has no alternation, Erasures & are the school seal on the', 50, footerY + 54);
        doc.text('Student Photo', 63, footerY + 66);

        // Director Section
        const directorY = footerY + 90;
        doc.fontSize(10).font('Helvetica-Bold').text('DIRECTOR\'S NAME AND SIGNATURE', 100, directorY);
        doc.moveTo(330, directorY + 10).lineTo(500, directorY + 10).stroke('#000');
        doc.fontSize(8).font('Helvetica').text('Director', 400, directorY + 15);

        // Date at bottom
        doc.fontSize(10).font('Helvetica-Bold').text(`Date: ________________________`, 50, directorY + 40);

        // Signature/Seal area placeholder (Right side)
        doc.circle(520, directorY + 10, 35).lineWidth(1).stroke('#eee');
        doc.fontSize(6).fillColor('#ccc').text('OFFICIAL SEAL', 495, directorY + 8, { width: 50, align: 'center' });

        doc.end();
    } catch (err) {
        console.error('generateTranscript error:', err);
        res.status(500).json({ message: 'Error generating transcript' });
    }
};

// =============================================
// GENERATE FULL YEAR TRANSCRIPT
// =============================================

export const generateFullYearTranscript = async (req: Request, res: Response) => {
    const { studentId, academicYearId } = req.query;
    const user = (req as any).user;

    try {
        const pool = await poolPromise;

        // 1. Get student info
        const studentRes = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('ayId', sql.Int, academicYearId)
            .query(`
                SELECT u.UserId, u.FullName, u.RegistrationNumber,
                    se.GradeId, se.SectionId, se.AcademicYearId, se.SchoolId,
                    g.GradeNumber, sec.Name as SectionName,
                    ay.Name as AcademicYearName,
                    sch.Name as SchoolName, sch.Address as SchoolAddress, sch.Code as SchoolCode, sch.Logo as SchoolLogo,
                    sch.Email as SchoolEmail, sch.Phone as SchoolPhone, sch.RegistrationNumber as SchoolRegNo,
                    u.ProfileImage as StudentPhoto, u.Gender as StudentGender,
                    fyr.FinalAverage, fyr.ClassRank, fyr.GradeRank, fyr.SchoolRank
                FROM Users u
                LEFT JOIN StudentEnrollments se ON se.StudentId = u.UserId AND se.AcademicYearId = @ayId
                LEFT JOIN Grades g ON se.GradeId = g.Id
                LEFT JOIN Sections sec ON se.SectionId = sec.Id
                LEFT JOIN AcademicYears ay ON se.AcademicYearId = ay.Id
                LEFT JOIN Schools sch ON se.SchoolId = sch.Id
                LEFT JOIN FinalYearResult fyr ON fyr.StudentId = u.UserId AND fyr.AcademicYearId = @ayId
                WHERE u.UserId = @sid
            `);

        if (studentRes.recordset.length === 0) {
            console.log(`404: Student enrollment for year ${academicYearId} not found for student ${studentId}`);
            return res.status(404).json({ message: `Student not found for this academic year (${academicYearId})` });
        }

        const student = studentRes.recordset[0];

        // 1b. Get global settings (fallback)
        let globalSettings: any = {};
        try {
            const settingsRes = await pool.request().query("SELECT SettingKey, SettingValue FROM SystemSettings WHERE EntityType IS NULL");
            settingsRes.recordset.forEach((s: any) => globalSettings[s.SettingKey] = s.SettingValue);
        } catch (e) { console.log("SystemSettings table not ready yet"); }

        const finalSchoolLogo = student.SchoolLogo || globalSettings['SchoolLogo'];
        const finalSchoolName = student.SchoolName || globalSettings['SchoolName'] || 'Academic Institution';
        const finalSchoolAddress = student.SchoolAddress || globalSettings['SchoolAddress'] || '';
        const finalSchoolEmail = student.SchoolEmail || globalSettings['SchoolEmail'] || globalSettings['SupportEmail'] || 'N/A';
        const finalSchoolPhone = student.SchoolPhone || globalSettings['SchoolPhone'] || 'N/A';

        const getSafePath = (p: string | null) => {
            if (!p || p === '') return null;
            const cleanPath = p.replace(/\\/g, '/').replace(/^\/+/, '');

            const candidates = [
                path.join(process.cwd(), cleanPath),
                path.join(process.cwd(), 'backend', cleanPath),
                path.resolve(cleanPath)
            ];

            for (const cand of candidates) {
                if (fs.existsSync(cand)) return cand;
            }
            return null;
        };

        // 2. Get semesters
        const semRes = await pool.request()
            .input('ayId', sql.Int, academicYearId)
            .query(`SELECT * FROM Semesters WHERE AcademicYearId = @ayId ORDER BY StartDate`);
        const semesters = semRes.recordset;

        // 3. Get all semester results (averages and ranks)
        const semResultsRes = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('ayId', sql.Int, academicYearId)
            .query(`
                SELECT sr.*, s.Name as SemesterName 
                FROM SemesterResults sr
                JOIN Semesters s ON sr.SemesterId = s.Id
                WHERE sr.StudentId = @sid AND sr.AcademicYearId = @ayId
                ORDER BY s.StartDate
            `);
        const semesterResultsMap = new Map(semResultsRes.recordset.map(sr => [sr.SemesterId, sr]));

        // 4. Get ALL assessments for the year to build the course breakdowns
        const coursesRes = await pool.request()
            .input('sid', sql.Int, studentId)
            .input('ayId', sql.Int, academicYearId)
            .input('gid', sql.Int, student.GradeId)
            .query(`
                SELECT 
                    a.SemesterId, a.CourseId, c.CourseName, c.CourseCode,
                    a.Type, a.Title, a.TotalMarks, a.WeightPercentage,
                    sas.MarksObtained, sas.Status as ScoreStatus
                FROM Assessments a
                JOIN Courses c ON a.CourseId = c.CourseId
                LEFT JOIN StudentAssessmentScores sas ON sas.AssessmentId = a.Id AND sas.StudentId = @sid
                WHERE a.AcademicYearId = @ayId AND a.GradeId = @gid
                ORDER BY a.SemesterId, c.CourseName, a.Type
            `);

        // Group into { [semesterId]: { [courseId]: CourseBreakdown } }
        const dataBySemester: Record<number, Record<number, any>> = {};
        for (const row of coursesRes.recordset) {
            const sId = row.SemesterId;
            const cId = row.CourseId;
            if (!dataBySemester[sId]) dataBySemester[sId] = {};
            if (!dataBySemester[sId][cId]) {
                dataBySemester[sId][cId] = {
                    name: row.CourseName,
                    code: row.CourseCode,
                    assessments: { Quiz: null, Mid: null, Final: null, Assignment: null, Participation: null },
                    totalWeighted: 0,
                    completedWeight: 0
                };
            }
            const courseData = dataBySemester[sId][cId];
            const marks = row.ScoreStatus === 'Graded' && row.MarksObtained !== null ? row.MarksObtained : null;
            courseData.assessments[row.Type] = { marks, total: row.TotalMarks, weight: row.WeightPercentage };
            if (marks !== null && row.TotalMarks > 0) {
                courseData.totalWeighted += (marks / row.TotalMarks) * row.WeightPercentage;
                courseData.completedWeight += row.WeightPercentage;
            }
        }

        // Calculate course totals per semester
        const processedBySemester: Record<number, any[]> = {};
        for (const sId of Object.keys(dataBySemester)) {
            processedBySemester[Number(sId)] = Object.values(dataBySemester[Number(sId)]).map((c: any) => ({
                ...c,
                courseTotal: c.completedWeight > 0 ? Math.round((c.totalWeighted / c.completedWeight) * 100 * 100) / 100 : 0
            }));
        }

        // Helper functions
        const getLetterGrade = (score: number | null): string => {
            if (score === null) return '—';
            if (score >= 90) return 'A+';
            if (score >= 85) return 'A';
            if (score >= 80) return 'A-';
            if (score >= 75) return 'B+';
            if (score >= 70) return 'B';
            if (score >= 65) return 'B-';
            if (score >= 60) return 'C+';
            if (score >= 55) return 'C';
            if (score >= 50) return 'D';
            return 'F';
        };

        const checkPageBreak = (doc: PDFKit.PDFDocument, requiredSpace: number) => {
            if (doc.y + requiredSpace > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                return true;
            }
            return false;
        };

        // 5. Build PDF
        const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="FullYear_Transcript_${student.RegistrationNumber || student.UserId}.pdf"`);
        doc.pipe(res);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // --- HEADER ---
        const logoPath = getSafePath(finalSchoolLogo);
        if (logoPath) {
            doc.image(logoPath, 50, 40, { width: 55 });
            doc.fontSize(18).font('Helvetica-Bold')
                .text(finalSchoolName, 115, 45);
            doc.fontSize(8).font('Helvetica')
                .text(`${finalSchoolAddress} | Tel: ${finalSchoolPhone}`, 115, 63);

            let bottomText = `Email: ${finalSchoolEmail}`;
            if (student.SchoolRegNo && student.SchoolRegNo !== 'N/A') {
                bottomText += ` | Sch. Reg: ${student.SchoolRegNo}`;
            }
            doc.fontSize(7).fillColor('#666')
                .text(bottomText, 115, 75);
            doc.y = 105;
        } else {
            doc.fontSize(18).font('Helvetica-Bold')
                .text(finalSchoolName, { align: 'center' });
            doc.fontSize(9).font('Helvetica')
                .text(finalSchoolAddress, { align: 'center' });
            doc.moveDown(0.3);
        }
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#333');
        doc.moveDown(0.5);

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
            .text('FULL ACADEMIC YEAR TRANSCRIPT', { align: 'center' });
        doc.fontSize(10).font('Helvetica').fillColor('#444')
            .text(student.AcademicYearName, { align: 'center' });
        doc.moveDown(1);

        // --- STUDENT INFO ---
        const infoY = doc.y;

        // Student Photo with Square Border
        const photoPath = getSafePath(student.StudentPhoto);
        const photoSize = 50;
        const pX = doc.page.width - 50 - photoSize;
        doc.rect(pX, infoY, photoSize, photoSize).lineWidth(0.5).stroke('#bbb');
        if (photoPath) {
            doc.image(photoPath, pX + 2, infoY + 2, { fit: [photoSize - 4, photoSize - 4], align: 'center', valign: 'center' });
        }

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
        doc.text('Student:', 50, infoY); doc.font('Helvetica').text(student.FullName, 100, infoY);
        doc.font('Helvetica-Bold').text('Reg #:', 230, infoY); doc.font('Helvetica').text(student.RegistrationNumber || 'N/A', 270, infoY);
        doc.font('Helvetica-Bold').text('Gender:', 380, infoY); doc.font('Helvetica').text(student.StudentGender || 'N/A', 420, infoY);
        doc.font('Helvetica-Bold').text('Grade:', 50, infoY + 15); doc.font('Helvetica').text(`Grade ${student.GradeNumber} - ${student.SectionName}`, 100, infoY + 15);

        doc.y = infoY + 65;
        doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#ddd');
        doc.moveDown(1.5);

        // --- DATA PREPARATION ---
        const yearlyCourseData: Record<string, { [semId: number]: number }> = {};
        const allCourseNames = new Set<string>();

        // Pre-calculate course totals for all semesters
        for (const semester of semesters) {
            const courses = processedBySemester[semester.Id] || [];
            courses.forEach((course: any) => {
                allCourseNames.add(course.name);
                if (!yearlyCourseData[course.name]) yearlyCourseData[course.name] = {};
                yearlyCourseData[course.name][semester.Id] = course.courseTotal;
            });
        }

        // --- FINAL YEAR COMPACT GRID TABLE ---
        checkPageBreak(doc, 200);
        doc.moveDown(2);

        const cCourseNames = Array.from(allCourseNames).sort();
        if (cCourseNames.length > 0) {
            // Table Dimensions
            const noWidth = 35;
            const subjectWidth = 165;
            const semWidth = 60;
            const aveWidth = 60;
            const rowHeight = 22;

            const tableWidth = noWidth + subjectWidth + (semesters.length * semWidth) + aveWidth;
            const startX = 50 + (pageWidth - tableWidth) / 2;
            let currentY = doc.y;

            const colX = [startX, startX + noWidth, startX + noWidth + subjectWidth];
            for (let i = 0; i < semesters.length; i++) {
                colX.push(colX[colX.length - 1] + semWidth);
            }
            colX.push(colX[colX.length - 1] + aveWidth);

            // --- HEADER ROWS ---
            doc.lineWidth(0.5).strokeColor('#000');

            // Outer header box
            doc.rect(startX, currentY, tableWidth, rowHeight * 2).stroke();

            // Vertical headers
            doc.lineCap('butt').moveTo(colX[1], currentY).lineTo(colX[1], currentY + rowHeight * 2).stroke();
            doc.moveTo(colX[2], currentY).lineTo(colX[2], currentY + rowHeight * 2).stroke();

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
            doc.text('No', colX[0], currentY + rowHeight - 4, { width: noWidth, align: 'center' });
            doc.text('subject', colX[1], currentY + rowHeight - 4, { width: subjectWidth, align: 'center' });

            // Right side header (Grade info + Semesters)
            const infoSpanWidth = (semesters.length * semWidth) + aveWidth;
            doc.moveTo(colX[2], currentY + rowHeight).lineTo(colX[colX.length - 1], currentY + rowHeight).stroke();

            const infoText = `Grade ${student.GradeNumber} sec ${student.SectionName} Year ${student.AcademicYearName}`;
            doc.fontSize(7).text(infoText, colX[2], currentY + 4, { width: infoSpanWidth, align: 'left', indent: 5 });
            doc.fontSize(8).text('Semester', colX[2], currentY + 13, { width: infoSpanWidth, align: 'left', indent: 5 });

            // Semester labels and AVE
            semesters.forEach((sem, i) => {
                const sX = colX[2 + i];
                if (i > 0) doc.moveTo(sX, currentY + rowHeight).lineTo(sX, currentY + rowHeight * 2).stroke();
                const roman = i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : (i + 1).toString();
                doc.fontSize(9).text(roman, sX, currentY + rowHeight + 6, { width: semWidth, align: 'center' });
            });
            // AVE column line
            const aveLineX = colX[colX.length - 2];
            doc.moveTo(aveLineX, currentY + rowHeight).lineTo(aveLineX, currentY + rowHeight * 2).stroke();
            doc.fontSize(9).text('AVE', aveLineX, currentY + rowHeight + 6, { width: aveWidth, align: 'center' });

            currentY += rowHeight * 2;

            // --- DATA ROWS ---
            let totalS1 = 0, totalS2 = 0, totalYear = 0;
            let countS1 = 0, countS2 = 0, countYear = 0;

            cCourseNames.forEach((cName, idx) => {
                checkPageBreak(doc, rowHeight);
                if (doc.y < currentY) currentY = doc.y;

                // Row borders (Bottom and Sides only to avoid duplication with previous row's bottom)
                doc.moveTo(startX, currentY).lineTo(startX, currentY + rowHeight).stroke(); // Left
                doc.moveTo(startX + tableWidth, currentY).lineTo(startX + tableWidth, currentY + rowHeight).stroke(); // Right
                doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).stroke(); // Bottom

                // Vertical grid lines
                for (let i = 1; i < colX.length - 1; i++) {
                    doc.moveTo(colX[i], currentY).lineTo(colX[i], currentY + rowHeight).stroke();
                }

                doc.font('Helvetica').fontSize(9).fillColor('#333');
                doc.text((idx + 1).toString(), colX[0], currentY + 6, { width: noWidth, align: 'center' });
                doc.text(cName, colX[1] + 5, currentY + 6, { width: subjectWidth - 10, align: 'left' });

                let rowSum = 0;
                let rowCount = 0;
                const valText = (v: any) => {
                    if (v === undefined || v === null || v === '-') return '-';
                    if (typeof v === 'string') return v;
                    return Number.isInteger(v) ? v.toString() : (Math.round(v * 100) / 100).toString();
                };

                semesters.forEach((sem, si) => {
                    const sX = colX[2 + si];
                    const val = yearlyCourseData[cName][sem.Id];
                    doc.text(valText(val), sX, currentY + 6, { width: semWidth, align: 'center' });
                    if (val !== undefined && val !== null) {
                        if (si === 0) { totalS1 += val; countS1++; }
                        if (si === 1) { totalS2 += val; countS2++; }
                        rowSum += val;
                        rowCount++;
                    }
                });

                const rowAve = rowCount > 0 ? rowSum / rowCount : 0;
                totalYear += rowAve;
                if (rowCount > 0) countYear++;

                const aveX = colX[colX.length - 2];
                doc.text(rowCount > 0 ? valText(rowAve) : '-', aveX, currentY + 6, { width: aveWidth, align: 'center' });

                currentY += rowHeight;
            });

            // --- FOOTER ROWS (Total, Average, Rank) ---
            const footerRows = [
                { label: 'Total', data: semesters.map((_, i) => i === 0 ? totalS1 : i === 1 ? totalS2 : 0), final: totalYear },
                {
                    label: 'Average', data: semesters.map((sem, i) => {
                        const sr = semesterResultsMap.get(sem.Id);
                        return sr?.Average || (i === 0 && countS1 > 0 ? totalS1 / countS1 : i === 1 && countS2 > 0 ? totalS2 / countS2 : 0);
                    }), final: student.FinalAverage || (countYear > 0 ? totalYear / countYear : 0)
                },
                {
                    label: 'Rank', data: semesters.map(sem => {
                        const sr = semesterResultsMap.get(sem.Id);
                        return sr?.ClassRank || '—';
                    }), final: student.ClassRank || '—'
                }
            ];

            footerRows.forEach(row => {
                checkPageBreak(doc, rowHeight);
                if (doc.y < currentY) currentY = doc.y;

                // Footer Row borders (Bottom and Sides only)
                doc.moveTo(startX, currentY).lineTo(startX, currentY + rowHeight).stroke(); // Left
                doc.moveTo(startX + tableWidth, currentY).lineTo(startX + tableWidth, currentY + rowHeight).stroke(); // Right
                doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).stroke(); // Bottom

                // Vertical line after label
                doc.moveTo(colX[2], currentY).lineTo(colX[2], currentY + rowHeight).stroke();
                // Intermediate vertical lines
                for (let i = 3; i < colX.length - 1; i++) {
                    doc.moveTo(colX[i], currentY).lineTo(colX[i], currentY + rowHeight).stroke();
                }

                doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
                doc.text(row.label, startX + 5, currentY + 6, { width: colX[2] - colX[0] - 10, align: 'left' });

                const valText = (v: any, isDecimal: boolean) => {
                    if (v === undefined || v === null || v === '—') return '—';
                    if (typeof v === 'string') return v;
                    if (row.label === 'Rank') return Math.round(v).toString();
                    return Number.isInteger(v) ? v.toString() : (Math.round(v * 100) / 100).toString();
                };

                row.data.forEach((val, si) => {
                    const sX = colX[2 + si];
                    doc.text(valText(val, row.label === 'Average'), sX, currentY + 6, { width: semWidth, align: 'center' });
                });

                const finalX = colX[colX.length - 2];
                doc.text(valText(row.final, row.label === 'Average'), finalX, currentY + 6, { width: aveWidth, align: 'center' });

                currentY += rowHeight;
            });

            doc.y = currentY + 20;
        } else {
            doc.fontSize(9).font('Helvetica-Oblique').fillColor('#888').text('No course data available to calculate full-year averages.', { align: 'center' });
        }

        doc.moveDown(2);

        // --- OFFICIAL FOOTER (NEW FORMAT) ---
        doc.moveDown(2);
        const footerY = doc.y;

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
        doc.text('IMPORTANT:-', 50, footerY);
        doc.fontSize(9).font('Helvetica');

        // 1. Prepared by / Checked by
        doc.text('1  This Transcript is Prepared by __________________ checked by __________________ date __________', 50, footerY + 18);

        // 2. Academic Record / Completed Grade
        const completionText = `2  The student's academic record shows he/she has completed Grade ${student.GradeNumber}`;
        doc.text(completionText, 50, footerY + 36);
        doc.moveTo(doc.widthOfString(completionText) + 55, footerY + 45).lineTo(50 + pageWidth, footerY + 45).stroke('#000');

        // 3. Validity notice
        doc.text('3  This Transcript is valid only when it has no alternation, Erasures & are the school seal on the', 50, footerY + 54);
        doc.text('Student Photo', 63, footerY + 66);

        // Director Section
        const directorY = footerY + 90;
        doc.fontSize(10).font('Helvetica-Bold').text('DIRECTOR\'S NAME AND SIGNATURE', 100, directorY);
        doc.moveTo(330, directorY + 10).lineTo(500, directorY + 10).stroke('#000');
        doc.fontSize(8).font('Helvetica').text('Director', 400, directorY + 15);

        // Date at bottom
        doc.fontSize(10).font('Helvetica-Bold').text(`Date: ________________________`, 50, directorY + 40);

        // Signature/Seal area placeholder (Right side)
        doc.circle(520, directorY + 10, 35).lineWidth(1).stroke('#eee');
        doc.fontSize(6).fillColor('#ccc').text('OFFICIAL SEAL', 495, directorY + 8, { width: 50, align: 'center' });

        doc.end();
    } catch (err) {
        console.error('generateFullYearTranscript error:', err);
        res.status(500).json({ message: 'Error generating full year transcript' });
    }
};
