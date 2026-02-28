import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Upload, FileText, CheckCircle, Loader, Trash2, X, Plus, Minus, Pencil, RotateCcw, Download, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';

interface Course { CourseId: number; CourseName: string; }
interface ClassItem { ClassId: number; GradeName: string; Section: string; }
interface Student { UserId: number; FullName: string; }
interface Submission {
    SubmissionId: number;
    StudentId: number;
    StudentName: string;
    StudentEmail: string;
    SubmissionFilePath: string;
    SubmissionDate: string;
    Score: number | null;
    Feedback: string | null;
    Status: string;
}
interface Semester { Id: number; Name: string; IsActive: boolean; }
interface Assignment {
    AssignmentId: number; Title: string; GradeName: string; Section: string;
    CourseName: string; Deadline: string; Points: number; FilePath: string;
    CreatedAt: string; Description?: string; ClassId: number; CourseId: number;
    SubmissionCount?: number; TotalStudents?: number;
    SemesterId?: number; SemesterName?: string;
    AssessmentId?: number;
}
interface Assessment {
    Id: number; Title: string; Type: string; TotalMarks: number;
    CourseId: number; GradeId: number; SemesterId: number; AcademicYearId: number;
    ClassId?: number | null;
}

const TeacherAssignments = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [form, setForm] = useState({
        title: '', courseId: '', classId: '', deadline: '', points: '100', description: '', semesterId: '',
        assessmentId: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [fetchingSubmissions, setFetchingSubmissions] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchSubmissions = async (assignmentId: number) => {
        setFetchingSubmissions(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/teacher/assignments/${assignmentId}/submissions`, { headers });
            setSubmissions(res.data);
        } catch (err) { console.error('Error fetching submissions:', err); }
        finally { setFetchingSubmissions(false); }
    };

    const handleExpandToggle = (id: number) => {
        if (expandedId === id) {
            setExpandedId(null);
            setSubmissions([]);
        } else {
            setExpandedId(id);
            fetchSubmissions(id);
        }
    };

    const fetchData = async () => {
        try {
            const [coursesRes, classesRes, assignmentsRes, semestersRes, assessmentsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/teacher/courses', { headers }),
                axios.get('http://localhost:5000/api/teacher/classes', { headers }),
                axios.get('http://localhost:5000/api/teacher/assignments', { headers }),
                axios.get('http://localhost:5000/api/teacher/semesters', { headers }),
                axios.get('http://localhost:5000/api/teacher/assessments', { headers }),
            ]);
            setCourses(coursesRes.data);
            setClasses(classesRes.data);
            setAssignments(assignmentsRes.data);
            setSemesters(semestersRes.data);
            setAssessments(assessmentsRes.data);

            // Auto-select active semester for new
            if (!editingId) {
                const active = semestersRes.data.find((s: Semester) => s.IsActive);
                if (active) setForm(prev => ({ ...prev, semesterId: String(active.Id) }));
            }
        } catch (err) { console.error(err); }
        finally { setFetching(false); }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (form.classId) {
            axios.get(`http://localhost:5000/api/teacher/classes/${form.classId}/students`, { headers })
                .then(res => setStudents(res.data))
                .catch(err => console.error(err));
        } else {
            setStudents([]);
            setSelectedStudents([]);
        }
    }, [form.classId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const toggleStudent = (id: number) => {
        if (selectedStudents.includes(id)) {
            setSelectedStudents(selectedStudents.filter(s => s !== id));
        } else {
            setSelectedStudents([...selectedStudents, id]);
        }
    };

    const handleEdit = (a: any) => {
        setEditingId(a.AssignmentId);
        setForm({
            title: a.Title,
            description: a.Description || '',
            classId: a.ClassId.toString(),
            courseId: a.CourseId.toString(),
            deadline: a.Deadline ? new Date(a.Deadline).toISOString().slice(0, 16) : '',
            points: a.Points.toString(),
            semesterId: a.SemesterId?.toString() || '',
            assessmentId: a.AssessmentId?.toString() || ''
        });
        setIsFormOpen(true);
        const container = document.getElementById('scrollable-body');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            title: '',
            courseId: '',
            classId: '',
            deadline: '',
            points: '100',
            description: '',
            semesterId: semesters.find(s => s.IsActive)?.Id.toString() || '',
            assessmentId: ''
        });
        setFile(null);
        setSelectedStudents([]);
    };

    const handleGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradingSubmission) return;
        setLoading(true);
        try {
            await axios.post(`http://localhost:5000/api/teacher/assignments/submissions/${gradingSubmission.SubmissionId}/grade`, {
                score: gradeForm.score,
                feedback: gradeForm.feedback
            }, { headers });

            setGradingSubmission(null);
            setGradeForm({ score: '', feedback: '' });
            if (expandedId) await fetchSubmissions(expandedId);
        } catch (err) {
            console.error('Error grading submission:', err);
            alert('Failed to submit grade.');
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.classId || !form.courseId) {
            setError('Please fill required fields.');
            return;
        }
        setLoading(true); setError(''); setSuccess(false);

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('classId', form.classId);
        formData.append('courseId', form.courseId);
        formData.append('deadline', form.deadline);
        formData.append('points', form.points);
        formData.append('semesterId', form.semesterId);
        if (form.assessmentId) formData.append('assessmentId', form.assessmentId);
        if (file) formData.append('file', file);

        try {
            if (editingId) {
                await axios.put(`http://localhost:5000/api/teacher/assignments/${editingId}`, formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('http://localhost:5000/api/teacher/assignments', formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
            }
            setSuccess(true);
            resetForm();
            await fetchData();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'post'} assignment.`);
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this assignment?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/teacher/assignments/${id}`, { headers });
            await fetchData();
        } catch (err) { alert('Failed to delete.'); }
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
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="teacher" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email || "teacher@example.com"} role="teacher" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-[#2B3674]">Assignments</h1>
                            <p className="text-slate-500 mt-1">Upload tasks and monitor student submissions.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Creation Panel */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
                                <div
                                    onClick={() => setIsFormOpen(!isFormOpen)}
                                    className={`p-8 cursor-pointer flex justify-between items-center transition-all ${isFormOpen ? 'border-b border-slate-100' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl transition-all ${isFormOpen ? 'bg-brand-blue text-white' : 'bg-slate-50 text-slate-400'}`}>
                                            {editingId ? <Pencil size={20} /> : <Upload size={20} />}
                                        </div>
                                        <h2 className="text-xl font-bold text-[#2B3674]">{editingId ? 'Edit Assignment' : 'Create New Assignment'}</h2>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {editingId && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); resetForm(); }}
                                                className="text-xs font-bold text-slate-400 hover:text-brand-blue flex items-center gap-1"
                                            >
                                                <RotateCcw size={14} /> Cancel Edit
                                            </button>
                                        )}
                                        {success && <span className="text-green-500 font-bold text-sm flex items-center gap-1"><CheckCircle size={16} /> Assignment {editingId ? 'Updated' : 'Posted'}!</span>}
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-all">
                                            {isFormOpen ? <Minus size={20} /> : <Plus size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {isFormOpen && (
                                    <div className="p-8 pb-10">

                                        {error && <div className="mb-4 text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

                                        <form onSubmit={handlePost} className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Assignment Title *</label>
                                                <input
                                                    type="text" value={form.title}
                                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                                    placeholder="e.g., Chapter 5 Exercises"
                                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Class *</label>
                                                    <select
                                                        value={form.classId}
                                                        onChange={e => setForm({ ...form, classId: e.target.value })}
                                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                                    >
                                                        <option value="">Select Class</option>
                                                        {classes.map(c => <option key={c.ClassId} value={c.ClassId}>{c.GradeName} - {c.Section}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Course *</label>
                                                    <select
                                                        value={form.courseId}
                                                        onChange={e => setForm({ ...form, courseId: e.target.value })}
                                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                                    >
                                                        <option value="">Select Course</option>
                                                        {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Semester *</label>
                                                    <select
                                                        value={form.semesterId}
                                                        onChange={e => setForm({ ...form, semesterId: e.target.value })}
                                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                                        required
                                                    >
                                                        <option value="">Select Semester</option>
                                                        {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name} {s.IsActive ? '(Active)' : ''}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Linked Assessment (Optional)</label>
                                                    <select
                                                        value={form.assessmentId}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val) {
                                                                const selected = assessments.find(a => String(a.Id) === String(val));
                                                                if (selected) {
                                                                    setForm(prev => ({ ...prev, assessmentId: val, points: selected.TotalMarks.toString() }));
                                                                }
                                                                return;
                                                            }
                                                            setForm(prev => ({ ...prev, assessmentId: '' }));
                                                        }}
                                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                                    >
                                                        <option value="">Independent Assignment</option>
                                                        {assessments
                                                            .filter(a => a.Type === 'Assignment' && (!form.courseId || String(a.CourseId) === String(form.courseId)))
                                                            .map(a => <option key={a.Id} value={a.Id}>{a.Title} ({a.TotalMarks} Marks)</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Deadline</label>
                                                    <input
                                                        type="datetime-local" value={form.deadline}
                                                        onChange={e => setForm({ ...form, deadline: e.target.value })}
                                                        className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Max Points</label>
                                                    <input
                                                        type="number" value={form.points}
                                                        onChange={e => setForm({ ...form, points: e.target.value })}
                                                        placeholder="100"
                                                        disabled={!!form.assessmentId}
                                                        className={`w-full px-5 py-3 rounded-xl border border-slate-100 outline-none transition-all font-medium ${form.assessmentId ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'bg-slate-50 focus:ring-2 focus:ring-brand-blue'}`}
                                                    />
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all group cursor-pointer ${file ? 'border-green-400 bg-green-50/30' : 'border-slate-200 bg-slate-50/50 hover:border-brand-blue'}`}
                                            >
                                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-all ${file ? 'bg-green-500 text-white' : 'bg-white text-brand-blue'}`}>
                                                    <Upload size={28} />
                                                </div>
                                                <h4 className="font-bold text-[#2B3674]">{file ? file.name : 'Upload Question File'}</h4>
                                                <p className="text-slate-400 text-sm mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, DOCX or Images up to 10MB'}</p>
                                                {file && <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-4 text-xs font-bold text-red-500 flex items-center gap-1 mx-auto bg-white px-3 py-1 rounded-lg border border-red-100 shadow-sm"><X size={12} /> Remove File</button>}
                                            </div>

                                            {students.length > 0 && (
                                                <div>
                                                    <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-4">Assign to Specific Students (Optional - Default All)</label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {students.map(s => (
                                                            <button
                                                                type="button" key={s.UserId}
                                                                onClick={() => toggleStudent(s.UserId)}
                                                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedStudents.includes(s.UserId)
                                                                    ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-500/20'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-brand-blue'
                                                                    }`}
                                                            >
                                                                {s.FullName}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2">Instructions / Description</label>
                                                <textarea
                                                    rows={3} value={form.description}
                                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                                    className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium resize-none"
                                                    placeholder="Add any additional notes here..."
                                                />
                                            </div>

                                            <button
                                                disabled={loading}
                                                className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Loader size={20} className="animate-spin" /> : (editingId ? <CheckCircle size={20} /> : <Upload size={20} />)}
                                                {loading ? (editingId ? 'Updating...' : 'Posting...') : (editingId ? 'Save Changes' : 'Post Assignment')}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* Assignments List */}
                            <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
                                <h2 className="text-xl font-bold text-[#2B3674] mb-6">Recent Assignments</h2>
                                {fetching ? (
                                    <div className="flex justify-center py-10"><Loader size={30} className="animate-spin text-brand-blue" /></div>
                                ) : assignments.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <FileText size={40} className="mx-auto mb-3" />
                                        <p className="font-medium text-slate-400">No assignments posted yet.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            {paginatedAssignments.map(a => (
                                                <div key={a.AssignmentId} className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden hover:border-brand-blue transition-all group">
                                                    <div
                                                        onClick={() => handleExpandToggle(a.AssignmentId)}
                                                        className="p-6 flex items-center justify-between cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-white p-3 rounded-xl text-brand-blue shadow-sm group-hover:shadow-md transition-all">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-[#2B3674]">{a.Title}</h4>
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {a.GradeName}-{a.Section} • {a.CourseName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right hidden md:block">
                                                                <p className="text-xs font-bold text-slate-400 uppercase">Deadline</p>
                                                                <p className="text-sm font-bold text-[#2B3674]">{a.Deadline ? new Date(a.Deadline).toLocaleDateString() : 'No deadline'}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEdit(a); }}
                                                                    className="p-2 text-slate-300 hover:text-brand-blue hover:bg-white rounded-xl transition-all"
                                                                    title="Edit"
                                                                >
                                                                    <Pencil size={18} />
                                                                </button>
                                                                {(!a.SubmissionCount || a.SubmissionCount === 0) && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(a.AssignmentId); }}
                                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
                                                                <div className={`ml-2 transition-transform duration-300 ${expandedId === a.AssignmentId ? 'rotate-180' : ''}`}>
                                                                    <Plus size={16} className="text-slate-300" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {expandedId === a.AssignmentId && (
                                                        <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-white/50">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                                <div className="bg-white p-4 rounded-xl border border-slate-50">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Points</p>
                                                                    <p className="font-bold text-brand-blue">{a.Points} Points</p>
                                                                </div>
                                                                <div className="bg-white p-4 rounded-xl border border-slate-50">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created At</p>
                                                                    <p className="font-bold text-[#2B3674]">{new Date(a.CreatedAt).toLocaleDateString()}</p>
                                                                </div>
                                                                <div className="bg-white p-4 rounded-xl border border-slate-50">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submissions</p>
                                                                    <p className="font-bold text-[#2B3674]">{a.SubmissionCount || 0} / {a.TotalStudents || 0}</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                {/* Submissions Section */}
                                                                <div>
                                                                    <h5 className="text-sm font-black text-[#2B3674] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                        <CheckCircle size={16} className="text-brand-blue" />
                                                                        Student Submissions
                                                                    </h5>

                                                                    {fetchingSubmissions ? (
                                                                        <div className="flex justify-center p-8"><Loader size={20} className="animate-spin text-brand-blue" /></div>
                                                                    ) : submissions.length === 0 ? (
                                                                        <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 italic text-slate-400 text-sm">
                                                                            No submissions received yet.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-3">
                                                                            {submissions.map(sub => (
                                                                                <div key={sub.SubmissionId} className="bg-white p-4 rounded-2xl border border-slate-50 flex items-center justify-between hover:shadow-md transition-all group/sub">
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-brand-blue font-bold">
                                                                                            {sub.StudentName.charAt(0)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="font-bold text-[#2B3674] text-sm">{sub.StudentName}</p>
                                                                                            <p className="text-[10px] text-slate-400 font-medium">Submitted on {new Date(sub.SubmissionDate).toLocaleString()}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-4">
                                                                                        {sub.Score !== null ? (
                                                                                            <div className="text-right mr-4">
                                                                                                <p className="text-xs font-black text-green-600">{sub.Score} / {a.Points}</p>
                                                                                                <p className="text-[9px] text-slate-400 uppercase font-black">Graded</p>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black rounded-lg uppercase mr-4">Pending</span>
                                                                                        )}
                                                                                        <a
                                                                                            href={`http://localhost:5000/${sub.SubmissionFilePath}`}
                                                                                            target="_blank" rel="noreferrer"
                                                                                            className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-all"
                                                                                            title="View Submission"
                                                                                        >
                                                                                            <ExternalLink size={18} />
                                                                                        </a>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setGradingSubmission(sub);
                                                                                                setGradeForm({ score: sub.Score?.toString() || '', feedback: sub.Feedback || '' });
                                                                                            }}
                                                                                            className="px-4 py-2 bg-slate-50 text-[#2B3674] rounded-xl text-xs font-bold hover:bg-brand-blue hover:text-white transition-all"
                                                                                        >
                                                                                            {sub.Score !== null ? 'Edit Grade' : 'Grade'}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Grading Panel */}
                                                                {gradingSubmission && (
                                                                    <div className="bg-brand-blue/5 p-6 rounded-[25px] border border-brand-blue/10 animate-in slide-in-from-top-4 duration-300">
                                                                        <div className="flex justify-between items-center mb-4">
                                                                            <h5 className="font-black text-brand-blue text-xs uppercase tracking-widest">
                                                                                Grading: {gradingSubmission.StudentName}
                                                                            </h5>
                                                                            <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                                                                        </div>
                                                                        <form onSubmit={handleGrade} className="space-y-4">
                                                                            <div className="flex gap-4">
                                                                                <div className="flex-1">
                                                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Score (Max {a.Points})</label>
                                                                                    <input
                                                                                        type="number" step="0.5" max={a.Points}
                                                                                        value={gradeForm.score}
                                                                                        onChange={e => setGradeForm({ ...gradeForm, score: e.target.value })}
                                                                                        className="w-full px-4 py-2 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-brand-blue font-bold text-sm"
                                                                                        placeholder="0.00" autoFocus
                                                                                    />
                                                                                </div>
                                                                                <div className="flex-[2]">
                                                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Feedback</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={gradeForm.feedback}
                                                                                        onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                                                                        className="w-full px-4 py-2 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-brand-blue font-medium text-sm"
                                                                                        placeholder="Good work! Well structured..."
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-end gap-2">
                                                                                <button
                                                                                    type="button" onClick={() => setGradingSubmission(null)}
                                                                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-[#2B3674]"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                                <button
                                                                                    type="submit"
                                                                                    className="px-6 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2"
                                                                                >
                                                                                    {loading ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                                                    Submit Grade
                                                                                </button>
                                                                            </div>
                                                                        </form>
                                                                    </div>
                                                                )}

                                                                <div className="h-px bg-slate-100"></div>

                                                                {a.Description && (
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions</p>
                                                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">{a.Description}</p>
                                                                    </div>
                                                                )}
                                                                {a.FilePath && (
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Attached File</p>
                                                                        <a
                                                                            href={`http://localhost:5000/${a.FilePath}`}
                                                                            target="_blank" rel="noreferrer"
                                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/5 text-brand-blue rounded-lg font-bold text-xs hover:bg-brand-blue hover:text-white transition-all"
                                                                        >
                                                                            <Download size={14} />
                                                                            Download Assignment File
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {assignments.length > 0 && (
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
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Stats/Quick Actions */}
                        <div className="space-y-8">
                            <div className="bg-gradient-to-br from-brand-blue to-indigo-600 p-8 rounded-[30px] text-white shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold mb-2">Grading Helper</h3>
                                    <p className="text-white/70 text-sm mb-6">Review pending submissions to keep your students updated on their progress.</p>
                                    <button
                                        onClick={() => {
                                            const firstPending = assignments.find(a => (a.SubmissionCount || 0) > 0);
                                            if (firstPending) handleExpandToggle(firstPending.AssignmentId);
                                        }}
                                        className="bg-white text-brand-blue px-6 py-2 rounded-xl font-bold text-xs hover:bg-blue-50 transition-all"
                                    >
                                        Start Grading
                                    </button>
                                </div>
                                <CheckCircle size={80} className="absolute -right-4 -bottom-4 text-white/10" />
                            </div>

                            <div className="bg-white p-8 rounded-[30px] border border-slate-100 shadow-sm">
                                <h3 className="font-bold text-[#2B3674] mb-6">Class Performance</h3>
                                <div className="space-y-6">
                                    {classes.map((c, i) => (
                                        <div key={c.ClassId}>
                                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase">
                                                <span>{c.GradeName}-{c.Section}</span>
                                                <span>{i === 0 ? '85%' : '62%'}</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-brand-blue' : 'bg-orange-400'}`}
                                                    style={{ width: i === 0 ? '85%' : '62%' }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                    {classes.length === 0 && <p className="text-slate-300 text-sm italic">No classes assigned yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherAssignments;
