import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Megaphone, Calendar, ChevronRight, Loader, ChevronLeft, ChevronDown, MoreHorizontal, X } from 'lucide-react';

interface Announcement {
    Id: number;
    Title: string;
    Content: string;
    CreatedAt: string;
    Deadline?: string;
}

const TeacherAnnouncements = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const annRes = await axios.get('http://localhost:5000/api/teacher/announcements', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAnnouncements(annRes.data);
            } catch (err) {
                console.error('Error fetching announcements:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, [token]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="teacher" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role="teacher" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">Teacher Announcements</h1>
                        <p className="text-slate-500 mt-1 font-medium">Stay updated with the latest news and highlights from the administration.</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader className="animate-spin text-brand-blue" size={40} />
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="bg-white p-12 rounded-[40px] text-center shadow-sm">
                            <Megaphone size={60} className="text-slate-200 mx-auto mb-6" />
                            <h2 className="text-xl font-bold text-[#2B3674]">No announcements found</h2>
                            <p className="text-slate-400 mt-2">Check back later for school updates.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedAnnouncements.map((item) => (
                                    <div
                                        key={item.Id}
                                        className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-transparent hover:border-brand-blue/10 hover:shadow-xl transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-brand-blue/10 p-3 rounded-2xl text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all">
                                                    <Megaphone size={20} />
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                    <Calendar size={12} />
                                                    {formatDate(item.CreatedAt)}
                                                </div>
                                            </div>
                                            {item.Deadline && (
                                                <div className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                                                    Deadline: {formatDate(item.Deadline)}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-[#2B3674] mb-3 group-hover:text-brand-blue transition-all leading-tight">
                                            {item.Title}
                                        </h3>
                                        <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                                            {item.Content}
                                        </p>

                                        <button
                                            onClick={() => setSelectedAnnouncement(item)}
                                            className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-widest group/btn"
                                        >
                                            Read Full Message
                                            <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {announcements.length > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 pb-8 border-t border-slate-100 pt-8">
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
                        </>
                    )}
                </div>
            </main>

            {/* Announcement Modal */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[50px] max-w-2xl w-full p-10 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setSelectedAnnouncement(null)}
                            className="absolute top-6 right-6 p-2 rounded-lg text-slate-400 hover:text-[#2B3674] hover:bg-slate-100 transition-all duration-200 active:scale-90"
                        >
                            <X size={20} />
                        </button>


                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-brand-blue p-4 rounded-3xl text-white shadow-lg shadow-blue-500/20">
                                <Megaphone size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#2B3674] leading-tight">
                                    {selectedAnnouncement.Title}
                                </h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                    Posted on {formatDate(selectedAnnouncement.CreatedAt)}
                                </p>
                            </div>
                        </div>

                        <div className="prose prose-slate max-w-none">
                            <p className="text-[#2B3674]/80 text-lg leading-relaxed whitespace-pre-wrap">
                                {selectedAnnouncement.Content}
                            </p>
                        </div>

                        {selectedAnnouncement.Deadline && (
                            <div className="mt-8 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Important Deadline</p>
                                    <p className="font-bold text-red-900">{formatDate(selectedAnnouncement.Deadline)}</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedAnnouncement(null)}
                            className="mt-10 w-full bg-[#111C44] text-white py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-brand-blue transition-all shadow-xl shadow-[#111C44]/20"
                        >
                            Close Announcement
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAnnouncements;
