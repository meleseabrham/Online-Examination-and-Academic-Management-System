import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => localStorage.getItem('sidebarCollapsed') === 'true'
    );
    const navigate = useNavigate();
    const location = useLocation();

    const pageInfo = getPageTitle(location.pathname);

    // Keep in sync if Sidebar also toggles internally
    useEffect(() => {
        const onSidebarChange = () => {
            setIsSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true');
        };
        window.addEventListener('sidebar-changed', onSidebarChange);
        return () => window.removeEventListener('sidebar-changed', onSidebarChange);
    }, []);

    const handleSidebarToggle = () => {
        const next = !isSidebarCollapsed;
        localStorage.setItem('sidebarCollapsed', String(next));
        setIsSidebarCollapsed(next);
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
    };

    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const avatarUrl = user.ProfileImage
        ? `http://localhost:5000/${user.ProfileImage}`
        : null;

    const getUserDisplayName = () => {
        if (user.fullName) return user.fullName;
        if (user.FullName) return user.FullName;
        if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (user.FirstName || user.LastName) return `${user.FirstName || ''} ${user.LastName || ''}`.trim();
        return email;
    };

    const getInitials = () => {
        const name = getUserDisplayName();
        if (!name || name === email) return '??';
        const parts = name.split(' ').filter((p: string) => p.trim());
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
                <div className="flex items-center gap-3 pl-2">
                    <button
                        onClick={handleSidebarToggle}
                        className="p-1.5 rounded-xl text-[#1B2559] hover:bg-slate-100 transition-all duration-200 active:scale-95"
                        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isSidebarCollapsed
                            ? <MenuUnfoldOutlined style={{ fontSize: 20 }} />
                            : <MenuFoldOutlined style={{ fontSize: 20 }} />}
                    </button>
                    <h1 className="text-xl sm:text-2xl font-black text-[#1B2559] tracking-tight leading-none drop-shadow-sm">
                        {pageInfo.title}
                    </h1>
                </div>

                <div className="flex items-center gap-4 ">
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
                            className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <div className="w-10 h-10 rounded-full bg-brand-blue text-white font-bold text-sm flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <span>{getInitials()}</span>
                                )}
                            </div>
                            <div className="hidden sm:block px-4 py-2 bg-slate-100/80 hover:bg-slate-100 rounded-2xl text-sm font-bold text-[#2B3674] transition-colors whitespace-nowrap">
                                {getUserDisplayName()}
                            </div>
                        </div>

                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-55 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                    <div className="space-y-0.5">
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-2.5 px-3 py-1.5 text-[#1B2559] hover:bg-slate-50 rounded-xl transition-all group font-semibold text-sm"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <User size={18} className="text-brand-blue" />
                                            <span>Personal Info</span>
                                        </Link>

                                        <Link
                                            to="/profile?tab=settings"
                                            className="flex items-center gap-2.5 px-3 py-1.5 text-[#1B2559] hover:bg-slate-50 rounded-xl transition-all group font-semibold text-sm"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <Settings size={18} className="text-brand-blue" />
                                            <span>Settings</span>
                                        </Link>
                                    </div>

                                    <div className="border-t border-slate-100 my-1"></div>

                                    <div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all group font-bold text-sm"
                                        >
                                            <LogOut size={18} className="text-red-500" />
                                            <span>Logout</span>
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
