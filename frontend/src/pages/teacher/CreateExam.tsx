import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    Plus, FileText, ChevronRight, ChevronLeft, ChevronDown, X, CheckCircle, Loader, BookOpen,
    School, ArrowLeft, Trash2, Send, AlignLeft, Pencil, Settings, Calendar, MoreHorizontal, RotateCcw, Users
} from 'lucide-react';
import ReassignModal from './ReassignModal';

/* ─── Types ─────────────────────────────────────────────── */
interface Course { CourseId: number; CourseName: string; }
interface ClassItem { ClassId: number; GradeName: string; Section: string; GradeId?: number; }
interface Assessment {
    Id: number; Title: string; Type: string; TotalMarks: number;
    CourseId: number; GradeId: number; SemesterId: number; AcademicYearId: number;
    ClassId?: number | null;
}
interface Exam {
    ExamId: number; Title: string; IsPublished: boolean;
    ExamType: string; CourseName: string; GradeName: string;
    Section: string; DurationMinutes: number; TotalMarks: number;
    ClassId?: number; CourseId?: number;
    StartTime?: string; EndTime?: string;
    description?: string;
    SemesterId?: number;
    SemesterName?: string;
    CreatedAt?: string;
    AssessmentId?: number;
    IsMakeup?: boolean;
}
interface Semester { Id: number; Name: string; IsActive: boolean; }
interface Option { text: string; isCorrect: boolean; }
interface Question {
    QuestionId: number; Text: string; Type: string; Points: number;
    Options: { OptionId: number; Text: string; IsCorrect: boolean }[];
    MatchingPairs: { PairId: number; LeftText: string; RightText: string }[];
}
interface ExamForm {
    title: string; courseId: string; classId: string; examType: string;
    durationMinutes: string; totalMarks: string; description: string;
    startTime: string; endTime: string; semesterId: string;
    isMakeup: boolean; parentExamId: string;
    assessmentId: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
const inputCls = "w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-brand-blue focus:bg-white outline-none transition-all font-medium text-sm";
const labelCls = "block text-xs font-black text-[#2B3674] uppercase tracking-wider mb-2";

// Convert a date to local datetime-local input value (YYYY-MM-DDTHH:mm)
const toLocalDateTimeString = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';

