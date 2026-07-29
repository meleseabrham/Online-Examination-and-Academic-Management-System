import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, BookOpen, Eye, EyeOff, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import GuestHeader from '../../components/GuestHeader';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const loginSchema = z.object({
    email: z.string().email('pleae enter your email'),
    password: z.string().min(6, 'Please enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const [showPassword, setShowPassword] = useState(false);

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
            setServerError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F7FE] flex flex-col items-center justify-center p-4 py-12">
            <GuestHeader />

            <div className="w-full max-w-md sm:max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Logo & School Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        {publicSettings.SchoolLogo ? (
                            <img
                                src={`http://localhost:5000${publicSettings.SchoolLogo}`}
                                alt="Logo"
                                className="h-16 w-auto object-contain"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-[#0066FF] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                                <BookOpen size={30} />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1B2559] tracking-tight text-center">
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
                                    <span >
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
                <div className="bg-white p-8 sm:p-10 rounded-[36px] shadow-xl shadow-blue-500/5 border border-slate-100/80 w-full relative">
                    {/* <h2 className="text-2xl font-bold text-[#1B2559] mb-6">Login</h2> */}

                    {serverError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in duration-300">
                            <AlertCircle size={18} />
                            {serverError}
                        </div>
                    )}

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
                                            : "bg-[#EBF2FE]/60 border-transparent focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
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
                                            : "bg-[#EBF2FE]/60 border-transparent focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
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
                <p className="mt-8 text-slate-400 text-xs font-medium text-center">
                    Official Exam Portal • <span className="text-[#0066FF]">{publicSettings.SystemVersion || 'v1.0.4'}</span>
                </p>
            </div>
        </div>
    );
};

export default Login;
