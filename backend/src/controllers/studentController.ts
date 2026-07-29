import { Request, Response } from 'express';
import { sql, poolPromise } from '../config/db.js';
import { ensureSchema } from './examController.js';

/**
 * Shuffles an array in place using Durstenfeld shuffle (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


export const getAvailableExams = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        const request = pool.request();
        request.input('studentId', sql.Int, studentId);

        let query = `
            SELECT e.ExamId, e.Title, e.Description, e.CourseId, e.ClassId, e.TeacherId,
            e.DurationMinutes, e.TotalMarks, e.StartTime, e.EndTime, e.IsPublished,
            e.IsMakeup, e.ParentExamId, e.ExamType, e.SemesterId, e.CreatedAt,
            c.CourseName, cl.GradeName, cl.Section, s.Name as SemesterName,
            ISNULL(sea.Status, 'Assigned') as AssignmentStatus,
            sea.OverrideStartTime,
            sea.OverrideEndTime,
            pe.Title as ParentExamTitle,
            (SELECT COUNT(*) FROM StudentExams se WHERE se.ExamId = e.ExamId AND se.StudentId = @studentId AND se.Status IN ('Submitted', 'Graded')) as IsTaken,
            (SELECT TOP 1 se2.AttemptId FROM StudentExams se2 WHERE se2.ExamId = e.ExamId AND se2.StudentId = @studentId AND se2.Status = 'Started') as InProgressAttemptId
            FROM Exams e
            LEFT JOIN Courses c ON e.CourseId = c.CourseId
            LEFT JOIN Classes cl ON e.ClassId = cl.ClassId
            LEFT JOIN Semesters s ON e.SemesterId = s.Id
            LEFT JOIN StudentExamAssignment sea ON e.ExamId = sea.ExamId AND sea.StudentId = @studentId
            LEFT JOIN Exams pe ON e.ParentExamId = pe.ExamId
            WHERE (
                -- Regular exams: show to class if published
                (e.IsPublished = 1 AND e.IsMakeup = 0 AND (
                    sea.StudentId IS NOT NULL 
                    OR (e.ClassId IS NOT NULL AND EXISTS (SELECT 1 FROM StudentClasses sc WHERE sc.ClassId = e.ClassId AND sc.StudentId = @studentId))
                ))
                -- Makeup exams: ONLY show to specifically assigned students
                OR (e.IsMakeup = 1 AND sea.StudentId IS NOT NULL)
            )
            AND (sea.Status IS NULL OR sea.Status NOT IN ('Completed', 'Submitted', 'Graded'))
            ORDER BY e.StartTime ASC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getAvailableExams error:', err);
        res.status(500).json({ message: 'Error fetching exams' });
    }
};

export const startExam = async (req: Request, res: Response) => {
    const { studentId, examId } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    try {
        const pool = await poolPromise;

        // Check Assignment first
        const assignmentRes = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('examId', sql.Int, examId)
            .query("SELECT Status FROM StudentExamAssignment WHERE StudentId = @studentId AND ExamId = @examId");

        if (assignmentRes.recordset.length === 0) {
            return res.status(403).json({ message: 'You are not assigned to this exam.' });
        }

        const assignmentStatus = assignmentRes.recordset[0].Status;
        if (assignmentStatus === 'Missed') {
            return res.status(403).json({ message: 'You have missed this exam and cannot start it now.' });
        }
        if (assignmentStatus === 'Completed') {
            return res.status(400).json({ message: 'You have already completed this exam.' });
        }

        // Check if student already has an attempt for this exam
        const existing = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('examId', sql.Int, examId)
            .query(`
                SELECT AttemptId, Status, StartTime, IsLocked 
                FROM StudentExams 
                WHERE StudentId = @studentId AND ExamId = @examId
                ORDER BY AttemptId DESC
            `);

        if (existing.recordset.length > 0) {
            const latest = existing.recordset[0];

            if (latest.IsLocked) {
                return res.status(403).json({ message: 'Your exam attempt has been locked due to suspicious activity. Please contact the administrator.' });
            }

            if (latest.Status === 'Submitted' && assignmentStatus !== 'Assigned') {
                return res.status(400).json({ message: 'You have already submitted this exam.' });
            }

            // Already started but not submitted — let them resume
            if (latest.Status === 'Started') {
                const elapsedResult = await pool.request()
                    .input('attemptId', sql.Int, latest.AttemptId)
                    .query("SELECT DATEDIFF(SECOND, StartTime, GETDATE()) as ElapsedSeconds FROM StudentExams WHERE AttemptId = @attemptId");

                return res.status(200).json({
                    attemptId: latest.AttemptId,
                    resumed: true,
                    elapsedSeconds: elapsedResult.recordset[0].ElapsedSeconds
                });
            }
        }

        // No existing attempt — create new one with randomization
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const resAttempt = await transaction.request()
                .input('studentId', sql.Int, studentId)
                .input('examId', sql.Int, examId)
                .input('ip', sql.NVarChar, String(ipAddress))
                .query(`
                    INSERT INTO StudentExams (StudentId, ExamId, StartTime, Status, IPAddress) 
                    OUTPUT INSERTED.AttemptId 
                    VALUES (@studentId, @examId, GETDATE(), 'Started', @ip)
                `);

            const attemptId = resAttempt.recordset[0].AttemptId;

            // Update Assignment Status
            await transaction.request()
                .input('studentId', sql.Int, studentId)
                .input('examId', sql.Int, examId)
                .query("UPDATE StudentExamAssignment SET Status = 'Started' WHERE StudentId = @studentId AND ExamId = @examId");

            // 1. Fetch questions
            const qRes = await transaction.request()
                .input('examId', sql.Int, examId)
                .query("SELECT QuestionId FROM Questions WHERE ExamId = @examId");

            let questionIds = qRes.recordset.map(q => q.QuestionId);
            questionIds = shuffleArray(questionIds);

            // 2. Save questions order
            for (let i = 0; i < questionIds.length; i++) {
                const qId = questionIds[i];
                await transaction.request()
                    .input('attemptId', sql.Int, attemptId)
                    .input('qId', sql.Int, qId)
                    .input('order', sql.Int, i + 1)
                    .query("INSERT INTO StudentQuestionOrder (AttemptId, QuestionId, SortOrder) VALUES (@attemptId, @qId, @order)");

                // 3. Fetch and shuffle options for this question
                const oRes = await transaction.request()
                    .input('qId', sql.Int, qId)
                    .query("SELECT OptionId FROM Options WHERE QuestionId = @qId");

                let optionIds = oRes.recordset.map(o => o.OptionId);
                optionIds = shuffleArray(optionIds);

                // 4. Save options order
                for (let j = 0; j < optionIds.length; j++) {
                    await transaction.request()
                        .input('attemptId', sql.Int, attemptId)
                        .input('qId', sql.Int, qId)
                        .input('oId', sql.Int, optionIds[j])
                        .input('order', sql.Int, j + 1)
                        .query("INSERT INTO StudentOptionOrder (AttemptId, QuestionId, OptionId, SortOrder) VALUES (@attemptId, @qId, @oId, @order)");
                }
            }

            await transaction.commit();
            res.status(201).json({
                attemptId: attemptId,
                elapsedSeconds: 0
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('startExam error:', err);
        res.status(500).json({ message: 'Error starting exam' });
    }
};


export const saveProgress = async (req: Request, res: Response) => {
    const { attemptId, questionId, selectedOptionId, matchingAnswer, essayAnswer } = req.body;
    try {
        const pool = await poolPromise;

        // Check if locked
        const check = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query('SELECT IsLocked FROM StudentExams WHERE AttemptId = @attemptId');

        if (check.recordset.length > 0 && check.recordset[0].IsLocked) {
            return res.status(403).json({ message: 'Attempt is locked.' });
        }

        // Upsert Answer
        await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .input('questionId', sql.Int, questionId)
            .input('selectedOptionId', sql.Int, selectedOptionId || null)
            .input('matchingAnswer', sql.NVarChar, matchingAnswer || null)
            .input('essayAnswer', sql.NVarChar, essayAnswer || null)
            .query(`
                IF EXISTS (SELECT 1 FROM StudentAnswers WHERE AttemptId = @attemptId AND QuestionId = @questionId)
                BEGIN
                    UPDATE StudentAnswers 
                    SET SelectedOptionId = @selectedOptionId,
                        MatchingAnswer = @matchingAnswer,
                        EssayAnswer = @essayAnswer
                    WHERE AttemptId = @attemptId AND QuestionId = @questionId
                END
                ELSE
                BEGIN
                    INSERT INTO StudentAnswers (AttemptId, QuestionId, SelectedOptionId, MatchingAnswer, EssayAnswer)
                    VALUES (@attemptId, @questionId, @selectedOptionId, @matchingAnswer, @essayAnswer)
                END
            `);

        res.json({ success: true });
    } catch (err) {
        console.error('saveProgress error:', err);
        res.status(500).json({ message: 'Error saving progress' });
    }
};

export const submitAnswers = async (req: Request, res: Response) => {
    const { attemptId, answers } = req.body;
    try {
        const pool = await poolPromise;

        // Fetch ExamId and check if locked
        const examCheck = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query('SELECT ExamId, IsLocked, (SELECT TotalMarks FROM Exams WHERE ExamId = se.ExamId) as TotalMarks FROM StudentExams se WHERE AttemptId = @attemptId');

        if (examCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'Exam attempt not found' });
        }
        const { ExamId: examId, IsLocked: isLocked, TotalMarks: totalMarks } = examCheck.recordset[0];

        if (isLocked) {
            return res.status(403).json({ message: 'This attempt is locked and cannot be submitted. Contact administrator.' });
        }

        console.log(`Grading attempt ${attemptId} for Exam ${examId} with ${answers.length} answers...`);
        for (const ans of answers) {
            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('questionId', sql.Int, ans.questionId)
                .input('selectedOptionId', sql.Int, ans.selectedOptionId || null)
                .input('matchingAnswer', sql.NVarChar, ans.matchingAnswer || null)
                .input('essayAnswer', sql.NVarChar, ans.essayAnswer || null)
                .query(`
                    IF EXISTS (SELECT 1 FROM StudentAnswers WHERE AttemptId = @attemptId AND QuestionId = @questionId)
                    BEGIN
                        UPDATE StudentAnswers 
                        SET SelectedOptionId = @selectedOptionId,
                            MatchingAnswer = @matchingAnswer,
                            EssayAnswer = @essayAnswer
                        WHERE AttemptId = @attemptId AND QuestionId = @questionId
                    END
                    ELSE
                    BEGIN
                        INSERT INTO StudentAnswers (AttemptId, QuestionId, SelectedOptionId, MatchingAnswer, EssayAnswer)
                        VALUES (@attemptId, @questionId, @selectedOptionId, @matchingAnswer, @essayAnswer)
                    END
                `);
        }

        // 5. Smart Grading Logic
        // We calculate both Unit-based and Point-based totals to be resilient 
        // to different teacher setup styles (per-unit points vs total marks).

        let correctUnits = 0;
        let totalUnits = 0;
        let earnedPoints = 0;
        let totalPossiblePoints = 0;

        // Fetch only questions that were assigned to this student attempt (using StudentQuestionOrder)
        const allQuestions = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT q.QuestionId, q.Type, q.Points,
                    sa.SelectedOptionId,
                    sa.MatchingAnswer,
                    (SELECT o.OptionId FROM Options o WHERE o.QuestionId = q.QuestionId AND o.IsCorrect = 1) as CorrectOptionId,
                    (SELECT TOP 1 sa2.SelectedOptionId, sa2.MatchingAnswer, sa2.EssayAnswer, sa2.MarksAwarded, sa2.Feedback
                        FROM StudentAnswers sa2 
                        WHERE sa2.AttemptId = @attemptId AND sa2.QuestionId = q.QuestionId 
                        ORDER BY sa2.AnswerId DESC
                        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER) as StudentAnswer,
                    (SELECT mp.PairId, mp.RightText FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId FOR JSON PATH) as MatchingPairs
                FROM Questions q
                JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                LEFT JOIN StudentAnswers sa ON q.QuestionId = sa.QuestionId AND sa.AttemptId = @attemptId
                WHERE sqo.AttemptId = @attemptId
            `);

        for (const q of allQuestions.recordset) {
            const qPoints = Number(q.Points) || 0;

            if (q.Type === 'MCQ' || q.Type === 'TF') {
                totalUnits += 1;
                totalPossiblePoints += qPoints;
                if (q.SelectedOptionId && q.SelectedOptionId === q.CorrectOptionId) {
                    correctUnits += 1;
                    earnedPoints += qPoints;
                }
            } else if (q.Type === 'Matching') {
                const pairs = JSON.parse(q.MatchingPairs || '[]');
                const pairCount = pairs.length;
                totalUnits += pairCount;
                totalPossiblePoints += qPoints; // Total points for the whole question

                if (q.MatchingAnswer && pairCount > 0) {
                    try {
                        const studentPairs = JSON.parse(q.MatchingAnswer);
                        let qCorrectPairs = 0;
                        for (const p of pairs) {
                            const sAns = String(studentPairs[p.PairId] || studentPairs[String(p.PairId)] || '').trim().toLowerCase();
                            const cAns = String(p.RightText || '').trim().toLowerCase();
                            if (sAns === cAns && sAns !== '') {
                                qCorrectPairs++;
                            }
                        }
                        correctUnits += qCorrectPairs;
                        // Score per pair = Total points / Number of pairs
                        earnedPoints += (qCorrectPairs * (qPoints / pairCount));
                    } catch (e) { }
                }
            } else if (q.Type === 'Essay') {
                totalUnits += 1;
                totalPossiblePoints += qPoints;
                // Essay marks are manual, so initially 0
            }
        }

        // 6. Calculate Final Score
        const examMaxMarks = Number(totalMarks) || totalPossiblePoints || 100;
        let finalScore = 0;

        if (totalPossiblePoints > 0) {
            finalScore = earnedPoints;
        } else if (totalUnits > 0) {
            finalScore = correctUnits;
        }

        finalScore = Math.round(finalScore * 100) / 100;

        // Calculate Percentage
        const percentage = examMaxMarks > 0 ? (finalScore / examMaxMarks) * 100 : 0;

        console.log(`[Grading] Attempt ${attemptId}: ${correctUnits}/${totalUnits} units correct.`);
        console.log(`[Grading] Points: ${earnedPoints}/${totalPossiblePoints}. Scale: ${examMaxMarks}. Final: ${finalScore} (${percentage.toFixed(2)}%)`);

        // Check for Essay questions
        const essayCheck = await pool.request()
            .input('examId', sql.Int, examId)
            .query("SELECT COUNT(*) as count FROM Questions WHERE ExamId = @examId AND Type = 'Essay'");

        const hasEssay = essayCheck.recordset[0].count > 0;
        const status = hasEssay ? 'Submitted' : 'Graded';

        await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .input('score', sql.Decimal(10, 2), finalScore)
            .input('percentage', sql.Decimal(5, 2), percentage)
            .input('correctCount', sql.Int, correctUnits)
            .input('status', sql.NVarChar, status)
            .query(`
                UPDATE StudentExams SET EndTime = GETDATE(), Score = @score, Percentage = @percentage, CorrectCount = @correctCount, Status = @status WHERE AttemptId = @attemptId;
                
                -- Update parent assignment
                UPDATE sea SET sea.Status = 'Completed'
                FROM StudentExamAssignment sea
                JOIN StudentExams se ON sea.ExamId = se.ExamId AND sea.StudentId = se.StudentId
                WHERE se.AttemptId = @attemptId;
            `);

        const finalAttemptData = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT 
                    DATEDIFF(MINUTE, se.StartTime, se.EndTime) as ElapsedMinutes,
                    e.DurationMinutes
                FROM StudentExams se
                JOIN Exams e ON se.ExamId = e.ExamId
                WHERE se.AttemptId = @attemptId
            `);

        const stats = finalAttemptData.recordset[0];

        res.json({
            message: 'Exam submitted and graded',
            score: finalScore,
            correctQuestionsCount: correctUnits,
            elapsedMinutes: stats?.ElapsedMinutes || 0,
            durationMinutes: stats?.DurationMinutes || 0
        });
    } catch (err) {
        console.error('submitAnswers error:', err);
        res.status(500).json({ message: 'Error submitting exam' });
    }
};

export const getStudentAssignments = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    const { ayId, semesterId, gradeId, courseId, section } = req.query;

    try {
        const pool = await poolPromise;
        await ensureSchema(pool);
        const request = pool.request()
            .input('studentId', sql.Int, studentId)
            .input('ayId', sql.Int, ayId || null)
            .input('semId', sql.Int, semesterId || null)
            .input('courseId', sql.Int, courseId || null)
            .input('gradeId', sql.Int, gradeId || null)
            .input('section', sql.NVarChar, section || null);

        let query = `
                    SELECT 
                        a.*, 
                        c.GradeName, c.Section, 
                        co.CourseName,
                        u.FullName as TeacherName,
                        sub.SubmissionId,
                        sub.SubmissionFilePath,
                        sub.SubmissionDate,
                        sub.Score as StudentScore,
                        sub.Feedback,
                        sub.Status as SubmissionStatus
                    FROM Assignments a
                    JOIN StudentClasses sc ON a.ClassId = sc.ClassId
                    LEFT JOIN Classes c ON a.ClassId = c.ClassId
                    LEFT JOIN Courses co ON a.CourseId = co.CourseId
                    LEFT JOIN Users u ON a.TeacherId = u.UserId
                    LEFT JOIN AssignmentSubmissions sub ON a.AssignmentId = sub.AssignmentId AND sub.StudentId = @studentId
                    WHERE sc.StudentId = @studentId
                `;

        if (ayId) query += " AND a.AcademicYearId = @ayId";
        if (semesterId) query += " AND a.SemesterId = @semId";
        if (courseId) query += " AND a.CourseId = @courseId";
        if (gradeId) {
            query += " AND c.GradeName = (SELECT 'Grade ' + CAST(GradeNumber AS NVARCHAR) FROM Grades WHERE Id = @gradeId)";
        }
        if (section) query += " AND c.Section = @section";

        query += " ORDER BY a.Deadline ASC";
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getStudentAssignments error:', err);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
};

export const submitAssignment = async (req: Request, res: Response) => {
    const studentId = (req as any).user?.id;
    const { assignmentId } = req.body;
    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    console.log('--- Submission Debug Start ---');
    console.log('Student ID:', studentId);
    console.log('Assignment ID Raw:', assignmentId);
    console.log('File Path:', filePath);

    if (!filePath) {
        return res.status(400).json({ message: 'Please upload a file' });
    }

    if (!assignmentId) {
        return res.status(400).json({ message: 'Assignment ID is missing' });
    }

    try {
        const pool = await poolPromise;
        const aId = parseInt(assignmentId as string);

        if (isNaN(aId)) {
            console.error('Invalid Assignment ID:', assignmentId);
            return res.status(400).json({ message: 'Invalid Assignment ID' });
        }

        // Check if already submitted
        const check = await pool.request()
            .input('assignmentId', sql.Int, aId)
            .input('studentId', sql.Int, studentId)
            .query('SELECT SubmissionId FROM AssignmentSubmissions WHERE AssignmentId = @assignmentId AND StudentId = @studentId');

        if (check.recordset.length > 0) {
            console.log('Updating existing submission:', check.recordset[0].SubmissionId);
            await pool.request()
                .input('submissionId', sql.Int, check.recordset[0].SubmissionId)
                .input('filePath', sql.NVarChar, filePath)
                .query(`
                    UPDATE AssignmentSubmissions 
                    SET SubmissionFilePath = @filePath, SubmissionDate = GETDATE(), Status = 'Submitted' 
                    WHERE SubmissionId = @submissionId
                `);
            return res.json({ message: 'Assignment resubmitted successfully' });
        }

        console.log('Inserting new submission for Assignment:', aId, 'Student:', studentId);
        await pool.request()
            .input('assignmentId', sql.Int, aId)
            .input('studentId', sql.Int, studentId)
            .input('filePath', sql.NVarChar, filePath)
            .query(`
                INSERT INTO AssignmentSubmissions (AssignmentId, StudentId, SubmissionFilePath, Status)
                VALUES (@assignmentId, @studentId, @filePath, 'Submitted')
            `);

        res.status(201).json({ message: 'Assignment submitted successfully' });
    } catch (err: any) {
        console.error('--- submitAssignment Error Details ---');
        console.error('Message:', err.message);
        console.error('SQL Error Code:', err.code);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: 'Error submitting assignment', detail: err.message });
    }
};

export const getExamQuestionsForStudent = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    const { examId } = req.params;

    try {
        const pool = await poolPromise;

        // 1. Verify student is enrolled/authorized and get attemptId
        const attemptRes = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('examId', sql.Int, examId)
            .query(`
                SELECT AttemptId, Status, IsLocked 
                FROM StudentExams 
                WHERE StudentId = @studentId AND ExamId = @examId AND Status = 'Started'
            `);

        if (attemptRes.recordset.length === 0) {
            return res.status(403).json({ message: 'No active session found. Please start the exam first.' });
        }

        const { AttemptId: attemptId, IsLocked: isLocked } = attemptRes.recordset[0];

        if (isLocked) {
            return res.status(403).json({ message: 'Your exam attempt is locked.' });
        }

        const enrollmentCheck = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('examId', sql.Int, examId)
            .query(`
                SELECT e.ExamId, e.DurationMinutes, e.Title, e.TotalMarks
                FROM Exams e
                JOIN StudentClasses sc ON e.ClassId = sc.ClassId
                WHERE e.ExamId = @examId AND sc.StudentId = @studentId AND e.IsPublished = 1
            `);

        if (enrollmentCheck.recordset.length === 0) {
            return res.status(403).json({ message: 'You are not authorized to take this exam' });
        }

        // Verify assignment status too
        const assignmentRes = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('examId', sql.Int, examId)
            .query("SELECT Status FROM StudentExamAssignment WHERE StudentId = @studentId AND ExamId = @examId");

        if (assignmentRes.recordset.length === 0 || assignmentRes.recordset[0].Status === 'Missed') {
            return res.status(403).json({ message: 'Assignment not found or marked as missed.' });
        }

        const examInfo = enrollmentCheck.recordset[0];

        // 2. Fetch questions and options according to the saved order for this attempt
        const result = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT q.QuestionId, q.Text, q.Type, q.Points,
                    (
                        SELECT o.OptionId, o.Text 
                        FROM Options o 
                        JOIN StudentOptionOrder soo ON o.OptionId = soo.OptionId
                        WHERE o.QuestionId = q.QuestionId AND soo.AttemptId = @attemptId
                        ORDER BY soo.SortOrder
                        FOR JSON PATH
                    ) as Options,
                    (SELECT mp.PairId, mp.LeftText, mp.RightText FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId FOR JSON PATH) as MatchingPairs,
                    (SELECT sa.SelectedOptionId, sa.MatchingAnswer, sa.EssayAnswer 
                     FROM StudentAnswers sa 
                     WHERE sa.AttemptId = @attemptId AND sa.QuestionId = q.QuestionId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) as StudentAnswer
                FROM Questions q
                JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                WHERE sqo.AttemptId = @attemptId
                ORDER BY sqo.SortOrder
            `);

        const questions = result.recordset.map(q => ({
            ...q,
            Options: q.Options ? JSON.parse(q.Options) : [],
            MatchingPairs: q.MatchingPairs ? JSON.parse(q.MatchingPairs) : [],
            StudentAnswer: q.StudentAnswer ? JSON.parse(q.StudentAnswer) : null
        }));

        res.json({
            exam: examInfo,
            questions: questions,
            attemptId: attemptId
        });
    } catch (err) {
        console.error('getExamQuestionsForStudent error:', err);
        res.status(500).json({ message: 'Error fetching exam questions' });
    }
};

export const recordTabSwitch = async (req: Request, res: Response) => {
    const { attemptId } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                UPDATE StudentExams 
                SET TabSwitchCount = TabSwitchCount + 1 
                OUTPUT INSERTED.TabSwitchCount
                WHERE AttemptId = @attemptId
            `);

        const count = result.recordset[0].TabSwitchCount;
        if (count >= 999) {  // 999 is a large number to prevent accidental locking
            await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .query("UPDATE StudentExams SET IsLocked = 1 WHERE AttemptId = @attemptId");
            return res.json({ message: 'Exam locked due to tab switching', locked: true });
        }

        res.json({ message: 'Tab switch recorded', count, locked: false });
    } catch (err) {
        console.error('recordTabSwitch error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const lockExamAttempt = async (req: Request, res: Response) => {
    const { attemptId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query("UPDATE StudentExams SET IsLocked = 1 WHERE AttemptId = @attemptId");
        res.json({ message: 'Exam locked due to suspicious activity' });
    } catch (err) {
        console.error('lockExamAttempt error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


export const getStudentResults = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    const { ayId, semesterId, gradeId, courseId, section } = req.query;

    try {
        const pool = await poolPromise;

        // 1. Get stats (rank/average) based on active/selected period
        let statsAYId = ayId;
        let statsSemId = semesterId;

        if (!statsAYId && !statsSemId) {
            const activeSem = await pool.request().query("SELECT AcademicYearId, Id FROM Semesters WHERE IsActive = 1");
            if (activeSem.recordset.length > 0) {
                statsAYId = activeSem.recordset[0].AcademicYearId;
                statsSemId = activeSem.recordset[0].Id;
            }
        }

        let rankingInfo = { rank: '-', average: 0 };
        const statsReq = pool.request()
            .input('studentId', sql.Int, studentId)
            .input('ayId', sql.Int, statsAYId || null)
            .input('semId', sql.Int, statsSemId || null);

        let statsQuery = `
            SELECT ClassRank, Average 
            FROM SemesterResults 
            WHERE StudentId = @studentId
        `;
        if (statsAYId) statsQuery += " AND AcademicYearId = @ayId";
        if (statsSemId) statsQuery += " AND SemesterId = @semId";
        statsQuery += " ORDER BY CalculatedAt DESC";

        const rankRes = await statsReq.query(statsQuery);
        if (rankRes.recordset.length > 0) {
            rankingInfo = {
                rank: rankRes.recordset[0].ClassRank || '-',
                average: Number(rankRes.recordset[0].Average || 0).toFixed(1) as any
            };
        }

        // 2. Fetch Unified Results (Exams, Manuals, Assignments)
        const request = pool.request()
            .input('studentId', sql.Int, studentId)
            .input('ayId', sql.Int, ayId || null)
            .input('semId', sql.Int, semesterId || null)
            .input('courseId', sql.Int, courseId || null)
            .input('gradeId', sql.Int, gradeId || null)
            .input('section', sql.NVarChar, section || null);

        let query = `
            WITH MainSubmissions AS (
                -- 1. Online Exams
                SELECT 
                    se.AttemptId,
                    e.Title,
                    co.CourseName,
                    CASE 
                        WHEN (se.Score IS NULL OR se.Score = 0) AND ISNULL(se.CorrectCount, 0) > 0 
                        AND ISNULL(qSum.TotalQuestions, 0) > 0
                        THEN (CAST(se.CorrectCount AS FLOAT) / qSum.TotalQuestions) * qSum.TotalPoints
                        ELSE CAST(ISNULL(se.Score, 0) AS FLOAT)
                    END as Score,
                    ISNULL(se.CorrectCount, 0) as CorrectCount,
                    se.EndTime as [Date],
                    se.Status,
                    CAST(ISNULL(e.TotalMarks, qSum.TotalPoints) AS FLOAT) as TotalPoints,
                    e.SemesterId,
                    e.AcademicYearId,
                    e.CourseId,
                    cl.GradeName,
                    cl.Section,
                    'Exam' as Type,
                    DATEDIFF(MINUTE, se.StartTime, se.EndTime) as ElapsedMinutes,
                    e.DurationMinutes,
                    ISNULL(qSum.TotalQuestions, 0) as TotalQuestions
                FROM StudentExams se
                JOIN Exams e ON se.ExamId = e.ExamId
                JOIN Courses co ON e.CourseId = co.CourseId
                LEFT JOIN Classes cl ON e.ClassId = cl.ClassId
                OUTER APPLY (
                    SELECT 
                        SUM(CASE 
                            WHEN q.Type = 'Matching' 
                            THEN q.Points * ISNULL(mpCount.cnt, 0)
                            ELSE q.Points 
                        END) as TotalPoints,
                        SUM(CASE 
                            WHEN q.Type = 'Matching' 
                            THEN ISNULL(mpCount.cnt, 0)
                            ELSE 1 
                        END) as TotalQuestions
                    FROM Questions q 
                    JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                    OUTER APPLY (
                        SELECT COUNT(1) as cnt FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId
                    ) mpCount
                    WHERE sqo.AttemptId = se.AttemptId
                ) qSum
                WHERE se.StudentId = @studentId AND se.Status IN ('Submitted', 'Graded')

                UNION ALL

                -- 2. Manual Assessments
                SELECT 
                    sas.Id as AttemptId,
                    a.Title,
                    co.CourseName,
                    CAST(ISNULL(sas.MarksObtained, 0) AS FLOAT) as Score,
                    0 as CorrectCount,
                    sas.GradedAt as [Date],
                    sas.Status,
                    CAST(ISNULL(a.TotalMarks, 0) AS FLOAT) as TotalPoints,
                    a.SemesterId,
                    a.AcademicYearId,
                    a.CourseId,
                    'Grade ' + CAST(ISNULL(gr.GradeNumber, 0) AS NVARCHAR(10)) as GradeName,
                    s.Name as Section,
                    'Manual' as Type,
                    NULL as ElapsedMinutes,
                    NULL as DurationMinutes,
                    0 as TotalQuestions
                FROM StudentAssessmentScores sas
                JOIN Assessments a ON sas.AssessmentId = a.Id
                JOIN Courses co ON a.CourseId = co.CourseId
                LEFT JOIN StudentEnrollments sen ON sas.StudentId = sen.StudentId AND a.AcademicYearId = sen.AcademicYearId
                LEFT JOIN Grades gr ON sen.GradeId = gr.Id
                LEFT JOIN Sections s ON sen.SectionId = s.Id
                WHERE sas.StudentId = @studentId AND sas.Status = 'Graded'

                UNION ALL

                -- 3. Assignments
                SELECT 
                    sub.SubmissionId as AttemptId,
                    ass.Title,
                    co.CourseName,
                    CAST(ISNULL(sub.Score, 0) AS FLOAT) as Score,
                    0 as CorrectCount,
                    sub.SubmissionDate as [Date],
                    sub.Status,
                    CAST(ISNULL(ass.Points, 0) AS FLOAT) as TotalPoints,
                    ass.SemesterId,
                    ass.AcademicYearId,
                    ass.CourseId,
                    'Grade ' + CAST(ISNULL(gr.GradeNumber, 0) AS NVARCHAR(10)) as GradeName,
                    s.Name as Section,
                    'Assignment' as Type,
                    NULL as ElapsedMinutes,
                    NULL as DurationMinutes,
                    0 as TotalQuestions
                FROM AssignmentSubmissions sub
                JOIN Assignments ass ON sub.AssignmentId = ass.AssignmentId
                JOIN Courses co ON ass.CourseId = co.CourseId
                LEFT JOIN StudentEnrollments sen ON sub.StudentId = sen.StudentId AND ass.AcademicYearId = sen.AcademicYearId
                LEFT JOIN Grades gr ON sen.GradeId = gr.Id
                LEFT JOIN Sections s ON sen.SectionId = s.Id
                WHERE sub.StudentId = @studentId AND sub.Status IN ('Submitted', 'Graded')
            )
            SELECT * FROM MainSubmissions
            WHERE 1=1
        `;

        if (ayId) query += " AND AcademicYearId = @ayId";
        if (semesterId) query += " AND SemesterId = @semId";
        if (courseId) query += " AND CourseId = @courseId";
        if (gradeId) {
            query += " AND GradeName = (SELECT 'Grade ' + CAST(GradeNumber AS NVARCHAR(10)) FROM Grades WHERE Id = @gradeId)";
        }
        if (section) query += " AND Section = @section";

        query += " ORDER BY [Date] DESC";

        const result = await request.query(query);

        res.json({
            rank: rankingInfo.rank,
            average: rankingInfo.average,
            submissions: result.recordset
        });
    } catch (err) {
        console.error('getStudentResults error:', err);
        res.status(500).json({ message: 'Error fetching results' });
    }
};

export const getStudentCourses = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT DISTINCT c.CourseId, c.CourseName 
                FROM Courses c
                JOIN Exams e ON c.CourseId = e.CourseId
                JOIN StudentExams se ON e.ExamId = se.ExamId
                WHERE se.StudentId = @studentId
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('getStudentCourses error:', err);
        res.status(500).json({ message: 'Error fetching courses' });
    }
};

export const getExamReview = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const { attemptId } = req.params;

    try {
        const pool = await poolPromise;

        // 1. Verify access
        let examId;
        let totalMarks = 0;
        let correctCount = 0;

        const attemptQuery = `
            SELECT 
                se.ExamId, e.TotalMarks, se.CorrectCount, se.Score, qSum.TotalPoints as CalculatedTotal,
                e.Title as ExamTitle,
                c.CourseName as Subject,
                u.FullName as TeacherName,
                ay.Name as AcademicYear,
                sem.Name as SemesterName,
                se.StartTime as DateTaken,
                st.FullName as StudentName,
                st.Email as StudentEmail,
                st.RegistrationNumber as StudentRegNo
            FROM StudentExams se 
            JOIN Exams e ON se.ExamId = e.ExamId 
            LEFT JOIN Courses c ON e.CourseId = c.CourseId
            LEFT JOIN Users u ON e.TeacherId = u.UserId
            LEFT JOIN Users st ON se.StudentId = st.UserId
            LEFT JOIN AcademicYears ay ON e.AcademicYearId = ay.Id
            LEFT JOIN Semesters sem ON e.SemesterId = sem.Id
            OUTER APPLY (
                SELECT 
                    SUM(CASE 
                        WHEN q.Type = 'Matching' THEN q.Points * ISNULL(mpCount.cnt, 0)
                        ELSE q.Points 
                    END) as TotalPoints
                FROM Questions q 
                OUTER APPLY (
                    SELECT COUNT(*) as cnt FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId
                ) mpCount
                WHERE q.ExamId = e.ExamId
            ) qSum
            WHERE se.AttemptId = @attemptId
        `;

        const attemptCheck = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .input('studentId', sql.Int, userId)
            .query(attemptQuery + (role === 'Student' ? ' AND se.StudentId = @studentId' : ''));

        if (attemptCheck.recordset.length === 0) {
            return res.status(role === 'Student' ? 403 : 404).json({ message: role === 'Student' ? 'Unauthorized' : 'Attempt not found' });
        }

        const data = attemptCheck.recordset[0];
        examId = data.ExamId;
        totalMarks = data.TotalMarks || data.CalculatedTotal || 0;
        correctCount = data.CorrectCount || 0;
        const score = data.Score || 0;

        // 2. Fetch questions with options and CORRECT answers, and student answers
        const result = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT q.QuestionId, q.Text, q.Type, q.Points,
                    (
                        SELECT o.OptionId, o.Text, o.IsCorrect 
                        FROM Options o 
                        JOIN StudentOptionOrder soo ON o.OptionId = soo.OptionId
                        WHERE o.QuestionId = q.QuestionId AND soo.AttemptId = @attemptId
                        ORDER BY soo.SortOrder
                        FOR JSON PATH
                    ) as Options,
                    (SELECT mp.PairId, mp.LeftText, mp.RightText FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId FOR JSON PATH) as MatchingPairs,
                    (SELECT TOP 1 sa.SelectedOptionId, sa.MatchingAnswer, sa.EssayAnswer, sa.MarksAwarded, sa.Feedback
                     FROM StudentAnswers sa 
                     WHERE sa.AttemptId = @attemptId AND sa.QuestionId = q.QuestionId 
                     ORDER BY sa.AnswerId DESC
                     FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER) as StudentAnswer
                FROM Questions q
                JOIN StudentQuestionOrder sqo ON q.QuestionId = sqo.QuestionId
                WHERE sqo.AttemptId = @attemptId
                ORDER BY sqo.SortOrder
            `);

        const questions = result.recordset.map(q => ({
            ...q,
            Options: q.Options ? JSON.parse(q.Options) : [],
            MatchingPairs: q.MatchingPairs ? JSON.parse(q.MatchingPairs) : [],
            StudentAnswer: q.StudentAnswer ? JSON.parse(q.StudentAnswer) : null
        }));


        res.json({
            questions,
            totalMarks,
            correctCount,
            score,
            examDetails: {
                title: data.ExamTitle,
                subject: data.Subject,
                teacher: data.TeacherName,
                year: data.AcademicYear,
                semester: data.SemesterName,
                dateTaken: data.DateTaken,
                studentName: data.StudentName,
                studentEmail: data.StudentEmail,
                studentRegNo: data.StudentRegNo,
                sectionName: data.SectionName
            }
        });
    } catch (err) {
        console.error('getExamReview error:', err);
        res.status(500).json({ message: 'Error fetching exam review' });
    }
};

export const getStudentNotifications = async (req: Request, res: Response) => {
    const studentId = (req as any).user.id;
    try {
        const pool = await poolPromise;
        await ensureSchema(pool);

        // Fetch active semester to align with MyExams filter
        const activeSemester = await pool.request().query("SELECT Id FROM Semesters WHERE IsActive = 1");
        const semesterId = activeSemester.recordset[0]?.Id;

        // 1. Pending Exams (Synchronized with MyExams list logic)
        const examsResult = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT COUNT(DISTINCT e.ExamId) as count
                FROM Exams e
                LEFT JOIN StudentExamAssignment sea ON e.ExamId = sea.ExamId AND sea.StudentId = @studentId
                WHERE (
                    -- Regular exams: count if published for class
                    (e.IsPublished = 1 AND e.IsMakeup = 0 AND (
                        sea.StudentId IS NOT NULL 
                        OR (e.ClassId IS NOT NULL AND EXISTS (SELECT 1 FROM StudentClasses sc WHERE sc.ClassId = e.ClassId AND sc.StudentId = @studentId))
                    ))
                    -- Makeup exams: ONLY count if specifically assigned
                    OR (e.IsMakeup = 1 AND sea.StudentId IS NOT NULL)
                )
                AND (sea.Status IS NULL OR sea.Status NOT IN ('Completed', 'Submitted', 'Graded'))
                -- Live check: Count exams that are currently within their active UTC window
                AND (
                    (sea.OverrideStartTime IS NOT NULL AND sea.OverrideStartTime <= GETUTCDATE())
                    OR
                    (sea.OverrideStartTime IS NULL AND (e.StartTime IS NULL OR e.StartTime <= GETUTCDATE()))
                )
                AND (
                    (sea.OverrideEndTime IS NOT NULL AND sea.OverrideEndTime >= GETUTCDATE()) OR
                    (sea.OverrideEndTime IS NULL AND (e.EndTime IS NULL OR e.EndTime >= GETUTCDATE()))
                )
            `);

        // 2. Pending Assignments (For student's classes, not submitted)
        const assignmentsResult = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT COUNT(*) as count
                FROM Assignments a
                JOIN StudentClasses sc ON a.ClassId = sc.ClassId
                WHERE sc.StudentId = @studentId
                AND a.AssignmentId NOT IN (SELECT AssignmentId FROM AssignmentSubmissions WHERE StudentId = @studentId)
                AND a.Deadline > GETDATE()
            `);

        // 3. Recent Announcements (Last 48 hours)
        const announcementsResult = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT COUNT(*) as count
                FROM Announcements
                WHERE (TargetRole IN ('Student', 'All'))
                AND (ClassId IS NULL OR ClassId IN (SELECT ClassId FROM StudentClasses WHERE StudentId = @studentId))
                AND (Deadline IS NULL OR Deadline >= CAST(GETDATE() AS DATE))
            `);

        res.json({
            exams: examsResult.recordset[0].count,
            assignments: assignmentsResult.recordset[0].count,
            announcements: announcementsResult.recordset[0].count
        });
    } catch (err) {
        console.error('getStudentNotifications error:', err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

export const getStudentAnnouncements = async (req: Request, res: Response) => {
    try {
        const studentId = (req as any).user.id;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT * FROM Announcements 
                WHERE (TargetRole IN ('Student', 'All'))
                AND (ClassId IS NULL OR ClassId IN (SELECT ClassId FROM StudentClasses WHERE StudentId = @studentId))
                AND (Deadline IS NULL OR Deadline >= CAST(GETDATE() AS DATE)) 
                ORDER BY CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('getStudentAnnouncements error:', err);
        res.status(500).json({ message: 'Error fetching announcements' });
    }
};
