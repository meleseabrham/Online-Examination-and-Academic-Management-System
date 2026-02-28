import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Trophy,
    Award,
    TrendingUp,
    School,
    ChevronRight,
    Star,
    Zap,
    Target
} from 'lucide-react';

interface StudentRankingData {
    FinalAverage: number;
    ClassRank: number;
    GradeRank: number;
    SchoolRank: number;
    GradeNumber: number;
    SectionName: string;
    ClassTotal: number;
    GradeTotal: number;
    SchoolTotal: number;
}

interface AcademicYear { Id: number; Name: string; IsActive: boolean; }

const MyRanking = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };
    const navigate = useNavigate();

    const [years, setYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedAY, setSelectedAY] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [ranking, setRanking] = useState<StudentRankingData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchYears = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/student/academic-years', { headers });
                setYears(res.data);
                const active = res.data.find((y: any) => y.IsActive);
                if (active) {
                    setSelectedAY(active.Id.toString());
                }
            } catch (err) {
                console.error('Error fetching years:', err);
            }
        };
        fetchYears();
    }, []);

    useEffect(() => {
        const fetchSemesters = async () => {
            if (!selectedAY) return;
            try {
                const semRes = await axios.get(`http://localhost:5000/api/student/semesters?academicYearId=${selectedAY}`, { headers });
                setSemesters(semRes.data);

                // Auto-select active semester if it belongs to this year
                const activeSem = semRes.data.find((s: any) => s.IsActive);
                if (activeSem) {
                    setSelectedSemester(activeSem.Id.toString());
                } else {
                    setSelectedSemester(''); // Default to Full Year if no active semester
                }
            } catch (err) {
                console.error('Error fetching semesters:', err);
            }
        };
        fetchSemesters();
    }, [selectedAY]);

    useEffect(() => {
        if (selectedAY) {
            const fetchRanking = async () => {
                setLoading(true);
                try {
                    const url = `http://localhost:5000/api/student/rankings?academicYearId=${selectedAY}${selectedSemester ? `&semesterId=${selectedSemester}` : ''}`;
                    const res = await axios.get(url, { headers });
                    setRanking(res.data);
                } catch (err) {
                    console.error('Error fetching ranking:', err);
                    setRanking(null);
                } finally {
                    setLoading(false);
                }
            };
            fetchRanking();
        }
    }, [selectedAY, selectedSemester]);

    const getPercentile = (rank: number, total: number) => {
        if (!rank || !total || total <= 0) return 0;
        if (total === 1) return 100;
        return Math.max(0, Math.min(100, Math.round(((total - rank) / total) * 100)));
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden text-[#1B2559]">
            <Sidebar role="student" />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user?.email || ''} role="student" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-brand-blue rounded-xl text-white shadow-lg shadow-blue-500/30">
                                    <Trophy size={20} />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight">Personal Performance Hall</h1>
                            </div>
                            <p className="text-slate-500 font-medium ml-1">Track your academic standing and competitive growth.</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                                <TrendingUp size={16} className="text-brand-blue ml-2" />
                                <select
                                    value={selectedAY}
                                    onChange={(e) => { setSelectedAY(e.target.value); setSelectedSemester(''); }}
                                    className="bg-transparent border-none outline-none font-black text-sm pr-10 py-1.5 cursor-pointer"
                                >
                                    {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                                <Zap size={16} className="text-brand-blue ml-2" />
                                <select
                                    value={selectedSemester}
                                    onChange={(e) => setSelectedSemester(e.target.value)}
                                    className="bg-transparent border-none outline-none font-black text-sm pr-10 py-1.5 cursor-pointer"
                                >
                                    <option value="">Full Year</option>
                                    {semesters.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <div className="w-16 h-16 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin"></div>
                            <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Analyzing Results...</p>
                        </div>
                    ) : !ranking ? (
                        <div className="bg-white rounded-[50px] p-24 text-center border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full -mr-32 -mt-32"></div>
                            <Star size={80} className="mx-auto text-slate-100 mb-8" />
                            <h3 className="text-2xl font-black mb-3 text-[#2B3674]">No Ranking Data Yet</h3>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                                Rankings are calculated once your final year averages are processed. Keep pushing for excellence!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Score Hero */}
                                <div className="lg:col-span-4 bg-white rounded-[30px] p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 text-brand-blue/5 scale-[2] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                                        <Award size={60} />
                                    </div>
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Final Year Average</h4>
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-brand-blue opacity-5 rounded-full blur-2xl"></div>
                                        <h2 className="text-5xl font-black text-[#2B3674]">{ranking.FinalAverage.toFixed(1)}<span className="text-lg text-slate-300 ml-1">%</span></h2>
                                    </div>
                                    <div className="mt-4 px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100">
                                        Verified Standing
                                    </div>
                                    <div className="mt-5 flex items-center gap-2 border-t border-slate-50 pt-2 w-full">
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-slate-300 uppercase mb-0.5 tracking-tighter">Grade</p>
                                            <p className="font-black text-sm text-[#2B3674]"> {ranking.GradeNumber}</p>
                                        </div>
                                        <div className="w-px h-6 bg-slate-100"></div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-slate-300 uppercase mb-0.5 tracking-tighter">Section</p>
                                            <p className="font-black text-sm text-[#2B3674]">{ranking.SectionName}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Multi-Level Rankings */}
                                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[
                                        { label: 'Class Rank', rank: ranking.ClassRank, total: ranking.ClassTotal, icon: <School size={18} />, color: 'blue' },
                                        { label: 'Grade Rank', rank: ranking.GradeRank, total: ranking.GradeTotal, icon: <Trophy size={18} />, color: 'purple' },
                                        { label: 'School Rank', rank: ranking.SchoolRank, total: ranking.SchoolTotal, icon: <Award size={18} />, color: 'amber' }
                                    ].map((item, idx) => {
                                        const percentile = getPercentile(item.rank, item.total);
                                        return (
                                            <div key={idx} className="bg-white rounded-[25px] p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue group-hover:text-white transition-all shadow-sm">
                                                        {item.icon}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Percentile</p>
                                                        <span className="text-base font-black text-[#2B3674]">{percentile}%</span>
                                                    </div>
                                                </div>

                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{item.label}</h3>
                                                <div className="flex items-baseline gap-1.5">
                                                    <h2 className="text-3xl font-black text-[#2B3674]">#{item.rank}</h2>
                                                    <span className="text-sm font-black text-slate-300">/ {item.total}</span>
                                                </div>

                                                <div className="mt-4 h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                    <div
                                                        className="h-full bg-brand-blue rounded-full transition-all duration-[1500ms]"
                                                        style={{ width: `${percentile}%` }}
                                                    ></div>
                                                </div>
                                                <p className="mt-2 text-[8px] font-black text-slate-300 uppercase tracking-widest">Better than {percentile}% of peers</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Additional Insights */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                <div className="xl:col-span-7 bg-[#111C44] rounded-[30px] p-5 text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden group">
                                    <div className="absolute bottom-0 right-0 w-60 h-60 bg-brand-blue/10 rounded-full -mr-30 -mb-30 group-hover:scale-125 transition-transform duration-1000"></div>
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                                <Zap size={18} color="#4285F4" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black">Performance Path</h3>
                                                <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">Smart Analytics</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 flex-1">
                                            <div className="flex gap-4">
                                                <div className="w-1 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
                                                <div>
                                                    <h4 className="font-black text-xs mb-0.5 uppercase tracking-wider">Top Competency</h4>
                                                    <p className="text-white/60 text-xs leading-relaxed">Your results show a strong aptitude in core academic modules compared to the grade average.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="w-1 bg-brand-blue rounded-full shadow-[0_0_10px_rgba(66,133,244,0.4)]"></div>
                                                <div>
                                                    <h4 className="font-black text-xs mb-0.5 uppercase tracking-wider">Growth Prediction</h4>
                                                    <p className="text-white/60 text-xs leading-relaxed">Stable performance detected. Maintaining this average will secure your position in the top decile.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="w-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
                                                <div>
                                                    <h4 className="font-black text-xs mb-0.5 uppercase tracking-wider">Opportunity Area</h4>
                                                    <p className="text-white/60 text-xs leading-relaxed">A focus on advanced assessments could break the current tie near your ranking bracket.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <button onClick={() => navigate('/student/transcript')} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] group/btn hover:text-brand-blue transition-colors">
                                                Review Detailed Transcripts
                                                <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="xl:col-span-5 space-y-6">
                                    <div className="bg-white rounded-[30px] p-6 border border-slate-100 shadow-sm relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 text-brand-blue/5 scale-[1.5] rotate-12">
                                            <Target size={60} />
                                        </div>
                                        <h3 className="text-base font-black text-[#2B3674] mb-4">Next Milestones</h3>
                                        <div className="space-y-4">
                                            {[
                                                { title: 'Top 5 in Class', condition: ranking.ClassRank > 5, progress: Math.min(100, (ranking.FinalAverage / 95) * 100) },
                                                { title: 'Honor Roll Status', condition: ranking.FinalAverage < 90, progress: (ranking.FinalAverage / 90) * 100 },
                                                { title: 'Elite School Grade', condition: ranking.SchoolRank > 10, progress: Math.min(100, (ranking.FinalAverage / 98) * 100) }
                                            ].map((m, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#2B3674]">{m.title}</span>
                                                        <span className="text-[9px] font-black text-slate-300">{Math.round(m.progress)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-50">
                                                        <div className="h-full bg-brand-blue rounded-full" style={{ width: `${m.progress}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-brand-blue rounded-[30px] p-6 text-white shadow-xl shadow-blue-500/20 relative group overflow-hidden">
                                        <Trophy size={28} className="mb-3 opacity-40" />
                                        <h4 className="text-base font-black mb-1 leading-tight">Elite Circle Recognition</h4>
                                        <p className="text-white/60 text-xs font-medium leading-relaxed">
                                            Students in the top 3% of the school rank receive special mentions during the annual awards ceremony.
                                        </p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full bg-white/10 border border-white/20 backdrop-blur-md"></div>
                                                ))}
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">12 Students Qualified</span>
                                        </div>
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

export default MyRanking;
