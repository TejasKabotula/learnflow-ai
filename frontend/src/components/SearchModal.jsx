import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, FileText, Bookmark, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { searchService } from '../services/searchService';

export const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ courses: [], notes: [], saved: [], quizzes: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ courses: [], notes: [], saved: [], quizzes: [] });
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ courses: [], notes: [], saved: [], quizzes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchService.globalSearch(query);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalResults = results.courses.length + results.notes.length + results.saved.length + results.quizzes.length;

  const handleSelect = (url) => {
    onClose();
    navigate(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -10 }}
        className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-subtle)] gap-3 bg-[var(--bg-elevated)]/40">
          <Search size={18} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, notes, saved library, quizzes..."
            className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none text-sm"
          />
          {loading && <Loader2 size={16} className="animate-spin text-[var(--color-accent-primary)] shrink-0" />}
          {query && !loading && (
            <button 
              onClick={() => setQuery('')}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-md"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[10px] text-[var(--text-tertiary)] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!query.trim() && (
            <div className="py-8 text-center text-[var(--text-tertiary)] text-xs">
              Type to search across your courses, personal notes, saved library, and quizzes.
            </div>
          )}

          {query.trim() && !loading && totalResults === 0 && (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">No matching results found</p>
              <p className="text-xs text-[var(--text-tertiary)]">Try searching with a different term or keyword.</p>
            </div>
          )}

          {/* Courses Category */}
          {results.courses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 px-2">
                <BookOpen size={12} />
                <span>Courses ({results.courses.length})</span>
              </div>
              <div className="space-y-1">
                {results.courses.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">{item.subtitle}</p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Category */}
          {results.notes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 px-2">
                <FileText size={12} />
                <span>Notes ({results.notes.length})</span>
              </div>
              <div className="space-y-1">
                {results.notes.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate max-w-md">{item.subtitle}</p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved Library Category */}
          {results.saved.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 px-2">
                <Bookmark size={12} />
                <span>Saved Library ({results.saved.length})</span>
              </div>
              <div className="space-y-1">
                {results.saved.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">{item.subtitle}</p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quizzes Category */}
          {results.quizzes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 px-2">
                <HelpCircle size={12} />
                <span>Quizzes ({results.quizzes.length})</span>
              </div>
              <div className="space-y-1">
                {results.quizzes.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">{item.subtitle}</p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
