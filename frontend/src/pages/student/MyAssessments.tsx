import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    ClipboardList, Calendar, Info, Filter, BookOpen
} from 'lucide-react';

interface AssessmentScore {
    id: number;
    type: string;
    title: string;
    totalMarks: number;
    weightPercentage: number;
    marksObtained: number | null;
    scoreStatus: string;
    weightedScore: number | null;
}

interface CourseBreakdown {
    courseId: number;
    courseName: string;
    courseCode: string;
    assessments: AssessmentScore[];
    totalWeightedScore: number;
    completedWeight: number;
    totalDefinedWeight: number;
    courseTotal: number | null;
    status: string;
}

const StudentAssessments = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };

    const [courses, setCourses] = useState<CourseBreakdown[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedAY, setSelectedAY] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');

    // Load filter options
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [ayRes, semRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/student/academic-years', { headers }),
                    axios.get('http://localhost:5000/api/student/semesters', { headers })
                ]);
                setAcademicYears(ayRes.data);
                setSemesters(semRes.data);

                // Auto-select the active academic year
                const activeYear = ayRes.data.find((y: any) => y.IsActive);
                if (activeYear) {
                    setSelectedAY(String(activeYear.Id));
                } else if (ayRes.data.length > 0) {
                    setSelectedAY(String(ayRes.data[0].Id));
                }

                // Auto-select active semester
                const activeSem = semRes.data.find((s: any) => s.IsActive);
                if (activeSem) {
                    setSelectedSemester(String(activeSem.Id));
                } else if (semRes.data.length > 0) {
                    setSelectedSemester(String(semRes.data[0].Id));
                }
            } catch (err) {
                console.error('Error loading filters:', err);
            }
        };
        loadFilters();
    }, []);

    // Fetch data when filters change
    useEffect(() => {
        if (selectedSemester && user?.id) {
            fetchData();
        }
    }, [selectedSemester]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/student/course-breakdown', {
                headers,
                params: { studentId: user?.id, semesterId: selectedSemester }
            });
            setCourses(res.data);
        } catch (err: any) {
            console.error('Error fetching assessment data:', err);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const typesToShow = ['Quiz', 'Mid', 'Assignment', 'Participation', 'Final'];

    const getGradeLetter = (total: number | null) => {
        if (!total) return '-';
        if (total >= 90) return 'A+';
        if (total >= 85) return 'A';
        if (total >= 80) return 'A-';
        if (total >= 75) return 'B+';
        if (total >= 70) return 'B';
        if (total >= 65) return 'B-';
        if (total >= 60) return 'C+';
        if (total >= 50) return 'C';
        return 'F';
    };

    const getGradeColor = (total: number | null) => {
        if (!total) return 'bg-slate-100 text-[#1B2559]';
        if (total >= 90) return 'bg-emerald-500 text-white';
        if (total >= 80) return 'bg-blue-500 text-white';
        if (total >= 70) return 'bg-amber-500 text-white';
        return 'bg-slate-100 text-[#1B2559]';
    };

    // Get selected names for display
    const selectedAYName = academicYears.find(a => String(a.Id) === selectedAY)?.Name || '';
    const selectedSemName = semesters.find(s => String(s.Id) === selectedSemester)?.Name || '';

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden text-[#1B2559]">
            <Sidebar role="student" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user?.email || ''} role="student" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Page Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-[#111C44] rounded-xl text-white shadow-lg"><ClipboardList size={20} /></div>
                            <h1 className="text-3xl font-black tracking-tight text-[#1B2559]">Semester Result Detail</h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-1 flex items-center gap-2">
                            <Calendar size={14} /> Academic Record & Performance Breakdown
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter size={16} className="text-slate-400" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Filter Results</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Academic Year</label>
                                <select
                                    value={selectedAY}
                                    onChange={e => setSelectedAY(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                                >
                                    <option value="">Select Year...</option>
                                    {academicYears.map(a => (
                                        <option key={a.Id} value={a.Id}>{a.Name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Semester</label>
                                <select
                                    value={selectedSemester}
                                    onChange={e => setSelectedSemester(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                                >
                                    <option value="">Select Semester...</option>
                                    {semesters.map(s => (
                                        <option key={s.Id} value={s.Id}>{s.Name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Badge */}
                    {selectedAYName && selectedSemName && (
                        <div className="flex items-center gap-2 mb-6">
                            <span className="px-4 py-2 bg-[#111C44] text-white text-xs font-black rounded-xl shadow-sm">
                                {selectedAYName}
                            </span>
                            <span className="px-4 py-2 bg-blue-500 text-white text-xs font-black rounded-xl shadow-sm">
                                {selectedSemName}
                            </span>
                        </div>
                    )}

                    {/* Content */}
                    {!selectedSemester ? (
                        /* No filter selected */
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm text-center py-20">
                            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                <Filter size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold text-lg">Select a semester to view results</p>
                            <p className="text-slate-300 text-sm mt-2">Choose an academic year and semester from the filters above</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#111C44] rounded-full animate-spin"></div>
                        </div>
                    ) : courses.length === 0 ? (
                        /* Empty state */
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm text-center py-20">
                            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                <BookOpen size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold text-lg">No assessment results found</p>
                            <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">
                                There are no assessment records for the selected semester. Results will appear here once your teachers have created and graded assessments.
                            </p>
                        </div>
                    ) : (
                        /* Results Table */
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#111C44] text-white">
                                            <th className="px-6 py-6 font-black text-sm uppercase tracking-widest border-r border-white/10 w-1/4">Courses</th>
                                            {typesToShow.map(type => (
                                                <th key={type} className="px-4 py-6 font-black text-[10px] uppercase tracking-tighter text-center border-r border-white/10">
                                                    {type === 'Final' ? 'Final Examination' : type}
                                                </th>
                                            ))}
                                            <th className="px-6 py-6 font-black text-sm uppercase tracking-widest text-center border-r border-white/10">Total</th>
                                            <th className="px-6 py-6 font-black text-sm uppercase tracking-widest text-center">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {courses.map(course => (
                                            <tr key={course.courseId} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-8 border-r border-slate-100">
                                                    <p className="font-black text-[#1B2559] text-lg leading-tight mb-1">{course.courseName}</p>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{course.courseCode}</p>
                                                </td>
                                                {typesToShow.map(type => {
                                                    const assessment = course.assessments.find(a => a.type.startsWith(type));
                                                    return (
                                                        <td key={type} className="px-4 py-8 border-r border-slate-100 text-center relative overflow-hidden">
                                                            {assessment ? (
                                                                <div className="relative z-10">
                                                                    <div className="text-[10px] font-black text-slate-300 mb-1 leading-none uppercase">{assessment.totalMarks}.00</div>
                                                                    <div className={`text-lg font-black leading-none ${assessment.marksObtained !== null ? 'text-blue-600' : 'text-slate-200'}`}>
                                                                        {assessment.marksObtained !== null ? `${assessment.marksObtained.toFixed(2)}` : '--.--'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-100 font-black">-</div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-6 py-8 border-r border-slate-100 text-center bg-slate-50/30">
                                                    <div className="text-xs font-black text-slate-300 mb-1 leading-none">100.00</div>
                                                    <div className="text-xl font-black text-[#1B2559] leading-none">
                                                        {course.courseTotal !== null ? course.courseTotal.toFixed(2) : '--.--'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8 text-center bg-blue-50/30">
                                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl font-black text-xl shadow-sm ${getGradeColor(course.courseTotal)}`}>
                                                        {getGradeLetter(course.courseTotal)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Info Panel */}
                    <div className="mt-8 bg-white/50 backdrop-blur-md rounded-2xl p-6 border border-white flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                            <Info size={20} />
                        </div>
                        <div>
                            <p className="font-black text-[#1B2559] text-sm mb-1 uppercase tracking-widest">Grading Scale Information</p>
                            <p className="text-sm text-slate-500 font-medium">This breakdown shows your performance across all assessments. The top number in each cell represents the total marks possible, and the bottom number (blue) represents your score.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentAssessments;
