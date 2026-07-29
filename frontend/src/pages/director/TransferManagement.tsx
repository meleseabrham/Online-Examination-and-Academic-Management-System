import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Building2, ArrowRightLeft, UserCheck, GraduationCap,
    Plus, Search, History, X, ChevronDown,
    School, MapPin, Hash, Phone, Mail, Edit, Trash2,
    AlertTriangle, CheckCircle
} from 'lucide-react';

interface School { Id: number; Name: string; Address: string; Code: string; Phone: string; Email: string; StudentCount: number; TeacherCount: number; }
interface TransferRecord { Id: number; EntityType: string; EntityId: number; FromSchoolName: string; ToSchoolName: string; EntityName: string; TransferredByName: string; TransferDate: string; Reason: string; CumulativeAverage: number; }

const TransferManagement = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };

    const [activeTab, setActiveTab] = useState<'schools' | 'student-transfer' | 'teacher-transfer' | 'history'>('schools');
    const [schools, setSchools] = useState<School[]>([]);
    const [transfers, setTransfers] = useState<TransferRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // School form
    const [showSchoolForm, setShowSchoolForm] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [schoolForm, setSchoolForm] = useState({ name: '', address: '', code: '', phone: '', email: '' });

    // Transfer forms
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [transferForm, setTransferForm] = useState({ entityId: '', toSchoolId: '', reason: '', replacementTeacherId: '' });
    const [searchQuery, setSearchQuery] = useState('');

    // Grades & sections for transfer target
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [targetGrade, setTargetGrade] = useState('');
    const [targetSection, setTargetSection] = useState('');

    useEffect(() => {
        fetchSchools();
        fetchUsers();
        fetchGrades();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') fetchTransferHistory();
    }, [activeTab]);

    useEffect(() => {
        if (targetGrade) fetchSections(targetGrade);
    }, [targetGrade]);

    const fetchSchools = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/director/schools', { headers });
            setSchools(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/director/users', { headers });
            setStudents(res.data.filter((u: any) => u.Role === 'Student'));
            setTeachers(res.data.filter((u: any) => u.Role === 'Teacher'));
        } catch (err) { console.error(err); }
    };

    const fetchGrades = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/director/grades', { headers });
            setGrades(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchSections = async (gradeId: string) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/director/sections?gradeId=${gradeId}`, { headers });
            setSections(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTransferHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/director/transfers/history', { headers });
            setTransfers(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    // School CRUD
    const handleSchoolSubmit = async () => {
        try {
            if (editingSchool) {
                await axios.put(`http://localhost:5000/api/director/schools/${editingSchool.Id}`, schoolForm, { headers });
                showMsg('success', 'School updated successfully');
            } else {
                await axios.post('http://localhost:5000/api/director/schools', schoolForm, { headers });
                showMsg('success', 'School created successfully');
            }
            fetchSchools();
            setShowSchoolForm(false);
            setEditingSchool(null);
            setSchoolForm({ name: '', address: '', code: '', phone: '', email: '' });
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error saving school');
        }
    };

    const handleDeleteSchool = async (id: number) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await axios.delete(`http://localhost:5000/api/director/schools/${id}`, { headers });
            showMsg('success', 'School deleted');
            fetchSchools();
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error deleting school');
        }
    };

    const openEditSchool = (s: School) => {
        setEditingSchool(s);
        setSchoolForm({ name: s.Name, address: s.Address || '', code: s.Code, phone: s.Phone || '', email: s.Email || '' });
        setShowSchoolForm(true);
    };

    // Transfer handlers
    const handleStudentTransfer = async () => {
        if (!transferForm.entityId || !transferForm.toSchoolId) {
            showMsg('error', 'Please select a student and target school');
            return;
        }
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/director/transfers/student', {
                studentId: parseInt(transferForm.entityId),
                toSchoolId: parseInt(transferForm.toSchoolId),
                reason: transferForm.reason,
                newGradeId: targetGrade ? parseInt(targetGrade) : undefined,
                newSectionId: targetSection ? parseInt(targetSection) : undefined
            }, { headers });
            showMsg('success', 'Student transferred successfully! Academic history preserved.');
            setTransferForm({ entityId: '', toSchoolId: '', reason: '', replacementTeacherId: '' });
            setTargetGrade('');
            setTargetSection('');
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error transferring student');
        } finally { setLoading(false); }
    };

    const handleTeacherTransfer = async () => {
        if (!transferForm.entityId) {
            showMsg('error', 'Please select a teacher');
            return;
        }
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/director/transfers/teacher', {
                teacherId: parseInt(transferForm.entityId),
                toSchoolId: transferForm.toSchoolId ? parseInt(transferForm.toSchoolId) : undefined,
                replacementTeacherId: transferForm.replacementTeacherId ? parseInt(transferForm.replacementTeacherId) : undefined,
                reason: transferForm.reason
            }, { headers });
            showMsg('success', 'Teacher transfer completed! Grading history preserved.');
            setTransferForm({ entityId: '', toSchoolId: '', reason: '', replacementTeacherId: '' });
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error transferring teacher');
        } finally { setLoading(false); }
    };

    const filteredStudents = students.filter(s =>
        s.FullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.Email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTeachers = teachers.filter(t =>
        t.FullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.Email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'schools' as const, label: 'Schools', icon: <Building2 size={16} /> },
        { id: 'student-transfer' as const, label: 'Student Transfer', icon: <GraduationCap size={16} /> },
        { id: 'teacher-transfer' as const, label: 'Teacher Transfer', icon: <UserCheck size={16} /> },
        { id: 'history' as const, label: 'Transfer History', icon: <History size={16} /> },
    ];

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden text-[#1B2559]">
            <Sidebar role="director" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user?.email || ''} role="director" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Toast */}
                    {message && (
                        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm animate-in slide-in-from-right ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                            {message.text}
                        </div>
                    )}



                    {/* Tabs */}
                    <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setTransferForm({ entityId: '', toSchoolId: '', reason: '', replacementTeacherId: '' }); }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-[#111C44] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ======================== SCHOOLS TAB ======================== */}
                    {activeTab === 'schools' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black">Registered Schools</h2>
                                <button onClick={() => { setShowSchoolForm(true); setEditingSchool(null); setSchoolForm({ name: '', address: '', code: '', phone: '', email: '' }); }}
                                    className="flex items-center gap-2 bg-[#111C44] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1a2a5e] transition-colors shadow-lg">
                                    <Plus size={16} /> Add School
                                </button>
                            </div>

                            {/* School Form Modal */}
                            {showSchoolForm && (
                                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-black">{editingSchool ? 'Edit School' : 'Add New School'}</h3>
                                            <button onClick={() => setShowSchoolForm(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">School Name *</label>
                                                <input value={schoolForm.name} onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Enter school name" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">School Code *</label>
                                                <input value={schoolForm.code} onChange={e => setSchoolForm({ ...schoolForm, code: e.target.value })}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="e.g. SCH-001" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                                                <input value={schoolForm.address} onChange={e => setSchoolForm({ ...schoolForm, address: e.target.value })}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="School address" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                                    <input value={schoolForm.phone} onChange={e => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                                                        className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="+251..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                                    <input value={schoolForm.email} onChange={e => setSchoolForm({ ...schoolForm, email: e.target.value })}
                                                        className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="school@email.com" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-8">
                                            <button onClick={() => setShowSchoolForm(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                                            <button onClick={handleSchoolSubmit} className="flex-1 px-4 py-3 bg-[#111C44] text-white rounded-xl font-bold hover:bg-[#1a2a5e] transition-colors shadow-lg">
                                                {editingSchool ? 'Update' : 'Create'} School
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* School Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {schools.map(s => (
                                    <div key={s.Id} className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                                    <Building2 size={22} />
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditSchool(s)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"><Edit size={15} /></button>
                                                    <button onClick={() => handleDeleteSchool(s.Id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-black mb-1">{s.Name}</h3>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-1"><Hash size={12} />{s.Code}</div>
                                            {s.Address && <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-1"><MapPin size={12} />{s.Address}</div>}
                                            {s.Phone && <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-1"><Phone size={12} />{s.Phone}</div>}
                                            {s.Email && <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-1"><Mail size={12} />{s.Email}</div>}
                                            <div className="flex gap-6 mt-5 pt-5 border-t border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><GraduationCap size={14} className="text-emerald-500" /></div>
                                                    <div><p className="text-xs text-slate-400">Students</p><p className="font-black text-sm">{s.StudentCount}</p></div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><UserCheck size={14} className="text-purple-500" /></div>
                                                    <div><p className="text-xs text-slate-400">Teachers</p><p className="font-black text-sm">{s.TeacherCount}</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ======================== STUDENT TRANSFER TAB ======================== */}
                    {activeTab === 'student-transfer' && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            <div className="xl:col-span-7 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                <h2 className="text-xl font-black mb-2">Transfer Student</h2>
                                <p className="text-sm text-slate-400 mb-6">Student's old enrollment will be marked as "Transferred". Academic history is fully preserved.</p>

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Student *</label>
                                        <div className="relative mt-1">
                                            <Search size={16} className="absolute left-4 top-3.5 text-slate-300" />
                                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Search student by name or email..." />
                                        </div>
                                        {searchQuery && (
                                            <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-1">
                                                {filteredStudents.slice(0, 10).map(s => (
                                                    <button key={s.UserId} onClick={() => { setTransferForm({ ...transferForm, entityId: String(s.UserId) }); setSearchQuery(''); }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-3 ${transferForm.entityId === String(s.UserId) ? 'bg-blue-50' : ''}`}>
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">{s.FullName[0]}</div>
                                                        <div>
                                                            <p className="font-bold text-sm">{s.FullName}</p>
                                                            <p className="text-xs text-slate-400">{s.Email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {transferForm.entityId && (
                                            <div className="mt-2 bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold text-blue-700 flex items-center gap-2">
                                                <UserCheck size={14} /> Selected: {students.find(s => String(s.UserId) === transferForm.entityId)?.FullName}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target School *</label>
                                        <div className="relative mt-1">
                                            <select value={transferForm.toSchoolId} onChange={e => setTransferForm({ ...transferForm, toSchoolId: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer font-bold">
                                                <option value="">Select target school...</option>
                                                {schools.map(s => <option key={s.Id} value={s.Id}>{s.Name} ({s.Code})</option>)}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Grade (Optional)</label>
                                            <select value={targetGrade} onChange={e => { setTargetGrade(e.target.value); setTargetSection(''); }}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-bold">
                                                <option value="">Same grade</option>
                                                {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Section (Optional)</label>
                                            <select value={targetSection} onChange={e => setTargetSection(e.target.value)}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-bold">
                                                <option value="">Same section</option>
                                                {sections.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</label>
                                        <textarea value={transferForm.reason} onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 h-20 resize-none" placeholder="Reason for transfer..." />
                                    </div>

                                    <button onClick={handleStudentTransfer} disabled={loading}
                                        className="w-full bg-[#111C44] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#1a2a5e] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                        <ArrowRightLeft size={16} /> {loading ? 'Processing Transfer...' : 'Transfer Student'}
                                    </button>
                                </div>
                            </div>

                            {/* Info Panel */}
                            <div className="xl:col-span-5 space-y-6">
                                <div className="bg-[#111C44] rounded-3xl p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
                                    <h3 className="text-lg font-black mb-4">Transfer Process</h3>
                                    <div className="space-y-4 text-sm text-white/70">
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div><p>Old enrollment marked as <span className="text-yellow-400 font-bold">Transferred</span></p></div>
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div><p>Transcript PDF can be generated</p></div>
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div><p>New enrollment created at target school</p></div>
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div><p>Academic history fully <span className="text-emerald-400 font-bold">preserved</span></p></div>
                                    </div>
                                </div>
                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-black text-amber-800 text-sm mb-1">Important Notice</h4>
                                            <p className="text-amber-700 text-xs leading-relaxed">Student records are <strong>never deleted</strong>. Transfers preserve all grades, exam results, and academic history across schools.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================== TEACHER TRANSFER TAB ======================== */}
                    {activeTab === 'teacher-transfer' && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            <div className="xl:col-span-7 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                <h2 className="text-xl font-black mb-2">Transfer / Replace Teacher</h2>
                                <p className="text-sm text-slate-400 mb-6">Mark current assignments as "Replaced". Optionally assign a replacement teacher.</p>

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Teacher *</label>
                                        <div className="relative mt-1">
                                            <Search size={16} className="absolute left-4 top-3.5 text-slate-300" />
                                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Search teacher by name or email..." />
                                        </div>
                                        {searchQuery && (
                                            <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-1">
                                                {filteredTeachers.slice(0, 10).map(t => (
                                                    <button key={t.UserId} onClick={() => { setTransferForm({ ...transferForm, entityId: String(t.UserId) }); setSearchQuery(''); }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-3 ${transferForm.entityId === String(t.UserId) ? 'bg-blue-50' : ''}`}>
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">{t.FullName[0]}</div>
                                                        <div>
                                                            <p className="font-bold text-sm">{t.FullName}</p>
                                                            <p className="text-xs text-slate-400">{t.Email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {transferForm.entityId && (
                                            <div className="mt-2 bg-purple-50 px-4 py-2 rounded-xl text-sm font-bold text-purple-700 flex items-center gap-2">
                                                <UserCheck size={14} /> Selected: {teachers.find(t => String(t.UserId) === transferForm.entityId)?.FullName}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer To School (Optional)</label>
                                        <select value={transferForm.toSchoolId} onChange={e => setTransferForm({ ...transferForm, toSchoolId: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-bold">
                                            <option value="">Keep at current school (replacement only)</option>
                                            {schools.map(s => <option key={s.Id} value={s.Id}>{s.Name} ({s.Code})</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Replacement Teacher (Optional)</label>
                                        <select value={transferForm.replacementTeacherId} onChange={e => setTransferForm({ ...transferForm, replacementTeacherId: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-bold">
                                            <option value="">No replacement assigned</option>
                                            {teachers.filter(t => String(t.UserId) !== transferForm.entityId).map(t => <option key={t.UserId} value={t.UserId}>{t.FullName}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</label>
                                        <textarea value={transferForm.reason} onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 h-20 resize-none" placeholder="Reason for transfer/replacement..." />
                                    </div>

                                    <button onClick={handleTeacherTransfer} disabled={loading}
                                        className="w-full bg-[#111C44] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#1a2a5e] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                        <ArrowRightLeft size={16} /> {loading ? 'Processing...' : 'Transfer / Replace Teacher'}
                                    </button>
                                </div>
                            </div>

                            <div className="xl:col-span-5 space-y-6">
                                <div className="bg-[#111C44] rounded-3xl p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
                                    <h3 className="text-lg font-black mb-4">Teacher Transfer Process</h3>
                                    <div className="space-y-4 text-sm text-white/70">
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div><p>All active assignments marked <span className="text-yellow-400 font-bold">Replaced</span></p></div>
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div><p>Replacement teacher gets new assignments</p></div>
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div><p>Old teacher's grading history <span className="text-emerald-400 font-bold">preserved</span></p></div>
                                        <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div><p>GradedBy field tracks grading teacher per score</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================== TRANSFER HISTORY TAB ======================== */}
                    {activeTab === 'history' && (
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black">Transfer History</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <History size={14} /> {transfers.length} records
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-slate-100 border-t-[#111C44] rounded-full animate-spin"></div>
                                </div>
                            ) : transfers.length === 0 ? (
                                <div className="text-center py-20">
                                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold">No transfer records yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transfers.map(t => (
                                        <div key={t.Id} className="flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-50">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.EntityType === 'Student' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                                                {t.EntityType === 'Student' ? <GraduationCap size={18} /> : <UserCheck size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm">{t.EntityName}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.EntityType === 'Student' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{t.EntityType}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                                    <span>{t.FromSchoolName}</span>
                                                    <ArrowRightLeft size={10} />
                                                    <span className="font-bold text-slate-600">{t.ToSchoolName}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">{new Date(t.TransferDate).toLocaleDateString()}</p>
                                                {t.CumulativeAverage && <p className="text-xs font-bold text-emerald-600">Avg: {t.CumulativeAverage}%</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TransferManagement;



