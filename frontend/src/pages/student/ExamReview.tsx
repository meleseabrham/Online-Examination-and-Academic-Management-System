import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Check, X, Loader, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, Trophy, Target, Award, Download } from 'lucide-react';

interface Option { OptionId: number; Text: string; IsCorrect: boolean; }
interface MatchingPair { PairId: number; LeftText: string; RightText: string; }
interface QuestionReview {
    QuestionId: number;
    Text: string;
    Type: string;
    Points: number;
    Options: Option[];
    MatchingPairs: MatchingPair[];
    StudentAnswer: {
        SelectedOptionId: number | null;
        MatchingAnswer: string | null;
        EssayAnswer: string | null;
        MarksAwarded: number | null;
        Feedback: string | null;
    } | null;
}

const ExamReview = () => {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const headers = { Authorization: `Bearer ${token}` };

    const [questions, setQuestions] = useState<QuestionReview[]>([]);
    const [totalMarks, setTotalMarks] = useState(0);
    const [correctCount, setCorrectCount] = useState<number | null>(null);
    const [examDetails, setExamDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [questionsPerPage, setQuestionsPerPage] = useState(5);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/student/results/${attemptId}/review`, { headers });
                setQuestions(res.data.questions);
                setTotalMarks(res.data.totalMarks);
                setCorrectCount(res.data.correctCount);
                setExamDetails(res.data.examDetails);
            } catch (err) {
                console.error('Error fetching review:', err);
                setError('Failed to load exam review.');
            } finally {
                setLoading(false);
            }
        };
        fetchReview();
    }, [attemptId]);

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        setIsExporting(true);
        try {
            const element = printRef.current;
            element.style.display = 'block'; // Temporarily reveal for capture

            const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdf = new jsPDF('p', 'mm', 'a4', true);

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = contentHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - contentHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
            }

            pdf.save(`${examDetails?.subject || 'Exam'}_Review.pdf`);
        } catch (error) {
            console.error('PDF Export failed:', error);
        } finally {
            if (printRef.current) printRef.current.style.display = 'none';
            setIsExporting(false);
        }
    };

    // Pagination Logic
    const lastQuestionIndex = currentPage * questionsPerPage;
    const firstQuestionIndex = lastQuestionIndex - questionsPerPage;
    const currentQuestions = questions.slice(firstQuestionIndex, lastQuestionIndex);
    const totalPages = Math.ceil(questions.length / questionsPerPage);

    const renderMatchingReview = (q: QuestionReview) => {
        const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};

        return (
            <div className="space-y-4">
                {q.MatchingPairs.map((pair) => {
                    const studentChoice = studentPairs[pair.PairId] || studentPairs[String(pair.PairId)];
                    const isCorrect = String(studentChoice || '').trim().toLowerCase() === String(pair.RightText || '').trim().toLowerCase() && studentChoice;

                    return (
                        <div key={pair.PairId} className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-6 rounded-[30px] border border-slate-100/50">
                            <div className="flex-1 font-black text-[#2B3674]">{pair.LeftText}</div>
                            <div className="text-brand-blue font-black text-[10px] tracking-widest uppercase opacity-40">Matched with</div>
                            <div className={`flex-1 p-4 rounded-2xl font-black flex items-center justify-between border ${isCorrect ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                <span>{studentChoice || 'None'}</span>
                                {isCorrect ? <Check size={18} /> : <X size={18} />}
                            </div>
                            {!isCorrect && (
                                <div className="flex-1 p-4 rounded-2xl bg-blue-50 text-brand-blue border border-blue-100 font-black text-xs">
                                    <span className="opacity-50 text-[10px] uppercase block mb-1">Correct Answer</span>
                                    {pair.RightText}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderEssayReview = (q: QuestionReview) => {
        const answer = q.StudentAnswer?.EssayAnswer;
        const feedback = q.StudentAnswer?.Feedback;
        const marks = q.StudentAnswer?.MarksAwarded;
        const isGraded = marks !== null && marks !== undefined;

        return (
            <div className="space-y-6">
                <div className="p-8 bg-slate-50 rounded-[35px] border border-slate-100 italic text-[#2B3674] leading-relaxed relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue opacity-20 transition-all group-hover:opacity-100"></div>
                    {answer || <span className="opacity-40 font-black uppercase tracking-widest text-[10px] not-italic">No answer provided.</span>}
                </div>

                {(feedback || isGraded) && (
                    <div className="bg-brand-blue/[0.03] p-8 rounded-[35px] border border-brand-blue/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                                <Award size={16} />
                            </div>
                            <h4 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em]">Teacher Evaluation</h4>
                        </div>
                        {feedback && (
                            <div className="text-sm font-medium text-slate-600 bg-white p-5 rounded-2xl border border-blue-100/50">
                                {feedback}
                            </div>
                        )}
                        {isGraded && (
                            <div className="flex items-center gap-2 text-[#2B3674] font-black">
                                <span className="text-[10px] uppercase opacity-40">Score Awarded:</span>
                                <span className="text-lg">{marks}</span>
                                <span className="text-xs opacity-30">/ {q.Points}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderOptionReview = (q: QuestionReview) => {
        return (
            <div className="space-y-4">
                {q.Options.map((opt) => {
                    const isSelected = q.StudentAnswer?.SelectedOptionId === opt.OptionId;
                    const isCorrect = opt.IsCorrect;

                    let bgColor = 'bg-white border-slate-100';
                    let textColor = 'text-[#2B3674]';
                    let icon = null;

                    if (isSelected && isCorrect) {
                        bgColor = 'bg-green-50 border-green-500 shadow-lg shadow-green-500/10';
                        textColor = 'text-green-700';
                        icon = <Check size={22} className="text-green-500" />;
                    } else if (isSelected && !isCorrect) {
                        bgColor = 'bg-red-50 border-red-500 shadow-lg shadow-red-500/10';
                        textColor = 'text-red-700';
                        icon = <X size={22} className="text-red-500" />;
                    } else if (!isSelected && isCorrect) {
                        bgColor = 'bg-blue-50 border-blue-300 border-dashed';
                        textColor = 'text-brand-blue';
                        icon = <Check size={22} className="text-blue-500 opacity-30" />;
                    }

                    return (
                        <div key={opt.OptionId} className={`p-6 rounded-[24px] border-2 flex items-center justify-between transition-all duration-300 ${bgColor}`}>
                            <span className={`font-black text-lg ${textColor}`}>{opt.Text}</span>
                            <div className="flex items-center gap-3">
                                {isSelected && <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Your Response</span>}
                                {icon}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <Loader size={50} className="animate-spin text-brand-blue mb-6" />
            <p className="font-black text-[#2B3674] uppercase tracking-[0.3em] text-[10px]">Analyzing Assessment Data...</p>
        </div>
    );

    const calculatedScore = questions.reduce((acc, q) => {
        if (q.Type === 'Matching') {
            const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};
            const count = q.MatchingPairs.filter(p => {
                const sVal = String(studentPairs[p.PairId] || studentPairs[String(p.PairId)] || '').trim().toLowerCase();
                const cVal = String(p.RightText || '').trim().toLowerCase();
                return sVal === cVal && sVal !== '';
            }).length;
            return acc + (count * q.Points);
        } else if (q.Type === 'Essay') {
            return acc + (q.StudentAnswer?.MarksAwarded || 0);
        } else {
            const isCorrect = q.Options.some(opt => opt.OptionId === q.StudentAnswer?.SelectedOptionId && opt.IsCorrect);
            return acc + (isCorrect ? q.Points : 0);
        }
    }, 0);

    const totalUnitsCount = questions.reduce((acc, q) => {
        const type = String(q.Type || '').toLowerCase();
        if (type === 'matching') return acc + (q.MatchingPairs?.length || 0);
        return acc + 1;
    }, 0);

    const calculatedCorrectCount = correctCount !== null ? correctCount : questions.reduce((acc, q) => {
        const type = String(q.Type || '').toLowerCase();
        if (type === 'matching') {
            const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};
            const qCorr = (q.MatchingPairs || []).filter(p => {
                const sVal = String(studentPairs[p.PairId] || studentPairs[String(p.PairId)] || '').trim().toLowerCase();
                const cVal = String(p.RightText || '').trim().toLowerCase();
                return sVal === cVal && sVal !== '';
            }).length;
            return acc + qCorr;
        } else if (type === 'essay') {
            return acc + ((q.StudentAnswer?.MarksAwarded || 0) > 0 ? 1 : 0);
        } else {
            const isCorrect = q.Options.some(opt => opt.OptionId === q.StudentAnswer?.SelectedOptionId && opt.IsCorrect);
            return acc + (isCorrect ? 1 : 0);
        }
    }, 0);

    const isAdmin = user.role === 'Admin' || user.role === 'admin';
    const isTeacher = user.role === 'Teacher' || user.role === 'teacher';
    const role = isAdmin ? 'admin' : (isTeacher ? 'teacher' : 'student');

    return (
        <div className="flex bg-[#F4F7FE] h-screen overflow-hidden font-display">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-2 pb-0 flex-none bg-[#F4F7FE] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">
                    <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <button
                                    onClick={() => {
                                        if (isAdmin) {
                                            navigate('/admin/results');
                                        } else if (isTeacher) {
                                            navigate('/teacher/results');
                                        } else {
                                            navigate('/student/results');
                                        }
                                    }}
                                    className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-brand-blue transition-all bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-100"
                                >
                                    <ChevronLeft size={16} /> Back
                                </button>

                                {!loading && !error && (
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={isExporting}
                                        className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px] bg-brand-blue px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {isExporting ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
                                        {isExporting ? 'Generating...' : 'Download PDF'}
                                    </button>
                                )}
                            </div>
                            <h1 className="text-4xl font-black text-[#2B3674] tracking-tighter">Performance Review</h1>
                            <p className="text-slate-500 font-medium mt-1">Detailed analysis of your responses and outcomes.</p>
                        </div>

                        {!loading && !error && (
                            <div className="flex gap-6">
                                <div className="bg-white px-8 py-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-6">
                                    <div className="w-14 h-14 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue">
                                        <Trophy size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total Score</p>
                                        <p className="text-3xl font-black text-[#2B3674] tracking-tight">{calculatedScore} <span className="text-slate-300 text-xl">/ {totalMarks}</span></p>
                                    </div>
                                </div>
                                <div className="bg-white px-8 py-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-6">
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                                        <Target size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Accuracy</p>
                                        <p className="text-3xl font-black text-[#2B3674] tracking-tight">{calculatedCorrectCount} <span className="text-slate-300 text-xl">/ {totalUnitsCount}</span></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {error ? (
                        <div className="bg-white p-20 rounded-[50px] text-center shadow-2xl border border-slate-100 max-w-2xl mx-auto">
                            <AlertCircle size={80} className="text-red-500 mx-auto mb-8" />
                            <h2 className="text-3xl font-black text-[#2B3674] mb-4 tracking-tight">{error}</h2>
                            <button
                                onClick={() => {
                                    if (isAdmin) {
                                        navigate('/admin/results');
                                    } else if (isTeacher) {
                                        navigate('/teacher/results');
                                    } else {
                                        navigate('/student/results');
                                    }
                                }}
                                className="mt-10 bg-[#111C44] text-white px-10 py-5 rounded-[22px] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                Return to Results
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-10 pb-20">
                            {currentQuestions.map((q, i) => {
                                const questionNumber = firstQuestionIndex + i + 1;
                                let pointsEarned = 0;
                                let status = 'Missed';
                                let statusColor = 'bg-red-500 shadow-red-500/20';
                                let borderColor = 'border-red-100';

                                const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};

                                if (q.Type === 'Matching') {
                                    const correct = q.MatchingPairs.filter(p => {
                                        const sVal = String(studentPairs[p.PairId] || studentPairs[String(p.PairId)] || '').trim().toLowerCase();
                                        const cVal = String(p.RightText || '').trim().toLowerCase();
                                        return sVal === cVal && sVal !== '';
                                    }).length;
                                    pointsEarned = correct * q.Points;
                                    if (correct === q.MatchingPairs.length) { status = 'Correct'; statusColor = 'bg-green-500 shadow-green-500/20'; borderColor = 'border-green-100'; }
                                    else if (correct > 0) { status = 'Partial'; statusColor = 'bg-blue-500 shadow-blue-500/20'; borderColor = 'border-blue-100'; }
                                } else if (q.Type === 'Essay') {
                                    const m = q.StudentAnswer?.MarksAwarded;
                                    pointsEarned = m || 0;
                                    if (m === null || m === undefined) {
                                        if (q.StudentAnswer?.EssayAnswer) {
                                            status = 'Pending';
                                            statusColor = 'bg-amber-500 shadow-amber-500/20';
                                            borderColor = 'border-amber-100';
                                        }
                                    } else if (m === q.Points) {
                                        status = 'Correct';
                                        statusColor = 'bg-green-500 shadow-green-500/20';
                                        borderColor = 'border-green-100';
                                    } else if (m > 0) {
                                        status = 'Partial';
                                        statusColor = 'bg-blue-500 shadow-blue-500/20';
                                        borderColor = 'border-blue-100';
                                    } else {
                                        status = 'Incorrect';
                                        statusColor = 'bg-red-500 shadow-red-500/20';
                                        borderColor = 'border-red-100';
                                    }
                                } else {
                                    const isCorrect = q.Options.some(opt => opt.OptionId === q.StudentAnswer?.SelectedOptionId && opt.IsCorrect);
                                    if (isCorrect) {
                                        pointsEarned = q.Points;
                                        status = 'Correct';
                                        statusColor = 'bg-green-500 shadow-green-500/20';
                                        borderColor = 'border-green-100';
                                    }
                                }

                                return (
                                    <div key={q.QuestionId} className={`bg-white p-12 rounded-[50px] shadow-sm border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 ${borderColor}`}>
                                        <div className="flex flex-col md:flex-row items-start justify-between mb-10 gap-6">
                                            <div className="flex items-start gap-6">
                                                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shrink-0 text-xl shadow-lg ${statusColor}`}>
                                                    {questionNumber}
                                                </span>
                                                <div>
                                                    <h3 className="text-2xl font-black text-[#2B3674] leading-tight tracking-tight mb-3">{q.Text}</h3>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{q.Type} Question</span>
                                                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.Points} Points Max</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 self-center md:self-start">
                                                <div className={`px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] mb-3 shadow-sm ${status === 'Correct' ? 'bg-green-50 text-green-600' : status === 'Partial' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                                    {status}
                                                </div>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Award size={14} className="text-slate-300" />
                                                    <p className="text-[11px] font-black text-slate-400 tracking-tighter uppercase">
                                                        Awarded: <span className="text-[#2B3674] text-sm">{pointsEarned} / {q.Type === 'Matching' ? q.Points * q.MatchingPairs.length : q.Points}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pl-0 md:pl-20">
                                            {q.Type === 'Matching' ? renderMatchingReview(q) : q.Type === 'Essay' ? renderEssayReview(q) : renderOptionReview(q)}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Question Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-8 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Questions Per View</p>
                                        <div className="relative">
                                            <select
                                                value={questionsPerPage}
                                                onChange={(e) => { setQuestionsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                                className="bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-[#2B3674] focus:ring-4 focus:ring-brand-blue/10 p-3 pr-10 appearance-none cursor-pointer outline-none"
                                            >
                                                {[5, 10, 20].map(n => <option key={n} value={n}>{n} Items</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => { setCurrentPage(prev => prev - 1); document.getElementById('scrollable-body')?.scrollTo(0, 0); }}
                                            className="px-6 py-4 rounded-[22px] bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 text-[#2B3674] disabled:opacity-30 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 border border-transparent hover:border-slate-100 active:scale-95"
                                        >
                                            <ChevronLeft size={18} /> Prev
                                        </button>
                                        <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-[22px] border border-slate-100 shadow-inner">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page</span>
                                            <span className="text-sm font-black text-[#2B3674]">{currentPage}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">of</span>
                                            <span className="text-[10px] font-black text-brand-blue uppercase">{totalPages}</span>
                                        </div>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => { setCurrentPage(prev => prev + 1); document.getElementById('scrollable-body')?.scrollTo(0, 0); }}
                                            className="px-6 py-4 rounded-[22px] bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 text-[#2B3674] disabled:opacity-30 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 border border-transparent hover:border-slate-100 active:scale-95"
                                        >
                                            Next <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* HIDDEN PRINT LAYER */}
                <div ref={printRef} className="absolute left-0 top-0 w-[800px] bg-white text-black p-10 mt-[-9999px] font-sans" style={{ display: 'none', zIndex: -9999 }}>
                    <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                        <h1 className="text-3xl font-black uppercase mb-2 text-[#2B3674]">{examDetails?.subject || 'Course'} - {examDetails?.title || 'Exam Review'}</h1>
                        <div className="grid grid-cols-2 gap-4 text-left text-sm font-medium mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div><span className="font-bold text-[#2B3674]">Subject:</span> {examDetails?.subject || '-'}</div>
                            <div><span className="font-bold text-[#2B3674]">Teacher Name:</span> {examDetails?.teacher || '-'}</div>
                            <div><span className="font-bold text-[#2B3674]">Academic Year:</span> {examDetails?.year || '-'}</div>
                            <div><span className="font-bold text-[#2B3674]">Semester:</span> {examDetails?.semester || '-'}</div>
                            <div><span className="font-bold text-[#2B3674]">Date Taken:</span> {examDetails?.dateTaken ? new Date(examDetails.dateTaken).toLocaleString() : '-'}</div>
                            <div className="text-brand-blue"><span className="font-bold">Final Score:</span> {calculatedScore} / {totalMarks}</div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {questions.map((q, i) => (
                            <div key={q.QuestionId} className="border-b border-slate-200 pb-6 break-inside-avoid">
                                <p className="font-bold text-lg mb-4 text-[#2B3674]">{i + 1}. {q.Text} <span className="text-xs font-black bg-slate-100 px-2 py-1 rounded-md text-slate-500 ml-2">({q.Points} pts)</span></p>

                                {q.Type === 'Matching' ? (
                                    <div className="pl-6 space-y-3 mt-2">
                                        {q.MatchingPairs.map((p) => {
                                            const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};
                                            const sChoice = studentPairs[p.PairId] || studentPairs[String(p.PairId)] || 'Unanswered';
                                            const isCorrect = String(sChoice).trim().toLowerCase() === String(p.RightText).trim().toLowerCase() && sChoice !== 'Unanswered';
                                            return (
                                                <div key={p.PairId} className="text-sm bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-4">
                                                    <span className="font-bold min-w-[150px]">{p.LeftText}</span>
                                                    <span className="text-slate-400">➔</span>
                                                    <span className={isCorrect ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{sChoice}</span>
                                                    {!isCorrect && <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded ml-auto">Correct: {p.RightText}</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : q.Type === 'Essay' ? (
                                    <div className="pl-6 mt-2 text-sm italic border-l-4 border-slate-200 py-2">
                                        <p className="text-slate-600 mb-3">{q.StudentAnswer?.EssayAnswer || 'No answer provided.'}</p>
                                        <div className="not-italic bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                            {q.StudentAnswer?.MarksAwarded !== null && (
                                                <div className="text-brand-blue font-bold text-xs uppercase tracking-wider mb-1">Score: {q.StudentAnswer?.MarksAwarded} / {q.Points}</div>
                                            )}
                                            {q.StudentAnswer?.Feedback && (
                                                <div className="text-slate-600 text-[13px]"><span className="font-bold">Feedback:</span> {q.StudentAnswer.Feedback}</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pl-6 space-y-2 mt-2">
                                        {q.Options.map((opt) => {
                                            const isSelected = q.StudentAnswer?.SelectedOptionId === opt.OptionId;
                                            return (
                                                <div key={opt.OptionId} className={`text-sm p-3 rounded-xl border flex items-center gap-3
                                                    ${isSelected && opt.IsCorrect ? 'bg-green-50 border-green-200 text-green-700 font-bold' :
                                                        isSelected && !opt.IsCorrect ? 'bg-red-50 border-red-200 text-red-700' :
                                                            !isSelected && opt.IsCorrect ? 'bg-blue-50/50 border-blue-200 text-blue-600 font-bold' :
                                                                'bg-white border-slate-100 text-slate-600'}`}>

                                                    <div className={`w-4 h-4 shrink-0 rounded flex items-center justify-center border
                                                        ${isSelected ? 'bg-brand-blue border-brand-blue' : 'bg-white border-slate-300'}`}>
                                                        {isSelected && <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                                    </div>

                                                    <span>{opt.Text}</span>

                                                    {opt.IsCorrect && <span className="ml-auto text-[10px] uppercase tracking-widest bg-blue-100/50 px-2 py-0.5 rounded text-blue-600">Correct Option</span>}
                                                    {isSelected && !opt.IsCorrect && <span className="ml-auto text-[10px] uppercase tracking-widest bg-red-100 px-2 py-0.5 rounded text-red-600">Your Answer</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default ExamReview;
