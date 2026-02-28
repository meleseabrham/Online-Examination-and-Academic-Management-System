import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { School, Users, ChevronRight, ArrowLeft, Mail, ChevronLeft, ChevronDown, MoreHorizontal } from 'lucide-react';

interface Class {
    ClassId: number;
    GradeName: string;
    Section: string;
    StudentCount: number;
    AcademicYearId?: number;
    SemesterId?: number;
    AcademicYearName?: string;
    SemesterName?: string;
}

interface Student {
    UserId: number;
    FullName: string;
    Email: string;
    Status: string;
}

const MyClasses = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination for Classes
    const [classPage, setClassPage] = useState(1);
    const [classPerPage, setClassPerPage] = useState(9);
    const [classPerPageOpen, setClassPerPageOpen] = useState(false);

    // Pagination for Students
    const [studentPage, setStudentPage] = useState(1);
    const [studentPerPage, setStudentPerPage] = useState(10);
    const [studentPerPageOpen, setStudentPerPageOpen] = useState(false);

    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email || 'teacher@example.com';

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/teacher/classes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClasses(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setLoading(false);
        }
    };

    const fetchStudents = async (cls: Class) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/teacher/classes/${cls.ClassId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudents(response.data);
            setSelectedClass(cls);
            setStudentPage(1);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const scrollToTop = () => {
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Class Pagination Logic
    const classTotalPages = Math.ceil(classes.length / classPerPage);
    const paginatedClasses = classes.slice((classPage - 1) * classPerPage, classPage * classPerPage);

    const paginateClasses = (page: number) => {
        setClassPage(page);
        scrollToTop();
    };

    // Student Pagination Logic
    const studentTotalPages = Math.ceil(students.length / studentPerPage);
    const paginatedStudents = students.slice((studentPage - 1) * studentPerPage, studentPage * studentPerPage);

    const paginateStudents = (page: number) => {
        setStudentPage(page);
        scrollToTop();
    };

    const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
        const pages: (number | 'ellipsis')[] = [];
        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push('ellipsis');
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (current < total - 2) pages.push('ellipsis');
            pages.push(total);
        }
        return pages;
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="teacher" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="teacher" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {selectedClass ? (
                        <>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="flex items-center gap-2 text-slate-500 hover:text-brand-blue transition-all mb-6 font-bold"
                            >
                                <ArrowLeft size={20} />
                                Back to My Classes
                            </button>

                            <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100 mb-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="bg-blue-50 p-3 rounded-xl text-brand-blue">
                                        <School size={24} />
                                    </div>
                                    <h1 className="text-3xl font-bold text-[#2B3674]">{selectedClass.GradeName} - {selectedClass.Section}</h1>
                                </div>
                                <p className="text-slate-500 ml-14">Student Roster • {students.length} Total Students</p>
                            </div>

                            <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 overflow-hidden mb-8">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-8 py-6 text-xs font-black uppercase tracking-wider text-slate-400">Student Name</th>
                                                <th className="px-8 py-6 text-xs font-black uppercase tracking-wider text-slate-400">Email Address</th>
                                                <th className="px-8 py-6 text-xs font-black uppercase tracking-wider text-slate-400">Status</th>
                                                <th className="px-8 py-6 text-xs font-black uppercase tracking-wider text-slate-400">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedStudents.map((student) => (
                                                <tr key={student.UserId} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue/10 to-indigo-600/10 flex items-center justify-center text-brand-blue font-bold">
                                                                {student.FullName.charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-[#2B3674]">{student.FullName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-slate-500 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Mail size={16} className="text-slate-300" />
                                                            {student.Email}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${student.Status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                            }`}>
                                                            {student.Status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <button
                                                            onClick={() => navigate(`/teacher/students/${student.UserId}/progress`)}
                                                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
                                                        >
                                                            📊 View Progress
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {students.length === 0 && (
                                    <div className="p-12 text-center">
                                        <Users size={40} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400 font-medium">No students enrolled in this class yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Student Pagination */}
                            {students.length > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-1 gap-4 pb-8">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => paginateStudents(Math.max(1, studentPage - 1))}
                                            disabled={studentPage === 1}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        <div className="flex items-center gap-1 mx-2">
                                            {getPageNumbers(studentPage, studentTotalPages).map((p, idx) =>
                                                p === 'ellipsis' ? (
                                                    <div key={`e-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                        <MoreHorizontal size={14} />
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => paginateStudents(p)}
                                                        className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${studentPage === p
                                                            ? 'border-red-400 text-red-500 bg-red-50 shadow-sm'
                                                            : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        <button
                                            onClick={() => paginateStudents(Math.min(studentTotalPages, studentPage + 1))}
                                            disabled={studentPage === studentTotalPages || studentTotalPages === 0}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setStudentPerPageOpen(!studentPerPageOpen)}
                                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                        >
                                            {studentPerPage} / page
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${studentPerPageOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {studentPerPageOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-200">
                                                {[10, 20, 50, 100].map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => { setStudentPerPage(size); setStudentPage(1); setStudentPerPageOpen(false); }}
                                                        className={`w-full text-left px-6 py-3 text-xs font-black transition-all ${studentPerPage === size
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
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold text-[#2B3674]">My Classes</h1>
                                <p className="text-slate-500 mt-1">Manage your assigned classes and view student lists.</p>
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                        {paginatedClasses.map((cls) => (
                                            <div key={cls.ClassId} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-blue/5 rounded-full -mr-8 -mt-8 transition-all group-hover:scale-150 duration-700"></div>

                                                <div className="flex justify-between items-center mb-3 relative z-10">
                                                    <div className="bg-blue-50 p-2.5 rounded-xl text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all">
                                                        <School size={18} />
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-black text-[#2B3674] mb-1.5">{cls.GradeName} - {cls.Section}</h3>

                                                <div className="flex items-center gap-1.5 mb-3">
                                                    {cls.AcademicYearName && (
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 uppercase tracking-widest">
                                                            {cls.AcademicYearName}
                                                        </span>
                                                    )}
                                                    {cls.SemesterName ? (
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-blue-50 text-brand-blue rounded-md border border-blue-100 uppercase tracking-widest">
                                                            {cls.SemesterName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 rounded-md border border-indigo-100 uppercase tracking-widest">
                                                            Full Year
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-slate-500 mb-5 text-sm font-bold">
                                                    <Users size={16} className="text-brand-blue/50" />
                                                    <span>{cls.StudentCount} Enrolled</span>
                                                </div>

                                                <button
                                                    onClick={() => fetchStudents(cls)}
                                                    className="w-full py-2.5 rounded-xl bg-slate-50 font-black text-[#2B3674] text-xs uppercase tracking-wider hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-500/20"
                                                >
                                                    View Roster
                                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {!loading && classes.length === 0 && (
                                        <div className="text-center bg-white p-12 rounded-[30px] border border-dashed border-slate-200">
                                            <School size={48} className="mx-auto text-slate-200 mb-4" />
                                            <h3 className="text-xl font-bold text-[#2B3674]">No Classes Assigned</h3>
                                            <p className="text-slate-400 mt-2">You haven't been assigned to any classes yet. Please contact the administrator.</p>
                                        </div>
                                    )}

                                    {/* Class Pagination */}
                                    {classes.length > 0 && (
                                        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 pb-8">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => paginateClasses(Math.max(1, classPage - 1))}
                                                    disabled={classPage === 1}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>

                                                <div className="flex items-center gap-1 mx-2">
                                                    {getPageNumbers(classPage, classTotalPages).map((p, idx) =>
                                                        p === 'ellipsis' ? (
                                                            <div key={`e-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                                <MoreHorizontal size={14} />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                key={p}
                                                                onClick={() => paginateClasses(p)}
                                                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${classPage === p
                                                                    ? 'border-red-400 text-red-500 bg-red-50 shadow-sm'
                                                                    : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
                                                                    }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        )
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => paginateClasses(Math.min(classTotalPages, classPage + 1))}
                                                    disabled={classPage === classTotalPages || classTotalPages === 0}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setClassPerPageOpen(!classPerPageOpen)}
                                                    className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                                >
                                                    {classPerPage} / page
                                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${classPerPageOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                {classPerPageOpen && (
                                                    <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-top-2 duration-200">
                                                        {[9, 18, 36, 90].map((size) => (
                                                            <button
                                                                key={size}
                                                                onClick={() => { setClassPerPage(size); setClassPage(1); setClassPerPageOpen(false); }}
                                                                className={`w-full text-left px-6 py-3 text-xs font-black transition-all ${classPerPage === size
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
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyClasses;
