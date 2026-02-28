import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Megaphone, Plus, Trash2, Calendar, X, Clock, Edit2, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Announcement {
    Id: number;
    Title: string;
    Content: string;
    TargetRole: string;
    Deadline: string | null;
    ClassId: number | null;
    GradeName?: string;
    Section?: string;
    CreatedAt: string;
}

interface Class {
    ClassId: number;
    GradeName: string;
    Section: string;
}

const AdminAnnouncements = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        targetRole: 'All',
        deadline: '',
        classId: ''
    });
    const [classes, setClasses] = useState<Class[]>([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/director/announcements', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnnouncements(response.data);
        } catch (err) {
            console.error('Error fetching announcements:', err);
        }
    };

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/director/classes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClasses(response.data);
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        fetchClasses();
    }, []);

    const handleOpenModal = (announcement: Announcement | null = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setFormData({
                title: announcement.Title,
                content: announcement.Content,
                targetRole: announcement.TargetRole,
                deadline: announcement.Deadline ? new Date(announcement.Deadline).toISOString().split('T')[0] : '',
                classId: announcement.ClassId?.toString() || ''
            });
        } else {
            setEditingAnnouncement(null);
            setFormData({ title: '', content: '', targetRole: 'All', deadline: '', classId: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAnnouncement(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingAnnouncement) {
                await axios.put(`http://localhost:5000/api/director/announcements/${editingAnnouncement.Id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/director/announcements', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchAnnouncements();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving announcement:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/api/director/announcements/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAnnouncements();
        } catch (err) {
            console.error('Error deleting announcement:', err);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(announcements.length / perPage);
    const paginatedAnnouncements = announcements.slice((currentPage - 1) * perPage, currentPage * perPage);

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
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden relative">
            <Sidebar role="director" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role="director" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth bg-[#F4F7FE]">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-[#2B3674]">Announcements</h1>
                            <p className="text-slate-500 mt-1">Broadcast important updates to students, teachers, or all users.</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center gap-3"
                        >
                            <Plus size={20} />
                            New Announcement
                        </button>
                    </div>

                    <div className="space-y-6">
                        {paginatedAnnouncements.map((item) => (
                            <div key={item.Id} className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-orange-50 p-4 rounded-2xl text-orange-600">
                                            <Megaphone size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#2B3674]">{item.Title}</h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 text-sm mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>Posted on {new Date(item.CreatedAt).toLocaleDateString()}</span>
                                                </div>
                                                {item.Deadline && (
                                                    <div className={cn(
                                                        "flex items-center gap-1 font-bold",
                                                        new Date(item.Deadline).setHours(23, 59, 59, 999) < Date.now() ? "text-slate-300" : "text-red-400"
                                                    )}>
                                                        <Clock size={14} />
                                                        <span>Deadline: {new Date(item.Deadline).toLocaleDateString()}</span>
                                                        {new Date(item.Deadline).setHours(23, 59, 59, 999) < Date.now() && (
                                                            <span className="ml-2 bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[10px] uppercase">Expired</span>
                                                        )}
                                                    </div>
                                                )}
                                                <span className="bg-blue-50 text-brand-blue px-3 py-1 rounded-lg text-[10px] font-black uppercase">Target: {item.TargetRole}</span>
                                                {item.ClassId && (
                                                    <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Class: {classes.find(c => c.ClassId === item.ClassId)?.GradeName}-{classes.find(c => c.ClassId === item.ClassId)?.Section}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 relative z-10">
                                        <button
                                            onClick={() => handleOpenModal(item)}
                                            className="p-2 text-slate-300 hover:text-brand-blue hover:bg-white rounded-lg transition-all"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.Id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-slate-600 leading-relaxed">{item.Content}</p>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {announcements.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 pb-8 border-t border-slate-50 pt-8">
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
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[30px] p-8 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-[#2B3674]">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[#2B3674] mb-2">Title</label>
                                <input
                                    type="text" required placeholder="Announcement Title"
                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#2B3674] mb-2">Target Audience</label>
                                    <select
                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all cursor-pointer"
                                        value={formData.targetRole}
                                        onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                                    >
                                        <option value="All">All Users</option>
                                        <option value="Student">Students Only</option>
                                        <option value="Teacher">Teachers Only</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#2B3674] mb-2">Assign to Class</label>
                                    <select
                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all cursor-pointer text-xs"
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                    >
                                        <option value="">No specific class</option>
                                        {classes.map(c => (
                                            <option key={c.ClassId} value={c.ClassId}>
                                                {c.GradeName} - {c.Section}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#2B3674] mb-2">Deadline</label>
                                    <input
                                        type="date"
                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#2B3674] mb-2">Content</label>
                                <textarea
                                    rows={4} required placeholder="Write your announcement here..."
                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all resize-none"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                            <button className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                                {editingAnnouncement ? 'Save Changes' : 'Post Announcement'}
                            </button>
                            <p className="text-[10px] text-center text-slate-400 font-medium">
                                This will also appear on the <a href="http://localhost:5173/login" className="text-brand-blue underline">Login Header</a>
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnnouncements;



