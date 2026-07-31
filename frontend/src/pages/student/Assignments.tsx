import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getImageUrl } from '../../utils/imageUrl';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    FileText,
    Upload,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader,
    X,
    Download,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Assignment {
    AssignmentId: number;
    Title: string;
    Description: string;
    GradeName: string;
    Section: string;
    CourseName: string;
    TeacherName: string;
    Deadline: string;
    Points: number;
    FilePath: string;
    SubmissionId?: number;
    SubmissionFilePath?: string;
    SubmissionDate?: string;
    StudentScore?: number;
    Feedback?: string;
    SubmissionStatus?: string;
}

const StudentAssignments = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [fetching, setFetching] = useState(true);
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Filter Metadata
    const [years, setYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    const [filters, setFilters] = useState({
        ayId: '',
        semesterId: '',
        gradeId: '',
        courseId: '',
        section: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMetadata = async () => {
        try {
            const [yRes, gRes, cRes] = await Promise.all([
                axios.get('http://localhost:5000/api/student/academic-years', { headers }),
                axios.get('http://localhost:5000/api/student/grades', { headers }),
                axios.get('http://localhost:5000/api/student/courses/my', { headers })
            ]);
            setYears(yRes.data);
            setGrades(gRes.data);
            setCourses(cRes.data);

            // Default to active year
            const activeYear = yRes.data.find((y: any) => y.IsActive);
            if (activeYear) {
                setFilters(prev => ({ ...prev, ayId: activeYear.Id.toString() }));
            }
        } catch (err) {
            console.error('Metadata fetch error:', err);
        }
    };

    const fetchSemesters = async (ayId: string) => {
        if (!ayId) {
            setSemesters([]);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/student/semesters?academicYearId=${ayId}`, { headers });
            setSemesters(res.data);

            // Default to active semester
            if (!filters.semesterId) {
                const activeSem = res.data.find((s: any) => s.IsActive);
                if (activeSem) {
                    setFilters(prev => ({ ...prev, semesterId: activeSem.Id.toString() }));
                }
            }
        } catch (err) {
            console.error('Semesters fetch error:', err);
        }
    };

    const fetchSections = async (gradeId: string, ayId: string) => {
        if (!gradeId || !ayId) {
            setSections([]);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/student/sections?gradeId=${gradeId}&academicYearId=${ayId}`, { headers });
            setSections(res.data);
        } catch (err) {
            console.error('Sections fetch error:', err);
        }
    };

    const fetchData = async () => {
        try {
            setFetching(true);
            const params = new URLSearchParams();
            if (filters.ayId) params.append('ayId', filters.ayId);
            if (filters.semesterId) params.append('semesterId', filters.semesterId);
            if (filters.gradeId) params.append('gradeId', filters.gradeId);
            if (filters.courseId) params.append('courseId', filters.courseId);
            if (filters.section) params.append('section', filters.section);

            const res = await axios.get(`http://localhost:5000/api/student/assignments?${params.toString()}`, { headers });
            setAssignments(res.data);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        if (filters.ayId) fetchSemesters(filters.ayId);
        if (filters.ayId && filters.gradeId) fetchSections(filters.gradeId, filters.ayId);
    }, [filters.ayId, filters.gradeId]);

    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, [filters]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (assignmentId: number) => {
        if (!selectedFile) return;
        setSubmitting(assignmentId);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('assignmentId', assignmentId.toString());
        formData.append('file', selectedFile);

        try {
            await axios.post('http://localhost:5000/api/student/assignments/submit', formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });
            setSuccess('Assignment submitted successfully!');
            setSelectedFile(null);
            setActiveSubmissionId(null);
            await fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit assignment.');
        } finally {
            setSubmitting(null);
        }
    };

    const getStatusColor = (status: string | undefined, deadline: string) => {
        if (status === 'Graded') return 'bg-green-50 text-green-600 border-green-100';
        if (status === 'Submitted') return 'bg-blue-50 text-blue-600 border-blue-100';

        const isPast = new Date(deadline) < new Date();
        if (isPast) return 'bg-red-50 text-red-600 border-red-100';

        return 'bg-brand-background text-brand-blue border-brand-blue/10';
    };

    // Pagination logic
    const totalPages = Math.ceil(assignments.length / perPage);
    const paginatedAssignments = assignments.slice((currentPage - 1) * perPage, currentPage * perPage);

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
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden font-display">
            <Sidebar role="student" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-20">
                    <Header email={user.email || "student@example.com"} role="student" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">


                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-2 bg-white/50 p-2 rounded-3xl border border-slate-200">
                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.ayId}
                                onChange={(e) => setFilters({ ...filters, ayId: e.target.value, semesterId: '', section: '' })}
                            >
                                <option value="">Year</option>
                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.semesterId}
                                onChange={(e) => setFilters({ ...filters, semesterId: e.target.value })}
                                disabled={!filters.ayId}
                            >
                                <option value="">Semester</option>
                                {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.gradeId}
                                onChange={(e) => setFilters({ ...filters, gradeId: e.target.value, section: '' })}
                            >
                                <option value="">Grade</option>
                                {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.courseId}
                                onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                            >
                                <option value="">Course</option>
                                {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.section}
                                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                                disabled={!filters.gradeId || !filters.ayId}
                            >
                                <option value="">Section</option>
                                {sections.map(s => <option key={s.Id} value={s.Name}>{s.Name}</option>)}
                            </select>

                            <button
                                onClick={() => setFilters({ ayId: '', semesterId: '', gradeId: '', courseId: '', section: '' })}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 cursor-pointer"
                                title="Clear Filters"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {success && (
                        <div className="mb-6 p-4 bg-green-500 text-white rounded-2xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            <CheckCircle size={20} /> {success}
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-500 text-white rounded-2xl font-bold flex items-center gap-3 underline-offset-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <AlertCircle size={20} /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {fetching ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100">
                                    <Loader size={40} className="animate-spin text-brand-blue mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Assignments...</p>
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100 text-center px-10">
                                    <FileText size={60} className="text-slate-200 mb-6" />
                                    <h3 className="text-xl font-bold text-[#2B3674]">No Assignments Found</h3>
                                    <p className="text-slate-400 max-w-xs mt-2">Looks like you're all caught up! Check back later for new tasks from your teachers.</p>
                                </div>
                            ) : (
                                <>
                                    {paginatedAssignments.map(a => (
                                        <div key={a.AssignmentId} className={`bg-white rounded-[40px] shadow-sm border overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 group ${expandedId === a.AssignmentId ? 'border-brand-blue/30 ring-4 ring-brand-blue/5' : 'border-slate-100'}`}>
                                            <div
                                                className={`p-8 ${expandedId !== a.AssignmentId ? 'cursor-pointer hover:bg-slate-50/50 transition-colors' : ''}`}
                                                onClick={() => {
                                                    if (expandedId === a.AssignmentId) {
                                                        setExpandedId(null);
                                                        setActiveSubmissionId(null);
                                                    } else {
                                                        setExpandedId(a.AssignmentId);
                                                    }
                                                }}
                                            >
                                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                                    <div className="flex items-start gap-6">
                                                        <div className={`p-3 rounded-3xl border-2 transition-all duration-300 ${getStatusColor(a.SubmissionStatus, a.Deadline)}`}>
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-3 py-1 rounded-full uppercase tracking-tighter">{a.CourseName}</span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">By {a.TeacherName}</span>
                                                            </div>
                                                            <h3 className="text-2xl font-black text-[#2B3674] group-hover:text-brand-blue transition-all leading-tight">{a.Title}</h3>

                                                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                                                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                                                    <Clock size={16} className="text-brand-blue" />
                                                                    <span>Deadline: {new Date(a.Deadline).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                                                    <ShieldCheck size={16} className="text-green-500" />
                                                                    <span>{a.Points} Points</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 self-end md:self-center">
                                                        {a.SubmissionStatus === 'Graded' ? (
                                                            <div className="bg-green-500 p-2 rounded-[12px] text-white text-center min-w-[70px] shadow-lg shadow-green-500/20">
                                                                <p className="text-xl font-black">{a.StudentScore}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Score</p>
                                                            </div>
                                                        ) : a.SubmissionStatus === 'Submitted' ? (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <span className="flex items-center gap-2 bg-blue-50 text-brand-blue px-6 py-3 rounded-2xl font-black text-sm border border-blue-100">
                                                                    <CheckCircle size={18} />
                                                                    Submitted
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedId(a.AssignmentId);
                                                                        setActiveSubmissionId(a.AssignmentId);
                                                                    }}
                                                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-blue transition-all"
                                                                >
                                                                    Resubmit?
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedId(a.AssignmentId);
                                                                    setActiveSubmissionId(a.AssignmentId);
                                                                }}
                                                                className="bg-brand-blue text-white px-8 py-4 rounded-[24px] font-black shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-105 transition-all flex items-center gap-3 active:scale-95 z-10"
                                                            >
                                                                <Upload size={20} />
                                                                Submit Work
                                                            </button>
                                                        )}

                                                        <div className={`p-3 rounded-2xl transition-all flex items-center justify-center ${expandedId === a.AssignmentId ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-brand-blue'}`}>
                                                            <ChevronDown size={24} className={`transition-transform duration-300 ${expandedId === a.AssignmentId ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {expandedId === a.AssignmentId && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-8">
                                                                {(a.Description || a.FilePath || a.SubmissionFilePath) && (
                                                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100/50">
                                                                        {a.Description && (
                                                                            <div className="mb-6">
                                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions</p>
                                                                                <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap text-sm">{a.Description}</p>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex flex-wrap gap-3 mt-4">
                                                                            {a.FilePath && (
                                                                                <a
                                                                                    href={(getImageUrl(a.FilePath) ?? `#`)}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-brand-blue font-black text-[10px] uppercase tracking-wider hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all shadow-sm"
                                                                                >
                                                                                    <Download size={14} />
                                                                                    Reference File
                                                                                </a>
                                                                            )}
                                                                            {a.SubmissionFilePath && (
                                                                                <a
                                                                                    href={(getImageUrl(a.SubmissionFilePath) ?? `#`)}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-green-600 font-black text-[10px] uppercase tracking-wider hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-sm"
                                                                                >
                                                                                    <FileText size={14} />
                                                                                    My Submission
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {activeSubmissionId === a.AssignmentId && (
                                                                    <div className="mt-8 p-8 border-2 border-brand-blue border-dashed rounded-[32px] bg-brand-blue/[0.02]">
                                                                        <div className="flex justify-between items-center mb-6">
                                                                            <h4 className="font-black text-[#2B3674] uppercase tracking-widest text-sm flex items-center gap-2">
                                                                                <Upload size={18} className="text-brand-blue" />
                                                                                Upload Submission
                                                                            </h4>
                                                                            <button onClick={() => setActiveSubmissionId(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                                                                <X size={20} />
                                                                            </button>
                                                                        </div>

                                                                        <div
                                                                            onClick={() => fileInputRef.current?.click()}
                                                                            className={`p-10 border-2 border-dashed rounded-[24px] text-center cursor-pointer transition-all ${selectedFile ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-brand-blue hover:bg-white bg-white/50'}`}
                                                                        >
                                                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transition-all ${selectedFile ? 'bg-green-500 text-white' : 'bg-brand-blue text-white'}`}>
                                                                                <Upload size={24} />
                                                                            </div>
                                                                            <p className={`font-black uppercase tracking-widest text-xs ${selectedFile ? 'text-green-600' : 'text-[#2B3674]'}`}>
                                                                                {selectedFile ? selectedFile.name : 'Click to select or drag your file here'}
                                                                            </p>
                                                                            <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase">PDF, ZIP, or DOCX (Max 10MB)</p>
                                                                        </div>

                                                                        {selectedFile && (
                                                                            <button
                                                                                disabled={submitting === a.AssignmentId}
                                                                                onClick={() => handleSubmit(a.AssignmentId)}
                                                                                className="w-full mt-6 bg-brand-blue text-white py-4 rounded-[20px] font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                                            >
                                                                                {submitting === a.AssignmentId ? <Loader size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                                                                {submitting === a.AssignmentId ? 'Uploading...' : 'Confirm Submission'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {a.Feedback && (
                                                                    <div className="mt-8 p-6 bg-green-50/50 rounded-[32px] border border-green-100 border-dashed">
                                                                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                            <ShieldCheck size={14} /> Teacher Feedback
                                                                        </p>
                                                                        <p className="text-slate-600 font-bold leading-relaxed text-sm italic">"{a.Feedback}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination */}
                                    {assignments.length > 0 && (
                                        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 pb-8">
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

                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="font-black text-[#2B3674] mb-8 uppercase tracking-widest text-sm flex items-center gap-2">
                                        <Clock size={18} className="text-brand-blue" /> Summary
                                    </h3>
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shadow-sm border border-green-100">
                                                    <CheckCircle size={22} />
                                                </div>
                                                <span className="text-sm font-black text-slate-500 uppercase tracking-tighter">Completed</span>
                                            </div>
                                            <span className="text-2xl font-black text-[#2B3674]">{assignments.filter(a => a.SubmissionStatus).length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-sm border border-orange-100">
                                                    <Clock size={22} />
                                                </div>
                                                <span className="text-sm font-black text-slate-500 uppercase tracking-tighter">Pending</span>
                                            </div>
                                            <span className="text-2xl font-black text-[#2B3674]">{assignments.filter(a => !a.SubmissionStatus).length}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-blue/5 rounded-full"></div>
                            </div>

                            <div className="bg-gradient-to-br from-[#111C44] to-[#1B254B] p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/5">
                                <div className="relative z-10">

                                    {/* Header (Icon + Title in One Line) */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                                            <ShieldCheck size={24} className="text-brand-blue" />
                                        </div>

                                        <h3 className="text-2xl font-black leading-tight">
                                            Pro Tip
                                        </h3>
                                    </div>

                                    {/* Description */}
                                    <p className="text-white/60 text-sm font-semibold leading-relaxed mb-6">
                                        Double-check your file before uploading. Ensure it's the final version and clearly labeled with your name and assignment title.
                                    </p>

                                    {/* Progress Accent Bar */}
                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-blue w-1/3 rounded-full shadow-[0_0_12px_rgba(66,133,244,0.6)]"></div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentAssignments;
