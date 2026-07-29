import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { BookOpen, ChevronRight, School, ChevronLeft, ChevronDown, MoreHorizontal, Search, X, Calendar } from 'lucide-react';

interface Course {
    CourseId: number;
    CourseName: string;
    Description: string;
    Classes: string;
    ExamCount: number;
    AcademicYearName?: string;
    SemesterName?: string;
}

const MyCourses = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Options State
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    // Selected Filters State
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email || 'teacher@example.com';

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };

                const [yearsRes, semestersRes, gradesRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/teacher/academic-years', config),
                    axios.get('http://localhost:5000/api/teacher/semesters', config),
                    axios.get('http://localhost:5000/api/teacher/grades', config)
                ]);

                setAcademicYears(yearsRes.data);
                setSemesters(semestersRes.data);
                setGrades(gradesRes.data);

                // Default to active year
                const activeYear = yearsRes.data.find((y: any) => y.IsActive);
                if (activeYear) {
                    setSelectedYear(activeYear.Id.toString());

                    // Default to active semester within that year
                    const semRes = await axios.get(`http://localhost:5000/api/teacher/semesters?academicYearId=${activeYear.Id}`, config);
                    const activeSem = semRes.data.find((s: any) => s.IsActive);
                    if (activeSem) {
                        setSelectedSemester(activeSem.Id.toString());
                    }
                }
            } catch (err) {
                console.error('Error fetching filter options:', err);
            }
        };
        fetchFilters();
    }, []);

    // Fetch Sections when grade changes
    useEffect(() => {
        const fetchSections = async () => {
            if (!selectedGrade) {
                setSections([]);
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`http://localhost:5000/api/teacher/sections?gradeId=${selectedGrade}&academicYearId=${selectedYear}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSections(response.data);
            } catch (err) {
                console.error('Error fetching sections:', err);
            }
        };
        fetchSections();
    }, [selectedGrade, selectedYear]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (selectedYear) params.append('academicYearId', selectedYear);
            if (selectedSemester) params.append('semesterId', selectedSemester);
            if (selectedGrade) params.append('gradeId', selectedGrade);
            if (selectedSection) params.append('sectionId', selectedSection);

            const response = await axios.get(`http://localhost:5000/api/teacher/courses?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(response.data);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching courses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [selectedYear, selectedSemester, selectedGrade, selectedSection]);

    // Filtering logic (client side for search)
    const filteredCourses = courses.filter(course =>
        course.CourseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.Description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination logic
    const totalPages = Math.ceil(filteredCourses.length / perPage);
    const paginatedCourses = filteredCourses.slice((currentPage - 1) * perPage, currentPage * perPage);

    const paginate = (page: number) => {
        setCurrentPage(page);
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    };

    const resetFilters = () => {
        setSelectedYear('');
        setSelectedSemester('');
        setSelectedGrade('');
        setSelectedSection('');
        setSearchQuery('');
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden text-[#2B3674]">
            <Sidebar role="teacher" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="teacher" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="mb-4 flex justify-end">
                        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm gap-1">
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95"
                                title="Reset Filters"
                            >
                                <X size={18} />
                                <span>clear</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[30px] border border-white shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {/* Academic Year */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Academic Year</label>
                                <div className="relative group">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full pl-4 pr-10 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl appearance-none text-sm font-bold focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all cursor-pointer group-hover:bg-white group-hover:border-slate-200"
                                    >
                                        <option value="">All Years</option>
                                        {academicYears.map(ay => (
                                            <option key={ay.Id} value={ay.Id}>{ay.Name} {ay.IsActive ? '' : ''}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-blue transition-colors" />
                                </div>
                            </div>

                            {/* Semester */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Semester</label>
                                <div className="relative group">
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(e.target.value)}
                                        className="w-full pl-4 pr-10 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl appearance-none text-sm font-bold focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all cursor-pointer group-hover:bg-white group-hover:border-slate-200"
                                    >
                                        <option value="">All Semesters</option>
                                        {semesters
                                            .filter(s => !selectedYear || s.AcademicYearId === Number(selectedYear))
                                            .map(s => (
                                                <option key={s.Id} value={s.Id}>{s.Name}</option>
                                            ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-blue transition-colors" />
                                </div>
                            </div>

                            {/* Grade */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Grade</label>
                                <div className="relative group">
                                    <select
                                        value={selectedGrade}
                                        onChange={(e) => { setSelectedGrade(e.target.value); setSelectedSection(''); }}
                                        className="w-full pl-4 pr-10 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl appearance-none text-sm font-bold focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all cursor-pointer group-hover:bg-white group-hover:border-slate-200"
                                    >
                                        <option value="">All Grades</option>
                                        {grades.map(g => (
                                            <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-blue transition-colors" />
                                </div>
                            </div>

                            {/* Section */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Section</label>
                                <div className="relative group">
                                    <select
                                        value={selectedSection}
                                        onChange={(e) => setSelectedSection(e.target.value)}
                                        disabled={!selectedGrade}
                                        className="w-full pl-4 pr-10 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl appearance-none text-sm font-bold focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-white group-hover:border-slate-200"
                                    >
                                        <option value="">All Sections</option>
                                        {sections.map(s => (
                                            <option key={s.Id} value={s.Id}>{s.Name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-brand-blue transition-colors" />
                                </div>
                            </div>

                            {/* Course Search */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Search Course</label>
                                <div className="relative group">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Course title..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all group-hover:bg-white group-hover:border-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-96 gap-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-brand-blue/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-brand-blue rounded-full animate-spin"></div>
                            </div>
                            <p className="text-slate-400 font-bold text-sm animate-pulse">Syncing curriculum...</p>
                        </div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="text-center bg-white p-20 rounded-[40px] border border-dashed border-slate-200 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <BookOpen size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-[#2B3674]">No Courses Found</h3>
                            <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">Try adjusting your filters or search query to find the specific course you're looking for.</p>
                            <button
                                onClick={resetFilters}
                                className="mt-8 px-8 py-3.5 bg-[#2B3674] text-white rounded-2xl font-black hover:bg-brand-blue transition-all shadow-xl shadow-indigo-100"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-6">
                                {paginatedCourses.map((course, idx) => (
                                    <div
                                        key={course.CourseId}
                                        className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 group relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-blue/10 transition-colors" />

                                        <div className="flex items-center gap-8 relative z-10">
                                            <div className="w-20 h-20 bg-indigo-50/50 p-5 rounded-3xl text-indigo-600 group-hover:bg-brand-blue group-hover:text-white group-hover:scale-110 shadow-sm transition-all duration-500 flex items-center justify-center">
                                                <BookOpen size={32} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-[#2B3674] group-hover:text-brand-blue transition-colors">{course.CourseName}</h3>
                                                <p className="text-slate-400 font-medium text-sm mt-1 max-w-md line-clamp-1">{course.Description || 'Access curriculum resources and assignments for this course.'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-16 xl:gap-20 text-slate-400 shrink-0 relative z-10 ml-28 xl:ml-0">
                                            <div className="text-left xl:text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-300">Sections Assigned</p>
                                                <div className="flex items-center gap-2 text-[#2B3674]">
                                                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                                                        <School size={16} />
                                                    </div>
                                                    <p className="text-sm font-black whitespace-nowrap">{course.Classes || 'General'}</p>
                                                </div>
                                            </div>
                                            {(course.AcademicYearName) && (
                                                <div className="text-left xl:text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-300">Academic Period</p>
                                                    <div className="flex items-center gap-2 text-[#2B3674]">
                                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                            <Calendar size={16} />
                                                        </div>
                                                        <p className="text-sm font-black whitespace-nowrap">
                                                            {course.AcademicYearName} {course.SemesterName && course.SemesterName !== 'Full Year' ? `• ${course.SemesterName}` : '• Full Year'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-300">Course Exams</p>
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <span className="min-w-10 h-10 px-3 rounded-xl bg-brand-blue/10 text-brand-blue text-sm font-black flex items-center justify-center border border-brand-blue/10 group-hover:bg-brand-blue group-hover:text-white transition-all">
                                                        {course.ExamCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 shrink-0 relative z-10 xl:ml-0 ml-28 flex-wrap">
                                            <button
                                                onClick={() => navigate(`/teacher/modules`, { state: { courseId: course.CourseId, courseName: course.CourseName } })}
                                                className="px-5 py-4 rounded-2xl bg-brand-blue/10 text-brand-blue font-black hover:bg-brand-blue/20 transition-all text-xs border border-brand-blue/10 active:scale-95"
                                            >
                                                Modules
                                            </button>
                                            <button
                                                onClick={() => navigate(`/teacher/courses/${course.CourseId}/resources`)}
                                                className="px-5 py-4 rounded-2xl bg-indigo-50 text-indigo-600 font-black hover:bg-indigo-100 transition-all text-xs border border-indigo-100 active:scale-95 flex items-center gap-2"
                                            >
                                                Assignments
                                            </button>
                                            <button
                                                onClick={() => navigate(`/teacher/courses/${course.CourseId}/exams`)}
                                                className="px-5 py-4 rounded-2xl bg-brand-blue text-white font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all text-xs flex items-center gap-3 group/btn active:scale-95"
                                            >
                                                Exams View
                                                <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {filteredCourses.length > perPage && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-6 pb-20">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-white disabled:opacity-30 transition-all border border-slate-100 disabled:border-transparent shadow-sm"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>

                                        <div className="flex items-center gap-2 mx-4">
                                            {getPageNumbers().map((p, idx) =>
                                                p === 'ellipsis' ? (
                                                    <div key={`e-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                        <MoreHorizontal size={16} />
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => paginate(p)}
                                                        className={`w-12 h-12 rounded-2xl font-black text-sm transition-all border shadow-sm ${currentPage === p
                                                            ? 'border-brand-blue text-white bg-brand-blue'
                                                            : 'border-white bg-white text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        <button
                                            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-white disabled:opacity-30 transition-all border border-slate-100 disabled:border-transparent shadow-sm"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>

                                    <div className="relative group/perpage">
                                        <button
                                            onClick={() => setPerPageOpen(!perPageOpen)}
                                            className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-white text-sm font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                        >
                                            {perPage} items per page
                                            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${perPageOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {perPageOpen && (
                                            <div className="absolute right-0 bottom-full mb-3 w-56 bg-white/90 backdrop-blur-xl rounded-[25px] shadow-2xl border border-white py-3 z-[60] animate-in slide-in-from-bottom-2 duration-300">
                                                {[5, 10, 20, 50, 100].map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                        className={`w-full text-left px-8 py-4 text-xs font-black transition-all ${perPage === size
                                                            ? 'text-brand-blue bg-brand-blue/5'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        Show {size} courses
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyCourses;
