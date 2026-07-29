import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Calendar, Trash2, ChevronDown, ChevronUp,
    Shield, Clock, GraduationCap, School,
    AlertTriangle, CheckCircle2, Info
} from 'lucide-react';

interface SystemSetting {
    Id: number;
    SettingKey: string;
    SettingValue: string;
    EntityType: string | null;
    EntityId: number | null;
}

const DirectorSettings = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };

    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Filter data
    const [years, setYears] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    // Form for new regrade permission
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSem, setSelectedSem] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    const [activeSection, setActiveSection] = useState<string | null>('regrade');

    // Director Regrade state
    const directorRegradeSetting = settings.find(s => s.SettingKey === 'DirectorGlobalRegrade');
    const isDirectorRegradeEnabled = directorRegradeSetting?.SettingValue === 'true';

    const toggleSection = (section: string) => {
        setActiveSection(prev => prev === section ? null : section);
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/director/system-settings', { headers });
            setSettings(res.data);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [yRes, sRes, gRes] = await Promise.all([
                axios.get('http://localhost:5000/api/director/academic-years', { headers }),
                axios.get('http://localhost:5000/api/director/semesters', { headers }),
                axios.get('http://localhost:5000/api/director/grades', { headers })
            ]);
            setYears(yRes.data);
            setSemesters(sRes.data);
            setGrades(gRes.data);
        } catch (err) {
            console.error('Error fetching metadata:', err);
        }
    };

    useEffect(() => {
        if (selectedGrade) {
            axios.get(`http://localhost:5000/api/director/sections?gradeId=${selectedGrade}`, { headers })
                .then(res => setSections(res.data));
        } else {
            setSections([]);
        }
    }, [selectedGrade]);

    useEffect(() => {
        fetchSettings();
        fetchMetadata();
    }, []);

    const handleUpdatePermission = async (perm: any, value: string) => {
        try {
            setSaving(true);
            await axios.post('http://localhost:5000/api/director/system-settings', {
                key: 'TeacherRegrade',
                value: value,
                entityType: perm.EntityType,
                entityId: perm.EntityId
            }, { headers });
            fetchSettings();
            setMessage({ type: 'success', text: 'Permission updated' });
        } catch (err: any) {
            console.error('Update Permission Error:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update permission';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const toggleDirectorGlobalRegrade = async () => {
        try {
            setSaving(true);
            const newValue = isDirectorRegradeEnabled ? 'false' : 'true';
            await axios.post('http://localhost:5000/api/director/system-settings', {
                key: 'DirectorGlobalRegrade',
                value: newValue,
                entityType: null,
                entityId: null
            }, { headers });
            fetchSettings();
            setMessage({ type: 'success', text: `Director Regrade is now ${newValue === 'true' ? 'enabled' : 'disabled'}` });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Update failed' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDeletePermission = async (id: number) => {
        if (!window.confirm('Delete this permission?')) return;
        try {
            setSaving(true);
            await axios.delete(`http://localhost:5000/api/director/system-settings/${id}`, { headers });
            fetchSettings();
            setMessage({ type: 'success', text: 'Permission removed' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to remove' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const addPermission = async () => {
        if (!selectedYear && !selectedSem && !selectedGrade) {
            alert('Please select at least one level to apply permission');
            return;
        }

        let entityType = '';
        let entityId = '';

        if (selectedSection) { entityType = 'Section'; entityId = selectedSection; }
        else if (selectedGrade) { entityType = 'Grade'; entityId = selectedGrade; }
        else if (selectedSem) { entityType = 'Semester'; entityId = selectedSem; }
        else if (selectedYear) { entityType = 'AcademicYear'; entityId = selectedYear; }

        try {
            setSaving(true);
            await axios.post('http://localhost:5000/api/director/system-settings', {
                key: 'TeacherRegrade',
                value: 'false',
                entityType,
                entityId: parseInt(entityId)
            }, { headers });
            fetchSettings();
            setSelectedYear(''); setSelectedSem(''); setSelectedGrade(''); setSelectedSection('');
            setMessage({ type: 'success', text: 'New restriction added' });
        } catch (err: any) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Action failed';
            alert(`Error: ${errorMsg}`);
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="director" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none z-10">
                    <Header email={user?.email} role="director" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">


                    {message && (
                        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                            <span className="font-bold">{message.text}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white rounded-[35px] justify-between shadow-sm border border-slate-100 overflow-hidden transition-all flex items-center p-8">
                                <div className="flex items-center gap-4 text-left">
                                    <div className={`p-4 rounded-2xl ${isDirectorRegradeEnabled ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[#2B3674]">Director Regrade</h2>
                                        <p className="text-sm text-slate-400 font-medium">Allow directors to regrade past 30-day deadline.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleDirectorGlobalRegrade}
                                    className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isDirectorRegradeEnabled ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {isDirectorRegradeEnabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>

                            <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 overflow-hidden transition-all">
                                <button
                                    onClick={() => toggleSection('regrade')}
                                    className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="bg-blue-50 p-4 rounded-2xl text-brand-blue">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-[#2B3674]">Teacher Re-grade Permission</h2>
                                            <p className="text-sm text-slate-400 font-medium">Enable/Disable regrade button for teachers.</p>
                                        </div>
                                    </div>
                                    {activeSection === 'regrade' ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
                                </button>

                                {activeSection === 'regrade' && (
                                    <div className="px-8 pb-8 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-2 gap-4">
                                            <select className="p-3 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                                <option value="">Year...</option>
                                                {years.map(y => <option key={y.Id} value={y.Id}>{y.Name}</option>)}
                                            </select>
                                            <select className="p-3 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm" value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)}>
                                                <option value="">Semester...</option>
                                                {semesters.filter(s => !selectedYear || s.AcademicYearId === parseInt(selectedYear)).map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                            </select>
                                            <select className="p-3 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                                                <option value="">Grade...</option>
                                                {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                            </select>
                                            <select className="p-3 bg-slate-50 border-none rounded-xl text-sm font-bold shadow-sm" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedGrade}>
                                                <option value="">Section...</option>
                                                {sections.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={addPermission} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-[#2B3674] font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-200">
                                            Set Custom Restriction
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-amber-50 p-4 rounded-2xl text-amber-500">
                                    <Clock size={24} />
                                </div>
                                <h2 className="text-xl font-black text-[#2B3674]">Active Permissions</h2>
                            </div>

                            <div className="space-y-4 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
                                {settings.filter(s => s.SettingKey === 'TeacherRegrade').length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                            <Info size={32} />
                                        </div>
                                        <p className="text-slate-400 font-bold text-sm">No custom regrade permissions set.</p>
                                    </div>
                                ) : (
                                    settings.filter(s => s.SettingKey === 'TeacherRegrade').map((perm) => (
                                        <div key={perm.Id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group border border-transparent hover:border-slate-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    {perm.EntityType === 'AcademicYear' && <Calendar size={16} className="text-blue-500" />}
                                                    {perm.EntityType === 'Semester' && <Clock size={16} className="text-indigo-500" />}
                                                    {perm.EntityType === 'Grade' && <GraduationCap size={16} className="text-purple-500" />}
                                                    {perm.EntityType === 'Section' && <School size={16} className="text-emerald-500" />}
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{perm.EntityType} ID: {perm.EntityId}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-black ${perm.SettingValue === 'true' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {perm.SettingValue === 'true' ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                        <span className="text-slate-300 text-xs">|</span>
                                                        <span className="text-xs text-slate-500 font-bold">Re-grade Button</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdatePermission(perm, perm.SettingValue === 'true' ? 'false' : 'true')}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${perm.SettingValue === 'true' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                >
                                                    {perm.SettingValue === 'true' ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePermission(perm.Id)}
                                                    className="p-2.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100 active:scale-95"
                                                    title="Remove Permission"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DirectorSettings;



