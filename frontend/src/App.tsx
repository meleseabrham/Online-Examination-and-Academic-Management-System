import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/auth/Login';

import AdminDashboard from './pages/admin/Dashboard';
import AdminReports from './pages/admin/Reports';
import ManageUsers from './pages/admin/ManageUsers';
import AdminAnnouncements from './pages/admin/Announcements';
import AcademicManagement from './pages/admin/AcademicManagement';
import ManageGuides from './pages/admin/ManageGuides';
import SystemSettings from './pages/admin/SystemSettings';

import TeacherDashboard from './pages/teacher/Dashboard';
import MyClasses from './pages/teacher/MyClasses';
import MyCourses from './pages/teacher/MyCourses';
import CourseExams from './pages/teacher/CourseExams';
import CourseResources from './pages/teacher/CourseResources';
import CreateExam from './pages/teacher/CreateExam';
import ViewResults from './pages/teacher/ViewResults';
import TeacherAssignments from './pages/teacher/Assignments';
import StudentProgress from './pages/teacher/StudentProgress';
import LiveExamMonitor from './pages/teacher/LiveExamMonitor';
import ClassRankings from './pages/teacher/ClassRankings';
import TeacherAnnouncements from './pages/teacher/Announcements';
import GradeSubmission from './pages/teacher/GradeSubmission';
import AssessmentManagement from './pages/teacher/AssessmentManagement';
import ManageModules from './pages/teacher/ManageModules';
import TeacherAssessmentResults from './pages/teacher/TeacherAssessmentResults';


import StudentDashboard from './pages/student/Dashboard';
import MyExams from './pages/student/MyExams';
import MyResults from './pages/student/MyResults';
import StudentAnnouncements from './pages/student/Announcements';
import StudentAssignments from './pages/student/Assignments';
import SemesterResults from './pages/student/SemesterResults';
import MyAssessments from './pages/student/MyAssessments';
import ViewModules from './pages/student/ViewModules';

import TakeExam from './pages/student/TakeExam';
import ExamReview from './pages/student/ExamReview';
import MyRanking from './pages/student/MyRanking';
import MyTranscript from './pages/student/MyTranscript';
import Profile from './pages/Profile';
import ViewGuides from './pages/shared/ViewGuides';

