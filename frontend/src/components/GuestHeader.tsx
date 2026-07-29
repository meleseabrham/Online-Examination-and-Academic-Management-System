import { useState, useEffect } from 'react';
import { Bell, AlertCircle, Clock, X, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Announcement {
    Title: string;
    Content: string;
    Deadline?: string;
    CreatedAt: string;
}

const GuestHeader = () => {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showRedDot, setShowRedDot] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [logo, setLogo] = useState('');

    useEffect(() => {
        const fetchPublicSettings = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/auth/system-settings/public');
                const sName = res.data.find((s: any) => s.SettingKey === 'SchoolName')?.SettingValue;
                const sLogo = res.data.find((s: any) => s.SettingKey === 'SchoolLogo')?.SettingValue;
                if (sName) setSchoolName(sName);
                if (sLogo) setLogo(sLogo);
            } catch (err) {
                console.error('Error fetching public settings:', err);
            }
        };
        fetchPublicSettings();
    }, []);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/auth/announcement/latest');
                const data = Array.isArray(response.data) ? response.data :
                    (response.data ? [response.data] : []);
                setAnnouncements(data);
                if (data.length > 0) setShowRedDot(true);
            } catch (err) {
                console.error('Error fetching announcements:', err);
            }
        };
        fetchAnnouncements();
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setShowRedDot(false); // Clear dot when opened
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-xl border-b border-white/20 shadow-sm">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
                <div className="w-10 h-10  rounded-xl flex items-center justify-center  overflow-hidden">
                    {logo ? (
                        <img src={`http://localhost:5000${logo}`} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white font-black text-xl">O</span>
                    )}
                </div>
                <h1 className="text-xl font-black text-[#1B2559] tracking-tight">

                    {/* Mobile View - Acronym */}
                    <span className="sm:hidden text-brand-blue">
                        {schoolName
                            ? schoolName
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase())
                                .join('')
                            : "AEMS"}
                    </span>

                    {/* Desktop View - Full Name */}
                    <span className="hidden sm:inline">
                        {schoolName ? (
                            <>
                                {schoolName.split(' ')[0]}{" "}
                                <span >
                                    {schoolName.split(' ').slice(1).join(' ')}
                                </span>
                            </>
                        ) : (
                            <span >
                                AEMS
                            </span>
                        )}
                    </span>

                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Announcement Bell */}
                <div className="relative">
                    <button
                        onClick={toggleDropdown}
                        className={`p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-brand-blue hover:shadow-lg hover:shadow-blue-500/5 transition-all relative group ${showRedDot ? 'animate-blink' : ''}`}
                    >
                        <Bell size={24} className={showRedDot ? 'animate-bell-swing' : ''} />
                        {announcements.length > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-notification shadow-lg shadow-red-500/20">
                                {announcements.length}
                            </span>
                        )}
                    </button>

                    {/* Announcement Dropdown */}
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                            <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white rounded-[35px] shadow-2xl border border-slate-50 py-6 z-20 animate-in slide-in-from-top-4 duration-300 origin-top-right overflow-hidden">
                                <div className="px-6 pb-4 border-b border-slate-50 flex justify-between items-center">
                                    <h3 className="font-black text-[#1B2559] flex items-center gap-2">
                                        <Megaphone size={18} className="text-brand-blue" />
                                        Announcements
                                    </h3>
                                    <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-500">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="max-h-[70vh] overflow-y-auto px-4 py-2 custom-scrollbar">
                                    {announcements.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <AlertCircle size={40} className="text-slate-100 mx-auto mb-3" />
                                            <p className="text-slate-400 font-bold text-sm">No active announcements</p>
                                        </div>
                                    ) : (
                                        announcements.map((ann, idx) => (
                                            <div key={idx} className="p-4 hover:bg-slate-50 rounded-[24px] transition-all group mb-2 border border-transparent hover:border-slate-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                                        New
                                                    </span>
                                                    {ann.Deadline && (
                                                        <span className="text-[10px] font-black text-red-500 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(ann.Deadline).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-[#1B2559] mb-1 group-hover:text-brand-blue transition-colors">
                                                    {ann.Title}
                                                </h4>
                                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                                                    {ann.Content}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Login Tab */}
                {/* <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-blue text-white font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-600 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                    <LogIn size={18} />
                    Login
                </button> */}
            </div>
        </header>
    );
};

export default GuestHeader;
