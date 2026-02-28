import express from 'express';
import { getAvailableExams, startExam, saveProgress, submitAnswers, getStudentAssignments, submitAssignment, getExamQuestionsForStudent, getStudentResults, getStudentCourses, getExamReview, getStudentNotifications, getStudentAnnouncements, recordTabSwitch, lockExamAttempt } from '../controllers/studentController.js';
import { getStudentRanking, getAcademicYears, getSemesters, getGrades, getSections } from '../controllers/academicController.js';
import { getStudentSemesterResults } from '../controllers/academicResultController.js';
import { getStudentCourseBreakdown } from '../controllers/assessmentController.js';
import { getModules } from '../controllers/moduleController.js';
import { generateTranscript, generateFullYearTranscript } from '../controllers/transcriptController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { checkMaintenanceMode } from '../controllers/systemController.js';
const router = express.Router();
router.use(authenticateToken);
router.use(checkMaintenanceMode);
// Basic routes
router.get('/test', (req, res) => res.send('Student API is working'));
router.get('/debug/enrollment/:sid', async (req, res) => {
    try {
        const { sql, poolPromise } = await import('../config/db.js');
        const pool = await poolPromise;
        const result = await pool.request().input('sid', sql.Int, req.params.sid).query('SELECT * FROM StudentEnrollments WHERE StudentId = @sid');
        res.json(result.recordset);
    }
    catch (e) {
        res.status(500).send(e.message);
    }
});
router.get('/transcript/semester', authorizeRoles('Student', 'Teacher', 'Admin'), generateTranscript);
router.get('/transcript/full-year', authorizeRoles('Student', 'Teacher', 'Admin'), generateFullYearTranscript);
// Notifications & Announcements (Student & Admin)
router.get('/notifications', authorizeRoles('Student', 'Admin'), getStudentNotifications);
router.get('/announcements', authorizeRoles('Student', 'Admin'), getStudentAnnouncements);
// Academic Metadata (Student can view for filtering)
router.get('/semesters', authorizeRoles('Student', 'Teacher', 'Admin'), getSemesters);
router.get('/academic-years', authorizeRoles('Student', 'Teacher', 'Admin'), getAcademicYears);
router.get('/grades', authorizeRoles('Student', 'Teacher', 'Admin'), getGrades);
router.get('/sections', authorizeRoles('Student', 'Teacher', 'Admin'), getSections);
router.get('/courses/my', authorizeRoles('Student', 'Admin'), getStudentCourses);
// Exam routes (Student & Admin)
router.get('/exams', authorizeRoles('Student', 'Admin'), getAvailableExams);
router.get('/exams/:examId/questions', authorizeRoles('Student', 'Admin'), getExamQuestionsForStudent);
router.post('/exams/start', authorizeRoles('Student', 'Admin'), startExam);
router.post('/exams/save-progress', authorizeRoles('Student', 'Admin'), saveProgress);
router.post('/exams/submit', authorizeRoles('Student', 'Admin'), submitAnswers);
router.post('/exams/record-tab-switch', authorizeRoles('Student', 'Admin'), recordTabSwitch);
router.post('/exams/lock-attempt', authorizeRoles('Student', 'Admin'), lockExamAttempt);
// Result routes (Student, Teacher & Admin)
router.get('/results', authorizeRoles('Student', 'Teacher', 'Admin'), getStudentResults);
router.get('/results/:attemptId/review', authorizeRoles('Student', 'Teacher', 'Admin'), getExamReview);
router.get('/rankings', authorizeRoles('Student', 'Teacher', 'Admin'), getStudentRanking);
router.get('/semester-results', authorizeRoles('Student', 'Teacher', 'Admin'), getStudentSemesterResults);
// Assignment routes (Student & Admin)
router.get('/assignments', authorizeRoles('Student', 'Admin'), getStudentAssignments);
router.post('/assignments/submit', authorizeRoles('Student', 'Admin', 'Teacher'), upload.single('file'), submitAssignment);
// =============================================
// MODULES / RESOURCES ROUTES
// =============================================
router.get('/modules', authorizeRoles('Student', 'Teacher', 'Admin'), getModules);
// =============================================
// NEW: Course breakdown & Transcript (Student can view own data)
// =============================================
router.get('/course-breakdown', authorizeRoles('Student', 'Teacher', 'Admin'), getStudentCourseBreakdown);
// System Guides (read-only for students)
import { getGuides } from '../controllers/guideController.js';
router.get('/guides', authorizeRoles('Student', 'Teacher', 'Admin'), getGuides);
export default router;
