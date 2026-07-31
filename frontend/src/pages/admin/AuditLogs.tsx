import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Search, ShieldCheck, ChevronLeft, ChevronRight, Filter, Activity, Calendar as CalendarIcon, Info, X, Clock, ChevronDown, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AuditLog {
    id: number;
    user_id: number;
    role: string;
    action: string;
    table_name: string;
    record_id: number;
    old_value: any;
    new_value: any;
    ip_address: string;
    created_at: string;
    FullName: string; // From join
    Email: string; // From join
}

const AuditLogs = () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email || 'admin@example.com';
    const activeRole = user?.role?.toLowerCase() || 'admin';

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [showPerPageDropdown, setShowPerPageDropdown] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/audit', {
                params: {
                    role: filterRole,
                    action: filterAction,
                    date: filterDate
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(response.data);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        setCurrentPage(1);
    }, [filterRole, filterAction, filterDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const filteredLogs = logs.filter(log =>
        (log.FullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.Email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.table_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.record_id && log.record_id.toString().includes(searchTerm))
    );

    const paginatedLogs = filteredLogs.slice((currentPage - 1) * perPage, currentPage * perPage);
    const totalPages = Math.ceil(filteredLogs.length / perPage);

    // Build page numbers with ellipsis
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

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'INSERT': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'UPDATE': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'DELETE': return 'text-rose-600 bg-rose-50 border-rose-100';
            case 'LOGIN': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'APPROVE': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    const parseValue = (val: any) => {
        if (!val) return null;
        try {
            return typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
            return val;
        }
    };

    const formatKey = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    };

    const formatDisplayValue = (val: any) => {
        if (val === null || val === undefined) return 'N/A';

        // Check if it's an ISO date string
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
        }

        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const DataRenderer = ({ data, title, type }: { data: any, title: string, type: 'old' | 'new' }) => {
        const parsed = parseValue(data);
        const isEmpty = !parsed || Object.keys(parsed).length === 0;

        return (
            <div className={cn(
                "bg-white p-6 rounded-[2rem] shadow-sm border transition-all duration-500 overflow-hidden flex flex-col h-full",
                type === 'new' ? "border-brand-blue/20 ring-1 ring-brand-blue/5" : "border-slate-100"
            )}>
                <div className="flex items-center justify-between mb-6">
                    <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em]",
                        type === 'new' ? "text-brand-blue" : "text-slate-400"
                    )}>
                        {title}
                    </p>
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        type === 'new' ? "bg-brand-blue animate-pulse" : "bg-slate-200"
                    )} />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {isEmpty ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10 opacity-50">
                            <Info size={40} className="mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Data Available</p>
                        </div>
                    ) : (
                        Object.entries(parsed).map(([key, value]: [string, any]) => (
                            <div key={key} className="group/item border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-brand-blue transition-colors">
                                    {formatKey(key)}
                                </p>
                                <div className={cn(
                                    "text-sm font-bold break-all px-3 py-2 rounded-xl transition-all",
                                    type === 'new' ? "bg-blue-50/50 text-[#2B3674]" : "bg-slate-50 text-slate-500"
                                )}>
                                    {formatDisplayValue(value)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden">
            <Sidebar role={activeRole as any} />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={email} role={activeRole as any} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4 scroll-smooth">

                    {/* Filters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by user, action, table..."
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all shadow-sm font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <Filter className="absolute left-4 top-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all shadow-sm font-bold text-[#2B3674] appearance-none"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">All User Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Director">Director</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Student">Student</option>
                            </select>
                        </div>

                        <div className="relative group">
                            <Activity className="absolute left-4 top-1/2  text-slate-400" size={18} />
                            <select
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all shadow-sm font-bold text-[#2B3674] appearance-none"
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                            >
                                <option value="">All Actions</option>
                                <option value="INSERT">Create (INSERT)</option>
                                <option value="UPDATE">Modify (UPDATE)</option>
                                <option value="DELETE">Remove (DELETE)</option>
                                <option value="LOGIN">Auth (LOGIN)</option>
                                <option value="APPROVE">Approve (APPROVE)</option>
                            </select>
                        </div>

                        <div className="relative group">
                            <CalendarIcon className="absolute left-4 top-1/2 text-slate-400" size={18} />
                            <input
                                type="date"
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all shadow-sm font-bold text-[#2B3674]"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b-2 border-slate-100">
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">User / Actor</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Target Engine</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">IP Source</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Synchronizing Ledger Records...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Info className="text-slate-200" size={60} />
                                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No matching activities found in the ledger.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedLogs.map((log, index) => (
                                            <tr
                                                key={log.id}
                                                className={cn(
                                                    "group transition-colors duration-150 border-b border-slate-100 last:border-0",
                                                    index % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/60 hover:bg-blue-50/40"
                                                )}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-[#2B3674]">
                                                            {new Date(log.created_at).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                                            <Clock size={10} />
                                                            {new Date(log.created_at).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0",
                                                            log.role === 'Admin' ? 'bg-red-100 text-red-600' :
                                                                log.role === 'Director' ? 'bg-indigo-100 text-indigo-600' :
                                                                    log.role === 'Teacher' ? 'bg-emerald-100 text-emerald-600' :
                                                                        'bg-slate-100 text-slate-500'
                                                        )}>
                                                            {log.FullName?.[0] || 'S'}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold text-[#2B3674] leading-none truncate">{log.FullName}</span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.role === 'Admin' ? 'bg-red-500' :
                                                                    log.role === 'Director' ? 'bg-indigo-500' :
                                                                        log.role === 'Teacher' ? 'bg-emerald-500' : 'bg-slate-400'
                                                                    }`} />
                                                                {log.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                                                        <span className="text-sm font-bold text-slate-600 font-mono">{log.table_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">{log.ip_address || '127.0.0.1'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95",
                                                            selectedLog?.id === log.id
                                                                ? "bg-[#3B82F6] text-white shadow-md shadow-blue-500/20"
                                                                : "bg-blue-50 text-[#3B82F6] border border-blue-100 hover:bg-blue-100 hover:border-transparent"
                                                        )}
                                                    >
                                                        <Eye size={14} />
                                                        <span>View</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/30 gap-6 rounded-b-[30px]">
                            <div className="flex flex-col">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    <span className="text-[#2B3674]">{paginatedLogs.length}</span> of <span className="text-[#2B3674]">{filteredLogs.length}</span>
                                </p>
                                <div className="h-1 bg-slate-200 rounded-full w-32 overflow-hidden">
                                    <div
                                        style={{ width: `${(filteredLogs.length > 0 ? (currentPage * perPage) / filteredLogs.length : 0) * 100}%` }}
                                        className="h-full bg-brand-blue"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Page Numbers */}
                                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-30 text-slate-400 transition-all"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>

                                    {getPageNumbers().map((pageNum, idx) => (
                                        pageNum === 'ellipsis' ? (
                                            <div key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                                                <MoreHorizontal size={14} />
                                            </div>
                                        ) : (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={cn(
                                                    "w-9 h-9 rounded-xl text-xs font-black transition-all",
                                                    currentPage === pageNum
                                                        ? "bg-brand-blue text-white shadow-lg shadow-blue-500/20 scale-110"
                                                        : "text-slate-400 hover:bg-slate-50 hover:text-[#2B3674]"
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-30 text-slate-400 transition-all"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                {/* Per Page Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowPerPageDropdown(!showPerPageDropdown)}
                                        className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-[#2B3674] hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        {perPage} / page
                                        <ChevronDown size={14} className={cn("transition-all", showPerPageDropdown && "rotate-180")} />
                                    </button>

                                    {showPerPageDropdown && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowPerPageDropdown(false)}
                                            />
                                            <div
                                                className="absolute bottom-full mb-2 right-0 w-32 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                            >
                                                {[10, 15, 20, 25, 50, 100].map((option) => (
                                                    <button
                                                        key={option}
                                                        onClick={() => {
                                                            setPerPage(option);
                                                            setCurrentPage(1);
                                                            setShowPerPageDropdown(false);
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-4 py-3 text-xs font-bold transition-all",
                                                            perPage === option
                                                                ? "bg-brand-blue/5 text-brand-blue"
                                                                : "text-slate-600 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        {option} / page
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Audit Detail Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                >
                    <div
                        className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
                    >
                        <div className="p-8 bg-black text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-white/10 border border-white/20 ${getActionColor(selectedLog.action)} bg-opacity-10`}>
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{selectedLog.action} Action Detail</h2>
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">Log #EID-{selectedLog.id} • {selectedLog.table_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 bg-[#F8FAFC] flex-1 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
                                <DataRenderer data={selectedLog.old_value} title="Original State" type="old" />
                                <DataRenderer data={selectedLog.new_value} title="New State" type="new" />
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                                        {selectedLog.FullName?.[0] || 'S'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Executor Identity</p>
                                        <p className="text-sm font-black text-[#2B3674]">{selectedLog.FullName} (<span className="italic font-bold">{selectedLog.Email}</span>)</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Execution Source</p>
                                    <p className="text-sm font-black text-[#2B3674] font-mono">{selectedLog.ip_address || '127.0.0.1'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-8 py-3 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-components as needed
const Eye = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

export default AuditLogs;
