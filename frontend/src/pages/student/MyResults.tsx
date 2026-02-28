import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Trophy,
    ChevronRight,
    Loader,
    FileText,
    Calendar,
    GraduationCap,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    ChevronDown,
    MoreHorizontal,
    X
} from 'lucide-react';

interface Result {
    AttemptId: number;
    Title: string;
    CourseName: string;
    Score: number;
    CorrectCount?: number;
    TotalQuestions?: number;
    CompletionDate: string;
    Date?: string;
    Status: string;
    TotalPoints: number;
    ElapsedMinutes?: number;
    DurationMinutes?: number;
    Type?: string;
}

interface Stats {
    rank: string | number;
    average: number;
}

const MyResults = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [results, setResults] = useState<Result[]>([]);
    const [stats, setStats] = useState<Stats>({ rank: '-', average: 0 });
    const [loading, setLoading] = useState(true);

    // Filter Metadata
    const [years, setYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [filters, setFilters] = useState({
        ayId: '',
        semesterId: '',
        gradeId: '',
        courseId: '',
        section: '',
        examType: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const fetchMetadata = async () => {
        try {
            const [yRes, gRes, cRes] = await Promise.all([
                axios.get('http://localhost:5000/api/student/academic-years', { headers }),
                axios.get('http://localhost:5000/api/student/grades', { headers }),
                axios.get('http://localhost:5000/api/student/courses/my', { headers })
            ]);
            setYears(yRes.data);
            setGrades(gRes.data);
            setCourses(cRes.data);

            const activeYear = yRes.data.find((y: any) => y.IsActive);
            if (activeYear) {
                const ayIdStr = activeYear.Id.toString();
                setFilters(prev => ({ ...prev, ayId: ayIdStr }));
                // Fetch semesters for this year immediately
                const sRes = await axios.get(`http://localhost:5000/api/student/semesters?academicYearId=${ayIdStr}`, { headers });
                setSemesters(sRes.data);
                const activeSem = sRes.data.find((s: any) => s.IsActive);
                if (activeSem) {
                    setFilters(prev => ({ ...prev, ayId: ayIdStr, semesterId: activeSem.Id.toString() }));
                }
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
            const res = await axios.get(`http://localhost:5000/api/student/semesters?academicYearId=${ayId}`, { headers });
            setSemesters(res.data);
        } catch (err) {
            console.error('Semesters fetch error:', err);
        }
    };

    const fetchSections = async (gradeId: string, ayId: string) => {
        if (!gradeId || !ayId) {
            setSections([]);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/student/sections?gradeId=${gradeId}&academicYearId=${ayId}`, { headers });
            setSections(res.data);
        } catch (err) {
            console.error('Sections fetch error:', err);
        }
    };

    const fetchResults = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.ayId) params.append('ayId', filters.ayId);
            if (filters.semesterId) params.append('semesterId', filters.semesterId);
            if (filters.gradeId) params.append('gradeId', filters.gradeId);
            if (filters.courseId) params.append('courseId', filters.courseId);
            if (filters.section) params.append('section', filters.section);

            const res = await axios.get(`http://localhost:5000/api/student/results?${params.toString()}`, { headers });
            setResults(res.data.submissions);
            setStats({ rank: res.data.rank, average: res.data.average });
        } catch (err) {
            console.error('Error fetching results:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (filters.ayId) fetchSemesters(filters.ayId);
        if (filters.ayId && filters.gradeId) fetchSections(filters.gradeId, filters.ayId);
    }, [filters.ayId, filters.gradeId]);

    useEffect(() => {
        fetchResults();
        setCurrentPage(1);
    }, [filters]);

    const getPercentage = (score: number, total: number) => {
        if (!total) return 0;
        return Math.round((score / total) * 100);
    };

    // Client-side exam type filter
    const filteredResults = filters.examType
        ? results.filter(r => r.Type === filters.examType)
        : results;

    // Pagination logic
    const totalPages = Math.ceil(filteredResults.length / perPage);
    const paginatedResults = filteredResults.slice((currentPage - 1) * perPage, currentPage * perPage);

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
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role="student" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email || "student@example.com"} role="student" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="mb-10 text-center md:text-left">
                        <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">My Results</h1>
                        <p className="text-slate-500 mt-1 font-medium">Detailed analysis of your academic performance.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 border border-amber-100 group-hover:scale-110 transition-transform">
                                    <Trophy size={32} />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-[#2B3674]">#{stats.rank}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Class Ranking</p>
                                </div>
                            </div>
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-50/50 rounded-full"></div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500 border border-blue-100 group-hover:scale-110 transition-transform">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-[#2B3674]">{results.length}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Exams Completed</p>
                                </div>
                            </div>
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-50/50 rounded-full"></div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center text-green-500 border border-green-100 group-hover:scale-110 transition-transform">
                                    <GraduationCap size={32} />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-[#2B3674]">{stats.average}%</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Semester Average</p>
                                </div>
                            </div>
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-green-50/50 rounded-full"></div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-[50px] shadow-sm border border-slate-100">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
                            <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Performance History</h2>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-3xl border border-slate-100">
                                <select
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                    value={filters.ayId}
                                    onChange={(e) => setFilters({ ...filters, ayId: e.target.value, semesterId: '', section: '' })}
                                >
                                    <option value="">Year</option>
                                    {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                </select>

                                <select
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                    value={filters.semesterId}
                                    onChange={(e) => setFilters({ ...filters, semesterId: e.target.value })}
                                    disabled={!filters.ayId}
                                >
                                    <option value="">Semester</option>
                                    {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                </select>

                                <select
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                    value={filters.gradeId}
                                    onChange={(e) => setFilters({ ...filters, gradeId: e.target.value, section: '' })}
                                >
                                    <option value="">Grade</option>
                                    {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                </select>

                                <select
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                    value={filters.courseId}
                                    onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                                >
                                    <option value="">Course</option>
                                    {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                </select>

                                <select
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                    value={filters.section}
                                    onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                                    disabled={!filters.gradeId || !filters.ayId}
                                >
                                    <option value="">Section</option>
                                    {sections.map(s => <option key={s.Id} value={s.Name}>{s.Name}</option>)}
                                </select>

                                <select
                                    className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                    value={filters.examType}
                                    onChange={(e) => { setFilters({ ...filters, examType: e.target.value }); setCurrentPage(1); }}
                                >
                                    <option value="">Exam Type</option>
                                    <option value="Exam">Online Exam</option>
                                    <option value="Manual">Manual</option>
                                    <option value="Assignment">Assignment</option>
                                </select>

                                <button
                                    onClick={() => setFilters({ ayId: '', semesterId: '', gradeId: '', courseId: '', section: '', examType: '' })}
                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 cursor-pointer"
                                    title="Clear Filters"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader size={40} className="animate-spin text-brand-blue mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching your scores...</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText size={60} className="mx-auto text-slate-100 mb-6" />
                                <h3 className="text-xl font-bold text-[#2B3674]">No Results Found</h3>
                                <p className="text-slate-400 max-w-xs mx-auto mt-2">Finish your first exam to see your performance history here!</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {paginatedResults.map((res, i) => {
                                        const percentage = getPercentage(res.Score, res.TotalPoints);
                                        return (
                                            <div key={i} className="p-8 rounded-[32px] bg-slate-50/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 group">
                                                <div className="flex items-center gap-8">
                                                    {res.Type === 'Exam' && (
                                                        <div className={`w-20 h-20 rounded-[28px] shadow-sm flex flex-col items-center justify-center font-black border-2 ${percentage >= 50 ? 'border-green-100 bg-green-50 text-green-600' : 'border-red-100 bg-red-50 text-red-600'}`}>
                                                            <span className="text-2xl">{percentage}%</span>
                                                            <span className="text-[8px] uppercase tracking-tighter opacity-70">Grade</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-3 py-1 rounded-full uppercase tracking-tighter">{res.CourseName}</span>
                                                            {(res.CompletionDate || res.Date) && (
                                                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                                                    <Calendar size={12} />
                                                                    {res.Type === 'Manual' ? 'Graded ' : ''}{new Date(res.CompletionDate || res.Date || '').toLocaleDateString()}
                                                                </div>
                                                            )}
                                                            {res.Type && res.Type !== 'Exam' && (
                                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${res.Type === 'Manual' ? 'text-purple-600 bg-purple-50' : 'text-emerald-600 bg-emerald-50'
                                                                    }`}>
                                                                    {res.Type === 'Manual' ? 'Manual' : 'Assignment'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-xl font-black text-[#2B3674] group-hover:text-brand-blue transition-all">{res.Title}</h3>

                                                        {/* Time Taken Progress Bar - Only for Online Exams */}
                                                        {res.Type === 'Exam' && (
                                                            <div className="mt-4 max-w-[200px]">
                                                                <div className="flex items-center justify-between mb-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                                    <span>{res.ElapsedMinutes || 0} / {res.DurationMinutes || 0} min</span>
                                                                    <span>{Math.round(((res.ElapsedMinutes || 0) / (res.DurationMinutes || 1)) * 100)}%</span>
                                                                </div>
                                                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-1000 ${(res.ElapsedMinutes || 0) >= (res.DurationMinutes || 0) * 0.9 ? 'bg-red-500' : 'bg-brand-blue'}`}
                                                                        style={{ width: `${Math.min(((res.ElapsedMinutes || 0) / (res.DurationMinutes || 1)) * 100, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end gap-12 border-t md:border-t-0 pt-6 md:pt-0">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                                        <p className="text-3xl font-black text-[#2B3674] tracking-tight">
                                                            {Number(res.Score || 0).toFixed(1).replace(/\.0$/, '')} <span className="text-slate-300 text-xl">/ {Number(res.TotalPoints)}</span>
                                                        </p>
                                                        {res.Type === 'Exam' && res.CorrectCount !== undefined && res.TotalQuestions !== undefined && (
                                                            <p className="text-[10px] text-brand-blue font-black uppercase tracking-tighter mt-1">
                                                                {res.CorrectCount} / {res.TotalQuestions} Correct
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outcome</p>
                                                        <span className={`text-xs font-black uppercase px-4 py-1.5 rounded-full border-2 ${percentage >= 50 ? 'bg-green-50 text-green-500 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                                            {percentage >= 50 ? 'PASSED' : 'FAILED'}
                                                        </span>
                                                    </div>
                                                    {res.Type === 'Exam' && (
                                                        <button
                                                            onClick={() => navigate(`/student/results/${res.AttemptId}/review`)}
                                                            className="hidden sm:flex p-4 rounded-2xl bg-white shadow-sm border border-slate-100 text-brand-blue hover:bg-brand-blue hover:text-white transition-all transform group-hover:translate-x-1 duration-300"
                                                        >
                                                            <ChevronRight size={24} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {results.length > 0 && (
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
                                                <ChevronRightIcon size={18} />
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
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MyResults;
