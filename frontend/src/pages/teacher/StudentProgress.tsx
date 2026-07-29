import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    ArrowLeft,
    Trophy,
    Calendar,
    Loader,
    Mail,
    TrendingUp,
    Award,
    FileText,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    ChevronDown,
    MoreHorizontal
} from 'lucide-react';

interface Submission {
    AttemptId: number;
    ExamTitle: string;
    Type: string;
    Score: number | null;
    MaxPoints: number;
    Status: string;
    Date: string;
    CorrectQuestions: number;
    TotalQuestions: number;
    CourseName?: string;
}

interface Student {
    UserId: number;
    FullName: string;
    Email: string;
    ProfileImage?: string;
}

const StudentProgress = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: 'teacher@example.com' };
    const isAdmin = user?.role === 'Admin' || user?.role === 'admin';
    const role = isAdmin ? 'admin' : 'teacher';
    const headers = { Authorization: `Bearer ${token}` };

    const [student, setStudent] = useState<Student | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/${role}/students/${studentId}/progress`, { headers });
                setStudent(res.data.student);
                setSubmissions(res.data.submissions);
            } catch (err) {
                console.error('Error fetching student progress:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [studentId]);

    // Pagination Logic
    const totalPages = Math.ceil(submissions.length / perPage);
    const paginatedSubmissions = submissions.slice((currentPage - 1) * perPage, currentPage * perPage);

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

    const calculateOverallStats = () => {
        if (submissions.length === 0) return { avg: 0, total: 0, best: 0 };

        let totalScore = 0;
        let totalMax = 0;
        let bestPerc = 0;

        submissions.forEach(s => {
            if (s.Score !== null) {
                const perc = (s.Score / s.MaxPoints) * 100;
                if (perc > bestPerc) bestPerc = perc;
                totalScore += s.Score;
                totalMax += s.MaxPoints;
            }
        });

        return {
            avg: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
            total: submissions.length,
            best: Math.round(bestPerc)
        };
    };

    const stats = calculateOverallStats();

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-brand-blue transition-all mb-6 font-bold"
                    >
                        <ArrowLeft size={20} />
                        Back
                    </button>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader className="animate-spin text-brand-blue" size={40} />
                        </div>
                    ) : student ? (
                        <>
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 mb-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full -mr-32 -mt-32"></div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-blue to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/20 overflow-hidden">
                                            {student.ProfileImage ? (
                                                <img
                                                    src={`http://localhost:5000/${student.ProfileImage}`}
                                                    alt={student.FullName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                student.FullName.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">{student.FullName}</h1>
                                            <div className="flex items-center gap-2 text-slate-400 mt-1 font-bold">
                                                <Mail size={16} />
                                                <span>{student.Email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 px-6 py-3 rounded-2xl flex items-center gap-3 border border-green-100 text-green-600 font-black text-xs uppercase tracking-widest">
                                        <Award size={20} />
                                        Active Student
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex items-center gap-5">
                                        <div className="bg-blue-50 p-3 rounded-2xl text-brand-blue"><TrendingUp size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Average</p>
                                            <h3 className="text-2xl font-black text-[#2B3674]">{stats.avg}%</h3>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex items-center gap-5">
                                        <div className="bg-green-50 p-3 rounded-2xl text-green-600"><Trophy size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Best Score</p>
                                            <h3 className="text-2xl font-black text-[#2B3674]">{stats.best}%</h3>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex items-center gap-5">
                                        <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><FileText size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exams Taken</p>
                                            <h3 className="text-2xl font-black text-[#2B3674]">{stats.total}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                                <h2 className="text-2xl font-black text-[#2B3674] mb-8 tracking-tight">Examination History</h2>

                                {submissions.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-[30px] border border-dashed border-slate-200">
                                        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No exam records found for this student.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            {paginatedSubmissions.map((sub, index) => (
                                                <div
                                                    key={`${sub.AttemptId}-${index}`}
                                                    onClick={() => {
                                                        if (sub.Type === 'Exam') {
                                                            navigate(`/${role}/results/${sub.AttemptId}/review`);
                                                        }
                                                    }}
                                                    className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-[30px] bg-slate-50/50 border border-slate-100 transition-all group ${sub.Type === 'Exam' ? 'cursor-pointer hover:bg-white hover:border-brand-blue/30 hover:shadow-xl hover:shadow-blue-500/5' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-5 mb-4 md:mb-0">
                                                        <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-all ${sub.Type === 'Exam' ? 'text-brand-blue group-hover:bg-brand-blue group-hover:text-white' : 'text-slate-400'
                                                            }`}>
                                                            <FileText size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-lg text-[#2B3674] line-clamp-1">{sub.ExamTitle}</h4>
                                                            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400 font-bold mt-1">
                                                                <span className="flex items-center gap-1"><Calendar size={12} /> {sub.Date ? new Date(sub.Date).toLocaleString() : 'N/A'}</span>
                                                                <span className={`px-2 py-0.5 rounded uppercase ${sub.Type === 'Exam' ? 'bg-blue-50 text-blue-600' :
                                                                        sub.Type === 'Manual' ? 'bg-purple-50 text-purple-600' :
                                                                            'bg-orange-50 text-orange-600'
                                                                    }`}>{sub.Type}</span>
                                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 uppercase">{sub.Status}</span>
                                                                {sub.CourseName && (
                                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold uppercase">{sub.CourseName}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-10">
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-2xl font-black text-[#2B3674]">{sub.Score !== null ? Number(sub.Score).toFixed(2) : '-'}</span>
                                                                <span className="text-sm font-bold text-slate-300">/ {sub.MaxPoints}</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right hidden sm:block w-20">
                                                                <p className="text-xs font-black text-brand-blue uppercase">{sub.Score !== null ? Math.round((sub.Score / sub.MaxPoints) * 100) : 0}%</p>
                                                                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-brand-blue rounded-full"
                                                                        style={{ width: `${sub.Score !== null ? (sub.Score / sub.MaxPoints) * 100 : 0}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                            {sub.Type === 'Exam' && (
                                                                <ChevronRightIcon size={20} className="text-slate-300 group-hover:text-brand-blue transition-all" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination Controls */}
                                        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4">
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
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-orange-50 p-10 rounded-[40px] text-orange-600 border border-orange-100 text-center">
                            <h2 className="text-xl font-bold mb-2">Student Not Found</h2>
                            <p className="font-medium opacity-80">This student record may have been removed or moved.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentProgress;
