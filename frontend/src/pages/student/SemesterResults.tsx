import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Trophy, BookOpen, GraduationCap, Star,
    Info, Loader, ChevronDown,
    Award, Target, CheckCircle2
} from 'lucide-react';


interface SemesterSummary {
    Average: number;
    ClassRank: number;
    GradeRank: number;
    SchoolRank: number;
    TotalCourses: number;
    SemesterName: string;
    AcademicYearName: string;
}

interface CourseResult {
    CourseName: string;
    CourseCode: string;
    WeightedTotal: number;
}

const SemesterResults = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ summary: SemesterSummary | null; courses: CourseResult[] }>({ summary: null, courses: [] });

    const fetchMetadata = async () => {
        try {
            const yRes = await axios.get('http://localhost:5000/api/student/academic-years', { headers });
            setAcademicYears(yRes.data);

            const activeYear = yRes.data.find((y: any) => y.IsActive);
            if (activeYear) {
                setSelectedYear(activeYear.Id.toString());
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSemestersForYear = async (ayId: string) => {
        if (!ayId) {
            setSemesters([]);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/student/semesters?academicYearId=${ayId}`, { headers });
            setSemesters(res.data);

            // Auto-select active semester if it belongs to this year
            const activeSem = res.data.find((s: any) => s.IsActive);
            if (activeSem) {
                setSelectedSemester(activeSem.Id.toString());
            } else if (res.data.length > 0) {
                setSelectedSemester(res.data[0].Id.toString());
            } else {
                setSelectedSemester('');
            }
        } catch (err) {
            console.error('Error fetching semesters:', err);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (selectedYear) {
            fetchSemestersForYear(selectedYear);
        }
    }, [selectedYear]);

    const fetchResults = async () => {
        if (!selectedYear || !selectedSemester) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/student/semester-results?academicYearId=${selectedYear}&semesterId=${selectedSemester}`, { headers });
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
    }, [selectedYear, selectedSemester]);

    const getLetterGrade = (score: number) => {
        if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' };
        if (score >= 85) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50/50', border: 'border-green-100/50' };
        if (score >= 80) return { grade: 'A-', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
        if (score >= 75) return { grade: 'B+', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
        if (score >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-50/50', border: 'border-blue-100/50' };
        if (score >= 60) return { grade: 'C', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
        if (score >= 50) return { grade: 'D', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' };
        return { grade: 'F', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role="student" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-20">
                    <Header email={user.email || "student@example.com"} role="student" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">


                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-1.5 min-w-[160px]">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#2B3674]/50 ml-1">Academic Year</label>
                                <div className="relative group">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full appearance-none bg-white border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-[#2B3674] shadow-sm focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none"
                                    >
                                        <option value="">Select Year</option>
                                        {academicYears.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-blue transition-colors pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 min-w-[160px]">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#2B3674]/50 ml-1">Semester</label>
                                <div className="relative group">
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(e.target.value)}
                                        className="w-full appearance-none bg-white border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-[#2B3674] shadow-sm focus:ring-4 focus:ring-brand-blue/5 transition-all outline-none"
                                    >
                                        <option value="">Select Semester</option>
                                        {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-blue transition-colors pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[50px] shadow-sm border border-slate-50">
                            <Loader size={48} className="animate-spin text-brand-blue mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Processing calculations...</p>
                        </div>
                    ) : !data.summary ? (
                        <div className="bg-white p-20 rounded-[50px] shadow-sm border border-slate-100 text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mx-auto mb-8 border border-slate-100">
                                <Info size={48} />
                            </div>
                            <h2 className="text-2xl font-black text-[#2B3674]">Calculations Pending</h2>
                            <p className="text-slate-500 max-w-sm mx-auto mt-3 font-medium">Semester results haven't been finalized by the administration yet. Check back soon!</p>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

                            {/* Summary Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                                    <div className="relative z-10 flex items-center gap-6 text-brand-blue">
                                        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                                            <Award size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black text-[#2B3674] tracking-tight">{data.summary.Average}%</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Weighted Average</p>
                                        </div>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-50/50 rounded-full"></div>
                                </div>

                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-amber-500/5 transition-all">
                                    <div className="relative z-10 flex items-center gap-6 text-amber-500">
                                        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                                            <Trophy size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black text-[#2B3674] tracking-tight">#{data.summary.ClassRank}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Class Ranking</p>
                                        </div>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-50/50 rounded-full"></div>
                                </div>

                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                                    <div className="relative z-10 flex items-center gap-6 text-emerald-500">
                                        <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                                            <Target size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black text-[#2B3674] tracking-tight">#{data.summary.GradeRank}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Grade Ranking</p>
                                        </div>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-50/50 rounded-full"></div>
                                </div>

                                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-red-500/5 transition-all">
                                    <div className="relative z-10 flex items-center gap-6 text-red-500">
                                        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform">
                                            <GraduationCap size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black text-[#2B3674] tracking-tight">#{data.summary.SchoolRank}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">School Ranking</p>
                                        </div>
                                    </div>
                                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-red-50/50 rounded-full"></div>
                                </div>
                            </div>

                            {/* Detailed Results Table */}
                            <div className="bg-white rounded-[50px] shadow-sm border border-slate-50 overflow-hidden">
                                <div className="p-10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white">
                                            <BookOpen size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Subject Breakdown</h2>
                                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">
                                                {data.summary.SemesterName} — {data.summary.AcademicYearName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <p className="text-[10px] font-black text-[#2B3674] uppercase tracking-tighter">Status:</p>
                                        <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                                            <CheckCircle2 size={14} />
                                            Certified
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto p-4 sm:p-10 pt-6">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="pb-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Subject Info</th>
                                                <th className="pb-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Weighted Score</th>
                                                <th className="pb-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Grade</th>
                                                <th className="pb-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50/50">
                                            {data.courses.map((course, i) => {
                                                const grade = getLetterGrade(course.WeightedTotal);
                                                return (
                                                    <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-8 px-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black text-brand-blue group-hover:scale-110 transition-transform">
                                                                    {course.CourseCode?.substring(0, 2) || 'C'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-lg font-black text-[#2B3674] tracking-tight group-hover:text-brand-blue transition-colors">{course.CourseName}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{course.CourseCode || 'GEN-101'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-8 px-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-2xl font-black text-[#2B3674] tracking-tight">{course.WeightedTotal.toFixed(1)}%</span>
                                                                <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase mt-1 tracking-tighter">
                                                                    <Star size={8} className="fill-slate-100" />
                                                                    Weighted Aggregate
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-8 px-4 text-center">
                                                            <div className={`w-14 h-14 mx-auto rounded-[20px] ${grade.bg} ${grade.border} border-2 flex items-center justify-center text-xl font-black ${grade.color} shadow-sm group-hover:rotate-[10deg] transition-transform`}>
                                                                {grade.grade}
                                                            </div>
                                                        </td>
                                                        <td className="py-8 px-4 min-w-[200px]">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">
                                                                    <span>Course Progress</span>
                                                                    <span className={grade.color}>{course.WeightedTotal.toFixed(0)}%</span>
                                                                </div>
                                                                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-1000 ${course.WeightedTotal >= 50 ? 'bg-brand-blue' : 'bg-red-400'}`}
                                                                        style={{ width: `${course.WeightedTotal}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-50/50">
                                            <tr className="border-t-2 border-slate-200/50">
                                                <td className="py-10 px-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-[22px] bg-brand-blue text-white shadow-xl shadow-blue-500/20 flex items-center justify-center font-black text-lg">
                                                            AVG
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-black text-[#2B3674] tracking-tight">Semester Average</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mean of {data.courses.length} courses</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-10 px-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-3xl font-black text-brand-blue tracking-tighter">
                                                            {(data.courses.reduce((acc, c) => acc + c.WeightedTotal, 0) / (data.courses.length || 1)).toFixed(2)}%
                                                        </span>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">Calculated GPA</p>
                                                    </div>
                                                </td>
                                                <td className="py-10 px-4 text-center">
                                                    {(() => {
                                                        const avg = data.courses.reduce((acc, c) => acc + c.WeightedTotal, 0) / (data.courses.length || 1);
                                                        const grade = getLetterGrade(avg);
                                                        return (
                                                            <div className={`w-14 h-14 mx-auto rounded-[20px] ${grade.bg} ${grade.border} border-2 flex items-center justify-center text-xl font-black ${grade.color} shadow-lg shadow-black/5`}>
                                                                {grade.grade}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-10 px-4"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SemesterResults;