import DirectorDashboard from './pages/director/Dashboard';
import DirectorAcademicManagement from './pages/director/AcademicManagement';
import DirectorManageCourses from './pages/director/ManageCourses';
import DirectorManageClasses from './pages/director/ManageClasses';
import DirectorManageTeacherAssignments from './pages/director/ManageTeacherAssignments';
import DirectorAssessmentManagement from './pages/director/AssessmentManagement';
import DirectorAdminAssessmentResults from './pages/director/AdminAssessmentResults';
import DirectorViewResults from './pages/director/ViewResults';
import DirectorClassRankings from './pages/director/ClassRankings';
import DirectorAdminAnnouncements from './pages/director/AdminAnnouncements';
import DirectorTransferManagement from './pages/director/TransferManagement';
import DirectorSettings from './pages/director/DirectorSettings';
import DirectorLiveExamMonitor from './pages/director/LiveMonitor';
import ManageTeachers from './pages/director/ManageTeachers';
import DirectorReports from './pages/director/Reports';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRole = user.role?.toLowerCase();
    const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

    if (!isAllowed) {
        // Redirect to their own dashboard if they try to access unauthorized role routes
        if (userRole === 'admin') return <Navigate to="/admin" replace />;
        if (userRole === 'director') return <Navigate to="/director" replace />;
        if (userRole === 'teacher') return <Navigate to="/teacher" replace />;
        if (userRole === 'student') return <Navigate to="/student" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['Admin']}><AdminReports /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><ManageUsers /></ProtectedRoute>} />
                {/* Academic only for Backups in Admin */}
                <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['Admin']}><AdminAnnouncements /></ProtectedRoute>} />
                <Route path="/admin/academic" element={<ProtectedRoute allowedRoles={['Admin']}><AcademicManagement /></ProtectedRoute>} />
                <Route path="/admin/guides" element={<ProtectedRoute allowedRoles={['Admin']}><ManageGuides /></ProtectedRoute>} />
                <Route path="/admin/system-settings" element={<ProtectedRoute allowedRoles={['Admin']}><SystemSettings /></ProtectedRoute>} />
                <Route path="/admin/live-monitor" element={<ProtectedRoute allowedRoles={['Admin']}><LiveExamMonitor /></ProtectedRoute>} />

                {/* Director Routes */}
                <Route path="/director" element={<ProtectedRoute allowedRoles={['Director']}><DirectorDashboard /></ProtectedRoute>} />
                <Route path="/director/academic" element={<ProtectedRoute allowedRoles={['Director']}><DirectorAcademicManagement /></ProtectedRoute>} />
                <Route path="/director/courses" element={<ProtectedRoute allowedRoles={['Director']}><DirectorManageCourses /></ProtectedRoute>} />
                <Route path="/director/classes" element={<ProtectedRoute allowedRoles={['Director']}><DirectorManageClasses /></ProtectedRoute>} />
                <Route path="/director/assignments" element={<ProtectedRoute allowedRoles={['Director']}><DirectorManageTeacherAssignments /></ProtectedRoute>} />
                <Route path="/director/assessments" element={<ProtectedRoute allowedRoles={['Director']}><DirectorAssessmentManagement /></ProtectedRoute>} />
                <Route path="/director/assessment-results" element={<ProtectedRoute allowedRoles={['Director']}><DirectorAdminAssessmentResults /></ProtectedRoute>} />
                <Route path="/director/results" element={<ProtectedRoute allowedRoles={['Director']}><DirectorViewResults /></ProtectedRoute>} />
                <Route path="/director/rankings" element={<ProtectedRoute allowedRoles={['Director']}><DirectorClassRankings /></ProtectedRoute>} />
                <Route path="/director/live-monitor" element={<ProtectedRoute allowedRoles={['Director']}><DirectorLiveExamMonitor /></ProtectedRoute>} />
                <Route path="/director/announcements" element={<ProtectedRoute allowedRoles={['Director']}><DirectorAdminAnnouncements /></ProtectedRoute>} />
                <Route path="/director/transfers" element={<ProtectedRoute allowedRoles={['Director']}><DirectorTransferManagement /></ProtectedRoute>} />
                <Route path="/director/reports" element={<ProtectedRoute allowedRoles={['Director']}><DirectorReports /></ProtectedRoute>} />
                <Route path="/director/system-settings" element={<ProtectedRoute allowedRoles={['Director']}><DirectorSettings /></ProtectedRoute>} />
                <Route path="/director/teachers" element={<ProtectedRoute allowedRoles={['Director']}><ManageTeachers /></ProtectedRoute>} />
                <Route path="/director/guides" element={<ProtectedRoute allowedRoles={['Director']}><ViewGuides role="director" /></ProtectedRoute>} />
                <Route path="/director/results/:attemptId/grade" element={<ProtectedRoute allowedRoles={['Director']}><GradeSubmission /></ProtectedRoute>} />
                <Route path="/director/results/:attemptId/review" element={<ProtectedRoute allowedRoles={['Director']}><ExamReview /></ProtectedRoute>} />
                <Route path="/director/students/:studentId/progress" element={<ProtectedRoute allowedRoles={['Director']}><StudentProgress /></ProtectedRoute>} />

                {/* Teacher Routes */}
                <Route path="/teacher" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherDashboard /></ProtectedRoute>} />
                <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={['Teacher']}><MyClasses /></ProtectedRoute>} />
                <Route path="/teacher/courses" element={<ProtectedRoute allowedRoles={['Teacher']}><MyCourses /></ProtectedRoute>} />
                <Route path="/teacher/courses/:courseId/resources" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><CourseResources /></ProtectedRoute>} />
                <Route path="/teacher/courses/:courseId/exams" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><CourseExams /></ProtectedRoute>} />
                <Route path="/teacher/create-exam" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><CreateExam /></ProtectedRoute>} />

                <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherAssignments /></ProtectedRoute>} />
                <Route path="/teacher/results" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><ViewResults /></ProtectedRoute>} />
                <Route path="/teacher/results/:attemptId/grade" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><GradeSubmission /></ProtectedRoute>} />
                <Route path="/teacher/results/:attemptId/review" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><ExamReview /></ProtectedRoute>} />
                <Route path="/teacher/rankings" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><ClassRankings /></ProtectedRoute>} />
                <Route path="/teacher/live-monitor" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><LiveExamMonitor /></ProtectedRoute>} />
                <Route path="/teacher/announcements" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherAnnouncements /></ProtectedRoute>} />
                <Route path="/teacher/students/:studentId/progress" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><StudentProgress /></ProtectedRoute>} />
                <Route path="/teacher/assessments" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><AssessmentManagement /></ProtectedRoute>} />
                <Route path="/teacher/assessment-results" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherAssessmentResults /></ProtectedRoute>} />
                <Route path="/teacher/modules" element={<ProtectedRoute allowedRoles={['Teacher', 'Admin', 'Director']}><ManageModules /></ProtectedRoute>} />
                <Route path="/teacher/guides" element={<ProtectedRoute allowedRoles={['Teacher']}><ViewGuides role="teacher" /></ProtectedRoute>} />

                {/* Student Routes */}
                <Route path="/student" element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/student/exams" element={<ProtectedRoute allowedRoles={['Student']}><MyExams /></ProtectedRoute>} />
                <Route path="/student/modules" element={<ProtectedRoute allowedRoles={['Student']}><ViewModules /></ProtectedRoute>} />
                <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['Student']}><StudentAssignments /></ProtectedRoute>} />
                <Route path="/student/take-exam/:examId" element={<ProtectedRoute allowedRoles={['Student']}><TakeExam /></ProtectedRoute>} />
                <Route path="/student/results" element={<ProtectedRoute allowedRoles={['Student']}><MyResults /></ProtectedRoute>} />
                <Route path="/student/semester-results" element={<ProtectedRoute allowedRoles={['Student']}><SemesterResults /></ProtectedRoute>} />
                <Route path="/student/assessments" element={<ProtectedRoute allowedRoles={['Student']}><MyAssessments /></ProtectedRoute>} />
                <Route path="/student/results/:attemptId/review" element={<ProtectedRoute allowedRoles={['Student', 'Teacher', 'Admin', 'Director']}><ExamReview /></ProtectedRoute>} />

                <Route path="/student/rankings" element={<ProtectedRoute allowedRoles={['Student']}><MyRanking /></ProtectedRoute>} />
                <Route path="/student/transcript" element={<ProtectedRoute allowedRoles={['Student']}><MyTranscript /></ProtectedRoute>} />
                <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={['Student']}><StudentAnnouncements /></ProtectedRoute>} />
                <Route path="/student/guides" element={<ProtectedRoute allowedRoles={['Student']}><ViewGuides role="student" /></ProtectedRoute>} />

                {/* Shared Routes */}
                <Route path="/profile" element={<ProtectedRoute allowedRoles={['Admin', 'Teacher', 'Student', 'Director']}><Profile /></ProtectedRoute>} />

                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;

