import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Trash2, Edit3, Save, Check, Loader2, X, BookOpen, Clock, Eye } from 'lucide-react';
import { notesService } from '../services/notesService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active selected note for editing
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // New Note Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Delete modal
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'edit'
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await notesService.getAllNotes();
      setNotes(data);
      if (data.length > 0 && !activeNote) {
        selectNote(data[0]);
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectNote = (note) => {
    setActiveNote(note);
    setEditTitle(note.title || 'Untitled Note');
    setEditContent(note.content || '');
    setHasUnsavedChanges(false);
    setSaveSuccess(false);
  };

  const handleContentChange = (val) => {
    setEditContent(val);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handleTitleChange = (val) => {
    setEditTitle(val);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handleSaveActiveNote = async () => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      const updated = await notesService.updateNote(activeNote.id, editTitle, editContent);
      setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title: editTitle, content: editContent, updated_at: updated.updated_at } : n));
      setActiveNote(prev => ({ ...prev, title: editTitle, content: editContent, updated_at: updated.updated_at }));
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsCreating(true);
    try {
      const created = await notesService.createStandaloneNote(
        newTitle.trim() || 'Untitled Note',
        newContent
      );
      setNotes(prev => [created, ...prev]);
      selectNote(created);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewContent('');
    } catch (err) {
      console.error("Error creating note:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await notesService.deleteNote(noteToDelete.id);
      const remaining = notes.filter(n => n.id !== noteToDelete.id);
      setNotes(remaining);
      if (activeNote?.id === noteToDelete.id) {
        if (remaining.length > 0) {
          selectNote(remaining[0]);
        } else {
          setActiveNote(null);
          setEditTitle('');
          setEditContent('');
        }
      }
      setNoteToDelete(null);
    } catch (err) {
      console.error("Error deleting note:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
  });

  return (
    <div className="pb-24 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 pb-8 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest mb-2">
            Workspace Notes
          </div>
          <h1 className="text-page-heading text-[var(--text-primary)] mb-2">Study Notes</h1>
          <p className="text-base text-[var(--text-tertiary)] max-w-xl">
            Keep concise notes, code snippets, and key formulas from your courses or write standalone thoughts.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      {/* Main Split Interface */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-[var(--text-tertiary)]">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] mb-5">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No notes created yet</h3>
          <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">
            Create notes while watching courses or create standalone knowledge entries right here.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="text-xs font-semibold text-[var(--color-accent-primary)] hover:underline flex items-center gap-1.5"
          >
            <Plus size={14} /> Create your first note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[750px]">
          {/* Notes Sidebar List */}
          <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl flex flex-col overflow-hidden shadow-sm">
            {/* Search Input */}
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40">
              <div className="flex items-center gap-2.5 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3.5 h-9 focus-within:border-[var(--border-strong)] transition-colors">
                <Search size={14} className="text-[var(--text-tertiary)] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="bg-transparent border-none outline-none text-[var(--text-primary)] w-full text-xs placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] p-2 space-y-1">
              {filteredNotes.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-tertiary)]">
                  No matching notes
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-[var(--bg-elevated)] border border-[var(--border-medium)]'
                          : 'hover:bg-[var(--bg-elevated)]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {note.title || 'Untitled Note'}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNoteToDelete(note);
                          }}
                          className="text-[var(--text-tertiary)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 leading-relaxed mb-2 font-mono">
                        {note.content || 'Empty note'}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        <Clock size={10} />
                        <span>
                          {new Date(note.updated_at || note.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {note.video_id && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--color-accent-primary)] font-medium">
                            Course Note
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Note Editor View */}
          <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl flex flex-col overflow-hidden shadow-sm">
            {activeNote ? (
              <div className="flex flex-col h-full">
                {/* Editor Top Bar */}
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4 bg-[var(--bg-elevated)]/20">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Note Title"
                      className="w-full bg-transparent border-none outline-none text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-tertiary)]">
                      <span>Last updated: {new Date(activeNote.updated_at || activeNote.created_at).toLocaleString()}</span>
                      {hasUnsavedChanges && (
                        <span className="text-amber-400 font-medium">• Unsaved changes</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setViewMode('preview')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'preview'
                            ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('edit')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          viewMode === 'edit'
                            ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                    </div>

                    <button
                      onClick={handleSaveActiveNote}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 transition-opacity px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      {isSaving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : saveSuccess ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Save size={13} />
                      )}
                      <span>{saveSuccess ? 'Saved' : isSaving ? 'Saving...' : 'Save Note'}</span>
                    </button>
                  </div>
                </div>

                {/* Editor or Markdown Preview */}
                <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                  {viewMode === 'edit' ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Write your study notes, insights, code snippets, or takeaways here..."
                      className="w-full flex-1 bg-transparent border-none outline-none text-[var(--text-secondary)] font-mono text-sm resize-none leading-relaxed placeholder:text-[var(--text-tertiary)]"
                    />
                  ) : (
                    <div className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {editContent || '*No content in this note yet. Click Edit to add notes.*'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                Select a note or create a new one to begin editing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Note Modal */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>

              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Create New Note</h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-6">Write down key ideas, lecture points, or notes.</p>

              <form onSubmit={handleCreateNote} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="E.g., CSS Container Queries Summary"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Content</label>
                  <textarea
                    required
                    rows={6}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Note details, markdown, or code..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl p-4 text-sm font-mono text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newContent.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <span>Create Note</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete Note?</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Are you sure you want to delete &quot;{noteToDelete.title}&quot;? This note will be permanently removed.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteNote}
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
