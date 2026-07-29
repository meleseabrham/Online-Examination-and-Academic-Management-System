import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    FileText, Download, ChevronDown, BookOpen, Award,
    Calendar, Layers, CheckCircle, Clock, BarChart3,
    Target, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CourseBreakdown {
    courseId: number; courseName: string; courseCode: string;
    assessments: { id: number; type: string; title: string; totalMarks: number; weightPercentage: number; marksObtained: number | null; scoreStatus: string; weightedScore: number | null; }[];
    totalWeightedScore: number; completedWeight: number; totalDefinedWeight: number;
    courseTotal: number | null; status: string;
}

const MyTranscript = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };

    const [semesters, setSemesters] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedAY, setSelectedAY] = useState('');
    const [courses, setCourses] = useState<CourseBreakdown[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (selectedSemester) fetchCourseBreakdown();
    }, [selectedSemester]);

    const fetchDropdowns = async () => {
        try {
            const [ayRes, semRes] = await Promise.all([
                axios.get('http://localhost:5000/api/student/academic-years', { headers }),
                axios.get('http://localhost:5000/api/student/semesters', { headers })
            ]);
            setAcademicYears(ayRes.data);
            setSemesters(semRes.data);

            const activeYear = ayRes.data.find((y: any) => y.IsActive);
            if (activeYear) {
                const ayId = activeYear.Id;
                setSelectedAY(ayId.toString());

                const activeSem = semRes.data.find((s: any) => s.IsActive && s.AcademicYearId.toString() === ayId.toString());
                if (activeSem) setSelectedSemester(activeSem.Id.toString());
                else {
                    const firstSem = semRes.data.find((s: any) => s.AcademicYearId.toString() === ayId.toString());
                    if (firstSem) setSelectedSemester(firstSem.Id.toString());
                }
            }
        } catch (err) { console.error(err); }
    };

    const fetchCourseBreakdown = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/student/course-breakdown', {
                headers,
                params: { studentId: user?.id, semesterId: selectedSemester }
            });
            setCourses(res.data);
            if (res.data.length > 0) setExpandedCourseId(res.data[0].courseId);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const downloadTranscript = async (type: 'semester' | 'full-year') => {
        setDownloading(true);
        try {
            const url = type === 'semester'
                ? `http://localhost:5000/api/student/transcript/semester?studentId=${user?.id}&semesterId=${selectedSemester}`
                : `http://localhost:5000/api/student/transcript/full-year?studentId=${user?.id}&academicYearId=${selectedAY}`;

            const res = await axios.get(url, {
                headers,
                responseType: 'blob'
            });

            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `transcript_${type}_${user?.id}.pdf`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Download error:', err);
        } finally { setDownloading(false); }
    };

    const getLetterGrade = (score: number | null): string => {
        if (score === null) return '—';
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'A-';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 65) return 'B-';
        if (score >= 60) return 'C+';
        if (score >= 55) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    };

    const getGradeColor = (score: number | null): string => {
        if (score === null) return 'text-slate-400';
        if (score >= 80) return 'text-emerald-600';
        if (score >= 60) return 'text-blue-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    const overallAverage = courses.length > 0
        ? courses.reduce((sum, c) => sum + (c.courseTotal || 0), 0) / courses.filter(c => c.courseTotal !== null).length
        : 0;

    const completedCourses = courses.filter(c => c.status === 'Complete').length;
    const typeIcons: Record<string, string> = { Quiz: '📝', Mid: '📋', Final: '📄', Assignment: '📎', Participation: '👥' };

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden text-[#1B2559]">
            <Sidebar role="student" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={user?.email || ''} role="student" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">


                    {/* Selectors & Downloads */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Academic Year (for full-year PDF)</label>
                                <div className="relative">
                                    <select value={selectedAY} onChange={e => {
                                        const newAyId = e.target.value;
                                        setSelectedAY(newAyId);
                                        const aySemesters = semesters.filter(s => s.AcademicYearId.toString() === newAyId);
                                        if (aySemesters.length > 0) {
                                            const active = aySemesters.find(s => s.IsActive);
                                            setSelectedSemester(active ? active.Id.toString() : aySemesters[0].Id.toString());
                                        } else {
                                            setSelectedSemester('');
                                        }
                                    }}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl appearance-none cursor-pointer font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                        <option value="">Select year...</option>
                                        {academicYears.map(a => <option key={a.Id} value={a.Id}>{a.Name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Semester</label>
                                <div className="relative">
                                    <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl appearance-none cursor-pointer font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                        <option value="">Select semester...</option>
                                        {semesters.filter(s => s.AcademicYearId.toString() === selectedAY).map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => selectedSemester && downloadTranscript('semester')} disabled={!selectedSemester || downloading}
                                    className="flex items-center gap-2 bg-[#111C44] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#1a2a5e] transition-colors disabled:opacity-40 shadow-lg">
                                    <Download size={14} /> Semester PDF
                                </button>
                                <button onClick={() => selectedAY && downloadTranscript('full-year')} disabled={!selectedAY || downloading}
                                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-lg">
                                    <Download size={14} /> Full Year PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    {courses.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                            <div className="bg-[#111C44] rounded-3xl p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                                <BarChart3 size={20} className="mb-3 text-white/60" />
                                <p className="text-2xl font-black">{overallAverage.toFixed(1)}%</p>
                                <p className="text-xs text-white/50 font-bold mt-1">Semester Average</p>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <Award size={20} className="mb-3 text-amber-500" />
                                <p className="text-2xl font-black">{getLetterGrade(overallAverage)}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1">Overall Grade</p>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <Layers size={20} className="mb-3 text-blue-500" />
                                <p className="text-2xl font-black">{courses.length}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1">Total Courses</p>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <CheckCircle size={20} className="mb-3 text-emerald-500" />
                                <p className="text-2xl font-black">{completedCourses}/{courses.length}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1">Completed</p>
                            </div>
                        </div>
                    )}

                    {/* Course Breakdown */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#111C44] rounded-full animate-spin"></div>
                        </div>
                    ) : !selectedSemester ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                            <Calendar size={56} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold text-lg">Select a semester to view your breakdown</p>
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                            <BookOpen size={56} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold text-lg">No assessment data available</p>
                            <p className="text-slate-300 text-sm mt-1">Assessment scores haven't been entered yet</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {courses.map(course => (
                                <div key={course.courseId} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                                    {/* Course Header */}
                                    <div
                                        onClick={() => setExpandedCourseId(expandedCourseId === course.courseId ? null : course.courseId)}
                                        className={`px-7 py-5 flex items-center justify-between cursor-pointer transition-colors ${expandedCourseId === course.courseId ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-5 h-5 flex items-center justify-center transition-transform duration-300 ${expandedCourseId === course.courseId ? 'rotate-180' : ''}`}>
                                                <ChevronDown size={18} className="text-slate-400" />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                                    <BookOpen size={18} className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-base leading-tight">{course.courseName}</h3>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{course.courseCode}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className={`text-2xl font-black leading-none mb-1 ${getGradeColor(course.courseTotal)}`}>
                                                    {course.courseTotal !== null ? `${course.courseTotal.toFixed(1)}%` : '—'}
                                                </p>
                                                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                                                    Grade: <span className={`font-black ${getGradeColor(course.courseTotal)}`}>{getLetterGrade(course.courseTotal)}</span>
                                                </p>
                                            </div>
                                            <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${course.status === 'Complete' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {course.status === 'Complete' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                {course.status}
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedCourseId === course.courseId && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                {/* Assessment Rows */}
                                                <div className="px-7 py-3 border-t border-slate-50">
                                                    {course.assessments.map((a, idx) => (
                                                        <div key={a.id} className={`flex items-center gap-4 py-4 ${idx < course.assessments.length - 1 ? 'border-b border-slate-50' : ''} group/row`}>
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl group-hover/row:scale-110 transition-transform">{typeIcons[a.type] || '📝'}</div>
                                                            <div className="flex-1">
                                                                <p className="font-black text-sm text-[#2B3674]">{a.title}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{a.type}</p>
                                                            </div>
                                                            <div className="flex items-center gap-8">
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-[#2B3674]">
                                                                        {a.marksObtained !== null ? (
                                                                            <><span className={getGradeColor(a.marksObtained / a.totalMarks * 100)}>{a.marksObtained}</span> <span className="text-slate-300">/ {a.totalMarks}</span></>
                                                                        ) : (
                                                                            <span className="text-slate-300">—</span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Course Footer */}
                                                <div className="px-7 py-4 bg-slate-50/50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-t border-slate-50">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-slate-400">Weight Coverage: <span className="text-slate-600">{course.completedWeight.toFixed(0)}/{course.totalDefinedWeight.toFixed(0)}%</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Target size={14} className="text-slate-300" />
                                                        <span className="text-slate-400">Weighted Total: <span className="text-brand-blue">{course.totalWeightedScore.toFixed(1)}</span></span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyTranscript;
