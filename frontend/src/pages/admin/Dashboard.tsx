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
    FileText,
    Activity,
    Loader
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const fetchDashData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [dashRes, announceRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/admin/announcements', {
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

            setRecentUsers(d.recentUsers);
            setChartData(d.monthlyRegistrations);
            setAnnouncements(announceRes.data.slice(0, 4));
            setLoading(false);
        } catch (err) {
            console.error('Error fetching admin dashboard:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashData();
    }, []);

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role="admin" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="admin" />
                </div>


                <div id="scrollable-body" className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100">
                            <Loader size={40} className="animate-spin text-brand-blue mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Admin Dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">System Overview</h1>
                                <p className="text-slate-500 mt-1 font-medium">Global statistics and recent administrative activity.</p>
                            </div>

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
                                {/* Recent Users Section */}
                                <div className="xl:col-span-2 space-y-8">
                                    <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
                                        <div className="flex justify-between items-center mb-10">
                                            <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Recent User Registrations</h2>
                                            <button onClick={() => navigate('/admin/users')} className="text-brand-blue font-black text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-8 transition-all">View All Users</button>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-center gap-8 py-6">
                                            {/* Total Card */}
                                            <div className="relative">
                                                <div className="w-32 h-32 rounded-[40px] bg-brand-blue/5 flex flex-col items-center justify-center border border-brand-blue/10 shadow-inner">
                                                    <span className="text-5xl font-black text-brand-blue tracking-tighter">
                                                        {recentUsers.length}
                                                    </span>
                                                    <span className="text-[9px] font-black text-brand-blue/40 uppercase tracking-widest mt-1">Total</span>
                                                </div>
                                                <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                    <Users size={18} />
                                                </div>
                                            </div>

                                            {/* Student Card */}
                                            <div className="relative">
                                                <div className="w-32 h-32 rounded-[40px] bg-emerald-50 flex flex-col items-center justify-center border border-emerald-100 shadow-inner">
                                                    <span className="text-5xl font-black text-emerald-600 tracking-tighter">
                                                        {recentUsers.filter(u => u.role === 'Student').length}
                                                    </span>
                                                    <span className="text-[9px] font-black text-emerald-600/40 uppercase tracking-widest mt-1">Students</span>
                                                </div>
                                                <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                    <School size={18} />
                                                </div>
                                            </div>

                                            <div className="flex-1 flex items-center gap-6 ml-4">
                                                <div className="max-w-md">
                                                    <h3 className="text-xl font-black text-[#2B3674] mb-2">Registration Metrics</h3>
                                                    <p className="text-slate-400 text-sm font-bold leading-relaxed">
                                                        Overview of all system registrations. Individual breakdown for Admins and Teachers is hidden to maintain focus on student growth.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {recentUsers.length === 0 && (
                                            <div className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No recent activity detected</div>
                                        )}
                                    </div>

                                    <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
                                        <div className="flex justify-between items-center mb-10">
                                            <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Growth Analytics</h2>
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-brand-blue"></div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Users per Month</span>
                                            </div>
                                        </div>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '800' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '800' }} />
                                                    <Tooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: '30px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'bold', padding: '20px' }}
                                                    />
                                                    <Bar dataKey="registrations" fill="#4318FF" radius={[12, 12, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Announcements & Side section */}
                                <div className="space-y-10">
                                    <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100">
                                        <div className="flex items-center justify-between mb-10">
                                            <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Bulletins</h2>
                                            <button
                                                onClick={() => navigate('/admin/announcements')}
                                                className="p-3 bg-slate-50 text-slate-400 hover:text-brand-blue rounded-2xl transition-all"
                                            >
                                                <BookOpen size={20} />
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {announcements.map((item, i) => (
                                                <div key={i} className="group cursor-pointer">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] text-brand-blue font-black uppercase tracking-[0.2em]">
                                                            {new Date(item.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-[#2B3674] group-hover:text-brand-blue transition-colors text-sm line-clamp-1">{item.Title}</h4>
                                                    <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mt-2">{item.Content}</p>
                                                    {i !== announcements.length - 1 && <div className="h-px bg-slate-50 w-full mt-6"></div>}
                                                </div>
                                            ))}
                                            {announcements.length === 0 && (
                                                <div className="py-12 text-center bg-slate-50 rounded-[35px] border border-dashed border-slate-200">
                                                    <p className="text-xs text-slate-300 font-black uppercase tracking-widest">Board is empty</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-[#111C44] to-[#1B254B] p-12 rounded-[50px] shadow-2xl shadow-blue-900/40 text-white overflow-hidden relative group border border-white/5">
                                        <div className="relative z-10">
                                            <div className="w-14 h-14 bg-brand-blue rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20">
                                                <School size={28} className="text-white" />
                                            </div>
                                            <h3 className="text-3xl font-black mb-4 tracking-tighter">System Insights</h3>
                                            <p className="text-white/60 text-sm mb-10 font-bold leading-relaxed">Access comprehensive metrics on academic performance and teacher productivity.</p>
                                            <button
                                                onClick={() => navigate('/admin/reports')}
                                                className="w-full bg-white text-[#111C44] py-5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-brand-blue hover:text-white transition-all duration-300 active:scale-95"
                                            >
                                                Explore Reports
                                            </button>
                                        </div>
                                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-56 h-56 bg-brand-blue/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
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

export default AdminDashboard;
