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
  Sparkles,
  MessageSquare,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Download,
  FileDown,
  Clock,
  Trash2,
  Plus,
  Cpu,
  ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService } from '../services/aiService';
import { savedService } from '../services/savedService';
import { quizService } from '../services/quizService';
import { notesService } from '../services/notesService';
import VideoChat from '../components/VideoChat';

export default function AiLearning() {
  const location = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'quiz', 'clarify', 'chat'
  
  // Explanation level selector: 'simple', 'medium', 'detailed'
  const [explanationLevel, setExplanationLevel] = useState('medium');

  // Processed Data
  const [processedData, setProcessedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savedNotesSuccess, setSavedNotesSuccess] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedQuizSuccess, setSavedQuizSuccess] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savedQuizId, setSavedQuizId] = useState(null);
  const [transcriptSearch, setTranscriptSearch] = useState('');

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Unlimited Quiz Generation State
  const [quizOffset, setQuizOffset] = useState(1);
  const [loadingMoreQuiz, setLoadingMoreQuiz] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState('mixed');
  const [moreQuizSuccess, setMoreQuizSuccess] = useState('');

  // Clarify State
  const [conceptQuery, setConceptQuery] = useState('');
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyResult, setClarifyResult] = useState(null);

  // Video Synthesis History (persisted in localStorage)
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('learnflow_synthesis_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Auto-process or prefill if passed from navigation
  useEffect(() => {
    if (location.state?.initialUrl) {
      const url = location.state.initialUrl;
      setYoutubeUrl(url);
      processUrl(url, explanationLevel);
    }
  }, [location.state]);

  const saveToHistory = (data, url, lvl) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.video_id !== data.video_id);
      const updated = [
        {
          video_id: data.video_id,
          title: data.title || `Video ${data.video_id}`,
          author: data.author || 'Instructor',
          thumbnail_url: data.thumbnail_url,
          timestamp: Date.now(),
          url: url,
          level: lvl
        },
        ...filtered
      ].slice(0, 15);
      try {
        localStorage.setItem('learnflow_synthesis_history', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save history:', e);
      }
      return updated;
    });
  };

  const handleRemoveFromHistory = (e, videoId) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.video_id !== videoId);
      localStorage.setItem('learnflow_synthesis_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('learnflow_synthesis_history');
  };

  const processUrl = async (url, lvl = explanationLevel) => {
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setQuizSubmitted(false);
    setSelectedAnswers({});
    setClarifyResult(null);
    setProcessedData(null);
    setSavedNotesSuccess(false);
    setSavedQuizSuccess(false);
    setQuizOffset(1);

    try {
      const data = await aiService.processVideo(url, lvl);
      setProcessedData(data);
      setActiveTab('summary');
      saveToHistory(data, url, lvl);

      // Automatically sync to Notes, Quizzes, and Saved Vault
      try {
        if (data.summary) {
          notesService.createStandaloneNote(
            `${data.title} - Study Notes (${lvl.toUpperCase()})`,
            data.summary,
            null,
            data.video_id
          ).catch(e => console.error("Auto-save note error:", e));
          
          savedService.saveResource({
            title: `${data.title} - Study Notes`,
            type: 'summary',
            content: data.summary,
            video_id: data.video_id,
            metadata: {
              author: data.author,
              thumbnail_url: data.thumbnail_url,
              level: lvl
            }
          }).catch(e => console.error("Auto-save resource error:", e));
          setSavedNotesSuccess(true);
        }

        if (data.quiz && data.quiz.length > 0) {
          quizService.saveQuiz(
            `${data.title} Quiz`,
            data.quiz,
            data.video_id
          ).then(savedQ => {
            if (savedQ?.id) setSavedQuizId(savedQ.id);
          }).catch(e => console.error("Auto-save quiz error:", e));

          savedService.saveResource({
            title: `${data.title} - Practice Quiz`,
            type: 'quiz',
            content: data.quiz,
            video_id: data.video_id,
            metadata: {
              questions_count: data.quiz.length
            }
          }).catch(e => console.error("Auto-save saved quiz error:", e));
          setSavedQuizSuccess(true);
        }
      } catch (saveErr) {
        console.error("Auto-sync error:", saveErr);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to synthesize video. Please check the URL or try another educational video.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessVideo = (e) => {
    e?.preventDefault();
    processUrl(youtubeUrl, explanationLevel);
  };

  const handleSwitchLevel = (newLevel) => {
    setExplanationLevel(newLevel);
    if (processedData && youtubeUrl) {
      processUrl(youtubeUrl, newLevel);
    }
  };

  const handleCopyNotes = () => {
    if (!processedData?.summary) return;
    navigator.clipboard.writeText(processedData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Direct Download to Document (.md file)
  const handleDownloadDoc = () => {
    if (!processedData?.summary) return;
    const headerInfo = `# ${processedData.title}
Author: ${processedData.author || 'Instructor'}
Explanation Level: ${explanationLevel.toUpperCase()}
Date Generated: ${new Date().toLocaleDateString()}
Source: https://youtube.com/watch?v=${processedData.video_id}

---

`;
    const fullText = headerInfo + processedData.summary;
    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (processedData.title || 'study_notes')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 45);
    link.download = `${cleanTitle}_${explanationLevel}_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Direct Download to PDF (via browser print formatting)
  const handleDownloadPdf = () => {
    if (!processedData?.summary) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download notes as PDF.');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${processedData.title || 'Study Notes'} - Learn Flow AI</title>
  <style>
    @media print {
      body { margin: 20px; font-size: 12pt; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .header-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #8b5cf6;
      color: #ffffff;
      margin-bottom: 8px;
    }
    h1.title {
      font-size: 24px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 8px 0;
    }
    .meta {
      font-size: 13px;
      color: #6b7280;
    }
    h1 { font-size: 20px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; }
    h2 { font-size: 17px; color: #7c3aed; margin-top: 20px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
    h3 { font-size: 14px; color: #374151; margin-top: 16px; }
    p, li { font-size: 13.5px; color: #374151; }
    ul, ol { padding-left: 22px; }
    li { margin-bottom: 5px; }
    strong { color: #111827; }
    blockquote {
      border-left: 4px solid #8b5cf6;
      background: #f5f3ff;
      padding: 10px 16px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    code {
      background: #f3f4f6;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }
    pre code { background: transparent; color: inherit; }
  </style>
</head>
<body>
  <div class="header-card">
    <div class="badge">LEARN FLOW AI • STUDY GUIDE</div>
    <h1 class="title">${processedData.title}</h1>
    <div class="meta">
      <strong>Channel:</strong> ${processedData.author || 'Instructor'} &nbsp;•&nbsp;
      <strong>Explanation Level:</strong> ${explanationLevel.toUpperCase()} &nbsp;•&nbsp;
      <strong>Date:</strong> ${new Date().toLocaleDateString()}
    </div>
  </div>
  <div id="notes-content"></div>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    const markdownContent = ${JSON.stringify(processedData.summary)};
    document.getElementById('notes-content').innerHTML = marked.parse(markdownContent);
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSaveNotesToLibrary = async () => {
    if (!processedData?.summary) return;
    setSavingNotes(true);
    try {
      await notesService.createStandaloneNote(
        `${processedData.title} - Study Notes (${explanationLevel.toUpperCase()})`,
        processedData.summary,
        null,
        processedData.video_id
      );
      await savedService.saveResource({
        title: `${processedData.title} - Study Notes`,
        type: 'summary',
        content: processedData.summary,
        video_id: processedData.video_id,
        metadata: {
          author: processedData.author,
          thumbnail_url: processedData.thumbnail_url,
          level: explanationLevel
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
      const saved = await quizService.saveQuiz(
        `${processedData.title} Quiz`,
        processedData.quiz,
        processedData.video_id
      );
      if (saved?.id) setSavedQuizId(saved.id);
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

  // Unlimited Quiz Generation: generates 4 additional questions from cached transcript
  const handleGenerateMoreQuestions = async () => {
    if (!processedData?.video_id || loadingMoreQuiz) return;
    setLoadingMoreQuiz(true);
    setMoreQuizSuccess('');
    try {
      const res = await aiService.regenerateQuiz(
        processedData.video_id,
        quizDifficulty,
        4,
        quizOffset
      );
      if (res?.questions && res.questions.length > 0) {
        const combinedQuestions = [...(processedData.quiz || []), ...res.questions];
        setProcessedData(prev => ({
          ...prev,
          quiz: combinedQuestions
        }));
        setQuizOffset(prev => prev + 1);

        // Auto-persist expanded quiz
        quizService.saveQuiz(
          `${processedData.title} Quiz`,
          combinedQuestions,
          processedData.video_id
        ).catch(e => console.error("Error updating saved quiz:", e));

        savedService.saveResource({
          title: `${processedData.title} - Practice Quiz`,
          type: 'quiz',
          content: combinedQuestions,
          video_id: processedData.video_id,
          metadata: { questions_count: combinedQuestions.length }
        }).catch(e => console.error(e));

        setMoreQuizSuccess(`Added ${res.questions.length} new practice questions!`);
        setTimeout(() => setMoreQuizSuccess(''), 3000);
      }
    } catch (err) {
      console.error("Error generating more questions:", err);
    } finally {
      setLoadingMoreQuiz(false);
    }
  };

  const handleSelectOption = (questionId, optionLetter) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionLetter
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!processedData?.quiz) return;
    let correct = 0;
    processedData.quiz.forEach(q => {
      if (selectedAnswers[q.id] === q.answer) {
        correct += 1;
      }
    });
    setScore(correct);
    setQuizSubmitted(true);

    try {
      let qId = savedQuizId;
      if (!qId) {
        const saved = await quizService.saveQuiz(
          `${processedData.title} Quiz`,
          processedData.quiz,
          processedData.video_id
        );
        qId = saved?.id;
        if (qId) setSavedQuizId(qId);
        
        await savedService.saveResource({
          title: `${processedData.title} - Practice Quiz`,
          type: 'quiz',
          content: processedData.quiz,
          video_id: processedData.video_id,
          metadata: { questions_count: processedData.quiz.length }
        }).catch(e => console.error(e));
      }

      if (qId) {
        const subAnswers = {};
        Object.entries(selectedAnswers).forEach(([k, v]) => {
          subAnswers[String(k)] = v;
        });
        await quizService.submitQuizAnswers(qId, subAnswers);
      }
    } catch (err) {
      console.error("Error saving quiz attempt:", err);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setScore(0);
  };

  const handleClarify = async (e, customQuery) => {
    e?.preventDefault();
    const query = customQuery || conceptQuery;
    if (!query.trim()) return;
    setClarifyLoading(true);
    try {
      const data = await aiService.clarifyConcept(
        query, 
        processedData ? `Video: ${processedData.title}` : undefined
      );
      setClarifyResult(data);
    } catch (err) {
      console.error(err);
      setClarifyResult({ concept: query, explanation: "Failed to generate clarification. Please try again." });
    } finally {
      setClarifyLoading(false);
    }
  };

  const samplePresets = [
    { title: "System Design in 10 Minutes", author: "ByteByteGo", url: "https://www.youtube.com/watch?v=i53Gi_K3o7I" },
    { title: "Intro to Large Language Models", author: "Andrej Karpathy", url: "https://www.youtube.com/watch?v=zjkBMFhNj_g" },
    { title: "React in 100 Seconds", author: "Fireship", url: "https://www.youtube.com/watch?v=Tn6-PIqc4UM" }
  ];

  const filteredSegments = (processedData?.segments || []).filter(seg => 
    seg.text.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  const formatRelativeTime = (timestamp) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="pb-20 max-w-[1340px] mx-auto space-y-8">
      
      {/* 1. INITIAL UNPROCESSED STATE */}
      {!processedData && !loading && (
        <div className="space-y-12">
          {/* Main Hero Card */}
          <div className="relative rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 sm:p-12 overflow-hidden shadow-sm">
            <div 
              className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-[110px] pointer-events-none opacity-20"
              style={{ background: 'radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-semibold tracking-wider text-[var(--color-accent-primary)] uppercase">
                <Sparkles size={13} /> AI Synthesis Studio
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                Turn any video into <br />
                structured knowledge.
              </h1>

              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Paste any YouTube lecture or tutorial. Learn Flow extracts the transcript, generates high-yield structured notes, and creates unlimited active-recall quizzes.
              </p>

              {/* Explanation Level Selector */}
              <div className="pt-2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Brain size={13} className="text-[var(--color-accent-primary)]" />
                  <span>Choose Explanation Level:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExplanationLevel('simple')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      explanationLevel === 'simple'
                        ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--text-primary)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-[var(--text-primary)]">
                      <Sparkles size={13} className={explanationLevel === 'simple' ? 'text-[var(--color-accent-primary)]' : ''} />
                      <span>Simple (Beginner / ELI5)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-normal">
                      Clear analogies, intuitive examples, zero heavy jargon.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExplanationLevel('medium')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      explanationLevel === 'medium'
                        ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--text-primary)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-[var(--text-primary)]">
                      <BookOpen size={13} className={explanationLevel === 'medium' ? 'text-[var(--color-accent-primary)]' : ''} />
                      <span>Medium (Standard)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-normal">
                      Structured notes, key takeaways, and core mechanics.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExplanationLevel('detailed')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      explanationLevel === 'detailed'
                        ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--text-primary)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-[var(--text-primary)]">
                      <Cpu size={13} className={explanationLevel === 'detailed' ? 'text-[var(--color-accent-primary)]' : ''} />
                      <span>Detailed (Deep-Dive)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-normal">
                      Architectural nuances, trade-offs, and system specs.
                    </p>
                  </button>
                </div>
              </div>

              {/* URL Input Form */}
              <form onSubmit={handleProcessVideo} className="pt-2">
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-xl">
                  <div className="flex-1 flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-2xl px-4 py-3 focus-within:border-[var(--color-accent-primary)] focus-within:ring-1 focus-within:ring-[var(--color-accent-primary)] transition-all shadow-inner">
                    <PlayCircle size={18} className="text-[var(--text-tertiary)] mr-3 shrink-0" />
                    <input 
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !youtubeUrl.trim()}
                    className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-md"
                  >
                    <span>Synthesize</span>
                    <ArrowRight size={15} />
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium max-w-xl"
                  >
                    {error}
                  </motion.div>
                )}
              </form>

              {/* Sample Presets */}
              <div className="pt-2 space-y-2">
                <span className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wider block">
                  Or test with sample lectures:
                </span>
                <div className="flex flex-wrap gap-2">
                  {samplePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setYoutubeUrl(preset.url);
                        processUrl(preset.url, explanationLevel);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play size={10} className="fill-current opacity-70" />
                      <span>{preset.title}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">({preset.author})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Video Synthesis History */}
          {history.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[var(--color-accent-primary)]" />
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Recent Synthesized Videos ({history.length})
                  </h2>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-[var(--text-tertiary)] hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Clear History</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => (
                  <div
                    key={item.video_id}
                    onClick={() => {
                      setYoutubeUrl(item.url || `https://www.youtube.com/watch?v=${item.video_id}`);
                      if (item.level) setExplanationLevel(item.level);
                      processUrl(item.url || `https://www.youtube.com/watch?v=${item.video_id}`, item.level || explanationLevel);
                    }}
                    className="group p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--color-accent-primary)]/50 transition-all cursor-pointer flex gap-3 relative shadow-sm"
                  >
                    {item.thumbnail_url ? (
                      <img 
                        src={item.thumbnail_url} 
                        alt="Thumbnail" 
                        className="w-20 h-14 rounded-xl object-cover shrink-0 border border-[var(--border-subtle)]"
                      />
                    ) : (
                      <div className="w-20 h-14 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        <Play size={18} className="text-[var(--text-tertiary)]" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-primary)] px-1.5 py-0.5 rounded bg-[var(--color-accent-primary)]/10">
                          {item.level || 'medium'}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-[var(--text-primary)] truncate mt-1 group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {item.author}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleRemoveFromHistory(e, item.video_id)}
                      title="Remove from history"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-[var(--text-tertiary)] transition-all absolute top-2 right-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Custom Depth Notes</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Choose Simple, Medium, or Detailed level. Automatically formats key takeaways, mental models, and real-world examples.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center">
                <Brain size={18} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Unlimited Practice Quizzes</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Generate as many practice questions as you want. Customize difficulty from easy to hard with instant feedback.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center">
                <Download size={18} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Export to PDF & Markdown</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Directly download generated study notes as clean printable PDFs or portable Markdown (.md) documents.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. LOADING STATE */}
      {loading && (
        <div className="py-20 max-w-lg mx-auto text-center space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--color-accent-primary)]/40 flex items-center justify-center text-[var(--color-accent-primary)] mx-auto shadow-[0_0_25px_rgba(139,92,246,0.2)]">
            <Loader2 size={32} className="animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Synthesizing Lecture Knowledge
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] max-w-xs mx-auto">
              Extracting multi-tier transcript, structuring {explanationLevel.toUpperCase()} mental models, and generating active-recall questions.
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3 text-left">
            <div className="flex items-center gap-3 text-xs text-[var(--color-accent-primary)] font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)] animate-ping" />
              <span>Pipeline Phase: Speech Transcription & Groq Synthesis</span>
            </div>
            <div className="w-full bg-[var(--bg-canvas)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[var(--text-primary)] h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* 3. PROCESSED STATE (Split Studio Workspace) */}
      {processedData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Strip with Video Summary & Actions */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              {processedData.thumbnail_url && (
                <img 
                  src={processedData.thumbnail_url} 
                  alt="Video thumbnail"
                  className="w-24 h-16 rounded-xl object-cover shrink-0 border border-[var(--border-subtle)]"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-accent-primary)]/10">
                    Synthesized Lesson
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    Level: {explanationLevel.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate mt-1">
                  {processedData.title}
                </h2>
                <p className="text-xs text-[var(--text-tertiary)]">{processedData.author}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Change Level In-Place */}
              <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl p-1 gap-1">
                {(['simple', 'medium', 'detailed']).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSwitchLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                      explanationLevel === lvl
                        ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setProcessedData(null); setYoutubeUrl(''); }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>New Video</span>
              </button>
            </div>
          </div>

          {/* Main Studio Grid: Left Transcript & Right Studio Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (4 cols): Transcript & Context Inspector */}
            <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-5 shadow-sm space-y-4 h-[720px] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <FileText size={15} className="text-[var(--color-accent-primary)]" />
                  <span>Transcript Context</span>
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                  {processedData.segments?.length || 0} segments
                </span>
              </div>

              {/* Transcript Search */}
              <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3 py-1.5 focus-within:border-[var(--color-accent-primary)] transition-colors shrink-0">
                <Search size={13} className="text-[var(--text-tertiary)] mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                />
              </div>

              {/* Transcript Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] leading-relaxed">
                {filteredSegments.length > 0 ? (
                  filteredSegments.map((seg, sIdx) => (
                    <div 
                      key={sIdx}
                      className="p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all flex gap-3 text-[var(--text-secondary)]"
                    >
                      <span className="text-[var(--color-accent-primary)] font-semibold shrink-0">
                        {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}
                      </span>
                      <p className="flex-1 leading-relaxed">{seg.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)] p-3">
                    {processedData.transcript ? processedData.transcript.slice(0, 1000) + '...' : 'No transcript text available.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column (8 cols): Studio Tabs (Notes, Quiz, Clarify, Video Chat) */}
            <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[720px]">
              
              {/* Studio Tabs Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex-wrap gap-4 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'summary', label: 'Structured Notes', icon: <FileText size={14} /> },
                    { id: 'quiz', label: `Active Recall (${processedData.quiz?.length || 0})`, icon: <HelpCircle size={14} /> },
                    { id: 'clarify', label: 'Concept Clarifier', icon: <Lightbulb size={14} /> },
                    { id: 'chat', label: 'Video Chat (RAG)', icon: <MessageSquare size={14} /> }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Save & Download Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === 'summary' && (
                    <>
                      {/* Copy Notes */}
                      <button
                        onClick={handleCopyNotes}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy Markdown"
                      >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* Download PDF */}
                      <button
                        onClick={handleDownloadPdf}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Export as Printable PDF"
                      >
                        <FileDown size={13} className="text-[var(--color-accent-primary)]" />
                        <span>Download PDF</span>
                      </button>

                      {/* Download Doc (.md) */}
                      <button
                        onClick={handleDownloadDoc}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Download Markdown Document"
                      >
                        <Download size={13} />
                        <span>Doc (.md)</span>
                      </button>

                      {/* Save Notes to Library */}
                      <button
                        onClick={handleSaveNotesToLibrary}
                        disabled={savingNotes}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                          savedNotesSuccess
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                            : 'bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90'
                        }`}
                      >
                        {savedNotesSuccess ? <Check size={13} className="text-emerald-400" /> : <Bookmark size={13} />}
                        <span>{savedNotesSuccess ? 'Saved to Vault' : savingNotes ? 'Saving...' : 'Save Notes'}</span>
                      </button>
                    </>
                  )}

                  {activeTab === 'quiz' && (
                    <button
                      onClick={handleSaveQuizToLibrary}
                      disabled={savingQuiz}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                        savedQuizSuccess
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90'
                      }`}
                    >
                      {savedQuizSuccess ? <Check size={13} className="text-emerald-400" /> : <Bookmark size={13} />}
                      <span>{savedQuizSuccess ? 'Quiz Saved' : savingQuiz ? 'Saving...' : 'Save Quiz'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Studio Tab Contents */}
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                
                {/* 1. Structured Notes Tab with Clean Markdown Rendering */}
                {activeTab === 'summary' && (
                  <div className="max-w-3xl space-y-6">
                    <div className="notes-rendered-markdown prose prose-invert max-w-none text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-6 mb-3 pb-2 border-b border-[var(--border-subtle)] flex items-center gap-2" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-6 mb-3 flex items-center gap-2 text-[var(--color-accent-primary)]" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-base font-semibold text-[var(--text-primary)] mt-4 mb-2" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed my-2.5" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-outside pl-5 space-y-1.5 my-3 text-sm text-[var(--text-secondary)]" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-outside pl-5 space-y-1.5 my-3 text-sm text-[var(--text-secondary)]" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-[var(--text-primary)]" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-[var(--color-accent-primary)] pl-4 py-2 my-3 italic text-[var(--text-secondary)] bg-[var(--bg-canvas)] rounded-r-xl" {...props} />
                          ),
                          code: ({ node, inline, ...props }) => inline ? (
                            <code className="px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]" {...props} />
                          ) : (
                            <div className="my-3 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                              <code className="text-xs font-mono text-[var(--text-primary)] block overflow-x-auto whitespace-pre" {...props} />
                            </div>
                          ),
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 rounded-xl border border-[var(--border-subtle)]">
                              <table className="w-full text-left border-collapse text-xs" {...props} />
                            </div>
                          ),
                          th: ({ node, ...props }) => (
                            <th className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 font-semibold text-[var(--text-primary)]" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="border-b border-[var(--border-subtle)] p-2.5 text-[var(--text-secondary)]" {...props} />
                          )
                        }}
                      >
                        {processedData.summary}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* 2. Active Recall Quiz Tab with Unlimited Question Generation */}
                {activeTab === 'quiz' && (
                  <div className="max-w-2xl mx-auto space-y-8">
                    
                    {/* Score summary banner */}
                    {quizSubmitted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                            Assessment Score
                          </span>
                          <div className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                            {score} / {processedData.quiz?.length}
                            <span className="text-sm font-normal text-[var(--text-tertiary)] ml-2">
                              ({Math.round((score / (processedData.quiz?.length || 1)) * 100)}%)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleResetQuiz}
                          className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={14} /> Retake
                        </button>
                      </motion.div>
                    )}

                    {/* Unlimited Quiz Generator Controls Banner */}
                    <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[var(--color-accent-primary)]" />
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-primary)] block">
                            Unlimited Quiz Generation
                          </span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">
                            Generate more questions from this video anytime
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={quizDifficulty}
                          onChange={(e) => setQuizDifficulty(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-medium)] text-xs text-[var(--text-primary)] outline-none cursor-pointer"
                        >
                          <option value="mixed">Mixed Difficulty</option>
                          <option value="easy">Easy (Foundations)</option>
                          <option value="medium">Medium (Standard)</option>
                          <option value="hard">Hard (Deep Challenge)</option>
                        </select>

                        <button
                          onClick={handleGenerateMoreQuestions}
                          disabled={loadingMoreQuiz}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          {loadingMoreQuiz ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Plus size={13} />
                          )}
                          <span>{loadingMoreQuiz ? 'Generating...' : 'Add 4 Questions'}</span>
                        </button>
                      </div>
                    </div>

                    {moreQuizSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2"
                      >
                        <CheckCircle2 size={14} />
                        <span>{moreQuizSuccess}</span>
                      </motion.div>
                    )}

                    {/* Question List */}
                    <div className="space-y-8">
                      {processedData.quiz?.map((q, idx) => {
                        const selected = selectedAnswers[q.id];
                        const isCorrect = selected === q.answer;

                        return (
                          <div key={q.id || idx} className="p-5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-4">
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center text-xs font-bold text-[var(--color-accent-primary)] shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                                  {q.question}
                                </h4>
                              </div>
                              {quizSubmitted && (
                                <span className="shrink-0">
                                  {isCorrect ? (
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                  ) : (
                                    <XCircle size={18} className="text-rose-400" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Options Grid */}
                            <div className="space-y-2 pt-1 pl-9">
                              {q.options?.map((opt, oIdx) => {
                                const optLetter = String.fromCharCode(65 + oIdx);
                                const isOptionSelected = selected === optLetter;
                                const isThisCorrectOption = optLetter === q.answer;

                                let btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface)] transition-all flex items-center gap-3 cursor-pointer";

                                if (isOptionSelected) {
                                  btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--color-accent-primary)] text-xs text-[var(--text-primary)] bg-[var(--color-accent-primary)]/10 font-semibold flex items-center gap-3";
                                }

                                if (quizSubmitted) {
                                  if (isThisCorrectOption) {
                                    btnStyle = "w-full text-left p-3.5 rounded-xl border border-emerald-500/50 text-xs text-emerald-400 bg-emerald-500/10 font-semibold flex items-center gap-3";
                                  } else if (isOptionSelected && !isCorrect) {
                                    btnStyle = "w-full text-left p-3.5 rounded-xl border border-rose-500/50 text-xs text-rose-400 bg-rose-500/10 flex items-center gap-3";
                                  } else {
                                    btnStyle = "w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] opacity-50 flex items-center gap-3";
                                  }
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    disabled={quizSubmitted}
                                    onClick={() => handleSelectOption(q.id, optLetter)}
                                    className={btnStyle}
                                  >
                                    <span className="w-5 h-5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center font-mono text-[10px] shrink-0">
                                      {optLetter}
                                    </span>
                                    <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Explanation Card */}
                            {quizSubmitted && q.explanation && (
                              <div className="ml-9 p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
                                <span className="font-semibold text-[var(--text-primary)] block">Concept Rationale:</span>
                                <p className="leading-relaxed">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!quizSubmitted && (
                      <div className="pt-4 text-center">
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={Object.keys(selectedAnswers).length === 0}
                          className="px-8 py-3 rounded-2xl bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md"
                        >
                          Submit Quiz Answers ({Object.keys(selectedAnswers).length}/{processedData.quiz?.length || 0})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Concept Clarifier Tab */}
                {activeTab === 'clarify' && (
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">Analogy-Based Clarifier</h3>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Ask AI to break down complex jargon or concepts using real-world analogies.
                      </p>
                    </div>

                    {/* Query form */}
                    <form onSubmit={(e) => handleClarify(e)} className="space-y-4">
                      <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-2xl px-4 py-3 focus-within:border-[var(--color-accent-primary)] transition-all">
                        <input
                          type="text"
                          value={conceptQuery}
                          onChange={(e) => setConceptQuery(e.target.value)}
                          placeholder="E.g., Explain dynamic programming using a backpack analogy..."
                          className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={clarifyLoading || !conceptQuery.trim()}
                          className="px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {clarifyLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          <span>Clarify</span>
                        </button>
                      </div>
                    </form>

                    {/* Result */}
                    {clarifyResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-3xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-4"
                      >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--color-accent-primary)]">
                          <Lightbulb size={13} /> Intuitive Clarification
                        </div>
                        <h4 className="text-base font-bold text-[var(--text-primary)]">
                          {clarifyResult.concept}
                        </h4>
                        <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pt-2 border-t border-[var(--border-subtle)] prose prose-invert max-w-none font-sans">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {clarifyResult.explanation}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* 4. Chat with Video Tab */}
                {activeTab === 'chat' && (
                  <div className="h-[580px]">
                    <VideoChat
                      videoId={processedData.video_id}
                      videoTitle={processedData.title}
                    />
                  </div>
                )}

              </div>
            </div>

          </div>
        </motion.div>
      )}

    </div>
  );
}
