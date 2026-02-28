import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Users, Calendar, AlertCircle, Loader, CheckCircle, Search, Copy, RefreshCcw } from 'lucide-react';

interface AttendanceStudent {
    StudentId: number;
    StudentName: string;
    StudentEmail: string;
    GradeName: string;
    Section: string;
    IsTaken: number;
    AttemptStatus: string | null;
}

interface ReassignModalProps {
    exam: { ExamId: number; Title: string; EndTime?: string };
    token: string;
    rolePrefix: string;
    onClose: (newExamId?: number) => void;
}

const ReassignModal: React.FC<ReassignModalProps> = ({ exam, token, rolePrefix, onClose }) => {
    const [mode, setMode] = useState<'view' | 'reassign' | 'makeup'>('view');
    const [students, setStudents] = useState<AttendanceStudent[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');
    const [reason, setReason] = useState('Makeup Assignment');
    const [makeupTitle, setMakeupTitle] = useState(`Make-up: ${exam.Title}`);

    const headers = { Authorization: `Bearer ${token}` };

    const isEnded = exam.EndTime ? new Date() > new Date(exam.EndTime) : false;

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams/${exam.ExamId}/assignments`, { headers });
                setStudents(res.data);
                // By default, if we switch to reassign/makeup, pre-select those who missed
                setSelectedStudentIds(res.data.filter((s: any) => !s.IsTaken).map((s: any) => s.StudentId));
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch student attendance.');
                setLoading(false);
            }
        };
        fetchAttendance();

        const now = new Date();
        const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        const toDt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setNewStartTime(toDt(now));
        setNewEndTime(toDt(twoHours));
    }, [exam.ExamId]);

    const handleToggleStudent = (id: number) => {
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    };

    const handleConfirm = async () => {
        if (selectedStudentIds.length === 0) return setError('Please select at least one student.');
        if (!newStartTime || !newEndTime) return setError('Please set both start and end times.');

        const toUTC = (localStr: string) => {
            const d = new Date(localStr);
            return isNaN(d.getTime()) ? null : d.toISOString();
        };

        setSubmitting(true);
        setError('');
        try {
            if (mode === 'reassign') {
                await axios.post(`http://localhost:5000/api/${rolePrefix}/exams/reassign`, {
                    examId: exam.ExamId, studentIds: selectedStudentIds,
                    newStartTime: toUTC(newStartTime), newEndTime: toUTC(newEndTime), reason
                }, { headers });
                setSuccess(true);
                setTimeout(() => onClose(), 1500);
            } else {
                const res = await axios.post(`http://localhost:5000/api/${rolePrefix}/exams/create-makeup`, {
                    originalExamId: exam.ExamId, studentIds: selectedStudentIds,
                    newTitle: makeupTitle, newStartTime: toUTC(newStartTime), newEndTime: toUTC(newEndTime), reason
                }, { headers });
                setSuccess(true);
                setTimeout(() => onClose(res.data.examId), 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Action failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.StudentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.StudentEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const takenList = filteredStudents.filter(s => s.IsTaken);
    const missedList = filteredStudents.filter(s => !s.IsTaken);

    const renderStudentCard = (student: AttendanceStudent, selectable = false) => (
        <div
            key={student.StudentId}
            onClick={() => selectable && handleToggleStudent(student.StudentId)}
            className={`p-3 rounded-xl flex items-center justify-between transition-all ${selectable ? 'cursor-pointer hover:bg-blue-50/30' : ''} ${selectable && selectedStudentIds.includes(student.StudentId) ? 'bg-blue-50/50 border border-brand-blue/20' : 'bg-white border border-slate-50'}`}
        >
            <div className="flex items-center gap-3">
                {selectable && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedStudentIds.includes(student.StudentId) ? 'bg-brand-blue border-brand-blue' : 'border-slate-200 bg-white'}`}>
                        {selectedStudentIds.includes(student.StudentId) && <CheckCircle size={10} className="text-white" />}
                    </div>
                )}
                <div>
                    <p className="font-bold text-xs text-[#2B3674]">{student.StudentName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{student.GradeName}-{student.Section}</p>
                </div>
            </div>
            <div className="text-right">
                {student.IsTaken ? (
                    <span className="text-[8px] font-black uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Taken</span>
                ) : student.AttemptStatus === 'Started' ? (
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">In Progress</span>
                ) : (
                    <span className="text-[8px] font-black uppercase tracking-wider text-red-400 bg-red-50 px-2 py-0.5 rounded-full">{isEnded ? 'Missed' : 'Waiting'}</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="bg-[#111C44] p-8 text-white relative">
                    <button onClick={() => onClose()} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-2xl transition-all"><X size={24} /></button>
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 shadow-inner">
                            <Users size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">Exam Participation</h2>
                            <p className="text-blue-200/60 font-medium">{exam.Title} • {isEnded ? <span className="text-red-400 font-bold">Ended</span> : <span className="text-green-400 font-bold">Live</span>}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 max-h-[75vh] overflow-y-auto">
                    {success ? (
                        <div className="py-20 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                                <CheckCircle size={48} />
                            </div>
                            <h3 className="text-3xl font-black text-[#2B3674] mb-3">Action Successful!</h3>
                            <p className="text-slate-500 font-medium text-lg">Your changes have been saved. Closing...</p>
                        </div>
                    ) : mode !== 'view' ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center">
                                <button onClick={() => setMode('view')} className="flex items-center gap-2 text-brand-blue font-bold text-sm hover:underline"><RefreshCcw size={16} /> Back to Attendance</button>
                                <div className="flex p-1 bg-slate-100 rounded-xl">
                                    <button onClick={() => setMode('reassign')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'reassign' ? 'bg-white shadow-sm text-brand-blue' : 'text-slate-400'}`}>Re-assign</button>
                                    <button onClick={() => setMode('makeup')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'makeup' ? 'bg-white shadow-sm text-brand-blue' : 'text-slate-400'}`}>Make-up</button>
                                </div>
                            </div>

                            {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500 font-bold text-sm"><AlertCircle size={18} /> {error}</div>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-[#2B3674] uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-brand-blue" /> Schedule Settings</h3>
                                    {mode === 'makeup' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">New Exam Title</label>
                                            <input type="text" value={makeupTitle} onChange={e => setMakeupTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue transition-all font-bold text-sm" />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Start Time</label>
                                            <input type="datetime-local" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">End Time</label>
                                            <input type="datetime-local" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Internal Note / Reason</label>
                                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black text-[#2B3674] uppercase tracking-widest flex items-center gap-2"><Users size={14} className="text-brand-blue" /> Selected Students ({selectedStudentIds.length})</h3>
                                    </div>
                                    <div className="border border-slate-100 rounded-3xl overflow-hidden max-h-[300px] overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                                        {missedList.map(s => renderStudentCard(s, true))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative w-full md:w-72">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search participants..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 w-full text-sm font-medium outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                                    />
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setMode('reassign')}
                                        className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 hover:bg-slate-600 hover:text-white transition-all"
                                    >
                                        Re-assign Missed
                                    </button>
                                    <button
                                        onClick={() => setMode('makeup')}
                                        className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 hover:text-white transition-all hover:scale-105"
                                    >
                                        Create Make-up
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-20 flex justify-center"><Loader size={40} className="animate-spin text-brand-blue" /></div>
                            ) : isEnded ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div>
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <h3 className="text-xs font-black text-green-600 uppercase tracking-widest">Taked the Exam ({takenList.length})</h3>
                                            <div className="h-px flex-1 bg-green-100 mx-4"></div>
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                            {takenList.length > 0 ? takenList.map(s => renderStudentCard(s)) : <p className="text-center py-10 text-slate-300 text-xs italic font-medium">No one has completed this exam.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">Missed the Exam ({missedList.length})</h3>
                                            <div className="h-px flex-1 bg-red-100 mx-4"></div>
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                            {missedList.length > 0 ? missedList.map(s => renderStudentCard(s)) : <p className="text-center py-10 text-slate-300 text-xs italic font-medium">Perfect attendance! No one missed it.</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-xs font-black text-brand-blue uppercase tracking-widest">All Assigned Students ({filteredStudents.length})</h3>
                                        <div className="h-px flex-1 bg-blue-50 mx-4"></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {filteredStudents.map(s => renderStudentCard(s))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {mode !== 'view' && !success && (
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                        <button onClick={() => setMode('view')} className="flex-1 py-4 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 bg-white border border-slate-200 transition-all">Cancel</button>
                        <button
                            onClick={handleConfirm}
                            disabled={submitting || loading || selectedStudentIds.length === 0}
                            className="flex-[2] py-4 rounded-3xl font-black text-xs uppercase tracking-widest text-white bg-brand-blue shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {submitting ? <Loader size={18} className="animate-spin" /> : mode === 'makeup' ? <Copy size={18} /> : <RefreshCcw size={18} />}
                            {submitting ? 'Processing...' : mode === 'makeup' ? 'Create & Assign New Make-up' : 'Re-assign Original'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReassignModal;
