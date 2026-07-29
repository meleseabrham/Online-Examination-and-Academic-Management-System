import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { BookOpen, Plus, Edit2, Trash2, X, Upload, ChevronDown, Search, FileText, Users, Loader } from 'lucide-react';

interface Guide {
    Id: number;
    Title: string;
    Description: string;
    Content: string;
    TargetRole: string;
    FileName: string | null;
    FilePath: string | null;
    AuthorName: string;
    CreatedAt: string;
}

const ManageGuides = () => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: 'admin@example.com', role: 'admin' };
    const headers = { Authorization: `Bearer ${token}` };

    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [targetRole, setTargetRole] = useState('All');
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchGuides(); }, []);

    const fetchGuides = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/admin/guides', { headers });
            setGuides(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateForm = () => {
        setEditingGuide(null);
        setTitle(''); setDescription(''); setContent(''); setTargetRole('All'); setFile(null);
        setShowForm(true);
    };

    const openEditForm = (guide: Guide) => {
        setEditingGuide(guide);
        setTitle(guide.Title);
        setDescription(guide.Description || '');
        setContent(guide.Content || '');
        setTargetRole(guide.TargetRole);
        setFile(null);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('content', content);
            formData.append('targetRole', targetRole);
            if (file) formData.append('file', file);

            if (editingGuide) {
                await axios.put(`http://localhost:5000/api/admin/guides/${editingGuide.Id}`, formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('http://localhost:5000/api/admin/guides', formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
            }
            setShowForm(false);
            fetchGuides();
        } catch (err) {
            console.error(err);
            alert('Error saving guide');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this guide?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/admin/guides/${id}`, { headers });
            fetchGuides();
        } catch (err) {
            console.error(err);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'Student': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Teacher': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'Director': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-green-50 text-green-600 border-green-100';
        }
    };

    const filteredGuides = guides.filter(g => {
        const matchesSearch = g.Title.toLowerCase().includes(searchTerm.toLowerCase()) || g.Description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || g.TargetRole === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden font-display">
            <Sidebar role="admin" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={user.email} role="admin" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">

                        <button
                            onClick={openCreateForm}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <Plus size={18} /> New Guide
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search guides..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative w-48">
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue appearance-none"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                <option value="All">General (All)</option>
                                <option value="Student">Student Only</option>
                                <option value="Teacher">Teacher Only</option>
                                <option value="Director">Director Only</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Guides Grid */}
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader className="animate-spin text-brand-blue" size={40} /></div>
                    ) : filteredGuides.length === 0 ? (
                        <div className="bg-white rounded-[30px] p-20 text-center border border-slate-100 shadow-sm">
                            <BookOpen className="mx-auto text-slate-200 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-[#2B3674] mb-1">No Guides Yet</h3>
                            <p className="text-slate-400 text-sm font-medium">Create your first system guide to help users navigate the platform.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredGuides.map(guide => (
                                <div key={guide.Id} className="bg-white rounded-[25px] p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                                            <BookOpen size={18} />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getRoleBadge(guide.TargetRole)}`}>
                                            {guide.TargetRole === 'All' ? 'Everyone' : guide.TargetRole}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-black text-[#2B3674] mb-2 group-hover:text-brand-blue transition-colors">{guide.Title}</h3>
                                    <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-2 mb-4">{guide.Description}</p>

                                    {guide.FileName && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-4 bg-slate-50 px-3 py-2 rounded-lg">
                                            <FileText size={12} />
                                            <span className="truncate">{guide.FileName}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <span className="text-[9px] font-bold text-slate-300">
                                            {new Date(guide.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditForm(guide)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-brand-blue hover:bg-blue-50 transition-all">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(guide.Id)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#2B3674]/40 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
                    <div className="bg-white w-full max-w-2xl rounded-[30px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="bg-[#F8FAFC] p-6 flex justify-between items-center sticky top-0 z-20">
                            <div>

                                <h3 className="text-xl font-black text-[#2B3674] tracking-tight">
                                    {editingGuide ? 'Update Guide' : 'Create System Guide'}
                                </h3>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Title */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="text-[13px] font-black text-[#2B3674]/80">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., How to Take an Exam"
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#2B3674] outline-none focus:ring-1 focus:ring-brand-blue"
                                />
                            </div>

                            {/* Target Audience */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="text-[13px] font-black text-[#2B3674]/80">
                                    Target Audience *
                                </label>
                                <div className="relative">
                                    <select
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#2B3674] outline-none focus:ring-1 focus:ring-brand-blue appearance-none"
                                    >
                                        <option value="All">All Users</option>
                                        <option value="Student">Students Only</option>
                                        <option value="Teacher">Teachers Only</option>
                                        <option value="Director">Directors Only</option>
                                    </select>
                                    <Users
                                        size={14}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                </div>
                            </div>

                            {/* Short Description */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="text-[13px] font-black text-[#2B3674]/80">
                                    Short Description
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief summary of this guide"
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#2B3674] outline-none focus:ring-1 focus:ring-brand-blue"
                                />
                            </div>

                            {/* Guide Content */}
                            <div className="grid grid-cols-[180px_1fr] items-start gap-4">
                                <label className="text-[13px] font-black text-[#2B3674]/80">
                                    Guide Content
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write detailed instructions here..."
                                    rows={6}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-[#2B3674] outline-none focus:ring-1 focus:ring-brand-blue resize-none"
                                />
                            </div>

                            {/* Attachment */}
                            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                <label className="text-[13px] font-black text-[#2B3674]/80">
                                    Attachment (Optional)
                                </label>

                                <div className="relative">
                                    <input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="guide-file"
                                    />

                                    <label
                                        htmlFor="guide-file"
                                        className="flex items-center gap-3 w-full p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 cursor-pointer hover:border-brand-blue hover:text-brand-blue transition-all"
                                    >
                                        <Upload size={16} />
                                        {file
                                            ? file.name
                                            : editingGuide?.FileName
                                                ? `Current: ${editingGuide.FileName}`
                                                : "Upload a PDF, DOCX, or image..."}
                                    </label>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-[#2B3674] hover:bg-slate-50 transition-all text-sm"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-brand-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader size={16} className="animate-spin" />}
                                    {editingGuide ? "Update Guide" : "Create Guide"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageGuides;
