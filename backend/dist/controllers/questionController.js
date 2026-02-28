import { sql, poolPromise } from '../config/db.js';
export const addQuestion = async (req, res) => {
    const { examId, text, type, points, options, matchingPairs } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('examId', sql.Int, examId)
            .input('text', sql.NVarChar, text)
            .input('type', sql.NVarChar, type)
            .input('points', sql.Int, points)
            .query('INSERT INTO Questions (ExamId, Text, Type, Points) OUTPUT INSERTED.QuestionId VALUES (@examId, @text, @type, @points)');
        const questionId = result.recordset[0].QuestionId;
        if (options && options.length > 0) {
            for (const opt of options) {
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .input('text', sql.NVarChar, opt.text)
                    .input('isCorrect', sql.Bit, opt.isCorrect ? 1 : 0)
                    .query('INSERT INTO Options (QuestionId, Text, IsCorrect) VALUES (@questionId, @text, @isCorrect)');
            }
        }
        // Handle matching pairs
        if (type === 'Matching' && matchingPairs && matchingPairs.length > 0) {
            for (const pair of matchingPairs) {
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .input('leftText', sql.NVarChar, pair.left)
                    .input('rightText', sql.NVarChar, pair.right)
                    .query('INSERT INTO MatchingPairs (QuestionId, LeftText, RightText) VALUES (@questionId, @leftText, @rightText)');
            }
        }
        res.status(201).json({ message: 'Question added successfully', questionId });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error adding question' });
    }
};
export const deleteQuestion = async (req, res) => {
    const { questionId } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('questionId', sql.Int, questionId)
            .query('DELETE FROM Questions WHERE QuestionId = @questionId');
        res.json({ message: 'Question deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting question' });
    }
};
export const updateQuestion = async (req, res) => {
    const { questionId } = req.params;
    const { text, type, points, options, matchingPairs } = req.body;
    try {
        const pool = await poolPromise;
        // 1. Update core question fields
        await pool.request()
            .input('questionId', sql.Int, questionId)
            .input('text', sql.NVarChar, text)
            .input('type', sql.NVarChar, type)
            .input('points', sql.Int, points || 1)
            .query('UPDATE Questions SET Text=@text, Type=@type, Points=@points WHERE QuestionId=@questionId');
        // 2. Replace options (delete existing, re-insert)
        await pool.request()
            .input('questionId', sql.Int, questionId)
            .query('DELETE FROM Options WHERE QuestionId=@questionId');
        if (options && options.length > 0) {
            for (const opt of options) {
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .input('text', sql.NVarChar, opt.text)
                    .input('isCorrect', sql.Bit, opt.isCorrect ? 1 : 0)
                    .query('INSERT INTO Options (QuestionId, Text, IsCorrect) VALUES (@questionId, @text, @isCorrect)');
            }
        }
        // 3. Replace matching pairs
        await pool.request()
            .input('questionId', sql.Int, questionId)
            .query('DELETE FROM MatchingPairs WHERE QuestionId=@questionId');
        if (type === 'Matching' && matchingPairs && matchingPairs.length > 0) {
            for (const pair of matchingPairs) {
                await pool.request()
                    .input('questionId', sql.Int, questionId)
                    .input('leftText', sql.NVarChar, pair.left)
                    .input('rightText', sql.NVarChar, pair.right)
                    .query('INSERT INTO MatchingPairs (QuestionId, LeftText, RightText) VALUES (@questionId, @leftText, @rightText)');
            }
        }
        res.json({ message: 'Question updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating question' });
    }
};
export const getQuestionsByExam = async (req, res) => {
    const { examId } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('examId', sql.Int, examId)
            .query(`
                SELECT q.*, 
                    (SELECT o.* FROM Options o WHERE o.QuestionId = q.QuestionId FOR JSON PATH) as Options,
                    (SELECT mp.* FROM MatchingPairs mp WHERE mp.QuestionId = q.QuestionId FOR JSON PATH) as MatchingPairs
                FROM Questions q
                WHERE q.ExamId = @examId
            `);
        const questions = result.recordset.map(q => ({
            ...q,
            Options: q.Options ? JSON.parse(q.Options) : [],
            MatchingPairs: q.MatchingPairs ? JSON.parse(q.MatchingPairs) : []
        }));
        res.json(questions);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching questions' });
    }
};
