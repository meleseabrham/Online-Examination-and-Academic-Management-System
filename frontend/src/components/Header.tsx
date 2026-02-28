import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Bell, Search, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface HeaderProps {
    email: string;
    role: string;
    showAnnouncement?: boolean;
}

const Header = ({ email, role }: HeaderProps) => {
    const [announcementCount, setAnnouncementCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();

    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const avatarUrl = user.ProfileImage
        ? `http://localhost:5000/${user.ProfileImage}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || role)}&background=random`;

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`http://localhost:5000/api/auth/announcement/latest?role=${role}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
                setAnnouncementCount(data.length);
            } catch (err) {
                console.error('Error fetching announcements:', err);
            }
        };
        fetchAnnouncements();
        const interval = setInterval(fetchAnnouncements, 60000); // 1 minute
        return () => clearInterval(interval);
    }, [role]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleBellClick = () => {
        const roleLower = role.toLowerCase();
        const basePath = roleLower === 'admin' ? '/admin' : (roleLower === 'student' ? '/student' : (roleLower === 'director' ? '/director' : '/teacher'));
        navigate(`${basePath}/announcements`);
    };

    return (
        <div className="flex flex-col gap-4 mb-8">
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-sm shadow-slate-200/50 relative z-[60]">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-10 pr-4 py-2 bg-brand-background rounded-2xl border-none focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm transition-all"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBellClick}
                        className={cn(
                            "p-2 text-slate-400 hover:text-brand-blue hover:bg-white rounded-xl transition-all relative group",
                            announcementCount > 0 && "animate-blink"
                        )}
                    >
                        <Bell size={20} className={cn(announcementCount > 0 && "text-brand-blue animate-bell-swing")} />
                        {announcementCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-notification shadow-lg shadow-red-500/20">
                                {announcementCount}
                            </span>
                        )}
                    </button>

                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

                    <div className="relative">
                        <div
                            className="flex items-center gap-3 cursor-pointer p-1 pr-3 hover:bg-white/50 rounded-2xl transition-all group"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-indigo-600 p-[2px] shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-transform shrink-0">
                                <div className="w-full h-full bg-white rounded-[10px] overflow-hidden">
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-sm font-bold text-[#2B3674] leading-tight line-clamp-1">{email}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
                            </div>
                            <ChevronDown size={14} className={cn("text-slate-400 transition-transform ml-1", isDropdownOpen && "rotate-180")} />
                        </div>

                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-60 bg-white rounded-[32px] shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                                    <div className="px-3 space-y-0.5">
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-2xl transition-all group"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-brand-blue/10 transition-colors shrink-0">
                                                <User size={18} />
                                            </div>
                                            <span className="text-sm font-bold">My Profile</span>
                                        </Link>

                                        <Link
                                            to="/profile?tab=settings"
                                            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-2xl transition-all group"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-brand-blue/10 transition-colors shrink-0">
                                                <Settings size={18} />
                                            </div>
                                            <span className="text-sm font-bold">Settings</span>
                                        </Link>
                                    </div>

                                    <div className="h-[1px] bg-slate-50 my-1 mx-6"></div>

                                    <div className="px-3">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-2xl transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                                <LogOut size={18} />
                                            </div>
                                            <span className="text-sm font-black  tracking-widest">Logout</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
