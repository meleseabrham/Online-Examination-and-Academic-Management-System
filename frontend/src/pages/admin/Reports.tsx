import { useState, useEffect, useCallback, useRef } from 'react';

import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    LabelList,
    PieChart,
    Pie,
    Legend
} from 'recharts';
import {
    TrendingUp,
    Users,
    BookOpen,
    Download,
    Calendar,
    Loader2,
    ChevronDown,
    HeartPulse,
    Activity,
    Zap,
    Target,
    BarChart3,
    ArrowUpRight,
    Search,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminReports = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';


    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [timeRange, setTimeRange] = useState('6');
    const [selectedSchool, setSelectedSchool] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [schools, setSchools] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const fetchSupportingData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [sRes, cRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/schools', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5000/api/admin/grades', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setSchools(sRes.data);
            setClasses(cRes.data);
        } catch (err) {
            console.error('Error fetching filters:', err);
        }
    };

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/admin/dashboard/reports?range=${timeRange}&schoolId=${selectedSchool}&classId=${selectedClass}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setLoading(false);
        }
    }, [timeRange, selectedSchool, selectedClass]);

    useEffect(() => {
        fetchSupportingData();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const COLORS = ['#4318FF', '#6AD2FF', '#EFF4FB', '#2B3674', '#05CD99'];

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);

        // Let state update to hide buttons and stop animations before capture
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const element = reportRef.current;
            const canvas = await html2canvas(element, {
                scale: 3, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#F4F7FE',
                width: element.offsetWidth,
                height: element.scrollHeight,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    // Hide elements marked with ignore
                    const ignores = clonedDoc.querySelectorAll('[data-html2canvas-ignore]');
                    ignores.forEach(el => (el as HTMLElement).style.display = 'none');
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4', true);

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = contentHeight;
            let position = 0;

            // Add first page
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;

            // Add subsequent pages if content overflows
            while (heightLeft > 0) {
                position = heightLeft - contentHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
            }

            pdf.save(`Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
                <Sidebar role="admin" />
                <main className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-brand-blue mb-4" size={48} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Generating Intelligence Report...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden relative">
            <div data-html2canvas-ignore="true">
                <Sidebar role="admin" />
            </div>

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10" data-html2canvas-ignore="true">
                    <Header email={email} role="admin" showAnnouncement={false} />
                </div>

                <div id="scrollable-body" ref={reportRef} className="flex-1 overflow-y-auto p-4 md:p-6 pt-4 scroll-smooth bg-[#F4F7FE] selection:bg-brand-blue/10">

                    {/* Premium Glass Header */}
                    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-[20px] mb-4 shadow-sm relative group">
                        {/* Background Decoration Layer */}
                        <div className="absolute inset-0 rounded-[30px] overflow-hidden pointer-events-none">
                            <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                                <Activity size={120} />
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Institutional Intelligence Active</span>
                                </div>
                                <h1 className="text-3xl font-black text-[#1B2559] tracking-tight mb-1">Academic Reports</h1>
                                <p className="text-slate-500 font-bold uppercase text-[11px] tracking-[0.2em] flex items-center gap-2">
                                    <BarChart3 size={14} className="text-brand-blue" />
                                    Data-Driven Educational Performance & Analysis
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4" data-html2canvas-ignore="true">
                                <div className="relative group/filters">
                                    <button
                                        onClick={() => setIsRangeModalOpen(!isRangeModalOpen)}
                                        className="flex items-center gap-3 px-6 py-3 bg-white text-[#2B3674] font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200/50 border border-white hover:border-slate-200 transition-all flex items-center"
                                    >
                                        <Calendar size={18} className="text-brand-blue" />
                                        <span>Scale: {timeRange === '1' ? '30 Days' : timeRange === '3' ? '90 Days' : '180 Days'}</span>
                                        <ChevronDown size={14} className={`ml-2 transition-transform duration-300 ${isRangeModalOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isRangeModalOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full right-0 min-w-[200px] bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/60 p-2 z-[100] mt-4"
                                            >
                                                <div className="p-3 mb-0.5">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Visual Scale</p>
                                                </div>
                                                {['1', '3', '6'].map((r) => (
                                                    <button
                                                        key={r}
                                                        onClick={() => {
                                                            setTimeRange(r);
                                                            setIsRangeModalOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mb-0.5 last:mb-0 flex items-center justify-between group/opt ${timeRange === r ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/10' : 'text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        Last {r} {r === '1' ? 'Month' : 'Months'}
                                                        {timeRange === r && <Zap size={14} className="text-yellow-400 fill-yellow-400" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="relative group/filters">
                                    <button
                                        onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                                        className="flex items-center gap-3 px-6 py-3 bg-white text-[#2B3674] font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200/50 border border-white hover:border-slate-200 transition-all flex items-center"
                                    >
                                        <Filter size={18} className="text-brand-blue" />
                                        <span>Institutional Context</span>
                                        <ChevronDown size={14} className={`ml-2 transition-transform duration-300 ${isFilterModalOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isFilterModalOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full right-0 min-w-[300px] bg-white/95 backdrop-blur-3xl rounded-[30px] shadow-[0_30px_90px_rgba(0,0,0,0.2)] border border-white/60 p-6 z-[100] mt-4"
                                            >
                                                <div className="mb-6">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Select School</p>
                                                    <select
                                                        value={selectedSchool}
                                                        onChange={(e) => setSelectedSchool(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[11px] font-black text-[#2B3674] outline-none focus:ring-4 focus:ring-brand-blue/10 transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="">All Schools</option>
                                                        {schools.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                                    </select>
                                                </div>

                                                <div className="mb-6">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Select Class</p>
                                                    <select
                                                        value={selectedClass}
                                                        onChange={(e) => setSelectedClass(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[11px] font-black text-[#2B3674] outline-none focus:ring-4 focus:ring-brand-blue/10 transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="">All Classes</option>
                                                        {classes.map(c => <option key={c.Id} value={c.Id}>Grade {c.GradeNumber} {c.SectionName ? `(${c.SectionName})` : ''}</option>)}
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={() => setIsFilterModalOpen(false)}
                                                    className="w-full bg-brand-blue text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:shadow-2xl transition-all"
                                                >
                                                    Apply Context
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="flex items-center gap-3 px-8 py-3 bg-brand-blue text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 group/btn"
                                >
                                    {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} className="translate-y-[-1px] group-hover:translate-y-[1px] transition-transform" />}
                                    <span>{isExporting ? 'Distilling PDF...' : 'Export Intelligence'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Demographic Intelligence */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                        {/* Gender Distribution */}
                        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 min-h-[300px]">
                            <div className="mb-8">
                                <h2 className="text-xl font-black text-[#1B2559] tracking-tight">Gender Distribution</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Student & Faculty Gender Diversity</p>
                            </div>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Male Students', value: data?.genderDistribution?.filter((g: any) => g.Role === 'Student' && g.Gender === 'Male').reduce((a: any, b: any) => a + b.count, 0) || 0, color: '#4318FF' },
                                                { name: 'Female Students', value: data?.genderDistribution?.filter((g: any) => g.Role === 'Student' && g.Gender === 'Female').reduce((a: any, b: any) => a + b.count, 0) || 0, color: '#05CD99' },
                                                { name: 'Male Teachers', value: data?.genderDistribution?.filter((g: any) => g.Role === 'Teacher' && g.Gender === 'Male').reduce((a: any, b: any) => a + b.count, 0) || 0, color: '#3A2E7E' },
                                                { name: 'Female Teachers', value: data?.genderDistribution?.filter((g: any) => g.Role === 'Teacher' && g.Gender === 'Female').reduce((a: any, b: any) => a + b.count, 0) || 0, color: '#6AD2FF' }
                                            ]}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {[
                                                { color: '#4318FF' },
                                                { color: '#05CD99' },
                                                { color: '#3A2E7E' },
                                                { color: '#6AD2FF' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}
                                        />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Age Classification */}
                        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 min-h-[300px]">
                            <div className="mb-8">
                                <h2 className="text-xl font-black text-[#1B2559] tracking-tight">Age Classification</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Growth Stages Analysis</p>
                            </div>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Child (<13)', value: data?.ageDistribution?.filter((a: any) => a.ageGroup.includes('<13')).reduce((a: any, b: any) => a + b.count, 0) || 0 },
                                                { name: 'Teen (13-19)', value: data?.ageDistribution?.filter((a: any) => a.ageGroup.includes('13-19')).reduce((a: any, b: any) => a + b.count, 0) || 0 },
                                                { name: 'Young Adult', value: data?.ageDistribution?.filter((a: any) => a.ageGroup.includes('20-29')).reduce((a: any, b: any) => a + b.count, 0) || 0 },
                                                { name: 'Adult (30+)', value: data?.ageDistribution?.filter((a: any) => !a.ageGroup.includes('<13') && !a.ageGroup.includes('13-19') && !a.ageGroup.includes('20-29')).reduce((a: any, b: any) => a + b.count, 0) || 0 }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {COLORS.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}
                                        />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Intelligence Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {[
                            { label: 'Global Health', value: `${data?.overall?.globalAverage?.toFixed(1)}%`, icon: HeartPulse, color: 'emerald', trend: '+2.4%', sub: 'Avg Score' },
                            { label: 'Exam Load', value: data?.overall?.totalExamsTaken, icon: Target, shadow: 'shadow-blue-500/10', color: 'blue', trend: 'Active', sub: 'Attempts' },
                            { label: 'Active Faculty', value: data?.teacherPerformance?.length, icon: Users, color: 'violet', trend: 'Verified', sub: 'Instructors' },
                            { label: 'Courses', value: data?.coursePerformance?.length, icon: BookOpen, color: 'indigo', trend: 'Live', sub: 'Subjects' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 relative group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col justify-between h-full hover:translate-y-[-5px]">
                                <div>
                                    <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <h3 className="text-2xl font-black text-[#1B2559] mb-1">{stat.value}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400">{stat.sub}</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-blue/5 text-brand-blue'}`}>
                                        {stat.trend}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
                        {/* Course Distribution Radar */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex flex-col">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h2 className="text-2xl font-black text-[#1B2559] tracking-tight">Subject Intelligence</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Multidimensional Performance Analysis</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-5 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-brand-blue" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Average Performance</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 h-60">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart outerRadius="80%" data={data?.coursePerformance}>
                                        <PolarGrid stroke="#E2E8F0" />
                                        <PolarAngleAxis
                                            dataKey="CourseName"
                                            tick={{ fill: '#1B2559', fontSize: 10, fontWeight: '900' }}
                                        />
                                        <PolarRadiusAxis
                                            angle={30}
                                            domain={[0, 100]}
                                            tick={{ fill: '#CBD5E1', fontSize: 8 }}
                                        />
                                        <Radar
                                            name="Score"
                                            dataKey="AverageScore"
                                            stroke="#4318FF"
                                            fill="#4318FF"
                                            fillOpacity={0.15}
                                            strokeWidth={3}
                                            isAnimationActive={!isExporting}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Summary Insights Card */}
                        <div className="bg-brand-blue p-8 rounded-[30px] shadow-2xl shadow-blue-500/20 text-white flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-150" />

                            <div className="relative z-10">
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl w-fit mb-4 border border-white/20">
                                    <Zap size={20} className="text-yellow-400 fill-yellow-400" />
                                </div>
                                <h3 className="text-2xl font-black mb-2 leading-tight">Insight Generator</h3>
                                <p className="text-blue-100 font-bold text-xs leading-relaxed mb-6">
                                    Based on the last {timeRange} months of data, your institution is performing at {data?.overall?.globalAverage?.toFixed(1)}% efficiency.
                                </p>

                                <div className="space-y-4">
                                    {[
                                        { icon: ArrowUpRight, text: 'Exam volume up by 12%', color: 'text-emerald-400' },
                                        { icon: Target, text: 'Physics shows 5% growth', color: 'text-yellow-400' },
                                        { icon: Users, text: '98% Student Attendance', color: 'text-blue-200' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                                            <item.icon className={item.color} size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">Operational Health Index</p>
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${data?.overall?.globalAverage}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                                        />
                                    </div>
                                    <span className="font-black text-xl">{data?.overall?.globalAverage?.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                        {/* Class Distribution (Students per Class) */}
                        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-[#1B2559]">Class Enrollment</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Student Density by Class Name</p>
                                </div>
                                <div className="p-3 bg-brand-blue/5 text-brand-blue rounded-2xl"><Users size={20} /></div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.classDistribution} layout="vertical">
                                        <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={false} stroke="#F1F5F9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="className"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: '800' }}
                                            width={140}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#F8FAFC' }}
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        />
                                        <Bar
                                            dataKey="studentCount"
                                            radius={[0, 15, 15, 0]}
                                            barSize={24}
                                            isAnimationActive={!isExporting}
                                        >
                                            {data?.classDistribution?.map((_: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                            <LabelList
                                                dataKey="studentCount"
                                                position="right"
                                                style={{ fill: '#1B2559', fontSize: '11px', fontWeight: '900' }}
                                                formatter={(val: number) => `${val} Enrolled`}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Participation Trend Card */}
                        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-[#1B2559]">Engagement Trend</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Examination volume ({timeRange} mo)</p>
                                </div>
                                <div className="flex gap-2 text-emerald-500 bg-emerald-50 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-500/10">
                                    <TrendingUp size={14} /> Volume Growth
                                </div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.participationTrend}>
                                        <defs>
                                            <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4318FF" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#4318FF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#F1F5F9" />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: '800' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: '800' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="attempts"
                                            stroke="#4318FF"
                                            strokeWidth={6}
                                            fillOpacity={1}
                                            fill="url(#colorAttempts)"
                                            dot={{ r: 5, fill: '#4318FF', strokeWidth: 3, stroke: '#fff' }}
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                            isAnimationActive={!isExporting}
                                        >
                                            <LabelList
                                                dataKey="attempts"
                                                position="top"
                                                offset={15}
                                                style={{ fill: '#4318FF', fontSize: '11px', fontWeight: '900' }}
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Analytical Subject Breakdown */}

                </div>
            </main >
        </div >
    );
};

export default AdminReports;
