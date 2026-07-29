import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard, Users, Calendar, School, BookOpen, GraduationCap,
    FileText, Trophy, Radio, TrendingUp, Megaphone, PlusCircle, LogOut,
    ChevronDown, Clock, UserPlus,
    ArrowRightLeft, ClipboardList, Library, Database, Settings, UserCheck, ShieldCheck
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SidebarLink {
    title: string;
    icon: JSX.Element;
    path: string;
    badge?: number;
    live?: boolean;
    children?: { title: string; path: string; icon: JSX.Element }[];
}

const Sidebar = ({ role }: { role: 'admin' | 'teacher' | 'student' | 'director' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');
    const [notifications, setNotifications] = useState({ exams: 0, assignments: 0, announcements: 0, liveExams: 0 });
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true';
    });
    const [academicOpen, setAcademicOpen] = useState(false);
    const [publicSettings, setPublicSettings] = useState<any>({});

    useEffect(() => {
        const fetchPublicSettings = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/auth/system-settings/public');
                const settingsMap = res.data.reduce((acc: any, curr: any) => {
                    acc[curr.SettingKey] = curr.SettingValue;
                    return acc;
                }, {});
                setPublicSettings(settingsMap);
            } catch (err) {
                console.error('Error fetching public settings:', err);
            }
        };
        fetchPublicSettings();
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(isCollapsed));
        // Notify Header that sidebar state changed from within
        window.dispatchEvent(new CustomEvent('sidebar-changed'));
    }, [isCollapsed]);

    // Listen for toggle events fired by the Header button
    useEffect(() => {
        const onToggle = (e: Event) => {
            const collapsed = (e as CustomEvent).detail?.collapsed;
            if (typeof collapsed === 'boolean') setIsCollapsed(collapsed);
        };
        window.addEventListener('sidebar-toggle', onToggle);
        return () => window.removeEventListener('sidebar-toggle', onToggle);
    }, []);

    useEffect(() => {
        if ((role === 'student' || role === 'teacher' || role === 'admin' || role === 'director') && token) {
            const fetchNotifications = async () => {
                try {
                    const endpoint = role === 'student' ? 'student' : (role === 'teacher' ? 'teacher' : (role === 'director' ? 'director' : 'admin'));
                    const res = await axios.get(`http://localhost:5000/api/${endpoint}/notifications`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setNotifications(prev => ({ ...prev, ...res.data }));
                } catch (err) {
                    console.error('Error fetching notifications:', err);
                }
            };
            console.log('[Sidebar] Fetching notifications for role:', role);
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 10000);
            return () => clearInterval(interval);
        }
    }, [role, token]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const adminLinks: SidebarLink[] = [
        { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
        { title: 'Manage Users', icon: <Users size={20} />, path: '/admin/users' },
        {
            title: 'Manage Academic',
            icon: <Calendar size={20} />,
            path: '/admin/academic',
            children: [
                { title: 'Years', path: '/admin/academic?tab=years', icon: <Clock size={16} /> },
                { title: 'Semesters', path: '/admin/academic?tab=semesters', icon: <Calendar size={16} /> },
                // { title: 'Grades', path: '/admin/academic?tab=grades', icon: <GraduationCap size={16} /> },
                { title: 'Enrollment', path: '/admin/academic?tab=enrollment', icon: <UserPlus size={16} /> },
                { title: 'Backups', path: '/admin/academic?tab=backups', icon: <Database size={16} /> },
            ]
        },
        { title: 'Live Monitor', icon: <Radio size={20} />, path: '/admin/live-monitor', live: notifications.liveExams > 0 },
        { title: 'System Reports', icon: <TrendingUp size={20} />, path: '/admin/reports' },
        { title: 'Announcements', icon: <Megaphone size={20} />, path: '/admin/announcements' },
        { title: 'System Guides', icon: <BookOpen size={20} />, path: '/admin/guides' },
        { title: 'System Settings', icon: <Settings size={20} />, path: '/admin/system-settings' },
        { title: 'Audit Logs', icon: <ShieldCheck size={20} />, path: '/admin/audit-logs' },
    ];

    const directorLinks: SidebarLink[] = [
        { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/director' },
        {
            title: 'Manage Academic',
            icon: <Calendar size={20} />,
            path: '/director/academic',
            children: [
                { title: 'Years', path: '/director/academic?tab=years', icon: <Clock size={16} /> },
                { title: 'Semesters', path: '/director/academic?tab=semesters', icon: <Calendar size={16} /> },
                { title: 'Enrollment', path: '/director/academic?tab=enrollment', icon: <UserPlus size={16} /> },
                { title: 'Results', path: '/director/academic?tab=results', icon: <Trophy size={16} /> },
                { title: 'Promotion', path: '/director/academic?tab=promotion', icon: <TrendingUp size={16} /> },
            ]
        },
        { title: 'Manage Courses', icon: <BookOpen size={20} />, path: '/director/courses' },
        { title: 'Manage Classes', icon: <School size={20} />, path: '/director/classes' },
        { title: 'Teachers', icon: <UserCheck size={20} />, path: '/director/teachers' },
        { title: 'Teacher Assign', icon: <GraduationCap size={20} />, path: '/director/assignments' },
        { title: 'Assessments', icon: <ClipboardList size={20} />, path: '/director/assessments' },
        { title: 'Assessment Results', icon: <Trophy size={20} />, path: '/director/assessment-results' },
        { title: 'Exam Results', icon: <FileText size={20} />, path: '/director/results' },
        { title: 'Class Rankings', icon: <Trophy size={20} />, path: '/director/rankings' },
        { title: 'Live Monitor', icon: <Radio size={20} />, path: '/director/live-monitor', live: notifications.liveExams > 0 },
        { title: 'Announcements', icon: <Megaphone size={20} />, path: '/director/announcements', badge: notifications.announcements },
        { title: 'Transfers', icon: <ArrowRightLeft size={20} />, path: '/director/transfers' },
        { title: 'System Settings', icon: <Settings size={20} />, path: '/director/system-settings' },
        // { title: 'Audit Logs', icon: <ShieldCheck size={20} />, path: '/director/audit-logs' },
        { title: 'Reports', icon: <TrendingUp size={20} />, path: '/director/reports' },
        { title: 'System Guides', icon: <BookOpen size={20} />, path: '/director/guides' },
    ];

    const teacherLinks: SidebarLink[] = [
        { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/teacher' },
        { title: 'My Classes', icon: <School size={20} />, path: '/teacher/classes' },
        { title: 'My Courses', icon: <BookOpen size={20} />, path: '/teacher/courses' },
        { title: 'Create Exam', icon: <PlusCircle size={20} />, path: '/teacher/create-exam' },
        { title: 'Assessments', icon: <ClipboardList size={20} />, path: '/teacher/assessments' },
        { title: 'Assessment Results', icon: <Trophy size={20} />, path: '/teacher/assessment-results' },
        { title: 'Assignments', icon: <FileText size={20} />, path: '/teacher/assignments' },
        { title: 'Exam Results', icon: <GraduationCap size={20} />, path: '/teacher/results' },
        { title: 'Course Modules', icon: <Library size={20} />, path: '/teacher/modules' },
        { title: 'Class Rankings', icon: <Trophy size={20} />, path: '/teacher/rankings' },
        { title: 'Live Monitor', icon: <Radio size={20} />, path: '/teacher/live-monitor', live: notifications.liveExams > 0 },
        { title: 'Announcements', icon: <Megaphone size={20} />, path: '/teacher/announcements', badge: notifications.announcements },
        { title: 'System Guides', icon: <BookOpen size={20} />, path: '/teacher/guides' },
    ];

    const studentLinks: SidebarLink[] = [
        { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/student' },
        { title: 'My Exams', icon: <BookOpen size={20} />, path: '/student/exams', badge: notifications.exams },
        { title: 'My Assessments', icon: <ClipboardList size={20} />, path: '/student/assessments' },
        { title: 'Assignments', icon: <FileText size={20} />, path: '/student/assignments', badge: notifications.assignments },
        { title: 'My Results', icon: <BookOpen size={20} />, path: '/student/results' },
        { title: 'Semester Results', icon: <TrendingUp size={20} />, path: '/student/semester-results' },
        { title: 'My Transcript', icon: <FileText size={20} />, path: '/student/transcript' },
        { title: 'My Ranking', icon: <Trophy size={20} />, path: '/student/rankings' },
        { title: 'Course Modules', icon: <Library size={20} />, path: '/student/modules' },
        { title: 'Announcements', icon: <Megaphone size={20} />, path: '/student/announcements', badge: notifications.announcements },
        { title: 'System Guides', icon: <BookOpen size={20} />, path: '/student/guides' },
    ];

    const links = role === 'admin' ? adminLinks : role === 'teacher' ? teacherLinks : role === 'director' ? directorLinks : studentLinks;

    return (
        <aside className={cn(
            "bg-[#111827] h-screen sticky top-0 flex flex-col p-4 text-[#fff] transition-all duration-300 relative z-50 shrink-0",
            isCollapsed ? "w-20" : "w-64"
        )}>

            <div className={cn("flex items-center gap-3 mb-10 shrink-0", isCollapsed ? "justify-center px-0" : "px-4")}>
                <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center text-white shrink-0 overflow-hidden">
                    {publicSettings.SchoolLogo ? (
                        <img src={`http://localhost:5000${publicSettings.SchoolLogo}`} alt="L" className="w-full h-full object-cover" />
                    ) : (
                        <BookOpen size={18} />
                    )}
                </div>
                {!isCollapsed && (
                    <span className="font-bold text-lg text-white truncate">
                        {publicSettings.SchoolName
                            ? publicSettings.SchoolName
                                .split(' ')
                                .filter((word: string) => word.length > 0)
                                .map((word: string) => word.charAt(0).toUpperCase())
                                .join('')
                            : "AEMS"}
                    </span>
                )}
            </div>

            <nav className={cn(
                "flex-1 space-y-2 transition-all duration-300",
                isCollapsed ? "overflow-visible" : "overflow-hidden overflow-y-auto pr-1 custom-scrollbar"
            )}>
                {links.map((link) => (
                    <div key={link.path}>
                        {link.children ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (isCollapsed) setIsCollapsed(false);
                                        else setAcademicOpen(!academicOpen);
                                    }}
                                    className={cn(
                                        "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative group",
                                        location.pathname.startsWith(link.path) ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
                                        isCollapsed ? "justify-center" : "justify-between"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={cn("shrink-0", location.pathname.startsWith(link.path) ? "text-white" : "text-[#A3AED0]")}>
                                            {link.icon}
                                        </span>
                                        {!isCollapsed && <span className="font-bold text-sm truncate">{link.title}</span>}
                                    </div>
                                    {!isCollapsed && (
                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                                            <ChevronDown size={24} className={cn("transition-all duration-300 text-white", academicOpen ? "rotate-180" : "")} />
                                        </div>
                                    )}

                                    {/* Collapsed: flyout submenu panel */}
                                    {isCollapsed && (
                                        <div className="absolute left-full top-0 ml-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[200] pointer-events-none group-hover:pointer-events-auto">
                                            {/* Arrow connector */}
                                            <div className="absolute top-3 -left-1.5 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-100 shadow-sm" />
                                            {/* Flyout panel */}
                                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 min-w-[180px] ml-1">
                                                {link.children.map((child) => (
                                                    <NavLink
                                                        key={child.path}
                                                        to={child.path}
                                                        className={() => cn(
                                                            "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all mx-1 rounded-xl",
                                                            location.pathname + location.search === child.path
                                                                ? "text-brand-blue bg-blue-50"
                                                                : "text-slate-600 hover:text-brand-blue hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="shrink-0 text-slate-400">{child.icon}</span>
                                                        {child.title}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </button>

                                {academicOpen && !isCollapsed && (
                                    <div className=" bg-white/10 mt-2 ml-4 pl-4 border-l-2 border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-300 rounded-xl py-2">
                                        {link.children.map((child) => (
                                            <NavLink
                                                key={child.path}
                                                to={child.path}
                                                className={() => cn(
                                                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                                                    location.pathname + location.search === child.path
                                                        ? "text-white bg-brand-blue shadow-lg shadow-blue-500/20"
                                                        : "text-white hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <span className="shrink-0">{child.icon}</span>
                                                {child.title}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                end={link.path === '/admin' || link.path === '/teacher' || link.path === '/student' || link.path === '/director'}
                                className={({ isActive }: { isActive: boolean }) => cn(
                                    "flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative group",
                                    isActive ? "bg-brand-blue text-white shadow-lg shadow-blue-500/20" : "hover:bg-white/5 hover:text-white",
                                    isCollapsed ? "justify-center" : "justify-between",
                                    (link as any).live && !isActive && "text-green-400"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <span className={cn(
                                        "shrink-0 relative",
                                        (link as any).live && "text-green-400"
                                    )}>
                                        {link.icon}
                                        {(link as any).live && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                            </span>
                                        )}
                                    </span>
                                    {!isCollapsed && (
                                        <span className={cn(
                                            "font-bold text-sm truncate",
                                            (link as any).live && "animate-pulse"
                                        )}>
                                            {link.title}
                                        </span>
                                    )}
                                </div>

                                {(link as any).badge > 0 && !isCollapsed && (
                                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                        {(link as any).badge}
                                    </span>
                                )}

                                {(link as any).live && !isCollapsed && (
                                    <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg uppercase tracking-wider animate-pulse ml-2">
                                        Live
                                    </span>
                                )}

                                {(link as any).badge > 0 && isCollapsed && (
                                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#111C44]"></div>
                                )}

                                {isCollapsed && (
                                    <div className="absolute left-full ml-4 px-3 py-2 bg-[#111C44] text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-2xl z-[100] border border-white/10 pointer-events-none">
                                        {link.title}
                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#111C44] rotate-45 border-l border-b border-white/10"></div>
                                    </div>
                                )}
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-4 shrink-0">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center gap-4 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-red-500 font-bold group relative",
                        isCollapsed ? "justify-center" : ""
                    )}
                >
                    <LogOut size={20} className="shrink-0" />
                    {!isCollapsed && <span className="text-sm">Logout</span>}

                    {isCollapsed && (
                        <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl z-[70] pointer-events-none">
                            Logout
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-red-500 rotate-45"></div>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
