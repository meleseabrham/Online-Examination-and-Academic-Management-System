import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Search, UserCheck, X, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Info, GraduationCap, School, BookOpen, Calendar, Mail, User, Award, ExternalLink } from 'lucide-react';

interface Teacher {
    UserId: number;
    FullName: string;
    FirstName?: string;
    MiddleName?: string;
    LastName?: string;
    Email: string;
    Role: string;
    Status: string;
    ProfileImage?: string;
    RegistrationNumber?: string;
    DateOfBirth?: string;
    Gender?: string;
    Title?: string;
    CreatedAt: string;
}

const ManageTeachers = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const userProfile = userString ? JSON.parse(userString) : null;
    const email = userProfile?.email || 'director@example.com';

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/director/users?role=Teacher', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeachers(response.data);
        } catch (err) {
            console.error('Error fetching teachers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const handleShowProfile = async (userId: number) => {
        setLoadingProfile(true);
        setIsProfileModalOpen(true);
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`http://localhost:5000/api/director/users/${userId}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedTeacherProfile(response.data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setIsProfileModalOpen(false);
        } finally {
            setLoadingProfile(false);
        }
    };

    const filteredTeachers = teachers.filter(t => {
        const lowerQuery = searchQuery.toLowerCase();
        return (
            t.FullName.toLowerCase().includes(lowerQuery) ||
            (t.FirstName && t.FirstName.toLowerCase().includes(lowerQuery)) ||
            (t.MiddleName && t.MiddleName.toLowerCase().includes(lowerQuery)) ||
            (t.LastName && t.LastName.toLowerCase().includes(lowerQuery)) ||
            t.Email.toLowerCase().includes(lowerQuery) ||
            (t.RegistrationNumber && t.RegistrationNumber.toLowerCase().includes(lowerQuery)) ||
            (t.Title && t.Title.toLowerCase().includes(lowerQuery))
        );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredTeachers.length / perPage);
    const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * perPage, currentPage * perPage);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const paginate = (page: number) => {
        setCurrentPage(page);
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
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden font-display">
            <Sidebar role="director" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={email} role="director" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex justify-between items-center mb-8">

                        <div className="flex gap-4">
                            <button
                                onClick={() => navigate('/director/assignments')}
                                className="bg-black text-white border border-brand-blue/20 px-6 py-4 rounded-2xl font-bold hover:bg-gray-600 transition-all flex items-center gap-3 active:scale-95"
                            >
                                <GraduationCap size={20} />
                                View Assignments
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 min-h-[500px]">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or ID..."
                                    className="w-full pl-12 pr-4 py-3.5 rounded-[22px] bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    {filteredTeachers.length} Total Faculty
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">ID / Reg No</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">First Name</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Middle Name</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Last Name</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Email Address</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] text-center">Status</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={6} className="py-8 h-20 bg-slate-50/50 rounded-xl mb-2"></td>
                                            </tr>
                                        ))
                                    ) : paginatedTeachers.map((teacher) => (
                                        <tr key={teacher.UserId} className="group hover:bg-slate-50/50 transition-all">
                                            <td className="py-6 whitespace-nowrap">
                                                <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-bold tracking-wider uppercase">
                                                    {teacher.RegistrationNumber || "N/A"}
                                                </span>
                                            </td>
                                            <td className="py-6 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-50 to-blue-50 p-1 shrink-0 relative">
                                                        <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center font-bold text-brand-blue uppercase shadow-inner border border-white/50">
                                                            {teacher.ProfileImage ? (
                                                                <img
                                                                    src={`http://localhost:5000/${teacher.ProfileImage}`}
                                                                    alt={teacher.FullName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span>{teacher.FirstName ? teacher.FirstName[0] : (teacher.FullName ? teacher.FullName[0] : '?')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-[#2B3674] block tracking-tight uppercase">{teacher.FirstName || '—'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                <span className="font-black text-[#2B3674] block tracking-tight uppercase">{teacher.MiddleName || '—'}</span>
                                            </td>
                                            <td className="py-6">
                                                <div>
                                                    <span className="font-black text-[#2B3674] block tracking-tight uppercase">{teacher.LastName || '—'}</span>
                                                    <div className="mt-1">
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-indigo-100/50 shadow-sm w-fit">
                                                            <Award size={10} className="text-indigo-400" />
                                                            {teacher.Title || 'Senior Faculty'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 text-slate-500 font-medium text-sm italic">{teacher.Email}</td>

                                            <td className="py-6 text-center">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm ${teacher.Status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                    {teacher.Status}
                                                </span>
                                            </td>
                                            <td className="py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleShowProfile(teacher.UserId)}
                                                        className="flex items-center gap-2 px-4 py-3 cursor-pointer bg-black text-white hover:bg-gray-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 "
                                                    >
                                                        <Info
                                                            size={14}
                                                            className="group-hover:rotate-12 transition-transform duration-200"
                                                        />
                                                        View Profile
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            navigate(
                                                                `/director/assignments?search=${encodeURIComponent(
                                                                    teacher.FullName
                                                                )}`
                                                            )
                                                        }
                                                        className="flex items-center gap-2 px-4 py-3 cursor-pointer bg-black text-white hover:bg-gray-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                                                        title="View Assignments"
                                                    >
                                                        <ExternalLink size={14} /> View Assignments
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && filteredTeachers.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 pt-8 border-t border-slate-100">
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
                                        <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-[60] animate-in slide-in-from-bottom-2 duration-200">
                                            {[10, 20, 50, 100].map((size) => (
                                                <button
                                                    key={size}
                                                    onClick={() => { setPerPage(size); setCurrentPage(1); setPerPageOpen(false); }}
                                                    className={`w-full text-left px-6 py-3 text-xs font-black transition-all ${perPage === size
                                                        ? 'text-brand-blue bg-blue-50'
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
                        {!loading && filteredTeachers.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center">
                                <UserCheck className="mx-auto text-slate-200 mb-4" size={64} />
                                <h3 className="text-xl font-black text-[#2B3674]">No Teachers Found</h3>
                                <p className="text-slate-400 font-medium">Try adjusting your search query.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Profile Modal Overlay */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
                        {/* Modal Header */}
                        <div className="p-10 bg-gradient-to-br from-indigo-900 via-[#111C44] to-[#1B254B] text-white flex justify-between items-start relative shrink-0">
                            <div className="flex gap-8 items-center">
                                <div className="w-28 h-28 rounded-[35px] bg-white/10 backdrop-blur-xl p-1.5 border border-white/20 relative group overflow-hidden">
                                    <div className="w-full h-full bg-white rounded-[28px] overflow-hidden shadow-inner flex items-center justify-center">
                                        {selectedTeacherProfile?.user?.ProfileImage ? (
                                            <img
                                                src={`http://localhost:5000/${selectedTeacherProfile.user.ProfileImage}`}
                                                alt={selectedTeacherProfile.user.FullName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-5xl font-black text-brand-blue">
                                                {selectedTeacherProfile?.user?.FullName?.[0] || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white shadow-lg ${selectedTeacherProfile?.user?.Status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-4xl font-black tracking-tight">{selectedTeacherProfile?.user?.FullName || 'Instructor Profile'}</h2>
                                        <span className="px-3 py-1 bg-brand-blue text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20">
                                            {selectedTeacherProfile?.user?.Status || 'ACTIVE'}
                                        </span>
                                    </div>
                                    {selectedTeacherProfile?.user?.Title && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 w-fit mb-4">
                                            <Award size={14} className="text-indigo-300" />
                                            <p className="text-white/90 font-black uppercase text-[10px] tracking-[0.2em] leading-none">
                                                {selectedTeacherProfile.user.Title}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-4 mt-4">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-[11px] font-black uppercase tracking-wider border border-white/10">
                                            <User size={14} className="text-blue-400" /> {selectedTeacherProfile?.user?.Role}
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-[11px] font-black uppercase tracking-wider border border-white/10">
                                            <Award size={14} className="text-amber-400" /> {selectedTeacherProfile?.user?.RegistrationNumber || 'N/A'}
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-[11px] font-black uppercase tracking-wider border border-white/10">
                                            <Calendar size={14} className="text-indigo-400" /> MEMBER SINCE {selectedTeacherProfile?.user?.CreatedAt ? new Date(selectedTeacherProfile.user.CreatedAt).getFullYear() : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC] custom-scrollbar">
                            {loadingProfile ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-16 h-16 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">Fetching Faculty Intelligence...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* Left Column - Essential Intel */}
                                    <div className="space-y-8">
                                        <div className="bg-white rounded-[35px] p-8 shadow-sm border border-slate-100/50">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                                                    <Mail size={20} />
                                                </div>
                                                <h3 className="text-lg font-black text-[#2B3674] tracking-tight uppercase">Connectivity</h3>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Registered Email</p>
                                                    <p className="text-brand-blue font-black break-all text-sm italic">{selectedTeacherProfile?.user?.Email}</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Date of Birth</p>
                                                    <p className="text-slate-700 font-black text-sm">{selectedTeacherProfile?.user?.DateOfBirth ? new Date(selectedTeacherProfile.user.DateOfBirth).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'NOT DISCLOSED'}</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Gender</p>
                                                    <p className="text-slate-700 font-black text-sm uppercase tracking-wide">{selectedTeacherProfile?.user?.Gender || 'NOT SPECIFIED'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Mission Allocation */}
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100/50">
                                            <div className="flex items-center justify-between mb-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                                        <BookOpen size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-[#2B3674] leading-tight tracking-tight uppercase">Current Assignments</h3>
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                                                            {selectedTeacherProfile.activeYearName} &bull; {selectedTeacherProfile.activeSemesterName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 font-black text-[10px] tracking-widest uppercase shadow-sm">
                                                    {selectedTeacherProfile.assignments?.length || 0} ACTIVE
                                                </div>
                                            </div>

                                            {selectedTeacherProfile.assignments?.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedTeacherProfile.assignments.map((ass: any, idx: number) => (
                                                        <div key={idx} className="p-6 bg-slate-50 rounded-[30px] border border-slate-100/50 hover:bg-white hover:border-brand-blue/30 hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                                                            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-blue/5 rounded-full -mr-8 -mt-8" />
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <span className="px-3 py-1 bg-brand-blue text-white rounded-lg text-[9px] font-black tracking-widest uppercase shadow-sm">{ass.CourseName}</span>
                                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">REF#{ass.AssignmentId}</span>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <p className="text-base font-black text-[#2B3674] group-hover:text-brand-blue transition-colors flex items-center gap-2">
                                                                        <School size={16} className="text-slate-400" /> {ass.GradeName} / SECTION {ass.Section}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 opacity-60">
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar size={12} className="text-slate-500" />
                                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{ass.AcademicYearName}</span>
                                                                        </div>
                                                                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{ass.SemesterName || 'FULL ACADEMIC YEAR'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-20 text-center bg-slate-50 rounded-[35px] border-4 border-dashed border-slate-100">
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 shadow-sm">
                                                        <BookOpen size={30} />
                                                    </div>
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Zero Active Deployments</p>
                                                    <button
                                                        onClick={() => navigate('/director/assignments')}
                                                        className="mt-6 px-8 py-3 bg-brand-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                                    >
                                                        Assign Course Now
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageTeachers;
