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
    Loader,
    FileText,
    Activity,
    Globe
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
                { title: 'Total Students', value: s.studentCount.toLocaleString(), color: 'card-gradient-blue', icon: <Users size={24} strokeWidth={2.2} /> },
                { title: 'Total Teachers', value: s.teacherCount.toLocaleString(), color: 'card-gradient-orange', icon: <UserCheck size={24} strokeWidth={2.2} /> },
                { title: 'Total Courses', value: s.courseCount.toLocaleString(), color: 'card-gradient-cyan', icon: <BookOpen size={24} strokeWidth={2.2} /> },
                { title: 'Total Classes', value: s.classCount.toLocaleString(), color: 'card-gradient-green', icon: <School size={24} strokeWidth={2.2} /> },
                { title: 'Total Exams', value: s.examCount.toLocaleString(), color: 'card-gradient-purple', icon: <FileText size={24} strokeWidth={2.2} /> },
                { title: 'Active Exams', value: s.activeExamsNow.toLocaleString(), color: 'card-gradient-rose', icon: <Activity size={24} strokeWidth={2.2} /> },
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


                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-12">
                                {stats.map((stat, i) => (
                                    <div key={i} className={`${stat.color} p-5 rounded-[28px] text-white shadow-xl shadow-blue-500/10 flex items-center gap-4 group hover:scale-[1.03] active:scale-95 transition-all duration-300 relative overflow-hidden min-h-[96px]`}>
                                        {/* Background Icon Watermark */}
                                        <div className="absolute -right-4 -bottom-4 opacity-[0.08] group-hover:opacity-15 group-hover:scale-125 transition-all duration-500 pointer-events-none text-white">
                                            {stat.icon && cloneElement(stat.icon as React.ReactElement, { size: 90, strokeWidth: 1.5 })}
                                        </div>

                                        {/* Left Icon Container (Image 2 style) */}
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white shadow-md group-hover:scale-105 transition-transform duration-300 relative z-10">
                                            {stat.icon && cloneElement(stat.icon as React.ReactElement, { size: 22, strokeWidth: 2.2 })}
                                        </div>

                                        {/* Right Text Content (Image 2 style) */}
                                        <div className="relative z-10 flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-white/80 truncate leading-none">{stat.title}</p>
                                                {stat.title.toLowerCase().includes('active') && (
                                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-white/20 text-white px-1.5 py-0.5 rounded-full border border-white/30 shrink-0">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm leading-none">{stat.value}</h3>
                                        </div>

                                        {/* Subtle Highlight */}
                                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
                                {/* Left Column: Recent Announcements */}
                                <div className="xl:col-span-2 space-y-8">
                                    <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100 h-full">
                                        <div className="flex items-center justify-between mb-8">
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

                                {/* Right Column: Clean Quick Actions Card (Image 2 style) */}
                                <div className="xl:col-span-1 space-y-8">
                                    <div className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Globe size={22} className="text-[#1B2559]" />
                                            <h2 className="text-xl font-bold text-[#1B2559] tracking-tight">Quick Actions</h2>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { label: 'Process Results', path: '/director/academic?tab=results' },
                                                { label: 'Review Exams', path: '/director/assessments' },
                                                { label: 'Teacher Oversight', path: '/director/teachers' },
                                                { label: 'Student Performance', path: '/director/results' },
                                                { label: 'Reports & Analytics', path: '/director/reports' },
                                                { label: 'Live Proctor Monitor', path: '/director/live-monitor' }
                                            ].map((action, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => navigate(action.path)}
                                                    className="w-full py-3.5 px-6 rounded-2xl border border-slate-200 bg-white text-[#2B3674] hover:text-brand-blue hover:border-brand-blue/50 hover:shadow-sm transition-all duration-200 font-semibold text-sm text-center cursor-pointer active:scale-[0.99]"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
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



