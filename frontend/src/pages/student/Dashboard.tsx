import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Trophy,
    Clock,
    ChevronRight,
    Play,
    CheckCircle,
    Loader,
    AlertCircle,
    BookOpen,
    X,
    Award,
    Target
} from 'lucide-react';

interface Exam {
    ExamId: number;
    Title: string;
    CourseName: string;
    GradeName: string;
    Section: string;
    DurationMinutes: number;
    StartTime: string;
    EndTime: string;
    InProgressAttemptId?: number | null;
    Description?: string;
    TotalMarks?: number;
    Type?: string;
}

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ active: 0, completed: 0, average: 0, totalRaw: '0 / 0' });
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsRes, resultsRes, annRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/student/exams', { headers }),
                    axios.get('http://localhost:5000/api/student/results', { headers }),
                    axios.get('http://localhost:5000/api/student/announcements', { headers })
                ]);

                setExams(examsRes.data);
                setAnnouncements(annRes.data.slice(0, 2)); // Show top 2

                const results = resultsRes.data.submissions || [];
                const completed = results.length;
                const totalScore = results.reduce((acc: number, r: any) => acc + (r.Score || 0), 0);
                const totalPoints = results.reduce((acc: number, r: any) => acc + (r.TotalPoints || 100), 0);
                const avg = completed > 0 ? (totalScore / totalPoints) * 100 : 0;

                setStats({
                    active: examsRes.data.length,
                    completed: completed,
                    average: Math.round(avg * 10) / 10,
                    totalRaw: `${totalScore} / ${totalPoints}`
                });
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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

    const statCards = [
        { title: 'Active Exams', value: stats.active, color: 'card-gradient-orange', icon: <Clock size={24} /> },
        { title: 'Completed', value: stats.completed, color: 'card-gradient-green', icon: <CheckCircle size={24} /> },
        { title: 'Total Raw Score', value: stats.totalRaw, color: 'card-gradient-blue', icon: <Trophy size={24} /> },
    ];

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role="student" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role="student" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">
                    <div className="mb-10 mt-4">
                        <h1 className="text-4xl font-black text-[#2B3674] tracking-tight">Student Dashboard</h1>
                        <p className="text-slate-500 font-medium mt-1">Welcome back! Here's a summary of your academic progress.</p>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        {statCards.map((card, i) => (
                            <div key={i} className={`p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] ${card.color}`}>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{card.title}</p>
                                        <h3 className="text-4xl font-black tracking-tighter">{card.value}</h3>
                                    </div>
                                    <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md group-hover:rotate-12 transition-transform duration-500">
                                        {card.icon}
                                    </div>
                                </div>
                                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Left Column: Stats & Exams */}
                        <div className="xl:col-span-3 space-y-10">
                            {/* Live/Upcoming Exams */}
                            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100/50">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Available Sessions</h2>
                                    <button
                                        onClick={() => navigate('/student/exams')}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-brand-blue rounded-2xl transition-all"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-20"><Loader size={40} className="animate-spin text-brand-blue" /></div>
                                ) : exams.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                                        <AlertCircle size={40} className="text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No exams currently scheduled</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {exams.map((exam) => {
                                            const now = new Date();
                                            const startTime = exam.StartTime ? new Date(exam.StartTime) : null;
                                            const endTime = exam.EndTime ? new Date(exam.EndTime) : null;
                                            const isUpcoming = startTime && now < startTime;
                                            const isEnded = endTime && now > endTime;
                                            const isActive = (!startTime || now >= startTime) && (!endTime || now <= endTime);

                                            if (isEnded) return null;

                                            return (
                                                <div
                                                    key={exam.ExamId}
                                                    onClick={() => setSelectedExam(exam)}
                                                    className="group flex flex-col md:flex-row items-center justify-between p-6 rounded-[35px] bg-slate-50/50 border border-transparent hover:bg-white hover:border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className={`p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${isActive ? 'bg-brand-blue text-white shadow-blue-500/20' : 'bg-white text-slate-300'}`}>
                                                            <Play size={20} fill={isActive ? "white" : "none"} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-[#2B3674] group-hover:text-brand-blue transition-colors">{exam.Title}</h3>
                                                            <div className="flex items-center gap-4 mt-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.CourseName}</span>
                                                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                                                                    <Clock size={12} />
                                                                    {exam.DurationMinutes} Minutes
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                                                        {exam.InProgressAttemptId ? (
                                                            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase bg-orange-100 text-orange-600 px-3 py-1 rounded-full animate-pulse shadow-sm">
                                                                <span className="w-2 h-2 bg-orange-600 rounded-full animate-ping"></span>
                                                                In Progress
                                                            </span>
                                                        ) : isActive ? (
                                                            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase bg-red-100 text-red-600 px-3 py-1 rounded-full shadow-sm">
                                                                <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                                                                Live
                                                            </span>
                                                        ) : isUpcoming ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
                                                                ⏳ Coming Soon
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                                                                ⛔ Expired
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Recent Results Section */}
                            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100/50">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Recent Performance</h2>
                                    <button
                                        onClick={() => navigate('/student/results')}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-brand-blue rounded-2xl transition-all"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {stats.completed === 0 ? (
                                        <div className="col-span-2 py-10 text-center bg-slate-50 rounded-[40px]">
                                            <Trophy size={40} className="text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Complete your first exam to see results</p>
                                        </div>
                                    ) : (
                                        <div className="p-8 rounded-[40px] bg-[#111C44] text-white shadow-xl relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Overall Average</p>
                                                <h4 className="text-5xl font-black tracking-tighter mb-4">{stats.average}%</h4>
                                                <div className="w-full h-2 bg-white/10 rounded-full mt-6 overflow-hidden">
                                                    <div className="h-full bg-brand-blue rounded-full" style={{ width: `${stats.average}%` }}></div>
                                                </div>
                                            </div>
                                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                                        </div>
                                    )}
                                    <div className="
                                        relative overflow-hidden
                                        p-6 rounded-3xl
                                        bg-blue-500
                                        text-white
                                        shadow-lg hover:shadow-xl
                                        transition-all duration-300
                                        hover:-translate-y-1
                                        group
                                    ">

                                        {/* Soft Glow Effect */}
                                        <div className="
                                            absolute -top-16 -right-16 w-40 h-40
                                            bg-white/10 rounded-full blur-3xl
                                            group-hover:scale-125 transition-all duration-500
                                        " />

                                        <div className="relative z-10">

                                            {/* Icon Container */}
                                            <div className="
                                                mb-4 inline-flex items-center justify-center
                                                w-14 h-14 rounded-2xl
                                                bg-white/10 backdrop-blur-md
                                            ">
                                                <Trophy size={26} className="text-yellow-400" />
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-lg font-semibold tracking-tight mb-2">
                                                Exam Excellence
                                            </h3>

                                            {/* Description */}
                                            <p className="text-white/80 text-sm leading-relaxed">
                                                View detailed analysis of your performance across all subjects.
                                            </p>

                                            {/* Button */}
                                            <button
                                                onClick={() => navigate('/student/results')}
                                                className="
                                                   mt-5
                                                inline-flex items-center gap-2
                                                px-5 py-2.5
                                                text-xs font-semibold
                                                rounded-xl
                                                bg-white/15 hover:bg-white/25
                                                  transition-all duration-200
                                                active:scale-95
                                            "
                                            >
                                                View Analytics →
                                            </button>

                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Right Column: Announcements */}
                        <div className="space-y-10">
                            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100/50">
                                <h2 className="text-2xl font-black text-[#2B3674] tracking-tight mb-8">Board</h2>
                                <div className="space-y-8">
                                    {announcements.length === 0 ? (
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center py-4">No recent notices</p>
                                    ) : (
                                        announcements.map((ann) => (
                                            <div key={ann.Id} className="border-l-4 border-brand-blue pl-6 py-2">
                                                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2">
                                                    {new Date(ann.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                                <h4 className="font-bold text-[#2B3674] text-sm">{ann.Title}</h4>
                                                <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed line-clamp-2">{ann.Content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button
                                    onClick={() => navigate('/student/announcements')}
                                    className="w-full mt-10 py-5 rounded-3xl text-brand-blue font-black text-xs uppercase tracking-widest border-2 border-brand-blue/10 hover:bg-brand-blue/5 transition-all"
                                >
                                    View All Notices
                                </button>
                            </div>

                            <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100/50 text-center relative overflow-hidden group">
                                <div className="w-20 h-20 bg-brand-blue/5 rounded-3xl flex items-center justify-center text-brand-blue mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <BookOpen size={36} />
                                </div>
                                <h3 className="text-xl font-bold text-[#2B3674] mb-3 tracking-tight">Need Help?</h3>
                                <p className="text-slate-400 text-xs font-medium mb-8 leading-relaxed">Access exam guides and student resources to prepare for your sessions.</p>
                                <button onClick={() => navigate('/student/guides')} className="bg-brand-blue text-white w-full py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all text-xs uppercase tracking-widest">
                                    Open Guide
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Exam Detail Modal */}
            {selectedExam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#2B3674]/40 backdrop-blur-sm" onClick={() => setSelectedExam(null)}></div>
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="bg-[#F4F7FE] p-8 flex justify-between items-start">
                            <div>
                                <span className="bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                                    Exam Preview
                                </span>
                                <h3 className="text-2xl font-black text-[#2B3674] tracking-tight">{selectedExam.Title}</h3>
                                <p className="text-slate-400 font-medium text-sm mt-1">{selectedExam.CourseName} {selectedExam.GradeName ? `• Grade ${selectedExam.GradeName}-${selectedExam.Section}` : ''}</p>
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
                                    <p className="text-lg font-black text-[#2B3674]">{selectedExam.Type || 'Quiz'}</p>
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
                                        Make sure you have enough time to complete it before the session ends.
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
                            {(() => {
                                const now = new Date();
                                const startTime = selectedExam.StartTime ? new Date(selectedExam.StartTime) : null;
                                const endTime = selectedExam.EndTime ? new Date(selectedExam.EndTime) : null;
                                const isActive = (!startTime || now >= startTime) && (!endTime || now <= endTime);
                                const isUpcoming = startTime && now < startTime;

                                return (
                                    <button
                                        disabled={!isActive}
                                        onClick={() => {
                                            handleStartExam(selectedExam);
                                            setSelectedExam(null);
                                        }}
                                        className={`flex-[2] py-4 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 ${isActive
                                            ? selectedExam.InProgressAttemptId
                                                ? 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600'
                                                : 'bg-brand-blue text-white shadow-blue-500/30 hover:bg-blue-600'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        <Play size={16} fill={isActive ? "currentColor" : "none"} />
                                        {isActive ? (selectedExam.InProgressAttemptId ? 'Resume Exam' : 'Start Exam Now') : isUpcoming ? 'Not Started Yet' : 'Exam Expired'}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
