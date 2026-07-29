import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Plus, Edit2, Trash2, Search, UserCheck, UserX, X, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Info, GraduationCap, School, BookOpen, Calendar, Mail, User, Award, History, TrendingUp, Key, RotateCcw, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
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
}

const ManageUsers = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';

    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Student',
        dateOfBirth: '',
        gender: '',
        title: ''
    });
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Reset Password state
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetData, setResetData] = useState({ identifier: '', newPassword: '' });
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user: User | null = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                firstName: user.FirstName || '',
                middleName: user.MiddleName || '',
                lastName: user.LastName || '',
                email: user.Email,
                password: '', // Don't show password on edit
                role: user.Role,
                dateOfBirth: user.DateOfBirth ? user.DateOfBirth.split('T')[0] : '',
                gender: user.Gender || '',
                title: user.Title || ''
            });
        } else {
            setEditingUser(null);
            setFormData({ firstName: '', middleName: '', lastName: '', email: '', password: '', role: 'Student', dateOfBirth: '', gender: '', title: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setProfileFile(null);
        setShowPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const data = new FormData();
        data.append('firstName', formData.firstName);
        data.append('middleName', formData.middleName);
        data.append('lastName', formData.lastName);
        data.append('email', formData.email);
        if (!editingUser) data.append('password', formData.password);
        data.append('role', formData.role);
        data.append('dateOfBirth', formData.dateOfBirth);
        data.append('gender', formData.gender);
        data.append('title', formData.title);

        if (profileFile) data.append('profileImage', profileFile);

        try {
            if (editingUser) {
                await axios.put(`http://localhost:5000/api/admin/users/${editingUser.UserId}`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/admin/users', data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchUsers();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving user:', err);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/admin/users/reset-password', resetData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResetSuccess(true);
            setTimeout(() => {
                setIsResetModalOpen(false);
                setResetSuccess(false);
                setResetData({ identifier: '', newPassword: '' });
                setShowResetPassword(false);
            }, 3000); // 3 seconds to enjoy the success message
        } catch (err: any) {
            console.error('Error resetting password:', err);
            alert(err.response?.data?.message || 'Error resetting password');
        } finally {
            setResetLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    const toggleStatus = async (user: User) => {
        const token = localStorage.getItem('token');
        const newStatus = user.Status === 'Active' ? 'Inactive' : 'Active';
        try {
            await axios.put(`http://localhost:5000/api/admin/users/${user.UserId}`, {
                firstName: user.FirstName,
                middleName: user.MiddleName,
                lastName: user.LastName,
                email: user.Email,
                role: user.Role,
                status: newStatus,
                dateOfBirth: user.DateOfBirth,
                gender: user.Gender,
                title: user.Title
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers();
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    const handleDownloadCertificate = async (studentId: number, ayId: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/admin/transcript/full-year`, {
                params: { studentId, academicYearId: ayId },
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Certificate_${studentId}_Year_${ayId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Error downloading certificate:', err);
            alert('Error downloading certificate');
        }
    };

    const handleShowProfile = async (userId: number) => {
        setLoadingProfile(true);
        setIsProfileModalOpen(true);
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`http://localhost:5000/api/admin/users/${userId}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedUserProfile(response.data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            alert('Error fetching user profile');
            setIsProfileModalOpen(false);
        } finally {
            setLoadingProfile(false);
        }
    };

    const filteredUsers = users.filter((user: any) => {
        const lowerQuery = searchQuery.toLowerCase();
        return (
            user.FullName.toLowerCase().includes(lowerQuery) ||
            (user.FirstName && user.FirstName.toLowerCase().includes(lowerQuery)) ||
            (user.MiddleName && user.MiddleName.toLowerCase().includes(lowerQuery)) ||
            (user.LastName && user.LastName.toLowerCase().includes(lowerQuery)) ||
            user.Email.toLowerCase().includes(lowerQuery) ||
            user.Role.toLowerCase().includes(lowerQuery) ||
            (user.RegistrationNumber && user.RegistrationNumber.toLowerCase().includes(lowerQuery)) ||
            (user.Title && user.Title.toLowerCase().includes(lowerQuery))
        );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / perPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * perPage, currentPage * perPage);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const paginate = (page: number) => {
        setCurrentPage(page);
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Build page numbers with ellipsis
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
            <Sidebar role="admin" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-20">
                    <Header email={email} role="admin" />
                </div>


                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex justify-between items-center mb-10">

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="bg-black text-white border border-indigo-100 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-600 transition-all flex items-center gap-3 active:scale-95 shadow-sm"
                            >
                                <RotateCcw size={18} />
                                Reset Account
                            </button>
                            <button
                                onClick={() => handleOpenModal(null)}
                                className="bg-brand-blue text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                <Plus size={18} />
                                Add New User
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
                        <div className="relative mb-8 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email, role or reg no..."
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-100">
                                        <th className="pb-6">RU No</th>
                                        <th className="pb-6">First Name</th>
                                        <th className="pb-6">Middle Name</th>
                                        <th className="pb-6">Last Name</th>
                                        <th className="pb-6">Email Address</th>
                                        <th className="pb-6">Role</th>
                                        <th className="pb-6">Gender</th>
                                        <th className="pb-6">Date of Birth</th>
                                        <th className="pb-6 text-center">Status</th>
                                        <th className="pb-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedUsers.map((user) => (
                                        <tr key={user.UserId} className="group hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                                            <td className="py-6">
                                                <span className="
                                                    inline-flex items-center
                                                    px-3 py-1
                                                    text-xs font-semibold
                                                    font-mono
                                                    text-slate-600
                                                    bg-slate-100
                                                    rounded-lg
                                                    tracking-wide
                                                ">
                                                    {user.RegistrationNumber || "N/A"}
                                                </span>

                                            </td>
                                            <td className="py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-indigo-600 p-[2px] shrink-0">
                                                        <div className="w-full h-full bg-white rounded-[8px] overflow-hidden flex items-center justify-center">
                                                            {user.ProfileImage ? (
                                                                <img
                                                                    src={`http://localhost:5000/${user.ProfileImage}`}
                                                                    alt={user.FullName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="font-bold text-brand-blue uppercase">
                                                                    {user.FirstName ? user.FirstName[0] : (user.FullName ? user.FullName[0] : '?')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-[#2B3674]">{user.FirstName || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                <span className="font-bold text-[#2B3674]">{user.MiddleName || '—'}</span>
                                            </td>
                                            <td className="py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#2B3674]">{user.LastName || '—'}</span>
                                                    {user.Role !== 'Student' && user.Title && (
                                                        <div className="mt-1">
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-indigo-100/50 shadow-sm w-fit">
                                                                <Award size={10} className="text-indigo-400" />
                                                                {user.Title}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-6 text-slate-500 font-medium italic">{user.Email}</td>
                                            <td className="py-6">
                                                <span className="text-sm font-bold text-[#2B3674]">{user.Role}</span>
                                            </td>
                                            <td className="py-6">
                                                <span className="text-sm font-bold text-[#2B3674]">{user.Gender || '—'}</span>
                                            </td>
                                            <td className="py-6">
                                                <span className="text-sm font-medium text-slate-500">
                                                    {user.DateOfBirth ? new Date(user.DateOfBirth).toLocaleDateString() : '—'}
                                                </span>
                                            </td>
                                            <td className="py-6 text-center">
                                                <span className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto w-fit shadow-sm border ${user.Status === 'Active'
                                                    ? ' text-emerald-600 border-emerald-100'
                                                    : 'text-rose-600 border-rose-100'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.Status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                    {user.Status === 'Active' ? 'Authorized' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleShowProfile(user.UserId)}
                                                        className="flex items-center gap-2 px-3 py-2.5 bg-green-700 text-white hover:bg-green-800 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="View Profile"
                                                    >
                                                        <Info size={16} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Info</span>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(user)}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 border ${user.Status === 'Active'
                                                            ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border-rose-100'
                                                            : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white border-emerald-100'
                                                            }`}
                                                        title={user.Status === 'Active' ? 'Suspend Account' : 'Authorize Account'}
                                                    >
                                                        {user.Status === 'Active' ? <UserX size={16} /> : <UserCheck size={16} />}
                                                        <span className="text-[10px] font-black uppercase tracking-wider">
                                                            {user.Status === 'Active' ? 'Suspend' : 'Authorize'}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="flex items-center gap-2 px-3 py-2.5 bg-black text-white hover:bg-gray-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 size={16} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.UserId)}
                                                        className="flex items-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredUsers.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 border-t border-slate-100 pt-8">
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
                </div>
            </main>

            {/* User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-3xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in duration-300 relative">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-[#2B3674] tracking-tight">
                                    {editingUser ? 'Edit User Profile' : 'Register New User'}
                                </h2>
                                <p className="text-slate-500 font-medium text-sm mt-1">
                                    {editingUser ? 'Update the account details below.' : 'Create a new institutional account.'}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all border border-slate-100">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="First Name"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Middle Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Middle Name"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                    value={formData.middleName}
                                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Last Name"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="john@example.com"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Password</label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            placeholder="••••••••"
                                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium pr-12"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">System Role</label>
                                <select
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="Student">Student</option>
                                    <option value="Teacher">Teacher</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Director">Director</option>
                                </select>
                            </div>

                            {formData.role !== 'Student' && (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Professional Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Senior Faculty"
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Gender</label>
                                <select
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-bold text-[#2B3674]"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Date of Birth</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Profile Photo</label>
                                <div className="flex items-center gap-4">
                                    {editingUser?.ProfileImage && (
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                            <img
                                                src={`http://localhost:5000/${editingUser.ProfileImage}`}
                                                alt="Current Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all text-xs font-medium file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20 cursor-pointer"
                                            onChange={(e) => setProfileFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-3 pt-4">
                                <button className="w-full bg-brand-blue text-white py-4 rounded-[22px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
                                    {editingUser ? 'Update Records' : 'Register User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* User Profile Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
                        {/* Modal Header */}
                        <div className="p-8 bg-black text-white flex justify-between items-start relative shrink-0">
                            <div className="flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md p-1 border border-white/30 relative group">
                                    <div className="w-full h-full bg-white rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                                        {selectedUserProfile?.user?.ProfileImage ? (
                                            <img
                                                src={`http://localhost:5000/${selectedUserProfile.user.ProfileImage}`}
                                                alt={selectedUserProfile.user.FullName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-4xl font-black text-brand-blue">
                                                {selectedUserProfile?.user?.FullName?.[0] || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/50 shadow-lg ${selectedUserProfile?.user?.Status === 'Active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                        {selectedUserProfile?.user?.Status || '...'}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black mb-1">{selectedUserProfile?.user?.FullName || 'Loading Profile...'}</h2>
                                    {selectedUserProfile?.user?.Role !== 'Student' && selectedUserProfile?.user?.Title && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 w-fit mt-2 mb-2">
                                            <Award size={12} className="text-indigo-300" />
                                            <p className="text-white/90 font-black uppercase text-[9px] tracking-[0.2em] leading-none">
                                                {selectedUserProfile.user.Title}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                            <User size={12} /> {selectedUserProfile?.user?.Role}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                            <Award size={12} /> {selectedUserProfile?.user?.RegistrationNumber || 'N/A'}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                            <Calendar size={12} /> Joined {selectedUserProfile?.user?.CreatedAt ? new Date(selectedUserProfile.user.CreatedAt).toLocaleDateString() : '...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10 active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-10 bg-[#F4F7FE] custom-scrollbar">
                            {loadingProfile ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-16 h-16 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Assembling Profile Intelligence...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                                    {/* Personal Info Card */}
                                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100/50">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                                                <Mail size={20} />
                                            </div>
                                            <h3 className="text-lg font-black text-[#2B3674]">Contacts</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Email Address</p>
                                                <p className="text-brand-blue font-bold break-all italic">{selectedUserProfile?.user?.Email}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Date of Birth</p>
                                                <p className="text-slate-700 font-bold">{selectedUserProfile?.user?.DateOfBirth ? new Date(selectedUserProfile.user.DateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Teacher Specific - Assignments */}
                                    {selectedUserProfile?.user?.Role === 'Teacher' && (
                                        <div className="md:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100/50">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="text-lg font-black text-[#2B3674] leading-tight">Current Assignments</h3>
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                                                        {selectedUserProfile.activeYearName} • {selectedUserProfile.activeSemesterName}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedUserProfile.assignments?.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {selectedUserProfile.assignments.map((ass: any, idx: number) => (
                                                        <div key={idx} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-brand-blue/30 transition-all group">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest bg-blue-100/50 px-2 py-1 rounded-md">{ass.CourseName}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 italic">#{ass.AssignmentId}</span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <p className="text-sm font-black text-slate-700 group-hover:text-brand-blue transition-colors flex items-center gap-2">
                                                                    <School size={14} className="text-slate-400" /> {ass.GradeName} - {ass.Section}
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                                        <Calendar size={10} /> {ass.AcademicYearName}
                                                                    </p>
                                                                    {ass.SemesterName && (
                                                                        <span className="w-1 h-1 bg-slate-300 rounded-full my-auto" />
                                                                    )}
                                                                    {ass.SemesterName && (
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">
                                                                            {ass.SemesterName}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active assignments found</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Student Specific - Current Info */}
                                    {selectedUserProfile?.user?.Role === 'Student' && (
                                        <>
                                            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100/50">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                                        <GraduationCap size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-black text-[#2B3674]">Academic Status</h3>
                                                </div>
                                                {selectedUserProfile.currentEnrollment ? (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Current Class</p>
                                                            <p className="text-brand-blue font-black text-lg">Grade {selectedUserProfile.currentEnrollment.GradeNumber} - {selectedUserProfile.currentEnrollment.SectionName}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Year</p>
                                                                <p className="text-slate-700 font-bold text-sm whitespace-nowrap">{selectedUserProfile.currentEnrollment.AcademicYearName}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Semester</p>
                                                                <p className="text-brand-blue font-black text-sm whitespace-nowrap uppercase">{selectedUserProfile.activeSemesterName}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Yearly Rank</p>
                                                                <p className="text-indigo-600 font-black text-sm whitespace-nowrap uppercase">#{selectedUserProfile.finalResults?.[0]?.ClassRank || selectedUserProfile.finalResults?.[0]?.GradeRank || '--'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Enroll Status</p>
                                                                <span className="inline-flex px-3 py-1 rounded-lg bg-green-50 text-green-600 text-[10px] font-black border border-green-100 uppercase tracking-widest">ACTIVE</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-6">Not currently enrolled</p>
                                                )}
                                            </div>

                                            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100/50">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                                        <TrendingUp size={20} />
                                                    </div>
                                                    <h3 className="text-lg font-black text-[#2B3674]">Performance</h3>
                                                </div>
                                                <div className="space-y-6">
                                                    {selectedUserProfile.semesterResults?.slice(0, 1).map((res: any, idx: number) => (
                                                        <div key={idx} className="relative">
                                                            <div className="flex justify-between items-end mb-2">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Average Score ({res.SemesterName})</p>
                                                                <p className="text-2xl font-black text-brand-blue leading-none">{res.Average}%</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-brand-blue to-indigo-500 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${res.Average}%` }} />
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                                <div className="text-center flex-1 border-r border-slate-200">
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Semester Rank</p>
                                                                    <p className="text-lg font-black text-brand-blue">#{res.ClassRank || res.GradeRank || '--'}</p>
                                                                </div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Courses</p>
                                                                    <p className="text-lg font-black text-[#2B3674]">{res.TotalCourses}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Yearly Performance */}
                                                    {selectedUserProfile.finalResults?.slice(0, 1).map((res: any, idx: number) => (
                                                        <div key={`final-${idx}`} className="relative border-t border-slate-50 pt-6">
                                                            <div className="flex justify-between items-end mb-2">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Yearly Average ({res.AcademicYearName})</p>
                                                                <p className="text-2xl font-black text-indigo-600 leading-none">{res.FinalAverage}%</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${res.FinalAverage}%` }} />
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4 p-3 bg-indigo-50/30 rounded-xl border border-indigo-100">
                                                                <div className="text-center flex-1 border-r border-indigo-100">
                                                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Yearly Rank</p>
                                                                    <p className="text-lg font-black text-indigo-700">#{res.ClassRank || res.GradeRank || '--'}</p>
                                                                </div>
                                                                <div className="text-center flex-1">
                                                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Final Status</p>
                                                                    <p className={`text-lg font-black uppercase ${res.Status === 'Passed' || res.Status === 'Promoted' ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {res.Status}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {!selectedUserProfile.semesterResults?.length && !selectedUserProfile.finalResults?.length && (
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-6">No results available yet</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-full bg-white rounded-[40px] p-8 shadow-sm border border-slate-100/50 overflow-hidden relative">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                                            <History size={20} />
                                                        </div>
                                                        <h3 className="text-lg font-black text-[#2B3674]">Academic History</h3>
                                                    </div>
                                                </div>
                                                {selectedUserProfile.history?.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                                                                    <th className="pb-4">Year</th>
                                                                    <th className="pb-4">Grade</th>
                                                                    <th className="pb-4">Final Average</th>
                                                                    <th className="pb-4">Rank</th>
                                                                    <th className="pb-4">Status</th>
                                                                    <th className="pb-4 text-right">Certificate</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {selectedUserProfile.history.map((h: any, idx: number) => (
                                                                    <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                                                        <td className="py-4 font-black text-[#2B3674]">{h.AcademicYearName}</td>
                                                                        <td className="py-4 font-bold text-slate-600">Grade {h.GradeNumber}</td>
                                                                        <td className="py-4">
                                                                            <span className={`font-black ${h.FinalAverage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                {h.FinalAverage}%
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 font-black text-indigo-600 text-xs">
                                                                            #{h.ClassRank || h.GradeRank || '--'}
                                                                        </td>
                                                                        <td className="py-4 font-bold">
                                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${h.Status === 'Promoted' || h.Status === 'Passed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                                                }`}>
                                                                                {h.Status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 text-right">
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleDownloadCertificate(
                                                                                        selectedUserProfile.user.UserId,
                                                                                        h.AcademicYearId
                                                                                    )
                                                                                }
                                                                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-gray-500 text-white hover:bg-[#0f172a] active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
                                                                            >
                                                                                Download
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="py-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
                                                        <History size={32} className="mx-auto text-slate-300 mb-3 opacity-50" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No historical academic records found</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Admin/Generic Role Placeholder */}
                                    {selectedUserProfile?.user?.Role === 'Admin' && (
                                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100/50 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mb-4">
                                                <UserCheck size={32} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Privileges Active</p>
                                            <p className="text-xs font-bold text-slate-600 mt-2">Full system access granted for this account.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Reset Password Modal */}
            <AnimatePresence>
                {isResetModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative border border-slate-100 overflow-hidden"
                        >
                            {!resetSuccess ? (
                                <>
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shadow-sm">
                                                <RotateCcw size={28} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-[#2B3674] tracking-tight">Reset Account</h2>
                                                <p className="text-slate-500 font-medium text-sm mt-1">Force update credentials for any user account.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setIsResetModalOpen(false); setShowResetPassword(false); }}
                                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleResetPassword} className="space-y-6">
                                        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100/50 mb-6 flex gap-4">
                                            <div className="p-2 bg-amber-100 rounded-xl h-fit">
                                                <Info size={16} className="text-amber-600" />
                                            </div>
                                            <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                                Provide the user's registered <span className="font-black text-amber-900 underline underline-offset-2 decoration-amber-300">Email Address</span> or <span className="font-black text-amber-900 underline underline-offset-2 decoration-amber-300">Registration Number</span> to identify the account.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Identifier</label>
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                                        <Search size={18} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Enter Email or Reg No..."
                                                        className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-[#2B3674] placeholder:text-slate-300 placeholder:font-medium"
                                                        value={resetData.identifier}
                                                        onChange={(e) => setResetData({ ...resetData, identifier: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">New Secure Password</label>
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                                        <Key size={18} />
                                                    </div>
                                                    <input
                                                        type={showResetPassword ? "text" : "password"}
                                                        required
                                                        placeholder="••••••••"
                                                        className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-[#2B3674] placeholder:text-slate-300"
                                                        value={resetData.newPassword}
                                                        onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowResetPassword(!showResetPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            disabled={resetLoading}
                                            className={`w-full py-5 rounded-[22px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${resetLoading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                                : 'bg-black text-white hover:bg-gray-600 shadow-black/25 active:scale-[0.98]'
                                                }`}
                                        >
                                            {resetLoading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                                                    Processing Reset...
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw size={20} />
                                                    Reset
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-10"
                                >
                                    <div className="w-24 h-24 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-6 shadow-sm border border-green-100">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <h3 className="text-3xl font-black text-[#2B3674] tracking-tight mb-2">Operation Success</h3>
                                    <p className="text-slate-500 font-bold mb-8 text-center max-w-[280px]">
                                        Password for <span className="text-indigo-600">{resetData.identifier}</span> has been updated successfully.
                                    </p>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "100%" }}
                                            animate={{ width: "0%" }}
                                            transition={{ duration: 3 }}
                                            className="h-full bg-green-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4">Window closing automatically...</p>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageUsers;
