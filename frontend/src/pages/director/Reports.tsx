import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, PieChart, Pie, Legend
} from 'recharts';
import {
    Users, BookOpen, Download, Calendar, Loader2,
    ChevronDown, HeartPulse, Activity, Zap, Target,
    Filter, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DirectorReports = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'director@example.com';

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

    const COLORS = ['#4318FF', '#6AD2FF', '#05CD99', '#FFAE1F', '#FF5B5B', '#3A2E7E'];

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        console.log("Starting PDF Export...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
            const element = reportRef.current;
            const canvas = await html2canvas(element, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: '#F4F7FE',
                logging: false,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('scrollable-body');
                    if (el) el.style.overflow = 'visible';
                }
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
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

            pdf.save(`Director_Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            console.log("PDF Export Complete");
        } catch (error) {
            console.error('PDF Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = () => {
        if (!data) return;
        console.log("Starting Excel Export...");
        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Institutional Matrix (Schools)
            if (data.schoolWiseBreakdown) {
                const schoolData = data.schoolWiseBreakdown.map((s: any) => ({
                    'School Name': s.schoolName,
                    'Student Count': s.studentCount,
                    'Teacher Count': s.teacherCount,
                    'Capacity Index': `${((s.studentCount / 100) * 10).toFixed(1)}%`
                }));
                const ws = XLSX.utils.json_to_sheet(schoolData);
                XLSX.utils.book_append_sheet(wb, ws, "School Performance");
            }

            // Sheet 2: Class Gender Distribution
            if (data.genderClassDistribution) {
                const classData = data.genderClassDistribution.map((c: any) => ({
                    'Class/Grade': c.className,
                    'Male Students': c.maleCount,
                    'Female Students': c.femaleCount,
                    'Total Students': c.maleCount + c.femaleCount
                }));
                const ws = XLSX.utils.json_to_sheet(classData);
                XLSX.utils.book_append_sheet(wb, ws, "Class Demographics");
            }

            // Sheet 3: Overall Diversity (Gender & Age)
            const genderData = [
                { category: 'Male Students', count: data?.genderDistribution?.find((g: any) => g.Gender === 'Male')?.count || 0 },
                { category: 'Female Students', count: data?.genderDistribution?.find((g: any) => g.Gender === 'Female')?.count || 0 }
            ];
            const ageData = data?.ageDistribution?.map((a: any) => ({ category: `Age: ${a.ageGroup}`, count: a.count })) || [];
            const diversityData = [...genderData, ...ageData];
            const wsDiversity = XLSX.utils.json_to_sheet(diversityData);
            XLSX.utils.book_append_sheet(wb, wsDiversity, "Institutional Diversity");

            // Sheet 4: KPI Summary
            const kpiData = [
                { Metric: "Global Performance Intensity", Value: `${data?.overall?.globalAverage?.toFixed(2)}%` },
                { Metric: "Cumulative Exams Processed", Value: data?.overall?.totalExamsTaken },
                { Metric: "Network Faculty Size", Value: data?.teacherPerformance?.length },
                { Metric: "Active Subject Portfolio", Value: data?.coursePerformance?.length },
                { Metric: "Total Enrolled Students", Value: data?.classDistribution?.reduce((a: any, b: any) => a + b.studentCount, 0) || 0 }
            ];
            const wsKPI = XLSX.utils.json_to_sheet(kpiData);
            XLSX.utils.book_append_sheet(wb, wsKPI, "KPI Summary");

            XLSX.writeFile(wb, `Director_Institutional_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
            console.log("Excel Export Complete");
        } catch (error) {
            console.error('Excel Export failed:', error);
        }
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black uppercase tracking-widest">
                {`${value}`}
            </text>
        );
    };

    if (loading && !data) {
        return (
            <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
                <Sidebar role="director" />
                <main className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-brand-blue mb-4" size={48} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Assembling Director Intelligence...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden relative">
            <div data-html2canvas-ignore="true">
                <Sidebar role="director" />
            </div>

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Header Section */}
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10" data-html2canvas-ignore="true">
                    <Header email={email} role="director" showAnnouncement={false} />
                </div>

                <div id="scrollable-body" ref={reportRef} className="flex-1 overflow-y-auto p-4 md:p-6 pt-4 scroll-smooth bg-[#F4F7FE]">

                    {/* Header Controls */}
                    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-5 rounded-[30px] mb-6 shadow-sm relative group">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Director Command Center</span>
                                </div>
                                <h1 className="text-3xl font-black text-[#1B2559] tracking-tight mb-1">Institutional Intelligence</h1>
                                <p className="text-slate-500 font-bold uppercase text-[11px] tracking-[0.2em] flex items-center gap-2">
                                    <Target size={14} className="text-brand-blue" />
                                    Comprehensive Academic & Operational Analytics
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3" data-html2canvas-ignore="true">
                                {/* Time Scale */}
                                <div className="relative group/filters">
                                    <button
                                        onClick={() => setIsRangeModalOpen(!isRangeModalOpen)}
                                        className="flex items-center gap-3 px-5 py-3 bg-white text-[#2B3674] font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200/50 border border-white hover:border-slate-200 transition-all transition-all"
                                    >
                                        <Calendar size={16} className="text-brand-blue" />
                                        <span>{timeRange} Months</span>
                                        <ChevronDown size={14} className={`ml-1 transition-transform ${isRangeModalOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {isRangeModalOpen && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 min-w-[180px] bg-white rounded-[24px] shadow-2xl p-2 z-[100] mt-3 border border-slate-100">
                                                {['1', '3', '6', '12'].map((r) => (
                                                    <button key={r} onClick={() => { setTimeRange(r); setIsRangeModalOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-brand-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                                        Last {r} Months
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Context Filter */}
                                <div className="relative group/filters">
                                    <button
                                        onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                                        className="flex items-center gap-3 px-5 py-3 bg-white text-[#2B3674] font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200/50 border border-white hover:border-slate-200 transition-all"
                                    >
                                        <Filter size={16} className="text-brand-blue" />
                                        <span>Context Filter</span>
                                        <ChevronDown size={14} className={`ml-1 transition-transform ${isFilterModalOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {isFilterModalOpen && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 min-w-[280px] bg-white rounded-[30px] shadow-2xl p-6 z-[100] mt-3 border border-slate-100">
                                                <div className="mb-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">School Selection</p>
                                                    <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-[10px] font-black uppercase outline-none">
                                                        <option value="">Global Network</option>
                                                        {schools.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="mb-6">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Grade/Class Context</p>
                                                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-[10px] font-black uppercase outline-none">
                                                        <option value="">All Academic Levels</option>
                                                        {classes.map(c => <option key={c.Id} value={c.Id}>Grade {c.GradeNumber} {c.SectionName}</option>)}
                                                    </select>
                                                </div>
                                                <button onClick={() => setIsFilterModalOpen(false)} className="w-full bg-brand-blue text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20">Apply Filters</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Export buttons */}
                                <button onClick={handleExportExcel} className="flex items-center gap-3 px-6 py-3 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                                    <FileSpreadsheet size={16} />
                                    <span>Export Excel</span>
                                </button>
                                <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50">
                                    {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                    <span>Intelligence PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {[
                            { label: 'Global Performance', value: `${data?.overall?.globalAverage?.toFixed(1)}%`, id: 'avg-score', icon: HeartPulse, bg: 'card-gradient-green' },
                            { label: 'Exams', value: data?.overall?.totalExamsTaken, id: 'exam-count', icon: Target, bg: 'card-gradient-blue' },
                            { label: 'Teachers', value: data?.teacherPerformance?.length, id: 'teacher-count', icon: Users, bg: 'card-gradient-orange' },
                            { label: 'Subjects', value: data?.coursePerformance?.length, id: 'course-count', icon: BookOpen, bg: 'card-gradient-cyan' }
                        ].map((stat) => (
                            <div 
                                key={stat.id} 
                                className={`${stat.bg} p-5 rounded-[28px] text-white shadow-xl shadow-blue-500/10 flex items-center gap-4 group hover:scale-[1.02] active:scale-95 transition-all duration-300 relative overflow-hidden min-h-[96px]`}
                            >
                                {/* Background Icon Watermark */}
                                <div className="absolute -right-4 -bottom-4 opacity-[0.08] group-hover:opacity-15 group-hover:scale-125 transition-all duration-500 pointer-events-none text-white">
                                    <stat.icon size={90} strokeWidth={1.5} />
                                </div>

                                {/* Left Icon Container (Image 2 style) */}
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white shadow-md group-hover:scale-105 transition-transform duration-300 relative z-10">
                                    <stat.icon size={22} strokeWidth={2.2} />
                                </div>

                                {/* Right Text Content (Image 2 style) */}
                                <div className="relative z-10 flex flex-col min-w-0 flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-white/80 truncate mb-1 leading-none">{stat.label}</p>
                                    <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm leading-none">{stat.value}</h3>
                                </div>

                                {/* Subtle Highlight */}
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                            </div>
                        ))}
                    </div>

                    {/* PRIMARY PIE CHARTS SECTION */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                        {/* Institutional Composition */}
                        <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-lg font-black text-[#1B2559] tracking-tight">Institutional Mix</h2>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Student vs Faculty Ratio</p>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Zap size={14} /></div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Students', value: data?.classDistribution?.reduce((a: any, b: any) => a + b.studentCount, 0) || 0 },
                                                { name: 'Teachers', value: data?.teacherPerformance?.length || 0 }
                                            ]}
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={8}
                                            dataKey="value"
                                            label={renderCustomizedLabel}
                                            labelLine={false}
                                        >
                                            <Cell fill="#4318FF" />
                                            <Cell fill="#05CD99" />
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: '900', fontSize: '10px' }} />
                                        <Legend align="center" verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Gender Breakdown Intelligence */}
                        <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-lg font-black text-[#1B2559] tracking-tight">Gender Diversity</h2>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Global Participant Spread</p>
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><HeartPulse size={14} /></div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Male', value: data?.genderDistribution?.filter((g: any) => g.Gender === 'Male').reduce((a: any, b: any) => a + b.count, 0) || 0 },
                                                { name: 'Female', value: data?.genderDistribution?.filter((g: any) => g.Gender === 'Female').reduce((a: any, b: any) => a + b.count, 0) || 0 }
                                            ]}
                                            outerRadius={90}
                                            dataKey="value"
                                            label={renderCustomizedLabel}
                                            labelLine={false}
                                        >
                                            <Cell fill="#6AD2FF" />
                                            <Cell fill="#FF5B5B" />
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '10px' }} />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Age Stage Distribution */}
                        <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-lg font-black text-[#1B2559] tracking-tight">Age Calculation</h2>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Institutional Maturity Levels</p>
                                </div>
                                <div className="p-2 bg-violet-50 text-violet-500 rounded-lg"><Activity size={14} /></div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.ageDistribution?.map((a: any) => ({ name: a.ageGroup, value: a.count })) || []}
                                            innerRadius={50}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={renderCustomizedLabel}
                                            labelLine={false}
                                        >
                                            {data?.ageDistribution?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: '900' }} />
                                        <Legend align="center" verticalAlign="bottom" iconType="circle" layout="horizontal" wrapperStyle={{ fontSize: '8px', fontWeight: '900' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* SCHOOL & CLASS DATA TABLES */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

                        {/* School Wise Breakdown Table */}
                        <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100 h-fit">
                            <h2 className="text-lg font-black text-[#1B2559] mb-6 flex items-center gap-3">
                                <span className="w-2 h-7 bg-brand-blue rounded-full" />
                                School Performance Matrix
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-50 text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                                            <th className="py-4 px-2">Educational Facility</th>
                                            <th className="py-4 px-2 text-center">Students</th>
                                            <th className="py-4 px-2 text-center">Teachers</th>
                                            <th className="py-4 px-2 text-center">Capacity Index</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data?.schoolWiseBreakdown?.map((school: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6 px-2 text-xs font-black text-[#1B2559]">{school.schoolName}</td>
                                                <td className="py-6 px-2 text-center">
                                                    <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[10px]">{school.studentCount}</span>
                                                </td>
                                                <td className="py-6 px-2 text-center">
                                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl font-black text-[10px]">{school.teacherCount}</span>
                                                </td>
                                                <td className="py-6 px-2 text-center">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-brand-blue rounded-full" style={{ width: `${Math.min(100, (school.studentCount / 500) * 100)}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400">
                                                            {((school.studentCount / 500) * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Class Gender Balance Matrix */}
                        <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-100 h-fit">
                            <h2 className="text-lg font-black text-[#1B2559] mb-6 flex items-center gap-3">
                                <span className="w-2 h-7 bg-emerald-500 rounded-full" />
                                Class Gender Distribution
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-50 text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                                            <th className="py-4 px-2">Academic Level</th>
                                            <th className="py-4 px-2 text-center">Male</th>
                                            <th className="py-4 px-2 text-center">Female</th>
                                            <th className="py-4 px-2 text-center">Net Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data?.genderClassDistribution?.map((item: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6 px-2 text-xs font-black text-[#1B2559]">{item.className}</td>
                                                <td className="py-6 px-2 text-center text-blue-500 font-bold">{item.maleCount}</td>
                                                <td className="py-6 px-2 text-center text-pink-500 font-bold">{item.femaleCount}</td>
                                                <td className="py-6 px-2 text-center">
                                                    <span className="bg-[#1B2559] text-white px-3 py-1.5 rounded-xl font-black text-[10px]">
                                                        {item.maleCount + item.femaleCount}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* SUBJECT PERFORMANCE RADAR SECTION */}
                    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 mb-6">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/3">
                                <h2 className="text-3xl font-black text-[#1B2559] leading-tight mb-4">Core Academic Intelligence</h2>
                                <p className="text-slate-400 font-bold text-sm leading-relaxed mb-8">
                                    Standardized cross-subject multidimensional performance analysis based on the current {selectedClass || 'Institutional'} context.
                                </p>
                                <div className="space-y-6">
                                    {data?.coursePerformance?.slice(0, 3).map((cp: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className={`w-3 h-3 rounded-full bg-[${COLORS[i % COLORS.length]}]`} />
                                            <div>
                                                <h4 className="text-xs font-black text-[#1B2559] uppercase tracking-widest">{cp.CourseName}</h4>
                                                <p className="text-[10px] font-bold text-slate-400">{cp.AverageScore?.toFixed(1)}% Avg Intensity</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={data?.coursePerformance}>
                                        <PolarGrid stroke="#E2E8F0" />
                                        <PolarAngleAxis dataKey="CourseName" tick={{ fill: '#64748B', fontSize: 10, fontWeight: '900' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#CBD5E1', fontSize: 8 }} />
                                        <Radar name="Score" dataKey="AverageScore" stroke="#4318FF" fill="#4318FF" fillOpacity={0.15} strokeWidth={3} />
                                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DirectorReports;
