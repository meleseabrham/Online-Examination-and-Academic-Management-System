import { useState, useEffect, cloneElement } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Users,
    BookOpen,
    School,
    FileText,
    Calendar,
    CheckCircle,
    PlusCircle,
    ChevronRight,
    Loader,
    Clock
} from 'lucide-react';

interface Stats {
    classCount: number;
    courseCount: number;
    publishedExams: number;
    totalExams: number;
}

interface ClassItem {
    ClassId: number;
    GradeName: string;
    Section: string;
    StudentCount: number;
}

interface RecentExam {
    ExamId: number;
    Title: string;
    IsPublished: boolean;
    StartTime: string | null;
    GradeName: string;
    Section: string;
    CreatedAt: string;
}

const TeacherDashboard = () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email || 'teacher@example.com';

    const [stats, setStats] = useState<Stats>({ classCount: 0, courseCount: 0, publishedExams: 0, totalExams: 0 });
    const [myClasses, setMyClasses] = useState<ClassItem[]>([]);
    const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        Promise.all([
            axios.get('http://localhost:5000/api/teacher/dashboard/stats', { headers }),
            axios.get('http://localhost:5000/api/teacher/classes', { headers }),
            axios.get('http://localhost:5000/api/teacher/dashboard/recent-exams', { headers }),
        ]).then(([statsRes, classesRes, examsRes]) => {
            setStats(statsRes.data);
            setMyClasses(classesRes.data);
            setRecentExams(examsRes.data);
        }).catch(err => {
            console.error('Dashboard fetch error:', err);
        }).finally(() => setLoading(false));
    }, []);

    const statCards = [
        { title: 'My Classes', value: stats.classCount, color: 'card-gradient-blue', icon: <School size={24} /> },
        { title: 'My Courses', value: stats.courseCount, color: 'card-gradient-cyan', icon: <BookOpen size={24} /> },
        { title: 'Published Exams', value: stats.publishedExams, color: 'card-gradient-orange', icon: <FileText size={24} /> },
        { title: 'Draft Exams', value: stats.totalExams - stats.publishedExams, color: 'card-gradient-green', icon: <CheckCircle size={24} /> },
    ];

    const getExamStatus = (exam: RecentExam) => {
        if (!exam.IsPublished) return { label: 'Draft', cls: 'bg-slate-100 text-slate-600' };
        if (exam.StartTime && new Date(exam.StartTime) > new Date()) return { label: 'Scheduled', cls: 'bg-blue-100 text-blue-600' };
        return { label: 'Published', cls: 'bg-green-100 text-green-600' };
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="teacher" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="teacher" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">



                    {/* Stats Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader size={36} className="text-brand-blue animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {statCards.map((stat, i) => (
                                <div key={i} className={`${stat.color} p-5 rounded-[28px] text-white shadow-xl shadow-blue-500/10 flex items-center gap-4 group hover:scale-[1.02] active:scale-95 transition-all duration-300 relative overflow-hidden min-h-[96px]`}>
                                    {/* Left Icon Container (Image 2 style) */}
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white shadow-md group-hover:scale-105 transition-transform duration-300 relative z-10">
                                        {stat.icon && cloneElement(stat.icon as React.ReactElement, { size: 22, strokeWidth: 2.2 })}
                                    </div>

                                    {/* Right Text Content (Image 2 style) */}
                                    <div className="relative z-10 flex flex-col min-w-0 flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-white/80 truncate mb-1 leading-none">{stat.title}</p>
                                        <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm leading-none">{stat.value}</h3>
                                    </div>

                                    {/* Subtle Highlight */}
                                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* My Classes */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-[#2B3674]">My Classes</h2>
                                    <Link to="/teacher/classes" className="text-brand-blue flex items-center gap-2 font-semibold hover:gap-3 transition-all text-sm">
                                        View All
                                        <ChevronRight size={16} />
                                    </Link>
                                </div>
                                {myClasses.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <School size={32} className="mx-auto mb-3 text-slate-200" />
                                        <p className="text-sm font-medium">No classes assigned yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {myClasses.map((item) => (
                                            <div key={item.ClassId} className="p-6 rounded-2xl border border-slate-100 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer group">
                                                <h4 className="font-bold text-lg text-[#2B3674]">{item.GradeName}</h4>
                                                <p className="text-slate-500 text-sm">Section {item.Section}</p>
                                                <div className="mt-4 flex items-center gap-2 text-brand-blue">
                                                    <Users size={16} />
                                                    <span className="font-semibold">{item.StudentCount} Students</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent Exams */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-[#2B3674]">Recent Exams</h2>
                                        <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100">
                                            <Clock size={10} />
                                            Last 1 Hour
                                        </span>
                                    </div>
                                    <Link to="/teacher/create-exam" className="text-brand-blue flex items-center gap-2 font-semibold text-sm hover:gap-3 transition-all">
                                        <PlusCircle size={16} />
                                        New Exam
                                    </Link>
                                </div>
                                {recentExams.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <FileText size={32} className="mx-auto mb-3 text-slate-200" />
                                        <p className="text-sm font-medium">No exams in the last hour.</p>
                                        <p className="text-xs text-slate-300 mt-1">Exams created or starting within the last hour will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                                                    <th className="pb-4">Exam Title</th>
                                                    <th className="pb-4">Class</th>
                                                    <th className="pb-4">Status</th>
                                                    <th className="pb-4">Date & Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {recentExams.map((exam) => {
                                                    const status = getExamStatus(exam);
                                                    return (
                                                        <tr key={exam.ExamId} className="hover:bg-slate-50 transition-all">
                                                            <td className="py-4 font-semibold text-slate-700">{exam.Title}</td>
                                                            <td className="py-4 text-slate-600">
                                                                {exam.GradeName ? `${exam.GradeName} - ${exam.Section}` : '—'}
                                                            </td>
                                                            <td className="py-4">
                                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${status.cls}`}>
                                                                    {status.label}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-slate-500 text-sm">
                                                                {exam.StartTime ? new Date(exam.StartTime).toLocaleString() : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
                                <Calendar className="mx-auto text-brand-blue mb-4" size={48} />
                                <h3 className="font-bold text-lg mb-2 text-[#2B3674]">Create New Exam</h3>
                                <p className="text-slate-500 text-sm mb-6">Pick a class and course to start building a new examination.</p>
                                <Link to="/teacher/create-exam">
                                    <button className="w-full bg-brand-blue text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all">
                                        Create Exam
                                    </button>
                                </Link>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-lg mb-6 text-[#2B3674]">Quick Links</h3>
                                <div className="space-y-3">
                                    <Link to="/teacher/classes" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-brand-blue transition-all">
                                        <School size={18} className="text-brand-blue" />
                                        <span className="text-sm font-bold">My Classes</span>
                                    </Link>
                                    <Link to="/teacher/courses" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-brand-blue transition-all">
                                        <BookOpen size={18} className="text-brand-blue" />
                                        <span className="text-sm font-bold">My Courses</span>
                                    </Link>
                                    <Link to="/teacher/results" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-brand-blue transition-all">
                                        <CheckCircle size={18} className="text-brand-blue" />
                                        <span className="text-sm font-bold">View Results</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
