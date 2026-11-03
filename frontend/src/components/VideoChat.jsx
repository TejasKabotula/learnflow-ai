import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Clock, 
  RotateCcw, 
  Loader2, 
  MessageSquare,
  ChevronRight,
  HelpCircle,
  Play
} from 'lucide-react';
import { chatService } from '../services/chatService';

export default function VideoChat({ videoId, videoTitle = "This Lesson", playlistId = null, onSeekTo }) {
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const starterPrompts = [
    "What are the main concepts covered in this video?",
    "Can you summarize the key steps step-by-step?",
    "Explain the core analogy used in this lesson.",
    "What common mistakes or best practices are mentioned?"
  ];

  useEffect(() => {
    if (videoId) {
      loadHistory();
    }
  }, [videoId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    setInitialLoading(true);
    setError('');
    try {
      const data = await chatService.getChatHistory(videoId);
      if (data && data.messages) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setMessages([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Clear conversation history for this lesson?")) {
      try {
        await chatService.clearChatHistory(videoId);
        setMessages([]);
      } catch (err) {
        console.error("Failed to clear chat:", err);
      }
    }
  };

  const handleSend = async (questionText = inputQuestion) => {
    const q = questionText.trim();
    if (!q || loading || !videoId) return;

    setError('');
    setInputQuestion('');

    // Optimistically add user question
    const userMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: q,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history format for context
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await chatService.askVideoQuestion(videoId, q, playlistId, historyPayload);

      const assistantMsg = {
        id: `resp_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.response?.data?.detail || "Failed to generate answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const parseFormattedText = (content) => {
    // Detect [MM:SS] or [HH:MM:SS] in text and turn them into clickable timestamp buttons
    const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const timeStr = match[1];
      const timeParts = timeStr.split(':').map(Number);
      let totalSeconds = 0;
      if (timeParts.length === 3) {
        totalSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      } else if (timeParts.length === 2) {
        totalSeconds = timeParts[0] * 60 + timeParts[1];
      }

      parts.push(
        <button
          key={`ts_${match.index}`}
          onClick={() => onSeekTo && onSeekTo(totalSeconds)}
          title={`Jump to ${timeStr}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-[var(--color-accent-primary)]/20 hover:bg-[var(--color-accent-primary)]/40 text-[var(--color-accent-primary)] text-xs font-mono font-medium transition-colors cursor-pointer border border-[var(--color-accent-primary)]/30"
        >
          <Play size={10} className="fill-current" />
          <span>{timeStr}</span>
        </button>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30 flex items-center justify-center text-[var(--color-accent-primary)]">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              Chat with This Video
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] font-mono">
                RAG Engine
              </span>
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] truncate max-w-sm">
              Grounded in the lecture transcript with exact timestamps
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-rose-400 px-2 py-1 rounded-md transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {initialLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[var(--text-tertiary)]">
            <Loader2 size={24} className="animate-spin mb-3 text-[var(--color-accent-primary)]" />
            <p className="text-xs">Preparing RAG knowledge base...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 px-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--color-accent-primary)] mb-4">
              <MessageSquare size={22} />
            </div>
            <h4 className="text-base font-medium text-[var(--text-primary)] mb-2">
              Ask anything about this video
            </h4>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed mb-6">
              Our AI retrieves exact quotes from the transcript and answers with timestamp citations you can click to jump in the player.
            </p>

            <div className="w-full space-y-2 text-left">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--text-tertiary)] px-1">
                Suggested Prompts
              </span>
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left p-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] text-xs text-[var(--text-secondary)] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{prompt}</span>
                  <ChevronRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30 flex items-center justify-center text-[var(--color-accent-primary)] shrink-0 mt-0.5">
                  <Bot size={15} />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] rounded-tr-none'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-none space-y-3'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {parseFormattedText(msg.content)}
                    </div>

                    {/* Source Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
                        <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
                          Video Citations & Timestamps
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((c, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => onSeekTo && onSeekTo(c.timestamp)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--color-accent-primary)]/10 border border-[var(--border-medium)] hover:border-[var(--color-accent-primary)]/40 text-[var(--color-accent-primary)] text-xs font-mono transition-all cursor-pointer group"
                              title={c.snippet}
                            >
                              <Play size={10} className="fill-current text-[var(--color-accent-primary)]" />
                              <span className="font-semibold">{c.timestamp_formatted}</span>
                              {c.snippet && (
                                <span className="text-[var(--text-tertiary)] text-[10px] truncate max-w-[140px] hidden sm:inline">
                                  • {c.snippet}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-0.5">
                  <User size={15} />
                </div>
              )}
            </motion.div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30 flex items-center justify-center text-[var(--color-accent-primary)] shrink-0">
              <Loader2 size={15} className="animate-spin" />
            </div>
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
              <span>Analyzing transcript and retrieving citations...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] shrink-0">
        <div className="flex items-center gap-2 bg-[var(--bg-canvas)] border border-[var(--border-medium)] focus-within:border-[var(--color-accent-primary)] rounded-xl px-3 py-1.5 transition-colors shadow-inner">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask a question about this video (e.g. When is X explained?)..."
            disabled={loading}
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none py-1.5"
          />
          <button
            type="submit"
            disabled={loading || !inputQuestion.trim()}
            className="w-8 h-8 rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Send Question"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
}
