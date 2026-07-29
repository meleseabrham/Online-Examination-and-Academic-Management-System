import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { BookOpen, Plus, Edit2, Trash2, X, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';

interface Course {
    CourseId: number;
    CourseName: string;
    CourseCode: string;
    Description: string;
    ClassCount: number;
    AcademicYearId: number | null;
    SemesterId: number | null;
    AcademicYearName: string | null;
    SemesterName: string | null;
    Assignments: {
        AssignmentId: number;
        ClassId: number;
        GradeName: string;
        Section: string;
        TeacherId: number;
        TeacherName: string;
    }[];
}

interface Teacher {
    UserId: number;
    FullName: string;
}

const ManageCourses = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';

    const [courses, setCourses] = useState<Course[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState({
        courseName: '',
        courseCode: '',
        description: '',
        academicYearId: '',
        semesterId: ''
    });

    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [filters, setFilters] = useState({
        academicYearId: '',
        semesterId: '',
        gradeId: '',
        sectionId: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<{
        AssignmentId: number;
        TeacherId: string;
        ClassTitle: string;
    } | null>(null);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/courses', {
                headers: { Authorization: `Bearer ${token}` },
                params: filters
            });
            setCourses(response.data);
        } catch (err) {
            console.error('Error fetching courses:', err);
        }
    };

    const fetchTeachers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeachers(response.data.filter((u: any) => u.Role === 'Teacher'));
        } catch (err) {
            console.error('Error fetching teachers:', err);
        }
    };

    const fetchAcademicData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [ayRes, semRes, gradeRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/academic-years', { headers }),
                axios.get('http://localhost:5000/api/admin/semesters', { headers }),
                axios.get('http://localhost:5000/api/admin/grades', { headers })
            ]);
            setAcademicYears(ayRes.data);
            setSemesters(semRes.data);
            setGrades(gradeRes.data);

            // Set active AY/Sem as default filters
            const activeAY = ayRes.data.find((a: any) => a.IsActive);
            const activeSem = semRes.data.find((s: any) => s.IsActive);

            if (activeAY || activeSem) {
                setFilters(prev => ({
                    ...prev,
                    academicYearId: activeAY ? String(activeAY.Id) : prev.academicYearId,
                    semesterId: activeSem ? String(activeSem.Id) : prev.semesterId
                }));
            }
        } catch (err) { console.error(err); }
    };

    const fetchSections = async (gradeId: string) => {
        if (!gradeId) {
            setSections([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/sections', {
                headers: { Authorization: `Bearer ${token}` },
                params: { gradeId }
            });
            setSections(response.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchTeachers();
        fetchAcademicData();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [filters]);

    useEffect(() => {
        if (filters.gradeId) {
            fetchSections(filters.gradeId);
        } else {
            setSections([]);
        }
    }, [filters.gradeId]);

    const handleOpenModal = (course: Course | null = null) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                courseName: course.CourseName,
                courseCode: course.CourseCode || '',
                description: course.Description || '',
                academicYearId: String(course.AcademicYearId || ''),
                semesterId: String(course.SemesterId || '')
            });
        } else {
            const activeAY = academicYears.find(a => a.IsActive);
            const activeSem = semesters.find(s => s.IsActive);
            setEditingCourse(null);
            setFormData({
                courseName: '',
                courseCode: '',
                description: '',
                academicYearId: activeAY ? String(activeAY.Id) : '',
                semesterId: activeSem ? String(activeSem.Id) : ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingCourse) {
                await axios.put(`http://localhost:5000/api/admin/courses/${editingCourse.CourseId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/admin/courses', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchCourses();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving course:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/admin/courses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCourses();
        } catch (err) {
            console.error('Error deleting course:', err);
        }
    };

    const handleUpdateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAssignment) return;
        const token = localStorage.getItem('token');
        try {
            // We need to find the assignment to get class and course IDs
            // But since our backend update Assignment usually takes (teacherId, classId, courseId)
            // Or just a direct PUT to /assignments/:id
            await axios.put(`http://localhost:5000/api/admin/assignments/teachers/${editingAssignment.AssignmentId}`, {
                teacherId: editingAssignment.TeacherId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCourses();
            setIsAssignmentModalOpen(false);
        } catch (err) {
            console.error('Error updating assignment:', err);
            alert('Error updating teacher');
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(courses.length / perPage);
    const paginatedCourses = courses.slice((currentPage - 1) * perPage, currentPage * perPage);

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

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden">
            <Sidebar role="admin" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={email} role="admin" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-[#2B3674]">Course Management</h1>
                            <p className="text-slate-500 mt-1">Define curriculum, subject codes, and departmental assignments.</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center gap-3"
                        >
                            <Plus size={20} />
                            New Course
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                                    value={filters.academicYearId}
                                    onChange={(e) => {
                                        const newYearId = e.target.value;
                                        setFilters(prev => {
                                            const updated = { ...prev, academicYearId: newYearId };
                                            // Reset semester if it belongs to a different year
                                            const currentSem = semesters.find(s => s.Id === parseInt(prev.semesterId));
                                            if (currentSem && newYearId && currentSem.AcademicYearId !== parseInt(newYearId)) {
                                                updated.semesterId = '';
                                            }
                                            return updated;
                                        });
                                    }}
                                >
                                    <option value="">All Years</option>
                                    {academicYears.map(ay => (
                                        <option key={ay.Id} value={ay.Id}>{ay.Name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all disabled:opacity-50"
                                    value={filters.semesterId}
                                    onChange={(e) => setFilters({ ...filters, semesterId: e.target.value })}
                                    disabled={!filters.academicYearId}
                                >
                                    <option value="">{filters.academicYearId ? 'All Semesters' : 'Select Year First'}</option>
                                    {semesters
                                        .filter(s => filters.academicYearId && s.AcademicYearId === parseInt(filters.academicYearId))
                                        .map(s => (
                                            <option key={s.Id} value={s.Id}>{s.Name}</option>
                                        ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                                    value={filters.gradeId}
                                    onChange={(e) => setFilters({ ...filters, gradeId: e.target.value, sectionId: '' })}
                                >
                                    <option value="">All Grades</option>
                                    {grades.map(g => (
                                        <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section (Optional)</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                                    value={filters.sectionId}
                                    onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })}
                                    disabled={!filters.gradeId}
                                >
                                    <option value="">All Sections</option>
                                    {sections.map(sec => (
                                        <option key={sec.Id} value={sec.Id}>{sec.Name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {paginatedCourses.map((course) => (
                            <div
                                key={course.CourseId}
                                className="
                                          bg-white p-6 rounded-2xl
                                          border border-slate-100
                                          shadow-sm hover:shadow-lg
                                          transition-all duration-300
                                          hover:-translate-y-1
                                          group
                                            "
                            >
                                {/* Top Section */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className="
                                            p-3 rounded-xl
                                          bg-brand-background text-brand-blue
                                          transition-all duration-300
                                          group-hover:bg-brand-blue group-hover:text-white
                                        ">
                                        <BookOpen size={22} />
                                    </div>

                                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                {/* Course Info */}
                                <h3 className="text-lg font-semibold text-[#2B3674]">
                                    {course.CourseName}
                                </h3>

                                <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-5">
                                    {course.CourseCode}
                                </p>

                                <div className="mb-5 flex flex-wrap gap-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-lg">
                                        {course.ClassCount} Classes
                                    </span>
                                    {course.AcademicYearName && (
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest whitespace-nowrap ${academicYears.find(ay => ay.Id === course.AcademicYearId)?.IsActive
                                                ? 'text-blue-600 bg-blue-50 border-blue-100'
                                                : 'text-slate-400 bg-slate-50 border-slate-100'
                                                }`}>
                                                {course.AcademicYearName}
                                                {academicYears.find(ay => ay.Id === course.AcademicYearId)?.IsActive && (
                                                    <span className="ml-1 text-[8px] opacity-70">(ACTIVE)</span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {course.SemesterName && (
                                        <div className="flex flex-col gap-1">
                                            {(() => {
                                                const activeSemsForYear = semesters.filter(s => s.AcademicYearId === course.AcademicYearId && s.IsActive);
                                                const activeSemForYear = activeSemsForYear.length > 0 ? activeSemsForYear[activeSemsForYear.length - 1] : null;
                                                const isAssignedActive = activeSemForYear && course.SemesterId === activeSemForYear.Id;

                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest whitespace-nowrap ${isAssignedActive
                                                            ? 'text-[#2B3674] bg-[#EBF1FF] border-blue-200 shadow-sm'
                                                            : 'text-slate-400 bg-slate-50 border-slate-100 line-through decoration-slate-400 decoration-2'
                                                            }`}>
                                                            {course.SemesterName}
                                                        </span>
                                                        {!isAssignedActive && activeSemForYear && (
                                                            <span className="text-[9px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100 w-fit">
                                                                Current: {activeSemForYear.Name}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Assignments */}
                                <div className="space-y-2 mb-6">
                                    {course.Assignments.length > 0 ? (
                                        course.Assignments.map((ass) => (
                                            <div
                                                key={ass.AssignmentId}
                                                className="
                                                  flex items-center justify-between
                                                  p-3 rounded-xl
                                                  bg-slate-50 border border-slate-100
                                                  hover:bg-white hover:shadow-sm
                                                  transition-all duration-200
                                                  group/item
                                                "
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="
                                                      w-8 h-8 rounded-lg
                                                      bg-white flex items-center justify-center
                                                      text-brand-blue shadow-sm
                                                    ">
                                                        <BookOpen size={14} />
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-semibold text-[#2B3674]">
                                                            {ass.GradeName} - {ass.Section}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                                            {ass.TeacherName}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setEditingAssignment({
                                                            AssignmentId: ass.AssignmentId,
                                                            TeacherId: String(ass.TeacherId),
                                                            ClassTitle: `${ass.GradeName} - ${ass.Section}`
                                                        });
                                                        setIsAssignmentModalOpen(true);
                                                    }}
                                                    className="
                                                              p-1.5 rounded-lg
                                                          text-slate-300 hover:text-brand-blue
                                                          hover:bg-indigo-50
                                                          transition-all duration-200
                                                          opacity-0 group-hover/item:opacity-100
                                                    "
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">
                                            No classes assigned yet.
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleOpenModal(course)}
                                        className="
                                          flex-1 py-2.5
                                          rounded-xl text-sm font-semibold
                                          bg-slate-50 text-[#2B3674]
                                          hover:bg-indigo-50 hover:text-brand-blue
                                          border border-transparent hover:border-brand-blue/20
                                          transition-all duration-200
                                          active:scale-95
                                          flex items-center justify-center gap-2
                                        "
                                    >
                                        <Edit2 size={14} />
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => handleDelete(course.CourseId)}
                                        className="
                                          px-4 py-2.5
                                          rounded-xl text-sm font-semibold
                                          bg-slate-50 text-red-500
                                          hover:bg-red-50
                                          border border-transparent hover:border-red-100
                                          transition-all duration-200
                                          active:scale-95
                                          flex items-center justify-center gap-2
                                        "
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                                    <button
                                        onClick={() => navigate(`/admin/courses/${course.CourseId}/resources`)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-indigo-50 hover:text-brand-blue transition-all"
                                    >
                                        <FileText size={12} /> Resources
                                    </button>
                                    <button
                                        onClick={() => navigate(`/admin/courses/${course.CourseId}/exams`)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-indigo-50 hover:text-brand-blue transition-all"
                                    >
                                        <BookOpen size={12} /> Exams
                                    </button>
                                </div> */}
                            </div>
                        ))}
                    </div>


                    {/* Pagination */}
                    {courses.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 pt-8">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {getPageNumbers().map((p, idx) =>
                                    p === 'ellipsis' ? (
                                        <div key={`e-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-300">
                                            <MoreHorizontal size={14} />
                                        </div>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => paginate(p)}
                                            className={`w-9 h-9 rounded-lg font-bold text-xs transition-all border ${currentPage === p
                                                ? 'border-red-400 text-red-500 bg-red-50'
                                                : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setPerPageOpen(!perPageOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-[#2B3674] hover:border-brand-blue transition-all"
                                >
                                    {perPage} / page
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${perPageOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {perPageOpen && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setPerPageOpen(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-30 overflow-hidden">
                                            {[10, 20, 50, 100].map((size) => (
                                                <button
                                                    key={size}
                                                    onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${perPage === size
                                                        ? 'text-red-500 bg-red-50'
                                                        : 'text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {size} / page
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Course Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[30px] p-8 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-[#2B3674]">{editingCourse ? 'Edit Course' : 'Create New Course'}</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[#2B3674] mb-2">Course Name</label>
                                <input
                                    type="text" required placeholder="e.g. Advanced Mathematics"
                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    value={formData.courseName}
                                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2B3674] mb-2">Course Code</label>
                                <input
                                    type="text" required placeholder="MATH-101"
                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    value={formData.courseCode}
                                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2B3674] mb-2">Description</label>
                                <textarea
                                    rows={3}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all resize-none"
                                    placeholder="Brief course overview..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#2B3674] uppercase tracking-widest mb-2">Academic Year</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all text-sm font-bold"
                                        value={formData.academicYearId}
                                        onChange={(e) => {
                                            const newYearId = e.target.value;
                                            setFormData(prev => {
                                                const updated = { ...prev, academicYearId: newYearId };
                                                // Reset semester if it belongs to a different year
                                                const currentSem = semesters.find(s => s.Id === parseInt(prev.semesterId));
                                                if (currentSem && newYearId && currentSem.AcademicYearId !== parseInt(newYearId)) {
                                                    updated.semesterId = '';
                                                }
                                                return updated;
                                            });
                                        }}
                                    >
                                        <option value="">Select Year...</option>
                                        {academicYears.map(ay => <option key={ay.Id} value={ay.Id}>{ay.Name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#2B3674] uppercase tracking-widest mb-2">Semester</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={formData.semesterId}
                                        onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                                        disabled={!formData.academicYearId}
                                    >
                                        <option value="">{formData.academicYearId ? 'Select Semester...' : 'Select Year First...'}</option>
                                        {semesters
                                            .filter(s => formData.academicYearId && s.AcademicYearId === parseInt(formData.academicYearId))
                                            .map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                                {editingCourse ? 'Save Changes' : 'Create Course'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Edit Modal */}
            {isAssignmentModalOpen && editingAssignment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-[30px] p-8 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-[#2B3674]">Edit Teacher</h2>
                                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">{editingAssignment.ClassTitle}</p>
                            </div>
                            <button onClick={() => setIsAssignmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateAssignment} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-[#2B3674] uppercase tracking-widest mb-2">Select New Teacher</label>
                                <select
                                    required
                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-sm"
                                    value={editingAssignment.TeacherId}
                                    onChange={(e) => setEditingAssignment({ ...editingAssignment, TeacherId: e.target.value })}
                                >
                                    <option value="">Select Teacher...</option>
                                    {teachers.map(t => (
                                        <option key={t.UserId} value={t.UserId}>{t.FullName}</option>
                                    ))}
                                </select>
                            </div>

                            <button className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                                Update Assignment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageCourses;
