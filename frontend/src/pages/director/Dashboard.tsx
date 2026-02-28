import React, { useState, useEffect, cloneElement } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Users,
    UserCheck,
    BookOpen,
    School,
    Loader
} from 'lucide-react';


const DirectorDashboard = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'director@example.com';

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const fetchDashData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [dashRes, announceRes] = await Promise.all([
                axios.get('http://localhost:5000/api/director/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/director/announcements', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const d = dashRes.data;
            const s = d.stats;

            setStats([
                { title: 'Total Students', value: s.studentCount.toLocaleString(), color: 'card-gradient-blue', icon: <Users size={24} strokeWidth={2.5} /> },
                { title: 'Total Teachers', value: s.teacherCount.toLocaleString(), color: 'card-gradient-orange', icon: <UserCheck size={24} strokeWidth={2.5} /> },
                { title: 'Total Courses', value: s.courseCount.toLocaleString(), color: 'card-gradient-cyan', icon: <BookOpen size={24} strokeWidth={2.5} /> },
                { title: 'Total Classes', value: s.classCount.toLocaleString(), color: 'card-gradient-green', icon: <School size={24} strokeWidth={2.5} /> },
                { title: 'Total Exams', value: s.examCount.toLocaleString(), color: 'card-gradient-blue', icon: <BookOpen size={24} strokeWidth={2.5} /> },
                { title: 'Active Exams', value: s.activeExamsNow.toLocaleString(), color: 'card-gradient-green', icon: <Users size={24} strokeWidth={2.5} /> },
            ]);

            setAnnouncements(announceRes.data.slice(0, 4));
            setLoading(false);
        } catch (err) {
            console.error('Error fetching director dashboard:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashData();
    }, []);

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role="director" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="director" />
                </div>


                <div id="scrollable-body" className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100">
                            <Loader size={40} className="animate-spin text-brand-blue mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Director Dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">Director Overview</h1>
                                <p className="text-slate-500 mt-1 font-medium">Academic performance and system statistics.</p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-12">
                                {stats.map((stat, i) => (
                                    <div key={i} className={`${stat.color} p-6 rounded-[35px] text-white shadow-2xl shadow-blue-500/20 flex flex-col items-center justify-center text-center group hover:scale-[1.03] active:scale-95 transition-all duration-500 relative overflow-hidden min-h-[180px]`}>
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                        <div className="absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-10 group-hover:scale-150 group-hover:-rotate-12 transition-all duration-1000 pointer-events-none text-white">
                                            {stat.icon && cloneElement(stat.icon as React.ReactElement, { size: 140, strokeWidth: 1 })}
                                        </div>
                                        <div className="mb-4 bg-white/20 p-4 rounded-[22px] relative z-10 shadow-xl backdrop-blur-md group-hover:translate-y-[-5px] group-hover:rotate-3 transition-all duration-500 border border-white/30">
                                            {stat.icon}
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-70 mb-1 leading-none drop-shadow-sm">{stat.title}</p>
                                            <h3 className="text-4xl font-black tracking-tighter drop-shadow-md">{stat.value}</h3>
                                        </div>
                                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
                                <div className="xl:col-span-2 space-y-8">
                                    <div className="bg-gradient-to-br from-[#111C44] to-[#1B254B] p-12 rounded-[50px] shadow-2xl shadow-blue-900/40 text-white overflow-hidden relative group border border-white/5">
                                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                            <div className="flex-1">
                                                <h2 className="text-3xl font-black mb-4 tracking-tighter">Academic Oversight</h2>
                                                <p className="text-white/60 text-sm mb-10 font-bold leading-relaxed max-w-md">Oversee classes, assessments, evaluate student progress, and finalize grade processing for the current academic session.</p>

                                                <div className="flex gap-4 flex-wrap">
                                                    <button
                                                        onClick={() => navigate('/director/academic?tab=results')}
                                                        className="bg-brand-blue text-white py-4 px-8 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all duration-300"
                                                    >
                                                        Process Results
                                                    </button>
                                                    <button
                                                        onClick={() => navigate('/director/assessments')}
                                                        className="bg-white/10 text-white border border-white/20 py-4 px-8 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all duration-300"
                                                    >
                                                        Review Exams
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                <School size={80} className="text-brand-blue/80" />
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-56 h-56 bg-brand-blue/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-100 cursor-pointer hover:border-brand-blue/30 transition-colors group" onClick={() => navigate('/director/teachers')}>
                                            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-6">
                                                <UserCheck size={24} />
                                            </div>
                                            <h3 className="font-black text-[#2B3674] text-lg mb-2">Teacher Oversight</h3>
                                            <p className="text-slate-400 text-xs font-bold leading-relaxed">Assign courses to teachers and monitor instructional output.</p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-100 cursor-pointer hover:border-brand-blue/30 transition-colors group" onClick={() => navigate('/director/results')}>
                                            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-6">
                                                <BookOpen size={24} />
                                            </div>
                                            <h3 className="font-black text-[#2B3674] text-lg mb-2">Student Performance</h3>
                                            <p className="text-slate-400 text-xs font-bold leading-relaxed">Review finalized exam attempts, essay grading, and analytics.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
                                        <div className="flex items-center justify-between mb-10">
                                            <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Recent Announcements</h2>
                                        </div>
                                        <div className="space-y-6">
                                            {announcements.map((item, i) => (
                                                <div key={i} className="group cursor-default">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] text-brand-blue font-black uppercase tracking-[0.2em]">
                                                            {new Date(item.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-[#2B3674] text-sm line-clamp-2 leading-relaxed">{item.Title}</h4>
                                                    <p className="text-xs text-slate-400 font-medium line-clamp-3 leading-relaxed mt-2">{item.Content}</p>
                                                    {i !== announcements.length - 1 && <div className="h-px bg-slate-50 w-full mt-6"></div>}
                                                </div>
                                            ))}
                                            {announcements.length === 0 && (
                                                <div className="py-12 text-center bg-slate-50 rounded-[35px] border border-dashed border-slate-200">
                                                    <p className="text-xs text-slate-300 font-black uppercase tracking-widest">No Bulletins Available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DirectorDashboard;



