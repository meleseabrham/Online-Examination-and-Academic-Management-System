import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { FileText, Play, Clock, AlertCircle, Loader, X, Award, Target, Calendar, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, RotateCcw } from 'lucide-react';

interface Exam {
    ExamId: number;
    Title: string;
    CourseName: string;
    DurationMinutes: number;
    StartTime: string;
    EndTime: string;
    IsTaken: number;
    InProgressAttemptId?: number | null;
    Description?: string;
    TotalMarks?: number;
    ExamType?: string;
    GradeName?: string;
    Section?: string;
    SemesterName?: string;
    IsMakeup?: boolean;
    ParentExamId?: number | null;
    ParentExamTitle?: string | null;
    OverrideStartTime?: string | null;
    OverrideEndTime?: string | null;
}

const MyExams = () => {
    const navigate = useNavigate();
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(6);
    const [perPageOpen, setPerPageOpen] = useState(false);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/student/exams', { headers });
                setExams(res.data);
            } catch (err) {
                console.error('Error fetching exams:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const handleStartExam = (exam: Exam) => {
        const isResume = !!exam.InProgressAttemptId;
        const msg = isResume
            ? 'You have an exam in progress. Do you want to resume it?'
            : 'Are you sure you want to start this exam? The timer will begin immediately.';
        if (window.confirm(msg)) {
            navigate(`/student/take-exam/${exam.ExamId}`);
        }
    };

    // Pagination Logic
    const filteredExams = exams.filter(exam => {
        const end = exam.OverrideEndTime || exam.EndTime;
        return !end || new Date(end) > new Date();
    });
    const totalPages = Math.ceil(filteredExams.length / perPage);
    const paginatedExams = filteredExams.slice((currentPage - 1) * perPage, currentPage * perPage);

    const getPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
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

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">


                    {loading ? (
                        <div className="flex justify-center py-20"><Loader size={40} className="animate-spin text-brand-blue" /></div>
                    ) : filteredExams.length === 0 ? (
                        <div className="bg-white p-20 rounded-[40px] text-center shadow-sm border border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <FileText size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2B3674]">No Exams Available</h3>
                            <p className="text-slate-400 mt-2">There are no published or active exams for you at the moment.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {paginatedExams.map((exam) => {
                                    const now = new Date();
                                    const hasOverride = !!(exam.OverrideStartTime || exam.OverrideEndTime);
                                    const startTime = (exam.OverrideStartTime || exam.StartTime) ? new Date(exam.OverrideStartTime || exam.StartTime) : null;
                                    const endTime = (exam.OverrideEndTime || exam.EndTime) ? new Date(exam.OverrideEndTime || exam.EndTime) : null;
                                    const isUpcoming = startTime && now < startTime;
                                    const isEnded = endTime && now > endTime;
                                    const isActive = (!startTime || now >= startTime) && (!endTime || now <= endTime);

                                    return (
                                        <div key={exam.ExamId} className={`bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between hover:shadow-xl transition-all duration-500 group relative overflow-hidden backdrop-blur-sm ${!isActive ? 'opacity-75' : ''}`}>
                                            {/* Top-Right Red Flag for Makeup */}
                                            {exam.IsMakeup && (
                                                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-20">
                                                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[64px] border-t-red-600 border-l-[64px] border-l-transparent"></div>
                                                </div>
                                            )}
                                            <div className={`absolute top-0 left-0 w-2 h-full transition-all ${isActive ? 'bg-brand-blue opacity-0 group-hover:opacity-100' : isUpcoming ? 'bg-orange-400 opacity-50' : 'bg-slate-300 opacity-50'}`}></div>
                                            <div className="flex items-center gap-6 z-10 text-left">
                                                <div className={`p-5 rounded-3xl transition-all duration-300 shadow-sm border ${isActive ? 'bg-brand-blue/5 text-brand-blue group-hover:bg-brand-blue group-hover:text-white border-brand-blue/10' : isUpcoming ? 'bg-orange-50 text-orange-400 border-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                                    <FileText size={28} />
                                                </div>
                                                <div>
                                                    <h3 className={`text-2xl font-black tracking-tight ${!isActive ? 'text-slate-400' : 'text-[#2B3674]'}`}>{exam.Title}</h3>
                                                    <div className="flex flex-wrap items-center gap-4 mt-3">
                                                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${isActive ? 'text-brand-blue bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>{exam.CourseName}</span>
                                                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-tighter">
                                                            <Clock size={14} className="text-slate-300" />
                                                            <span>{exam.DurationMinutes} Minutes</span>
                                                        </div>
                                                        {exam.IsMakeup && (
                                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#D97706] bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 shadow-sm">
                                                                <RotateCcw size={12} className="text-amber-500" />
                                                                Make-Up Session
                                                            </div>
                                                        )}
                                                        {hasOverride && exam.IsMakeup && (
                                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                                                                <RotateCcw size={12} className="text-emerald-500" />
                                                                Re-Assigned
                                                            </div>
                                                        )}
                                                    </div>
                                                    {exam.IsMakeup && exam.ParentExamTitle && (
                                                        <div className="mt-2 text-[10px] font-bold text-slate-400 italic">
                                                            Original Assessment: <span className="text-brand-blue">{exam.ParentExamTitle}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-4 mt-2">
                                                        {exam.SemesterName && (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-blue bg-blue-50 px-2 py-0.5 rounded">
                                                                {exam.SemesterName}
                                                            </div>
                                                        )}
                                                        {startTime && (
                                                            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${isUpcoming ? 'text-orange-500' : 'text-slate-400'}`}>
                                                                <Calendar size={12} />
                                                                Start: {startTime.toLocaleString()}
                                                            </div>
                                                        )}
                                                        {endTime && (
                                                            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${isEnded ? 'text-red-500' : 'text-slate-400'}`}>
                                                                <Clock size={12} />
                                                                End: {endTime.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right mt-6 sm:mt-0 z-10">
                                                <div className="mb-4">
                                                    {exam.InProgressAttemptId ? (
                                                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">In Progress</span>
                                                    ) : isActive ? (
                                                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest">Available Now</span>
                                                    ) : isUpcoming ? (
                                                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest">Starts Soon</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest">Expired</span>
                                                    )}
                                                </div>
                                                <button
                                                    disabled={!isActive}
                                                    onClick={() => setSelectedExam(exam)}
                                                    className={`px-8 py-4 rounded-[24px] font-black shadow-xl transition-all flex items-center gap-3 whitespace-nowrap ${isActive
                                                        ? exam.InProgressAttemptId
                                                            ? 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600 hover:scale-105 active:scale-95'
                                                            : 'bg-brand-blue text-white shadow-blue-500/30 hover:bg-blue-600 hover:scale-105 active:scale-95'
                                                        : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                                                        }`}
                                                >
                                                    <Play size={18} fill={isActive ? "white" : "currentColor"} className="ml-1" />
                                                    {isUpcoming ? 'Not Started' : isEnded ? 'Ended' : exam.InProgressAttemptId ? 'Resume Exam' : 'Start Exam'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
                                    <div className="relative">
                                        <button
                                            onClick={() => setPerPageOpen(!perPageOpen)}
                                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                        >
                                            {perPage} / page
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${perPageOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {perPageOpen && (
                                            <div className="absolute left-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-200">
                                                {[4, 6, 12, 24].map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                        className={`w-full text-left px-6 py-3 text-xs font-black transition-all ${perPage === size
                                                            ? 'text-brand-blue bg-blue-50'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        {size} Per Page
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-slate-50 disabled:opacity-30 transition-all border border-slate-100 shadow-sm"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {getPageNumbers().map((p, i) => (
                                                p === '...' ? (
                                                    <div key={i} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                        <MoreHorizontal size={14} />
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={i}
                                                        onClick={() => typeof p === 'number' && setCurrentPage(p)}
                                                        className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${currentPage === p
                                                            ? 'border-brand-blue text-brand-blue bg-white shadow-lg shadow-blue-500/10'
                                                            : 'border-slate-100 text-slate-400 hover:text-brand-blue hover:border-brand-blue/30'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-slate-50 disabled:opacity-30 transition-all border border-slate-100 shadow-sm"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {exams.length > 0 && (
                        <div className="mt-20 max-w-xl ml-auto 
                    bg-[#111C44] p-6 rounded-3xl 
                    text-white shadow-xl relative 
                    overflow-hidden border border-white/5">

                            <div className="relative z-10 flex items-start gap-5">

                                {/* Icon */}
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                    <AlertCircle size={28} className="text-red-400" />
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-1 tracking-tight">
                                        Examination Rules
                                    </h3>
                                    <p className="text-white/60 text-md leading-relaxed">
                                        Once you start, the timer cannot be paused. Ensure stable internet.
                                        Do not refresh or leave the page during the exam.
                                    </p>
                                </div>

                                {/* Button */}
                                <div>
                                    <button className="bg-white/10 hover:bg-white/20 
                            px-4 py-2 rounded-xl 
                            text-xs font-semibold 
                            transition-all border border-white/10">
                                        Read Guide
                                    </button>
                                </div>

                            </div>

                            {/* Subtle Glow Effect */}
                            <div className="absolute -right-16 -top-16 w-40 h-40 
                    bg-brand-blue/10 rounded-full blur-2xl"></div>
                        </div>
                    )}
                </div>
            </main >

            {/* Exam Detail Modal */}
            {
                selectedExam && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left">
                        <div className="absolute inset-0 bg-[#2B3674]/40 backdrop-blur-sm" onClick={() => setSelectedExam(null)}></div>
                        <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                            {/* Modal Header */}
                            <div className="bg-[#F4F7FE] p-8 flex justify-between items-start text-left">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                                            Exam Preview
                                        </span>
                                        {selectedExam.IsMakeup && (
                                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block flex items-center gap-1">
                                                <RotateCcw size={10} /> Make-Up
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black text-[#2B3674] tracking-tight">{selectedExam.Title}</h3>
                                    <p className="text-slate-400 font-medium text-sm mt-1">
                                        {selectedExam.CourseName} {selectedExam.GradeName ? `• Grade ${selectedExam.GradeName}-${selectedExam.Section}` : ''}
                                        {selectedExam.IsMakeup && selectedExam.ParentExamTitle && (
                                            <> • <span className="text-amber-600 italic">Re-assessment for {selectedExam.ParentExamTitle}</span></>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedExam(null)}
                                    className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-sm transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-8">
                                {/* Stats Bar */}
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Clock size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Duration</span>
                                        </div>
                                        <p className="text-lg font-black text-[#2B3674]">{selectedExam.DurationMinutes} Min</p>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Award size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Marks</span>
                                        </div>
                                        <p className="text-lg font-black text-[#2B3674]">{selectedExam.TotalMarks || 100} Pts</p>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Target size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Type</span>
                                        </div>
                                        <p className="text-lg font-black text-[#2B3674]">{selectedExam.ExamType || 'Quiz'}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Instructions & Description</h4>
                                    <div className="bg-slate-50/50 p-6 rounded-[30px] border border-slate-100 text-[#2B3674] text-sm leading-relaxed font-medium">
                                        {selectedExam.Description ? (
                                            <p className="whitespace-pre-wrap">{selectedExam.Description}</p>
                                        ) : (
                                            <p className="italic opacity-50">No additional instructions provided for this exam.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Important Notes */}
                                <div className="flex items-start gap-4 p-5 bg-orange-50 rounded-3xl border border-orange-100">
                                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 shrink-0">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-orange-700 text-sm italic">Important Note</h5>
                                        <p className="text-orange-600/80 text-[11px] font-medium leading-relaxed mt-1">
                                            This exam is scheduled from {new Date(selectedExam.StartTime).toLocaleString()} to {new Date(selectedExam.EndTime).toLocaleString()}.
                                            Make sure you have enough time to complete it before the end time.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 pt-0 flex gap-4">
                                <button
                                    onClick={() => setSelectedExam(null)}
                                    className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:text-[#2B3674] hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleStartExam(selectedExam);
                                        setSelectedExam(null);
                                    }}
                                    className={`flex-[2] py-4 rounded-2xl font-black shadow-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-3 whitespace-nowrap hover:scale-[1.02] active:scale-95 ${selectedExam.InProgressAttemptId
                                        ? 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600'
                                        : 'bg-brand-blue text-white shadow-blue-500/30 hover:bg-blue-600'
                                        }`}
                                >
                                    <Play size={16} fill="currentColor" />
                                    {selectedExam.InProgressAttemptId ? 'Resume Exam' : 'Start Exam Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MyExams;
