import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    FileText,
    Plus,
    Search,
    Filter,
    Calendar,
    Clock,
    ChevronRight,
    ArrowLeft,
    Loader,
    Trash2,
    Edit3,
    Eye,
    ChevronLeft,
    ChevronDown,
    MoreHorizontal,
    UserPlus,
    Users,
    School,
    AlertCircle,
    RotateCcw,
    X
} from 'lucide-react';

interface Exam {
    ExamId: number;
    Title: string;
    Description: string;
    GradeName: string;
    Section: string;
    CourseName: string;
    ExamType: string;
    DurationMinutes: number;
    IsPublished: boolean;
    StartTime: string;
    EndTime: string;
    CreatedAt: string;
    TotalMarks: number;
    IsMakeup: boolean;
    ParentExamId: number | null;
    ParentExamTitle: string | null;
    SemesterEndDate?: string;
    SemesterName?: string;
    AcademicYearName?: string;
}

const CourseExams = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [courseName, setCourseName] = useState('');
    const [courseYear, setCourseYear] = useState('');
    const [courseSemester, setCourseSemester] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(9); // 3x3 grid
    const [perPageOpen, setPerPageOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const isAdmin = user?.role === 'Admin' || user?.role === 'admin';
    const role = isAdmin ? 'admin' : 'teacher';
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const rolePrefix = isAdmin ? 'admin' : 'teacher';
                const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams?courseId=${courseId}`, { headers });
                setExams(res.data);
                if (res.data.length > 0) {
                    setCourseName(res.data[0].CourseName);
                    setCourseYear(res.data[0].AcademicYearName);
                    setCourseSemester(res.data[0].SemesterName);
                }
            } catch (err) {
                console.error('Error fetching exams:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, [courseId]);

    const filteredExams = exams.filter(e =>
        e.Title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredExams.length / perPage);
    const paginatedExams = filteredExams.slice((currentPage - 1) * perPage, currentPage * perPage);

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

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            await axios.delete(`http://localhost:5000/api/${rolePrefix}/exams/${id}`, { headers });
            setExams(exams.filter(e => e.ExamId !== id));
        } catch (err) {
            alert('Failed to delete exam.');
        }
    };

    const handlePublish = async (id: number) => {
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            await axios.patch(`http://localhost:5000/api/${rolePrefix}/exams/${id}/publish`, {}, { headers });
            setExams(exams.map(e => e.ExamId === id ? { ...e, IsPublished: true } : e));
            alert('Exam published successfully!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to publish exam.');
        }
    };

    /* ─── Assignment Management ──────────────────────────────── */
    const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; exam: Exam | null }>({ open: false, exam: null });
    const [students, setStudents] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [assignLoading, setAssignLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [makeupReason, setMakeupReason] = useState('');

    const openAssignments = async (exam: Exam) => {
        setAssignmentModal({ open: true, exam });
        fetchAssignments(exam.ExamId);
        fetchClassStudents((exam as any).ClassId || 0);
    };

    const fetchAssignments = async (examId: number) => {
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams/${examId}/assignments`, { headers });
            setAssignments(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchClassStudents = async (classId: number) => {
        if (!classId) return;
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/classes/${classId}/students`, { headers });
            setStudents(res.data);
        } catch (e) { console.error(e); }
    };

    const handleAssign = async () => {
        if (!assignmentModal.exam || selectedStudents.length === 0) return;
        setAssignLoading(true);
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            await axios.post(`http://localhost:5000/api/${rolePrefix}/exams/assign`, {
                examId: assignmentModal.exam.ExamId,
                studentIds: selectedStudents,
                makeupReason: makeupReason || (assignmentModal.exam.IsMakeup ? 'Make-up Exam' : 'Manual Assignment')
            }, { headers });
            alert('Students assigned successfully!');
            fetchAssignments(assignmentModal.exam.ExamId);
            setSelectedStudents([]);
            setMakeupReason('');
        } catch (e) { alert('Failed to assign students.'); }
        finally { setAssignLoading(false); }
    };

    const handleMarkMissed = async () => {
        if (!assignmentModal.exam) return;
        if (!window.confirm('Mark all unattempted students as Missed for this exam?')) return;
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            await axios.post(`http://localhost:5000/api/${rolePrefix}/exams/mark-missed`, { examId: assignmentModal.exam.ExamId }, { headers });
            alert('Updated missed student status.');
            fetchAssignments(assignmentModal.exam.ExamId);
        } catch (e) { alert('Failed to update status.'); }
    };


    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <button
                                onClick={() => navigate(`/${role}/courses`)}
                                className="flex items-center gap-2 text-brand-blue font-bold text-xs uppercase tracking-widest mb-2 hover:translate-x-[-4px] transition-transform"
                            >
                                <ArrowLeft size={14} /> Back to Courses
                            </button>
                            <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">
                                {courseName || 'Course'} Exams
                            </h1>
                            <div className="flex items-center gap-3 mt-1.5 font-bold uppercase tracking-widest text-[10px]">
                                <span className="text-slate-400">Manage assessments for</span>
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Calendar size={10} />
                                    {courseYear || 'All Year'} • {courseSemester || 'All Semesters'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/${role}/create-exam`, { state: { courseId } })}
                            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Create New Exam
                        </button>
                    </div>

                    {/* Sub-header with Search & Filter */}
                    <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-50 mb-8 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px] relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by exam title..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-medium"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader size={48} className="text-brand-blue animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Exams...</p>
                        </div>
                    ) : filteredExams.length === 0 ? (
                        <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <FileText size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-[#2B3674] mb-2">No Exams Found</h2>
                            <p className="text-slate-400 font-medium mb-8 max-w-sm mx-auto">Create your first exam for this course to start assessing your students.</p>
                            <button
                                onClick={() => navigate(`/${role}/create-exam`, { state: { courseId } })}
                                className="bg-brand-blue/10 text-brand-blue px-8 py-3 rounded-xl font-bold hover:bg-brand-blue hover:text-white transition-all"
                            >
                                Get Started
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {paginatedExams.map((exam) => (
                                    <div
                                        key={exam.ExamId}
                                        className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group border-b-4 border-b-transparent hover:border-b-brand-blue"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex flex-wrap gap-2">
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${exam.IsPublished ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                                                    {exam.IsPublished ? 'Published' : 'Draft'}
                                                </div>
                                                {exam.IsMakeup && (
                                                    <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 flex items-center gap-1">
                                                        <RotateCcw size={10} /> Make-Up
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => navigate(`/${role}/exams/${exam.ExamId}/edit`)}
                                                    className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-all"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(exam.ExamId)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-[#2B3674] mb-2 group-hover:text-brand-blue transition-colors line-clamp-1">{exam.Title}</h3>
                                        <p className="text-slate-400 text-sm mb-6 line-clamp-2 min-h-[40px] font-medium leading-relaxed">
                                            {exam.Description || 'Prepare your students for excellence with this comprehensive assessment.'}
                                        </p>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex items-center gap-3 text-[#2B3674]">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <School size={14} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                    {exam.AcademicYearName || 'N/A'} - {exam.SemesterName || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-slate-500">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="text-xs font-bold">{exam.StartTime ? new Date(exam.StartTime).toLocaleDateString() : 'Scheduling TBA'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-500">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Clock size={14} />
                                                </div>
                                                <span className="text-xs font-bold">{exam.DurationMinutes || 0} Minutes</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-500">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <FileText size={14} />
                                                </div>
                                                <span className="text-xs font-bold">{exam.TotalMarks || 100} Points</span>
                                            </div>
                                        </div>

                                        <div className="pt-1 border-t border-slate-50 flex items-center justify-between">
                                            {!exam.IsPublished ? (
                                                <button
                                                    onClick={() => handlePublish(exam.ExamId)}
                                                    className="text-brand-blue font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all"
                                                >
                                                    Publish Now <ChevronRight size={14} />
                                                </button>
                                            ) : (
                                                <div className="flex gap-4">
                                                    {(!exam.SemesterEndDate || new Date(exam.SemesterEndDate) >= new Date()) && (
                                                        <button
                                                            onClick={() => openAssignments(exam)}
                                                            className="text-amber-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-amber-50 p-1 rounded transition-all"
                                                            title="Manage Student Assignments"
                                                        >
                                                            <Users size={14} /> Assign
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => navigate(`/${role}/results`)}
                                                        className="text-slate-400 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:text-brand-blue transition-all"
                                                    >
                                                        <Eye size={14} /> Results
                                                    </button>
                                                </div>
                                            )}
                                            <span className="text-[10px] font-black text-slate-300 uppercase">{exam.GradeName}-{exam.Section}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {filteredExams.length > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 pb-8">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        <div className="flex items-center gap-1 mx-2">
                                            {getPageNumbers().map((p, idx) =>
                                                p === 'ellipsis' ? (
                                                    <div key={`e-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                        <MoreHorizontal size={14} />
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => paginate(p)}
                                                        className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${currentPage === p
                                                            ? 'border-red-400 text-red-500 bg-red-50 shadow-sm'
                                                            : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
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
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setPerPageOpen(!perPageOpen)}
                                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                        >
                                            {perPage} / page
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${perPageOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {perPageOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-200">
                                                {[9, 18, 54, 108].map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                        className={`w-full text-left px-6 py-3 text-xs font-black transition-all ${perPage === size
                                                            ? 'text-red-500 bg-red-50'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        {size} / page
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

                {/* ─── Assignments Modal ─────────────────── */}
                {assignmentModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2B3674]/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-start shrink-0 bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-lg">Participation Manager</span>
                                        {assignmentModal.exam?.IsMakeup && (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Make-Up</span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black text-[#2B3674]">{assignmentModal.exam?.Title}</h2>
                                    <p className="text-slate-400 text-sm font-medium">Manage student access and tracking for this assessment.</p>
                                </div>
                                <button onClick={() => setAssignmentModal({ open: false, exam: null })} className="p-3 bg-white text-slate-400 hover:text-[#2B3674] rounded-2xl shadow-sm transition-all"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Column 1: Existing Assignments */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black text-[#2B3674] flex items-center gap-2">
                                                <Users size={20} className="text-brand-blue" />
                                                Active Assignments
                                            </h3>
                                            <button
                                                onClick={handleMarkMissed}
                                                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                            >
                                                Mark Missed
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                            {assignments.length === 0 ? (
                                                <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-slate-400 text-sm font-bold italic">No students assigned yet.</p>
                                                </div>
                                            ) : (
                                                assignments.map(a => (
                                                    <div key={a.Id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-[#2B3674] text-white flex items-center justify-center font-black text-xs shadow-md">
                                                                {a.StudentName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-[#2B3674]">{a.StudentName}</p>
                                                                {a.MakeupReason && <p className="text-[10px] text-amber-600 font-bold italic">{a.MakeupReason}</p>}
                                                            </div>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${a.Status === 'Completed' ? 'bg-green-100 text-green-600' :
                                                            a.Status === 'Started' ? 'bg-blue-100 text-brand-blue animate-pulse' :
                                                                a.Status === 'Missed' ? 'bg-red-100 text-red-500' :
                                                                    'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {a.Status}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Column 2: Assign New */}
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-black text-[#2B3674] flex items-center gap-2">
                                            <UserPlus size={20} className="text-green-500" />
                                            Manual Assignment
                                        </h3>

                                        <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Select Students</label>
                                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                                                    {students
                                                        .filter(s => !assignments.find(a => a.StudentId === s.UserId))
                                                        .map(s => (
                                                            <label key={s.UserId} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedStudents.includes(s.UserId) ? 'bg-white border-brand-blue shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedStudents.includes(s.UserId)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedStudents([...selectedStudents, s.UserId]);
                                                                        else setSelectedStudents(selectedStudents.filter(id => id !== s.UserId));
                                                                    }}
                                                                    className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                                                                />
                                                                <span className="text-sm font-bold text-[#2B3674]">{s.FullName}</span>
                                                            </label>
                                                        ))
                                                    }
                                                    {students.filter(s => !assignments.find(a => a.StudentId === s.UserId)).length === 0 && (
                                                        <p className="text-xs text-slate-400 italic">All class members are already assigned.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Makeup Reason (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., Medical Emergency, Technical Issue"
                                                    value={makeupReason}
                                                    onChange={e => setMakeupReason(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all text-sm font-medium"
                                                />
                                            </div>

                                            <button
                                                onClick={handleAssign}
                                                disabled={selectedStudents.length === 0 || assignLoading}
                                                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                            >
                                                {assignLoading ? <Loader className="animate-spin" size={18} /> : <UserPlus size={18} />}
                                                Confirm Assignment
                                            </button>
                                        </div>

                                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                            <p className="text-[10px] text-amber-700 font-bold flex items-start gap-2 leading-relaxed">
                                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                Manual assignments ensure students can access the exam regardless of default class rules. This is required for Make-Up sessions.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CourseExams;
