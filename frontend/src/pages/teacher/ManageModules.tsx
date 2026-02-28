import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Library,
    Plus,
    Search,
    Loader,
    Download,
    Eye,
    Trash2,
    Calendar,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    X,
    Upload,
    Link as LinkIcon,
    FileText,
    ExternalLink,
    Edit3,
    Clock,
    AlertCircle,
    Trophy
} from 'lucide-react';

interface Module {
    ModuleId: number;
    CourseId: number;
    ClassId: number | null;
    SemesterId: number;
    AcademicYearId: number;
    Title: string;
    Description: string;
    FileName: string | null;
    FilePath: string | null;
    ExternalLink: string | null;
    CreatedAt: string;
    CourseName: string;
    GradeName: string | null;
    Section: string | null;
    TeacherName: string;
    AcademicYearName: string;
    SemesterName: string;
}

interface AcademicFilter {
    id: number;
    name: string;
}

const ManageModules = () => {
    const location = useLocation();
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(location.state?.courseName || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');

    // Form State
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        courseId: '',
        classId: '',
        semesterId: '',
        academicYearId: '',
        externalLink: '',
        file: null as File | null
    });

    // Metadata for filters
    const [courses, setCourses] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<AcademicFilter[]>([]);
    const [years, setYears] = useState<AcademicFilter[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
        type: 'danger' | 'warning' | 'info' | 'success';
        isSingleButton?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info',
        isSingleButton: false
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const isAdmin = user?.role === 'Admin' || user?.role === 'admin';
    const role = isAdmin ? 'admin' : 'teacher';
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchMetadata();
        fetchModules();
    }, []);

    const fetchMetadata = async () => {
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            const [coursesRes, classesRes, semestersRes, yearsRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/${rolePrefix}/courses`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/classes`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/semesters`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/academic-years`, { headers })
            ]);
            setCourses(coursesRes.data);
            setClasses(classesRes.data);
            setSemesters(semestersRes.data.map((s: any) => ({ id: s.Id, name: s.Name, isActive: s.IsActive })));
            setYears(yearsRes.data.map((y: any) => ({ id: y.Id, name: `${y.Name} (${y.IsActive ? 'Active' : 'Previous'})`, isActive: y.IsActive })));
        } catch (err) {
            console.error('Error fetching metadata:', err);
        }
    };

    const fetchModules = async () => {
        setLoading(true);
        try {
            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/modules`, { headers });
            setModules(res.data);
        } catch (err) {
            console.error('Error fetching modules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (mod: Module | null = null) => {
        if (mod) {
            setEditingModule(mod);
            setUploadMode(mod.ExternalLink ? 'link' : 'file');
            setFormData({
                title: mod.Title,
                description: mod.Description || '',
                courseId: mod.CourseId.toString(),
                classId: mod.ClassId?.toString() || '',
                semesterId: mod.SemesterId.toString(),
                academicYearId: mod.AcademicYearId.toString(),
                externalLink: mod.ExternalLink || '',
                file: null
            });
        } else {
            // Find active year and active semester for defaults
            const activeYear = years.find((y: any) => y.isActive);
            const activeSem = semesters.find((s: any) => s.isActive);

            setEditingModule(null);
            setUploadMode('file');
            setFormData({
                title: '',
                description: '',
                courseId: '',
                classId: '',
                semesterId: activeSem ? activeSem.id.toString() : '',
                academicYearId: activeYear ? activeYear.id.toString() : '',
                externalLink: '',
                file: null
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('courseId', formData.courseId);
            if (formData.classId) data.append('classId', formData.classId);
            data.append('semesterId', formData.semesterId);
            data.append('academicYearId', formData.academicYearId);
            data.append('externalLink', formData.externalLink);
            if (formData.file) data.append('file', formData.file);


            const rolePrefix = isAdmin ? 'admin' : 'teacher';
            if (editingModule) {
                await axios.put(`http://localhost:5000/api/${rolePrefix}/modules/${editingModule.ModuleId}`, data, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post(`http://localhost:5000/api/${rolePrefix}/modules`, data, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
            }
            setIsModalOpen(false);
            fetchModules();
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: `Module ${editingModule ? 'updated' : 'created'} successfully!`,
                type: 'success',
                isSingleButton: true
            });
        } catch (err) {
            console.error('Error saving module:', err);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to save module. Please try again.',
                type: 'danger',
                isSingleButton: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Module',
            message: 'Are you sure you want to delete this module? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const rolePrefix = isAdmin ? 'admin' : 'teacher';
                    await axios.delete(`http://localhost:5000/api/${rolePrefix}/modules/${id}`, { headers });
                    setModules(modules.filter(m => m.ModuleId !== id));
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Module deleted successfully!',
                        type: 'success',
                        isSingleButton: true
                    });
                } catch (err) {
                    console.error('Error deleting module:', err);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to delete module.',
                        type: 'danger',
                        isSingleButton: true
                    });
                }
            }
        });
    };

    const filteredModules = modules.filter(m =>
        m.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.CourseName && m.CourseName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const paginatedModules = filteredModules.slice((currentPage - 1) * perPage, currentPage * perPage);
    const totalPages = Math.ceil(filteredModules.length / perPage);

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth lowercase-scroll">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-[#2B3674] tracking-tight flex items-center gap-3">
                                <Library className="text-brand-blue" size={32} />
                                Course Modules
                            </h1>
                            <p className="text-slate-500 font-medium">Manage and share curriculum resources with your students.</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Module
                        </button>
                    </div>

                    {/* Search & Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 group/stats">
                        <div className="lg:col-span-3">
                            <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-50 flex items-center gap-4 h-full">
                                <Search className="text-slate-400 ml-2" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search modules by title or course..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="flex-1 py-2 border-none focus:ring-0 font-medium text-slate-600 placeholder:text-slate-300"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="bg-brand-blue rounded-[24px] p-6 text-white shadow-xl shadow-blue-500/10 flex flex-col justify-center">
                            <span className="text-blue-100 text-xs font-black uppercase tracking-widest mb-1">Total Resources</span>
                            <span className="text-3xl font-black">{modules.length}</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader size={48} className="text-brand-blue animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Modules...</p>
                        </div>
                    ) : filteredModules.length === 0 ? (
                        <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Library size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-[#2B3674] mb-2">No Modules Shared</h2>
                            <p className="text-slate-400 font-medium mb-8 max-w-sm mx-auto">Upload curriculum documents, reading materials, or share video links with your classes.</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                Share Your First Resource
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {paginatedModules.map((mod) => (
                                <div
                                    key={mod.ModuleId}
                                    className="bg-white rounded-[32px] border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all p-6 relative group overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(mod)}
                                            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-400 hover:text-brand-blue transition-all"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(mod.ModuleId)}
                                            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-4 mb-4 pr-12">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-none">
                                            {mod.ExternalLink ? <LinkIcon size={24} /> : <FileText size={24} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#2B3674] line-clamp-2 leading-tight h-[40px]">{mod.Title}</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{mod.CourseName}</p>
                                        </div>
                                    </div>

                                    <div className="mb-6 h-[60px]">
                                        <p className="text-slate-500 text-sm font-medium line-clamp-3 leading-relaxed">
                                            {mod.Description || 'No description provided.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg text-slate-500 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                            <Calendar size={12} className="text-slate-400" />
                                            {new Date(mod.CreatedAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1 bg-brand-blue/5 px-3 py-1.5 rounded-lg text-brand-blue text-[10px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">
                                            <BookOpen size={12} className="text-brand-blue/60" />
                                            {mod.GradeName ? `${mod.GradeName}-${mod.Section}` : 'All Sections'}
                                        </div>
                                        <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg text-slate-500 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                            <Clock size={12} className="text-slate-400" />
                                            {mod.SemesterName}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {mod.FilePath && (
                                            <>
                                                <a
                                                    href={`http://localhost:5000/${mod.FilePath}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-2 bg-slate-50 py-3 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
                                                >
                                                    <Eye size={14} /> Preview
                                                </a>
                                                <a
                                                    href={`http://localhost:5000/${mod.FilePath}`}
                                                    download
                                                    className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
                                                >
                                                    <Download size={14} /> Download
                                                </a>
                                            </>
                                        )}
                                        {mod.ExternalLink && (
                                            <a
                                                href={mod.ExternalLink.startsWith('http') ? mod.ExternalLink : `https://${mod.ExternalLink}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
                                            >
                                                <ExternalLink size={14} /> Open Link
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!loading && filteredModules.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 gap-4 pb-8">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex items-center gap-1 mx-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${currentPage === p
                                                ? 'border-brand-blue text-brand-blue bg-brand-blue/5 shadow-sm'
                                                : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                                                    ? 'text-brand-blue bg-brand-blue/5'
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

            {/* Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0b1437]/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                            <div>
                                <h3 className="text-2xl font-black text-[#2B3674] tracking-tight">{editingModule ? 'Edit Module' : 'Add New Module'}</h3>
                                <p className="text-slate-400 font-medium text-sm">Upload files or share external resource links.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-[20px] text-slate-400 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Module Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Introduction to Calculus - Chapter 1"
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] placeholder:text-slate-300 transition-all"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Add context or instructions for your students..."
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] placeholder:text-slate-300 transition-all resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Academic Year</label>
                                    <select
                                        required
                                        value={formData.academicYearId}
                                        onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] transition-all"
                                    >
                                        <option value="">Select Year</option>
                                        {years.map(y => (
                                            <option key={y.id} value={y.id}>{y.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Semester</label>
                                    <select
                                        required
                                        value={formData.semesterId}
                                        onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] transition-all"
                                    >
                                        <option value="">Select Semester</option>
                                        {semesters.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Course</label>
                                    <select
                                        required
                                        value={formData.courseId}
                                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] transition-all"
                                    >
                                        <option value="">Select Course</option>
                                        {courses.map(c => (
                                            <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Class (Optional)</label>
                                    <select
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] transition-all"
                                    >
                                        <option value="">All Sections</option>
                                        {classes.map(c => (
                                            <option key={c.ClassId} value={c.ClassId}>{c.GradeName}-{c.Section}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Resource Type</label>
                                    <div className="p-1 rounded-2xl bg-slate-50 flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUploadMode('file');
                                                setFormData({ ...formData, externalLink: '' });
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${uploadMode === 'file' ? 'bg-white text-brand-blue shadow-sm shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <Upload size={16} /> File Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUploadMode('link');
                                                setFormData({ ...formData, file: null });
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${uploadMode === 'link' ? 'bg-white text-brand-blue shadow-sm shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <LinkIcon size={16} /> Web Link
                                        </button>
                                    </div>
                                </div>

                                {uploadMode === 'link' ? (
                                    <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">External Link (YouTube, Drive, etc.)</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                            <input
                                                type="url"
                                                required
                                                value={formData.externalLink}
                                                onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                className="w-full pl-14 pr-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-[#202540] transition-all"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Resource File</label>
                                        <div className="relative group/upload">
                                            <input
                                                type="file"
                                                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[24px] bg-slate-50/50 flex flex-col items-center justify-center group-hover/upload:border-brand-blue/30 group-hover/upload:bg-brand-blue/5 transition-all">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm text-brand-blue flex items-center justify-center mb-3 group-hover/upload:scale-110 transition-transform">
                                                    <Upload size={24} />
                                                </div>
                                                <span className="text-sm font-bold text-[#2B3674]">
                                                    {formData.file ? formData.file.name : (editingModule?.FileName ? 'Change: ' + editingModule.FileName : 'Click or drop file here')}
                                                </span>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">PDF, Video, DOCX, ZIP (MAX 20MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] py-4 rounded-2xl bg-brand-blue text-white font-black text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                                    {editingModule ? 'Save Changes' : 'Create Module'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0b1437]/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 max-w-md w-full p-10 animate-in zoom-in-95 duration-300">
                        <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center mb-8 mx-auto shadow-lg ${confirmModal.type === 'danger' ? 'bg-red-50 text-red-500 shadow-red-500/10' :
                            confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-500/10' :
                                confirmModal.type === 'success' ? 'bg-emerald-50 text-emerald-500 shadow-emerald-500/10' :
                                    'bg-brand-blue/5 text-brand-blue shadow-blue-500/10'
                            }`}>
                            {confirmModal.type === 'danger' ? <AlertCircle size={40} /> :
                                confirmModal.type === 'warning' ? <AlertCircle size={40} /> :
                                    confirmModal.type === 'success' ? <Trophy size={40} /> :
                                        <BookOpen size={40} />}
                        </div>

                        <h3 className="text-2xl font-black text-[#2B3674] text-center mb-4 leading-tight">
                            {confirmModal.title}
                        </h3>

                        <p className="text-slate-500 font-medium text-center mb-10 leading-relaxed">
                            {confirmModal.message}
                        </p>

                        <div className="flex flex-col gap-3">
                            {!confirmModal.isSingleButton ? (
                                <>
                                    <button
                                        onClick={() => confirmModal.onConfirm?.()}
                                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${confirmModal.type === 'danger' ? 'bg-red-500 shadow-red-500/20' :
                                            confirmModal.type === 'warning' ? 'bg-amber-500 shadow-amber-500/20' :
                                                'bg-brand-blue shadow-blue-500/20'
                                            }`}
                                    >
                                        Yes, Proceed
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${confirmModal.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                        confirmModal.type === 'danger' ? 'bg-red-500 shadow-red-500/20' :
                                            'bg-brand-blue shadow-blue-500/20'
                                        }`}
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageModules;
