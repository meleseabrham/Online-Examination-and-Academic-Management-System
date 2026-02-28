import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Search, Trophy, TrendingUp, Users, ChevronRight, ChevronLeft, Loader, MoreHorizontal, ChevronDown, RotateCcw } from 'lucide-react';

interface Submission {
    AttemptId: number;
    StudentName: string;
    ExamTitle: string;
    Score: number | null;
    MaxPoints: number;
    Status: string;
    Date: string;
    GradeName: string;
    Section: string;
    CorrectQuestions: number;
    TotalQuestions: number;
    TeacherName?: string;
    CourseName?: string;
    ProfileImage?: string;
    canRegrade?: boolean;
}

interface Stats {
    topScore: string;
    classAverage: string | number;
    pendingCount: number;
}

interface AcademicYear { Id: number; Name: string; IsActive: boolean; }
interface Semester { Id: number; AcademicYearId: number; Name: string; IsActive: boolean; }
interface Grade { Id: number; GradeNumber: number; }
interface Section { Id: number; GradeId: number; Name: string; }
interface Course { CourseId: number; CourseName: string; }

const ViewResults = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: 'teacher@example.com', role: 'teacher' };
    const isAdmin = user.role?.toLowerCase() === 'admin';
    const headers = { Authorization: `Bearer ${token}` };

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [stats, setStats] = useState<Stats>({ topScore: '0', classAverage: '0', pendingCount: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Metadata for filters
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);

    // Filter values
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedExamType, setSelectedExamType] = useState<string>('All');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isRowsPerPageOpen, setIsRowsPerPageOpen] = useState(false);

    const resetFilters = () => {
        setSelectedYear('');
        setSelectedSemester('');
        setSelectedGrade('');
        setSelectedSection('');
        setSelectedCourse('');
        setSelectedExamType('All');
        setSelectedStatus('All');
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (selectedYear) params.academicYearId = selectedYear;
            if (selectedSemester) params.semesterId = selectedSemester;
            if (selectedGrade) params.gradeId = selectedGrade;
            if (selectedSection) params.sectionId = selectedSection;
            if (selectedCourse) params.courseId = selectedCourse;
            if (selectedExamType !== 'All') params.examType = selectedExamType;
            if (selectedStatus !== 'All') params.status = selectedStatus;
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/results`, { headers, params });
            setSubmissions(res.data.submissions);
            setStats(res.data.stats);
        } catch (err) {
            console.error('Error fetching results:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            const [yRes, gRes, sRes, cRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/${rolePrefix}/academic-years`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/grades`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/semesters`, { headers }),
                isAdmin
                    ? axios.get(`http://localhost:5000/api/admin/courses`, { headers })
                    : axios.get(`http://localhost:5000/api/teacher/courses`, { headers })
            ]);
            setYears(yRes.data);
            setSemesters(sRes.data);

            // For teachers, extract unique grades from their assigned classes
            if (!isAdmin) {
                // Teacher grades: fetch from /teacher/classes to get only assigned grades
                try {
                    const classesRes = await axios.get(`http://localhost:5000/api/teacher/classes`, { headers });
                    const teacherGradeIds = new Set<number>();
                    const teacherGrades: Grade[] = [];
                    classesRes.data.forEach((c: any) => {
                        if (c.GradeId && !teacherGradeIds.has(c.GradeId)) {
                            teacherGradeIds.add(c.GradeId);
                            const gradeNum = gRes.data.find((g: any) => g.Id === c.GradeId)?.GradeNumber;
                            if (gradeNum) teacherGrades.push({ Id: c.GradeId, GradeNumber: gradeNum });
                        }
                    });
                    teacherGrades.sort((a, b) => a.GradeNumber - b.GradeNumber);
                    setGrades(teacherGrades);
                } catch {
                    setGrades(gRes.data);
                }

                // Teacher courses: extract unique courses from assignments
                const teacherCourseIds = new Set<number>();
                const teacherCourses: Course[] = [];
                cRes.data.forEach((c: any) => {
                    if (!teacherCourseIds.has(c.CourseId)) {
                        teacherCourseIds.add(c.CourseId);
                        teacherCourses.push({ CourseId: c.CourseId, CourseName: c.CourseName });
                    }
                });
                setCourses(teacherCourses);
            } else {
                setGrades(gRes.data);
                setCourses(cRes.data);
            }

            const activeYear = yRes.data.find((y: any) => y.IsActive);
            if (activeYear) setSelectedYear(activeYear.Id.toString());

            const activeSem = sRes.data.find((s: any) => s.IsActive);
            if (activeSem) setSelectedSemester(activeSem.Id.toString());

        } catch (err) {
            console.error('Error fetching metadata:', err);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    // Reset semester if it doesn't belong to the selected year
    useEffect(() => {
        if (selectedYear && selectedSemester) {
            const sem = semesters.find(s => s.Id === parseInt(selectedSemester));
            if (sem && sem.AcademicYearId !== parseInt(selectedYear)) {
                setSelectedSemester('');
            }
        }
    }, [selectedYear, selectedSemester, semesters]);

    useEffect(() => {
        const fetchSections = async () => {
            if (!selectedGrade) {
                setSections([]);
                setSelectedSection('');
                return;
            }
            try {
                // Determine if we use teacher or admin endpoint
                // Admins should also filter sections by Academic Year to avoid duplicates from other years
                const url = isAdmin
                    ? `http://localhost:5000/api/admin/sections?gradeId=${selectedGrade}${selectedYear ? `&academicYearId=${selectedYear}` : ''}`
                    : `http://localhost:5000/api/teacher/classes?academicYearId=${selectedYear}`;

                const res = await axios.get(url, { headers });
                if (isAdmin) {
                    // Even if we filter by year, let's ensure uniqueness by name for the UI 
                    // to avoid confusing duplicates if the same section exists multiple times
                    const uniqueSections: Section[] = [];
                    const seenNames = new Set();
                    res.data.forEach((s: Section) => {
                        if (!seenNames.has(s.Name)) {
                            seenNames.add(s.Name);
                            uniqueSections.push(s);
                        }
                    });
                    setSections(uniqueSections);
                } else {
                    // Filter teacher classes by selected grade
                    // Use string comparison to be safe with numeric string IDs from req.query
                    const filtered = res.data
                        .filter((c: any) => String(c.GradeId || '') === String(selectedGrade))
                        .map((c: any) => ({ Id: c.ClassId, Name: c.Section }));
                    setSections(filtered);
                }
            } catch (err) {
                console.error('Error fetching sections:', err);
            }
        };
        fetchSections();
    }, [selectedGrade, selectedYear, isAdmin]);

    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, [selectedYear, selectedSemester, selectedGrade, selectedSection, selectedCourse, selectedExamType, selectedStatus]);

    const handleRowClick = (attemptId: number) => {
        const prefix = isAdmin ? '/admin' : '/teacher';
        navigate(`${prefix}/results/${attemptId}/review`);
    };

    const filteredSubmissions = submissions.filter(s =>
        s.StudentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ExamTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSubmissions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

    const paginate = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role={isAdmin ? 'admin' : 'teacher'} />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role={isAdmin ? 'admin' : 'teacher'} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-[#2B3674]">Exams Results</h1>
                        <p className="text-slate-500 mt-1">Review student submissions, manual grading, and class performance.</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader className="animate-spin text-brand-blue" size={40} />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex items-center gap-6">
                                    <div className="bg-green-50 p-4 rounded-2xl text-green-600">
                                        <Trophy size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Score (Best %)</p>
                                        <h3 className="text-2xl font-black text-[#2B3674]">{stats.topScore}%</h3>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex items-center gap-6">
                                    <div className="bg-blue-50 p-4 rounded-2xl text-brand-blue">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Average</p>
                                        <h3 className="text-2xl font-black text-[#2B3674]">{stats.classAverage}%</h3>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex items-center gap-6">
                                    <div className="bg-orange-50 p-4 rounded-2xl text-orange-600">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Grading</p>
                                        <h3 className="text-2xl font-black text-[#2B3674]">{stats.pendingCount}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm mb-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Academic Year</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                        >
                                            <option value="">All Years</option>
                                            {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Semester</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedSemester}
                                            onChange={(e) => setSelectedSemester(e.target.value)}
                                        >
                                            <option value="">All Semesters</option>
                                            {semesters.filter(s => !selectedYear || s.AcademicYearId === parseInt(selectedYear)).map(s => (
                                                <option key={s.Id} value={s.Id}>{s.Name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Grade</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedGrade}
                                            onChange={(e) => setSelectedGrade(e.target.value)}
                                        >
                                            <option value="">All Grades</option>
                                            {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Section</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedSection}
                                            onChange={(e) => setSelectedSection(e.target.value)}
                                            disabled={!selectedGrade}
                                        >
                                            <option value="">All Sections</option>
                                            {sections.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Course</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                        >
                                            <option value="">All Courses</option>
                                            {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Exam Type</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedExamType}
                                            onChange={(e) => setSelectedExamType(e.target.value)}
                                        >
                                            <option value="All">All Types</option>
                                            <option value="Exam">Online Exam</option>
                                            <option value="Manual">Manual Assessment</option>
                                            <option value="Assignment">Assignment</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue"
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                        >
                                            <option value="All">All Submissions</option>
                                            <option value="Graded">Graded Only</option>
                                            <option value="Submitted">Pending Review</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={resetFilters}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                                    >
                                        <RotateCcw size={14} />
                                        Reset Filters
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-[30px] shadow-sm border border-slate-100">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-2">
                                    <h2 className="text-xl font-bold text-[#2B3674]">Submission Records</h2>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by student or exam..."
                                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-100">
                                                <th className="pb-6">Student Name</th>
                                                <th className="pb-6">Examination</th>
                                                <th className="pb-6 text-center">Score</th>
                                                <th className="pb-6">Status</th>
                                                <th className="pb-6">Date</th>
                                                <th className="pb-6"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                                                        No submission records found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                currentItems.map((res) => (
                                                    <tr
                                                        key={res.AttemptId}
                                                        onClick={() => !isAdmin && handleRowClick(res.AttemptId)}
                                                        className={`group hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 ${isAdmin ? '' : 'cursor-pointer'}`}
                                                    >
                                                        <td className="py-6 flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                                                                <img
                                                                    src={res.ProfileImage
                                                                        ? `http://localhost:5000/${res.ProfileImage}`
                                                                        : `https://ui-avatars.com/api/?name=${res.StudentName}&background=random`}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="font-bold block text-[#2B3674]">{res.StudentName}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{res.GradeName}-{res.Section}</span>
                                                                    {res.CourseName && (
                                                                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold uppercase">
                                                                            {res.CourseName}
                                                                        </span>
                                                                    )}
                                                                    {isAdmin && res.TeacherName && (
                                                                        <span className="text-[10px] bg-blue-50 text-brand-blue px-2 py-0.5 rounded-md font-bold uppercase">
                                                                            {res.TeacherName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 text-slate-600 font-medium">{res.ExamTitle}</td>
                                                        <td className="py-6 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-bold text-[#2B3674] text-lg leading-tight">
                                                                    {Number(res.Score || 0).toFixed(1).replace(/\.0$/, '')} <span className="text-slate-300 text-xs">/ {Number(res.MaxPoints)}</span>
                                                                </span>
                                                                {/* <span className="text-[10px] text-brand-blue font-black uppercase tracking-tighter mt-1">
                                                                    {res.CorrectQuestions} / {res.TotalQuestions} Correct
                                                                </span> */}
                                                            </div>
                                                        </td>
                                                        <td className="py-6">
                                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${res.Status === 'Graded' ? 'bg-green-100 text-green-600' :
                                                                res.Status === 'Submitted' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-orange-100 text-orange-600'
                                                                }`}>
                                                                {res.Status}
                                                            </span>
                                                        </td>
                                                        <td className="py-6 text-slate-400 text-sm">
                                                            {res.Date ? new Date(res.Date).toLocaleString() : 'N/A'}
                                                        </td>
                                                        <td className="py-6 text-right">
                                                            <div className="flex items-center justify-end gap-2 px-4">
                                                                {isAdmin ? (
                                                                    /* Admin: show only Grade / Re-Grade button, no detail review */
                                                                    res.Status !== 'Started' && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/admin/results/${res.AttemptId}/grade`);
                                                                            }}
                                                                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${res.Status === 'Graded'
                                                                                ? 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'
                                                                                : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white'
                                                                                }`}
                                                                        >
                                                                            {res.Status === 'Graded' ? 'Re-Grade' : 'Grade'}
                                                                        </button>
                                                                    )
                                                                ) : (
                                                                    /* Teacher: show Grade/Re-Grade + chevron for detail review */
                                                                    <>
                                                                        {res.Status !== 'Started' && (res.Status !== 'Graded' || res.canRegrade) && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    navigate(`/teacher/results/${res.AttemptId}/grade`);
                                                                                }}
                                                                                className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-brand-blue hover:text-white transition-all whitespace-nowrap"
                                                                            >
                                                                                {res.Status === 'Graded' ? 'Re-grade' : 'Grade'}
                                                                            </button>
                                                                        )}
                                                                        <button className="p-2 text-slate-300 group-hover:text-brand-blue transition-all">
                                                                            <ChevronRight size={20} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Component */}
                                <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-6 border-t border-slate-50 pt-8">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum = i + 1;
                                                if (totalPages > 5 && currentPage > 3) {
                                                    pageNum = currentPage - 3 + i + 1;
                                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => paginate(pageNum)}
                                                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === pageNum
                                                            ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/30'
                                                            : 'text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                                <>
                                                    <div className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                        <MoreHorizontal size={16} />
                                                    </div>
                                                    <button
                                                        onClick={() => paginate(totalPages)}
                                                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === totalPages
                                                            ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/30'
                                                            : 'text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5'
                                                            }`}
                                                    >
                                                        {totalPages}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setIsRowsPerPageOpen(!isRowsPerPageOpen)}
                                            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-[#2B3674] hover:border-brand-blue transition-all"
                                        >
                                            {itemsPerPage} / per page
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isRowsPerPageOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isRowsPerPageOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={() => setIsRowsPerPageOpen(false)}
                                                ></div>
                                                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                    {[5, 10, 20, 50, 100].map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => {
                                                                setItemsPerPage(size);
                                                                setCurrentPage(1);
                                                                setIsRowsPerPageOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-sm font-bold transition-all ${itemsPerPage === size
                                                                ? 'text-brand-blue bg-brand-blue/5'
                                                                : 'text-slate-600 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            {size} / per page
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
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

export default ViewResults;
