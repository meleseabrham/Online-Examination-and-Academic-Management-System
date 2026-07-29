import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    ClipboardList, Plus, BookOpen,
    CheckCircle, AlertTriangle,
    Save, Users, ArrowLeft, PenTool, Edit2,
    Trash2, Info, ChevronDown, ChevronUp
} from 'lucide-react';

interface Assessment {
    Id: number; CourseId: number; SemesterId: number; GradeId: number; AcademicYearId: number;
    Type: string; Title: string; TotalMarks: number; WeightPercentage: number;
    CourseName: string; CourseCode: string; GradeNumber: number; SemesterName: string;
    CreatedByName: string; ClassSection?: string; ClassId?: number; CreatedBy: number; IsRegradeAllowed: boolean;
}

interface StudentScore {
    StudentId: number; StudentName: string; RegistrationNumber: string;
    MarksObtained: number | null; ScoreStatus: string; Notes: string;
    TotalMarks: number; WeightPercentage: number; AssessmentType: string;
}

const AssessmentManagement = () => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const headers = { Authorization: `Bearer ${token}` };
    const isAdmin = (user?.role === 'Admin' || user?.role === 'admin' || user?.role === 'Director');
    const baseUrl = isAdmin ? 'http://localhost:5000/api/director' : 'http://localhost:5000/api/teacher';

    const [activeView, setActiveView] = useState<'list' | 'create' | 'grade' | 'edit' | 'groupEdit'>('list');
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [directorRegradeEnabled, setDirectorRegradeEnabled] = useState(false);

    // Filters
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [courses, setCourses] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [selectedAY, setSelectedAY] = useState('');
    const [grades, setGrades] = useState<any[]>([]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            // Accordion: if it's already open, close it; otherwise open only this one
            if (prev[key]) return {};
            return { [key]: true };
        });
    };

    // Assessment form (for edit)
    const [form, setForm] = useState({
        id: null as number | null,
        courseId: '', semesterId: '', gradeId: '', academicYearId: '', classId: '',
        type: 'Quiz', title: '', totalMarks: '100', weightPercentage: ''
    });

    const [groupEditItems, setGroupEditItems] = useState<Assessment[]>([]);
    const [groupEditLoading, setGroupEditLoading] = useState(false);

    // Batch create form
    const [batchShared, setBatchShared] = useState({
        academicYearId: '', semesterId: '', gradeId: '', classId: '', courseId: ''
    });
    interface BatchEntry { enabled: boolean; title: string; totalMarks: string; weightPercentage: string; }
    const [batchEntries, setBatchEntries] = useState<Record<string, BatchEntry>>({
        Quiz: { enabled: true, title: '', totalMarks: '10', weightPercentage: '10' },
        Mid: { enabled: true, title: '', totalMarks: '30', weightPercentage: '30' },
        Final: { enabled: true, title: '', totalMarks: '50', weightPercentage: '40' },
        Assignment: { enabled: true, title: '', totalMarks: '10', weightPercentage: '20' },
        Participation: { enabled: false, title: '', totalMarks: '10', weightPercentage: '10' }
    });
    const [batchSaving, setBatchSaving] = useState(false);

    // Admin Specific Settings & Bulk Mode
    const [adminOnlyAssessment, setAdminOnlyAssessment] = useState(true);
    const [bulkAssignMode, setBulkAssignMode] = useState(false);
    const [bulkAssignEntries, setBulkAssignEntries] = useState<Record<string, BatchEntry>>({
        Quiz: { enabled: true, title: 'Quiz', totalMarks: '10', weightPercentage: '10' },
        Mid: { enabled: true, title: 'Mid Exam', totalMarks: '30', weightPercentage: '30' },
        Final: { enabled: true, title: 'Final Exam', totalMarks: '50', weightPercentage: '40' },
        Assignment: { enabled: true, title: 'Assignment', totalMarks: '10', weightPercentage: '20' },
        Participation: { enabled: false, title: 'Participation', totalMarks: '10', weightPercentage: '10' }
    });

    const updateBatchEntry = (type: string, field: keyof BatchEntry, value: string | boolean) => {
        setBatchEntries(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
    };

    const totalBatchWeight = Object.entries(batchEntries)
        .filter(([, e]) => e.enabled)
        .reduce((sum, [, e]) => sum + (parseFloat(e.weightPercentage) || 0), 0);

    const handleBatchCreate = async () => {
        if (!batchShared.courseId || !batchShared.semesterId || !batchShared.gradeId || !batchShared.academicYearId) {
            showMsg('error', 'Please select Academic Year, Semester, Grade and Course');
            return;
        }
        const enabledEntries = Object.entries(batchEntries).filter(([, e]) => e.enabled);
        if (enabledEntries.length === 0) {
            showMsg('error', 'Please enable at least one assessment type');
            return;
        }
        for (const [type, entry] of enabledEntries) {
            if (!entry.title || !entry.weightPercentage || !entry.totalMarks) {
                showMsg('error', `Please fill all fields for ${type}`);
                return;
            }
        }

        if (totalBatchWeight > 100) {
            showMsg('error', `Total weight cannot exceed 100%. Current: ${totalBatchWeight}%`);
            return;
        }

        setBatchSaving(true);
        let created = 0;
        try {
            for (const [type, entry] of enabledEntries) {
                await axios.post(`${baseUrl}/assessments`, {
                    courseId: parseInt(batchShared.courseId),
                    semesterId: parseInt(batchShared.semesterId),
                    gradeId: parseInt(batchShared.gradeId),
                    academicYearId: parseInt(batchShared.academicYearId),
                    classId: batchShared.classId ? parseInt(batchShared.classId) : null,
                    type,
                    title: entry.title,
                    totalMarks: parseFloat(entry.totalMarks),
                    weightPercentage: parseFloat(entry.weightPercentage)
                }, { headers });
                created++;
            }
            showMsg('success', `${created} assessment(s) created successfully!`);
            const activeAY = academicYears.find((a: any) => a.IsActive) || academicYears[academicYears.length - 1];
            const activeSem = semesters.find((s: any) => s.IsActive) || semesters[0];
            setBatchShared({
                academicYearId: activeAY ? String(activeAY.Id) : '',
                semesterId: activeSem ? String(activeSem.Id) : '',
                gradeId: '', classId: '', courseId: ''
            });
            setBatchEntries({
                Quiz: { enabled: true, title: '', totalMarks: '10', weightPercentage: '10' },
                Mid: { enabled: true, title: '', totalMarks: '30', weightPercentage: '20' },
                Final: { enabled: true, title: '', totalMarks: '50', weightPercentage: '40' },
                Assignment: { enabled: true, title: '', totalMarks: '10', weightPercentage: '20' },
                Participation: { enabled: false, title: '', totalMarks: '10', weightPercentage: '10' }
            });
            setActiveView('list');
            fetchAssessments();
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || `Error: created ${created} but failed on the rest`);
        } finally {
            setBatchSaving(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const [assRes, sysRes] = await Promise.all([
                axios.get(`${baseUrl}/assessment-settings`, { headers }),
                axios.get(`http://localhost:5000/api/director/system-settings`, { headers })
            ]);
            setAdminOnlyAssessment(assRes.data.adminOnlyAssessment);
            const drSetting = sysRes.data.find((s: any) => s.SettingKey === 'DirectorGlobalRegrade');
            if (drSetting && drSetting.SettingValue === 'true') {
                setDirectorRegradeEnabled(true);
            }
        } catch (err) { console.error('Error fetching settings:', err); }
    };

    const toggleAdminOnly = async (val: boolean) => {
        try {
            await axios.put(`${baseUrl}/assessment-settings`, { adminOnlyAssessment: val }, { headers });
            setAdminOnlyAssessment(val);
            showMsg('success', `Assessment creation restricted to ${val ? 'Admin only' : 'everyone'}`);
        } catch (err) { showMsg('error', 'Error updating settings'); }
    };

    const handleBulkAssign = async () => {
        const enabled = Object.entries(bulkAssignEntries).filter(([, e]) => e.enabled);
        if (enabled.length === 0) return showMsg('error', 'Enable at least one type');

        const totalWeight = enabled.reduce((sum, [, e]) => sum + (parseFloat(e.weightPercentage) || 0), 0);
        if (totalWeight > 100) return showMsg('error', `Total weight cannot exceed 100%. Current: ${totalWeight}%`);

        setBatchSaving(true);
        try {
            const payload = enabled.map(([type, e]) => ({
                type,
                title: e.title,
                totalMarks: parseFloat(e.totalMarks),
                weightPercentage: parseFloat(e.weightPercentage)
            }));
            const res = await axios.post(`${baseUrl}/assessments/bulk-assign`, { assessments: payload }, { headers });
            showMsg('success', res.data.message);
            setBulkAssignMode(false);
            fetchAssessments();
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error bulk assigning');
        } finally {
            setBatchSaving(false);
        }
    };


    // Grading state
    const [gradeInputs, setGradeInputs] = useState<Record<number, { marks: string; status: string; notes: string }>>({});
    const [batchMarks, setBatchMarks] = useState('');
    const [batchStatus, setBatchStatus] = useState('Graded');
    const [batchNotes, setBatchNotes] = useState('');

    const applyBatchScores = () => {
        if (!selectedAssessment) return;
        const marksNum = parseFloat(batchMarks);
        if (batchMarks !== '' && (isNaN(marksNum) || marksNum > selectedAssessment.TotalMarks || marksNum < 0)) {
            showMsg('error', `Invalid marks. Must be between 0 and ${selectedAssessment.TotalMarks}`);
            return;
        }

        const updated = { ...gradeInputs };
        studentScores.forEach(s => {
            updated[s.StudentId] = {
                marks: batchMarks,
                status: batchMarks !== '' ? 'Graded' : batchStatus,
                notes: batchNotes
            };
        });
        setGradeInputs(updated);
        showMsg('success', `Applied to ${studentScores.length} students. Don't forget to save!`);
    };

    useEffect(() => {
        fetchDropdowns();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (selectedSemester || selectedAY || selectedGrade) fetchAssessments();
    }, [selectedSemester, selectedAY, selectedGrade]);
    const fetchDropdowns = async () => {
        try {
            const [semRes, ayRes, gradesRes, coursesRes, teacherClassesRes] = await Promise.all([
                axios.get(`${baseUrl}/semesters`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${baseUrl}/academic-years`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${baseUrl}/grades`, { headers }).catch(() => ({ data: [] })),
                axios.get(isAdmin ? `${baseUrl}/all-courses` : `${baseUrl}/courses`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${baseUrl}/classes`, { headers }).catch(() => ({ data: [] }))
            ]);

            setSemesters(semRes.data);
            setAcademicYears(ayRes.data);
            setTeacherClasses(teacherClassesRes.data);

            // Auto-select active academic year (or latest)
            const activeAY = ayRes.data.find((a: any) => a.IsActive) || ayRes.data[ayRes.data.length - 1];
            if (activeAY) {
                setSelectedAY(String(activeAY.Id));
                setBatchShared(prev => ({ ...prev, academicYearId: String(activeAY.Id) }));
                setForm(prev => ({ ...prev, academicYearId: String(activeAY.Id) }));
            }

            // Auto-select active semester (or first)
            const activeSem = semRes.data.find((s: any) => s.IsActive) || semRes.data[0];
            if (activeSem) {
                setSelectedSemester(String(activeSem.Id));
                setBatchShared(prev => ({ ...prev, semesterId: String(activeSem.Id) }));
                setForm(prev => ({ ...prev, semesterId: String(activeSem.Id) }));
            }

            if (isAdmin) {
                setGrades(gradesRes.data);
                setCourses(coursesRes.data);
            } else {
                setTeacherClasses(teacherClassesRes.data);
                setCourses(coursesRes.data);

                // Extract unique grades from teacher's classes
                const teacherGrades = teacherClassesRes.data.reduce((acc: any[], curr: any) => {
                    if (!acc.find(g => g.Id === curr.GradeId)) {
                        acc.push({ Id: curr.GradeId, GradeNumber: curr.GradeNumber || curr.GradeName.replace('Grade ', '') });
                    }
                    return acc;
                }, []);
                setGrades(teacherGrades);
            }
        } catch (err) { console.error(err); }
    };

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (selectedSemester) params.semesterId = selectedSemester;
            if (selectedAY) params.academicYearId = selectedAY;
            if (selectedGrade) params.gradeId = selectedGrade;
            if (selectedClass) params.classId = selectedClass;
            const res = await axios.get(`${baseUrl}/assessments`, { headers, params });
            setAssessments(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleCreateOrUpdate = async () => {
        if (!form.courseId || !form.semesterId || !form.gradeId || !form.title || !form.weightPercentage) {
            showMsg('error', 'Please fill all required fields');
            return;
        }
        try {
            const data = {
                courseId: parseInt(form.courseId),
                semesterId: parseInt(form.semesterId),
                gradeId: parseInt(form.gradeId),
                academicYearId: parseInt(form.academicYearId || selectedAY),
                classId: form.classId ? parseInt(form.classId) : null,
                type: form.type,
                title: form.title,
                totalMarks: parseFloat(form.totalMarks),
                weightPercentage: parseFloat(form.weightPercentage)
            };

            if (activeView === 'edit' && form.id) {
                await axios.put(`${baseUrl}/assessments/${form.id}`, data, { headers });
                showMsg('success', 'Assessment updated successfully');
            } else {
                await axios.post(`${baseUrl}/assessments`, data, { headers });
                showMsg('success', 'Assessment created successfully');
            }

            const activeAY = academicYears.find((a: any) => a.IsActive) || academicYears[academicYears.length - 1];
            const activeSem = semesters.find((s: any) => s.IsActive) || semesters[0];
            setForm({
                id: null, courseId: '',
                semesterId: activeSem ? String(activeSem.Id) : '',
                gradeId: '',
                academicYearId: activeAY ? String(activeAY.Id) : '',
                classId: '', type: 'Quiz', title: '', totalMarks: '100', weightPercentage: ''
            });
            setActiveView('list');
            fetchAssessments();
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error processing assessment');
        }
    };

    const openEdit = (a: Assessment) => {
        setForm({
            id: a.Id,
            courseId: String(a.CourseId),
            semesterId: String(a.SemesterId),
            gradeId: String(a.GradeId),
            academicYearId: String(a.AcademicYearId),
            classId: a.ClassId ? String(a.ClassId) : '',
            type: a.Type,
            title: a.Title,
            totalMarks: String(a.TotalMarks),
            weightPercentage: String(a.WeightPercentage)
        });
        setActiveView('edit');
    };

    const handleDeleteAssessment = async (id: number) => {
        if (!confirm('Delete this assessment? This cannot be undone if no scores exist.')) return;
        try {
            await axios.delete(`${baseUrl}/assessments/${id}`, { headers });
            showMsg('success', 'Assessment deleted');
            fetchAssessments();
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error deleting assessment');
        }
    };

    const toggleRegradePermission = async (id: number, currentVal: boolean) => {
        try {
            await axios.put(`${baseUrl}/assessments/${id}/regrade-permission`, { isRegradeAllowed: !currentVal }, { headers });
            showMsg('success', `Regrade permission ${!currentVal ? 'enabled' : 'disabled'} for teachers`);
            fetchAssessments();
        } catch (err: any) {
            showMsg('error', 'Error updating regrade permission');
        }
    };

    const openGrading = async (assessment: Assessment) => {
        setSelectedAssessment(assessment);
        setActiveView('grade');
        try {
            const params: any = {};
            if (assessment.ClassId) params.classId = assessment.ClassId;
            const res = await axios.get(`${baseUrl}/assessments/${assessment.Id}/students`, { headers, params });
            setStudentScores(res.data);
            const inputs: Record<number, { marks: string; status: string; notes: string }> = {};
            res.data.forEach((s: StudentScore) => {
                inputs[s.StudentId] = {
                    marks: s.MarksObtained !== null ? String(s.MarksObtained) : '',
                    status: s.ScoreStatus || 'Pending',
                    notes: s.Notes || ''
                };
            });
            setGradeInputs(inputs);
        } catch (err) {
            showMsg('error', 'Error loading students');
        }
    };

    const handleSaveScores = async () => {
        if (!selectedAssessment) return;
        const scores = Object.entries(gradeInputs).map(([studentId, data]) => ({
            studentId: parseInt(studentId),
            marksObtained: data.marks !== '' ? parseFloat(data.marks) : null,
            status: data.marks !== '' ? 'Graded' : data.status,
            notes: data.notes
        }));

        try {
            await axios.post(`${baseUrl}/assessments/scores`, {
                assessmentId: selectedAssessment.Id,
                scores
            }, { headers });
            showMsg('success', `Scores saved for ${scores.length} students`);
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error saving scores');
        }
    };

    const handleBatchUpdateAssessments = async () => {
        setGroupEditLoading(true);
        try {
            for (const a of groupEditItems) {
                await axios.put(`${baseUrl}/assessments/${a.Id}`, {
                    courseId: a.CourseId,
                    semesterId: a.SemesterId,
                    gradeId: a.GradeId,
                    academicYearId: a.AcademicYearId,
                    classId: a.ClassId,
                    type: a.Type,
                    title: a.Title,
                    totalMarks: a.TotalMarks,
                    weightPercentage: a.WeightPercentage
                }, { headers });
            }
            showMsg('success', 'All assessments updated successfully');
            setActiveView('list');
            fetchAssessments();
        } catch (err: any) {
            showMsg('error', err.response?.data?.message || 'Error updating assessments');
        } finally {
            setGroupEditLoading(false);
        }
    };

    const assessmentTypes = ['Quiz', 'Mid', 'Final', 'Assignment', 'Participation'];
    const typeColors: Record<string, string> = {
        Quiz: 'bg-blue-50 text-blue-700 border-blue-200',
        Mid: 'bg-amber-50 text-amber-700 border-amber-200',
        Final: 'bg-red-50 text-red-700 border-red-200',
        Assignment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Participation: 'bg-purple-50 text-purple-700 border-purple-200'
    };

    const GRACE_PERIOD_DAYS = 30;
    const isYearLocked = (ayId: number, isRegradeAllowed?: boolean): boolean => {
        if (directorRegradeEnabled || isRegradeAllowed) return false;
        const ay = academicYears.find((a: any) => a.Id === ayId);
        if (!ay || !ay.EndDate) return false;
        const lockDate = new Date(new Date(ay.EndDate).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        return new Date() > lockDate;
    };

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden text-[#1B2559]">
            <Sidebar role="director" />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={user?.email || ''} role="director" />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {/* Toast */}
                    {message && (
                        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                            {message.text}
                        </div>
                    )}

                    {/* ======================== GRADING VIEW ======================== */}
                    {activeView === 'grade' && selectedAssessment ? (
                        <div>
                            <button onClick={() => { setActiveView('list'); setSelectedAssessment(null); }}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
                                <ArrowLeft size={16} /> Back to Assessments
                            </button>

                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`px-3 py-1 rounded-xl text-xs font-bold border ${typeColors[selectedAssessment.Type] || 'bg-slate-50 text-slate-600'}`}>
                                                {selectedAssessment.Type}
                                            </div>
                                            <h2 className="text-2xl font-black">{selectedAssessment.Title}</h2>
                                        </div>
                                        <p className="text-sm text-slate-400">{selectedAssessment.CourseName} • Grade {selectedAssessment.GradeNumber} • {selectedAssessment.SemesterName}</p>
                                        <p className="text-xs text-slate-400 mt-1">Total Marks: {selectedAssessment.TotalMarks} | Weight: {selectedAssessment.WeightPercentage}%</p>
                                    </div>
                                    <button onClick={handleSaveScores}
                                        className="flex items-center gap-2 bg-[#111C44] text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#1a2a5e] transition-colors shadow-lg">
                                        <Save size={16} /> Save All Scores
                                    </button>
                                </div>

                                {/* Score Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">#</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reg #</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Marks / {selectedAssessment.TotalMarks}</th>
                                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentScores.length > 0 && (
                                                <tr className="bg-blue-50/50 border-b border-blue-100/50">
                                                    <td colSpan={3} className="py-4 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                                                <PenTool size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Bulk Entry</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase">Apply to all students</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <input
                                                            type="number" value={batchMarks} onChange={e => setBatchMarks(e.target.value)}
                                                            className="w-24 mx-auto block px-3 py-2 border-2 border-blue-200 rounded-xl text-center focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-sm transition-all"
                                                            placeholder="Set all"
                                                        />
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <select value={batchStatus} onChange={e => setBatchStatus(e.target.value)}
                                                            className="px-2 py-2 border-2 border-blue-200 rounded-xl text-xs font-black focus:outline-none bg-white transition-all cursor-pointer">
                                                            <option value="Pending">Pending</option>
                                                            <option value="Graded">Graded</option>
                                                            <option value="Absent">Absent</option>
                                                            <option value="Incomplete">Incomplete</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <input value={batchNotes} onChange={e => setBatchNotes(e.target.value)}
                                                                className="flex-1 min-w-[150px] px-4 py-2 border-2 border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold bg-white transition-all"
                                                                placeholder="Note for everyone..." />
                                                            <button onClick={applyBatchScores}
                                                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 shrink-0">
                                                                Apply All
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {studentScores.map((s, idx) => (
                                                <tr key={s.StudentId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 px-4 text-sm text-slate-400">{idx + 1}</td>
                                                    <td className="py-3 px-4"><span className="font-bold text-sm">{s.StudentName}</span></td>
                                                    <td className="py-3 px-4 text-sm text-slate-500">{s.RegistrationNumber || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        <input
                                                            type="number" min="0" max={selectedAssessment.TotalMarks}
                                                            value={gradeInputs[s.StudentId]?.marks || ''}
                                                            onChange={e => setGradeInputs({ ...gradeInputs, [s.StudentId]: { ...gradeInputs[s.StudentId], marks: e.target.value } })}
                                                            className="w-24 mx-auto block px-3 py-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-bold text-sm"
                                                            placeholder="—"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <select value={gradeInputs[s.StudentId]?.status || 'Pending'}
                                                            onChange={e => setGradeInputs({ ...gradeInputs, [s.StudentId]: { ...gradeInputs[s.StudentId], status: e.target.value } })}
                                                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none">
                                                            <option value="Pending">Pending</option>
                                                            <option value="Graded">Graded</option>
                                                            <option value="Absent">Absent</option>
                                                            <option value="Incomplete">Incomplete</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <input value={gradeInputs[s.StudentId]?.notes || ''}
                                                            onChange={e => setGradeInputs({ ...gradeInputs, [s.StudentId]: { ...gradeInputs[s.StudentId], notes: e.target.value } })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                            placeholder="Optional notes..." />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {studentScores.length === 0 && (
                                    <div className="text-center py-16">
                                        <Users size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400 font-bold">No students enrolled for this assessment's grade</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeView === 'create' ? (
                        /* ======================== BATCH CREATE / BULK ASSIGN VIEW ======================== */
                        <div>
                            <button onClick={() => setActiveView('list')}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
                                <ArrowLeft size={16} /> Back
                            </button>

                            {/* Shared Fields Card (Hidden in Bulk Mode) */}
                            {!bulkAssignMode && (
                                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-3xl mb-6">
                                    <h2 className="text-2xl font-black mb-2">Create Assessments</h2>
                                    <p className="text-sm text-slate-400 mb-8">Set up all assessment types for one course at once. Select the shared details below, then configure each type.</p>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year *</label>
                                                <select value={batchShared.academicYearId} onChange={e => setBatchShared({ ...batchShared, academicYearId: e.target.value })}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                    <option value="">Select...</option>
                                                    {academicYears.map(a => <option key={a.Id} value={a.Id}>{a.Name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester *</label>
                                                <select value={batchShared.semesterId} onChange={e => setBatchShared({ ...batchShared, semesterId: e.target.value })}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                    <option value="">Select...</option>
                                                    {semesters.filter(s => !batchShared.academicYearId || s.AcademicYearId === parseInt(batchShared.academicYearId)).map(s => (
                                                        <option key={s.Id} value={s.Id}>{s.Name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grade *</label>
                                                <select value={batchShared.gradeId} onChange={e => setBatchShared({ ...batchShared, gradeId: e.target.value, classId: '' })}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                    <option value="">Select...</option>
                                                    {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section (Optional)</label>
                                                <select value={batchShared.classId} onChange={e => setBatchShared({ ...batchShared, classId: e.target.value })}
                                                    disabled={!batchShared.gradeId}
                                                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50">
                                                    <option value="">All Sections</option>
                                                    {teacherClasses.filter(c => String(c.GradeId) === String(batchShared.gradeId)).map(c => (
                                                        <option key={c.ClassId} value={c.ClassId}>{c.Section}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                {isAdmin ? 'Course *' : 'My Assigned Course *'}
                                            </label>
                                            <select value={batchShared.courseId} onChange={e => setBatchShared({ ...batchShared, courseId: e.target.value })}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                <option value="">Select...</option>
                                                {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {bulkAssignMode && (
                                <div className="bg-blue-600 rounded-3xl p-8 text-white max-w-3xl mb-6 shadow-xl relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black mb-2">Global Bulk Assignment</h2>
                                        <p className="text-blue-100 text-sm opacity-90">
                                            This will create assessments for <strong>ALL</strong> courses and grades in the active academic year ({academicYears.find(a => String(a.Id) === selectedAY)?.Name}) and semester ({semesters.find(s => String(s.Id) === selectedSemester)?.Name}).
                                        </p>
                                        <div className="mt-4 flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/20">
                                            <Info size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Mid & Final Exams are Mandatory</span>
                                        </div>
                                    </div>
                                    <Save className="absolute -bottom-8 -right-8 w-40 h-40 text-blue-500 opacity-20 rotate-12" />
                                </div>
                            )}

                            {/* Assessment Type Cards */}
                            <div className="max-w-3xl space-y-4 mb-6">
                                {assessmentTypes.map(type => {
                                    const entry = bulkAssignMode ? bulkAssignEntries[type] : batchEntries[type];
                                    const colors = typeColors[type];
                                    const isMandatory = bulkAssignMode && (type === 'Mid' || type === 'Final');

                                    const updateEntry = (field: keyof BatchEntry, value: string | boolean) => {
                                        if (bulkAssignMode) {
                                            setBulkAssignEntries(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
                                        } else {
                                            updateBatchEntry(type, field, value);
                                        }
                                    };

                                    return (
                                        <div key={type} className={`rounded-3xl border shadow-sm overflow-hidden transition-all ${entry.enabled ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-slate-100/50 opacity-60'
                                            }`}>
                                            {/* Type Header */}
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-2xl text-[10px] uppercase tracking-widest font-black border ${colors}`}>
                                                        {type}
                                                    </span>
                                                    {isMandatory && (
                                                        <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Mandatory</span>
                                                    )}
                                                </div>
                                                {!isMandatory && (
                                                    <label className={`flex items-center gap-2 ${(!isAdmin && adminOnlyAssessment && (type === 'Mid' || type === 'Final')) ? 'hidden' : 'cursor-pointer'}`}>
                                                        <span className="text-xs font-bold text-slate-400">{entry.enabled ? 'Enabled' : 'Disabled'}</span>
                                                        <div className="relative">
                                                            <input type="checkbox" checked={entry.enabled}
                                                                onChange={e => updateEntry('enabled', e.target.checked)}
                                                                className="sr-only peer" />
                                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                                                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
                                                        </div>
                                                    </label>
                                                )}
                                            </div>

                                            {/* Type Fields */}
                                            {entry.enabled && (
                                                <div className="px-6 py-5 space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title *</label>
                                                        <input value={entry.title}
                                                            onChange={e => updateEntry('title', e.target.value)}
                                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                            placeholder={`e.g. ${type} 1 - Chapter 1-3`} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Marks *</label>
                                                            <input type="number" value={entry.totalMarks}
                                                                onChange={e => updateEntry('totalMarks', e.target.value)}
                                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weight % *</label>
                                                            <input type="number" value={entry.weightPercentage}
                                                                onChange={e => updateEntry('weightPercentage', e.target.value)}
                                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                                placeholder="e.g. 10" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Weight Summary + Save Button */}
                            <div className="max-w-3xl">
                                {(() => {
                                    const currentWeight = bulkAssignMode
                                        ? Object.values(bulkAssignEntries).filter(e => e.enabled).reduce((s, e) => s + (parseFloat(e.weightPercentage) || 0), 0)
                                        : totalBatchWeight;

                                    return (
                                        <div className={`rounded-2xl p-5 mb-4 flex items-center justify-between ${currentWeight === 100 ? 'bg-emerald-50 border border-emerald-200' :
                                            currentWeight > 100 ? 'bg-red-50 border border-red-200' :
                                                'bg-amber-50 border border-amber-200'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${currentWeight === 100 ? 'bg-emerald-500 text-white' :
                                                    currentWeight > 100 ? 'bg-red-500 text-white' :
                                                        'bg-amber-500 text-white'
                                                    }`}>
                                                    {currentWeight}%
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[#1B2559]">Total Combined Weight</p>
                                                    <p className={`text-xs font-bold ${currentWeight === 100 ? 'text-emerald-600' :
                                                        'text-red-600'
                                                        }`}>
                                                        {currentWeight === 100 ? '✓ Weights sum up to 100% — Perfect!' :
                                                            currentWeight > 100 ? `⚠ Over 100% by ${currentWeight - 100}%` :
                                                                `${100 - currentWeight}% remaining to reach 100% (Teacher can fill this)`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-32 h-2 bg-white/60 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${currentWeight === 100 ? 'bg-emerald-500' :
                                                    currentWeight > 100 ? 'bg-red-500' : 'bg-amber-500'
                                                    }`} style={{ width: `${Math.min(currentWeight, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <button onClick={bulkAssignMode ? handleBulkAssign : handleBatchCreate} disabled={batchSaving}
                                    className={`w-full py-4 rounded-2xl font-black text-sm transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${bulkAssignMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-[#111C44] hover:bg-[#1a2a5e] text-white'
                                        }`}>
                                    {batchSaving ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> processing...</>
                                    ) : (
                                        bulkAssignMode ? (
                                            <><Save size={16} /> Global Assign to All Courses</>
                                        ) : (
                                            <><Plus size={16} /> Create All Assessments ({Object.values(batchEntries).filter(e => e.enabled).length})</>
                                        )
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : activeView === 'groupEdit' ? (
                        /* ======================== GROUP EDIT VIEW ======================== */
                        <div>
                            <button onClick={() => setActiveView('list')}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
                                <ArrowLeft size={16} /> Back to List
                            </button>

                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-4xl mb-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black">Manage Assessment Weights</h2>
                                        <p className="text-sm text-slate-400">Edit marks and weights for all continuous assessments at once.</p>
                                    </div>
                                    <div className={`px-6 py-3 rounded-2xl text-sm font-black border shadow-sm ${groupEditItems.reduce((s, a) => s + (a.WeightPercentage || 0), 0) === 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                                        }`}>
                                        Total Weight: {groupEditItems.reduce((s, a) => s + (a.WeightPercentage || 0), 0)}%
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {groupEditItems.map((item, idx) => (
                                        <div key={item.Id} className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <div className="w-24 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-center shadow-sm">
                                                {item.Type}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    value={item.Title}
                                                    onChange={e => {
                                                        const newItems = [...groupEditItems];
                                                        newItems[idx].Title = e.target.value;
                                                        setGroupEditItems(newItems);
                                                    }}
                                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                                    placeholder="Assessment Title"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">MARKS</span>
                                                    <input
                                                        type="number"
                                                        value={item.TotalMarks}
                                                        onChange={e => {
                                                            const newItems = [...groupEditItems];
                                                            newItems[idx].TotalMarks = parseFloat(e.target.value) || 0;
                                                            setGroupEditItems(newItems);
                                                        }}
                                                        className="w-full pl-14 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-32">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">WEIGHT</span>
                                                    <input
                                                        type="number"
                                                        value={item.WeightPercentage}
                                                        onChange={e => {
                                                            const newItems = [...groupEditItems];
                                                            newItems[idx].WeightPercentage = parseFloat(e.target.value) || 0;
                                                            setGroupEditItems(newItems);
                                                        }}
                                                        className="w-full pl-14 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-blue-600"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-end gap-4">
                                    <button onClick={() => setActiveView('list')} className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBatchUpdateAssessments}
                                        disabled={groupEditLoading}
                                        className="px-10 py-3 bg-[#111C44] text-white rounded-2xl text-sm font-black hover:bg-[#1a2a5e] transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {groupEditLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                                        Save All Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : activeView === 'edit' ? (
                        /* ======================== EDIT VIEW ======================== */
                        <div>
                            <button onClick={() => setActiveView('list')}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
                                <ArrowLeft size={16} /> Back
                            </button>

                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-2xl">
                                <h2 className="text-2xl font-black mb-2">Edit Assessment</h2>
                                <p className="text-sm text-slate-400 mb-8">Update the details for this assessment entry.</p>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year *</label>
                                            <select value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value })}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                <option value="">Select...</option>
                                                {academicYears.map(a => <option key={a.Id} value={a.Id}>{a.Name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester *</label>
                                            <select value={form.semesterId} onChange={e => setForm({ ...form, semesterId: e.target.value })}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                <option value="">Select...</option>
                                                {semesters.filter(s => !form.academicYearId || s.AcademicYearId === parseInt(form.academicYearId)).map(s => (
                                                    <option key={s.Id} value={s.Id}>{s.Name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grade *</label>
                                            <select value={form.gradeId} onChange={e => setForm({ ...form, gradeId: e.target.value, classId: '' })}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                <option value="">Select...</option>
                                                {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section (Optional)</label>
                                            <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}
                                                disabled={!form.gradeId}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50">
                                                <option value="">All Sections</option>
                                                {teacherClasses.filter(c => String(c.GradeId) === String(form.gradeId)).map(c => (
                                                    <option key={c.ClassId} value={c.ClassId}>{c.Section}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {isAdmin ? 'Course *' : 'My Assigned Course *'}
                                        </label>
                                        <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                            <option value="">Select...</option>
                                            {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                        </select>
                                    </div>

                                    {/* Assessment Type selector */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type *</label>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {assessmentTypes.map(t => {
                                                const isExempt = !isAdmin && adminOnlyAssessment && (t === 'Mid' || t === 'Final');
                                                if (isExempt) return null;
                                                return (
                                                    <button key={t} onClick={() => setForm({ ...form, type: t })}
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${form.type === t ? typeColors[t] + ' shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                                                        {t}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title *</label>
                                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                            placeholder={`e.g. ${form.type} 1 - Chapter 1-3`} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Marks *</label>
                                            <input type="number" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: e.target.value })}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weight % *</label>
                                            <input type="number" value={form.weightPercentage} onChange={e => setForm({ ...form, weightPercentage: e.target.value })}
                                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                placeholder="e.g. 10 for 10%" />
                                        </div>
                                    </div>

                                    <button onClick={handleCreateOrUpdate}
                                        className="w-full bg-[#111C44] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#1a2a5e] transition-colors shadow-lg flex items-center justify-center gap-2">
                                        <Save size={16} /> Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ======================== LIST VIEW ======================== */
                        <div>
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>


                                    {isAdmin && (
                                        <div className="mt-4 flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-slate-100 w-fit">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <div className="relative">
                                                    <input type="checkbox" checked={adminOnlyAssessment}
                                                        onChange={e => toggleAdminOnly(e.target.checked)}
                                                        className="sr-only peer" />
                                                    <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
                                                </div>
                                                <span className="text-xs font-black text-[#1B2559] uppercase tracking-wider">Restriction of Assessment for Teacher</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {isAdmin && (
                                        <button onClick={() => {
                                            const activeAY = academicYears.find(a => a.IsActive) || academicYears[academicYears.length - 1];
                                            const activeSem = semesters.find(s => s.IsActive) || semesters[0];
                                            if (activeAY) setSelectedAY(String(activeAY.Id));
                                            if (activeSem) setSelectedSemester(String(activeSem.Id));
                                            setBulkAssignMode(true);
                                            setActiveView('create');
                                        }}
                                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg">
                                            <Save size={16} /> Bulk Assign (All Courses)
                                        </button>
                                    )}
                                    {(isAdmin || !adminOnlyAssessment) && (
                                        <button onClick={() => {
                                            const activeAY = academicYears.find(a => a.IsActive) || academicYears[academicYears.length - 1];
                                            const activeSem = semesters.find(s => s.IsActive) || semesters[0];
                                            if (activeAY) setBatchShared(prev => ({ ...prev, academicYearId: String(activeAY.Id) }));
                                            if (activeSem) setBatchShared(prev => ({ ...prev, semesterId: String(activeSem.Id) }));
                                            setBulkAssignMode(false);
                                            setActiveView('create');
                                        }}
                                            className="flex items-center gap-2 bg-[#111C44] text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#1a2a5e] transition-colors shadow-lg">
                                            <Plus size={16} /> New Assessment
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-8">
                                <div className="flex gap-4 flex-wrap">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Academic Year</label>
                                        <select value={selectedAY} onChange={e => setSelectedAY(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none">
                                            <option value="">All Years</option>
                                            {academicYears.map(a => <option key={a.Id} value={a.Id}>{a.Name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Semester</label>
                                        <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none">
                                            <option value="">All Semesters</option>
                                            {semesters.filter(s => !selectedAY || s.AcademicYearId === parseInt(selectedAY)).map(s => (
                                                <option key={s.Id} value={s.Id}>{s.Name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Grade</label>
                                        <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); }}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none">
                                            <option value="">All Grades</option>
                                            {grades.map(g => <option key={g.Id} value={g.Id}>Grade {g.GradeNumber}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-bold text-slate-400 mb-1 block">Section</label>
                                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                                            disabled={!selectedGrade}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none disabled:opacity-50">
                                            <option value="">All Sections</option>
                                            {teacherClasses.filter(c => String(c.GradeId) === String(selectedGrade)).map(c => (
                                                <option key={c.ClassId} value={c.ClassId}>{c.Section}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Assessment Grid - Grouped by Course */}
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-slate-100 border-t-[#111C44] rounded-full animate-spin"></div>
                                </div>
                            ) : assessments.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                                    <ClipboardList size={56} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold text-lg">No assessments found</p>
                                    <p className="text-slate-300 text-sm mt-1">Try changing filters or create a new assessment</p>
                                </div>
                            ) : (() => {
                                // Group assessments by course+grade+semester+section
                                const flattened: Assessment[] = [];
                                assessments.forEach(a => {
                                    if (a.ClassId || a.ClassSection) {
                                        flattened.push(a);
                                    } else if (!isAdmin) {
                                        // For teachers: Map global assessments to their assigned classes by GradeId
                                        const matches = teacherClasses.filter((tc: any) =>
                                            String(tc.GradeId) === String(a.GradeId)
                                        );

                                        if (matches.length > 0) {
                                            matches.forEach((m: any) => {
                                                flattened.push({ ...a, ClassSection: m.Section, ClassId: m.ClassId });
                                            });
                                        } else {
                                            flattened.push(a); // Fallback: no teacher class match
                                        }
                                    } else {
                                        flattened.push(a); // Admin sees as is
                                    }
                                });

                                const grouped: Record<string, Assessment[]> = {};
                                flattened.forEach(a => {
                                    const key = `${a.CourseId}-${a.GradeId}-${a.SemesterId}-${a.ClassSection || 'all'}`;
                                    if (!grouped[key]) grouped[key] = [];
                                    grouped[key].push(a);
                                });
                                const totalWeight = (group: Assessment[]) =>
                                    group.reduce((sum, a) => sum + a.WeightPercentage, 0);

                                return (
                                    <div className="space-y-6">
                                        {Object.entries(grouped).map(([key, group]) => {
                                            const first = group[0];
                                            const weight = totalWeight(group);

                                            return (
                                                <div key={key} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-4">
                                                    {/* Course Header */}
                                                    <div className="px-8 py-6 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50 cursor-pointer hover:from-slate-50 transition-all"
                                                        onClick={() => toggleGroup(key)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-[#111C44] flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                                                                <BookOpen size={22} className="text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-black text-[#1B2559] group-hover:text-blue-600 transition-colors uppercase tracking-tight">{first.CourseName}</h3>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                                        Grade {first.GradeNumber} {first.ClassSection ? `(${first.ClassSection})` : ''} • {first.SemesterName} • {academicYears.find((a: any) => a.Id === first.AcademicYearId)?.Name || ''}
                                                                    </p>
                                                                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{group.length} Assessments</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col items-end gap-1 mr-4">
                                                                {!isYearLocked(first.AcademicYearId, group.some(a => a.IsRegradeAllowed)) ? (
                                                                    <button onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const editable = group.filter(a => isAdmin || !(a.Type === 'Mid' || a.Type === 'Final'));
                                                                        setGroupEditItems([...editable]);
                                                                        setActiveView('groupEdit');
                                                                    }} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 transition-all">
                                                                        Manage Weights/Marks
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">🔒 Locked</span>
                                                                )}
                                                            </div>
                                                            <div className={`px-5 py-2.5 rounded-2xl text-[11px] font-black tracking-tighter shadow-sm border ${weight === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                weight > 100 ? 'bg-red-50 text-red-700 border-red-100' :
                                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                                }`}>
                                                                {weight}% TOTAL WEIGHT
                                                            </div>
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-[#111C44] transition-all">
                                                                {expandedGroups[key] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Assessment Types Table - Expanded Content */}
                                                    {expandedGroups[key] && (
                                                        <>
                                                            <div className="divide-y divide-slate-50 border-t border-slate-100 bg-white">
                                                                {group.map(a => {
                                                                    return (
                                                                        <div key={a.Id} className="px-8 py-5 flex items-center gap-6 hover:bg-slate-50/30 transition-colors group/row">
                                                                            {/* Type Badge */}
                                                                            <div className="w-28 shrink-0">
                                                                                <span className={`inline-block px-4 py-1.5 rounded-2xl text-[10px] uppercase tracking-widest font-black border ${typeColors[a.Type] || 'bg-slate-50 text-slate-600'}`}>
                                                                                    {a.Type}
                                                                                </span>
                                                                            </div>

                                                                            {/* Title */}
                                                                            <div className="flex-1 min-w-0">
                                                                                {/* <p className="font-black text-[#1B2559] text-sm truncate">{a.Title}</p>
                                                                                <p className="text-[10px] text-slate-300 font-bold">by {a.CreatedByName}</p> */}
                                                                            </div>

                                                                            {/* Marks */}
                                                                            <div className="w-20 text-center shrink-0">
                                                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Marks</p>
                                                                                <p className="text-sm font-black text-[#1B2559]">{a.TotalMarks} pts</p>
                                                                            </div>

                                                                            {/* Weight */}
                                                                            <div className="w-20 text-center shrink-0">
                                                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Weight</p>
                                                                                <p className="text-sm font-black text-[#1B2559]">{a.WeightPercentage}%</p>
                                                                            </div>

                                                                            {/* Actions */}
                                                                            {(() => {
                                                                                const isRestricted = !isAdmin && (a.Type === 'Mid' || a.Type === 'Final');
                                                                                const canManage = isAdmin || !isRestricted;
                                                                                const locked = isYearLocked(a.AcademicYearId, a.IsRegradeAllowed);

                                                                                return (
                                                                                    <div className="flex gap-2 shrink-0 items-center">
                                                                                        {!locked && (
                                                                                            <button onClick={() => openGrading(a)}
                                                                                                className="px-4 py-2.5 bg-[#F8FAFC] text-[#1B2559] rounded-xl text-[11px] font-black hover:bg-[#111C44] hover:text-white transition-all flex items-center gap-1.5">
                                                                                                <PenTool size={12} /> Grade
                                                                                            </button>
                                                                                        )}

                                                                                        {canManage && !locked ? (
                                                                                            <>
                                                                                                <button onClick={() => openEdit(a)}
                                                                                                    className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-amber-50 hover:text-amber-500 transition-all">
                                                                                                    <Edit2 size={14} />
                                                                                                </button>
                                                                                                {isAdmin && (
                                                                                                    <>
                                                                                                        <button onClick={(e) => { e.stopPropagation(); toggleRegradePermission(a.Id, a.IsRegradeAllowed); }}
                                                                                                            title={a.IsRegradeAllowed ? 'Disable Teacher Regrade' : 'Allow Teacher Regrade'}
                                                                                                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${a.IsRegradeAllowed ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                                                                                            {a.IsRegradeAllowed ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                                                                                        </button>
                                                                                                        <button onClick={() => handleDeleteAssessment(a.Id)}
                                                                                                            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all">
                                                                                                            <Trash2 size={14} />
                                                                                                        </button>
                                                                                                    </>
                                                                                                )}
                                                                                            </>
                                                                                        ) : null}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Total Weight Bar at Bottom */}
                                                            <div className="px-8 py-3 bg-slate-50/50 border-t border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{group.length} type{group.length !== 1 ? 's' : ''}</span>
                                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full transition-all ${weight === 100 ? 'bg-emerald-500' :
                                                                            weight > 100 ? 'bg-red-500' : 'bg-amber-400'
                                                                            }`} style={{ width: `${Math.min(weight, 100)}%` }}></div>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black ${weight === 100 ? 'text-emerald-600' :
                                                                        weight > 100 ? 'text-red-600' : 'text-amber-600'
                                                                        }`}>
                                                                        {weight === 100 ? '✓ 100%' : `${weight}%`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AssessmentManagement;



