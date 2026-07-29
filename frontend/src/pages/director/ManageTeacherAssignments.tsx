import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { UserPlus, Trash2, X, GraduationCap, School, BookOpen, Edit2, Loader2, Search, Users, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';

interface Assignment {
    AssignmentId: number;
    TeacherId: number;
    ClassId: number;
    CourseId: number;
    TeacherName: string;
    TeacherEmail: string;
    GradeName: string;
    Section: string;
    CourseName: string;
    AcademicYearName?: string;
    AcademicYearId?: number;
    SemesterName?: string;
    SemesterId?: number;
}

interface Semester {
    Id: number;
    Name: string;
    IsActive: boolean;
    AcademicYearId: number;
}

interface AcademicYear {
    Id: number;
    Name: string;
    IsActive: boolean;
}

interface Teacher {
    UserId: number;
    FullName: string;
}

interface ClassData {
    ClassId: number;
    GradeName: string;
    Section: string;
}

interface Course {
    CourseId: number;
    CourseName: string;
}

const ManageTeacherAssignments = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        teacherId: '',
        classId: '',
        courseId: '',
        academicYearId: '',
        semesterId: '',
        isBothSemesters: false
    });
    const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);

    // Selected Filters State
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    // Expanded teacher state (single expansion)
    const [expandedTeacherId, setExpandedTeacherId] = useState<number | null>(null);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        const querySearch = searchParams.get('search');
        if (querySearch) {
            setSearchTerm(querySearch);
        }
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [assRes, teachRes, classRes, courseRes, ayRes, semRes] = await Promise.all([
                axios.get('http://localhost:5000/api/director/assignments/teachers', { headers }),
                axios.get('http://localhost:5000/api/director/users', { headers }),
                axios.get('http://localhost:5000/api/director/classes', { headers }),
                axios.get('http://localhost:5000/api/director/courses', { headers }),
                axios.get('http://localhost:5000/api/director/academic-years', { headers }),
                axios.get('http://localhost:5000/api/director/semesters', { headers })
            ]);
            setAssignments(assRes.data);
            setTeachers(teachRes.data
                .filter((u: any) => u.Role === 'Teacher')
                .sort((a: any, b: any) => a.FullName.localeCompare(b.FullName))
            );
            setClasses(classRes.data.sort((a: any, b: any) => {
                const numA = parseInt(a.GradeName.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.GradeName.match(/\d+/)?.[0] || '0');
                if (numA !== numB) return numA - numB;
                return (a.Section || '').localeCompare(b.Section || '');
            }));
            setCourses(courseRes.data.sort((a: any, b: any) => a.CourseName.localeCompare(b.CourseName)));
            setAcademicYears(ayRes.data);
            setSemesters(semRes.data);

            // Set active values by default in form if it's a new assignment
            const activeYear = ayRes.data.find((y: AcademicYear) => y.IsActive);
            const activeSem = semRes.data.find((s: Semester) => s.IsActive);

            if (activeYear && !selectedYear) {
                setSelectedYear(activeYear.Id.toString());
            }

            if (!editingAssignmentId) {
                if (activeYear) setFormData(prev => ({ ...prev, academicYearId: activeYear.Id.toString() }));
                if (activeSem) setFormData(prev => ({ ...prev, semesterId: activeSem.Id.toString() }));
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        try {
            if (editingAssignmentId) {
                await axios.put(`http://localhost:5000/api/director/assignments/teachers/${editingAssignmentId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/director/assignments/teachers', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            await fetchData();
            setIsModalOpen(false);
            setEditingAssignmentId(null);
            const activeYear = academicYears.find(y => y.IsActive);
            const activeSem = semesters.find(s => s.IsActive);
            setFormData({
                teacherId: '',
                classId: '',
                courseId: '',
                academicYearId: activeYear?.Id.toString() || '',
                semesterId: activeSem?.Id.toString() || '',
                isBothSemesters: false
            });
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error saving assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to remove this teacher assignment?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/director/assignments/teachers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            console.error('Error deleting assignment:', err);
        }
    };

    const handleEdit = (ass: Assignment) => {
        setEditingAssignmentId(ass.AssignmentId);
        setFormData({
            teacherId: ass.TeacherId.toString(),
            classId: ass.ClassId.toString(),
            courseId: ass.CourseId.toString(),
            academicYearId: ass.AcademicYearId?.toString() || '',
            semesterId: ass.SemesterId?.toString() || '',
            isBothSemesters: !ass.SemesterId
        });
        setIsModalOpen(true);
    };

    const filteredAssignments = assignments.filter(ass => {
        const matchesSearch = (ass.TeacherName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ass.CourseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ass.GradeName || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesYear = !selectedYear || ass.AcademicYearId === Number(selectedYear);
        const matchesSemester = !selectedSemester ||
            (selectedSemester === 'full' ? !ass.SemesterId : ass.SemesterId === Number(selectedSemester));
        const matchesGrade = !selectedGrade ||
            (ass.GradeName.includes(selectedGrade) || ass.GradeName === selectedGrade);

        return matchesSearch && matchesYear && matchesSemester && matchesGrade;
    }).sort((a, b) => {
        const numA = parseInt(a.GradeName.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.GradeName.match(/\d+/)?.[0] || '0');
        if (numA !== numB) return numA - numB;
        const sectionA = a.Section || '';
        const sectionB = b.Section || '';
        return sectionA.localeCompare(sectionB);
    });

    // Grouping by teacher
    const groupedByTeacher = filteredAssignments.reduce((acc, ass) => {
        if (!acc[ass.TeacherId]) {
            acc[ass.TeacherId] = {
                TeacherId: ass.TeacherId,
                TeacherName: ass.TeacherName,
                TeacherEmail: ass.TeacherEmail,
                Assignments: []
            };
        }
        acc[ass.TeacherId].Assignments.push(ass);
        return acc;
    }, {} as Record<number, { TeacherId: number; TeacherName: string; TeacherEmail: string; Assignments: Assignment[] }>);

    const teacherList = Object.values(groupedByTeacher).sort((a, b) => a.TeacherName.localeCompare(b.TeacherName));

    // Pagination logic for teachers
    const totalPages = Math.ceil(teacherList.length / perPage);
    const paginatedTeachers = teacherList.slice((currentPage - 1) * perPage, currentPage * perPage);

    const toggleTeacher = (teacherId: number) => {
        setExpandedTeacherId(prev => (prev === teacherId ? null : teacherId));
    };

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
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="director" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="director" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">

                        <button
                            onClick={() => {
                                setEditingAssignmentId(null);
                                const activeYear = academicYears.find(y => y.IsActive);
                                const activeSem = semesters.find(s => s.IsActive);
                                setFormData({
                                    teacherId: '',
                                    classId: '',
                                    courseId: '',
                                    academicYearId: activeYear?.Id.toString() || '',
                                    semesterId: activeSem?.Id.toString() || '',
                                    isBothSemesters: false
                                });
                                setIsModalOpen(true);
                            }}
                            className="bg-black text-white px-8 py-4 rounded-[22px] font-black shadow-xl shadow-blue-500/20 hover:bg-gray-600 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <UserPlus size={20} />
                            New Assignment
                        </button>
                    </div>

                    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 min-h-[500px]">
                        <div className="flex flex-col gap-6 mb-8">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-black text-[#2B3674]">Current Allocation</h2>
                                    <span className="bg-blue-50 text-brand-blue text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                        {filteredAssignments.length} Assignments
                                    </span>
                                </div>
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Filter by teacher, course..."
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">By Academic Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    >
                                        <option value="">All Academic Years</option>
                                        {academicYears.map(ay => (
                                            <option key={ay.Id} value={ay.Id}>{ay.Name} {ay.IsActive ? '' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">By Semester</label>
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => { setSelectedSemester(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    >
                                        <option value="">All Semesters</option>
                                        <option value="full">Full Academic Year</option>
                                        {semesters
                                            .filter(s => !selectedYear || s.AcademicYearId === Number(selectedYear))
                                            .map(s => (
                                                <option key={s.Id} value={s.Id}>{s.Name} {s.IsActive ? '(Active)' : ''}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">By Grade</label>
                                    <select
                                        value={selectedGrade}
                                        onChange={(e) => { setSelectedGrade(e.target.value); setCurrentPage(1); }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    >
                                        <option value="">All Grades</option>
                                        {Array.from(new Set(classes.map(c => c.GradeName)))
                                            .sort((a, b) => {
                                                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                                                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                                                return numA - numB;
                                            })
                                            .map(grade => (
                                                <option key={grade} value={grade}>{grade}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-brand-blue" size={40} />
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Syncing assignments...</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left border-b border-slate-50">
                                                <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] pl-4 w-10"></th>
                                                <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Faculty Member</th>
                                                <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Total Assignments</th>
                                                <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] text-right pr-4">Quick Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {paginatedTeachers.map((teacher) => (
                                                <React.Fragment key={teacher.TeacherId}>
                                                    <tr className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => toggleTeacher(teacher.TeacherId)}>
                                                        <td className="py-6 pl-4">
                                                            <div className={`transition-transform duration-300 ${expandedTeacherId === teacher.TeacherId ? 'rotate-180' : ''}`}>
                                                                <ChevronDown size={18} className="text-slate-400 group-hover:text-brand-blue" />
                                                            </div>
                                                        </td>
                                                        <td className="py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-50 to-blue-50 text-brand-blue flex items-center justify-center shadow-sm">
                                                                    <GraduationCap size={22} />
                                                                </div>
                                                                <div>
                                                                    <span className="font-black text-[#2B3674] block uppercase tracking-tight">{teacher.TeacherName}</span>
                                                                    <span className="text-[10px] text-slate-400 font-bold lowercase tracking-widest">{teacher.TeacherEmail}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-6">
                                                            <span className="px-4 py-1.5 bg-blue-50 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                                                {teacher.Assignments.length} Courses Linked
                                                            </span>
                                                        </td>
                                                        <td className="py-6 text-right pr-4">
                                                            <div className="flex items-center justify-end gap-3 transition-all duration-300">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleTeacher(teacher.TeacherId);
                                                                    }}
                                                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-black text-[10px] tracking-[0.15em] transition-all duration-300 active:scale-95 shadow-sm
                                                                    ${expandedTeacherId === teacher.TeacherId
                                                                            ? 'bg-gray-500 text-white hover:bg-black-600 hover:text-white'
                                                                            : 'bg-black text-white hover:bg-black-600 hover:text-white'
                                                                        }`}
                                                                >
                                                                    {expandedTeacherId === teacher.TeacherId
                                                                        ? 'HIDE DETAILS'
                                                                        : 'VIEW DETAILS'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expandedTeacherId === teacher.TeacherId && (
                                                        <tr className="bg-slate-50/30">
                                                            <td colSpan={4} className="p-0 border-none overflow-hidden animate-in slide-in-from-top-4 duration-300">
                                                                <div className="p-8 space-y-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        {teacher.Assignments.map((ass) => (
                                                                            <div key={ass.AssignmentId} className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group/card relative overflow-hidden">
                                                                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-40 group-hover/card:scale-150 transition-transform duration-500"></div>
                                                                                <div className="relative z-10">
                                                                                    <div className="flex justify-between items-start mb-4">
                                                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-brand-blue mb-4">
                                                                                            <School size={18} />
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <button
                                                                                                onClick={() => handleEdit(ass)}
                                                                                                className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center hover:bg-brand-blue hover:text-white transition-all shadow-sm"
                                                                                            >
                                                                                                <Edit2 size={12} />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDelete(ass.AssignmentId)}
                                                                                                className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                                            >
                                                                                                <Trash2 size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    <h4 className="text-lg font-black text-[#2B3674] mb-1">{ass.GradeName} &mdash; {ass.Section}</h4>
                                                                                    <div className="flex items-center gap-2 mb-4">
                                                                                        <BookOpen size={14} className="text-brand-blue" />
                                                                                        <span className="font-bold text-slate-500 text-sm uppercase tracking-tight">{ass.CourseName}</span>
                                                                                    </div>

                                                                                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-50">
                                                                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                                                            <span className="text-slate-400">Semester</span>
                                                                                            <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                                                                                                {ass.SemesterName || 'Full Year'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                                                            <span className="text-slate-400">Academic Year</span>
                                                                                            <span className="text-slate-600 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                                                                                                {ass.AcademicYearName}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                            {teacherList.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                                <Users size={30} />
                                                            </div>
                                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No matching teacher assignments found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {teacherList.length > 0 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 pt-8 border-t border-slate-50">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => paginate(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>

                                            <div className="flex items-center gap-1 mx-2">
                                                {getPageNumbers().map((p, idx) =>
                                                    p === 'ellipsis' ? (
                                                        <div key={`e-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                            <MoreHorizontal size={14} />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            key={p}
                                                            onClick={() => paginate(p)}
                                                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${currentPage === p
                                                                ? 'border-brand-blue text-brand-blue bg-blue-50 shadow-sm'
                                                                : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
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
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={() => setPerPageOpen(!perPageOpen)}
                                                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                            >
                                                {perPage} / page
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${perPageOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {perPageOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-200">
                                                    {[10, 20, 50, 100].map((size) => (
                                                        <button
                                                            key={size}
                                                            onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                            className={`w-full text-left px-6 py-3 text-xs font-black transition-all ${perPage === size
                                                                ? 'text-red-500 bg-red-50'
                                                                : 'text-slate-600 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            {size} / page
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
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-[#2B3674]">{editingAssignmentId ? 'Update Role' : 'New Assignment'}</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configure access control</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[#2B3674] uppercase tracking-[0.2em] mb-3 ml-1">Faculty Member</label>
                                <select
                                    required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-bold text-sm"
                                    value={formData.teacherId}
                                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                                >
                                    <option value="">Select Instructor...</option>
                                    {teachers.map(t => <option key={t.UserId} value={t.UserId}>{t.FullName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[#2B3674] uppercase tracking-[0.2em] mb-3 ml-1">Classroom / Section</label>
                                <select
                                    required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-bold text-sm"
                                    value={formData.classId}
                                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                >
                                    <option value="">Select Target Class...</option>
                                    {classes.map(c => <option key={c.ClassId} value={c.ClassId}>{c.GradeName} - {c.Section}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[#2B3674] uppercase tracking-[0.2em] mb-3 ml-1">Assigned Course</label>
                                <select
                                    required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-bold text-sm"
                                    value={formData.courseId}
                                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                >
                                    <option value="">Select Subject...</option>
                                    {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[#2B3674] uppercase tracking-[0.2em] mb-3 ml-1">Academic Year</label>
                                    <select
                                        required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-bold text-sm"
                                        value={formData.academicYearId}
                                        onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                                    >
                                        <option value="">Year...</option>
                                        {academicYears.map(y => (
                                            <option key={y.Id} value={y.Id}>
                                                {y.Name} {y.IsActive ? '' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#2B3674] uppercase tracking-[0.2em] mb-3 ml-1">Semester</label>
                                    <select
                                        required={!formData.isBothSemesters}
                                        disabled={formData.isBothSemesters}
                                        className={`w-full px-6 py-4 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all font-bold text-sm ${formData.isBothSemesters ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-[#2B3674]'}`}
                                        value={formData.isBothSemesters ? '' : formData.semesterId}
                                        onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                                    >
                                        <option value="">Semester...</option>
                                        {semesters.filter(s => !formData.academicYearId || s.AcademicYearId === parseInt(formData.academicYearId)).map(s => (
                                            <option key={s.Id} value={s.Id}>
                                                {s.Name} {s.IsActive ? '' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-[24px] border border-slate-100 hover:border-brand-blue transition-all group cursor-pointer" onClick={() => setFormData({ ...formData, isBothSemesters: !formData.isBothSemesters })}>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${formData.isBothSemesters ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/30' : 'bg-white border-2 border-slate-200'}`}>
                                    {formData.isBothSemesters && <X size={14} className="rotate-45" />}
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black text-[#2B3674] uppercase tracking-widest">Assign to Both Semesters</span>
                                    <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-tight">Full academic year coverage</span>
                                </div>
                            </div>
                            <button
                                disabled={isSubmitting}
                                className="w-full bg-brand-blue disabled:opacity-50 text-white py-5 rounded-[22px] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3 mt-10"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingAssignmentId ? 'Save Changes' : 'Confirm Assignment')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTeacherAssignments;



