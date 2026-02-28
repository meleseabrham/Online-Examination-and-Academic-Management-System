import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    FileText,
    Plus,
    Search,
    ArrowLeft,
    Loader,
    Download,
    Eye,
    Trash2,
    Calendar,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    MoreHorizontal
} from 'lucide-react';

interface Resource {
    AssignmentId: number;
    Title: string;
    Description: string;
    FilePath: string;
    CreatedAt: string;
    CourseName: string;
    GradeName: string;
    Section: string;
    Deadline: string;
}

const CourseResources = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [resources, setResources] = useState<Resource[]>([]);
    const [courseName, setCourseName] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const isAdmin = user?.role === 'Admin' || user?.role === 'admin';
    const role = isAdmin ? 'admin' : 'teacher';
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const rolePrefix = isAdmin ? 'admin' : 'teacher';
                // We reuse the assignments endpoint but filter by courseId
                const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/assignments?courseId=${courseId}`, { headers });
                setResources(res.data);
                if (res.data.length > 0) {
                    setCourseName(res.data[0].CourseName);
                }
            } catch (err) {
                console.error('Error fetching resources:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, [courseId]);

    const filteredResources = resources.filter(r =>
        r.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.Description && r.Description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredResources.length / perPage);
    const paginatedResources = filteredResources.slice((currentPage - 1) * perPage, currentPage * perPage);

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

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this resource?')) return;
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            await axios.delete(`http://localhost:5000/api/${rolePrefix}/assignments/${id}`, { headers });
            setResources(resources.filter(r => r.AssignmentId !== id));
        } catch (err) {
            alert('Failed to delete.');
        }
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <button
                                onClick={() => navigate(`/${role}/courses`)}
                                className="flex items-center gap-2 text-brand-blue font-bold text-xs uppercase tracking-widest mb-2 hover:translate-x-[-4px] transition-transform"
                            >
                                <ArrowLeft size={14} /> Back to Courses
                            </button>
                            <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">
                                {courseName || 'Course'} Resources
                            </h1>
                            <p className="text-slate-500 font-medium">Curriculum materials, reading files, and reference guides.</p>
                        </div>
                        <button
                            onClick={() => navigate(`/${role}/assignments`, { state: { courseId, focusForm: true } })}
                            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add New Resource
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-50 mb-8 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px] relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search resources by name or content..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader size={48} className="text-brand-blue animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Materials...</p>
                        </div>
                    ) : filteredResources.length === 0 ? (
                        <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <BookOpen size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-[#2B3674] mb-2">No Resources Yet</h2>
                            <p className="text-slate-400 font-medium mb-8 max-w-sm mx-auto">Upload curriculum files or study guides to help your students prepare.</p>
                            <button
                                onClick={() => navigate(`/${role}/assignments`)}
                                className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                Upload First Resource
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {paginatedResources.map((res) => (
                                    <div
                                        key={res.AssignmentId}
                                        className="bg-white p-6 rounded-[30px] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-brand-blue transition-all"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-[#2B3674] leading-tight">{res.Title}</h3>
                                                <div className="flex items-center gap-4 mt-1 text-slate-400 flex-wrap">
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
                                                        {res.GradeName}-{res.Section}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                                                        <Calendar size={12} />
                                                        Added {new Date(res.CreatedAt).toLocaleDateString()}
                                                    </div>
                                                    {res.Description && (
                                                        <span className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[300px]">
                                                            {res.Description}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {res.FilePath && (
                                                <>
                                                    <a
                                                        href={`http://localhost:5000/${res.FilePath}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-3 bg-slate-50 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                                                        title="View"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                    <a
                                                        href={`http://localhost:5000/${res.FilePath}`}
                                                        download
                                                        className="p-3 bg-brand-blue/5 text-brand-blue rounded-xl hover:bg-brand-blue hover:text-white transition-all shadow-sm"
                                                        title="Download"
                                                    >
                                                        <Download size={18} />
                                                    </a>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(res.AssignmentId)}
                                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {filteredResources.length > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 pb-8">
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
        </div>
    );
};

export default CourseResources;
