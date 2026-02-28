import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Power, ChevronDown, ChevronUp,
    Upload, Camera, X, Image as ImageIcon,
    School,
    AlertTriangle, CheckCircle2, Info
} from 'lucide-react';

interface SystemSetting {
    Id: number;
    SettingKey: string;
    SettingValue: string;
    EntityType: string | null;
    EntityId: number | null;
}

const SystemSettings = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };

    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Filter data
    const [schoolName, setSchoolName] = useState('');
    const [systemVersion, setSystemVersion] = useState('');
    const [supportEmail, setSupportEmail] = useState('');
    const [schoolPhone, setSchoolPhone] = useState('');
    const [schoolAddress, setSchoolAddress] = useState('');
    const [schoolLogo, setSchoolLogo] = useState('');
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Accordion state
    const [activeSection, setActiveSection] = useState<string | null>('logo');

    const toggleSection = (section: string) => {
        setActiveSection(prev => prev === section ? null : section);
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/system-settings', { headers });
            setSettings(res.data);

            // Initialize states
            const sName = res.data.find((s: any) => s.SettingKey === 'SchoolName')?.SettingValue;
            const sVer = res.data.find((s: any) => s.SettingKey === 'SystemVersion')?.SettingValue;
            const sEmail = res.data.find((s: any) => s.SettingKey === 'SupportEmail')?.SettingValue;
            const sLogo = res.data.find((s: any) => s.SettingKey === 'SchoolLogo')?.SettingValue;
            const sPhone = res.data.find((s: any) => s.SettingKey === 'SchoolPhone')?.SettingValue;
            const sAddress = res.data.find((s: any) => s.SettingKey === 'SchoolAddress')?.SettingValue;

            if (sName) setSchoolName(sName);
            if (sVer) setSystemVersion(sVer);
            if (sEmail) setSupportEmail(sEmail);
            if (sLogo) setSchoolLogo(sLogo);
            if (sPhone) setSchoolPhone(sPhone);
            if (sAddress) setSchoolAddress(sAddress);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };


    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSaveSchoolInfo = async () => {
        try {
            setSaving(true);
            await Promise.all([
                axios.post('http://localhost:5000/api/admin/system-settings', { key: 'SchoolName', value: schoolName }, { headers }),
                axios.post('http://localhost:5000/api/admin/system-settings', { key: 'SystemVersion', value: systemVersion }, { headers }),
                axios.post('http://localhost:5000/api/admin/system-settings', { key: 'SupportEmail', value: supportEmail }, { headers }),
                axios.post('http://localhost:5000/api/admin/system-settings', { key: 'SchoolPhone', value: schoolPhone }, { headers }),
                axios.post('http://localhost:5000/api/admin/system-settings', { key: 'SchoolAddress', value: schoolAddress }, { headers })
            ]);
            setMessage({ type: 'success', text: 'School Information saved successfully' });
            fetchSettings();
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleUpdateGlobal = async (key: string, value: string) => {
        try {
            setSaving(true);
            await axios.post('http://localhost:5000/api/admin/system-settings', {
                key, value
            }, { headers });
            setMessage({ type: 'success', text: `${key} updated successfully` });
            fetchSettings();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update setting';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleSaveLogo = async () => {
        if (!selectedLogoFile) return;

        const formData = new FormData();
        formData.append('logo', selectedLogoFile);

        try {
            setSaving(true);
            const res = await axios.post('http://localhost:5000/api/admin/system-settings/logo', formData, {
                headers: {
                    ...headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setSchoolLogo(res.data.url);
            setSelectedLogoFile(null);
            setLogoPreview(null);
            setMessage({ type: 'success', text: 'Logo saved successfully' });
            fetchSettings();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to save logo' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleLogoDelete = async () => {
        if (!window.confirm('Remove institutional logo?')) return;
        try {
            setSaving(true);
            await axios.delete('http://localhost:5000/api/admin/system-settings/logo', { headers });
            setSchoolLogo('');
            setMessage({ type: 'success', text: 'Logo removed' });
            fetchSettings();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete logo' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };


    const maintenanceMode = settings.find(s => s.SettingKey === 'MaintenanceMode' && !s.EntityType)?.SettingValue === 'true';

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role="admin" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none z-10">
                    <Header email={user?.email} role="admin" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-[#2B3674]">System Settings</h1>
                            <p className="text-slate-500 mt-1">Global configurations, maintenance mode, and staff permissions.</p>
                        </div>
                        {saving && <div className="flex items-center gap-2 text-brand-blue font-bold text-sm"><Info className="animate-pulse" size={16} /> Saving changes...</div>}
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                            <span className="font-bold">{message.text}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section 1: Core System Control */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 overflow-hidden transition-all">
                                <button
                                    onClick={() => toggleSection('logo')}
                                    className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
                                            <ImageIcon size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-[#2B3674]">Institutional Logo</h2>
                                            <p className="text-sm text-slate-400 font-medium">Update branding logo across the platform.</p>
                                        </div>
                                    </div>
                                    {activeSection === 'logo' ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
                                </button>

                                {activeSection === 'logo' && (
                                    <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex flex-col md:flex-row items-center gap-8">
                                            <div className="relative group">
                                                <div className="w-32 h-32 rounded-[30px] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-blue">
                                                    {logoPreview ? (
                                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                                                    ) : schoolLogo ? (
                                                        <img src={`http://localhost:5000${schoolLogo}`} alt="School Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Camera size={32} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                                    )}
                                                </div>
                                                {(schoolLogo || logoPreview) && (
                                                    <button
                                                        onClick={() => {
                                                            if (logoPreview) {
                                                                setLogoPreview(null);
                                                                setSelectedLogoFile(null);
                                                            } else {
                                                                handleLogoDelete();
                                                            }
                                                        }}
                                                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow-lg border border-red-50 flex items-center justify-center hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-4 text-center md:text-left">
                                                <div>
                                                    <h3 className="font-black text-[#2B3674]">System Logo</h3>
                                                    <p className="text-xs text-slate-400 mt-1 font-bold">Recommended: Square SVG or PNG with transparent background. Max 2MB.</p>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-center md:justify-start gap-3">
                                                        <label className="cursor-pointer bg-slate-100 text-[#2B3674] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95 border border-slate-200">
                                                            <Upload size={16} />
                                                            {schoolLogo ? 'Change Logo' : 'Upload Logo'}
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={saving} />
                                                        </label>
                                                    </div>

                                                    {selectedLogoFile && (
                                                        <button
                                                            onClick={handleSaveLogo}
                                                            disabled={saving}
                                                            className="w-full md:w-fit bg-brand-blue text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 animate-in fade-in slide-in-from-top-2"
                                                        >
                                                            Save Institutional Logo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 overflow-hidden transition-all">
                                <button
                                    onClick={() => toggleSection('maintenance')}
                                    className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="bg-red-50 p-4 rounded-2xl text-red-500">
                                            <Power size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-[#2B3674]">Maintenance Mode</h2>
                                            <p className="text-sm text-slate-400 font-medium">Restricts all access to Admin only.</p>
                                        </div>
                                    </div>
                                    {activeSection === 'maintenance' ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
                                </button>

                                {activeSection === 'maintenance' && (
                                    <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-300">
                                        <div className={`p-6 rounded-[25px] border-2 transition-all flex items-center justify-between ${maintenanceMode ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${maintenanceMode ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                <div>
                                                    <span className={`block font-black text-sm uppercase tracking-widest ${maintenanceMode ? 'text-red-600' : 'text-slate-400'}`}>
                                                        {maintenanceMode ? 'System Offline' : 'System Online'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">Only admins can log in during maintenance.</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateGlobal('MaintenanceMode', maintenanceMode ? 'false' : 'true')}
                                                disabled={saving}
                                                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${maintenanceMode ? 'bg-white text-red-600 border border-red-200 shadow-sm' : 'bg-brand-blue text-white shadow-lg shadow-blue-500/20'}`}
                                            >
                                                {maintenanceMode ? 'Disable' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 overflow-hidden transition-all">
                                <button
                                    onClick={() => toggleSection('school')}
                                    className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-500">
                                            <School size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-[#2B3674]">School Information</h2>
                                            <p className="text-sm text-slate-400 font-medium">Customize system appearance identity.</p>
                                        </div>
                                    </div>
                                    {activeSection === 'school' ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
                                </button>

                                {activeSection === 'school' && (
                                    <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Display Name</label>
                                            <input
                                                type="text"
                                                value={schoolName}
                                                onChange={(e) => setSchoolName(e.target.value)}
                                                className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                                                placeholder="School Name"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">System Version</label>
                                                <input
                                                    type="text"
                                                    value={systemVersion}
                                                    onChange={(e) => setSystemVersion(e.target.value)}
                                                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                                                    placeholder="v1.0.0"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Support Email</label>
                                                <input
                                                    type="email"
                                                    value={supportEmail}
                                                    onChange={(e) => setSupportEmail(e.target.value)}
                                                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                                                    placeholder="support@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Phone</label>
                                                <input
                                                    type="text"
                                                    value={schoolPhone}
                                                    onChange={(e) => setSchoolPhone(e.target.value)}
                                                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                                                    placeholder="+123..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">School Address</label>
                                                <input
                                                    type="text"
                                                    value={schoolAddress}
                                                    onChange={(e) => setSchoolAddress(e.target.value)}
                                                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold text-sm text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                                                    placeholder="City, Country..."
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveSchoolInfo}
                                            disabled={saving}
                                            className="w-full bg-[#2B3674] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            Save School Identity
                                        </button>
                                    </div>
                                )}
                            </div>



                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};


export default SystemSettings;
