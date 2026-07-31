import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUrl';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
    User,
    Mail,
    Shield,
    Calendar,
    BookOpen,
    Users,
    School,
    Lock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Hash,
    Cake,
    Eye,
    EyeOff,
    Pencil,
    Award
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Profile = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'settings' ? 'security' : 'profile');
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<any>(null);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchProfile = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/auth/profile', { headers });
            setProfileData(res.data);
            // Sync localStorage user with profile data
            const updatedUser = { ...user, ProfileImage: res.data.user.ProfileImage };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleImageClick = () => {
        document.getElementById('profile-upload')?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profileImage', file);

        setUploadingImage(true);
        try {
            await axios.post('http://localhost:5000/api/auth/profile-image', formData, {
                headers
            });

            // Re-fetch profile to update all instances
            await fetchProfile();
            window.location.reload(); // Force reload to sync Header and other components easily
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }

        setUpdatingPassword(true);
        try {
            await axios.post('http://localhost:5000/api/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, { headers });

            setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setPasswordStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update password' });
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="animate-spin text-brand-blue" size={48} />
            </div>
        );
    }

    const avatarUrl = profileData?.user?.ProfileImage
        ? getImageUrl(profileData.user.ProfileImage)
        : null;

    const getInitials = () => {
        const userData = profileData?.user;
        if (userData?.FirstName && userData?.LastName) {
            return (userData.FirstName[0] + userData.LastName[0]).toUpperCase();
        }
        const name = userData?.FullName;
        if (!name) return '??';
        const parts = name.split(' ').filter((p: string) => p.trim());
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-display">
            <Sidebar role={user.role.toLowerCase() as any} />

            <main className="flex-1 p-8">
                <Header email={user.email} role={user.role} />

                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-[#2B3674] tracking-tight">Personal Profile</h1>
                        <p className="text-slate-500 font-medium text-sm">Manage your account information and security settings.</p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-[24px] w-fit mb-8">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-[18px] text-sm font-bold transition-all",
                                activeTab === 'profile' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <User size={18} />
                            Account Info
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-[18px] text-sm font-bold transition-all",
                                activeTab === 'security' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Shield size={18} />
                            Security
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Left: User Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>

                                <div className="relative">
                                    <input
                                        type="file"
                                        id="profile-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />


                                    <div
                                        className="relative w-24 h-24 mx-auto mb-4 cursor-pointer group"
                                        onClick={handleImageClick}
                                    >
                                        {/* Avatar Circle Container */}
                                        <div className="relative w-full h-full rounded-full p-1 bg-white border-2 border-slate-100 shadow-sm overflow-visible">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-[#F0F2F5] flex items-center justify-center border-2 border-white shadow-inner">
                                                {avatarUrl ? (
                                                    <img
                                                        src={avatarUrl}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xl font-bold text-[#747EA1] tracking-tight">
                                                        {getInitials()}
                                                    </span>
                                                )}

                                                {/* Loading Overlay */}
                                                {uploadingImage && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                                        <Loader2 size={18} className="text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Edit Button Overlay */}
                                            <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#FF4D6D] rounded-full border-2 border-white shadow-md flex items-center justify-center text-white transition-transform group-hover:scale-110 active:scale-95 duration-200">
                                                <Pencil size={12} fill="white" />
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-[#2B3674] mb-0.5">
                                        {profileData?.user?.FirstName} {profileData?.user?.MiddleName && `${profileData.user.MiddleName} `}{profileData?.user?.LastName}
                                    </h3>
                                    {profileData?.user?.Role !== 'Student' && profileData?.user?.Title && (
                                        <div className="flex items-center justify-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 w-fit mx-auto mb-4">
                                            <Award size={12} className="text-[#FF4D6D]" />
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] leading-none">
                                                {profileData.user.Title}
                                            </p>
                                        </div>
                                    )}
                                    <div className="mb-6">
                                        <span className="inline-block px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-wider">
                                            {profileData?.user?.Role}
                                        </span>
                                    </div>

                                    <div className="space-y-4 text-left border-t border-slate-50 pt-6">
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Mail size={16} className="text-brand-blue" />
                                            <span className="text-xs font-bold truncate italic">{profileData?.user?.Email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Hash size={16} className="text-brand-blue" />
                                            <span className="text-xs font-bold">Reg: {profileData?.user?.RegistrationNumber || 'N/A'}</span>
                                        </div>
                                        {profileData?.user?.DateOfBirth && (
                                            <div className="flex items-center gap-3 text-slate-500">
                                                <Cake size={16} className="text-brand-blue" />
                                                <span className="text-xs font-bold">Born: {new Date(profileData.user.DateOfBirth).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Calendar size={16} className="text-brand-blue" />
                                            <span className="text-xs font-bold">Joined {new Date(profileData?.user?.CreatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Right: Details/Content */}
                        <div className="lg:col-span-2">
                            {activeTab === 'profile' ? (
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 mb-6">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 text-sm">
                                                <User size={20} />
                                            </div>
                                            <h4 className="text-lg font-black text-[#2B3674]">Basic Information</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">First Name</p>
                                                <p className="text-sm font-bold text-[#2B3674] break-words">{profileData?.user?.FirstName || '—'}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Middle Name</p>
                                                <p className="text-sm font-bold text-[#2B3674] break-words">{profileData?.user?.MiddleName || '—'}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Name</p>
                                                <p className="text-sm font-bold text-[#2B3674] break-words">{profileData?.user?.LastName || '—'}</p>
                                            </div>
                                            {profileData?.user?.Role !== 'Student' && (
                                                <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50/30 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                                        <Award size={40} className="text-indigo-600" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 relative z-10">Professional Title</p>
                                                    <p className="text-sm font-black text-indigo-600 flex items-center gap-2 relative z-10 break-words">
                                                        <Award size={14} className="shrink-0" />
                                                        <span className="break-words">{profileData?.user?.Title || '—'}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Role Specific Info */}
                                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <School size={20} />
                                            </div>
                                            <h4 className="text-lg font-black text-[#2B3674]">Academic Information</h4>
                                        </div>

                                        {user.role === 'Student' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {profileData?.studentData?.length > 0 ? (
                                                    profileData.studentData.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-6 bg-slate-50 rounded-[35px] border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/10 group relative overflow-hidden flex flex-col justify-between h-full min-h-[180px]">
                                                            <div className="relative z-10">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-blue">
                                                                            <BookOpen size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Active Course</span>
                                                                            <h5 className="text-sm font-black text-brand-blue truncate max-w-[120px]">{item.CourseName || 'General Enrollment'}</h5>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-white/80 backdrop-blur-sm px- py-1 rounded-lg border border-slate-100 shadow-sm">
                                                                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter block leading-none">
                                                                            {item.AcademicYearName || 'Current'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Class</p>
                                                                        <p className="text-sm font-bold text-[#2B3674] truncate">
                                                                            {item.GradeName?.startsWith('Grade') ? item.GradeName : `Grade ${item.GradeName}`}
                                                                            {item.Section ? ` - ${item.Section}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Instructor</p>
                                                                        <p className="text-sm font-bold text-[#2B3674]">{item.TeacherName || 'Not Assigned'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {item.SemesterName && (
                                                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                                    <span className="text-[9px] font-black text-brand-blue/60 uppercase tracking-widest">
                                                                        {item.SemesterName}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                                                        <span className="text-[8px] font-black text-green-600 uppercase">Active</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 py-8 text-center bg-slate-50 rounded-[30px] border border-dashed border-slate-200">
                                                        <AlertCircle size={32} className="text-slate-300 mx-auto mb-3" />
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No assigned classes found</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {user.role === 'Teacher' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {profileData?.teacherData?.length > 0 ? (
                                                    profileData.teacherData.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-6 bg-slate-50 rounded-[30px] border border-slate-100">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-blue">
                                                                    <Users size={16} />
                                                                </div>
                                                                <span className="text-xs font-black text-brand-blue uppercase tracking-widest">Class Management</span>
                                                            </div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                                                            <p className="text-sm font-bold text-[#2B3674] mb-3">{item.CourseName}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Class</p>
                                                            <p className="text-sm font-bold text-[#2B3674]">Grade {item.GradeName}-{item.Section}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 py-8 text-center bg-slate-50 rounded-[30px] border border-dashed border-slate-200">
                                                        <AlertCircle size={32} className="text-slate-300 mx-auto mb-3" />
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No active assignments found</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {user.role === 'Admin' && (
                                            <div className="p-8 bg-green-50 rounded-[30px] border border-green-100 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-500">
                                                    <CheckCircle size={24} />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-green-800 uppercase text-[10px] tracking-widest mb-1">System Status</h5>
                                                    <p className="text-green-700 font-medium">Full administrative access granted for Online Exam System.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Security / Change Password Tab */
                                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-[#2B3674]">Password & Security</h4>
                                            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Change your account password below</p>
                                        </div>
                                    </div>

                                    {passwordStatus.message && (
                                        <div className={cn(
                                            "p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                                            passwordStatus.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                                        )}>
                                            {passwordStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                            <p className="text-sm font-bold">{passwordStatus.message}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handlePasswordChange} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-x-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Current Password</label>
                                            <div className="relative group/field">
                                                <input
                                                    type={showPasswords.current ? "text" : "password"}
                                                    required
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-[20px] focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm font-bold transition-all pr-14"
                                                    placeholder="Enter your current password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-brand-blue transition-colors rounded-xl hover:bg-white shadow-sm"
                                                >
                                                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-x-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">New Password</label>
                                            <div className="relative group/field">
                                                <input
                                                    type={showPasswords.new ? "text" : "password"}
                                                    required
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-[20px] focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm font-bold transition-all pr-14"
                                                    placeholder="Enter your new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-brand-blue transition-colors rounded-xl hover:bg-white shadow-sm"
                                                >
                                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-x-4">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Confirm New Password</label>
                                            <div className="relative group/field">
                                                <input
                                                    type={showPasswords.confirm ? "text" : "password"}
                                                    required
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-[20px] focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm font-bold transition-all pr-14"
                                                    placeholder="Enter your confirm password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-brand-blue transition-colors rounded-xl hover:bg-white shadow-sm"
                                                >
                                                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updatingPassword}
                                            className="w-full bg-[#2B3674] text-white py-5 rounded-[24px] font-black shadow-xl shadow-indigo-900/20 hover:bg-[#1B2559] transition-all text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                                        >
                                            {updatingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Update Password securely'}
                                        </button>
                                    </form>

                                    <div className="mt-10 p-6 bg-slate-50 rounded-[30px] border border-slate-100">
                                        <h5 className="font-bold text-[#2B3674] text-xs mb-2">Password Requirements:</h5>
                                        <ul className="text-[10px] text-slate-400 font-medium space-y-1 ml-4 list-disc">
                                            <li>Minimum 8 characters long</li>
                                            <li>At least one special character</li>
                                            <li>Should not match your current password</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
