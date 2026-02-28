import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Search, Loader, ChevronLeft, Eye, ChevronDown } from 'lucide-react';

interface AcademicYear { Id: number; Name: string; IsActive: boolean; }
interface Semester { Id: number; AcademicYearId: number; Name: string; IsActive: boolean; AcademicYearName?: string; }
interface TeacherClass { ClassId: number; GradeName: string; Section: string; GradeId?: number; }

interface Student {
    StudentId: number;
    StudentName: string;
    StudentEmail: string;
    GradeNumber: number;
    SectionName: string;
}

interface CourseResult {
    courseId: number;
    courseName: string;
    courseCode: string;
    assessments: any[];
    courseTotal: number;
    status: string;
}

const TeacherAssessmentResults = () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: '', role: 'teacher' };
    const headers = { Authorization: `Bearer ${token}` };
    const [searchParams] = useSearchParams();
    const autoLoadedRef = useRef(false);

    const [years, setYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);

    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [courseBreakdown, setCourseBreakdown] = useState<CourseResult[]>([]);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 15;

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [yRes, sRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/teacher/academic-years', { headers }),
                    axios.get('http://localhost:5000/api/teacher/semesters', { headers })
                ]);
                setYears(yRes.data);
                setSemesters(sRes.data);

                const activeYear = yRes.data.find((y: AcademicYear) => y.IsActive);
                if (activeYear) setSelectedYear(activeYear.Id.toString());

                const activeSem = sRes.data.find((s: Semester) => s.IsActive);
                if (activeSem) setSelectedSemester(activeSem.Id.toString());

                // Auto-load student from URL query params (coming from rankings page)
                const urlStudentId = searchParams.get('studentId');
                const urlStudentName = searchParams.get('studentName');
                const urlGradeNumber = searchParams.get('gradeNumber');
                const urlSectionName = searchParams.get('sectionName');

                if (urlStudentId && urlStudentName && !autoLoadedRef.current) {
                    autoLoadedRef.current = true;
                    const student: Student = {
                        StudentId: parseInt(urlStudentId),
                        StudentName: urlStudentName,
                        StudentEmail: '',
                        GradeNumber: urlGradeNumber ? parseInt(urlGradeNumber) : 0,
                        SectionName: urlSectionName || ''
                    };
                    setSelectedStudent(student);
                    setLoadingBreakdown(true);
                    const semId = activeSem ? activeSem.Id.toString() : '';
                    try {
                        const res = await axios.get(`http://localhost:5000/api/teacher/student-course-breakdown?studentId=${urlStudentId}&semesterId=${semId}&teacherId=${user.id}`, { headers });
                        setCourseBreakdown(res.data);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        setLoadingBreakdown(false);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchMetadata();
    }, []);

    // Fetch teacher's classes when year changes
    useEffect(() => {
        if (selectedYear) {
            const fetchClasses = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/teacher/classes?academicYearId=${selectedYear}`, { headers });
                    setTeacherClasses(res.data);
                    setSelectedClass('');
                } catch (err) {
                    console.error(err);
                }
            };
            fetchClasses();
        }
    }, [selectedYear]);

    // Auto-fetch students when filters change
    useEffect(() => {
        if (selectedYear && selectedSemester && selectedClass) {
            fetchStudents();
        }
    }, [selectedYear, selectedSemester, selectedClass]);

    const fetchStudents = async () => {
        if (!selectedYear || !selectedSemester || !selectedClass) return;
        setLoading(true);
        try {
            const cls = teacherClasses.find(c => c.ClassId.toString() === selectedClass);
            if (!cls) return;

            const res = await axios.get(`http://localhost:5000/api/teacher/classes/${selectedClass}/students`, { headers });

            const mapped: Student[] = res.data.map((s: any) => ({
                StudentId: s.StudentId || s.UserId,
                StudentName: s.StudentName || s.FullName,
                StudentEmail: s.StudentEmail || s.Email || '',
                GradeNumber: parseInt(cls.GradeName?.replace('Grade ', '') || '0'),
                SectionName: cls.Section || ''
            }));

            setStudents(mapped);
            setSelectedStudent(null);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getLetterGrade = (score: number) => {
        if (score >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-50' };
        if (score >= 85) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50/50' };
        if (score >= 80) return { grade: 'A-', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        if (score >= 75) return { grade: 'B+', color: 'text-blue-500', bg: 'bg-blue-50' };
        if (score >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-50/50' };
        if (score >= 60) return { grade: 'C', color: 'text-amber-500', bg: 'bg-amber-50' };
        if (score >= 50) return { grade: 'D', color: 'text-orange-500', bg: 'bg-orange-50' };
        return { grade: 'F', color: 'text-red-500', bg: 'bg-red-50' };
    };

    const viewStudentMarks = async (student: Student) => {
        setSelectedStudent(student);
        setLoadingBreakdown(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/teacher/student-course-breakdown?studentId=${student.StudentId}&semesterId=${selectedSemester}&teacherId=${user.id}`, { headers });
            setCourseBreakdown(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingBreakdown(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.StudentName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredStudents.length / perPage);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * perPage, currentPage * perPage);

    const filteredSemesters = semesters.filter(s => s.AcademicYearId === parseInt(selectedYear));

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role="teacher" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role="teacher" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {selectedStudent ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto pb-10">
                            <div className="flex items-center gap-4 mb-8">
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-brand-blue hover:shadow-md hover:border-brand-blue/20 transition-all active:scale-95"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">{selectedStudent.StudentName}'s Results</h1>
                                    <p className="text-slate-500 mt-1 font-medium">Grade {selectedStudent.GradeNumber} - {selectedStudent.SectionName}</p>
                                </div>
                            </div>

                            <div className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-100">
                                {loadingBreakdown ? (
                                    <div className="flex justify-center p-20"><Loader className="animate-spin text-brand-blue" size={40} /></div>
                                ) : courseBreakdown.length === 0 ? (
                                    <div className="text-center p-20">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="text-slate-300" size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#2B3674] mb-1">No Assessments Found</h3>
                                        <p className="text-slate-400 font-medium text-sm">This student has no assessment records for the selected semester.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-slate-100">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-max">
                                                <thead>
                                                    <tr className="bg-[#111C44] text-white text-[9px] uppercase tracking-widest font-black">
                                                        <th className="py-5 px-6 text-left w-1/4">Courses</th>
                                                        <th className="py-5 px-3 text-center">Quiz</th>
                                                        <th className="py-5 px-3 text-center">Mid</th>
                                                        <th className="py-5 px-3 text-center">Assignment</th>
                                                        <th className="py-5 px-3 text-center">Participation</th>
                                                        <th className="py-5 px-3 text-center">Final Examination</th>
                                                        <th className="py-5 px-6 text-center border-l border-white/10 w-24">Total</th>
                                                        <th className="py-5 px-6 text-center w-24">Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {courseBreakdown.map((course) => {
                                                        const getMark = (typeMatch: RegExp) => {
                                                            const a = course.assessments.find((a: any) => typeMatch.test(a.type.toLowerCase()));
                                                            return a && a.marksObtained !== null ? (a.weightedScore || 0).toFixed(2) : '-';
                                                        };
                                                        const getMax = (typeMatch: RegExp) => {
                                                            const a = course.assessments.find((a: any) => typeMatch.test(a.type.toLowerCase()));
                                                            return a && a.weightPercentage ? a.weightPercentage.toFixed(2) : '-';
                                                        };
                                                        const gradeInfo = getLetterGrade(course.courseTotal);

                                                        return (
                                                            <tr key={course.courseId} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-6 px-6">
                                                                    <p className="text-sm font-black text-[#2B3674]">{course.courseName}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5">{course.courseCode || 'GEN-101'}</p>
                                                                </td>
                                                                <td className="py-6 px-3 text-center">
                                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mb-0.5">{getMax(/quiz/i)}</p>
                                                                    <p className="text-sm font-bold text-brand-blue">{getMark(/quiz/i)}</p>
                                                                </td>
                                                                <td className="py-6 px-3 text-center">
                                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mb-0.5">{getMax(/mid/i)}</p>
                                                                    <p className="text-sm font-bold text-brand-blue">{getMark(/mid/i)}</p>
                                                                </td>
                                                                <td className="py-6 px-3 text-center">
                                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mb-0.5">{getMax(/assignment/i)}</p>
                                                                    <p className="text-sm font-bold text-brand-blue">{getMark(/assignment/i)}</p>
                                                                </td>
                                                                <td className="py-6 px-3 text-center">
                                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mb-0.5">{getMax(/particip/i)}</p>
                                                                    <p className="text-sm font-bold text-brand-blue">{getMark(/particip/i)}</p>
                                                                </td>
                                                                <td className="py-6 px-3 text-center">
                                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mb-0.5">{getMax(/final|exam/i)}</p>
                                                                    <p className="text-sm font-bold text-brand-blue">{getMark(/final|exam/i)}</p>
                                                                </td>
                                                                <td className="py-6 px-6 text-center border-l border-slate-50 bg-slate-50/20">
                                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mb-0.5">100.00</p>
                                                                    <p className="text-sm font-black text-[#2B3674]">{course.courseTotal.toFixed(2)}</p>
                                                                </td>
                                                                <td className="py-6 px-6 text-center bg-slate-50/20">
                                                                    <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-black text-white ${course.courseTotal >= 90 ? 'bg-green-500' :
                                                                        course.courseTotal >= 80 ? 'bg-blue-500' :
                                                                            course.courseTotal >= 70 ? 'bg-amber-500' :
                                                                                course.courseTotal >= 60 ? 'bg-orange-500' : 'bg-red-500'
                                                                        }`}>
                                                                        {gradeInfo.grade}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">Student Assessment Results</h1>
                                    <p className="text-slate-500 mt-1 font-medium">Review detailed course assessment breakdown for your assigned classes.</p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[#2B3674]/50 ml-1">Academic Year</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue appearance-none"
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                            >
                                                <option value="">Select Year</option>
                                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[#2B3674]/50 ml-1">Semester</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue appearance-none"
                                                value={selectedSemester}
                                                onChange={(e) => setSelectedSemester(e.target.value)}
                                            >
                                                <option value="">Select Semester</option>
                                                {filteredSemesters.map(s => (
                                                    <option key={s.Id} value={s.Id}>{s.Name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-[#2B3674]/50 ml-1">Class (Your Assigned Classes)</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue appearance-none"
                                                value={selectedClass}
                                                onChange={(e) => setSelectedClass(e.target.value)}
                                                disabled={teacherClasses.length === 0}
                                            >
                                                <option value="">Select Class</option>
                                                {teacherClasses.map(c => (
                                                    <option key={c.ClassId} value={c.ClassId}>
                                                        {c.GradeName} - Section {c.Section}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center p-20"><Loader className="animate-spin text-brand-blue" size={40} /></div>
                            ) : students.length > 0 ? (
                                <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-black text-[#2B3674]">Students ({filteredStudents.length})</h2>
                                        <div className="relative w-64">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search student..."
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                                                value={searchTerm}
                                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-xs text-slate-400 font-bold uppercase tracking-widest border-b border-slate-50">
                                                    <th className="pb-4 pl-4">#</th>
                                                    <th className="pb-4">Student</th>
                                                    <th className="pb-4">Class</th>
                                                    <th className="pb-4 text-right pr-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50/50">
                                                {paginatedStudents.map((student, idx) => (
                                                    <React.Fragment key={student.StudentId}>
                                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-4 pl-4 text-sm font-bold text-slate-400">
                                                                {(currentPage - 1) * perPage + idx + 1}
                                                            </td>
                                                            <td className="py-4 text-sm font-bold text-[#2B3674]">
                                                                {student.StudentName}
                                                            </td>
                                                            <td className="py-4 text-xs font-bold text-slate-400">
                                                                Grade {student.GradeNumber} - {student.SectionName}
                                                            </td>
                                                            <td className="py-4 pr-4 flex justify-end">
                                                                <button
                                                                    onClick={() => viewStudentMarks(student)}
                                                                    className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-brand-blue bg-blue-50 border border-blue-200 hover:bg-brand-blue hover:text-white hover:border-brand-blue shadow-sm hover:shadow-md transition-all duration-300 ease-in-out"
                                                                >
                                                                    <Eye
                                                                        size={16}
                                                                        className="transition-transform duration-300 group-hover:scale-110"
                                                                    />
                                                                    View Marks
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold text-slate-400 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 transition-all"
                                            >
                                                <ChevronLeft size={16} /> Previous
                                            </button>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold text-slate-400 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 transition-all"
                                            >
                                                Next <ChevronLeft size={16} className="rotate-180" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : selectedClass && !loading ? (
                                <div className="bg-white rounded-[30px] p-20 text-center border border-slate-100 shadow-sm">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="text-slate-300" size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#2B3674] mb-1">No Students Found</h3>
                                    <p className="text-slate-400 font-medium text-sm">No students are enrolled in this class for the selected academic year.</p>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TeacherAssessmentResults;
