import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { School, Plus, ChevronRight, Users, Edit2, Trash2, X, UserPlus, ArrowLeft, Mail, Save, ChevronLeft, ChevronDown, MoreHorizontal, Loader } from 'lucide-react';

interface ClassData {
    ClassId: number;
    GradeName: string;
    Section: string | null;
    StudentCount: number;
    TeacherName: string | null;
    TeacherId: number | null;
    IsFullYear?: number;
}

interface Student {
    UserId: number;
    FullName: string;
    Email: string;
    ProfileImage?: string; // Enhanced with profile image support
}

const ManageClasses = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';

    const [classes, setClasses] = useState<ClassData[]>([]);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'students'>('list');
    const [editingClass, setEditingClass] = useState<ClassData | null>(null);
    const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
    const [classForm, setClassForm] = useState({ gradeName: '', section: '' });
    const [classStudents, setClassStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<{ Id: number; GradeNumber: number }[]>([]);
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentForm, setStudentForm] = useState({ fullName: '', email: '', classId: '' });
    const [isStudentEditModalOpen, setIsStudentEditModalOpen] = useState(false);
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Class List Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(12);
    const [perPageOpen, setPerPageOpen] = useState(false);

    // Student List Pagination state
    const [studentCurrentPage, setStudentCurrentPage] = useState(1);
    const [studentPerPage, setStudentPerPage] = useState(6); // Adjusted for better table visibility
    const [studentPerPageOpen, setStudentPerPageOpen] = useState(false);


    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/classes', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Sort classes by Grade Number (numerically) and then by Section (alphabetically)
            const sortedClasses = response.data.sort((a: ClassData, b: ClassData) => {
                const gradeNumA = parseInt(a.GradeName.replace(/\D/g, '')) || 0;
                const gradeNumB = parseInt(b.GradeName.replace(/\D/g, '')) || 0;

                if (gradeNumA !== gradeNumB) {
                    return gradeNumA - gradeNumB;
                }

                const sectionA = a.Section || '';
                const sectionB = b.Section || '';
                return sectionA.localeCompare(sectionB);
            });

            setClasses(sortedClasses);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setLoading(false);
        }
    };

    const fetchAvailableStudents = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/students/unassigned', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllStudents(response.data);
        } catch (err) {
            console.error('Error fetching available students:', err);
        }
    };

    const fetchGrades = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/grades', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGrades(response.data);
        } catch (err) {
            console.error('Error fetching grades:', err);
        }
    };

    useEffect(() => {
        fetchClasses();
        fetchAvailableStudents();
        fetchGrades();
    }, []);

    const handleOpenClassModal = (cls: ClassData | null = null) => {
        setFormMessage(null);
        if (cls) {
            setEditingClass(cls);
            setClassForm({ gradeName: cls.GradeName, section: cls.Section || '' });
        } else {
            setEditingClass(null);
            setClassForm({ gradeName: '', section: '' });
        }
        setIsClassModalOpen(true);
    };

    const handleClassSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingClass) {
                await axios.put(`http://localhost:5000/api/admin/classes/${editingClass.ClassId}`, classForm, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (selectedClass && selectedClass.ClassId === editingClass.ClassId) {
                    setSelectedClass({ ...selectedClass, GradeName: classForm.gradeName, Section: classForm.section });
                }
            } else {
                await axios.post('http://localhost:5000/api/admin/classes', classForm, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchClasses();
            setFormMessage({ type: 'success', text: editingClass ? 'Class updated successfully!' : 'Class created successfully!' });

            // Auto close after 1.5s on success
            setTimeout(() => {
                setIsClassModalOpen(false);
                setFormMessage(null);
            }, 1500);
        } catch (err: any) {
            console.error('Error saving class:', err);
            const errorMsg = err.response?.data?.message || 'Error saving class. Please try again.';
            setFormMessage({ type: 'error', text: errorMsg });
        }
    };

    const handleDeleteClass = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this class?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/admin/classes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchClasses();
        } catch (err) {
            console.error('Error deleting class:', err);
        }
    };

    const handleEnterStudentManagement = async (cls: ClassData) => {
        setSelectedClass(cls);
        setStudentCurrentPage(1); // Reset student pagination
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`http://localhost:5000/api/admin/classes/${cls.ClassId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClassStudents(response.data);
            setViewMode('students');
        } catch (err) {
            console.error('Error fetching class students:', err);
        }
    };

    const handleAddStudent = async () => {
        if (!selectedStudentToAdd || !selectedClass) return;
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/admin/classes/assign', {
                studentId: selectedStudentToAdd,
                classId: selectedClass.ClassId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const response = await axios.get(`http://localhost:5000/api/admin/classes/${selectedClass.ClassId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClassStudents(response.data);

            setSelectedStudentToAdd('');
            fetchClasses();
            fetchAvailableStudents();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error adding student');
        }
    };

    const handleRemoveStudent = async (studentId: number) => {
        if (!selectedClass || !window.confirm('Remove student from this class?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5000/api/admin/classes/remove-student', {
                studentId,
                classId: selectedClass.ClassId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const response = await axios.get(`http://localhost:5000/api/admin/classes/${selectedClass.ClassId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClassStudents(response.data);

            fetchClasses();
            fetchAvailableStudents();
        } catch (err) {
            console.error('Error removing student:', err);
        }
    };

    const handleOpenStudentEdit = (student: Student) => {
        setEditingStudent(student);
        setStudentForm({
            fullName: student.FullName,
            email: student.Email,
            classId: selectedClass ? String(selectedClass.ClassId) : ''
        });
        setIsStudentEditModalOpen(true);
    };

    const handleStudentEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent || !selectedClass) return;
        const token = localStorage.getItem('token');
        try {
            await axios.put(`http://localhost:5000/api/admin/users/${editingStudent.UserId}`, {
                fullName: studentForm.fullName,
                email: studentForm.email,
                role: 'Student',
                status: 'Active'
            }, { headers: { Authorization: `Bearer ${token}` } });

            const newClassId = studentForm.classId;
            if (newClassId && Number(newClassId) !== selectedClass.ClassId) {
                await axios.post('http://localhost:5000/api/admin/classes/remove-student', {
                    studentId: editingStudent.UserId,
                    classId: selectedClass.ClassId
                }, { headers: { Authorization: `Bearer ${token}` } });
                await axios.post('http://localhost:5000/api/admin/classes/assign', {
                    studentId: editingStudent.UserId,
                    classId: Number(newClassId)
                }, { headers: { Authorization: `Bearer ${token}` } });
                setClassStudents(prev => prev.filter(s => s.UserId !== editingStudent.UserId));
                fetchClasses();
                fetchAvailableStudents();
            } else {
                setClassStudents(prev => prev.map(s =>
                    s.UserId === editingStudent.UserId
                        ? { ...s, FullName: studentForm.fullName, Email: studentForm.email }
                        : s
                ));
            }

            setIsStudentEditModalOpen(false);
            setEditingStudent(null);
        } catch (err) {
            console.error('Error updating student:', err);
            alert('Failed to save changes. Please try again.');
        }
    };

    // Class List Pagination logic
    const totalPages = Math.ceil(classes.length / perPage);
    const paginatedClasses = classes.slice((currentPage - 1) * perPage, currentPage * perPage);

    const paginate = (page: number) => {
        setCurrentPage(page);
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    };

    // Student List Pagination logic
    const studentTotalPages = Math.ceil(classStudents.length / studentPerPage);
    const paginatedStudents = classStudents.slice((studentCurrentPage - 1) * studentPerPage, studentCurrentPage * studentPerPage);

    const paginateStudents = (page: number) => {
        setStudentCurrentPage(page);
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getStudentPageNumbers = (): (number | 'ellipsis')[] => {
        const pages: (number | 'ellipsis')[] = [];
        if (studentTotalPages <= 7) {
            for (let i = 1; i <= studentTotalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (studentCurrentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, studentCurrentPage - 1);
            const end = Math.min(studentTotalPages - 1, studentCurrentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (studentCurrentPage < studentTotalPages - 2) pages.push('ellipsis');
            pages.push(studentTotalPages);
        }
        return pages;
    };

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden font-display">
            <Sidebar role="admin" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={email} role="admin" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">
                    {viewMode === 'list' ? (
                        <div className="w-full">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                                <div>
                                    <h1 className="text-4xl font-black text-[#2B3674] tracking-tight">Class Management</h1>
                                    <p className="text-slate-500 mt-1 font-medium text-lg">Organize sections and student enrollments.</p>
                                </div>
                                <button
                                    onClick={() => handleOpenClassModal()}
                                    className="bg-brand-blue text-white px-10 py-5 rounded-[22px] font-black shadow-2xl shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95 group uppercase tracking-widest text-xs"
                                >
                                    <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                                    New Class Instance
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[50px] shadow-sm border border-slate-100">
                                    <Loader size={40} className="animate-spin text-brand-blue mb-4" />
                                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Classes...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                        {paginatedClasses.map((cls) => (
                                            <div
                                                key={cls.ClassId}
                                                className="relative flex flex-col bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                                            >
                                                {/* Soft Accent */}
                                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all"></div>

                                                {/* Header */}
                                                <div className="flex justify-between items-center mb-2 relative z-10">

                                                    <div className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all duration-200">
                                                        <School size={16} />
                                                    </div>

                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenClassModal(cls); }}
                                                            className="p-1.5 rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all duration-200"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.ClassId); }}
                                                            className="p-1.5 rounded-md text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all duration-200"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-sm font-semibold text-[#2B3674] truncate">
                                                    {cls.GradeName}
                                                </h3>

                                                {/* Section + Teacher */}
                                                <div className="mt-1 mb-3 space-y-0.5">
                                                    {cls.Section && (
                                                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                                            Sec {cls.Section}
                                                        </span>
                                                    )}
                                                    <div
                                                        onClick={(e) => {
                                                            if (cls.TeacherId) {
                                                                e.stopPropagation();
                                                                navigate(`/admin/assignments/teachers?search=${encodeURIComponent(cls.TeacherName || '')}`);
                                                            }
                                                        }}
                                                        className={`text-[11px] font-medium truncate flex items-center gap-1.5 transition-all ${cls.TeacherId ? 'text-brand-blue hover:text-blue-700 cursor-pointer' : 'text-slate-400'}`}
                                                    >
                                                        {cls.TeacherName || 'No Teacher'}
                                                        {cls.IsFullYear === 1 && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-brand-blue font-black uppercase tracking-tighter border border-blue-100/50">Full Year</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Student Count */}
                                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">

                                                    <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-brand-blue shadow-sm">
                                                        <Users size={12} />
                                                    </div>

                                                    <div>
                                                        <p className="text-[10px] text-slate-400">Students</p>
                                                        <p className="text-xs font-semibold text-[#2B3674]">
                                                            {cls.StudentCount}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Manage Button */}
                                                <button
                                                    onClick={() => handleEnterStudentManagement(cls)}
                                                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[#111C44] text-white hover:bg-brand-blue transition-all duration-200 flex items-center justify-center gap-1"
                                                >
                                                    Manage
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {classes.length > 0 && (
                                        <div className="flex flex-col sm:flex-row justify-between items-center mt-16 gap-6 pb-12">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-white hover:border-brand-blue/20 transition-all border border-slate-100 disabled:opacity-30 disabled:hover:bg-transparent shadow-sm"
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>

                                                <div className="flex items-center gap-2 mx-2">
                                                    {getPageNumbers().map((p, idx) =>
                                                        p === 'ellipsis' ? (
                                                            <div key={`e-${idx}`} className="w-12 h-12 flex items-center justify-center text-slate-300">
                                                                <MoreHorizontal size={14} />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                key={p}
                                                                onClick={() => paginate(p)}
                                                                className={`w-12 h-12 rounded-2xl font-black text-sm transition-all border ${currentPage === p
                                                                    ? 'border-brand-blue text-brand-blue bg-white shadow-lg shadow-blue-500/10'
                                                                    : 'border-slate-100 text-slate-400 hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white'
                                                                    }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        )
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages || totalPages === 0}
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-white hover:border-brand-blue/20 transition-all border border-slate-100 disabled:opacity-30 disabled:hover:bg-transparent shadow-sm"
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setPerPageOpen(!perPageOpen)}
                                                    className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-slate-100 text-xs font-black text-[#2B3674] hover:border-brand-blue hover:shadow-lg hover:shadow-blue-500/5 transition-all shadow-sm"
                                                >
                                                    {perPage} / page
                                                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${perPageOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                {perPageOpen && (
                                                    <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-[30px] shadow-2xl border border-slate-50 py-3 z-[60] animate-in slide-in-from-top-2 duration-300">
                                                        {[12, 24, 48, 96].map((size) => (
                                                            <button
                                                                key={size}
                                                                onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                                className={`w-full text-left px-8 py-4 text-xs font-black transition-all ${perPage === size
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
                                </>
                            )}
                        </div>
                    ) : (
                        selectedClass && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full mx-auto px-2 sm:px-0">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className="flex items-center gap-3 text-slate-400 hover:text-brand-blue transition-all mb-6 font-black uppercase tracking-widest text-[10px] bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 w-fit active:scale-95"
                                >
                                    <ArrowLeft size={18} />
                                    Return to Directory
                                </button>

                                {/* Class Header Card */}
                                <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[30px] sm:rounded-[40px] shadow-sm border border-slate-50 mb-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-brand-blue/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>

                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                                        {/* Class Info */}
                                        <div className="flex items-center gap-4">
                                            <div className="bg-brand-blue p-4 sm:p-5 rounded-[20px] sm:rounded-[28px] text-white shadow-xl shadow-blue-500/30">
                                                <School size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h1 className="text-xl sm:text-2xl font-black text-[#2B3674] tracking-tight">
                                                        {selectedClass.GradeName}
                                                        {selectedClass.Section && <span className="text-brand-blue ml-2">Section {selectedClass.Section}</span>}
                                                    </h1>
                                                    <button
                                                        onClick={() => handleOpenClassModal(selectedClass)}
                                                        className="p-2 text-slate-300 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all"
                                                        title="Edit Class"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">{classStudents.length} Students Currently Enrolled</p>
                                            </div>
                                        </div>

                                        {/* Enroll Student */}
                                        <div className="flex items-center gap-3 w-full lg:w-auto">
                                            <div className="relative flex-1 lg:w-72 xl:w-80">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue">
                                                    <UserPlus size={18} />
                                                </div>
                                                <select
                                                    className="w-full pl-11 pr-8 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all font-bold text-[#2B3674] appearance-none cursor-pointer text-sm"
                                                    value={selectedStudentToAdd}
                                                    onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                                                >
                                                    <option value="">Enroll Student...</option>
                                                    {allStudents.map(s => (
                                                        <option key={s.UserId} value={s.UserId}>{s.FullName}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                                    <ChevronDown size={16} />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleAddStudent}
                                                disabled={!selectedStudentToAdd}
                                                className="bg-brand-blue text-white px-6 sm:px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-40 disabled:shadow-none active:scale-95 uppercase tracking-widest text-[10px] whitespace-nowrap"
                                            >
                                                Enroll
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Student List — Desktop Table / Mobile Cards */}
                                <div className="bg-white rounded-[30px] sm:rounded-[40px] shadow-sm border border-slate-50 overflow-hidden mb-6">

                                    {/* Desktop Table (hidden on mobile) */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Student</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Email</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {paginatedStudents.map((s) => (
                                                    <tr key={s.UserId} className="hover:bg-blue-50/30 transition-all group">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative">
                                                                    <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 border-2 border-white shadow-lg">
                                                                        <img
                                                                            src={s.ProfileImage ? `http://localhost:5000/${s.ProfileImage}` : `https://i.pravatar.cc/150?u=${s.UserId}`}
                                                                            alt={s.FullName}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.FullName)}&background=4481eb&color=fff`;
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-[#2B3674] text-base leading-tight">{s.FullName}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Active Student</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-50 w-fit px-4 py-2 rounded-xl border border-slate-100/50">
                                                                <Mail size={14} className="text-brand-blue opacity-40" />
                                                                <span className="text-sm italic">{s.Email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-2 transition-all">
                                                                <button
                                                                    onClick={() => handleOpenStudentEdit(s)}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                                    title="Edit Student"
                                                                >
                                                                    <Edit2 size={12} />
                                                                    <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveStudent(s.UserId)}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                                    title="Remove Student"
                                                                >
                                                                    <Trash2 size={12} />
                                                                    <span className="text-[10px] font-black uppercase tracking-wider">Remove</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards (hidden on desktop) */}
                                    <div className="md:hidden divide-y divide-slate-50">
                                        {paginatedStudents.map((s) => (
                                            <div key={s.UserId} className="p-4 sm:p-5 flex items-center gap-3 hover:bg-blue-50/30 transition-all">
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 border-2 border-white shadow-lg">
                                                        <img
                                                            src={s.ProfileImage ? `http://localhost:5000/${s.ProfileImage}` : `https://i.pravatar.cc/150?u=${s.UserId}`}
                                                            alt={s.FullName}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.FullName)}&background=4481eb&color=fff`;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-[#2B3674] text-sm truncate">{s.FullName}</p>
                                                    <p className="text-xs text-slate-400 font-medium truncate italic">{s.Email}</p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleOpenStudentEdit(s)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                                                    >
                                                        <Edit2 size={11} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveStudent(s.UserId)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"
                                                    >
                                                        <Trash2 size={11} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Del</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {classStudents.length === 0 && (
                                        <div className="p-16 sm:p-20 text-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse text-slate-200">
                                                <Users size={40} />
                                            </div>
                                            <h3 className="text-xl font-black text-[#2B3674] tracking-tight">Roster Empty</h3>
                                            <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto leading-relaxed">This class is ready for enrollment. Select a student from the dropdown above to begin.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {classStudents.length > 0 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-8">
                                        <p className="text-xs font-bold text-slate-400">
                                            Showing {((studentCurrentPage - 1) * studentPerPage) + 1}–{Math.min(studentCurrentPage * studentPerPage, classStudents.length)} of {classStudents.length} students
                                        </p>

                                        {studentTotalPages > 1 && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => paginateStudents(Math.max(1, studentCurrentPage - 1))}
                                                    disabled={studentCurrentPage === 1}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-white hover:border-brand-blue/20 transition-all border border-slate-100 disabled:opacity-30 shadow-sm"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    {getStudentPageNumbers().map((p, idx) =>
                                                        p === 'ellipsis' ? (
                                                            <div key={`se-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                                <MoreHorizontal size={14} />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                key={p}
                                                                onClick={() => paginateStudents(p)}
                                                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${studentCurrentPage === p
                                                                    ? 'border-brand-blue text-brand-blue bg-white shadow-lg shadow-blue-500/10'
                                                                    : 'border-slate-100 text-slate-400 hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white'
                                                                    }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        )
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => paginateStudents(Math.min(studentTotalPages, studentCurrentPage + 1))}
                                                    disabled={studentCurrentPage === studentTotalPages || studentTotalPages === 0}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-white hover:border-brand-blue/20 transition-all border border-slate-100 disabled:opacity-30 shadow-sm"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="relative">
                                            <button
                                                onClick={() => setStudentPerPageOpen(!studentPerPageOpen)}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-100 text-xs font-black text-[#2B3674] hover:border-brand-blue hover:shadow-md transition-all shadow-sm"
                                            >
                                                {studentPerPage} / page
                                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${studentPerPageOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {studentPerPageOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-300">
                                                    {[6, 12, 24, 48].map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => { setStudentPerPage(size); setStudentCurrentPage(1); setStudentPerPageOpen(false); }}
                                                            className={`w-full text-left px-5 py-3 text-xs font-black transition-all ${studentPerPage === size
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
                        )
                    )}
                </div>
            </main>

            {/* Class Modal */}
            {isClassModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111C44]/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[50px] p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-blue/5 rounded-full -mr-20 -mt-20"></div>
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <h2 className="text-3xl font-black text-[#2B3674] tracking-tighter">{editingClass ? 'Edit Instance' : 'System Provisioning'}</h2>
                            <button onClick={() => setIsClassModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-[#2B3674] flex items-center justify-center transition-all"><X size={24} /></button>
                        </div>

                        {formMessage && (
                            <div className={`mb-8 p-6 rounded-[30px] text-sm font-bold animate-in slide-in-from-top-4 duration-500 border relative overflow-hidden group ${formMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${formMessage.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${formMessage.type === 'success' ? 'bg-emerald-100/50' : 'bg-rose-100/50'}`}>
                                        {formMessage.type === 'success' ? <Loader className="animate-spin" size={18} /> : <X size={18} />}
                                    </div>
                                    <p className="flex-1">{formMessage.text}</p>
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleClassSubmit} className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Grade Reference</label>
                                <select
                                    required
                                    className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all font-bold text-[#2B3674] shadow-inner appearance-none cursor-pointer"
                                    value={classForm.gradeName}
                                    onChange={(e) => setClassForm({ ...classForm, gradeName: e.target.value })}
                                >
                                    <option value="">Select Grade...</option>
                                    {grades.map(g => (
                                        <option key={g.Id} value={`Grade ${g.GradeNumber}`}>Grade {g.GradeNumber}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Section Identifier (Optional)</label>
                                <input
                                    type="text" placeholder="e.g. A"
                                    className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all font-bold text-[#2B3674] shadow-inner"
                                    value={classForm.section}
                                    onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                                />
                            </div>
                            <button className="w-full bg-[#111C44] text-white py-6 rounded-[22px] font-black shadow-2xl shadow-blue-900/40 hover:bg-brand-blue transition-all active:scale-95 uppercase tracking-widest text-xs mt-4">
                                {editingClass ? 'Commit Changes' : 'Initialize Class'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {isStudentEditModalOpen && editingStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111C44]/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[50px] p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-blue/5 rounded-full -mr-20 -mt-20"></div>
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black text-[#2B3674] tracking-tighter">Identity Management</h2>
                                <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest leading-none">Updating Profile for {editingStudent.FullName}</p>
                            </div>
                            <button onClick={() => setIsStudentEditModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-[#2B3674] flex items-center justify-center transition-all"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleStudentEditSubmit} className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Legal Full Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all font-bold text-[#2B3674] shadow-inner"
                                    value={studentForm.fullName}
                                    onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Validated Email Connection</label>
                                <input
                                    type="email" required
                                    className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all font-bold text-[#2B3674] shadow-inner"
                                    value={studentForm.email}
                                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Institutional Branch (Class)</label>
                                <div className="relative">
                                    <select
                                        required
                                        className="w-full pl-6 pr-12 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all font-black text-[#2B3674] appearance-none cursor-pointer shadow-inner"
                                        value={studentForm.classId}
                                        onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                                    >
                                        <option value="">— Select Institutional Branch —</option>
                                        {classes.map(cls => (
                                            <option key={cls.ClassId} value={cls.ClassId}>
                                                {cls.GradeName} — Section {cls.Section}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                        <ChevronDown size={20} />
                                    </div>
                                </div>
                                {studentForm.classId && selectedClass && Number(studentForm.classId) !== selectedClass.ClassId && (
                                    <p className="text-xs text-amber-500 font-black mt-3 flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                        ⚠ Relocation Warning: Student will be moved to the specified branch.
                                    </p>
                                )}
                            </div>
                            <button className="w-full bg-[#111C44] text-white py-6 rounded-[22px] font-black shadow-2xl shadow-blue-900/40 hover:bg-brand-blue transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-3 mt-4">
                                <Save size={20} />
                                Finalize Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageClasses;
