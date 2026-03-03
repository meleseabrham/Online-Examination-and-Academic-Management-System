import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, BookOpen, Eye, EyeOff, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import GuestHeader from '../../components/GuestHeader';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
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
        <div className="min-h-screen bg-[#F4F7FE] flex flex-col items-center pt-64 px-4 overflow-y-auto pb-12">
            <GuestHeader />

            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        {publicSettings.SchoolLogo ? (
                            <img
                                src={`http://localhost:5000${publicSettings.SchoolLogo}`}
                                alt="Logo"
                                className="h-20 w-auto object-contain animate-in zoom-in duration-700"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                                <BookOpen size={32} />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1B2559] tracking-tight whitespace-nowrap">
                        {publicSettings.SchoolName ? (
                            <>
                                {publicSettings.SchoolName.split(' ')[0]} <span className="text-brand-blue">{publicSettings.SchoolName.split(' ').slice(1).join(' ')}</span>
                            </>
                        ) : (
                            <>
                                Online <span className="text-brand-blue">Examination System</span>
                            </>
                        )}
                    </h1>
                </div>

                <div className="bg-white p-10 rounded-[30px] shadow-sm border border-slate-100 w-full relative">
                    <h2 className="text-2xl font-bold text-[#2B3674] mb-8">Login</h2>

                    {serverError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in duration-300">
                            <AlertCircle size={18} />
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-[#2B3674] mb-3">
                                <Mail size={16} className="text-brand-blue" />
                                Email Address
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="name@example.com"
                                className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all text-[#2B3674] placeholder:text-slate-300"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-2 font-medium pl-2">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-[#2B3674]">
                                <Lock size={16} className="text-brand-blue" />
                                Password
                            </label>
                            <div className="relative group">
                                <input
                                    {...register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Min. 8 characters"
                                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue outline-none transition-all text-[#2B3674] placeholder:text-slate-300 pr-14"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-brand-blue transition-colors rounded-xl hover:bg-white shadow-sm"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-2 font-medium pl-2">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-brand-blue text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 h-[64px] flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => window.location.href = `mailto:${publicSettings.SupportEmail || 'support@examsystem.com'}`}
                            className="text-brand-blue text-sm font-bold hover:underline underline-offset-4 transition-all opacity-70 hover:opacity-100 block mx-auto mb-2"
                        >
                            Trouble signing in? Contact support
                        </button>
                        {publicSettings.SchoolPhone && (
                            <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                                <Phone size={14} className="text-brand-blue" />
                                <p className="text-xs font-bold uppercase tracking-wider">
                                    {publicSettings.SchoolPhone}
                                </p>
                            </div>
                        )}
                        {publicSettings.SchoolAddress && (
                            <div className="flex items-center justify-center gap-2 text-slate-400 max-w-[280px] mx-auto">
                                <MapPin size={14} className="text-brand-blue shrink-0" />
                                <p className="text-[10px] font-medium leading-relaxed text-left">
                                    {publicSettings.SchoolAddress}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Footer link to match user request style */}
            <p className="mt-12 text-slate-400 text-sm font-medium">
                Official Exam Portal • <span className="text-brand-blue">{publicSettings.SystemVersion || 'v1.0.4'}</span>
            </p>
        </div>
    );
};

export default Login;
