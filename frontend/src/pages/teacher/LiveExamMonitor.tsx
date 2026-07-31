import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getImageUrl } from '../../utils/imageUrl';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Radio, Users, Monitor, Loader, Eye, AlertCircle, Timer, Zap, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';

interface LiveStudent {
    AttemptId: number;
    StartTime: string;
    EndTime?: string;
    Status: string;
    Score?: number;
    StudentName: string;
    StudentEmail: string;
    ExamId: number;
    ExamTitle: string;
    DurationMinutes: number;
    CourseName: string;
    GradeName: string;
    Section: string;
    ElapsedMinutes: number;
    TeacherName?: string;
    MaxPoints?: number;
    ProfileImage?: string;
    IsLocked?: boolean;
}

interface ActiveExam {
    ExamId: number;
    Title: string;
    DurationMinutes: number;
    StartTime: string;
    EndTime: string;
    CourseName: string;
    GradeName: string;
    Section: string;
    ActiveStudents: number;
    SubmittedStudents: number;
    TeacherName?: string;
}

const LiveExamMonitor = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([]);
    const [activeExams, setActiveExams] = useState<ActiveExam[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [selectedExamFilter, setSelectedExamFilter] = useState<string | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'taking' | 'done'>('taking');
    const [teacherSearch, setTeacherSearch] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Filter Metadata
    const [years, setYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);

    const [filters, setFilters] = useState({
        ayId: '',
        semesterId: '',
        gradeId: '',
        courseId: '',
        examType: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const isAdmin = user.role === 'Admin' || user.role === 'admin';
    const rolePrefix = isAdmin ? 'admin' : 'teacher';

    const fetchMetadata = async () => {
        try {
            const [yRes, gRes, cRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/${rolePrefix}/academic-years`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/grades`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/all-courses`, { headers })
            ]);
            setYears(yRes.data);
            setGrades(gRes.data);
            setCourses(cRes.data);

            // Set active year as default
            const activeYear = yRes.data.find((y: any) => y.IsActive);
            if (activeYear) {
                setFilters(prev => ({ ...prev, ayId: String(activeYear.Id) }));
            }
        } catch (err) {
            console.error('Metadata fetch error:', err);
        }
    };

    const fetchSemesters = async (ayId: string) => {
        if (!ayId) {
            setSemesters([]);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/semesters?academicYearId=${ayId}`, { headers });
            setSemesters(res.data);

            // Auto-select active semester for this year
            const activeSem = res.data.find((s: any) => s.IsActive);
            if (activeSem) {
                setFilters(prev => ({ ...prev, semesterId: String(activeSem.Id) }));
            }
        } catch (err) {
            console.error('Semesters fetch error:', err);
        }
    };

    const fetchLiveData = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.ayId) params.append('ayId', filters.ayId);
            if (filters.semesterId) params.append('semesterId', filters.semesterId);
            if (filters.gradeId) params.append('gradeId', filters.gradeId);
            if (filters.courseId) params.append('courseId', filters.courseId);
            if (filters.examType) params.append('examType', filters.examType);

            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/live-sessions?${params.toString()}`, { headers });
            setLiveStudents(res.data.liveStudents);
            setActiveExams(res.data.activeExams);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error fetching live sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async (attemptId: number) => {
        if (!window.confirm('Are you sure you want to unlock this student\'s exam? They will be able to resume immediately.')) return;
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            await axios.post(`http://localhost:5000/api/${rolePrefix}/attempts/${attemptId}/unlock`, {}, { headers });
            fetchLiveData();
        } catch (err) {
            console.error('Error unlocking attempt:', err);
            alert('Failed to unlock exam attempt.');
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (filters.ayId) fetchSemesters(filters.ayId);
    }, [filters.ayId]);

    useEffect(() => {
        fetchLiveData();
        // Clear any existing interval
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Poll every 10 seconds for real-time updates
        intervalRef.current = setInterval(fetchLiveData, 10000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [filters]);

    const getTimeProgress = (elapsed: number, total: number) => {
        if (!total) return 0;
        return Math.min(Math.round((elapsed / total) * 100), 100);
    };

    const getTimeColor = (elapsed: number, total: number) => {
        const pct = getTimeProgress(elapsed, total);
        if (pct >= 90) return 'text-red-500 bg-red-50 border-red-100';
        if (pct >= 70) return 'text-orange-500 bg-orange-50 border-orange-100';
        return 'text-green-500 bg-green-50 border-green-100';
    };



    const formatTimeRemaining = (elapsed: number, total: number) => {
        const remaining = Math.max(total - elapsed, 0);
        if (remaining <= 0) return 'Time Up!';
        if (remaining >= 60) return `${Math.floor(remaining / 60)}h ${remaining % 60}m left`;
        return `${remaining}m left`;
    };

    const getExamKey = (exam: any) => `${exam.Title || exam.ExamTitle}-${exam.CourseName}-${exam.GradeName}-${exam.Section}`;

    const processedActiveExams = activeExams.map(exam => {
        const examKey = getExamKey(exam);
        const examStudents = liveStudents.filter(s => getExamKey(s) === examKey);
        return {
            ...exam,
            ActiveStudents: examStudents.filter(s => s.Status === 'Started' && s.ElapsedMinutes < s.DurationMinutes).length,
            SubmittedStudents: examStudents.filter(s => s.Status === 'Submitted' || (s.Status === 'Started' && s.ElapsedMinutes >= s.DurationMinutes)).length
        };
    });

    const filteredStudents = (selectedExamFilter === 'all'
        ? liveStudents
        : liveStudents.filter(s => {
            const studentKey = `${s.ExamTitle}-${s.CourseName}-${s.GradeName}-${s.Section}`;
            return studentKey === selectedExamFilter;
        })).filter(s => {
            if (!isAdmin || !teacherSearch) return true;
            return s.TeacherName?.toLowerCase().includes(teacherSearch.toLowerCase());
        });

    const activeStudents = filteredStudents.filter(s => s.Status === 'Started' && s.ElapsedMinutes < s.DurationMinutes);
    const completedStudents = filteredStudents.filter(s => s.Status === 'Submitted' || (s.Status === 'Started' && s.ElapsedMinutes >= s.DurationMinutes));

    const displayStudents = statusFilter === 'all' ? filteredStudents : statusFilter === 'taking' ? activeStudents : completedStudents;

    // Pagination Logic
    const totalPages = Math.ceil(displayStudents.length / perPage);
    const paginatedStudents = displayStudents.slice((currentPage - 1) * perPage, currentPage * perPage);

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

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden">
            <Sidebar role={isAdmin ? 'admin' : 'teacher'} />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden font-display">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={user.email || 'user@example.com'} role={isAdmin ? 'admin' : 'teacher'} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="card-gradient-blue p-8 rounded-[40px] text-white shadow-xl flex items-center gap-6 transform hover:scale-[1.02] transition-all">
                            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black">{activeStudents.length}</h3>
                                <p className="text-xs opacity-80 mt-1 uppercase tracking-widest font-black">Students Taking Exams</p>
                            </div>
                        </div>
                        <div className="card-gradient-green p-8 rounded-[40px] text-white shadow-xl flex items-center gap-6 transform hover:scale-[1.02] transition-all">
                            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                                <Monitor size={24} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black">
                                    {selectedExamFilter === 'all' ? activeExams.length : 1}
                                </h3>
                                <p className="text-xs opacity-80 mt-1 uppercase tracking-widest font-black">Active Exams</p>
                            </div>
                        </div>
                        <div className="card-gradient-orange p-8 rounded-[40px] text-white shadow-xl flex items-center gap-6 transform hover:scale-[1.02] transition-all">
                            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black">
                                    {completedStudents.length}
                                </h3>
                                <p className="text-xs opacity-80 mt-1 uppercase tracking-widest font-black">Submitted Today</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase bg-red-100 text-red-600 px-3 py-1 rounded-full animate-pulse shadow-sm">
                                    <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                                    Live
                                </span>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-2 bg-white/50 p-2 rounded-3xl border border-slate-200">
                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.ayId}
                                onChange={(e) => {
                                    setFilters({ ...filters, ayId: e.target.value, semesterId: '' });
                                    setCurrentPage(1);
                                    setSelectedExamFilter('all');
                                }}
                            >
                                <option value="">Year</option>
                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.semesterId}
                                onChange={(e) => {
                                    setFilters({ ...filters, semesterId: e.target.value });
                                    setCurrentPage(1);
                                    setSelectedExamFilter('all');
                                }}
                                disabled={!filters.ayId}
                            >
                                <option value="">Semester</option>
                                {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.gradeId}
                                onChange={(e) => {
                                    setFilters({ ...filters, gradeId: e.target.value });
                                    setCurrentPage(1);
                                    setSelectedExamFilter('all');
                                }}
                            >
                                <option value="">Grade</option>
                                {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.courseId}
                                onChange={(e) => {
                                    setFilters({ ...filters, courseId: e.target.value });
                                    setCurrentPage(1);
                                    setSelectedExamFilter('all');
                                }}
                            >
                                <option value="">Course</option>
                                {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.examType}
                                onChange={(e) => {
                                    setFilters({ ...filters, examType: e.target.value });
                                    setCurrentPage(1);
                                    setSelectedExamFilter('all');
                                }}
                            >
                                <option value="">Exam Type</option>
                                <option value="Exam">Regular Exam</option>
                                <option value="Quiz">Quiz</option>
                                <option value="Assessment">Assessment</option>
                                <option value="Practice">Practice</option>
                            </select>

                            <button
                                onClick={() => {
                                    setFilters({ ayId: '', semesterId: '', gradeId: '', courseId: '', examType: '' });
                                    setCurrentPage(1);
                                    setSelectedExamFilter('all');
                                }}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 cursor-pointer"
                                title="Clear Filters"
                            >
                                <AlertCircle size={18} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader size={40} className="animate-spin text-brand-blue mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Scanning live sessions...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-8">
                            {/* Active Exams Panel */}
                            <div className="xl:col-span-1">
                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                                            <Radio size={20} />
                                        </div>
                                        <h2 className="text-xl font-black text-[#2B3674] tracking-tight">Active Exams</h2>
                                    </div>

                                    {activeExams.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                            <AlertCircle size={40} className="text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No active exams right now</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <button
                                                onClick={() => { setSelectedExamFilter('all'); setCurrentPage(1); }}
                                                className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedExamFilter === 'all'
                                                    ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-500/20'
                                                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-[#2B3674]'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-sm">All Exams</span>
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${selectedExamFilter === 'all' ? 'bg-white/20' : 'bg-brand-blue/10 text-brand-blue'
                                                        }`}>{liveStudents.filter(s => s.Status === 'Started' && s.ElapsedMinutes < s.DurationMinutes).length}</span>
                                                </div>
                                            </button>

                                            {processedActiveExams.map(exam => {
                                                const examKey = getExamKey(exam);
                                                return (
                                                    <div
                                                        key={examKey}
                                                        onClick={() => { setSelectedExamFilter(examKey); setCurrentPage(1); }}
                                                        className={`w-full text-left p-5 rounded-2xl transition-all border cursor-pointer ${selectedExamFilter === examKey
                                                            ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-500/20'
                                                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <h4 className={`font-black group-hover:translate-x-1 transition-transform ${selectedExamFilter === examKey ? 'text-white' : 'text-[#2B3674]'}`}>
                                                            {exam.Title}
                                                        </h4>
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${selectedExamFilter === examKey ? 'text-white/70' : 'text-slate-400'}`}>
                                                            {exam.CourseName} • {exam.GradeName}-{exam.Section}
                                                            {isAdmin && exam.TeacherName && <span className="block mt-1 text-brand-red opacity-80 italic">By: {exam.TeacherName}</span>}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-3 relative z-20">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedExamFilter(examKey);
                                                                    setStatusFilter('taking');
                                                                    setCurrentPage(1);
                                                                }}
                                                                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${selectedExamFilter === examKey
                                                                    ? statusFilter === 'taking' ? 'bg-white text-green-600' : 'text-green-300 hover:bg-white/10'
                                                                    : statusFilter === 'taking' && selectedExamFilter === examKey ? 'bg-green-50 text-green-600' : 'text-green-500 hover:bg-green-50'
                                                                    }`}
                                                            >
                                                                <Eye size={12} />
                                                                {exam.ActiveStudents} Taking
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedExamFilter(examKey);
                                                                    setStatusFilter('done');
                                                                    setCurrentPage(1);
                                                                }}
                                                                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${selectedExamFilter === examKey
                                                                    ? statusFilter === 'done' ? 'bg-white text-brand-blue' : 'text-white/50 hover:bg-white/10'
                                                                    : statusFilter === 'done' && selectedExamFilter === examKey ? 'bg-blue-50 text-brand-blue' : 'text-slate-400 hover:bg-slate-100'
                                                                    }`}
                                                            >
                                                                ✓ {exam.SubmittedStudents} Done
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Live Students Panel */}
                            <div className="xl:col-span-2">
                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                                                <Eye size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-[#2B3674] tracking-tight">Student Activity</h2>
                                                <p className="text-slate-400 text-xs font-medium mt-0.5">
                                                    {statusFilter === 'all' ? filteredStudents.length : statusFilter === 'taking' ? activeStudents.length : completedStudents.length} students shown
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 flex-wrap">
                                            {isAdmin && (
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Search by Teacher..."
                                                        value={teacherSearch}
                                                        onChange={(e) => { setTeacherSearch(e.target.value); setCurrentPage(1); }}
                                                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#2B3674] focus:outline-none focus:ring-2 focus:ring-brand-blue/20 w-48 transition-all"
                                                    />
                                                    <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                </div>
                                            )}

                                            {/* Status Filter Toggle */}
                                            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                                                <button
                                                    onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === 'all'
                                                        ? 'bg-white text-brand-blue shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    All ({filteredStudents.length})
                                                </button>
                                                <button
                                                    onClick={() => { setStatusFilter('taking'); setCurrentPage(1); }}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === 'taking'
                                                        ? 'bg-white text-green-500 shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    Taking ({activeStudents.length})
                                                </button>
                                                <button
                                                    onClick={() => { setStatusFilter('done'); setCurrentPage(1); }}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === 'done'
                                                        ? 'bg-white text-brand-blue shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    Done ({completedStudents.length})
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {displayStudents.length === 0 ? (
                                        <div className="text-center py-16 bg-slate-50 rounded-[30px] border border-dashed border-slate-200">
                                            <Monitor size={60} className="text-slate-200 mx-auto mb-6" />
                                            <h3 className="text-xl font-bold text-[#2B3674]">No Students Online</h3>
                                            <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm">No students are currently taking exams. This view auto-refreshes every 10 seconds.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {paginatedStudents.map(student => {
                                                const isTaking = student.Status === 'Started';
                                                const progress = getTimeProgress(student.ElapsedMinutes, student.DurationMinutes);
                                                const timeColorClass = getTimeColor(student.ElapsedMinutes, student.DurationMinutes);

                                                return (
                                                    <div key={student.AttemptId} className={`p-2 rounded-[40px] border transition-all duration-500 group bg-white border-slate-100 hover:shadow-2xl hover:shadow-blue-500/5 mb-6`}>
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-8 h-8 rounded-[22px] bg-white shadow-sm border border-slate-100 overflow-hidden flex-none">
                                                                    <img
                                                                        src={student.ProfileImage
                                                                            ? (getImageUrl(student.ProfileImage) ?? `https://i.pravatar.cc/150`)
                                                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(student.StudentName)}&background=${isTaking ? '4318FF' : '05CD99'}&color=fff`}
                                                                        alt={student.StudentName}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xl font-black text-[#2B3674] tracking-tight">{student.StudentName}</h4>
                                                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                        {student.CourseName} • GRADE {student.GradeName}-{student.Section}
                                                                        {isAdmin && student.TeacherName && <span className="text-brand-red ml-2 font-black">[{student.TeacherName}]</span>}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-10">
                                                                <div className="text-right hidden sm:block">
                                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Exam</p>
                                                                    <p className="text-sm font-black text-[#2B3674]">{student.ExamTitle}</p>
                                                                </div>

                                                                <div className="text-right hidden sm:block">
                                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{isTaking ? 'Started' : 'Finished'}</p>
                                                                    <p className="text-sm font-black text-[#2B3674]">
                                                                        {new Date(isTaking ? student.StartTime : (student.EndTime || student.StartTime)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    {(!isTaking || progress >= 100) ? (
                                                                        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-500 rounded-3xl border border-red-100 shadow-sm shadow-red-500/5">
                                                                            <Timer size={18} />
                                                                            <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Time Up!</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`px-5 py-2.5 rounded-3xl border flex items-center gap-2 ${timeColorClass} shadow-sm transition-all`}>
                                                                            <Zap size={18} />
                                                                            <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{formatTimeRemaining(student.ElapsedMinutes, student.DurationMinutes)}</span>
                                                                        </div>
                                                                    )}

                                                                    {student.IsLocked && (
                                                                        <button
                                                                            onClick={() => handleUnlock(student.AttemptId)}
                                                                            className="flex items-center gap-2 px-5 py-2.5 bg-[#111C44] text-white rounded-3xl font-black text-[11px] tracking-widest hover:bg-[#1B254B] transition-all shadow-lg active:scale-95"
                                                                        >
                                                                            <AlertCircle size={16} />
                                                                            UNLOCK
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Progress Area */}
                                                        {/* <div className="mt-8">
                                                            <div className="flex items-center justify-between mb-2 px-1">
                                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{Math.min(student.ElapsedMinutes, student.DurationMinutes)} / {student.DurationMinutes} MIN</span>
                                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{progress}%</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all duration-1000 ${progressBarColor}`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div> */}
                                                    </div>
                                                );
                                            })}

                                            {/* Pagination */}
                                            {displayStudents.length > 0 && (
                                                <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 border-t border-slate-50 pt-8">
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
                                                                {[10, 20, 50, 100].map((size) => (
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LiveExamMonitor;
