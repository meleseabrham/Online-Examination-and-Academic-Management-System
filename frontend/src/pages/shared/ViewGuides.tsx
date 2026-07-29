import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { BookOpen, ChevronLeft, Download, FileText, Search, Loader, ChevronRight } from 'lucide-react';

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

const ViewGuides = ({ role }: { role: 'student' | 'teacher' | 'director' }) => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { email: '', role };
    const headers = { Authorization: `Bearer ${token}` };

    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchGuides = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`http://localhost:5000/api/${role}/guides`, { headers });
                setGuides(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchGuides();
    }, []);

    const filteredGuides = guides.filter(g =>
        g.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.Description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {selectedGuide ? (
                        /* Guide Detail View */
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto pb-10">
                            <div className="flex items-center gap-4 mb-8">
                                <button
                                    onClick={() => setSelectedGuide(null)}
                                    className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-brand-blue hover:shadow-md hover:border-brand-blue/20 transition-all active:scale-95"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-black text-[#2B3674] tracking-tight">{selectedGuide.Title}</h1>
                                    <p className="text-slate-400 text-xs font-medium mt-1">
                                        By {selectedGuide.AuthorName || 'System Admin'} •&nbsp;
                                        {new Date(selectedGuide.CreatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-[30px] p-8 border border-slate-100 shadow-sm">
                                {selectedGuide.Description && (
                                    <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-5 mb-8">
                                        <p className="text-brand-blue text-sm font-bold leading-relaxed">{selectedGuide.Description}</p>
                                    </div>
                                )}

                                {selectedGuide.Content && (
                                    <div className="prose prose-slate max-w-none">
                                        {selectedGuide.Content.split('\n').map((line, i) => (
                                            <p key={i} className="text-[#2B3674] text-sm font-medium leading-[1.8] mb-3">
                                                {line || <br />}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {selectedGuide.FileName && selectedGuide.FilePath && (
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Attachment</h4>
                                        <a
                                            href={`http://localhost:5000/${selectedGuide.FilePath}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-3 px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-[#2B3674] hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all group"
                                        >
                                            <Download size={16} className="group-hover:animate-bounce" />
                                            {selectedGuide.FileName}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Guide List View */
                        <>
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">

                                <div className="relative w-72">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search guides..."
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue shadow-sm transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20"><Loader className="animate-spin text-brand-blue" size={40} /></div>
                            ) : filteredGuides.length === 0 ? (
                                <div className="bg-white rounded-[30px] p-20 text-center border border-slate-100 shadow-sm">
                                    <BookOpen className="mx-auto text-slate-200 mb-4" size={48} />
                                    <h3 className="text-lg font-bold text-[#2B3674] mb-1">No Guides Available</h3>
                                    <p className="text-slate-400 text-sm font-medium">There are no guides available for your role yet. Check back later!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredGuides.map((guide, idx) => (
                                        <div
                                            key={guide.Id}
                                            onClick={() => setSelectedGuide(guide)}
                                            className="bg-white rounded-[25px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-brand-blue/20 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-500"
                                            style={{ animationDelay: `${idx * 80}ms` }}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all">
                                                    <BookOpen size={18} />
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${guide.TargetRole === 'Student' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                                    guide.TargetRole === 'Teacher' ? 'bg-purple-50 text-purple-500 border-purple-100' :
                                                        'bg-green-50 text-green-500 border-green-100'
                                                    }`}>
                                                    {guide.TargetRole === 'All' ? 'General' : guide.TargetRole}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-black text-[#2B3674] mb-2 group-hover:text-brand-blue transition-colors line-clamp-1">{guide.Title}</h3>
                                            <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-3 mb-4">{guide.Description || guide.Content?.substring(0, 120) || 'Click to read this guide.'}</p>

                                            {guide.FileName && (
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-4 bg-slate-50 px-3 py-2 rounded-lg">
                                                    <FileText size={12} />
                                                    <span className="truncate">{guide.FileName}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                <span className="text-[9px] font-bold text-slate-300">
                                                    {new Date(guide.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                                <div className="flex items-center gap-1 text-[9px] font-black text-brand-blue uppercase tracking-widest group-hover:gap-2 transition-all">
                                                    Read Guide <ChevronRight size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ViewGuides;