    // We want the local time components
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to convert datetime-local string to ISO string for backend
const toUTCISOString = (localDtStr: string): string | null => {
    if (!localDtStr) return null;
    const d = new Date(localDtStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

// Check if a date is within the last 2 days
const isWithinTwoDays = (dateStr?: string): boolean => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    return diffInMs < twoDaysInMs;
};

const defaultOptions = (): Option[] => [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
];

/* ═══════════════════════════════════════════════════════════
   Question Builder Panel
   ───────────────────────────────────────────────────────────
   Note: This component is rendered within the same main layout
═══════════════════════════════════════════════════════════ */
const QuestionBuilder = ({
    exam, token, rolePrefix, onBack, onPublish
}: { exam: Exam; token: string; rolePrefix: string; isAdmin: boolean; onBack: () => void; onPublish: () => void; }) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [questions, setQuestions] = useState<Question[]>([]);
    const [qLoading, setQLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

    const [qText, setQText] = useState('');
    const [qType, setQType] = useState<'MCQ' | 'TF' | 'Matching' | 'Essay'>('MCQ');
    const [qPoints, setQPoints] = useState('1');
    const [options, setOptions] = useState<Option[]>(defaultOptions());
    const [matchPairs, setMatchPairs] = useState([{ left: '', right: '' }, { left: '', right: '' }]);
    const [formError, setFormError] = useState('');

    const fetchQuestions = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams/${exam.ExamId}/questions`, { headers });
            setQuestions(res.data);
        } catch (e) { console.error(e); }
        finally { setQLoading(false); }
    };

    useEffect(() => { fetchQuestions(); }, []);

    const resetForm = () => {
        setQText(''); setQType('MCQ'); setQPoints('1');
        setOptions(defaultOptions());
        setMatchPairs([{ left: '', right: '' }, { left: '', right: '' }]);
        setFormError('');
        setEditingQuestionId(null);
    };

    const handleEditQuestion = (q: Question) => {
        setQText(q.Text);
        setQType(q.Type as 'MCQ' | 'TF' | 'Matching' | 'Essay');
        setQPoints(String(q.Points));
        setFormError('');
        setEditingQuestionId(q.QuestionId);

        if (q.Type === 'MCQ' || q.Type === 'TF') {
            const mapped: Option[] = q.Options.map(o => ({ text: o.Text, isCorrect: o.IsCorrect }));
            while (q.Type === 'MCQ' && mapped.length < 4) mapped.push({ text: '', isCorrect: false });
            setOptions(mapped);
            setMatchPairs([{ left: '', right: '' }, { left: '', right: '' }]);
        } else if (q.Type === 'Matching') {
            const mappedPairs = q.MatchingPairs.map(p => ({ left: p.LeftText, right: p.RightText }));
            setMatchPairs(mappedPairs.length > 0 ? mappedPairs : [{ left: '', right: '' }, { left: '', right: '' }]);
            setOptions(defaultOptions());
        } else if (q.Type === 'Essay') {
            setOptions([]);
            setMatchPairs([]);
        } else { // Fallback for other types or if no specific type is matched
            setOptions(defaultOptions());
            setMatchPairs([{ left: '', right: '' }, { left: '', right: '' }]);
        }
        setShowForm(true);
    };

    const handleTypeChange = (t: 'MCQ' | 'TF' | 'Matching' | 'Essay') => {
        setQType(t);
        if (t === 'TF') setOptions([{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }]);
        else if (t === 'MCQ') setOptions(defaultOptions());
    };

    const handleOptionText = (i: number, val: string) =>
        setOptions(options.map((o, idx) => idx === i ? { ...o, text: val } : o));

    const handleCorrect = (i: number) =>
        setOptions(options.map((o, idx) => ({ ...o, isCorrect: idx === i })));

    const handleSaveQuestion = async () => {
        if (!qText.trim()) { setFormError('Question text is required.'); return; }
        if (qType === 'MCQ' || qType === 'TF') {
            const filled = options.filter(o => o.text.trim());
            if (filled.length < 2) { setFormError('Add at least 2 options.'); return; }
            if (!options.some(o => o.isCorrect)) { setFormError('Mark at least one option as correct.'); return; }
        } else if (qType === 'Matching') {
            const filled = matchPairs.filter(p => p.left.trim() && p.right.trim());
            if (filled.length < 2) { setFormError('Add at least 2 matching pairs.'); return; }
        }
        setSaving(true); setFormError('');
        try {
            const payload: any = { text: qText, type: qType, points: Number(qPoints) || 1 };
            if (qType === 'MCQ' || qType === 'TF') payload.options = options.filter(o => o.text.trim());
            else if (qType === 'Matching') payload.matchingPairs = matchPairs.filter(p => p.left.trim() && p.right.trim());
            // Essay has no options or pairs

            if (editingQuestionId) {
                await axios.put(`http://localhost:5000/api/${rolePrefix}/questions/${editingQuestionId}`, payload, { headers });
            } else {
                payload.examId = exam.ExamId;
                await axios.post(`http://localhost:5000/api/${rolePrefix}/questions`, payload, { headers });
            }

            await fetchQuestions();
            resetForm(); setShowForm(false);
        } catch (e) { setFormError('Failed to save question.'); }
        finally { setSaving(false); }
    };

    const handleDeleteQuestion = async (qId: number) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/${rolePrefix}/questions/${qId}`, { headers });
            setQuestions(q => q.filter(x => x.QuestionId !== qId));
        } catch (e) { alert('Failed to delete question.'); }
    };

    const handlePublish = async () => {
        if (questions.length === 0) { alert('Add at least one question before publishing.'); return; }
        if (!window.confirm('Publish this exam? Students will be able to see it.')) return;
        setPublishing(true);
        try {
            await axios.patch(`http://localhost:5000/api/${rolePrefix}/exams/${exam.ExamId}/publish`, {}, { headers });
            onPublish();
            alert('Exam published successfully!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to publish exam.');
        } finally {
            setPublishing(false);
        }
    };


    return (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-brand-blue font-bold mb-6 transition-all">
                <ArrowLeft size={18} /> Back to Exams Manager
            </button>

            <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-3 py-1 rounded-lg">{exam.ExamType}</span>
                            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${exam.IsPublished ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                {exam.IsPublished ? '🟢 Published' : '⚪ Draft'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#2B3674] mt-2">{exam.Title}</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {exam.CourseName || '—'} &nbsp;•&nbsp; {exam.GradeName ? `${exam.GradeName}-${exam.Section}` : '—'}
                            &nbsp;•&nbsp; {exam.DurationMinutes ? `${exam.DurationMinutes} min` : '—'}
                            &nbsp;•&nbsp; {exam.TotalMarks ? `${exam.TotalMarks} marks` : '—'}
                        </p>
                    </div>
                    {!exam.IsPublished && (
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 disabled:opacity-60 shrink-0"
                        >
                            {publishing ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                            Publish Exam
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm p-8 h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-[#2B3674]">Questions</h3>
                            <p className="text-slate-400 text-sm">{questions.length} question{questions.length !== 1 ? 's' : ''} added</p>
                        </div>
                        {!exam.IsPublished && (
                            <button
                                onClick={() => { setShowForm(true); resetForm(); }}
                                className="bg-brand-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        )}
                    </div>
                    {qLoading ? (
                        <div className="flex justify-center py-12"><Loader size={28} className="animate-spin text-brand-blue" /></div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText size={40} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium">No questions yet.</p>
                            <p className="text-slate-300 text-sm">Click "Add Question" to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((q, i) => (
                                <div key={q.QuestionId} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-brand-blue transition-all">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-6 h-6 bg-brand-blue text-white rounded-lg text-xs font-black flex items-center justify-center">{i + 1}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">{q.Type}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{q.Points} pt{q.Points !== 1 ? 's' : ''}</span>
                                            </div>
                                            <p className="text-sm font-bold text-[#2B3674]">{q.Text}</p>
                                            {q.Options && q.Options.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {q.Options.map((o, idx) => (
                                                        <div key={o.OptionId} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${o.IsCorrect ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-500'}`}>
                                                            <span className="text-[10px] font-black w-4 text-center uppercase text-slate-300">{String.fromCharCode(97 + idx)}</span>
                                                            <span className={`w-2 h-2 rounded-full ${o.IsCorrect ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                            {o.Text}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {q.MatchingPairs && q.MatchingPairs.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    {q.MatchingPairs.map(p => (
                                                        <div key={p.PairId} className="flex items-center gap-2 text-xs bg-white border border-slate-100 p-2 rounded-xl">
                                                            <span className="font-bold text-brand-blue shrink-0">{p.LeftText}</span>
                                                            <span className="text-slate-300">↔</span>
                                                            <span className="text-slate-600">{p.RightText}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {!exam.IsPublished && (
                                            <div className="flex flex-col gap-1 shrink-0">
                                                <button
                                                    onClick={() => handleEditQuestion(q)}
                                                    className="p-2 text-slate-300 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Edit question"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.QuestionId)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete question"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm p-8 h-fit min-h-[400px]">
                    {!showForm ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <FileText size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-[#2B3674] mb-2">Editor Preview</h3>
                            <p className="text-slate-400 text-sm max-w-[250px] mx-auto">
                                Select a question to edit or click <b>"Add Question"</b> to start creating.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[#2B3674]">
                                    {editingQuestionId ? '✏️ Edit Question' : 'New Question'}
                                </h3>
                                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all"><X size={20} /></button>
                            </div>

                            {formError && (
                                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-sm font-bold">{formError}</div>
                            )}

                            <div className="mb-5">
                                <label className={labelCls}>Question Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['MCQ', 'TF', 'Matching', 'Essay'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleTypeChange(t)}
                                            className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 border transition-all ${qType === t ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-brand-blue'}`}
                                        >
                                            {t === 'MCQ' ? 'MCQ' : t === 'TF' ? 'T/F' : t === 'Essay' ? 'Essay' : 'Match'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className={labelCls}>Question Text *</label>
                                <textarea
                                    rows={3} value={qText} onChange={e => setQText(e.target.value)}
                                    placeholder="Enter your question here..."
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            <div className="mb-5">
                                <label className={labelCls}>Points</label>
                                <input type="number" min="1" value={qPoints} onChange={e => setQPoints(e.target.value)} className={inputCls} />
                            </div>

                            {qType === 'MCQ' && (
                                <div className="mb-5">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className={labelCls}>Answer Options</label>
                                        <button
                                            type="button"
                                            onClick={() => setOptions([...options, { text: '', isCorrect: false }])}
                                            className="text-xs text-brand-blue font-bold hover:underline mb-2"
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {options.map((o, i) => (
                                            <div key={i} className="flex items-center gap-3 group/opt">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCorrect(i)}
                                                    className={`w-6 h-6 rounded-full border-2 shrink-0 transition-all flex items-center justify-center text-[10px] font-black uppercase ${o.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-400 hover:border-green-400 hover:text-green-500'}`}
                                                    title="Mark as correct"
                                                >
                                                    {String.fromCharCode(97 + i)}
                                                </button>
                                                <input
                                                    type="text" value={o.text} placeholder={`Option ${i + 1}`}
                                                    onChange={e => handleOptionText(i, e.target.value)}
                                                    className={`${inputCls} flex-1`}
                                                />
                                                {options.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                                                        className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/opt:opacity-100"
                                                        title="Remove option"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {qType === 'TF' && (
                                <div className="mb-5">
                                    <label className={labelCls}>Correct Answer</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['True', 'False'].map((val, i) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setOptions([
                                                    { text: 'True', isCorrect: i === 0 },
                                                    { text: 'False', isCorrect: i === 1 }
                                                ])}
                                                className={`py-3 rounded-xl font-bold text-sm border transition-all ${options[i]?.isCorrect ? 'bg-green-500 text-white border-green-500 shadow-lg' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-green-400'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {qType === 'Matching' && (
                                <div className="mb-5">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className={labelCls}>Matching Pairs</label>
                                        <button type="button" onClick={() => setMatchPairs([...matchPairs, { left: '', right: '' }])}
                                            className="text-xs text-brand-blue font-bold hover:underline">+ Add Pair</button>
                                    </div>
                                    <div className="space-y-3">
                                        {matchPairs.map((p, i) => (
                                            <div key={i} className="flex gap-2 items-start group/pair">
                                                <div className="grid grid-cols-2 gap-2 flex-1">
                                                    <input type="text" placeholder={`Left ${i + 1}`} value={p.left}
                                                        onChange={e => setMatchPairs(matchPairs.map((x, idx) => idx === i ? { ...x, left: e.target.value } : x))}
                                                        className={inputCls} />
                                                    <input type="text" placeholder={`Right ${i + 1}`} value={p.right}
                                                        onChange={e => setMatchPairs(matchPairs.map((x, idx) => idx === i ? { ...x, right: e.target.value } : x))}
                                                        className={inputCls} />
                                                </div>
                                                {matchPairs.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMatchPairs(matchPairs.filter((_, idx) => idx !== i))}
                                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/pair:opacity-100"
                                                        title="Remove pair"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {qType === 'Essay' && (
                                <div className="mb-5 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                    <p className="text-xs font-bold text-brand-blue/80 flex items-center gap-2">
                                        <AlignLeft size={14} /> NO OPTIONS REQUIRED FOR ESSAY
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">
                                        Students will be provided with a text area to write their answer. This question will require manual grading.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleSaveQuestion}
                                disabled={saving}
                                className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {saving ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                {saving ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save Question'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   Main CreateExam Page
═══════════════════════════════════════════════════════════ */
const CreateExam = () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email || 'teacher@example.com';
    const token = localStorage.getItem('token') || '';
    const isAdmin = user?.role === 'Admin' || user?.role === 'admin';
    const rolePrefix = isAdmin ? 'admin' : 'teacher';
    const headers = { Authorization: `Bearer ${token}` };

    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [examsLoading, setExamsLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [editingExamId, setEditingExamId] = useState<number | null>(null);
    const [reassignExam, setReassignExam] = useState<Exam | null>(null);

    // Pagination state for Drafts
    const [draftPage, setDraftPage] = useState(1);
    const [draftPerPage, setDraftPerPage] = useState(10);
    const [draftPerPageOpen, setDraftPerPageOpen] = useState(false);

    // Pagination state for Published
    const [pubPage, setPubPage] = useState(1);
    const [pubPerPage, setPubPerPage] = useState(10);
    const [pubPerPageOpen, setPubPerPageOpen] = useState(false);

    const [form, setForm] = useState<ExamForm>({
        title: '', courseId: '', classId: '', examType: 'Quiz',
        durationMinutes: '60', totalMarks: '100', description: '', startTime: '', endTime: '',
        semesterId: '',
        isMakeup: false, parentExamId: '',
        assessmentId: ''
    });

    const [budget, setBudget] = useState<{ used: number; available: number } | null>(null);

    const fetchBudget = async (courseId: string, classId: string) => {
        if (!courseId || !classId) {
            setBudget(null);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams/available-marks`, {
                headers,
                params: { courseId, classId }
            });
            setBudget({ used: res.data.usedMarks, available: res.data.availableMarks });
        } catch (err) {
            console.error('Error fetching budget:', err);
        }
    };

    useEffect(() => {
        if (form.courseId && form.classId) {
            fetchBudget(form.courseId, form.classId);
        }
    }, [form.courseId, form.classId]);

    const fetchData = async () => {
        try {
            const [coursesRes, classesRes, examsRes, semestersRes, assessmentsRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/${rolePrefix}/courses`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/classes`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/exams`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/semesters`, { headers }),
                axios.get(`http://localhost:5000/api/${rolePrefix}/assessments`, { headers }),
            ]);
            setCourses(coursesRes.data);
            setClasses(classesRes.data);
            setExams(examsRes.data);
            setSemesters(semestersRes.data);
            setAssessments(assessmentsRes.data);

            // Auto-select active semester if creating new
            if (!editingExamId) {
                const active = semestersRes.data.find((s: Semester) => s.IsActive);
                if (active) setForm(prev => ({ ...prev, semesterId: String(active.Id) }));
            }
        } catch (err) { console.error(err); }
        finally { setExamsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'assessmentId' && value) {
            const selected = assessments.find(a => String(a.Id) === String(value));
            if (selected) {
                setForm(prev => ({
                    ...prev,
                    [name]: value,
                    examType: selected.Type,
                    totalMarks: String(selected.TotalMarks)
                }));
                return;
            }
        }

        // Reset assessment if course or class changes (to force re-validation)
        if (name === 'courseId' || name === 'classId') {
            setForm(prev => ({ ...prev, [name]: value, assessmentId: '' }));
            return;
        }

        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEditExamSettings = (e: React.MouseEvent, exam: Exam) => {
        e.stopPropagation();
        setForm({
            title: exam.Title,
            courseId: String(exam.CourseId),
            classId: String(exam.ClassId),
            examType: exam.ExamType,
            durationMinutes: String(exam.DurationMinutes || ''),
            totalMarks: String(exam.TotalMarks || ''),
            description: (exam as any).Description || '',
            startTime: (exam as any).StartTime ? toLocalDateTimeString((exam as any).StartTime) : '',
            endTime: (exam as any).EndTime ? toLocalDateTimeString((exam as any).EndTime) : '',
            semesterId: String(exam.SemesterId || ''),
            isMakeup: (exam as any).IsMakeup || false,
            parentExamId: String((exam as any).ParentExamId || ''),
            assessmentId: String(exam.AssessmentId || '')
        });
        setEditingExamId(exam.ExamId);
        setShowForm(true);
        const body = document.getElementById('scrollable-body');
        if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUnpublish = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm('Stop publishing this exam? It will move back to drafts and students will no longer see it.')) return;
        try {
            await axios.patch(`http://localhost:5000/api/${rolePrefix}/exams/${id}/unpublish`, {}, { headers });
            await fetchData();
        } catch (err) { alert('Failed to unpublish exam.'); }
    };

    const handleDeleteExam = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this exam? All questions will be lost.')) return;
        try {
            await axios.delete(`http://localhost:5000/api/${rolePrefix}/exams/${id}`, { headers });
            await fetchData();
        } catch (err) { alert('Failed to delete exam.'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess(false);
        try {
            const payload = {
                title: form.title, description: form.description,
                classId: form.classId ? Number(form.classId) : null,
                courseId: form.courseId ? Number(form.courseId) : null,
                examType: form.examType,
                durationMinutes: Number(form.durationMinutes) || null,
                totalMarks: Number(form.totalMarks) || null,
                startTime: toUTCISOString(form.startTime),
                endTime: toUTCISOString(form.endTime),
                semesterId: form.semesterId ? Number(form.semesterId) : null,
                isMakeup: form.isMakeup,
                parentExamId: form.parentExamId ? Number(form.parentExamId) : null,
                assessmentId: form.assessmentId ? Number(form.assessmentId) : null,
            };

            if (editingExamId) {
                await axios.put(`http://localhost:5000/api/${rolePrefix}/exams/${editingExamId}`, payload, { headers });
                setSuccess(true);
                setTimeout(() => { setShowForm(false); setEditingExamId(null); setSuccess(false); }, 1500);
            } else {
                const res = await axios.post(`http://localhost:5000/api/${rolePrefix}/exams`, payload, { headers });
                setSuccess(true);
                setForm({ title: '', courseId: '', classId: '', examType: 'Quiz', durationMinutes: '60', totalMarks: '100', description: '', startTime: '', endTime: '', semesterId: '', isMakeup: false, parentExamId: '', assessmentId: '' });
                setTimeout(async () => {
                    const updated = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams`, { headers });
                    const newExam = updated.data.find((e: Exam) => e.ExamId === res.data.examId);
                    if (newExam) { setSelectedExam(newExam); setShowForm(false); }
                    setSuccess(false);
                }, 600);
            }
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save exam.');
        } finally { setLoading(false); }
    };

    const activeSemester = semesters.find(s => s.IsActive);
    const drafts = exams.filter(e => !e.IsPublished && (activeSemester ? e.SemesterId === activeSemester.Id : true));
    const published = exams.filter(e => e.IsPublished && (activeSemester ? e.SemesterId === activeSemester.Id : true));

    const draftTotalPages = Math.ceil(drafts.length / draftPerPage);
    const paginatedDrafts = drafts.slice((draftPage - 1) * draftPerPage, draftPage * draftPerPage);

    const pubTotalPages = Math.ceil(published.length / pubPerPage);
    const paginatedPublished = published.slice((pubPage - 1) * pubPerPage, pubPage * pubPerPage);

    const renderPagination = (
        currentPage: number,
        totalPages: number,
        totalItems: number,
        perPage: number,
        perPageOpen: boolean,
        onPageChange: (p: number) => void,
        onPerPageChange: (n: number) => void,
        onPerPageToggle: () => void,
        onPerPageClose: () => void
    ) => {
        if (totalItems === 0) return null;
        const pageNumbers: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            pageNumbers.push(1);
            if (currentPage > 3) pageNumbers.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pageNumbers.push(i);
            if (currentPage < totalPages - 2) pageNumbers.push('ellipsis');
            pageNumbers.push(totalPages);
        }
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {pageNumbers.map((p, idx) =>
                        p === 'ellipsis' ? (
                            <div key={`e-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-300">
                                <MoreHorizontal size={14} />
                            </div>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`w-9 h-9 rounded-lg font-bold text-xs transition-all border ${currentPage === p
                                    ? 'border-red-400 text-red-500 bg-red-50'
                                    : 'border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30'
                                    }`}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 disabled:opacity-30 transition-all border border-slate-200 disabled:border-transparent"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="relative">
                    <button
                        onClick={onPerPageToggle}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-[#2B3674] hover:border-brand-blue transition-all"
                    >
                        {perPage} / page
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${perPageOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {perPageOpen && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={onPerPageClose}></div>
                            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-30 overflow-hidden">
                                {[10, 20, 50, 100].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => { onPerPageChange(size); onPerPageClose(); }}
                                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${perPage === size
                                            ? 'text-red-500 bg-red-50'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {size} / page
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden">
            <Sidebar role={isAdmin ? 'admin' : 'teacher'} />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={email} role={isAdmin ? 'admin' : 'teacher'} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    {selectedExam ? (
                        <QuestionBuilder
                            exam={selectedExam}
                            token={token}
                            rolePrefix={rolePrefix}
                            isAdmin={isAdmin}
                            onBack={() => { setSelectedExam(null); fetchData(); }}
                            onPublish={() => { setSelectedExam(null); fetchData(); }}
                        />
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

                                <button
                                    onClick={() => { setShowForm(true); setSuccess(false); setError(''); }}
                                    className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-3"
                                >
                                    <Plus size={20} /> New Exam
                                </button>
                            </div>

                            {showForm && (
                                <div className="bg-white rounded-[30px] shadow-lg border border-slate-100 p-8 mb-8 animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-[#2B3674]">{editingExamId ? 'Edit Exam' : 'Create New Exam'}</h2>
                                            <p className="text-slate-400 text-sm mt-1">After creating, you'll be taken to the question builder.</p>
                                        </div>
                                        <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"><X size={22} /></button>
                                    </div>

                                    {success && (
                                        <div className="mb-6 px-5 py-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 font-bold">
                                            <CheckCircle size={20} /> Exam created! Opening question builder...
                                        </div>
                                    )}
                                    {error && <div className="mb-6 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 font-bold text-sm">{error}</div>}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label className={labelCls}>Exam Title *</label>
                                            <input name="title" required value={form.title} onChange={handleChange} type="text" placeholder="e.g. Midterm Mathematics 2024" className={inputCls} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelCls}><BookOpen size={12} className="inline mr-1" />Course *</label>
                                                <select name="courseId" required value={form.courseId} onChange={handleChange} className={inputCls}>
                                                    <option value="">— Select your assigned course —</option>
                                                    {courses.map(c => <option key={c.CourseId} value={c.CourseId}>{c.CourseName}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelCls}><School size={12} className="inline mr-1" />Class *</label>
                                                <select name="classId" required value={form.classId} onChange={handleChange} className={inputCls}>
                                                    <option value="">— Select your assigned class —</option>
                                                    {classes.map(c => <option key={c.ClassId} value={c.ClassId}>{c.GradeName} — Section {c.Section}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelCls}>Linked Assessment (Optional)</label>
                                            <select name="assessmentId" value={form.assessmentId} onChange={handleChange} className={inputCls}>
                                                <option value="">— Independent Exam —</option>
                                                {assessments
                                                    .filter(a =>
                                                        (!form.courseId || String(a.CourseId) === String(form.courseId)) &&
                                                        (!form.classId || !a.ClassId || String(a.ClassId) === String(form.classId))
                                                    )
                                                    .map(a => (
                                                        <option key={a.Id} value={a.Id}>{a.Title} ({a.Type} • {a.TotalMarks} Marks)</option>
                                                    ))
                                                }
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Linking synchronizes type and marks with the assessment definition.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className={labelCls}>Exam Type</label>
                                                <select
                                                    name="examType"
                                                    value={form.examType}
                                                    onChange={handleChange}
                                                    disabled={!!form.assessmentId}
                                                    className={`${inputCls} ${form.assessmentId ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    <option value="Quiz">Quiz</option>
                                                    <option value="Midterm">Midterm</option>
                                                    <option value="Final">Final</option>
                                                    <option value="Assignment">Assignment</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Duration (min)</label>
                                                <input name="durationMinutes" value={form.durationMinutes} onChange={handleChange} type="number" min="1" className={inputCls} />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-black text-[#2B3674] uppercase tracking-wider">Total Marks</label>
                                                    {budget && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${budget.available <= 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                                            {budget.available} marks remaining
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    name="totalMarks"
                                                    value={form.totalMarks}
                                                    onChange={handleChange}
                                                    type="number"
                                                    min="1"
                                                    disabled={!!form.assessmentId}
                                                    className={`${inputCls} ${form.assessmentId ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelCls}>Start Time</label>
                                                <input name="startTime" value={form.startTime} onChange={handleChange} type="datetime-local" className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>End Time</label>
                                                <input name="endTime" value={form.endTime} onChange={handleChange} type="datetime-local" className={inputCls} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Semester *</label>
                                            <select name="semesterId" required value={form.semesterId} onChange={handleChange} className={inputCls}>
                                                <option value="">— Select Semester —</option>
                                                {semesters.filter(s => s.IsActive).map(s => <option key={s.Id} value={s.Id}>{s.Name} (Active)</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Description</label>
                                            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Instructions for students..." className={`${inputCls} resize-none`} />
                                        </div>
                                        <div className="flex gap-4 pt-2">
                                            <button type="submit" disabled={loading}
                                                className="flex-1 bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                                {loading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                                {loading ? 'Saving...' : editingExamId ? 'Update Settings' : 'Create & Add Questions →'}
                                            </button>
                                            <button type="button" onClick={() => { setShowForm(false); setEditingExamId(null); }} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-black text-[#2B3674] tracking-tight">Draft Exams</h2>
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">{drafts.length}</span>
                                    </div>
                                    {examsLoading ? (
                                        <div className="flex justify-center py-10"><Loader size={28} className="animate-spin text-brand-blue" /></div>
                                    ) : drafts.length === 0 ? (
                                        <div className="text-center py-10">
                                            <FileText size={36} className="mx-auto text-slate-200 mb-3" />
                                            <p className="text-slate-400 text-sm font-medium">No drafts yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                {paginatedDrafts.map(exam => (
                                                    <div
                                                        key={exam.ExamId}
                                                        onClick={() => setSelectedExam(exam)}
                                                        className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-brand-blue hover:bg-white transition-all shadow-sm shadow-transparent hover:shadow-xl hover:shadow-blue-500/5"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-white p-3 rounded-xl text-brand-blue shadow-sm group-hover:bg-brand-blue group-hover:text-white transition-all"><FileText size={20} /></div>
                                                            <div>
                                                                <h4 className="font-bold text-[#2B3674] text-sm">{exam.Title}</h4>
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">
                                                                    {exam.CourseName || '—'} • {exam.GradeName ? `${exam.GradeName}-${exam.Section}` : '—'}
                                                                    {exam.ExamType && <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-slate-500">{exam.ExamType}</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden gap-6">

                                                                {/* Settings Button */}
                                                                <button
                                                                    onClick={(e) => handleEditExamSettings(e, exam)}
                                                                    className="p-2.5 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 transition-all duration-200"
                                                                    title="Edit Settings"
                                                                >
                                                                    <Settings size={20} />
                                                                </button>

                                                                {/* Divider */}
                                                                <div className="w-px h-5 bg-slate-200" />

                                                                {/* Delete Button */}
                                                                <button
                                                                    onClick={(e) => handleDeleteExam(e, exam.ExamId)}
                                                                    className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                                                    title="Delete Exam"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </div>

                                                            {/* Arrow */}
                                                            <ChevronRight
                                                                size={18}
                                                                className="text-slate-400 group-hover:text-brand-blue transition-all duration-200"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {renderPagination(
                                                draftPage, draftTotalPages, drafts.length, draftPerPage, draftPerPageOpen,
                                                (p) => setDraftPage(p),
                                                (n) => { setDraftPerPage(n); setDraftPage(1); },
                                                () => setDraftPerPageOpen(!draftPerPageOpen),
                                                () => setDraftPerPageOpen(false)
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-black text-[#2B3674] tracking-tight">Published Exams</h2>
                                        <span className="bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">{published.length}</span>
                                    </div>
                                    {examsLoading ? (
                                        <div className="flex justify-center py-10"><Loader size={28} className="animate-spin text-brand-blue" /></div>
                                    ) : published.length === 0 ? (
                                        <div className="text-center py-10">
                                            <CheckCircle size={36} className="mx-auto text-slate-200 mb-3" />
                                            <p className="text-slate-400 text-sm font-medium">No published exams yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                {paginatedPublished.map(exam => (
                                                    <div
                                                        key={exam.ExamId}
                                                        onClick={() => setSelectedExam(exam)}
                                                        className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-brand-blue hover:bg-white transition-all shadow-sm shadow-transparent hover:shadow-xl hover:shadow-blue-500/5"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-white p-3 rounded-xl text-green-600 shadow-sm group-hover:bg-brand-blue group-hover:text-white transition-all"><CheckCircle size={20} /></div>
                                                            <div>
                                                                <h4 className="font-bold text-[#2B3674] text-sm">{exam.Title}</h4>
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">{exam.CourseName || '—'} • {exam.GradeName ? `${exam.GradeName}-${exam.Section}` : '—'}</p>
                                                                <div className="flex gap-4 mt-2">
                                                                    {exam.StartTime && (
                                                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                            <Calendar size={10} className="text-brand-blue" />
                                                                            {new Date(exam.StartTime).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            {isWithinTwoDays(exam.CreatedAt) && (
                                                                <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden gap-6">

                                                                    {/* Settings */}
                                                                    <button
                                                                        onClick={(e) => handleEditExamSettings(e, exam)}
                                                                        className="p-2.5 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 transition-all duration-200"
                                                                        title="Exam Settings"
                                                                    >
                                                                        <Settings size={20} />
                                                                    </button>

                                                                    <div className="w-px h-5 bg-slate-200" />

                                                                    {/* Unpublish */}
                                                                    <button
                                                                        onClick={(e) => handleUnpublish(e, exam.ExamId)}
                                                                        className="p-2.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 transition-all duration-200"
                                                                        title="Unpublish (Move to Draft)"
                                                                    >
                                                                        <RotateCcw size={20} />
                                                                    </button>

                                                                    <div className="w-px h-5 bg-slate-200" />

                                                                    {/* Reassign */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setReassignExam(exam);
                                                                        }}
                                                                        className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                                                        title="Re-assign to students"
                                                                    >
                                                                        <Users size={20} />
                                                                    </button>

                                                                </div>
                                                            )}
                                                            {exam.EndTime && new Date() > new Date(exam.EndTime) ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-3 py-1 rounded-full">Ended</span>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-600 px-3 py-1 rounded-full">
                                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                                                                    Live
                                                                </span>
                                                            )}
                                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-blue transition-all" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {renderPagination(
                                                pubPage, pubTotalPages, published.length, pubPerPage, pubPerPageOpen,
                                                (p) => setPubPage(p),
                                                (n) => { setPubPerPage(n); setPubPage(1); },
                                                () => setPubPerPageOpen(!pubPerPageOpen),
                                                () => setPubPerPageOpen(false)
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {reassignExam && (
                    <ReassignModal
                        exam={{
                            ExamId: reassignExam.ExamId,
                            Title: reassignExam.Title,
                            EndTime: reassignExam.EndTime
                        }}
                        token={token}
                        rolePrefix={rolePrefix}
                        onClose={async (newExamId) => {
                            setReassignExam(null);
                            if (newExamId) {
                                await fetchData();
                                const updated = await axios.get(`http://localhost:5000/api/${rolePrefix}/exams`, { headers });
                                const newExam = updated.data.find((e: any) => e.ExamId === newExamId);
                                if (newExam) setSelectedExam(newExam);
                            } else {
                                await fetchData();
                            }
                        }}
                    />
                )}
            </main >
        </div >
    );
};

export default CreateExam;
