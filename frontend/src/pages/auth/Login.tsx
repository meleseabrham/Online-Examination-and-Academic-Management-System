import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, BookOpen, Eye, EyeOff, Phone, MapPin, X } from 'lucide-react';
import axios from 'axios';
import GuestHeader from '../../components/GuestHeader';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getImageUrl } from '../../utils/imageUrl';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const loginSchema = z.object({
    email: z.string().min(1, 'Please enter your email address').email('Please enter a valid email address'),
    password: z.string().min(1, 'Please enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);

    // Auto-dismiss top error popup after 5 seconds
    useEffect(() => {
        if (serverError) {
            const timer = setTimeout(() => {
                setServerError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [serverError]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const [showPassword, setShowPassword] = useState(false);
    const [logoError, setLogoError] = useState(false);

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

    const onSubmit = async (data: LoginFormValues) => {
        setServerError(null);
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', data);
            const { token, user } = response.data;

            // Store in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect based on role
            const role = user.role.toLowerCase();
            if (role === 'admin') {
                navigate('/admin');
            } else if (role === 'director') {
                navigate('/director');
            } else if (role === 'teacher') {
                navigate('/teacher');
            } else if (role === 'student') {
                navigate('/student');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            const msg = err.response?.data?.message;
            setServerError(msg || 'Incorrect email and password please try again !');
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden"
            style={!publicSettings.LoginBg ? { backgroundColor: '#e2e9e8ff' } : {}}
        >
            {/* Ken Burns animated background image */}
            {publicSettings.LoginBg && (
                <>
                    <div
                        className="login-bg-animated"
                        style={{ backgroundImage: `url(${getImageUrl(publicSettings.LoginBg)})` }}
                    />
                    <div className="login-bg-overlay" />
                </>
            )}
            {/* Top Center Error Popup */}
            {serverError && (
                <div className="fixed top-[76px] left-1/2 -translate-x-1/2 z-[200] max-w-md w-[90%] sm:w-auto bg-red-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-6 duration-300 border border-red-500">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-white shrink-0" />
                        <span className="text-sm font-semibold tracking-wide">{serverError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setServerError(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white shrink-0"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <GuestHeader />

            <div className="w-full max-w-md sm:max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
                {/* Maintenance Mode Banner */}
                {publicSettings.MaintenanceMode === 'true' && (
                    <div className="mb-6 p-3 sm:p-3.5 px-6 bg-[#FAF0E6]/95 backdrop-blur-md border border-[#E8D0C0] text-[#B83800] rounded-full flex items-center justify-center gap-3 shadow-lg shadow-orange-500/10 animate-in fade-in zoom-in duration-300">
                        <div className="w-6 h-6 rounded-full border-2 border-[#E65100] text-[#E65100] flex items-center justify-center font-bold text-xs shrink-0">
                            !
                        </div>
                        <span className="text-xs sm:text-sm font-bold tracking-wide text-center">
                            System is currently under maintenance Please try again later !
                        </span>
                    </div>
                )}

                {/* Logo & School Header */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {/* <div className="flex-shrink-0">
                        {publicSettings.SchoolLogo && !logoError ? (
                            <img
                                src={getImageUrl(publicSettings.SchoolLogo)!}
                                alt="Logo"
                                onError={() => setLogoError(true)}
                                className="h-10 sm:h-10 w-auto object-contain rounded-lg"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-[#0066FF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                                <BookOpen size={24} />
                            </div>
                        )}
                    </div> */}
                    <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${publicSettings.LoginBg ? 'text-white drop-shadow-lg' : 'text-[#1B2559]'}`}>
                        <span className="sm:hidden text-brand-blue">
                            {publicSettings.SchoolName
                                ? publicSettings.SchoolName
                                    .split(' ')
                                    .filter((word: string) => word.length > 0)
                                    .map((word: string) => word.charAt(0).toUpperCase())
                                    .join('')
                                : "AEMS"}
                        </span>
                        <span className="hidden sm:inline">
                            {publicSettings.SchoolName ? (
                                <>
                                    {publicSettings.SchoolName.split(' ')[0]}{" "}
                                    <span>
                                        {publicSettings.SchoolName.split(' ').slice(1).join(' ')}
                                    </span>
                                </>
                            ) : (
                                <>
                                    Global International School
                                </>
                            )}
                        </span>
                    </h1>
                </div>

                {/* Login Card */}
                <div className="bg-gradient-to-br from-blue-50/40 via-orange-50/40 to-blue-50/40 backdrop-blur-xl p-8 sm:p-10 rounded-[20px] shadow-xl shadow-blue-500/10 border border-white/60 w-full relative">                    {/* <h2 className="text-2xl font-bold text-[#1B2559] mb-6">Login</h2> */}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <div className="relative group">
                                <Mail size={18} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", errors.email ? "text-red-500" : "text-[#0066FF]")} />
                                <input
                                    {...register('email')}
                                    type="email"
                                    placeholder="Enter your email address"
                                    className={cn(
                                        "w-full pl-11 pr-5 py-3 rounded-2xl transition-all text-[#1B2559] font-medium outline-none border",
                                        errors.email
                                            ? "bg-red-50/50 border-red-500 placeholder:text-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                            : "bg-white/90 border-transparent focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                                    )}
                                />
                            </div>
                            {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium pl-2">{errors.email.message}</p>}
                        </div>

                        <div>
                            <div className="relative group">
                                <Lock size={18} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", errors.password ? "text-red-500" : "text-[#0066FF]")} />
                                <input
                                    {...register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    className={cn(
                                        "w-full pl-11 pr-12 py-3 rounded-2xl transition-all text-[#1B2559] font-medium outline-none border",
                                        errors.password
                                            ? "bg-red-50/50 border-red-500 placeholder:text-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                                            : "bg-white/90 border-transparent focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#0066FF] transition-colors rounded-xl"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium pl-2">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#1877F2] text-white py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Support Contact Footer inside Card */}
                    <div className="mt-6 text-center space-y-2">
                        <button
                            onClick={() => window.location.href = `mailto:${publicSettings.SupportEmail || 'support@examsystem.com'}`}
                            className="text-[#0066FF] text-sm font-semibold hover:underline underline-offset-4 transition-all block mx-auto"
                        >
                            Trouble signing in? Contact support
                        </button>

                        <div className="flex flex-col items-center gap-1 text-slate-400 text-xs font-semibold pt-1">
                            <div className="flex items-center gap-1.5">
                                <Phone size={13} className="text-[#0066FF]" />
                                <span>{publicSettings.SchoolPhone || '+37894754730'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-[#0066FF]" />
                                <span>{publicSettings.SchoolAddress || 'Addis Ababa'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer link outside card */}
                {/* <p className={`mt-8 text-xs font-medium text-center ${publicSettings.LoginBg ? 'text-white/80 drop-shadow' : 'text-slate-400'}`}>
                    Official Exam Portal • <span className="text-[#0066FF] font-semibold">{publicSettings.SystemVersion || 'v1.0.4'}</span>
                </p> */}
            </div>

            {/* Absolute Bottom Copyright */}
            <footer className="absolute bottom-4 left-0 right-0 z-10 text-center px-4">
                <p className={`text-xs font-medium ${publicSettings.LoginBg ? 'text-white/90 drop-shadow-md' : 'text-slate-500'}`}>
                    Copyright © {new Date().getFullYear()} MA. All Rights Reserved.
                </p>
            </footer>
        </div>
    );
};

export default Login;
