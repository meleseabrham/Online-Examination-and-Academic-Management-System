import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
    ChevronLeft, CheckCircle, AlertCircle, Loader, MessageSquare,
    Award, BookOpen, Clock, User, FileText, Send, Check, X
} from 'lucide-react';

interface Answer {
    QuestionId: number;
    QuestionText: string;
    QuestionType: string;
    Points: number;
    SelectedOptionText?: string;
    CorrectOptionText?: string;
    IsCorrectAnswer?: boolean;
    EssayAnswer?: string;
    MarksAwarded?: number;
    Feedback?: string;
    MatchingAnswer?: string;
    MatchingPairs?: { PairId: number; LeftText: string; RightText: string; StudentRightText?: string; IsCorrect: boolean }[];
}

interface AttemptDetails {
    StudentName: string;
    ExamTitle: string;
    Status: string;
    AutoScore: number;
    TotalPoints: number;
}

const GradeSubmission = () => {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user?.role === 'Admin' || user?.role === 'admin' || user?.role === 'Director' || user?.role === 'director';
    const role = user?.role?.toLowerCase() === 'director' ? 'director' : (isAdmin ? 'admin' : 'teacher');
    const headers = { Authorization: `Bearer ${token}` };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [details, setDetails] = useState<AttemptDetails | null>(null);
    const [manualMarks, setManualMarks] = useState<{ [qId: number]: number }>({});
    const [feedback, setFeedback] = useState('');

    const fetchData = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/${role}/attempts/${attemptId}/answers`, { headers });
            setAnswers(res.data.answers);

            const initialMarks: { [qId: number]: number } = {};
            let firstFeedback = '';
            res.data.answers.forEach((a: Answer) => {
                if (a.QuestionType === 'Essay') {
                    initialMarks[a.QuestionId] = a.MarksAwarded || 0;
                    if (a.Feedback && !firstFeedback) firstFeedback = a.Feedback;
                }
            });
            setManualMarks(initialMarks);
            setFeedback(firstFeedback);

            setDetails({
                StudentName: res.data.studentName || 'Student',
                ExamTitle: res.data.examTitle || 'Examination',
                Status: res.data.status || 'Submitted',
                AutoScore: res.data.autoScore || 0,
                TotalPoints: res.data.totalPoints || 0
            });
        } catch (err) {
            console.error('Error fetching answers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [attemptId]);

    const handleMarkChange = (qId: number, val: string, max: number) => {
        const num = parseFloat(val) || 0;
        if (num > max) return;
        setManualMarks({ ...manualMarks, [qId]: num });
    };

    const calculateFinalScore = () => {
        const auto = details?.AutoScore || 0;
        const manual = Object.values(manualMarks).reduce((acc, curr) => acc + curr, 0);
        return auto + manual;
    };

    const handleSubmitGrade = async () => {
        setSaving(true);
        try {
            // Convert feedback to the required format { questionId: feedback }
            const feedbackMap: { [qId: number]: string } = {};
            answers.forEach(a => {
                if (a.QuestionType === 'Essay') {
                    feedbackMap[a.QuestionId] = feedback; // Using the single global feedback for now
                }
            });

            await axios.post(`http://localhost:5000/api/${role}/attempts/grade-essay`, {
                attemptId: Number(attemptId),
                marks: manualMarks,
                feedback: feedbackMap
            }, { headers });

            alert('Grading completed successfully!');
            const prefix = isAdmin ? '/admin' : '/teacher';
            navigate(`${prefix}/results`);
        } catch (err) {
            console.error('Error submitting grade:', err);
            alert('Failed to submit grade.');
        } finally {
            setSaving(false);
        }
    };

    const renderMatchingReview = (a: Answer) => {
        const studentPairs = a.MatchingAnswer ? JSON.parse(a.MatchingAnswer) : {};
        const pairs = Array.isArray(a.MatchingPairs) ? a.MatchingPairs : [];

        return (
            <div className="space-y-4">
                {pairs.map((pair, pIdx) => {
                    const studentChoice = studentPairs[pair.PairId] || studentPairs[String(pair.PairId)];
                    const isCorrect = String(studentChoice || '').trim().toLowerCase() === String(pair.RightText || '').trim().toLowerCase() && studentChoice;

                    return (
                        <div key={pIdx} className="flex flex-col sm:flex-row items-center gap-4 bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm group/pair">
                            <div className="flex-1 font-black text-[#2B3674]">{pair.LeftText}</div>
                            <div className="text-brand-blue font-black text-[10px] tracking-widest uppercase opacity-40 px-2">Matched with</div>
                            <div className={`flex-1 p-4 rounded-2xl font-black flex items-center justify-between border ${isCorrect ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                <span>{studentChoice || 'None'}</span>
                                {isCorrect ? <Check size={18} /> : <X size={18} />}
                            </div>
                            {!isCorrect && (
                                <div className="flex-1 p-4 rounded-2xl bg-blue-50 text-brand-blue border border-blue-100 font-black text-xs">
                                    <span className="opacity-50 text-[10px] uppercase block mb-1">Correct Item</span>
                                    {pair.RightText}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <Loader className="animate-spin text-brand-blue" size={40} />
        </div>
    );

    return (
        <div className="flex bg-[#F8FAFC] h-screen overflow-hidden">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F8FAFC] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 scroll-smooth">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-6 hover:text-brand-blue transition-all"
                    >
                        <ChevronLeft size={16} /> Back to Results
                    </button>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                <h2 className="text-2xl font-black text-[#2B3674] mb-8 flex items-center gap-3">
                                    <FileText className="text-brand-blue" />
                                    Submission Review
                                </h2>

                                <div className="space-y-8">
                                    {answers.map((a, idx) => (
                                        <div key={idx} className="p-8 rounded-[35px] border border-slate-50 bg-slate-50/30 group hover:bg-white hover:border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-4">
                                                    <span className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-[#2B3674] font-black text-sm shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-[#2B3674] text-lg leading-relaxed">{a.QuestionText}</p>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 block">
                                                            {a.QuestionType} Question • {a.Points} Points
                                                        </span>
                                                    </div>
                                                </div>

                                                {a.QuestionType !== 'Essay' && (
                                                    <div className={`p-2 rounded-xl border ${a.IsCorrectAnswer ? 'bg-green-50 border-green-100 text-green-500' : 'bg-red-50 border-red-100 text-red-500'}`}>
                                                        {a.IsCorrectAnswer ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-6 ml-14">
                                                {a.QuestionType === 'Essay' ? (
                                                    <div className="space-y-4">
                                                        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm italic text-slate-600 leading-relaxed min-h-[120px]">
                                                            {a.EssayAnswer || <span className="opacity-50">No answer provided.</span>}
                                                        </div>
                                                        <div className="flex items-center gap-4 bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/10">
                                                            <Award className="text-brand-blue" size={20} />
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-black text-brand-blue uppercase tracking-widest block mb-1">Assign Marks (Max {a.Points})</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    max={a.Points}
                                                                    value={manualMarks[a.QuestionId] || 0}
                                                                    onChange={(e) => handleMarkChange(a.QuestionId, e.target.value, a.Points)}
                                                                    className="bg-white border border-brand-blue/20 rounded-xl px-4 py-2 text-sm font-black text-[#2B3674] outline-none focus:ring-2 focus:ring-brand-blue/30 w-32"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : a.QuestionType === 'Matching' ? (
                                                    renderMatchingReview(a)
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Answer</p>
                                                            <p className={`font-bold ${a.IsCorrectAnswer ? 'text-green-600' : 'text-red-500'}`}>
                                                                {a.SelectedOptionText || 'No option selected'}
                                                            </p>
                                                        </div>
                                                        {!a.IsCorrectAnswer && (
                                                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 inline-block">
                                                                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">Correct Answer</p>
                                                                <p className="font-bold text-brand-blue">{a.CorrectOptionText}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-[#111C44] p-4 rounded-[45px] text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-all duration-1000"></div>
                                <h3 className="text-xl font-black mb-10 flex items-center gap-3">
                                    <Award className="text-brand-blue" />
                                    Final Evaluation
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-3xl border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/20 rounded-xl text-green-400"><CheckCircle size={18} /></div>
                                            <span className="text-xs font-black uppercase tracking-widest opacity-60">Auto Score</span>
                                        </div>
                                        <span className="text-xl font-black">{details?.AutoScore}</span>
                                    </div>

                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-3xl border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-blue/20 rounded-xl text-brand-blue"><FileText size={18} /></div>
                                            <span className="text-xs font-black uppercase tracking-widest opacity-60">Manual Marks</span>
                                        </div>
                                        <span className="text-xl font-black">
                                            {Object.values(manualMarks).reduce((a, b) => a + b, 0)}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t border-white/10 mt-8">
                                        <div className="flex justify-between items-center mb-10">
                                            <span className="text-xs font-black uppercase tracking-widest">Total Result</span>
                                            <div className="text-right">
                                                <div className="text-5xl font-black text-white">{calculateFinalScore()}</div>
                                                <div className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">out of {details?.TotalPoints}</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSubmitGrade}
                                            disabled={saving}
                                            className="w-full bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white py-5 rounded-[25px] font-black shadow-2xl shadow-blue-500/40 transition-all flex items-center justify-center gap-3 text-lg"
                                        >
                                            {saving ? <Loader className="animate-spin" size={24} /> : <Send size={24} />}
                                            {saving ? 'UPDATING...' : 'FINALIZE GRADE'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Student Information</h4>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Student</p>
                                            <p className="font-black text-[#2B3674]">{details?.StudentName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                            <BookOpen size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Exam</p>
                                            <p className="font-black text-[#2B3674]">{details?.ExamTitle}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</p>
                                            <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase mt-1 ${details?.Status === 'Graded' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {details?.Status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-100 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-blue group-hover:scale-110 transition-all">
                                    <MessageSquare size={64} />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <MessageSquare size={14} className="text-brand-blue" />
                                    Feedback for Student
                                </h4>
                                <textarea
                                    rows={4}
                                    placeholder="Write something encouraging or constructive..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[30px] p-6 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GradeSubmission;
