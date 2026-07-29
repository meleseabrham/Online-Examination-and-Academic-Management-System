import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
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

const getPageTitle = (pathname: string): { title: string } => {
    const p = pathname.toLowerCase();

    // Admin Routes
    if (p.includes('/admin/courses') || p.includes('/admin/manage-courses')) return { title: 'Course Management' };
    if (p.includes('/admin/users') || p.includes('/admin/manage-users')) return { title: 'User Management' };
    if (p.includes('/admin/classes') || p.includes('/admin/manage-classes')) return { title: 'Class Management' };
    if (p.includes('/admin/academic')) return { title: 'Academic Management' };
    if (p.includes('/admin/guides')) return { title: 'Guide Management' };
    if (p.includes('/admin/announcements')) return { title: 'Announcements' };
    if (p.includes('/admin/audit-logs')) return { title: 'Audit Logs' };
    if (p.includes('/admin/system')) return { title: 'System Settings' };
    if (p.includes('/admin/reports')) return { title: 'Analytics & Reports' };
    if (p.includes('/admin/transfers')) return { title: 'Transfer Management' };
    if (p.includes('/admin/assignments')) return { title: 'Teacher Assignments' };
    if (p.includes('/admin/assessments') || p.includes('/admin/results')) return { title: 'Assessment Results' };
    if (p === '/admin' || p === '/admin/dashboard') return { title: 'Main Dashboard' };

    // Director Routes
    if (p.includes('/director/academic')) return { title: 'Academic Operations' };
    if (p.includes('/director/teachers')) return { title: 'Teacher Oversight' };
    if (p.includes('/director/results')) return { title: 'Student Performance' };
    if (p.includes('/director/assessments')) return { title: 'Assessment Review' };
    if (p.includes('/director/reports')) return { title: 'Institutional Intelligence' };
    if (p.includes('/director/live-monitor')) return { title: 'Live Proctor Monitor' };
    if (p.includes('/director/announcements')) return { title: 'Announcements' };
    if (p === '/director' || p === '/director/dashboard') return { title: 'Director Dashboard' };

    // Teacher Routes
    if (p.includes('/teacher/classes')) return { title: 'My Classes' };
    if (p.includes('/teacher/courses')) return { title: 'My Courses' };
    if (p.includes('/teacher/exams') || p.includes('/teacher/manage-exams')) return { title: 'Exams & Assessments' };
    if (p.includes('/teacher/results')) return { title: 'Exam Results' };
    if (p.includes('/teacher/assignments')) return { title: 'Teacher Assignments' };
    if (p.includes('/teacher/live-monitor')) return { title: 'Live Exam Monitor' };
    if (p.includes('/teacher/announcements')) return { title: 'Announcements' };
    if (p === '/teacher' || p === '/teacher/dashboard') return { title: 'Teacher Dashboard' };

    // Student Routes
    if (p.includes('/student/exams') || p.includes('/student/take-exam')) return { title: 'My Assessments' };
    if (p.includes('/student/results')) return { title: 'My Grades & Results' };
    if (p.includes('/student/transcripts')) return { title: 'Academic Transcript' };
    if (p.includes('/student/assignments')) return { title: 'My Assignments' };
    if (p.includes('/student/announcements')) return { title: 'Announcements' };
    if (p === '/student' || p === '/student/dashboard') return { title: 'Student Portal' };

    // Shared & Profile
    if (p.includes('/profile')) return { title: 'User Profile' };

    return { title: 'Dashboard' };
};

const Header = ({ email, role }: HeaderProps) => {
    const [announcementCount, setAnnouncementCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const pageInfo = getPageTitle(location.pathname);

    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const avatarUrl = user.ProfileImage
        ? `http://localhost:5000/${user.ProfileImage}`
        : null;

    const getInitials = () => {
        if (user.firstName && user.lastName) {
            return (user.firstName[0] + user.lastName[0]).toUpperCase();
        }
        if (!user.fullName) return '??';
        const parts = user.fullName.split(' ').filter((p: string) => p.trim());
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

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
                <div className="flex items-center pl-2">
                    <h1 className="text-xl sm:text-2xl font-black text-[#1B2559] tracking-tight leading-none drop-shadow-sm">
                        {pageInfo.title}
                    </h1>
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
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-blue to-indigo-600 p-[2px] shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-transform shrink-0">
                                <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-brand-blue">
                                            {getInitials()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-sm font-bold text-[#2B3674] leading-tight line-clamp-1">
                                    {user.firstName ? `${user.firstName} ${user.lastName}` : <span className="italic">{email}</span>}
                                </p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {(user.role !== 'Student' && user.title) ? user.title : role}
                                </p>
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
