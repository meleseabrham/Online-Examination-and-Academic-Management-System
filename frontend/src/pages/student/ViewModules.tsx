import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Library,
    Search,
    Loader,
    Download,
    Eye,
    Calendar,
    Link as LinkIcon,
    FileText,
    ExternalLink,
    X,
    User,
    Clock
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

const ViewModules = () => {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

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

            // Default to active semester if none selected
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

    const fetchModules = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.ayId) params.append('ayId', filters.ayId);
            if (filters.semesterId) params.append('semesterId', filters.semesterId);
            if (filters.gradeId) params.append('gradeId', filters.gradeId);
            if (filters.courseId) params.append('courseId', filters.courseId);
            if (filters.section) params.append('section', filters.section);

            const res = await axios.get(`http://localhost:5000/api/student/modules?${params.toString()}`, { headers });
            setModules(res.data);
        } catch (err) {
            console.error('Error fetching modules:', err);
        } finally {
            setLoading(false);
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
        fetchModules();
    }, [filters]);

    const filteredModules = modules.filter(m => {
        const matchesSearch = m.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.Description && m.Description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role={user.role?.toLowerCase() || 'student'} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-20">
                    <Header email={user.email} role={user.role?.toLowerCase() || 'student'} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth lowercase-scroll">


                    {/* Filters */}
                    <div className="flex flex-col gap-4 mb-8">
                        {/* Search Bar */}
                        <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <Search className="text-slate-400 ml-4" size={20} />
                            <input
                                type="text"
                                placeholder="Search modules by title or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 py-4 border-none focus:ring-0 font-bold text-slate-600 placeholder:text-slate-300 bg-transparent"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 mr-2 transition-colors">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-2 bg-white/50 p-2 rounded-3xl border border-slate-200">
                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.ayId}
                                onChange={(e) => setFilters({ ...filters, ayId: e.target.value, semesterId: '' })}
                            >
                                <option value="">Academic Year</option>
                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer disabled:opacity-50"
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
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer disabled:opacity-50"
                                value={filters.section}
                                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                                disabled={!filters.gradeId || !filters.ayId}
                            >
                                <option value="">Section (Opt)</option>
                                {sections.map(s => <option key={s.Id} value={s.Name}>{s.Name}</option>)}
                            </select>

                            <select
                                className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2B3674] outline-none focus:border-brand-blue transition-all hover:border-brand-blue cursor-pointer"
                                value={filters.courseId}
                                onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                            >
                                <option value="">Course</option>
                                {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                            </select>

                            <button
                                onClick={() => setFilters({ ayId: '', semesterId: '', gradeId: '', courseId: '', section: '' })}
                                className="ml-auto bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="relative">
                                <Loader size={64} className="text-brand-blue animate-spin" />
                                <Library className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-blue/40" size={24} />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mt-6">Loading Resources...</p>
                        </div>
                    ) : filteredModules.length === 0 ? (
                        <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100 max-w-4xl mx-auto">
                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Library size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-[#2B3674] mb-2">No Resources Found</h2>
                            <p className="text-slate-400 font-medium mb-0">Either your teachers haven't uploaded any modules yet, or no resources match your search criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filteredModules.map((mod) => (
                                <div
                                    key={mod.ModuleId}
                                    className="bg-white rounded-[40px] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all p-8 flex flex-col group"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-16 h-16 rounded-[24px] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            {mod.ExternalLink ? <LinkIcon size={32} /> : <FileText size={32} />}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="bg-brand-blue/5 text-brand-blue px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                {mod.CourseName}
                                            </div>
                                            <div className="bg-slate-50 text-slate-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={10} />
                                                {mod.SemesterName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-[#2B3674] leading-tight mb-3 group-hover:text-brand-blue transition-colors">
                                            {mod.Title}
                                        </h3>
                                        <p className="text-slate-500 font-medium text-sm line-clamp-3 leading-relaxed mb-6">
                                            {mod.Description || 'Study materials and resources for this module.'}
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-slate-50 mt-auto">
                                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <User size={14} className="text-slate-300" />
                                                <span>{mod.TeacherName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar size={14} className="text-slate-300" />
                                                <span>{new Date(mod.CreatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {mod.FilePath && (
                                                <>
                                                    <a
                                                        href={`http://localhost:5000/${mod.FilePath}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-50 py-4 rounded-2xl text-slate-600 font-black text-xs hover:bg-slate-100 transition-all"
                                                    >
                                                        <Eye size={16} /> Preview
                                                    </a>
                                                    <a
                                                        href={`http://localhost:5000/${mod.FilePath}`}
                                                        download
                                                        className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white py-4 rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
                                                    >
                                                        <Download size={16} /> Download
                                                    </a>
                                                </>
                                            )}
                                            {mod.ExternalLink && (
                                                <a
                                                    href={mod.ExternalLink.startsWith('http') ? mod.ExternalLink : `https://${mod.ExternalLink}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-full flex items-center justify-center gap-3 bg-brand-blue text-white py-4 rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
                                                >
                                                    <ExternalLink size={18} /> Open Resource
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ViewModules;
