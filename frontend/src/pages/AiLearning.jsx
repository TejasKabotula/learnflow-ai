import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  ArrowRight,
  BookOpen,
  HelpCircle,
  Lightbulb,
  FileText,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  PlayCircle,
  Zap,
  Layers,
  Brain,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { savedService } from '../services/savedService';
import { quizService } from '../services/quizService';

export default function AiLearning() {
  const location = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); 
  
  // Processed Data
  const [processedData, setProcessedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savedNotesSuccess, setSavedNotesSuccess] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedQuizSuccess, setSavedQuizSuccess] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Clarify State
  const [conceptQuery, setConceptQuery] = useState('');
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyResult, setClarifyResult] = useState(null);

  // Auto-process or prefill if passed from navigation
  useEffect(() => {
    if (location.state?.initialUrl) {
      const url = location.state.initialUrl;
      setYoutubeUrl(url);
      processUrl(url);
    }
  }, [location.state]);

  const processUrl = async (url) => {
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setQuizSubmitted(false);
    setSelectedAnswers({});
    setClarifyResult(null);
    setProcessedData(null);
    setSavedNotesSuccess(false);
    setSavedQuizSuccess(false);

    try {
      const data = await aiService.processVideo(url);
      setProcessedData(data);
      setActiveTab('summary');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to analyze video. Please check the URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessVideo = (e) => {
    e?.preventDefault();
    processUrl(youtubeUrl);
  };

  const handleCopyNotes = () => {
    if (!processedData?.summary) return;
    navigator.clipboard.writeText(processedData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNotesToLibrary = async () => {
    if (!processedData?.summary) return;
    setSavingNotes(true);
    try {
      await savedService.saveResource({
        title: `${processedData.title} - Study Notes`,
        type: 'summary',
        content: processedData.summary,
        video_id: processedData.video_id,
        metadata: {
          author: processedData.author,
          thumbnail_url: processedData.thumbnail_url
        }
      });
      setSavedNotesSuccess(true);
      setTimeout(() => setSavedNotesSuccess(false), 2500);
    } catch (err) {
      console.error("Save notes error:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveQuizToLibrary = async () => {
    if (!processedData?.quiz || processedData.quiz.length === 0) return;
    setSavingQuiz(true);
    try {
      // Save to user_quizzes
      await quizService.saveQuiz(
        `${processedData.title} Quiz`,
        processedData.quiz,
        processedData.video_id
      );
      // Also save to saved_resources
      await savedService.saveResource({
        title: `${processedData.title} - Practice Quiz`,
        type: 'quiz',
        content: processedData.quiz,
        video_id: processedData.video_id,
        metadata: {
          questions_count: processedData.quiz.length
        }
      });
      setSavedQuizSuccess(true);
      setTimeout(() => setSavedQuizSuccess(false), 2500);
    } catch (err) {
      console.error("Save quiz error:", err);
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleSelectOption = (questionId, optionLetter) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionLetter
    }));
  };

  const handleSubmitQuiz = () => {
    if (!processedData?.quiz) return;
    let correct = 0;
    processedData.quiz.forEach(q => {
      if (selectedAnswers[q.id] === q.answer) {
        correct += 1;
      }
    });
    setScore(correct);
    setQuizSubmitted(true);
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setScore(0);
  };

  const handleClarify = async (e) => {
    e?.preventDefault();
    if (!conceptQuery.trim()) return;
    setClarifyLoading(true);
    try {
      const data = await aiService.clarifyConcept(
        conceptQuery, 
        processedData ? `Video: ${processedData.title}` : undefined
      );
      setClarifyResult(data);
    } catch (err) {
      console.error(err);
      setClarifyResult({ concept: conceptQuery, explanation: "Failed to generate clarification. Please try again." });
    } finally {
      setClarifyLoading(false);
    }
  };

  return (
    <div className="h-full pb-24 relative">
      {/* Workbench Initial State */}
      {!processedData && !loading && (
        <div className="flex flex-col lg:flex-row gap-16 pt-8">
          {/* Left: Input Action */}
          <div className="flex-1 lg:pr-12">
            <div className="text-[11px] font-semibold text-[var(--color-accent-primary)] tracking-[0.15em] uppercase mb-4">
              AI STUDIO
            </div>
            <h1 className="text-page-heading text-[var(--text-primary)] mb-6 leading-tight">
              Turn any video into <br/>
              something you can <span className="text-[var(--text-secondary)]">actually learn.</span>
            </h1>
            <p className="text-[var(--text-tertiary)] text-lg mb-10 max-w-lg leading-relaxed">
              Drop a YouTube link below. Our engine analyzes the transcript, structures the core concepts, and generates practice questions in seconds.
            </p>
            
            <form onSubmit={handleProcessVideo} className="relative max-w-xl">
              <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-2xl p-2 focus-within:border-[var(--border-strong)] transition-colors shadow-lg">
                <PlayCircle size={20} className="text-[var(--text-tertiary)] ml-4 shrink-0" />
                <input 
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-transparent border-none outline-none text-[var(--text-primary)] w-full px-4 py-3 text-base placeholder:text-[var(--text-tertiary)]"
                />
                <button
                  type="submit"
                  disabled={loading || !youtubeUrl}
                  className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity shrink-0 flex items-center gap-2 py-3 px-6 rounded-xl font-medium disabled:opacity-50"
                >
                  <span>Analyze</span>
                  <ArrowRight size={16} />
                </button>
              </div>
              
              {error && (
                <div className="absolute top-full left-0 w-full mt-4 p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] text-xs text-center font-medium">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Right: How It Works Visual */}
          <div className="flex-1 flex flex-col justify-center gap-6 border-l border-[var(--border-subtle)] pl-0 lg:pl-16 mt-12 lg:mt-0">
            <h3 className="text-xs tracking-widest text-[var(--text-secondary)] uppercase font-semibold mb-2">How it works</h3>
            
            <div className="flex gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">1. Concept Extraction</h4>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">Transforms spoken words into a structured hierarchy of topics.</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">2. Note Generation</h4>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">Condenses hours of video into scannable, high-density notes.</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                <Brain size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">3. Active Recall</h4>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">Generates targeted quizzes to solidify your understanding.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State Structural Flow */}
      {loading && (
        <div className="pt-32 max-w-2xl mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[var(--border-subtle)] -z-10" />
            
            {[
              { label: 'FETCH VIDEO', active: true },
              { label: 'ANALYZE TEXT', active: true },
              { label: 'BUILD LESSON', active: true }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 bg-[var(--bg-workspace)] px-4">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--color-accent-primary)]/40 flex items-center justify-center text-[var(--color-accent-primary)]">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <span className="text-[10px] tracking-widest text-[var(--text-secondary)] font-medium uppercase">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Split-Pane Processed State */}
      {processedData && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-140px)]"
        >
          {/* Left Pane: Source Material */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
              {processedData.thumbnail_url ? (
                <div className="w-full aspect-video relative border-b border-[var(--border-subtle)]">
                  <img 
                    src={processedData.thumbnail_url} 
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <PlayCircle size={48} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video bg-[var(--bg-elevated)] flex items-center justify-center border-b border-[var(--border-subtle)]">
                  <PlayCircle size={32} className="text-[var(--text-tertiary)]" />
                </div>
              )}
              
              <div className="p-6">
                <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest mb-3 block">
                  Source Material
                </span>
                <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2 leading-snug">
                  {processedData.title}
                </h2>
                <p className="text-sm text-[var(--text-tertiary)] mb-6">
                  {processedData.author}
                </p>
                
                <button
                   onClick={() => { setProcessedData(null); setYoutubeUrl(''); }}
                   className="w-full py-2.5 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                   Process another video
                </button>
              </div>
            </div>
            
            {/* Transcript Snippet Area */}
            <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col min-h-0">
               <h3 className="text-xs tracking-widest text-[var(--text-secondary)] uppercase font-semibold mb-4 shrink-0">Source Context</h3>
               <div className="overflow-y-auto font-mono text-[11px] text-[var(--text-tertiary)] leading-relaxed space-y-4 pr-2">
                 {processedData.segments && processedData.segments.length > 0 ? (
                    processedData.segments.map((seg, sIdx) => (
                      <div key={sIdx} className="flex gap-4 group">
                        <span className="text-[var(--text-secondary)] shrink-0">
                          {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}
                        </span>
                        <p>{seg.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="whitespace-pre-wrap">{processedData.transcript}</p>
                  )}
               </div>
            </div>
          </div>

          {/* Right Pane: AI Workspace */}
          <div className="xl:col-span-8 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-2xl flex flex-col overflow-hidden shadow-sm">
            
            {/* Tabs Header */}
            <div className="flex items-center justify-between px-6 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] shrink-0">
              <div className="flex items-center">
                {[
                  { id: 'summary', label: 'Structured Notes' },
                  { id: 'quiz', label: `Knowledge Check (${processedData.quiz?.length || 0})` },
                  { id: 'clarify', label: 'Concept Clarifier' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-4 text-xs tracking-widest font-semibold transition-colors relative
                      ${activeTab === tab.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="workspace-tab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent-primary)]" 
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Save Actions in Tab Header */}
              <div className="flex items-center gap-2">
                {activeTab === 'summary' && (
                  <button
                    onClick={handleSaveNotesToLibrary}
                    disabled={savingNotes}
                    className="text-[11px] font-medium bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                  >
                    {savedNotesSuccess ? <Check size={12} className="text-emerald-400" /> : <Bookmark size={12} />}
                    <span>{savedNotesSuccess ? 'Saved to Library' : savingNotes ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                )}

                {activeTab === 'quiz' && (
                  <button
                    onClick={handleSaveQuizToLibrary}
                    disabled={savingQuiz}
                    className="text-[11px] font-medium bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                  >
                    {savedQuizSuccess ? <Check size={12} className="text-emerald-400" /> : <Bookmark size={12} />}
                    <span>{savedQuizSuccess ? 'Quiz Saved' : savingQuiz ? 'Saving...' : 'Save Quiz'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              
              {/* Tab 1: Notes */}
              {activeTab === 'summary' && (
                <div className="max-w-3xl mx-auto">
                  <div className="flex justify-end gap-3 mb-6">
                    <button
                      onClick={handleCopyNotes}
                      className="text-[10px] uppercase tracking-widest font-semibold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'COPIED' : 'COPY ALL'}
                    </button>
                  </div>
                  <div className="prose prose-invert prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-headings:text-[var(--text-primary)] prose-headings:font-medium prose-li:text-[var(--text-secondary)] max-w-none text-[15px] whitespace-pre-wrap">
                    {processedData.summary}
                  </div>
                </div>
              )}

              {/* Tab 2: Quiz */}
              {activeTab === 'quiz' && (
                <div className="max-w-2xl mx-auto space-y-12">
                  {quizSubmitted && (
                    <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex justify-between items-center mb-8">
                      <div>
                        <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Your Score</div>
                        <h3 className="text-3xl font-medium text-[var(--text-primary)]">
                          {score} / {processedData.quiz?.length}
                        </h3>
                      </div>
                      <button
                        onClick={handleResetQuiz}
                        className="bg-[var(--bg-elevated)] border border-[var(--border-medium)] px-4 py-2 rounded-lg text-sm text-[var(--text-primary)] flex items-center gap-2 hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <RotateCcw size={14} /> Retake
                      </button>
                    </div>
                  )}

                  <div className="space-y-12">
                    {processedData.quiz?.map((q, idx) => {
                      const selected = selectedAnswers[q.id];
                      const isCorrect = selected === q.answer;

                      return (
                        <div key={q.id} className="space-y-5">
                          <div className="flex items-start gap-4">
                            <span className="w-6 h-6 rounded bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center text-xs font-mono text-[var(--text-secondary)] shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="text-base font-medium text-[var(--text-primary)] leading-relaxed pt-0.5">
                              {q.question}
                            </h4>
                            {quizSubmitted && (
                              <div className="shrink-0 pt-0.5">
                                {isCorrect ? (
                                  <CheckCircle2 size={18} className="text-[var(--color-success)]" />
                                ) : (
                                  <XCircle size={18} className="text-[var(--color-error)]" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pl-10 space-y-3">
                            {q.options?.map((opt, oIdx) => {
                              const optLetter = opt.substring(0, 1).toUpperCase();
                              const isOptionSelected = selected === optLetter;
                              const isThisCorrectOption = q.answer === optLetter;

                              let btnClass = "w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface)] transition-colors flex gap-4";
                              
                              if (isOptionSelected) {
                                btnClass = "w-full text-left p-3.5 rounded-xl border border-[var(--text-primary)] text-[var(--text-primary)] text-sm bg-[var(--bg-surface)] transition-colors flex gap-4";
                              }
                              
                              if (quizSubmitted) {
                                if (isThisCorrectOption) {
                                  btnClass = "w-full text-left p-3.5 rounded-xl border border-[var(--color-success)] text-[var(--color-success)] text-sm bg-[var(--color-success)]/5 flex gap-4";
                                } else if (isOptionSelected && !isCorrect) {
                                  btnClass = "w-full text-left p-3.5 rounded-xl border border-[var(--color-error)] text-[var(--color-error)] text-sm bg-[var(--color-error)]/5 flex gap-4";
                                } else {
                                  btnClass = "w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] text-sm opacity-50 flex gap-4";
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  disabled={quizSubmitted}
                                  onClick={() => handleSelectOption(q.id, optLetter)}
                                  className={btnClass}
                                >
                                  <span className="font-mono text-[var(--text-tertiary)]">{optLetter}</span>
                                  <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                </button>
                              );
                            })}
                          </div>

                          {quizSubmitted && q.explanation && (
                            <div className="ml-10 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">
                              <span className="text-[var(--text-primary)] font-medium block mb-1">Explanation</span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!quizSubmitted && (
                    <div className="pl-10 pt-8">
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(selectedAnswers).length === 0}
                        className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-30 transition-opacity px-6 py-3 rounded-xl font-medium text-sm"
                      >
                        Submit Answers
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Clarify */}
              {activeTab === 'clarify' && (
                <div className="max-w-2xl mx-auto space-y-12">
                  <div>
                    <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">Concept Clarifier</h3>
                    <p className="text-[var(--text-tertiary)] text-sm">
                      Ask AI to explain difficult concepts from this video using intuitive analogies.
                    </p>
                  </div>

                  <form onSubmit={handleClarify} className="relative">
                    <input
                      type="text"
                      value={conceptQuery}
                      onChange={(e) => setConceptQuery(e.target.value)}
                      placeholder="E.g., Explain React Hooks like I'm 5..."
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl px-5 py-4 pr-14 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)] shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={clarifyLoading || !conceptQuery.trim()}
                      className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                    >
                      {clarifyLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </form>

                  {clarifyResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] whitespace-pre-wrap text-[15px] text-[var(--text-secondary)] leading-relaxed shadow-sm"
                    >
                      <h4 className="text-lg font-medium text-[var(--text-primary)] mb-4 pb-4 border-b border-[var(--border-subtle)]">
                        {clarifyResult.concept}
                      </h4>
                      {clarifyResult.explanation}
                    </motion.div>
                  )}
                </div>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
