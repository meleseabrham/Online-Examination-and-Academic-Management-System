import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Trophy,
    Medal,
    ChevronRight,
    School,
    TrendingUp,
    Search as SearchIcon,
    Award,
    BookOpen,
    ChevronLeft,
    ChevronDown,
    ArrowUpRight,
    RefreshCw
} from 'lucide-react';

interface StudentRanking {
    StudentId: number;
    StudentName: string;
    StudentEmail: string;
    FinalAverage: number;
    ClassRank: number;
    GradeRank: number;
    SchoolRank: number;
    GradeNumber: number;
    SectionName: string;
}

interface Semester { Id: number; Name: string; IsActive: boolean; AcademicYearId: number; }
interface AcademicYear { Id: number; Name: string; IsActive: boolean; }
interface Grade { Id: number; GradeNumber: number; }
interface Section { Id: number; Name: string; GradeId: number; }

const ClassRankings = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const isAdmin = (user?.role === 'Admin' || user?.role === 'admin' || user?.role === 'Director');
    const headers = { Authorization: `Bearer ${token}` };
    const navigate = useNavigate();

    // Filter States
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [selectedAY, setSelectedAY] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [rankingLevel, setRankingLevel] = useState<'class' | 'grade' | 'school'>('class');

    const [rankings, setRankings] = useState<StudentRanking[]>([]);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [perPageOpen, setPerPageOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [yearsRes, gradesRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/director/academic-years`, { headers }),
                axios.get(`http://localhost:5000/api/director/grades`, { headers })
            ]);
            setYears(yearsRes.data);
            setGrades(gradesRes.data);

            const activeYear = yearsRes.data.find((y: any) => y.IsActive);
            if (activeYear) {
                setSelectedAY(String(activeYear.Id));
                // Fetch semesters for active year
                const semRes = await axios.get(`http://localhost:5000/api/director/semesters?academicYearId=${activeYear.Id}`, { headers });
                setSemesters(semRes.data);
                const activeSem = semRes.data.find((s: any) => s.IsActive);
                if (activeSem) {
                    setSelectedSemester(String(activeSem.Id));
                }
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    useEffect(() => {
        if (selectedAY) {
            fetchSemesters(parseInt(selectedAY));
        }
    }, [selectedAY]);

    const fetchSemesters = async (ayId: number) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/director/semesters?academicYearId=${ayId}`, { headers });
            setSemesters(res.data);
            // Only auto-select if we don't have a semester selected or if the current one isn't in the new list
            const activeSem = res.data.find((s: any) => s.IsActive);
            if (activeSem) {
                setSelectedSemester(String(activeSem.Id));
            } else if (res.data.length > 0) {
                // Don't auto-select first one if we want full year to be an option
                // setSelectedSemester(''); // default to full year
            }
        } catch (err) {
            console.error('Error fetching semesters:', err);
        }
    };

    useEffect(() => {
        if (selectedGrade) {
            fetchSections(parseInt(selectedGrade));
        } else {
            setSections([]);
            setSelectedSection('');
        }
    }, [selectedGrade]);

    const fetchSections = async (gradeId: number) => {
        try {
            const url = isAdmin
                ? `http://localhost:5000/api/director/sections?gradeId=${gradeId}${selectedAY ? `&academicYearId=${selectedAY}` : ''}`
                : `http://localhost:5000/api/teacher/classes?academicYearId=${selectedAY}`;
            const res = await axios.get(url, { headers });
            if (isAdmin) {
                // Unique by name to avoid duplicates if same section exists in legacy data or other edge cases
                const uniqueSections: Section[] = [];
                const seenNames = new Set();
                res.data.forEach((s: any) => {
                    if (!seenNames.has(s.Name)) {
                        seenNames.add(s.Name);
                        uniqueSections.push(s);
                    }
                });
                setSections(uniqueSections);
            } else {
                // Filter teacher classes by selected grade
                const filtered = res.data
                    .filter((c: any) => String(c.GradeId || '') === String(selectedGrade))
                    .map((c: any) => ({ Id: c.ClassId, Name: c.Section }));
                setSections(filtered);
            }
        } catch (err) {
            console.error('Error fetching sections:', err);
        }
    };

    const fetchRankings = async () => {
        if (!selectedAY) return;
        setLoading(true);
        try {
            const isSemester = selectedSemester && selectedSemester !== 'full-year';
            const endpoint = isSemester
                ? '/api/director/semester-rankings'
                : '/api/director/rankings';

            const params: any = { academicYearId: selectedAY };
            if (isSemester) params.semesterId = selectedSemester;

            if (rankingLevel === 'grade' && selectedGrade) params.gradeId = selectedGrade;
            if (rankingLevel === 'class' && selectedGrade && selectedSection) {
                params.gradeId = selectedGrade;
                params.sectionId = selectedSection;
            }

            const res = await axios.get(`http://localhost:5000${endpoint}`, { headers, params });
            // Map Average to FinalAverage for consistency in UI display
            const mappedData = res.data.map((r: any) => ({
                ...r,
                FinalAverage: r.FinalAverage ?? r.Average ?? 0
            }));
            setRankings(mappedData);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error fetching rankings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRankings();
    }, [selectedAY, selectedSemester, selectedGrade, selectedSection, rankingLevel]);

    const handleTriggerCalculation = async () => {
        if (!selectedAY) return;
        setCalculating(true);
        try {
            await axios.post('http://localhost:5000/api/director/calculate-final-rankings', { academicYearId: selectedAY }, { headers });
            fetchRankings();
        } catch (err) {
            console.error('Error calculating rankings:', err);
        } finally {
            setCalculating(false);
        }
    };

    const filteredRankings = rankings.filter(r =>
        r.StudentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.StudentEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Podium is always the top 3 from the filtered results
    const podiumRankings = filteredRankings.slice(0, 3);

    // Pagination logic for ALL filtered students
    const totalPages = Math.ceil(filteredRankings.length / perPage);
    const paginatedRankings = filteredRankings.slice((currentPage - 1) * perPage, currentPage * perPage);

    const getRankValue = (r: StudentRanking) => {
        if (rankingLevel === 'class') return r.ClassRank;
        if (rankingLevel === 'grade') return r.GradeRank;
        return r.SchoolRank;
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'bg-amber-100 text-amber-600 border-amber-200';
        if (rank === 2) return 'bg-slate-100 text-slate-500 border-slate-200';
        if (rank === 3) return 'bg-orange-100 text-orange-600 border-orange-200';
        return 'bg-white text-slate-400 border-slate-100';
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy size={20} className="text-amber-500" />;
        if (rank === 2) return <Medal size={20} className="text-slate-400" />;
        if (rank === 3) return <Award size={20} className="text-orange-400" />;
        return <span className="text-xs font-black">{rank}</span>;
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="director" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user?.email || ''} role="director" />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Hero Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-brand-blue/10 text-brand-blue rounded-xl">
                                    <Trophy size={20} />
                                </div>
                                <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">Academic Rankings</h1>
                            </div>
                            <p className="text-slate-500 font-medium">
                                {selectedSemester && selectedSemester !== 'full-year'
                                    ? `Verified performance standings for ${semesters.find(s => String(s.Id) === selectedSemester)?.Name || 'Selected Semester'}.`
                                    : 'Verified final year performance standings and honorary positions.'}
                            </p>
                        </div>

                        {isAdmin && (
                            <button
                                onClick={handleTriggerCalculation}
                                disabled={calculating || !selectedAY}
                                className="flex items-center gap-2 px-6 py-3.5 bg-[#2B3674] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {calculating ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                                {calculating ? 'Processing...' : 'Recalculate Rankings'}
                            </button>
                        )}
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                                <div className="relative">
                                    <select
                                        value={selectedAY}
                                        onChange={(e) => setSelectedAY(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-[#2B3674] outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Year</option>
                                        {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                                <div className="relative">
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-[#2B3674] outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="full-year">Full Year</option>
                                        {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ranking Level</label>
                                <div className="flex bg-slate-50 p-1 rounded-2xl">
                                    {(['class', 'grade', 'school'] as const)
                                        .filter(level => isAdmin || level !== 'school')
                                        .map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setRankingLevel(level)}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${rankingLevel === level ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-[#2B3674]'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                </div>
                            </div>

                            {rankingLevel !== 'school' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
                                    <div className="relative">
                                        <select
                                            value={selectedGrade}
                                            onChange={(e) => setSelectedGrade(e.target.value)}
                                            className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-[#2B3674] outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">All Grades</option>
                                            {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {rankingLevel === 'class' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                                    <div className="relative">
                                        <select
                                            value={selectedSection}
                                            onChange={(e) => setSelectedSection(e.target.value)}
                                            disabled={!selectedGrade}
                                            className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-[#2B3674] outline-none appearance-none cursor-pointer disabled:opacity-50"
                                        >
                                            <option value="">All Sections</option>
                                            {sections.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-full lg:col-span-1 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search</label>
                                <div className="relative">
                                    <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Student name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-[#2B3674] outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin"></div>
                                <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-blue" size={24} />
                            </div>
                            <p className="mt-6 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Retrieving Hall of Fame...</p>
                        </div>
                    ) : rankings.length === 0 ? (
                        <div className="bg-white rounded-[50px] p-24 text-center border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>
                            <Trophy size={80} className="mx-auto text-slate-100 mb-8" />
                            <h3 className="text-2xl font-black text-[#2B3674] mb-3">No Results Found</h3>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                                Adjust your filters or ensure that final averages have been calculated for the selected academic year.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-12">
                            {/* Podium (Top 3) */}
                            <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {podiumRankings.map((student, idx) => {
                                    const rank = getRankValue(student);
                                    return (
                                        <div key={student.StudentId} className={`relative overflow-hidden p-6 rounded-[30px] border-2 shadow-2xl transition-all hover:scale-[1.02] cursor-default bg-white ${idx === 0 ? 'border-amber-200 shadow-amber-500/10' :
                                            idx === 1 ? 'border-slate-200 shadow-slate-500/5' :
                                                'border-orange-100 shadow-orange-500/5'
                                            }`}>
                                            <div className="absolute top-0 right-0 p-5 opacity-[0.03] scale-150 rotate-12">
                                                {idx === 0 ? <Trophy size={100} /> : <Award size={100} />}
                                            </div>

                                            <div className="flex items-center gap-4 mb-5 relative z-10">
                                                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-lg ${idx === 0 ? 'bg-amber-400 text-white' :
                                                    idx === 1 ? 'bg-slate-400 text-white' :
                                                        'bg-orange-400 text-white'
                                                    }`}>
                                                    {idx === 0 ? <Trophy size={20} /> : idx === 1 ? <Medal size={20} /> : <Award size={20} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Position #{rank}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                            idx === 1 ? 'bg-slate-100 text-slate-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>Elite Tier</span>
                                                    </div>
                                                    <h4 className="text-lg font-black text-[#2B3674] tracking-tight">{student.StudentName}</h4>
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between relative z-10">
                                                <div>
                                                    <div className="flex items-baseline gap-1">
                                                        <h2 className="text-4xl font-black text-[#2B3674]">{student.FinalAverage.toFixed(1)}</h2>
                                                        <span className="text-lg font-black text-slate-300">%</span>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-[0.1em]">
                                                        {selectedSemester && selectedSemester !== 'full-year' ? 'Semester Average' : 'Verified Final Average'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1.5 justify-end mb-1 text-brand-blue">
                                                        <School size={12} />
                                                        <span className="text-[9px] font-black uppercase tracking-wider">G{student.GradeNumber} — {student.SectionName}</span>
                                                    </div>
                                                    <p className="text-[8px] font-black text-slate-300 uppercase">Snapshot Logged</p>
                                                </div>
                                            </div>
                                        </div>

                                    );
                                })}
                            </div>

                            {/* Rankings Table */}
                            <div className="xl:col-span-8">
                                <div className="bg-white rounded-[45px] p-10 shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-10">
                                        <h2 className="text-2xl font-black text-[#2B3674]">Full Standings</h2>
                                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {filteredRankings.length} Students Qualified
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {paginatedRankings.map((student) => {
                                            const rank = getRankValue(student);
                                            return (
                                                <div key={student.StudentId} className="group flex items-center justify-between p-5 rounded-3xl bg-white border border-slate-50 hover:border-brand-blue hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${getRankColor(rank)}`}>
                                                            {getRankIcon(rank)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-[#2B3674] text-lg group-hover:text-brand-blue transition-colors">{student.StudentName}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Grade {student.GradeNumber}</span>
                                                                <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{student.SectionName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="text-right">
                                                            <div className="flex items-baseline gap-1 justify-end">
                                                                <span className="text-2xl font-black text-[#2B3674]">{student.FinalAverage.toFixed(1)}</span>
                                                                <span className="text-sm font-black text-slate-300">%</span>
                                                            </div>
                                                            <div className="w-32 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-50">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ${student.FinalAverage >= 85 ? 'bg-green-500' :
                                                                        student.FinalAverage >= 70 ? 'bg-blue-500' :
                                                                            student.FinalAverage >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${student.FinalAverage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const params = `studentId=${student.StudentId}&studentName=${encodeURIComponent(student.StudentName)}&gradeNumber=${student.GradeNumber}&sectionName=${encodeURIComponent(student.SectionName)}`;
                                                                if (isAdmin) {
                                                                    navigate(`/admin/assessment-results?${params}`);
                                                                } else {
                                                                    navigate(`/teacher/assessment-results?${params}`);
                                                                }
                                                            }}
                                                            className="p-2.5 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-all cursor-pointer hover:scale-110"
                                                        >
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-12 border-t border-slate-50 pt-10">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 transition-all font-black shadow-sm"
                                                >
                                                    <ChevronLeft size={22} />
                                                </button>
                                                <div className="flex items-center gap-2 px-4 shadow-sm py-1 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Page</span>
                                                    <span className="text-sm font-black text-brand-blue">{currentPage}</span>
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">of {totalPages}</span>
                                                </div>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:border-brand-blue hover:text-brand-blue disabled:opacity-30 transition-all font-black shadow-sm"
                                                >
                                                    <ChevronRight size={22} />
                                                </button>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setPerPageOpen(!perPageOpen)}
                                                    className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-100 text-xs font-black text-[#2B3674] hover:border-brand-blue transition-all shadow-sm"
                                                >
                                                    {perPage} PER PAGE
                                                    <ChevronDown size={16} className={`transition-transform duration-300 ${perPageOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {perPageOpen && (
                                                    <div className="absolute right-0 bottom-full mb-3 w-44 bg-white rounded-[24px] shadow-2xl border border-slate-50 py-3 overflow-hidden animate-in slide-in-from-bottom-2">
                                                        {[10, 25, 50, 100].map(val => (
                                                            <button
                                                                key={val}
                                                                onClick={() => { setPerPage(val); setPerPageOpen(false); setCurrentPage(1); }}
                                                                className={`w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${perPage === val ? 'bg-blue-50 text-brand-blue' : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue'}`}
                                                            >
                                                                {val} LIMIT
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Legend / Metrics */}
                            <div className="xl:col-span-4 space-y-8">
                                <div className="bg-[#111C44] rounded-3xl p-6 text-white 
                shadow-xl shadow-blue-900/30 
                relative overflow-hidden group">

                                    {/* Background Effect */}
                                    <div className="absolute top-0 right-0 w-32 h-32 
                    bg-white/5 rounded-full 
                    -mr-16 -mt-16 
                    group-hover:scale-125 
                    transition-transform duration-700" />

                                    {/* Header */}
                                    <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                                        <TrendingUp size={18} className="text-brand-blue" />
                                        Performance Distribution
                                    </h3>

                                    {/* Stats */}
                                    <div className="space-y-4">
                                        {[
                                            { label: 'High Achievers', range: '90-100%', count: rankings.filter(r => r.FinalAverage >= 90).length, color: 'bg-green-400' },
                                            { label: 'Merit Holders', range: '75-89%', count: rankings.filter(r => r.FinalAverage >= 75 && r.FinalAverage < 90).length, color: 'bg-blue-400' },
                                            { label: 'Passing Range', range: '50-74%', count: rankings.filter(r => r.FinalAverage >= 50 && r.FinalAverage < 75).length, color: 'bg-orange-400' },
                                            { label: 'Below Minimum', range: '< 50%', count: rankings.filter(r => r.FinalAverage < 50).length, color: 'bg-red-400' }
                                        ].map((stat, i) => (
                                            <div key={i} className="flex items-center justify-between">

                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${stat.color}`} />
                                                    <div>
                                                        <h5 className="text-xs font-semibold">{stat.label}</h5>
                                                        <p className="text-[10px] text-white/50">{stat.range}</p>
                                                    </div>
                                                </div>

                                                <span className="text-lg font-bold">
                                                    {stat.count}
                                                </span>

                                            </div>
                                        ))}
                                    </div>

                                    {/* Small Footer Quote (Compact) */}
                                    <div className="mt-6 pt-4 border-t border-white/10">
                                        <p className="text-[11px] text-white/60 italic">
                                            True potential is measured by progress.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[45px] p-6 shadow-sm border border-slate-100 group">
                                    <h3 className="text-xl font-black text-[#2B3674] mb-5 flex items-center gap-3">
                                        <BookOpen className="text-brand-blue" />
                                        Hall of Fame Rules
                                    </h3>
                                    <div className="space-y-6">
                                        {[
                                            { title: 'Dense Ranking', desc: 'Tie scores receive the same position, and the next rank continues sequentially.' },
                                            { title: 'Global Parity', desc: 'School-wide rankings compare performance across every enrolled student.' },
                                            { title: 'Finality', desc: 'Results represent the weighted mean of both Semester 1 and Semester 2 performance.' }
                                        ].map((rule, i) => (
                                            <div key={i} className="flex gap-5">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-brand-blue/10 transition-colors">
                                                    <ArrowUpRight size={18} className="text-slate-300 group-hover:text-brand-blue transition-colors" />
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-sm text-[#2B3674] mb-1">{rule.title}</h5>
                                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{rule.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ClassRankings;



