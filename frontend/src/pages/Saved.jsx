import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Search, Trash2, ExternalLink, Loader2, BookOpen, FileText, HelpCircle, X, ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { savedService } from '../services/savedService';

export default function Saved() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // View detail modal
  const [selectedItem, setSelectedItem] = useState(null);

  // Delete modal
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSavedItems();
  }, [activeFilter]);

  const fetchSavedItems = async () => {
    setLoading(true);
    try {
      const type = activeFilter === 'ALL' ? 'all' : activeFilter.toLowerCase();
      const data = await savedService.getSavedResources(type);
      setItems(data);
    } catch (err) {
      console.error("Error fetching saved items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await savedService.deleteSavedResource(itemToDelete.id);
      setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null);
      }
      setItemToDelete(null);
    } catch (err) {
      console.error("Error deleting saved item:", err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const contentMatch = typeof item.content === 'string' && item.content.toLowerCase().includes(q);
    return titleMatch || contentMatch;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'summary':
        return <FileText size={16} className="text-purple-400" />;
      case 'quiz':
        return <HelpCircle size={16} className="text-amber-400" />;
      case 'note':
        return <BookOpen size={16} className="text-emerald-400" />;
      default:
        return <Bookmark size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="pb-24 space-y-10">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 pb-8 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest mb-2">
            Personal Archive
          </div>
          <h1 className="text-page-heading text-[var(--text-primary)] mb-2">Saved Library</h1>
          <p className="text-base text-[var(--text-tertiary)] max-w-xl">
            Access your curated collection of AI summaries, generated notes, and interactive practice materials.
          </p>
        </div>

        <Link
          to="/ai-learning"
          className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <span>Explore in AI Studio</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] w-full md:w-auto">
          {['ALL', 'SUMMARY', 'QUIZ', 'NOTE'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`pb-3 text-xs tracking-widest font-semibold uppercase transition-colors relative
                ${activeFilter === filter ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
            >
              {filter}
              {activeFilter === filter && (
                <motion.div
                  layoutId="saved-filter-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text-primary)]"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 h-10 w-full md:w-72 focus-within:border-[var(--border-strong)] transition-colors">
          <Search size={14} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved resources..."
            className="bg-transparent border-none outline-none text-[var(--text-primary)] w-full text-xs placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-[var(--text-tertiary)]">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] mb-5">
            <Bookmark size={24} />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No saved resources found</h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">
            Save summaries, notes, or quizzes from the AI Studio to build your personal study archive.
          </p>
          <Link
            to="/ai-learning"
            className="text-xs font-semibold text-[var(--color-accent-primary)] hover:underline flex items-center gap-1"
          >
            Go to AI Studio <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    {getTypeIcon(item.type)}
                    <span>{item.type}</span>
                  </div>

                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-[var(--text-tertiary)] line-clamp-3 leading-relaxed mb-6">
                  {typeof item.content === 'string'
                    ? item.content.replace(/^#+\s+/gm, '')
                    : JSON.stringify(item.content)}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setSelectedItem(item)}
                  className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-1.5"
                >
                  <Eye size={14} />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => setItemToDelete(item)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] transition-colors p-1"
                  title="Remove from Library"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-3xl p-8 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                    {getTypeIcon(selectedItem.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
                      Saved {selectedItem.type}
                    </span>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">
                      {selectedItem.title}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                {typeof selectedItem.content === 'string' ? (
                  <div className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {selectedItem.content}
                  </div>
                ) : Array.isArray(selectedItem.content) ? (
                  <div className="space-y-4">
                    {selectedItem.content.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="space-y-1 pl-4">
                          {q.options?.map((opt, oIdx) => (
                            <p key={oIdx} className="text-xs text-[var(--text-secondary)]">
                              {opt}
                            </p>
                          ))}
                        </div>
                        {q.answer && (
                          <div className="pt-2 text-xs text-[var(--color-success)] font-medium">
                            Correct Answer: {q.answer}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-[var(--text-tertiary)]">{q.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-canvas)] p-4 rounded-xl">
                    {JSON.stringify(selectedItem.content, null, 2)}
                  </pre>
                )}
              </div>

              <div className="pt-6 border-t border-[var(--border-subtle)] mt-6 flex justify-between items-center text-xs text-[var(--text-tertiary)]">
                <span>Saved on {new Date(selectedItem.created_at).toLocaleString()}</span>
                <button
                  onClick={() => {
                    setItemToDelete(selectedItem);
                  }}
                  className="text-[var(--color-error)] hover:underline flex items-center gap-1 font-medium"
                >
                  <Trash2 size={13} />
                  <span>Remove from library</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Remove Saved Resource?</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Are you sure you want to remove &quot;{itemToDelete.title}&quot; from your saved library? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--color-error)] text-white text-xs font-medium hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <span>Remove</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
