import express from 'express';
import { getUsers, getUserProfile } from '../controllers/userController.js';
import { getClasses, createClass, updateClass, deleteClass, getStudentsByClass, assignStudentToClass, getUnassignedStudents, removeStudentFromClass } from '../controllers/classController.js';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';
import { getTeacherAssignments, createTeacherAssignment, updateTeacherAssignment, deleteTeacherAssignment } from '../controllers/teacherAssignmentController.js';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { getAdminStats, getReportsData, getAdminNotifications } from '../controllers/adminController.js';
import { getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear, getSemesters, createSemester, updateSemester, deleteSemester, getGrades, getSections, createSection, updateSection, deleteSection, getGradeCourses, assignCourseToGrade, removeCourseFromGrade, getUnenrolledStudents, getEnrollments, enrollStudent, updateEnrollment, deleteEnrollment, promoteStudents, calculateSemesterResults, calculateFinalYearRankings, getRankings } from '../controllers/academicController.js';
import { getSchools, createSchool, updateSchool, deleteSchool, transferStudent, transferTeacher, getTransferHistory } from '../controllers/schoolController.js';
import { getAssessments, createAssessment, updateAssessment, deleteAssessment, getAssessmentScores, submitScores, getStudentsForAssessment, calculateWeightedSemesterResults, getStudentCourseBreakdown, getAssessmentSettings, updateAssessmentSettings, bulkAssignAssessments, updateAssessmentRegradePermission } from '../controllers/assessmentController.js';
import { generateTranscript, generateFullYearTranscript } from '../controllers/transcriptController.js';
import { getModules, createModule, updateModule, deleteModule } from '../controllers/moduleController.js';
import { getSystemSettings, updateSystemSetting, deleteSystemSetting, checkMaintenanceMode } from '../controllers/systemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { calculateCourseTotals, calculateSemesterRankings, calculateFinalYearResults, getSemesterRankings, getAcademicProcessingStatus } from '../controllers/academicResultController.js';
import { getTeacherResults, getStudentProgress, gradeEssayAnswers } from '../controllers/resultController.js';
import { getLiveExamSessions, getAttemptAnswers, gradeStudentExam, unlockAttempt } from '../controllers/teacherController.js';
import { getGuides } from '../controllers/guideController.js';
const router = express.Router();
// Apply Director check to all routes here
router.use(authenticateToken);
router.use(authorizeRoles('Director'));
router.use(checkMaintenanceMode);
// Dashboard stats & reports
router.get('/dashboard/stats', getAdminStats);
router.get('/dashboard/reports', getReportsData);
router.get('/notifications', getAdminNotifications);
// Users route (read-only for Director - to fetch teachers list)
router.get('/users', getUsers);
router.get('/users/:id/profile', getUserProfile);
// Class routes
router.get('/classes', getClasses);
router.post('/classes', createClass);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);
router.get('/classes/:id/students', getStudentsByClass);
router.get('/students/unassigned', getUnassignedStudents);
router.post('/classes/assign', assignStudentToClass);
router.post('/classes/remove-student', removeStudentFromClass);
// Course routes
router.get('/courses', getCourses);
router.get('/all-courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
// Teacher Assignment routes
router.get('/assignments/teachers', getTeacherAssignments);
router.post('/assignments/teachers', createTeacherAssignment);
router.put('/assignments/teachers/:id', updateTeacherAssignment);
router.delete('/assignments/teachers/:id', deleteTeacherAssignment);
// Announcement routes
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);
// Academic Management routes
router.get('/academic-years', getAcademicYears);
router.post('/academic-years', createAcademicYear);
router.put('/academic-years/:id', updateAcademicYear);
router.delete('/academic-years/:id', deleteAcademicYear);
router.get('/semesters', getSemesters);
router.post('/semesters', createSemester);
router.put('/semesters/:id', updateSemester);
router.delete('/semesters/:id', deleteSemester);
router.get('/grades', getGrades);
router.get('/sections', getSections);
router.post('/sections', createSection);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);
router.get('/grades/:gradeId/courses', getGradeCourses);
router.get('/grade-courses/:gradeId', getGradeCourses);
router.post('/grades/courses', assignCourseToGrade);
router.post('/grade-courses', assignCourseToGrade);
router.delete('/grades/:gradeId/courses/:courseId', removeCourseFromGrade);
router.delete('/grade-courses/:gradeId/:courseId', removeCourseFromGrade);
router.get('/enrollments/unenrolled', getUnenrolledStudents);
router.get('/enrollments', getEnrollments);
router.post('/enrollments', enrollStudent);
router.put('/enrollments/:id', updateEnrollment);
router.delete('/enrollments/:id', deleteEnrollment);
router.post('/promotions', promoteStudents);
router.post('/calculate-semester-results', calculateSemesterResults);
router.post('/calculate-final-rankings', calculateFinalYearRankings);
router.get('/rankings', getRankings);
// School routes
router.get('/schools', getSchools);
router.post('/schools', createSchool);
router.put('/schools/:id', updateSchool);
router.delete('/schools/:id', deleteSchool);
// Transfer routes
router.post('/transfers/student', transferStudent);
router.post('/transfers/teacher', transferTeacher);
router.get('/transfers/history', getTransferHistory);
// Assessment routes
router.get('/assessments', getAssessments);
router.post('/assessments', createAssessment);
router.put('/assessments/:id', updateAssessment);
router.put('/assessments/:id/regrade-permission', updateAssessmentRegradePermission);
router.delete('/assessments/:id', deleteAssessment);
router.get('/assessments/:assessmentId/scores', getAssessmentScores);
router.get('/assessments/:assessmentId/students', getStudentsForAssessment);
router.post('/assessments/scores', submitScores);
router.post('/calculate-weighted-results', calculateWeightedSemesterResults);
router.get('/student-course-breakdown', getStudentCourseBreakdown);
router.get('/assessment-settings', getAssessmentSettings);
router.put('/assessment-settings', updateAssessmentSettings);
router.post('/assessments/bulk-assign', bulkAssignAssessments);
// Transcript routes
router.get('/transcript/semester', generateTranscript);
router.get('/transcript/full-year', generateFullYearTranscript);
router.post('/calculate-weighted-course-totals', calculateCourseTotals);
router.post('/calculate-semester-rankings', calculateSemesterRankings);
router.post('/calculate-final-year-results', calculateFinalYearResults);
router.get('/semester-rankings', getSemesterRankings);
router.get('/academic-processing-status', getAcademicProcessingStatus);
// Shared teacher/admin routes (For Director)
router.get('/results', getTeacherResults);
router.get('/students/:studentId/progress', getStudentProgress);
router.get('/live-sessions', getLiveExamSessions);
router.get('/attempts/:attemptId/answers', getAttemptAnswers);
router.post('/attempts/:attemptId/grade', gradeStudentExam);
router.post('/attempts/grade-essay', gradeEssayAnswers);
router.post('/attempts/:attemptId/unlock', unlockAttempt);
router.get('/modules', getModules);
router.post('/modules', upload.single('file'), createModule);
router.put('/modules/:id', upload.single('file'), updateModule);
router.delete('/modules/:id', deleteModule);
// System Settings routes (Specifically for Director to manage permissions)
router.get('/system-settings', getSystemSettings);
router.post('/system-settings', updateSystemSetting);
router.delete('/system-settings/:id', deleteSystemSetting);
// =============================================
// SYSTEM GUIDE ROUTES
// =============================================
router.get('/guides', getGuides);
export default router;
