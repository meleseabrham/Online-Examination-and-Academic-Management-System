import express from 'express';
import { getUsers, createUser, updateUser, deleteUser, getUserProfile, resetUserPassword } from '../controllers/userController.js';
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
import { getSystemSettings, updateSystemSetting, deleteSystemSetting, updateLogo, deleteLogo, checkMaintenanceMode } from '../controllers/systemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload, profileUpload } from '../middleware/upload.js';
const router = express.Router();
// Apply Admin check to all routes here
router.use(authenticateToken);
router.use(authorizeRoles('Admin', 'Director'));
router.use(checkMaintenanceMode);
// Dashboard stats & reports
router.get('/dashboard/stats', getAdminStats);
router.get('/dashboard/reports', getReportsData);
router.get('/notifications', getAdminNotifications);
// User routes (Admin Only)
router.get('/users', authorizeRoles('Admin'), getUsers);
router.get('/users/:id/profile', authorizeRoles('Admin'), getUserProfile);
router.post('/users', authorizeRoles('Admin'), profileUpload.single('profileImage'), createUser);
router.post('/users/reset-password', authorizeRoles('Admin'), resetUserPassword);
router.put('/users/:id', authorizeRoles('Admin'), profileUpload.single('profileImage'), updateUser);
router.delete('/users/:id', authorizeRoles('Admin'), deleteUser);
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
// =============================================
// SCHOOL MANAGEMENT ROUTES (NEW)
// =============================================
router.get('/schools', getSchools);
router.post('/schools', createSchool);
router.put('/schools/:id', updateSchool);
router.delete('/schools/:id', deleteSchool);
// =============================================
// TRANSFER ROUTES (NEW)
// =============================================
router.post('/transfers/student', transferStudent);
router.post('/transfers/teacher', transferTeacher);
router.get('/transfers/history', getTransferHistory);
// =============================================
// ASSESSMENT ROUTES (NEW)
// =============================================
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
// =============================================
// TRANSCRIPT & RESULT ROUTES (NEW)
// =============================================
router.get('/transcript/semester', generateTranscript);
router.get('/transcript/full-year', generateFullYearTranscript);
import { calculateCourseTotals, calculateSemesterRankings, calculateFinalYearResults, getSemesterRankings, getAcademicProcessingStatus } from '../controllers/academicResultController.js';
import { performFullBackup, restoreDatabase, getBackupLogs } from '../controllers/backupController.js';
router.post('/calculate-weighted-course-totals', calculateCourseTotals);
router.post('/calculate-semester-rankings', calculateSemesterRankings);
router.post('/calculate-final-year-results', calculateFinalYearResults);
router.get('/semester-rankings', getSemesterRankings);
router.get('/academic-processing-status', getAcademicProcessingStatus);
// =============================================
// TEACHER-LEVEL SHARED ROUTES (FOR ADMIN)
// =============================================
import { getTeacherResults, getStudentProgress, gradeEssayAnswers } from '../controllers/resultController.js';
import { getLiveExamSessions, getAttemptAnswers, gradeStudentExam, unlockAttempt } from '../controllers/teacherController.js';
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
// =============================================
// BACKUP & RESTORE ROUTES (Admin Only)
// =============================================
router.get('/backups', authorizeRoles('Admin'), getBackupLogs);
router.post('/backups/full', authorizeRoles('Admin'), performFullBackup);
router.post('/backups/restore', authorizeRoles('Admin'), restoreDatabase);
// =============================================
// SYSTEM GUIDE ROUTES
// =============================================
import { getGuides, createGuide, updateGuide, deleteGuide } from '../controllers/guideController.js';
import { guideUpload } from '../middleware/upload.js';
router.get('/guides', getGuides);
router.post('/guides', guideUpload.single('file'), createGuide);
router.put('/guides/:id', guideUpload.single('file'), updateGuide);
router.delete('/guides/:id', deleteGuide);
// =============================================
// SYSTEM SETTINGS ROUTES (NEW)
// =============================================
import { brandingUpload } from '../middleware/upload.js';
router.get('/system-settings', getSystemSettings);
router.post('/system-settings', updateSystemSetting);
router.delete('/system-settings/:id', deleteSystemSetting);
router.post('/system-settings/logo', brandingUpload.single('logo'), updateLogo);
router.delete('/system-settings/logo', deleteLogo);
export default router;
