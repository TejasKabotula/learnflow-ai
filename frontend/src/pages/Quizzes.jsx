import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Play, RotateCcw, CheckCircle2, XCircle, Award, Clock, ArrowRight, Loader2, Trash2, X } from 'lucide-react';
import { quizService } from '../services/quizService';
import { Link } from 'react-router';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Attempt History Modal
  const [historyQuiz, setHistoryQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete Modal
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const data = await quizService.getUserQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (quizId) => {
    setLoadingQuiz(true);
    setSelectedAnswers({});
    setSubmissionResult(null);
    try {
      const fullQuiz = await quizService.getQuizById(quizId, false); // recall mode: without answers
      setActiveQuiz(fullQuiz);
    } catch (err) {
      console.error("Error loading quiz:", err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectOption = (questionId, optionLetter) => {
    if (submissionResult) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [String(questionId)]: optionLetter
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmitting(true);
    try {
      const result = await quizService.submitQuizAnswers(activeQuiz.id, selectedAnswers);
      setSubmissionResult(result);
      fetchQuizzes(); // Refresh attempt stats
    } catch (err) {
      console.error("Error submitting quiz:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmissionResult(null);
  };

  const handleViewHistory = async (quiz) => {
    setHistoryQuiz(quiz);
    setLoadingHistory(true);
    try {
      const data = await quizService.getQuizAttempts(quiz.id);
      setAttempts(data);
    } catch (err) {
      console.error("Error loading attempts:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeleting(true);
    try {
      await quizService.deleteQuiz(quizToDelete.id);
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      if (activeQuiz?.id === quizToDelete.id) {
        setActiveQuiz(null);
        setSubmissionResult(null);
      }
      setQuizToDelete(null);
    } catch (err) {
      console.error("Error deleting quiz:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pb-24 space-y-10">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 pb-8 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest mb-2">
            Active Recall & Testing
          </div>
          <h1 className="text-page-heading text-[var(--text-primary)] mb-2">Quizzes & Practice</h1>
          <p className="text-base text-[var(--text-tertiary)] max-w-xl">
            Test your comprehension with structured multiple-choice questions generated from video curricula.
          </p>
        </div>

        <Link
          to="/ai-learning"
          className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <span>Generate with AI Studio</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Main View: Quiz Active Player OR Quiz Card Grid */}
      {activeQuiz ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 lg:p-12 space-y-8 max-w-3xl mx-auto shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)]">
            <div>
              <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest block mb-1">
                Active Assessment
              </span>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {activeQuiz.title}
              </h2>
            </div>

            <button
              onClick={() => { setActiveQuiz(null); setSubmissionResult(null); }}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Exit Practice
            </button>
          </div>

          {/* Submission Result Score Card */}
          {submissionResult && (
            <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">
                  Assessment Score
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">
                    {submissionResult.score} / {submissionResult.total_questions}
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-accent-primary)]">
                    ({submissionResult.percentage}%)
                  </span>
                </div>
              </div>

              <button
                onClick={handleRetake}
                className="bg-[var(--text-primary)] text-[var(--text-inverse)] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:opacity-90"
              >
                <RotateCcw size={14} />
                <span>Retake Quiz</span>
              </button>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-10">
            {activeQuiz.questions?.map((q, idx) => {
              const qIdStr = String(q.id);
              const selected = selectedAnswers[qIdStr];
              
              const gradedResult = submissionResult?.results?.find(r => String(r.question_id) === qIdStr);
              const isCorrect = gradedResult?.is_correct;

              return (
                <div key={idx} className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="w-6 h-6 rounded bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center text-xs font-mono text-[var(--text-secondary)] shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-base font-medium text-[var(--text-primary)] leading-relaxed pt-0.5">
                      {q.question}
                    </h4>
                    {submissionResult && (
                      <div className="shrink-0 pt-0.5">
                        {isCorrect ? (
                          <CheckCircle2 size={18} className="text-[var(--color-success)]" />
                        ) : (
                          <XCircle size={18} className="text-[var(--color-error)]" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pl-10 space-y-2.5">
                    {q.options?.map((opt, oIdx) => {
                      const optLetter = opt.substring(0, 1).toUpperCase();
                      const isOptionSelected = selected === optLetter;
                      const isThisCorrect = gradedResult?.correct_answer === optLetter;

                      let btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-medium)] hover:bg-[var(--bg-canvas)] transition-colors flex gap-3";

                      if (isOptionSelected) {
                        btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--text-primary)] text-[var(--text-primary)] text-sm bg-[var(--bg-elevated)] transition-colors flex gap-3";
                      }

                      if (submissionResult) {
                        if (isThisCorrect) {
                          btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--color-success)] text-[var(--color-success)] text-sm bg-[var(--color-success)]/10 flex gap-3";
                        } else if (isOptionSelected && !isCorrect) {
                          btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--color-error)] text-[var(--color-error)] text-sm bg-[var(--color-error)]/10 flex gap-3";
                        } else {
                          btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] text-sm opacity-50 flex gap-3";
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={Boolean(submissionResult)}
                          onClick={() => handleSelectOption(q.id, optLetter)}
                          className={btnStyle}
                        >
                          <span className="font-mono text-[var(--text-tertiary)]">{optLetter}</span>
                          <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submit */}
                  {submissionResult && gradedResult?.explanation && (
                    <div className="ml-10 p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="text-[var(--text-primary)] font-medium block mb-1">Explanation</span>
                      {gradedResult.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Action */}
          {!submissionResult && (
            <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-end">
              <button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting || Object.keys(selectedAnswers).length === 0}
                className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 transition-opacity px-6 py-3 rounded-xl font-medium text-xs flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <span>Submit for Grading</span>}
              </button>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="py-20 flex items-center justify-center text-[var(--text-tertiary)]">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] mb-5">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No quizzes saved yet</h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">
            Generate quizzes from videos in the AI Studio and save them to build your practice exam library.
          </p>
          <Link
            to="/ai-learning"
            className="text-xs font-semibold text-[var(--color-accent-primary)] hover:underline flex items-center gap-1.5"
          >
            Create with AI Studio <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-sm group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)]">
                    <HelpCircle size={14} className="text-amber-400" />
                    <span>{quiz.total_questions} Questions</span>
                  </div>

                  <button
                    onClick={() => setQuizToDelete(quiz)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Delete Quiz"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 line-clamp-2">
                  {quiz.title}
                </h3>

                {quiz.latest_percentage !== null && quiz.latest_percentage !== undefined ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-6">
                    <Award size={14} className="text-emerald-400" />
                    <span>Best Score: {quiz.latest_score}/{quiz.total_questions} ({quiz.latest_percentage}%)</span>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)] mb-6">
                    Not attempted yet
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => handleViewHistory(quiz)}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                >
                  <Clock size={12} />
                  <span>{quiz.attempts_count || 0} attempts</span>
                </button>

                <button
                  onClick={() => handleStartQuiz(quiz.id)}
                  disabled={loadingQuiz}
                  className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Start Practice</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attempt History Modal */}
      <AnimatePresence>
        {historyQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setHistoryQuiz(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>

              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Attempt History</h3>
              <p className="text-xs text-[var(--text-tertiary)]">{historyQuiz.title}</p>

              {loadingHistory ? (
                <div className="py-12 flex justify-center text-[var(--text-tertiary)]">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : attempts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                  No recorded attempts for this quiz yet.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pt-2 pr-1">
                  {attempts.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {att.score} / {att.total_questions} ({att.percentage}%)
                        </span>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(att.completed_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        att.percentage >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {att.percentage >= 70 ? 'Passed' : 'Needs Review'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete Quiz?</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Are you sure you want to delete &quot;{quizToDelete.title}&quot;? All previous attempt history will also be removed.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setQuizToDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuiz}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--color-error)] text-white text-xs font-medium hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <span>Delete</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
