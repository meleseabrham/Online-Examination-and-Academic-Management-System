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
            "bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col p-4 text-[#1B2559] transition-all duration-300 relative z-50 shrink-0 shadow-sm",
            isCollapsed ? "w-20" : "w-64"
        )}>

            <div className={cn("flex items-center gap-3 mb-8 shrink-0", isCollapsed ? "justify-center px-0" : "px-3")}>
                <div className="w-9 h-9  rounded-xl flex items-center justify-center shrink-0 overflow-hidden ">
                    {publicSettings.SchoolLogo ? (
                        <img src={`http://localhost:5000${publicSettings.SchoolLogo}`} alt="L" className="w-full h-full object-cover" />
                    ) : (
                        <BookOpen size={18} />
                    )}
                </div>
                {!isCollapsed && (
                    <span className="font-extrabold text-lg text-[#1B2559] truncate tracking-tight">
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
                "flex-1 space-y-1.5 transition-all duration-300",
                isCollapsed ? "overflow-visible" : "overflow-hidden overflow-y-auto pr-1 custom-scrollbar"
            )}>
                {links.map((link) => (
                    <div key={link.path}>
                        {link.children ? (
                            <>
                                {/* Wrapper with group so both button and flyout share hover state */}
                                <div className={cn("relative group/flyout", isCollapsed ? "" : "")}>
                                    <button
                                        onClick={() => {
                                            if (isCollapsed) return; // collapsed uses hover flyout
                                            setAcademicOpen(!academicOpen);
                                        }}
                                        className={cn(
                                            "w-full flex items-center px-3.5 py-3 rounded-2xl transition-all duration-300 font-bold text-sm",
                                            location.pathname.startsWith(link.path) || academicOpen ? "bg-[#F8FAFC] text-[#1B2559]" : "text-[#1B2559] hover:bg-slate-50",
                                            isCollapsed ? "justify-center" : "justify-between"
                                        )}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <span className="shrink-0 text-[#1B2559]">
                                                {link.icon}
                                            </span>
                                            {!isCollapsed && <span className="truncate">{link.title}</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronDown size={18} className={cn("transition-transform duration-300 text-[#1B2559]", academicOpen ? "rotate-180" : "")} />
                                        )}
                                    </button>

                                    {/* Collapsed: flyout panel as sibling (NavLinks valid here) */}
                                    {isCollapsed && (
                                        <div className="absolute left-full top-0 ml-3 opacity-0 invisible group-hover/flyout:opacity-100 group-hover/flyout:visible transition-all duration-200 z-[200]">
                                            {/* Arrow connector */}
                                            <div className="absolute top-3 -left-1.5 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-100 shadow-sm" />
                                            {/* Flyout panel */}
                                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 min-w-[190px] ml-1">
                                                {link.children.map((child) => (
                                                    <NavLink
                                                        key={child.path}
                                                        to={child.path}
                                                        className={() => cn(
                                                            "flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-all mx-1 rounded-xl",
                                                            location.pathname + location.search === child.path
                                                                ? "text-white bg-[#0066FF] shadow-sm"
                                                                : "text-[#1B2559] hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="shrink-0">{child.icon}</span>
                                                        {child.title}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {academicOpen && !isCollapsed && (
                                    <div className="bg-slate-50/70 mt-1 ml-3 pl-3 border-l-2 border-slate-200 space-y-1 py-1.5 rounded-2xl">
                                        {link.children.map((child) => (
                                            <NavLink
                                                key={child.path}
                                                to={child.path}
                                                className={() => cn(
                                                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all",
                                                    location.pathname + location.search === child.path
                                                        ? "text-white bg-[#0066FF] shadow-md shadow-blue-500/20"
                                                        : "text-[#1B2559] hover:bg-slate-100"
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
                                    "flex items-center px-3.5 py-3 rounded-xl transition-all duration-300 relative group font-bold text-sm",
                                    isActive ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/20" : "text-[#1B2559] hover:bg-slate-50",
                                    isCollapsed ? "justify-center" : "justify-between",
                                    (link as any).live && !isActive && "text-green-600"
                                )}
                            >
                                <div className="flex items-center gap-3.5">
                                    <span className={cn(
                                        "shrink-0 relative",
                                        (link as any).live && !location.pathname.startsWith(link.path) && "text-green-500"
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
                                            "truncate",
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
                                    <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-lg uppercase tracking-wider animate-pulse ml-2">
                                        Live
                                    </span>
                                )}

                                {(link as any).badge > 0 && isCollapsed && (
                                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
                                )}

                                {isCollapsed && (
                                    <div className="absolute left-full ml-4 px-3 py-2 bg-[#1B2559] text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl z-[100] border border-slate-100 pointer-events-none">
                                        {link.title}
                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#1B2559] rotate-45 border-l border-b border-slate-100"></div>
                                    </div>
                                )}
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            <div className="mt-auto border-t border-slate-100 pt-3 shrink-0">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center gap-3.5 px-3.5 py-3 w-full rounded-2xl hover:bg-red-50 transition-all text-red-500 font-bold group relative text-sm",
                        isCollapsed ? "justify-center" : ""
                    )}
                >
                    <LogOut size={20} className="shrink-0" />
                    {!isCollapsed && <span>Logout</span>}

                    {isCollapsed && (
                        <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl z-[70] pointer-events-none">
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
