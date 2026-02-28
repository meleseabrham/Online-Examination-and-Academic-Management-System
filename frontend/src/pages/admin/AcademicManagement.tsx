import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Calendar, Clock, Plus, Pencil,
    Loader,
    TrendingUp, ArrowRight, BookOpen, Trophy, Award,
    Trash2, UserPlus, Users, LayoutDashboard,
    ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Database, RefreshCw, HardDrive
} from 'lucide-react';

/* --- Types --- */
interface AcademicYear { Id: number; Name: string; StartDate: string; EndDate: string; IsActive: boolean; }
interface Semester { Id: number; AcademicYearId: number; Name: string; StartDate: string; EndDate: string; IsActive: boolean; AcademicYearName?: string; }
interface Grade { Id: number; GradeNumber: number; }
interface Section { Id: number; GradeId: number; Name: string; GradeNumber?: number; AcademicYearId?: number; }
interface Course { CourseId: number; CourseName: string; CourseCode: string; SemesterName?: string; Teachers?: { [key: string]: string }[]; }
interface Student { UserId: number; FullName: string; Email: string; }
interface Enrollment { Id: number; StudentId: number; StudentName: string; StudentEmail: string; GradeId: number; GradeNumber?: number; SectionId: number; SectionName?: string; AcademicYearId: number; AcademicYearName?: string; Status: string; }
interface BackupLog { Id: number; BackupType: string; FileName: string; FilePath: string; FileSize: number; Status: string; CreatedAt: string; Notes?: string; }

const AcademicManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as 'years' | 'semesters' | 'grades' | 'enrollment' | 'results' | 'promotion' | 'backups' | null;

    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email || 'admin@example.com';
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [activeTab, setActiveTab] = useState<'years' | 'semesters' | 'grades' | 'enrollment' | 'results' | 'promotion' | 'backups'>(tabParam || 'years');

    useEffect(() => {
        if (tabParam && ['years', 'semesters', 'grades', 'enrollment', 'results', 'promotion', 'backups'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);
    const [loading, setLoading] = useState(false);

    // Data states
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [gradeCourses, setGradeCourses] = useState<Course[]>([]);
    const [unenrolledStudents, setUnenrolledStudents] = useState<Student[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [backups, setBackups] = useState<BackupLog[]>([]);

    // Selection states
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedAYForSection, setSelectedAYForSection] = useState<string>('');
    const [selectedSemForCourse, setSelectedSemForCourse] = useState<string>('');
    const [selectedAYForEnrollment, setSelectedAYForEnrollment] = useState<string>('');
    const [selectedSemesterForResults, setSelectedSemesterForResults] = useState<string>('');
    const [selectedGradeForEnrollment, setSelectedGradeForEnrollment] = useState<string>('');
    const [selectedSectionForEnrollment, setSelectedSectionForEnrollment] = useState<string>('');
    const [selectedAYForSemester, setSelectedAYForSemester] = useState<string>('');

    // Form states
    const [showYearForm, setShowYearForm] = useState(false);
    const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });

    const [showSemesterForm, setShowSemesterForm] = useState(false);
    const [semesterForm, setSemesterForm] = useState({ academicYearId: '', name: '', startDate: '', endDate: '', isActive: false });

    const [showSectionForm, setShowSectionForm] = useState(false);
    const [sectionForm, setSectionForm] = useState({ gradeId: '', name: '', academicYearId: '' });

    const [enrollForm, setEnrollForm] = useState({ studentId: '' });

    // Editing states
    const [editingYearId, setEditingYearId] = useState<number | null>(null);
    const [editingSemesterId, setEditingSemesterId] = useState<number | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [editingEnrollmentId, setEditingEnrollmentId] = useState<number | null>(null);

    // Pagination for enrollments
    const [enrollmentPage, setEnrollmentPage] = useState(1);
    const [enrollmentPerPage, setEnrollmentPerPage] = useState(10);
    const [enrollmentPerPageOpen, setEnrollmentPerPageOpen] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
        type: 'danger' | 'warning' | 'info' | 'success';
        isSingleButton?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info',
        isSingleButton: false
    });

    const [processingStatus, setProcessingStatus] = useState({
        courseTotalsCalculated: false,
        ranksCalculated: false,
        finalYearCalculated: false,
        rankingsDoneCount: 0
    });

    const fetchProcessingStatus = async (overrideYearId?: string) => {
        const targetYearId = overrideYearId || selectedAYForEnrollment;
        if (!targetYearId) {
            setProcessingStatus({ courseTotalsCalculated: false, ranksCalculated: false, finalYearCalculated: false, rankingsDoneCount: 0 });
            return;
        }
        try {
            const params: any = { academicYearId: targetYearId };
            // For results tab we usually want semester-specific status
            if (activeTab === 'results' && selectedSemesterForResults) {
                params.semesterId = selectedSemesterForResults;
            }
            const res = await axios.get('http://localhost:5000/api/admin/academic-processing-status', { headers, params });
            setProcessingStatus(res.data);
        } catch (err) { console.error('Error fetching processing status:', err); }
    };

    useEffect(() => {
        fetchYears();
        fetchGrades();
        fetchCourses();
    }, []);

    useEffect(() => {
        if (activeTab === 'semesters' || activeTab === 'results') fetchSemesters();
        if (activeTab === 'enrollment') {
            fetchUnenrolledStudents(selectedAYForEnrollment);
            fetchEnrollments();
            fetchSemesters(); // Fetch semesters to show current active one
        }
    }, [activeTab, selectedAYForEnrollment, selectedGradeForEnrollment, selectedSectionForEnrollment]);

    const fetchYears = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/academic-years', { headers });
            setYears(res.data);
            const activeYear = res.data.find((y: AcademicYear) => y.IsActive);
            if (activeYear) {
                const ayIdStr = activeYear.Id.toString();
                setSelectedAYForSection(ayIdStr);
                setSelectedAYForEnrollment(ayIdStr);
                setSelectedAYForSemester(ayIdStr); // Set default semester filter to active year
            }
        } catch (err) { console.error(err); }
    };

    const fetchSemesters = async () => {
        try {
            const params: any = {};
            if (selectedAYForSemester) params.academicYearId = selectedAYForSemester;
            const res = await axios.get('http://localhost:5000/api/admin/semesters', { headers, params });
            setSemesters(res.data);
        } catch (err) { console.error(err); }
    };

    // Calculate pagination for enrollments
    const totalEnrollmentPages = Math.ceil(enrollments.length / enrollmentPerPage);
    const paginatedEnrollments = enrollments.slice(
        (enrollmentPage - 1) * enrollmentPerPage,
        enrollmentPage * enrollmentPerPage
    );

    const getEnrollmentPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalEnrollmentPages; i++) pages.push(i);
        return pages;
    };

    const fetchGrades = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/grades', { headers });
            setGrades(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchSections = async (gradeId?: number) => {
        try {
            const params: any = {};
            const gId = gradeId || selectedGradeId;
            if (gId) params.gradeId = gId;
            if (selectedAYForSection) params.academicYearId = selectedAYForSection;
            const res = await axios.get('http://localhost:5000/api/admin/sections', { headers, params });
            setSections(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchGradeCourses = async (gradeId?: number | null, ayId?: string, semId?: string) => {
        try {
            const gId = gradeId || selectedGradeId;
            const aId = ayId || selectedAYForSection;
            const sId = semId !== undefined ? semId : selectedSemForCourse;
            if (!gId) return;
            const res = await axios.get(`http://localhost:5000/api/admin/grade-courses/${gId}?academicYearId=${aId}&semesterId=${sId}`, { headers });
            setGradeCourses(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (selectedGradeId) {
            fetchSections();
            fetchGradeCourses();
        }
        if (activeTab === 'semesters') {
            fetchSemesters();
        }
        if (activeTab === 'enrollment') {
            fetchUnenrolledStudents(selectedAYForEnrollment);
            fetchEnrollments();
        }
        if (activeTab === 'results') {
            fetchProcessingStatus();
        } else if (activeTab === 'promotion') {
            const currentYear = years.find(y => y.IsActive);
            if (currentYear) {
                fetchProcessingStatus(currentYear.Id.toString());
            }
        }
        if (activeTab === 'backups') {
            fetchBackups();
        }
    }, [selectedGradeId, selectedAYForSection, selectedSemForCourse, activeTab, selectedGradeForEnrollment, selectedSectionForEnrollment, selectedAYForEnrollment, selectedSemesterForResults, selectedAYForSemester, years]);

    const fetchBackups = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/backups', { headers });
            setBackups(res.data);
        } catch (err) { console.error('Error fetching backups:', err); }
    };

    const handleManualBackup = async () => {
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/admin/backups/full', {}, { headers });
            fetchBackups();
            setConfirmModal({
                isOpen: true,
                title: 'Backup Success',
                message: 'Full database backup has been created successfully.',
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err: any) {
            setConfirmModal({
                isOpen: true,
                title: 'Backup Failed',
                message: err.response?.data?.message || 'Error creating manual backup.',
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } finally { setLoading(false); }
    };

    const handleRestore = async (fileName: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirm System Restore',
            message: `CRITICAL: This will revert the entire database to the state in ${fileName}. All data changed after this backup will be PERMANENTLY LOST. The system will be temporarily unavailable. Continue?`,
            type: 'danger',
            onConfirm: async () => {
                setLoading(true);
                try {
                    await axios.post('http://localhost:5000/api/admin/backups/restore', { fileName }, { headers });
                    setConfirmModal({
                        isOpen: true,
                        title: 'Restore Complete',
                        message: 'Database has been restored successfully. Please refresh the page.',
                        type: 'success',
                        isSingleButton: true,
                        onConfirm: () => window.location.reload()
                    });
                } catch (err: any) {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Restore Failed',
                        message: err.response?.data?.message || 'Error during system restore.',
                        type: 'danger',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } finally { setLoading(false); }
            }
        });
    };

    const fetchCourses = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/courses', { headers });
            setCourses(res.data);
        } catch (err) { console.error(err); }
    };


    const fetchUnenrolledStudents = async (ayId: string) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/admin/enrollments/unenrolled?academicYearId=${ayId}`, { headers });
            setUnenrolledStudents(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchEnrollments = async () => {
        try {
            const params: any = {};
            if (selectedAYForEnrollment) params.academicYearId = selectedAYForEnrollment;
            if (selectedGradeForEnrollment) params.gradeId = selectedGradeForEnrollment;
            if (selectedSectionForEnrollment) params.sectionId = selectedSectionForEnrollment;
            const res = await axios.get('http://localhost:5000/api/admin/enrollments', { headers, params });
            setEnrollments(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSubmitYear = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingYearId) {
                await axios.put(`http://localhost:5000/api/admin/academic-years/${editingYearId}`, yearForm, { headers });
            } else {
                await axios.post('http://localhost:5000/api/admin/academic-years', yearForm, { headers });
            }
            setShowYearForm(false);
            setEditingYearId(null);
            setYearForm({ name: '', startDate: '', endDate: '', isActive: false });
            fetchYears();
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: `Academic year ${editingYearId ? 'updated' : 'created'} successfully!`,
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err) {
            console.error(err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to ${editingYearId ? 'update' : 'create'} academic year.`,
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
        finally { setLoading(false); }
    };

    const handleDeleteYear = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Academic Year',
            message: 'Are you sure you want to delete this academic year? This may affect all related semesters and enrollments.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://localhost:5000/api/admin/academic-years/${id}`, { headers });
                    fetchYears();
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Academic year deleted successfully!',
                        type: 'success',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } catch (err) {
                    console.error(err);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to delete academic year.',
                        type: 'danger',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                }
                finally { setConfirmModal(prev => ({ ...prev, isOpen: false })); }
            }
        });
    };

    const handleSubmitSemester = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingSemesterId) {
                await axios.put(`http://localhost:5000/api/admin/semesters/${editingSemesterId}`, semesterForm, { headers });
            } else {
                await axios.post('http://localhost:5000/api/admin/semesters', semesterForm, { headers });
            }
            setShowSemesterForm(false);
            setEditingSemesterId(null);
            setSemesterForm({ academicYearId: '', name: '', startDate: '', endDate: '', isActive: false });
            fetchSemesters();
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: `Semester ${editingSemesterId ? 'updated' : 'created'} successfully!`,
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err) {
            console.error(err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to ${editingSemesterId ? 'update' : 'create'} semester.`,
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
        finally { setLoading(false); }
    };

    const handleDeleteSemester = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Semester',
            message: 'Are you sure you want to delete this semester? This will remove all associated result calculations.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://localhost:5000/api/admin/semesters/${id}`, { headers });
                    fetchSemesters();
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Semester deleted successfully!',
                        type: 'success',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } catch (err) {
                    console.error(err);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to delete semester.',
                        type: 'danger',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                }
                finally { setConfirmModal(prev => ({ ...prev, isOpen: false })); }
            }
        });
    };

    const handleSubmitSection = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingSectionId) {
                await axios.put(`http://localhost:5000/api/admin/sections/${editingSectionId}`, sectionForm, { headers });
            } else {
                await axios.post('http://localhost:5000/api/admin/sections', sectionForm, { headers });
            }
            setShowSectionForm(false);
            setEditingSectionId(null);
            setSectionForm({ gradeId: '', name: '', academicYearId: selectedAYForSection });
            fetchSections(selectedGradeId || undefined);
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: `Section ${editingSectionId ? 'updated' : 'created'} successfully!`,
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err) {
            console.error(err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to ${editingSectionId ? 'update' : 'create'} section.`,
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
        finally { setLoading(false); }
    };

    const handleDeleteSection = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Section',
            message: 'Are you sure you want to delete this section? Students enrolled in this section will be unlinked.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://localhost:5000/api/admin/sections/${id}`, { headers });
                    fetchSections(selectedGradeId || undefined);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Section deleted successfully!',
                        type: 'success',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } catch (err) {
                    console.error(err);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to delete section.',
                        type: 'danger',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                }
                finally { setConfirmModal(prev => ({ ...prev, isOpen: false })); }
            }
        });
    };

    const handleAssignCourse = async (courseId: number) => {
        if (!selectedGradeId) return;
        try {
            await axios.post('http://localhost:5000/api/admin/grade-courses',
                {
                    gradeId: selectedGradeId,
                    courseId,
                    academicYearId: selectedAYForSection,
                    semesterId: selectedSemForCourse || null
                },
                { headers }
            );
            fetchGradeCourses();
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Course assigned successfully!',
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err) {
            console.error(err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to assign course.',
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const handleRemoveCourse = async (courseId: number) => {
        if (!selectedGradeId) return;
        try {
            await axios.delete(`http://localhost:5000/api/admin/grades/${selectedGradeId}/courses/${courseId}`, { headers });
            fetchGradeCourses(selectedGradeId);
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Course removed successfully!',
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err) {
            console.error(err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to remove course.',
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const handleEnrollStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!enrollForm.studentId || !selectedAYForEnrollment || !selectedGradeForEnrollment || !selectedSectionForEnrollment) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Information',
                message: 'Please select all fields (student, academic year, grade, and section) for enrollment.',
                type: 'warning',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }
        setLoading(true);
        try {
            if (editingEnrollmentId) {
                await axios.put(`http://localhost:5000/api/admin/enrollments/${editingEnrollmentId}`, {
                    gradeId: selectedGradeForEnrollment,
                    sectionId: selectedSectionForEnrollment,
                    status: 'Active'
                }, { headers });
                setEditingEnrollmentId(null);
            } else {
                await axios.post('http://localhost:5000/api/admin/enrollments', {
                    studentId: enrollForm.studentId,
                    academicYearId: selectedAYForEnrollment,
                    gradeId: selectedGradeForEnrollment,
                    sectionId: selectedSectionForEnrollment
                }, { headers });
            }
            setEnrollForm({ studentId: '' });
            fetchUnenrolledStudents(selectedAYForEnrollment);
            fetchEnrollments();
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: editingEnrollmentId ? "Enrollment updated successfully!" : "Student enrolled successfully!",
                type: 'success',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (err) {
            console.error(err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: `Failed to ${editingEnrollmentId ? 'update' : 'enroll'} student.`,
                type: 'danger',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        }
        finally { setLoading(false); }
    };

    const handleDeleteEnrollment = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Enrollment',
            message: 'Are you sure you want to remove this enrollment record? This will unregister the student from their current class and section.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://localhost:5000/api/admin/enrollments/${id}`, { headers });
                    fetchEnrollments();
                    fetchUnenrolledStudents(selectedAYForEnrollment);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Enrollment removed successfully!',
                        type: 'success',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } catch (err) {
                    console.error(err);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to remove enrollment.',
                        type: 'danger',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                }
                finally { setConfirmModal(prev => ({ ...prev, isOpen: false })); }
            }
        });
    };

    const handlePromote = async () => {
        const currentYear = years.find(y => y.IsActive);
        // Find next year: inactive year that starts after the current year
        const nextYear = currentYear ? years
            .filter(y => !y.IsActive && new Date(y.StartDate) >= new Date(currentYear.StartDate))
            .sort((a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime())[0] : undefined;

        if (!currentYear || !nextYear) {
            setConfirmModal({
                isOpen: true,
                title: 'Promotion Not Possible',
                message: "Ensure you have a current active year and a future inactive year defined to proceed with promotion.",
                type: 'warning',
                isSingleButton: true,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Bulk Student Promotion',
            message: `This will promote qualified students (Score ≥ 50%) from ${currentYear.Name} to ${nextYear.Name}. Note: Sections will be matched if they exist in the new year. If no matching section is found, students will be assigned to the grade with no section. Continue?`,
            type: 'warning',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const response = await axios.post('http://localhost:5000/api/admin/promotions', {
                        currentAcademicYearId: currentYear.Id,
                        nextAcademicYearId: nextYear.Id
                    }, { headers });

                    setConfirmModal({
                        isOpen: true,
                        title: 'Promotion Success',
                        message: response.data.message || "Students have been successfully processed!",
                        type: 'success',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } catch (err: any) {
                    console.error(err);
                    const errorMsg = err.response?.data?.message || "An error occurred during student promotion.";
                    setConfirmModal({
                        isOpen: true,
                        title: 'Promotion Failed',
                        message: errorMsg,
                        type: 'danger',
                        isSingleButton: true,
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="admin" />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="p-4 pb-0 flex-none z-10">
                    <Header email={email} role="admin" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pt-2">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-[#2B3674] tracking-tight flex items-center gap-3">
                            <Calendar className="text-brand-blue" size={32} />
                            Academic Management
                        </h1>
                        <p className="text-slate-500 font-medium text-lg ml-11">System-wide academic hierarchy and promotion engine.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl w-fit mb-8 shadow-sm border border-slate-100 overflow-x-auto max-w-full">
                        {[
                            { id: 'years', label: 'Years', icon: <Clock size={18} /> },
                            { id: 'semesters', label: 'Semesters', icon: <Calendar size={18} /> },
                            // { id: 'grades', label: 'Grades', icon: <GraduationCap size={18} /> },
                            { id: 'enrollment', label: 'Enrollment', icon: <UserPlus size={18} /> },
                            { id: 'backups', label: 'Backups', icon: <Database size={18} /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    setSearchParams({ tab: tab.id });
                                }}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wider whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Panels */}
                    {activeTab === 'years' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                                <div>
                                    <h2 className="text-xl font-bold text-[#2B3674]">Academic Years</h2>
                                    <p className="text-slate-400 text-sm">Define high-level periods.</p>
                                </div>
                                <button
                                    onClick={() => setShowYearForm(true)}
                                    className="bg-brand-blue text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2"
                                >
                                    <Plus size={20} /> Add Year
                                </button>
                            </div>

                            {showYearForm && (
                                <div className="bg-white p-8 rounded-[30px] shadow-xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                    <form onSubmit={handleSubmitYear} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Year Name</label>
                                            <input
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                                placeholder="e.g. 2025-2026"
                                                value={yearForm.name}
                                                onChange={e => setYearForm({ ...yearForm, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex items-end mb-4">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg border-slate-200 text-brand-blue focus:ring-brand-blue"
                                                    checked={yearForm.isActive}
                                                    onChange={e => setYearForm({ ...yearForm, isActive: e.target.checked })}
                                                />
                                                <span className="text-sm font-bold text-slate-500 group-hover:text-brand-blue transition-all">Set as Active</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                                value={yearForm.startDate ? yearForm.startDate.substring(0, 10) : ''}
                                                onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                                value={yearForm.endDate ? yearForm.endDate.substring(0, 10) : ''}
                                                onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex justify-end gap-3">
                                            <button type="button" onClick={() => { setShowYearForm(false); setEditingYearId(null); setYearForm({ name: '', startDate: '', endDate: '', isActive: false }); }} className="px-6 py-2 font-bold text-slate-400">Cancel</button>
                                            <button type="submit" className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold">{editingYearId ? 'Update Year' : 'Save Year'}</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {years.map(year => (
                                    <div key={year.Id} className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`p-3 rounded-2xl ${year.IsActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Calendar size={24} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {year.IsActive && (
                                                    <span className="px-3 py-1 bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Current</span>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingYearId(year.Id);
                                                            setYearForm({ name: year.Name, startDate: year.StartDate, endDate: year.EndDate, isActive: year.IsActive });
                                                            setShowYearForm(true);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                        title="Edit Year"
                                                    >
                                                        <Pencil size={12} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteYear(year.Id)}
                                                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                        title="Delete Year"
                                                    >
                                                        <Trash2 size={12} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-[#2B3674] mb-1">{year.Name}</h3>
                                        <p className="text-slate-400 text-sm font-medium">
                                            {year.StartDate ? new Date(year.StartDate).toLocaleDateString() : '—'}
                                            <ArrowRight size={12} className="inline mx-2" />
                                            {year.EndDate ? new Date(year.EndDate).toLocaleDateString() : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'semesters' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#2B3674]">Semesters</h2>
                                        <p className="text-slate-400 text-sm">Configure Term 1/2.</p>
                                    </div>
                                    <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
                                    <div className="hidden md:flex items-center gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter By Year:</label>
                                        <select
                                            className="bg-slate-50 border-none text-xs font-bold py-2.5 px-4 rounded-xl text-brand-blue"
                                            value={selectedAYForSemester}
                                            onChange={(e) => setSelectedAYForSemester(e.target.value)}
                                        >
                                            <option value="">All Academic Years</option>
                                            {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSemesterForm(true)}
                                    className="bg-brand-blue text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2"
                                >
                                    <Plus size={20} /> Add Semester
                                </button>
                            </div>

                            {showSemesterForm && (
                                <div className="bg-white p-8 rounded-[30px] shadow-xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                    <form onSubmit={handleSubmitSemester} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Year</label>
                                            <select
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-[#2B3674]"
                                                value={semesterForm.academicYearId}
                                                onChange={e => setSemesterForm({ ...semesterForm, academicYearId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Year</option>
                                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Name</label>
                                            <select
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-[#2B3674]"
                                                value={semesterForm.name}
                                                onChange={e => setSemesterForm({ ...semesterForm, name: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Name</option>
                                                <option value="Semester 1">Semester 1</option>
                                                <option value="Semester 2">Semester 2</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                                value={semesterForm.startDate ? semesterForm.startDate.substring(0, 10) : ''}
                                                onChange={e => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                                value={semesterForm.endDate ? semesterForm.endDate.substring(0, 10) : ''}
                                                onChange={e => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg border-slate-200 text-brand-blue"
                                                    checked={semesterForm.isActive}
                                                    onChange={e => setSemesterForm({ ...semesterForm, isActive: e.target.checked })}
                                                />
                                                <span className="text-sm font-bold text-slate-500">Active Semester</span>
                                            </label>
                                        </div>
                                        <div className="md:col-span-2 flex justify-end gap-3">
                                            <button type="button" onClick={() => { setShowSemesterForm(false); setEditingSemesterId(null); setSemesterForm({ academicYearId: '', name: '', startDate: '', endDate: '', isActive: false }); }} className="px-6 py-2 font-bold text-slate-400">Cancel</button>
                                            <button type="submit" className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold">{editingSemesterId ? 'Update Semester' : 'Save Semester'}</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Year</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Period (Start — End)</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {semesters.map(sem => (
                                            <tr key={sem.Id}>
                                                <td className="px-6 py-5 font-bold text-[#2B3674]">{sem.Name}</td>
                                                <td className="px-6 py-5 text-slate-500 font-medium">{sem.AcademicYearName}</td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                                        {sem.StartDate ? new Date(sem.StartDate).toLocaleDateString() : '—'}
                                                        <ArrowRight size={12} className="opacity-50" />
                                                        {sem.EndDate ? new Date(sem.EndDate).toLocaleDateString() : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${sem.IsActive ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                                                        {sem.IsActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingSemesterId(sem.Id);
                                                                setSemesterForm({ academicYearId: sem.AcademicYearId.toString(), name: sem.Name, startDate: sem.StartDate, endDate: sem.EndDate, isActive: sem.IsActive });
                                                                setShowSemesterForm(true);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                            title="Edit Semester"
                                                        >
                                                            <Pencil size={12} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSemester(sem.Id)}
                                                            className="flex items-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                            title="Delete Semester"
                                                        >
                                                            <Trash2 size={12} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">Delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'grades' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Grades List */}
                            <div className="space-y-6">
                                <div className="bg-white p-8 rounded-[30px] border border-slate-100 shadow-sm">
                                    <h3 className="text-xl font-bold text-[#2B3674] mb-6">Grade Navigator</h3>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                        {grades.map(grade => (
                                            <button
                                                key={grade.Id}
                                                onClick={() => {
                                                    setSelectedGradeId(grade.Id);
                                                    fetchSections(grade.Id);
                                                    fetchGradeCourses(grade.Id);
                                                }}
                                                className={`p-5 rounded-2xl border transition-all ${selectedGradeId === grade.Id ? 'bg-brand-blue border-brand-blue text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-[#2B3674] hover:border-brand-blue'}`}
                                            >
                                                <div className="text-[10px] font-black uppercase opacity-60">Grade</div>
                                                <div className="text-2xl font-black">{grade.GradeNumber}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedGradeId && (
                                    <div className="bg-white p-8 rounded-[30px] border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-[#2B3674]">Sections in Grade {grades.find(g => g.Id === selectedGradeId)?.GradeNumber}</h3>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    className="bg-slate-50 text-xs font-bold p-2 rounded-lg border-none"
                                                    value={selectedAYForSection}
                                                    onChange={(e) => {
                                                        setSelectedAYForSection(e.target.value);
                                                        fetchSections(selectedGradeId);
                                                    }}
                                                >
                                                    {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                                </select>
                                                <button onClick={() => {
                                                    setSectionForm({ ...sectionForm, gradeId: selectedGradeId.toString(), academicYearId: selectedAYForSection });
                                                    setShowSectionForm(true);
                                                }} className="p-2 bg-brand-blue text-white rounded-lg"><Plus size={16} /></button>
                                            </div>
                                        </div>

                                        {showSectionForm && (
                                            <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex-1 p-3 rounded-xl border-none outline-none font-bold text-sm"
                                                        placeholder="Section Name (e.g. A)"
                                                        value={sectionForm.name}
                                                        onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })}
                                                    />
                                                    <button onClick={handleSubmitSection} className="px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-sm">{editingSectionId ? 'Update' : 'Create'}</button>
                                                    <button onClick={() => { setShowSectionForm(false); setEditingSectionId(null); setSectionForm({ gradeId: '', name: '', academicYearId: selectedAYForSection }); }} className="px-4 py-2 text-slate-400 font-bold text-sm">Cancel</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-3">
                                            {sections.length > 0 ? sections.map(sec => (
                                                <div key={sec.Id} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-brand-blue rounded-xl font-black text-sm border border-indigo-100 uppercase tracking-widest group">
                                                    {sec.Name}
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingSectionId(sec.Id);
                                                                setSectionForm({ gradeId: sec.GradeId.toString(), name: sec.Name, academicYearId: sec.AcademicYearId?.toString() || selectedAYForSection });
                                                                setShowSectionForm(true);
                                                            }}
                                                            className="flex items-center gap-1 p-1 px-2 hover:text-brand-blue hover:bg-white rounded-md transition-all active:scale-90"
                                                        >
                                                            <Pencil size={10} />
                                                            <span className="text-[9px] font-black uppercase">Edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSection(sec.Id)}
                                                            className="flex items-center gap-1 p-1 px-2 hover:text-red-500 hover:bg-white rounded-md transition-all active:scale-90"
                                                        >
                                                            <Trash2 size={10} />
                                                            <span className="text-[9px] font-black uppercase">Del</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : <p className="text-slate-400 text-sm font-medium">No sections defined for this year.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Course Mapping */}
                            <div className="space-y-6">
                                {selectedGradeId ? (
                                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm min-h-[400px]">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-[#2B3674] flex items-center gap-2">
                                                <BookOpen className="text-brand-blue" size={24} />
                                                Curriculum Grade {grades.find(g => g.Id === selectedGradeId)?.GradeNumber}
                                            </h3>
                                            <div className="flex gap-2">
                                                <select
                                                    className="bg-slate-50 text-xs font-bold p-2 rounded-lg border-none"
                                                    value={selectedAYForSection}
                                                    onChange={(e) => {
                                                        setSelectedAYForSection(e.target.value);
                                                        fetchGradeCourses(selectedGradeId, e.target.value);
                                                    }}
                                                >
                                                    {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                                </select>
                                                <select
                                                    className="bg-slate-50 text-xs font-bold p-2 rounded-lg border-none"
                                                    value={selectedSemForCourse}
                                                    onChange={(e) => {
                                                        setSelectedSemForCourse(e.target.value);
                                                        fetchGradeCourses(selectedGradeId, selectedAYForSection, e.target.value);
                                                    }}
                                                >
                                                    <option value="">Full Year</option>
                                                    {semesters
                                                        .filter(s => s.AcademicYearId.toString() === selectedAYForSection)
                                                        .map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)
                                                    }
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex gap-2 mb-8">
                                                <select
                                                    id="course-select"
                                                    className="flex-1 p-4 rounded-[20px] bg-slate-50 border-none outline-none font-bold text-[#2B3674] text-sm"
                                                >
                                                    <option value="">Select Course to Add...</option>
                                                    {courses.filter(c => !gradeCourses.find(gc => gc.CourseId === c.CourseId)).map(c => (
                                                        <option key={c.CourseId} value={c.CourseId}>{c.CourseName} ({c.CourseCode})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById('course-select') as HTMLSelectElement;
                                                        if (el.value) handleAssignCourse(parseInt(el.value));
                                                    }}
                                                    className="bg-brand-blue text-white px-6 rounded-[20px] font-bold"
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            <div className="divide-y divide-slate-50">
                                                {gradeCourses.map(gc => (
                                                    <div key={gc.CourseId} className="py-4 flex justify-between items-center group">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-[#2B3674]">{gc.CourseName}</span>
                                                                {gc.SemesterName && (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 bg-blue-50 text-brand-blue rounded-full uppercase tracking-tighter">
                                                                        {gc.SemesterName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{gc.CourseCode}</div>
                                                            {gc.Teachers && gc.Teachers.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {gc.Teachers.map((t, idx) => (
                                                                        <span key={idx} className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                            {Object.values(t)[0]}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[9px] font-medium text-slate-300 italic mt-1">No teacher assigned</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveCourse(gc.CourseId)}
                                                            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-red-500 rounded-xl transition-all bg-slate-50 shadow-sm active:scale-95"
                                                            title="Remove Course"
                                                        >
                                                            <Trash2 size={12} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">Remove</span>
                                                        </button>
                                                    </div>
                                                ))}
                                                {gradeCourses.length === 0 && <p className="text-slate-400 text-sm font-medium py-10 text-center">No courses assigned to this grade yet.</p>}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-12 rounded-[50px] border border-slate-100 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200 animate-pulse">
                                            <LayoutDashboard size={48} />
                                        </div>
                                        <h3 className="text-xl font-black text-[#2B3674] mb-2 tracking-tight">Curriculum Designer</h3>
                                        <p className="text-slate-400 font-medium max-w-xs">Select a grade from the list to manage its sections and assigned courses.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'enrollment' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-black text-[#2B3674] mb-8 flex items-center gap-3">
                                        <UserPlus className="text-brand-blue" size={32} />
                                        Student Enrollment Portal
                                    </h2>

                                    <form onSubmit={handleEnrollStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                                        <div>
                                            <div className="flex justify-between items-center mb-2 ml-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
                                                {semesters.find(s => s.AcademicYearId.toString() === selectedAYForEnrollment && s.IsActive) && (
                                                    <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full animate-pulse capitalize">
                                                        {semesters.find(s => s.AcademicYearId.toString() === selectedAYForEnrollment && s.IsActive)?.Name} - Active
                                                    </span>
                                                )}
                                            </div>
                                            <select
                                                className="w-full bg-white p-4 rounded-2xl border-none outline-none font-bold text-[#2B3674] text-sm shadow-sm transition-all focus:ring-2 focus:ring-brand-blue"
                                                value={selectedAYForEnrollment}
                                                onChange={e => setSelectedAYForEnrollment(e.target.value)}
                                            >
                                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name} {y.IsActive ? '(Active)' : ''}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Select Grade</label>
                                            <select
                                                className="w-full bg-white p-4 rounded-2xl border-none outline-none font-bold text-[#2B3674] text-sm shadow-sm transition-all focus:ring-2 focus:ring-brand-blue"
                                                value={selectedGradeForEnrollment}
                                                onChange={e => {
                                                    setSelectedGradeForEnrollment(e.target.value);
                                                    if (e.target.value) fetchSections(parseInt(e.target.value));
                                                }}
                                            >
                                                <option value="">Select Grade</option>
                                                {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Select Section</label>
                                            <select
                                                className="w-full bg-white p-4 rounded-2xl border-none outline-none font-bold text-[#2B3674] text-sm shadow-sm transition-all focus:ring-2 focus:ring-brand-blue"
                                                value={selectedSectionForEnrollment}
                                                onChange={e => setSelectedSectionForEnrollment(e.target.value)}
                                            >
                                                <option value="">Select Section</option>
                                                {sections.filter(s => s.GradeId === parseInt(selectedGradeForEnrollment)).map(s => <option key={s.Id} value={s.Id}>Section {s.Name}</option>)}
                                            </select>
                                        </div>
                                        <button className="bg-brand-blue text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all">
                                            {editingEnrollmentId ? 'Update Enrollment' : 'Enroll Selection'}
                                        </button>
                                        {editingEnrollmentId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingEnrollmentId(null);
                                                    setEnrollForm({ studentId: '' });
                                                }}
                                                className="mt-2 text-xs font-bold text-red-500 hover:text-red-700"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}

                                        <div className="md:col-span-4 mt-4">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Choose Student</label>
                                            <select
                                                className="w-full bg-white p-4 rounded-2xl border-none outline-none font-bold text-[#2B3674] text-sm shadow-sm transition-all focus:ring-2 focus:ring-brand-blue"
                                                value={enrollForm.studentId}
                                                onChange={e => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                                            >
                                                <option value="">Search Student Identity...</option>
                                                {unenrolledStudents.map(s => <option key={s.UserId} value={s.UserId}>{s.FullName} ({s.Email})</option>)}
                                            </select>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* Enrollment List Table */}
                            <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black text-[#2B3674] flex items-center gap-3">
                                        <Users className="text-brand-blue" size={24} />
                                        <span>
                                            Active Enrollments ({enrollments.length})
                                            {selectedGradeForEnrollment && (
                                                <span className="text-slate-400 text-sm font-bold ml-2">
                                                    &mdash; Grade {grades.find(g => g.Id.toString() === selectedGradeForEnrollment)?.GradeNumber}
                                                    {selectedSectionForEnrollment && ` · Section ${sections.find(s => s.Id.toString() === selectedSectionForEnrollment)?.Name}`}
                                                </span>
                                            )}
                                        </span>
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade / Section</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {paginatedEnrollments.map(en => (
                                                <tr key={en.Id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-[#2B3674]">{en.StudentName}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{en.StudentEmail}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-lg text-xs font-black uppercase">
                                                            Grade {en.GradeNumber} &mdash; {en.SectionName}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${en.Status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {en.Status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingEnrollmentId(en.Id);
                                                                    setSelectedGradeForEnrollment(en.GradeId.toString());
                                                                    setSelectedSectionForEnrollment(en.SectionId.toString());
                                                                    setEnrollForm({ studentId: en.StudentId.toString() });
                                                                    fetchSections(en.GradeId);
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                                title="Edit Enrollment"
                                                            >
                                                                <Pencil size={12} />
                                                                <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEnrollment(en.Id)}
                                                                className="flex items-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                                title="Remove Enrollment"
                                                            >
                                                                <Trash2 size={12} />
                                                                <span className="text-[10px] font-black uppercase tracking-wider">Remove</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {enrollments.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                                                        No enrollment records found for the selected filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination for Enrollments */}
                                {enrollments.length > 0 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 pt-8 border-t border-slate-50">
                                        <p className="text-xs font-bold text-slate-400">
                                            Showing {((enrollmentPage - 1) * enrollmentPerPage) + 1}–{Math.min(enrollmentPage * enrollmentPerPage, enrollments.length)} of {enrollments.length} enrollments
                                        </p>

                                        {totalEnrollmentPages > 1 && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEnrollmentPage(Math.max(1, enrollmentPage - 1))}
                                                    disabled={enrollmentPage === 1}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-slate-50 disabled:opacity-30 transition-all border border-slate-100 shadow-sm"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    {getEnrollmentPageNumbers().map((p) => (
                                                        <button
                                                            key={p}
                                                            onClick={() => setEnrollmentPage(p)}
                                                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${enrollmentPage === p
                                                                ? 'border-brand-blue text-brand-blue bg-white shadow-lg shadow-blue-500/10'
                                                                : 'border-slate-100 text-slate-400 hover:text-brand-blue hover:border-brand-blue/30'
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => setEnrollmentPage(Math.min(totalEnrollmentPages, enrollmentPage + 1))}
                                                    disabled={enrollmentPage === totalEnrollmentPages}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-slate-50 disabled:opacity-30 transition-all border border-slate-100 shadow-sm"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="relative">
                                            <button
                                                onClick={() => setEnrollmentPerPageOpen(!enrollmentPerPageOpen)}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-100 text-xs font-black text-[#2B3674] hover:border-brand-blue hover:shadow-md transition-all shadow-sm"
                                            >
                                                {enrollmentPerPage} / page
                                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${enrollmentPerPageOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {enrollmentPerPageOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-300">
                                                    {[10, 20, 50, 100].map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => { setEnrollmentPerPage(size); setEnrollmentPage(1); setEnrollmentPerPageOpen(false); }}
                                                            className={`w-full text-left px-5 py-3 text-xs font-black transition-all ${enrollmentPerPage === size
                                                                ? 'text-brand-blue bg-blue-50'
                                                                : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue'
                                                                }`}
                                                        >
                                                            {size} Per Page
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stats Summary */}
                            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-[#111C44] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-all duration-1000"></div>
                                    <Users className="mb-4 opacity-40" size={32} />
                                    <div className="text-3xl font-black mb-1">{unenrolledStudents.length}</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Unenrolled Students</div>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                                    <GraduationCap className="mb-4 text-brand-blue opacity-20" size={32} />
                                    <div className="text-3xl font-black text-[#2B3674] mb-1">{grades.length}</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Grade Levels</div>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-brand-blue/30 transition-all">
                                    <School className="mb-4 text-brand-blue opacity-20" size={32} />
                                    <div className="text-3xl font-black text-[#2B3674] mb-1">{sections.length}</div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Sections</div>
                                </div>
                            </div> */}
                        </div>
                    )}

                    {activeTab === 'results' && (
                        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-300 space-y-8 pb-20">
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                                        <Trophy size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Batch Result Calculations</h2>
                                        <p className="text-slate-400 text-sm font-medium">Process weighted aggregates and rankings across the system.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2B3674]/50 ml-1">Process for Academic Year</label>
                                        <select
                                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-[#2B3674] focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                            value={selectedAYForEnrollment}
                                            onChange={(e) => setSelectedAYForEnrollment(e.target.value)}
                                        >
                                            {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2B3674]/50 ml-1">Process for Semester</label>
                                        <select
                                            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-[#2B3674] focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                            value={selectedSemesterForResults}
                                            onChange={(e) => setSelectedSemesterForResults(e.target.value)}
                                        >
                                            <option value="">Select Semester</option>
                                            {semesters.filter(s => s.AcademicYearId === parseInt(selectedAYForEnrollment)).map(s => (
                                                <option key={s.Id} value={s.Id}>{s.Name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Action Card 1 */}
                                    <div className="bg-slate-50 p-6 rounded-[30px] border border-slate-100 hover:border-brand-blue/30 transition-all group">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-blue shadow-sm mb-4">
                                            <BookOpen size={20} />
                                        </div>
                                        <h3 className="font-black text-[#2B3674] mb-2 uppercase tracking-tight text-sm">Course Totals</h3>
                                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">Aggregates all exams and assessments into a final weighted course percentage.</p>
                                        <button
                                            onClick={() => {
                                                if (!selectedSemesterForResults) {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: 'Selection Required',
                                                        message: 'Please select a semester before processing course totals.',
                                                        type: 'warning',
                                                        isSingleButton: true,
                                                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                    });
                                                    return;
                                                }
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: 'Process Course Totals',
                                                    message: 'This will aggregate all student marks for the selected semester into final course totals. This process might take a few moments. Continue?',
                                                    type: 'info',
                                                    onConfirm: async () => {
                                                        setLoading(true);
                                                        try {
                                                            await axios.post('http://localhost:5000/api/admin/calculate-weighted-course-totals',
                                                                { academicYearId: selectedAYForEnrollment, semesterId: selectedSemesterForResults }, { headers });
                                                            fetchProcessingStatus();
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Success',
                                                                message: 'Course totals calculated successfully!',
                                                                type: 'success',
                                                                isSingleButton: true,
                                                                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                            });
                                                        } catch (err) {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Error',
                                                                message: 'Error processing calculations.',
                                                                type: 'danger',
                                                                isSingleButton: true,
                                                                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                            });
                                                        }
                                                        finally { setLoading(false); }
                                                    }
                                                });
                                            }}
                                            className={`w-full py-3 ${(!selectedAYForEnrollment || !selectedSemesterForResults) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-blue text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02]'} rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all`}
                                            disabled={!selectedAYForEnrollment || !selectedSemesterForResults}
                                        >
                                            {processingStatus.courseTotalsCalculated ? 'Recalculate Totals' : 'Process Course Totals'}
                                        </button>
                                    </div>

                                    {/* Action Card 2 */}
                                    <div className={`bg-slate-50 p-6 rounded-[30px] border border-slate-100 transition-all group ${!processingStatus.courseTotalsCalculated ? 'opacity-60' : 'hover:border-amber-500/30'}`}>
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm mb-4">
                                            <Trophy size={20} />
                                        </div>
                                        <h3 className="font-black text-[#2B3674] mb-2 uppercase tracking-tight text-sm">Semester Ranks</h3>
                                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">Calculates class, grade, and school rankings based on semester averages.</p>
                                        <button
                                            onClick={() => {
                                                if (!selectedSemesterForResults) {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: 'Selection Required',
                                                        message: 'Please select a semester before processing semester ranks.',
                                                        type: 'warning',
                                                        isSingleButton: true,
                                                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                    });
                                                    return;
                                                }
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: 'Process Semester Ranks',
                                                    message: 'This will calculate student rankings based on their averages. Existing rankings for this period will be updated. Continue?',
                                                    type: 'warning',
                                                    onConfirm: async () => {
                                                        setLoading(true);
                                                        try {
                                                            await axios.post('http://localhost:5000/api/admin/calculate-semester-rankings',
                                                                { academicYearId: selectedAYForEnrollment, semesterId: selectedSemesterForResults }, { headers });
                                                            fetchProcessingStatus();
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Success',
                                                                message: 'Rankings calculated successfully!',
                                                                type: 'success',
                                                                isSingleButton: true,
                                                                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                            });
                                                        } catch (err) {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Error',
                                                                message: 'Error processing rankings.',
                                                                type: 'danger',
                                                                isSingleButton: true,
                                                                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                            });
                                                        }
                                                        finally { setLoading(false); }
                                                    }
                                                });
                                            }}
                                            className={`w-full py-3 ${!processingStatus.courseTotalsCalculated ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02]'} rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all`}
                                            disabled={!processingStatus.courseTotalsCalculated}
                                        >
                                            {processingStatus.ranksCalculated ? 'Update Ranks' : 'Process Ranks'}
                                        </button>
                                    </div>

                                    {/* Action Card 3 */}
                                    <div className={`bg-slate-50 p-6 rounded-[30px] border border-slate-100 transition-all group ${processingStatus.rankingsDoneCount < 2 ? 'opacity-60' : 'hover:border-emerald-500/30'}`}>
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm mb-4">
                                            <Award size={20} />
                                        </div>
                                        <h3 className="font-black text-[#2B3674] mb-2 uppercase tracking-tight text-sm">Final Year Results</h3>
                                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">Computes global yearly averages and final placement for the entire year.</p>
                                        <button
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: 'Process Final Year Results',
                                                    message: 'CRITICAL: This will compute the global yearly averages and final placements for ALL students in the selected academic year. This should only be done after all semester marks are finalized. Continue?',
                                                    type: 'danger',
                                                    onConfirm: async () => {
                                                        setLoading(true);
                                                        try {
                                                            await axios.post('http://localhost:5000/api/admin/calculate-final-year-results',
                                                                { academicYearId: selectedAYForEnrollment }, { headers });
                                                            fetchProcessingStatus();
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Success',
                                                                message: 'Final year results and ranks calculated!',
                                                                type: 'success',
                                                                isSingleButton: true,
                                                                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                            });
                                                        } catch (err) {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Error',
                                                                message: 'Error processing final results.',
                                                                type: 'danger',
                                                                isSingleButton: true,
                                                                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                            });
                                                        }
                                                        finally { setLoading(false); }
                                                    }
                                                });
                                            }}
                                            className={`w-full py-3 ${processingStatus.rankingsDoneCount < 2 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02]'} rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all`}
                                            disabled={processingStatus.rankingsDoneCount < 2}
                                        >
                                            {processingStatus.finalYearCalculated ? 'Update Final Year' : 'Process Final Year'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'promotion' && (
                        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
                            <div className="relative bg-white p-8 rounded-3xl shadow-lg border border-slate-100 overflow-hidden">

                                {/* Soft Background Accent */}
                                <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-blue/5 rounded-full blur-3xl"></div>

                                <div className="relative z-10 text-center">

                                    {/* Icon */}
                                    <div className="w-16 h-16 mx-auto mb-6
                      rounded-2xl bg-indigo-50
                      flex items-center justify-center
                      shadow-md">
                                        <TrendingUp size={26} className="text-brand-blue" />
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-2xl font-semibold text-[#2B3674] mb-2">
                                        Student Promotion
                                    </h2>

                                    {/* Description */}
                                    <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                                        Students with average score
                                        <span className="text-green-600 font-semibold"> ≥ 50%</span>
                                        will be promoted to the next academic year.
                                    </p>

                                    {/* Year Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">

                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                                Current Year
                                            </p>
                                            <p className="font-semibold text-[#2B3674]">
                                                {years.find(y => y.IsActive)?.Name || 'None Active'}
                                            </p>
                                        </div>

                                        <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-indigo-200 mb-1">
                                                Target Year
                                            </p>
                                            <p className="font-semibold">
                                                {(() => {
                                                    const cur = years.find(y => y.IsActive);
                                                    const next = cur ? years
                                                        .filter(y => !y.IsActive && new Date(y.StartDate) >= new Date(cur.StartDate))
                                                        .sort((a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime())[0] : null;
                                                    return next?.Name || 'Not Defined';
                                                })()}
                                            </p>
                                        </div>

                                    </div>

                                    {/* Warning */}
                                    <div className="flex items-start gap-3
                      bg-amber-50 border border-amber-100
                      p-4 rounded-2xl mb-8 text-left">

                                        <div className="p-2 bg-amber-500 rounded-lg text-white">
                                            <Clock size={18} />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">
                                                Final marks must be verified.
                                            </p>
                                            <p className="text-xs text-amber-700/80">
                                                Promotion creates permanent historical records.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePromote}
                                        disabled={loading || !processingStatus.finalYearCalculated || processingStatus.rankingsDoneCount < 2 || !years.some(y => !y.IsActive)}
                                        className={`
                                            inline-flex items-center gap-2
                                            px-8 py-4
                                            rounded-2xl
                                            text-sm font-bold
                                            ${loading || !processingStatus.finalYearCalculated || processingStatus.rankingsDoneCount < 2 || !years.some(y => !y.IsActive)
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                                : 'bg-brand-blue text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95'}
                                            transition-all duration-300
                                        `}
                                    >
                                        {loading ? (
                                            <Loader className="animate-spin" size={18} />
                                        ) : (
                                            <>
                                                {!years.some(y => !y.IsActive) ? (
                                                    <span className="flex items-center gap-2"><AlertCircle size={16} /> Next Year Missing</span>
                                                ) : (
                                                    processingStatus.rankingsDoneCount < 2 ? (
                                                        <span className="flex items-center gap-2"><Clock size={16} /> 2 Semesters Required</span>
                                                    ) : (
                                                        !processingStatus.finalYearCalculated ? (
                                                            <span className="flex items-center gap-2"><Trophy size={16} /> Results Pending</span>
                                                        ) : (
                                                            'Promote Qualified Students'
                                                        )
                                                    )
                                                )}
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>

                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'backups' && (
                        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 mb-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-[#2B3674] tracking-tight mb-1">System Backups</h2>
                                        <p className="text-slate-500 text-sm">Manage database backups, automated schedules, and data recovery.</p>
                                    </div>
                                    <button
                                        onClick={handleManualBackup}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Database className="animate-spin" size={18} /> : <Database size={18} />}
                                        Run Full Backup
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-2 text-[#2B3674]">
                                            <Calendar size={18} />
                                            <span className="font-bold text-sm uppercase tracking-wider">Scheduled Full</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Every day at 12:00 AM</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-2 text-[#2B3674]">
                                            <Clock size={18} />
                                            <span className="font-bold text-sm uppercase tracking-wider">Scheduled Diff</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Every 6 hours</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 mb-2 text-[#2B3674]">
                                            <HardDrive size={18} />
                                            <span className="font-bold text-sm uppercase tracking-wider">Retention</span>
                                        </div>
                                        <p className="text-xs text-slate-500">30-day automatic cleanup</p>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-[20px] border border-slate-100">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Type</th>
                                                <th className="px-6 py-4">File Name</th>
                                                <th className="px-6 py-4">Size</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Created At</th>
                                                <th className="px-6 py-4">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {backups.map((log) => (
                                                <tr key={log.Id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${log.BackupType === 'Full' ? 'bg-blue-100 text-blue-600' :
                                                            log.BackupType === 'Differential' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {log.BackupType}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-[#2B3674] text-xs max-w-[200px] truncate">{log.FileName}</td>
                                                    <td className="px-6 py-4 text-xs text-slate-500">{(log.FileSize / (1024 * 1024)).toFixed(2)} MB</td>
                                                    <td className="px-6 py-4">
                                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-500">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                            {log.Status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(log.CreatedAt).toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => handleRestore(log.FileName)}
                                                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors tooltip"
                                                            title="Restore this backup"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {backups.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No backup logs found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-[30px] p-6 border border-amber-100 flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm mb-1 uppercase tracking-tight">Security & Performance Reminder</h4>
                                    <p className="text-xs text-amber-800/80 leading-relaxed">
                                        Backups are stored securely in the system storage path. Restoring a database is a destructive action and will overwrite all current data.
                                        Ensure all students have finished current exams before performing a manual restore.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirmation Modal */}
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2B3674]/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 max-w-md w-full p-10 animate-in zoom-in-95 duration-300">
                            <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center mb-8 mx-auto shadow-lg ${confirmModal.type === 'danger' ? 'bg-red-50 text-red-500 shadow-red-500/10' :
                                confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-500/10' :
                                    confirmModal.type === 'success' ? 'bg-emerald-50 text-emerald-500 shadow-emerald-500/10' :
                                        'bg-brand-blue/5 text-brand-blue shadow-blue-500/10'
                                }`}>
                                {confirmModal.type === 'danger' ? <AlertCircle size={40} /> :
                                    confirmModal.type === 'warning' ? <AlertCircle size={40} /> :
                                        confirmModal.type === 'success' ? <Trophy size={40} /> :
                                            <BookOpen size={40} />}
                            </div>

                            <h3 className="text-2xl font-black text-[#2B3674] text-center mb-4 leading-tight">
                                {confirmModal.title}
                            </h3>

                            <p className="text-slate-500 font-medium text-center mb-10 leading-relaxed">
                                {confirmModal.message}
                            </p>

                            <div className="flex flex-col gap-3">
                                {!confirmModal.isSingleButton ? (
                                    <>
                                        <button
                                            onClick={() => confirmModal.onConfirm?.()}
                                            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${confirmModal.type === 'danger' ? 'bg-red-500 shadow-red-500/20' :
                                                confirmModal.type === 'warning' ? 'bg-amber-500 shadow-amber-500/20' :
                                                    'bg-brand-blue shadow-blue-500/20'
                                                }`}
                                        >
                                            Yes, Proceed
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${confirmModal.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                            confirmModal.type === 'danger' ? 'bg-red-500 shadow-red-500/20' :
                                                'bg-brand-blue shadow-blue-500/20'
                                            }`}
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AcademicManagement;
