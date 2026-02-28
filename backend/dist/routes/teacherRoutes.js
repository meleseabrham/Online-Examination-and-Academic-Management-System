import express from 'express';
import { getExams, getAvailableMarks, createExam, publishExam, unpublishExam, updateExam, deleteExam } from '../controllers/examController.js';
import { addQuestion, getQuestionsByExam, deleteQuestion, updateQuestion as updateQuestionController } from '../controllers/questionController.js';
import { getMyClasses, getMyCourses, getDashboardStats, getMyRecentExams, getClassStudents, getLiveExamSessions, getTeacherAnnouncements, getTeacherNotifications, getAttemptAnswers, gradeStudentExam, unlockAttempt } from '../controllers/teacherController.js';
import { createAssignment, getMyAssignments, deleteAssignment, updateAssignment, getAssignmentSubmissions, gradeSubmission } from '../controllers/assignmentController.js';
import { getTeacherResults, getStudentProgress, gradeEssayAnswers } from '../controllers/resultController.js';
import { getSemesters, getRankings, getAcademicYears, getGrades, getSections } from '../controllers/academicController.js';
import { getCourses } from '../controllers/adminController.js';
import { getAssessments, createAssessment as createAssessmentItem, updateAssessment as updateAssessmentItem, deleteAssessment as deleteAssessmentItem, getAssessmentScores, submitScores, getStudentsForAssessment, getStudentCourseBreakdown, getAssessmentSettings, bulkAssignAssessments } from '../controllers/assessmentController.js';
import { getModules, createModule, updateModule, deleteModule } from '../controllers/moduleController.js';
import { generateTranscript } from '../controllers/transcriptController.js';
import { getSemesterRankings } from '../controllers/academicResultController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { checkMaintenanceMode } from '../controllers/systemController.js';
const router = express.Router();
router.use(authenticateToken);
router.use(authorizeRoles('Teacher', 'Admin'));
router.use(checkMaintenanceMode);
// Exam routes
router.get('/exams', getExams);
router.get('/exams/available-marks', getAvailableMarks);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.patch('/exams/:id/publish', publishExam);
router.patch('/exams/:id/unpublish', unpublishExam);
// Make-Up & Assignment routes
import { assignStudentsToExam, getExamAssignments, markMissedExams, getMissedStudents, reassignExamToStudents, createMakeupFromMissed } from '../controllers/examController.js';
router.post('/exams/assign', assignStudentsToExam);
router.get('/exams/:examId/assignments', getExamAssignments);
router.get('/exams/:examId/missed-students', getMissedStudents);
router.post('/exams/reassign', reassignExamToStudents);
router.post('/exams/create-makeup', createMakeupFromMissed);
router.post('/exams/mark-missed', markMissedExams);
router.get('/semesters', getSemesters);
router.get('/academic-years', getAcademicYears);
router.get('/grades', getGrades);
router.get('/sections', getSections);
router.get('/all-courses', getCourses);
router.get('/exams/:examId/questions', getQuestionsByExam);
router.post('/questions', addQuestion);
router.put('/questions/:questionId', updateQuestionController);
router.delete('/questions/:questionId', deleteQuestion);
// Assignment routes
router.get('/assignments', getMyAssignments);
router.post('/assignments', upload.single('file'), createAssignment);
router.put('/assignments/:id', upload.single('file'), updateAssignment);
router.delete('/assignments/:id', deleteAssignment);
router.get('/assignments/:id/submissions', getAssignmentSubmissions);
router.post('/assignments/submissions/:submissionId/grade', gradeSubmission);
// Result routes
router.get('/results', getTeacherResults);
router.get('/students/:studentId/progress', getStudentProgress);
// Class routes
router.get('/classes', getMyClasses);
router.get('/classes/:classId/students', getClassStudents);
router.get('/rankings', getRankings);
router.get('/semester-rankings', getSemesterRankings);
// Course routes
router.get('/courses', getMyCourses);
// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-exams', getMyRecentExams);
// Announcements
router.get('/announcements', getTeacherAnnouncements);
// Live exam monitoring
router.get('/live-sessions', getLiveExamSessions);
// Notification counts
router.get('/notifications', getTeacherNotifications);
// Grading routes
router.get('/attempts/:attemptId/answers', getAttemptAnswers);
router.post('/attempts/:attemptId/grade', gradeStudentExam);
router.post('/attempts/grade-essay', gradeEssayAnswers);
router.post('/attempts/:attemptId/unlock', unlockAttempt);
// =============================================
// ASSESSMENT ROUTES (NEW - Teacher can manage assessments & scores)
// =============================================
router.get('/assessments', getAssessments);
router.post('/assessments', createAssessmentItem);
router.put('/assessments/:id', updateAssessmentItem);
router.delete('/assessments/:id', deleteAssessmentItem);
router.get('/assessments/:assessmentId/scores', getAssessmentScores);
router.get('/assessments/:assessmentId/students', getStudentsForAssessment);
router.post('/assessments/scores', submitScores);
router.post('/assessments/bulk-assign', bulkAssignAssessments);
router.get('/assessment-settings', getAssessmentSettings);
router.get('/student-course-breakdown', getStudentCourseBreakdown);
// =============================================
// MODULES / RESOURCES ROUTES
// =============================================
router.get('/modules', getModules);
router.post('/modules', upload.single('file'), createModule);
router.put('/modules/:id', upload.single('file'), updateModule);
router.delete('/modules/:id', deleteModule);
// Transcript (teacher can generate for their students)
router.get('/transcript/semester', generateTranscript);
// System Guides (read-only for teachers)
import { getGuides } from '../controllers/guideController.js';
router.get('/guides', getGuides);
export default router;
