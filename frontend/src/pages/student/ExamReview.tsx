import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Check, X, Loader, AlertCircle, ChevronLeft, Award, Download, User, BookOpen, Clock, FileText } from 'lucide-react';

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
    const [examDetails, setExamDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/student/results/${attemptId}/review`, { headers });
                setQuestions(res.data.questions || []);
                setTotalMarks(res.data.totalMarks || 0);
                setExamDetails(res.data.examDetails || {});
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
            element.style.display = 'block';

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

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <Loader size={48} className="animate-spin text-brand-blue mb-4" />
            <p className="font-bold text-slate-600 uppercase tracking-widest text-xs">Loading Assessment Data...</p>
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

    const passPercentage = totalMarks > 0 ? (calculatedScore / totalMarks) * 100 : 0;
    const isPassed = passPercentage >= 50;

    const isAdmin = user.role === 'Admin' || user.role === 'admin';
    const isTeacher = user.role === 'Teacher' || user.role === 'teacher';
    const role = isAdmin ? 'admin' : (isTeacher ? 'teacher' : 'student');

    const renderMatchingReview = (q: QuestionReview) => {
        const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};

        return (
            <div className="space-y-3 mt-4">
                {q.MatchingPairs.map((pair) => {
                    const studentChoice = studentPairs[pair.PairId] || studentPairs[String(pair.PairId)];
                    const isCorrect = String(studentChoice || '').trim().toLowerCase() === String(pair.RightText || '').trim().toLowerCase() && studentChoice;

                    return (
                        <div key={pair.PairId} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex-1 font-semibold text-slate-800 text-sm">{pair.LeftText}</div>
                            <div className="text-slate-400 font-bold text-[11px] uppercase">Matched with</div>
                            <div className={`flex-1 p-3 rounded-lg font-bold text-sm flex items-center justify-between border ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                                <span>{studentChoice || 'None'}</span>
                                {isCorrect ? <Check size={18} /> : <X size={18} />}
                            </div>
                            {!isCorrect && (
                                <div className="flex-1 p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs">
                                    <span className="text-[10px] uppercase block font-bold text-blue-500 mb-0.5">Correct Answer</span>
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
            <div className="space-y-4 mt-4">
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-sm">
                    {answer || <span className="text-slate-400 italic text-xs">No answer provided.</span>}
                </div>

                {(feedback || isGraded) && (
                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-200/60 space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase">
                            <Award size={16} /> Teacher Evaluation
                        </div>
                        {feedback && (
                            <div className="text-sm font-medium text-slate-600 bg-white p-4 rounded-lg border border-blue-100">
                                {feedback}
                            </div>
                        )}
                        {isGraded && (
                            <div className="text-sm font-bold text-slate-800">
                                Score: <span className="text-blue-600">{marks}</span> / {q.Points}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderOptionReview = (q: QuestionReview) => {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                {q.Options.map((opt, idx) => {
                    const isSelected = q.StudentAnswer?.SelectedOptionId === opt.OptionId;
                    const isCorrect = opt.IsCorrect;
                    const letter = letters[idx] || String.fromCharCode(65 + idx);

                    let containerStyle = 'border-slate-200/90 bg-white text-slate-700';
                    let letterStyle = 'bg-slate-100 text-slate-600 font-bold';
                    let badge = null;

                    if (isSelected && isCorrect) {
                        containerStyle = 'border-2 border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold';
                        letterStyle = 'bg-emerald-600 text-white font-black';
                        badge = (
                            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1 shadow-sm shrink-0">
                                STUDENT PICK <Check size={14} className="stroke-[3]" />
                            </span>
                        );
                    } else if (isSelected && !isCorrect) {
                        containerStyle = 'border-2 border-red-500 bg-red-50/40 text-red-950 font-semibold';
                        letterStyle = 'bg-red-600 text-white font-black';
                        badge = (
                            <span className="bg-red-100 text-red-800 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border border-red-300 flex items-center gap-1 shadow-sm shrink-0">
                                STUDENT PICK <X size={14} className="stroke-[3]" />
                            </span>
                        );
                    } else if (!isSelected && isCorrect) {
                        containerStyle = 'border-2 border-emerald-500 bg-emerald-50/30 text-emerald-950 font-semibold';
                        letterStyle = 'bg-emerald-100 text-emerald-800 font-bold';
                        badge = (
                            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shrink-0">
                                <Check size={14} className="stroke-[3]" />
                            </div>
                        );
                    }

                    return (
                        <div key={opt.OptionId} className={`p-4 rounded-xl border flex items-center justify-between transition-all gap-3 ${containerStyle}`}>
                            <div className="flex items-center gap-3.5 min-w-0">
                                <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0 ${letterStyle}`}>
                                    {letter}
                                </span>
                                <span className="text-sm font-medium leading-snug break-words">{opt.Text}</span>
                            </div>
                            {badge}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex bg-[#F4F6F8] min-h-screen font-sans">
            <Sidebar role={role} />
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <div className="p-4 pb-0 flex-none bg-[#F4F6F8] z-10">
                    <Header email={user.email} role={role} />
                </div>

                <div id="scrollable-body" className="flex-1 overflow-y-auto p-6 md:p-8 pt-2 scroll-smooth">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => {
                                if (isAdmin) navigate('/admin/results');
                                else if (isTeacher) navigate('/teacher/results');
                                else navigate('/student/results');
                            }}
                            className="flex items-center gap-2 text-slate-600 font-bold text-xs hover:text-brand-blue transition-all bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200"
                        >
                            <ChevronLeft size={16} /> Back to Results
                        </button>

                        {!loading && !error && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 text-white font-bold text-xs bg-brand-blue px-5 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {isExporting ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
                                {isExporting ? 'Generating PDF...' : 'Download PDF'}
                            </button>
                        )}
                    </div>

                    {error ? (
                        <div className="bg-white p-12 rounded-3xl text-center shadow-md border border-slate-200 max-w-xl mx-auto my-12">
                            <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">{error}</h2>
                            <button
                                onClick={() => navigate('/student/results')}
                                className="mt-6 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md"
                            >
                                Return to Results
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 4 Header Stat Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Card 1: Student */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <User size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">STUDENT</p>
                                        <h4 className="text-sm font-black text-slate-800 truncate">{examDetails?.studentName || user.fullName || 'Student'}</h4>
                                        <p className="text-xs text-slate-500 truncate mb-1">{examDetails?.studentEmail || user.email || ''}</p>
                                        <span className="inline-block text-[10px] font-extrabold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            {examDetails?.sectionName || examDetails?.studentRegNo || 'DTC06-TRAINER-02'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card 2: Exam */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">EXAM</p>
                                        <h4 className="text-sm font-black text-slate-800 truncate">{examDetails?.title || 'Online Assessment'}</h4>
                                        <p className="text-xs text-purple-700 font-bold truncate mt-1">
                                            {examDetails?.sectionName || 'DTC06-TRAINER-02'} <span className="text-slate-400 font-normal">· {examDetails?.subject || 'Digital Forensic'}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Card 3: Submitted Time */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                        <Clock size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SUBMITTED TIME</p>
                                        <h4 className="text-sm font-black text-slate-800">
                                            {examDetails?.dateTaken ? new Date(examDetails.dateTaken).toLocaleDateString('en-US') : '4/3/2026'}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {examDetails?.dateTaken ? new Date(examDetails.dateTaken).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '04:41:32 PM'}
                                        </p>
                                    </div>
                                </div>

                                {/* Card 4: Score */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Award size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SCORE</p>
                                        <h4 className="text-lg font-black text-slate-800">
                                            {calculatedScore} <span className="text-slate-400 text-sm font-normal">/ {totalMarks}</span>
                                        </h4>
                                        <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded ${isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            {isPassed ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Questions Container Card */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <FileText size={20} className="text-slate-600" />
                                        <h3 className="text-lg font-black text-slate-800">Questions</h3>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{questions.length} Questions</span>
                                </div>

                                {/* All Questions Continuous List */}
                                <div className="space-y-6">
                                    {questions.map((q, i) => {
                                        const questionNumber = i + 1;
                                        let pointsEarned = 0;
                                        let isFullCorrect = false;

                                        const studentPairs = q.StudentAnswer?.MatchingAnswer ? JSON.parse(q.StudentAnswer.MatchingAnswer) : {};

                                        if (q.Type === 'Matching') {
                                            const correct = q.MatchingPairs.filter(p => {
                                                const sVal = String(studentPairs[p.PairId] || studentPairs[String(p.PairId)] || '').trim().toLowerCase();
                                                const cVal = String(p.RightText || '').trim().toLowerCase();
                                                return sVal === cVal && sVal !== '';
                                            }).length;
                                            pointsEarned = correct * q.Points;
                                            isFullCorrect = correct === q.MatchingPairs.length;
                                        } else if (q.Type === 'Essay') {
                                            const m = q.StudentAnswer?.MarksAwarded;
                                            pointsEarned = m || 0;
                                            isFullCorrect = m === q.Points;
                                        } else {
                                            const isCorrect = q.Options.some(opt => opt.OptionId === q.StudentAnswer?.SelectedOptionId && opt.IsCorrect);
                                            if (isCorrect) {
                                                pointsEarned = q.Points;
                                                isFullCorrect = true;
                                            }
                                        }

                                        return (
                                            <div key={q.QuestionId} className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-sm">
                                                {/* Question Header Line */}
                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                                            {questionNumber}
                                                        </span>
                                                        <span className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase px-3 py-1 rounded-full">
                                                            {q.Type === 'Matching' ? 'MATCHING' : q.Type === 'Essay' ? 'ESSAY' : 'MULTIPLE CHOICE'}
                                                        </span>
                                                        <span className="bg-blue-50 text-blue-700 text-[11px] font-bold uppercase px-3 py-1 rounded-full border border-blue-100">
                                                            {q.Points} MARKS
                                                        </span>
                                                    </div>

                                                    {/* Points Badge Pill on top right */}
                                                    <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${isFullCorrect ? 'bg-emerald-100/80 text-emerald-800' : pointsEarned > 0 ? 'bg-blue-100/80 text-blue-800' : 'bg-red-100/80 text-red-800'}`}>
                                                        {pointsEarned}/{q.Points}
                                                    </span>
                                                </div>

                                                {/* Question Body Text */}
                                                <h4 className="text-slate-800 font-semibold text-base mb-4 leading-relaxed">
                                                    {q.Text}
                                                </h4>

                                                {/* Answer Options / Render Body */}
                                                {q.Type === 'Matching' ? renderMatchingReview(q) : q.Type === 'Essay' ? renderEssayReview(q) : renderOptionReview(q)}

                                                {/* Bottom Status Pill Tag */}
                                                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                    {isFullCorrect ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                                                            <Check size={14} className="stroke-[3]" /> CORRECT — {pointsEarned.toFixed(2)} MARKS
                                                        </span>
                                                    ) : pointsEarned > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                                                            <Check size={14} className="stroke-[3]" /> PARTIAL — {pointsEarned.toFixed(2)} MARKS
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                                                            <X size={14} className="stroke-[3]" /> INCORRECT — 0.00 MARKS
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* HIDDEN PRINT LAYER FOR PDF GENERATION */}
                <div ref={printRef} className="absolute left-0 top-0 w-[800px] bg-white text-black p-8 mt-[-9999px] font-sans" style={{ display: 'none', zIndex: -9999 }}>
                    <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
                        <h1 className="text-2xl font-black uppercase mb-1 text-slate-900">{examDetails?.subject || 'Course'} - {examDetails?.title || 'Exam Review'}</h1>
                        <p className="text-xs text-slate-500">Student: {examDetails?.studentName || user.fullName} | Score: {calculatedScore} / {totalMarks}</p>
                    </div>

                    <div className="space-y-6">
                        {questions.map((q, i) => (
                            <div key={q.QuestionId} className="border-b border-slate-200 pb-4 break-inside-avoid">
                                <p className="font-bold text-sm mb-2 text-slate-900">{i + 1}. {q.Text} ({q.Points} pts)</p>
                                {q.Type === 'Multiple Choice' || !q.Type ? (
                                    <div className="pl-4 space-y-1.5 text-xs">
                                        {q.Options.map((opt) => {
                                            const isSelected = q.StudentAnswer?.SelectedOptionId === opt.OptionId;
                                            return (
                                                <div key={opt.OptionId} className={`p-2 rounded border ${isSelected && opt.IsCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : isSelected ? 'bg-red-50 border-red-300 text-red-800' : opt.IsCorrect ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                                                    {opt.Text} {isSelected ? '(Your Answer)' : ''} {opt.IsCorrect ? '✓ Correct' : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default ExamReview;
