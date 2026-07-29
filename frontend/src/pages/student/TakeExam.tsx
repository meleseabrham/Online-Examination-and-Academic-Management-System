import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, ChevronRight, ChevronLeft, Send, AlertCircle, Loader, CheckCircle, Shield, FileText, Flag } from 'lucide-react';

interface Option { OptionId: number; Text: string; }
interface MatchingPair { PairId: number; LeftText: string; RightText: string; }
interface Question {
    QuestionId: number;
    Text: string;
    Type: string;
    Points: number;
    Options: Option[];
    MatchingPairs: MatchingPair[];
}
interface ExamData { Title: string; DurationMinutes: number; TotalMarks: number; }

const TakeExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [exam, setExam] = useState<ExamData | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: number]: any }>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [showResult, setShowResult] = useState<{ score: number; total: number; correctCount: number; totalQuestions: number; elapsedMinutes?: number; durationMinutes?: number } | null>(null);
    const [showTimeUpPopup, setShowTimeUpPopup] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [flags, setFlags] = useState<number[]>([]);

    const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

    useEffect(() => {
        const startAttempt = async () => {
            try {
                // 1. Register/Resume exam start in backend FIRST to ensure session exists for randomization
                const startRes = await axios.post('http://localhost:5000/api/student/exams/start', {
                    studentId: user.id,
                    examId: Number(examId)
                }, { headers });

                const sId = startRes.data.attemptId;
                setAttemptId(sId);

                // 2. Fetch randomized exam questions (this now respects the saved order)
                const res = await axios.get(`http://localhost:5000/api/student/exams/${examId}/questions`, { headers });
                const examData = res.data.exam;
                setExam(examData);
                const questData = res.data.questions;
                setQuestions(questData);

                // Initialize answers from backend data if available
                const initialAnswers: { [key: number]: any } = {};
                questData.forEach((q: any) => {
                    if (q.StudentAnswer) {
                        if (q.Type === 'Matching' && q.StudentAnswer.MatchingAnswer) {
                            try { initialAnswers[q.QuestionId] = JSON.parse(q.StudentAnswer.MatchingAnswer); } catch (e) { }
                        } else if (q.Type === 'Essay' && q.StudentAnswer.EssayAnswer) {
                            initialAnswers[q.QuestionId] = q.StudentAnswer.EssayAnswer;
                        } else if (q.StudentAnswer.SelectedOptionId) {
                            initialAnswers[q.QuestionId] = q.StudentAnswer.SelectedOptionId;
                        }
                    }
                });

                const elapsedSeconds = startRes.data.elapsedSeconds;
                const durationSeconds = examData.DurationMinutes * 60;
                const remainingSeconds = Math.max(durationSeconds - elapsedSeconds, 0);

                // Calculate when the exam should end based on LOCAL clock
                const endTime = Date.now() + (remainingSeconds * 1000);
                setTargetEndTime(endTime);
                setTimeLeft(remainingSeconds);

                // 4. Load persisted answers (LocalStorage as secondary, backend as primary)
                const savedAnswers = localStorage.getItem(`exam_answers_${sId}`);
                const finalAnswers = { ...(savedAnswers ? JSON.parse(savedAnswers) : {}), ...initialAnswers };
                setAnswers(finalAnswers);

                const savedIndex = localStorage.getItem(`exam_index_${sId}`);
                if (savedIndex) {
                    setCurrentIndex(parseInt(savedIndex));
                }

                const savedFlags = localStorage.getItem(`exam_flags_${sId}`);
                if (savedFlags) {
                    setFlags(JSON.parse(savedFlags));
                }

                if (remainingSeconds <= 0) {
                    autoSubmit(sId);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to initialize exam.');
            } finally {
                setLoading(false);
            }
        };
        startAttempt();
    }, [examId]);

    // Anti-Cheating: Detect Tab Swapping & Disable Right Click
    useEffect(() => {
        if (!attemptId || showResult) return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                try {
                    const res = await axios.post('http://localhost:5000/api/student/exams/record-tab-switch', { attemptId }, { headers });
                    if (res.data.locked) {
                        setError('Your exam has been locked because you switched tabs too many times.');
                    }
                    console.log('Suspicious activity: Tab switched recorded.');
                } catch (err) {
                    console.error('Failed to record tab switch');
                }
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const handleCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
        };
    }, [attemptId, showResult]);

    useEffect(() => {
        if (!targetEndTime || !attemptId || showResult) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const currentTotalTimeLeft = Math.max(Math.floor((targetEndTime - now) / 1000), 0);

            setTimeLeft(currentTotalTimeLeft);

            if (currentTotalTimeLeft <= 0) {
                clearInterval(timer);
                autoSubmit();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetEndTime, attemptId, showResult]);

    // Save answers and index to localStorage whenever they change
    useEffect(() => {
        if (attemptId && !showResult) {
            localStorage.setItem(`exam_answers_${attemptId}`, JSON.stringify(answers));
        }
    }, [answers, attemptId, showResult]);

    useEffect(() => {
        if (attemptId && !showResult) {
            localStorage.setItem(`exam_index_${attemptId}`, currentIndex.toString());
        }
    }, [currentIndex, attemptId, showResult]);

    useEffect(() => {
        if (attemptId && !showResult) {
            localStorage.setItem(`exam_flags_${attemptId}`, JSON.stringify(flags));
        }
    }, [flags, attemptId, showResult]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleOptionSelect = async (qId: number, oId: number) => {
        setAnswers(prev => ({ ...prev, [qId]: oId }));
        try {
            await axios.post('http://localhost:5000/api/student/exams/save-progress', {
                attemptId, questionId: qId, selectedOptionId: oId
            }, { headers });
        } catch (e) { console.error('Error saving progress'); }
    };

    const handleMatchingSelect = async (qId: number, pairId: number, value: string) => {
        const newMatching = { ...(answers[qId] || {}), [pairId]: value };
        setAnswers(prev => ({
            ...prev,
            [qId]: newMatching
        }));
        try {
            await axios.post('http://localhost:5000/api/student/exams/save-progress', {
                attemptId, questionId: qId, matchingAnswer: JSON.stringify(newMatching)
            }, { headers });
        } catch (e) { console.error('Error saving progress'); }
    };

    const handleEssayChange = (qId: number, value: string) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
        // Debounced save for essay
        const timeoutId = (window as any)[`essay_timeout_${qId}`];
        if (timeoutId) clearTimeout(timeoutId);
        (window as any)[`essay_timeout_${qId}`] = setTimeout(async () => {
            try {
                await axios.post('http://localhost:5000/api/student/exams/save-progress', {
                    attemptId, questionId: qId, essayAnswer: value
                }, { headers });
            } catch (e) { console.error('Error saving progress'); }
        }, 1000);
    };

    const autoSubmit = (manualId?: number) => {
        setShowTimeUpPopup(true);
        submitExam(manualId);
    };

    const submitExam = async (manualAttemptId?: any) => {
        // Handle case where manualAttemptId is an event (from onClick)
        const idToUse = (typeof manualAttemptId === 'number') ? manualAttemptId : attemptId;
        if (!idToUse) return;
        setIsSubmitting(true);
        try {
            const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
                questionId: Number(qId),
                selectedOptionId: typeof val === 'number' ? val : null,
                matchingAnswer: (typeof val === 'object' && val !== null) ? JSON.stringify(val) : null,
                essayAnswer: typeof val === 'string' ? val : null
            }));
            const res = await axios.post('http://localhost:5000/api/student/exams/submit', {
                attemptId,
                answers: formattedAnswers
            }, { headers });

            const totalPoints = exam?.TotalMarks || questions.reduce((acc, q) => {
                if (q.Type === 'Matching') return acc + (q.Points * q.MatchingPairs.length);
                return acc + q.Points;
            }, 0);

            const totalQuestionsUnits = questions.reduce((acc, q) => {
                if (q.Type === 'Matching') return acc + (q.MatchingPairs?.length || 0);
                return acc + 1;
            }, 0);

            setShowResult({
                score: res.data.score,
                total: totalPoints,
                correctCount: res.data.correctQuestionsCount,
                totalQuestions: totalQuestionsUnits,
                elapsedMinutes: res.data.elapsedMinutes,
                durationMinutes: res.data.durationMinutes
            });

            // Clear persistence upon success
            localStorage.removeItem(`exam_answers_${idToUse}`);
            localStorage.removeItem(`exam_index_${idToUse}`);
            localStorage.removeItem(`exam_flags_${idToUse}`);
        } catch (err) {
            alert('Failed to submit exam. Please try again or contact support.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <Loader size={50} className="animate-spin text-brand-blue mb-4" />
            <p className="font-bold text-[#2B3674] uppercase tracking-widest text-sm">Preparing Your Secure Exam Environment...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">

                {/* Icon */}
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-xl bg-red-50 text-red-600 mb-6">
                    <AlertCircle size={28} />
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                    Access Denied
                </h2>

                {/* Message */}
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {error}
                </p>

                {/* Button */}
                <button
                    onClick={() => navigate('/student/exams')}
                    className="w-full py-2.5 rounded-xl bg-[#111C44] text-white text-sm font-medium hover:bg-brand-blue transition-all duration-200 active:scale-95"
                >
                    Return to Dashboard
                </button>

            </div>
        </div>
    );

    if (showResult) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-display">
            <div className="bg-white p-12 md:p-16 rounded-[60px] shadow-2xl border border-slate-100 max-w-2xl w-full text-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-50 rounded-full"></div>

                <div className="relative z-10">
                    <div className="w-24 h-24 bg-green-500 text-white rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-green-500/20">
                        <CheckCircle size={48} />
                    </div>

                    <h2 className="text-4xl font-black text-[#2B3674] mb-4 tracking-tight">Exam Completed!</h2>
                    <p className="text-blue-500 font-black uppercase tracking-widest text-sm mb-4">
                        {showResult.correctCount} / {showResult.totalQuestions} Questions Correct
                    </p>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-12">Your submission was received successfully</p>

                    <div className="bg-slate-50 rounded-[40px] p-10 mb-12 border border-slate-100 space-y-8">
                        <div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-4">Final Score</p>
                            <div className="flex items-center justify-center gap-4">
                                <span className="text-7xl font-black text-[#2B3674]">{Number(showResult.score)}</span>
                                <span className="text-3xl font-bold text-slate-300">/ {Number(showResult.total)}</span>
                            </div>
                            <div className="mt-6 h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                                    style={{ width: `${(showResult.score / showResult.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {showResult.durationMinutes && (
                            <div className="pt-8 border-t border-slate-200/50">
                                <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Time Taken: {showResult.elapsedMinutes} / {showResult.durationMinutes} min</span>
                                    <span>{Math.round((showResult.elapsedMinutes || 0) / (showResult.durationMinutes || 1) * 100)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${(showResult.elapsedMinutes || 0) >= (showResult.durationMinutes || 0) * 0.9 ? 'bg-red-500' : 'bg-brand-blue'}`}
                                        style={{ width: `${Math.min((showResult.elapsedMinutes || 0) / (showResult.durationMinutes || 1) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => navigate('/student/results')}
                            className="flex-1 bg-brand-blue text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
                        >
                            View Performance History
                        </button>
                        <button
                            onClick={() => navigate('/student')}
                            className="flex-1 bg-white text-[#2B3674] py-5 rounded-3xl font-black border-2 border-slate-100 hover:border-brand-blue/30 transition-all active:scale-95"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const currentQuestion = questions[currentIndex];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-display relative select-none">
            {/* Time Up Popup overlay */}
            {showTimeUpPopup && !showResult && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111C44]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-slate-100 max-w-sm w-full text-center scale-up-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/10">
                            <Clock size={40} className="animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-[#2B3674] mb-3">Time is up!</h2>
                        <p className="text-slate-500 font-bold text-sm">Your examination is being <b>submitted automatically</b>. Please wait a moment...</p>
                        <div className="mt-8 flex justify-center">
                            <Loader size={24} className="animate-spin text-brand-blue" />
                        </div>
                    </div>
                </div>
            )}
            {/* Header / Timer Bar */}
            <header className="bg-white border-b border-slate-100 px-8 py-6 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue border border-brand-blue/10">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[#2B3674] tracking-tight">{exam?.Title}</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Examination Session</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-4 px-8 py-3 rounded-[24px] border-2 transition-all duration-300 ${timeLeft < 300 ? 'border-red-500 bg-red-50 text-red-600 animate-pulse' : 'border-slate-100 bg-slate-50 text-brand-blue'}`}>
                        <Clock size={24} className={timeLeft < 300 ? 'text-red-600' : 'text-brand-blue'} />
                        <span className="text-2xl font-black tabular-nums">{formatTime(timeLeft)}</span>
                    </div>

                    {/* <button
                        onClick={() => setShowSubmitConfirm(true)}
                        disabled={isSubmitting}
                        className="bg-[#111C44] text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:bg-[#1B254B] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        <Send size={18} />
                        Finish Exam
                    </button> */}
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-8 md:p-12 mb-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Question Content */}
                    <div className="lg:col-span-3 space-y-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <span className="w-10 h-10 bg-brand-blue text-white rounded-xl flex items-center justify-center font-black">
                                    {currentIndex + 1}
                                </span>
                                <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Question of {questions.length}</span>
                            </div>
                            <span className="bg-green-100 text-green-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                                {currentQuestion.Points} Points
                            </span>
                        </div>

                        <div className="bg-white p-12 rounded-[50px] shadow-sm border border-slate-100 min-h-[400px] flex flex-col relative overflow-hidden">
                            {/* Flag Ribbon */}
                            {flags.includes(currentQuestion.QuestionId) && (
                                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10">
                                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[64px] border-t-red-600 border-l-[64px] border-l-transparent"></div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8">
                                <h1 className="text-2xl font-bold text-[#2B3674] leading-relaxed mr-12">
                                    {currentQuestion.Text}
                                </h1>
                                <button
                                    onClick={() => {
                                        setFlags(prev => prev.includes(currentQuestion.QuestionId)
                                            ? prev.filter(id => id !== currentQuestion.QuestionId)
                                            : [...prev, currentQuestion.QuestionId]
                                        );
                                    }}
                                    className={`flex-shrink-0 p-3 rounded-2xl transition-all ${flags.includes(currentQuestion.QuestionId) ? 'bg-red-50 text-red-600 border-2 border-red-200 shadow-sm' : 'bg-slate-50 text-slate-400 hover:text-red-500 border-2 border-transparent'}`}
                                    title="Flag for review"
                                >
                                    <Flag size={24} fill={flags.includes(currentQuestion.QuestionId) ? "currentColor" : "none"} />
                                </button>
                            </div>

                            <div className="space-y-6 flex-1">
                                {currentQuestion.Type === 'Matching' ? (
                                    <div className="space-y-6">
                                        {currentQuestion.MatchingPairs.map((pair) => (
                                            <div key={pair.PairId} className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-6 rounded-[30px] border border-slate-100">
                                                <div className="flex-1 font-bold text-[#2B3674]">{pair.LeftText}</div>
                                                <div className="text-brand-blue font-black tracking-widest text-xs">MATCHES WITH</div>
                                                <select
                                                    value={answers[currentQuestion.QuestionId]?.[pair.PairId] || ''}
                                                    onChange={(e) => handleMatchingSelect(currentQuestion.QuestionId, pair.PairId, e.target.value)}
                                                    className="flex-1 p-4 rounded-2xl border-2 border-slate-200 bg-white font-bold text-[#2B3674] focus:border-brand-blue outline-none transition-all"
                                                >
                                                    <option value="">Select an answer...</option>
                                                    {currentQuestion.MatchingPairs.map((p) => (
                                                        <option key={p.PairId} value={p.RightText}>{p.RightText}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                ) : currentQuestion.Type === 'Essay' ? (
                                    <div className="flex-1">
                                        <textarea
                                            className="w-full h-full min-h-[300px] p-8 rounded-[30px] border-2 border-slate-100 bg-slate-50/50 focus:border-brand-blue focus:bg-white outline-none transition-all font-medium text-[#2B3674] leading-relaxed resize-none"
                                            placeholder="Type your comprehensive answer here..."
                                            value={answers[currentQuestion.QuestionId] || ''}
                                            onChange={(e) => handleEssayChange(currentQuestion.QuestionId, e.target.value)}
                                        />
                                        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                            {(answers[currentQuestion.QuestionId] || '').split(/\s+/).filter(Boolean).length} words | {(answers[currentQuestion.QuestionId] || '').length} characters
                                        </p>
                                    </div>
                                ) : (
                                    currentQuestion.Options.map((opt, idx) => (
                                        <button
                                            key={opt.OptionId}
                                            onClick={() => handleOptionSelect(currentQuestion.QuestionId, opt.OptionId)}
                                            className={`w-full p-6 text-left rounded-[30px] border-2 transition-all duration-300 flex items-center justify-between group ${answers[currentQuestion.QuestionId] === opt.OptionId
                                                ? 'border-brand-blue bg-blue-50/50 shadow-lg shadow-blue-500/5'
                                                : 'border-slate-50 bg-slate-50/50 hover:border-brand-blue/30 hover:bg-white'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all text-sm font-black uppercase ${answers[currentQuestion.QuestionId] === opt.OptionId ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                                                    {answers[currentQuestion.QuestionId] === opt.OptionId ? <CheckCircle size={16} /> : String.fromCharCode(97 + idx)}
                                                </div>
                                                <span className={`font-bold transition-all ${answers[currentQuestion.QuestionId] === opt.OptionId ? 'text-brand-blue' : 'text-slate-600'}`}>{opt.Text}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="mt-12 flex items-center justify-between pt-10 border-t border-slate-100">
                                <button
                                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentIndex === 0}
                                    className="flex items-center gap-3 font-black text-[#2B3674] uppercase tracking-widest text-xs disabled:opacity-20 hover:text-brand-blue transition-all"
                                >
                                    <ChevronLeft size={20} /> Previous Question
                                </button>

                                <div className="flex gap-2">
                                    {questions.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-brand-blue' : 'w-2 bg-slate-200'}`}
                                        />
                                    ))}
                                </div>

                                {currentIndex === questions.length - 1 ? (
                                    <button
                                        onClick={() => setShowSubmitConfirm(true)}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-3 font-black text-white bg-[#111C44] px-4 py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-[#1B254B] transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                                        {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                        className="flex items-center gap-3 font-black text-[#2B3674] uppercase tracking-widest text-xs hover:text-brand-blue transition-all"
                                    >
                                        Next Question <ChevronRight size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Question Grid Navigation */}
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm sticky top-32">
                            <h3 className="font-black text-[#2B3674] mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                                <FileText size={18} className="text-brand-blue" /> Exam Navigator
                            </h3>
                            <div className="grid grid-cols-5 gap-4">
                                {questions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 flex items-center justify-center relative ${currentIndex === i
                                            ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-blue-500/20'
                                            : answers[q.QuestionId]
                                                ? 'bg-green-50 border-green-100 text-green-600'
                                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-brand-blue/30'
                                            }`}
                                    >
                                        {i + 1}
                                        {flags.includes(q.QuestionId) && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border-2 border-white rounded-full shadow-sm z-20"></div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-100 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-brand-blue"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Question</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Answered</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Not Visited</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flagged</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            {/* Submit Confirmation Modal */}
            {showSubmitConfirm && !showResult && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#111C44]/80 backdrop-blur-sm animate-in fade-in duration-300 px-6">
                    <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 max-w-sm w-full text-center scale-up-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-blue-50 text-brand-blue rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
                            <Shield size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-[#2B3674] mb-3">Submit Exam?</h2>
                        <p className="text-slate-500 font-bold text-sm mb-10">Are you sure you want to finalize your submission? You won't be able to change your answers after this.</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowSubmitConfirm(false)}
                                className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 text-[#2B3674] font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowSubmitConfirm(false); submitExam(); }}
                                className="flex-1 px-6 py-4 rounded-2xl bg-brand-blue text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
                            >
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeExam;
