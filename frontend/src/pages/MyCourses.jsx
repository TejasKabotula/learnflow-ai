import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ArrowRight, Loader2, X, Library as LibraryIcon, PlayCircle, Trash2, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router';
import { playlistService } from '../services/playlistService';

export default function MyCourses() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('RECENT'); // 'RECENT', 'TITLE', 'PROGRESS'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Delete Confirmation State
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const data = await playlistService.getAllPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPlaylist = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setImporting(true);
    setImportError('');
    try {
      const newPlaylist = await playlistService.importPlaylist(youtubeUrl, customTitle.trim() || undefined);
      // Avoid duplicate display if it already existed
      setPlaylists(prev => {
        const exists = prev.some(p => p.id === newPlaylist.id);
        if (exists) {
          return prev.map(p => p.id === newPlaylist.id ? newPlaylist : p);
        }
        return [newPlaylist, ...prev];
      });
      setIsModalOpen(false);
      setYoutubeUrl('');
      setCustomTitle('');
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error.response?.data?.detail || 'Failed to import course. Please verify the URL.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await playlistService.deletePlaylist(courseToDelete.id);
      setPlaylists(prev => prev.filter(p => p.id !== courseToDelete.id));
      setCourseToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtering & Sorting logic
  const filteredPlaylists = playlists
    .filter(p => {
      const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = true;
      const progress = p.progress_percentage || 0;
      
      if (activeFilter === 'IN PROGRESS') {
        matchesFilter = progress > 0 && progress < 100;
      } else if (activeFilter === 'COMPLETED') {
        matchesFilter = progress === 100;
      } else if (activeFilter === 'SAVED') {
        matchesFilter = progress === 0;
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'TITLE') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'PROGRESS') {
        return (b.progress_percentage || 0) - (a.progress_percentage || 0);
      } else {
        // 'RECENT'
        const timeA = new Date(a.last_accessed_at || a.created_at || 0).getTime();
        const timeB = new Date(b.last_accessed_at || b.created_at || 0).getTime();
        return timeB - timeA;
      }
    });

  // Typography Cover Generator
  const TypographyCover = ({ title, index }) => {
    const colors = [
      'from-violet-500/20 to-purple-600/20',
      'from-emerald-500/20 to-teal-600/20',
      'from-orange-500/20 to-red-600/20',
      'from-pink-500/20 to-rose-600/20',
      'from-indigo-500/20 to-violet-600/20'
    ];
    const borderColors = [
      'border-violet-500/30',
      'border-emerald-500/30',
      'border-orange-500/30',
      'border-pink-500/30',
      'border-indigo-500/30'
    ];
    
    const colorIdx = index % colors.length;
    const shortTitle = title ? title.substring(0, 2).toUpperCase() : 'CO';
    
    return (
      <div className={`w-32 h-24 shrink-0 rounded-xl bg-gradient-to-br ${colors[colorIdx]} border ${borderColors[colorIdx]} flex items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform`}>
        <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full border border-white/10" />
        <div className="absolute -left-2 -bottom-2 w-12 h-12 rotate-45 border border-white/10" />
        <span className="text-3xl font-bold tracking-tighter text-[var(--text-primary)] opacity-80 mix-blend-overlay">
          {shortTitle}
        </span>
      </div>
    );
  };

  return (
    <div className="pb-24 space-y-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4 pb-8 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-page-heading text-[var(--text-primary)] mb-3">Course Library</h1>
          <p className="text-lg text-[var(--text-tertiary)] max-w-xl">Curated collections of your imported courses, tutorials, and deep dives.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Import Course</span>
        </button>
      </div>

      {/* Search, Filter, and Sort Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] w-full md:w-auto">
          {['ALL', 'IN PROGRESS', 'COMPLETED', 'SAVED'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`pb-3 text-xs tracking-widest font-semibold uppercase transition-colors relative
                ${activeFilter === filter ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
            >
              {filter}
              {activeFilter === filter && (
                <motion.div 
                  layoutId="filter-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text-primary)]" 
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <ArrowUpDown size={13} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
            >
              <option value="RECENT">Recently Accessed</option>
              <option value="TITLE">Title (A - Z)</option>
              <option value="PROGRESS">Progress (Highest)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-4 h-10 w-full md:w-64 focus-within:border-[var(--border-strong)] transition-colors">
            <Search size={14} className="text-[var(--text-tertiary)] shrink-0" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..." 
              className="bg-transparent border-none outline-none text-[var(--text-primary)] w-full text-sm placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="text-[var(--text-tertiary)] py-20 flex items-center justify-center gap-3">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] mb-6">
            <LibraryIcon size={24} />
          </div>
          <h3 className="text-xl font-medium text-[var(--text-primary)] mb-3">Your library is empty</h3>
          <p className="text-[var(--text-tertiary)] mb-8 max-w-sm text-sm leading-relaxed">
            Import a YouTube playlist or single video to automatically generate a structured learning path.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm font-medium text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)] transition-colors flex items-center gap-2 group"
          >
            <span>Import first course</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredPlaylists.map((playlist, idx) => {
            const progress = playlist.progress_percentage || 0;
            return (
              <div 
                key={playlist.id}
                className="group p-4 bg-[var(--bg-surface)]/40 hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl transition-all flex flex-col md:flex-row md:items-center gap-6 relative"
              >
                {/* Clickable link area */}
                <Link to={`/playlist/${playlist.id}`} className="flex flex-col md:flex-row md:items-center gap-6 flex-1 min-w-0">
                  {/* Course Thumbnail Image with fallback */}
                  {(() => {
                    const thumb = playlist.thumbnail_url 
                      || (playlist.videos && playlist.videos[0]?.thumbnail_url)
                      || (playlist.videos && playlist.videos[0]?.video_id ? `https://img.youtube.com/vi/${playlist.videos[0].video_id}/hqdefault.jpg` : null);
                    
                    if (thumb) {
                      return (
                        <div className="w-32 h-20 sm:w-36 sm:h-22 shrink-0 rounded-xl overflow-hidden bg-[var(--bg-canvas)] border border-[var(--border-subtle)] relative group-hover:scale-[1.02] transition-transform shadow-xs flex items-center justify-center">
                          <img
                            src={thumb}
                            alt={playlist.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div style={{ display: 'none' }} className="w-full h-full">
                            <TypographyCover title={playlist.title} index={idx} />
                          </div>
                        </div>
                      );
                    }
                    return <TypographyCover title={playlist.title} index={idx} />;
                  })()}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors truncate mb-1">
                      {playlist.title}
                    </h3>
                    <p className="text-sm text-[var(--text-tertiary)] mb-3 line-clamp-1">
                      {playlist.description || "Interactive video curriculum"}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <PlayCircle size={14} className="text-[var(--text-tertiary)]" />
                        {playlist.videos?.length || 0} lessons
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                      <span>{progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started'}</span>
                    </div>
                  </div>

                  {/* Desktop Progress Area */}
                  <div className="hidden md:flex flex-col items-end gap-2 shrink-0 w-44">
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span className="text-[11px] text-[var(--text-tertiary)] font-medium">Progress</span>
                      <span className="text-xs text-[var(--text-primary)] font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[var(--text-secondary)] h-full transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Link>

                {/* Actions: Open and Delete */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <Link
                    to={`/playlist/${playlist.id}`}
                    className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    title="Open Course"
                  >
                    <ArrowRight size={18} />
                  </Link>

                  <button
                    onClick={() => setCourseToDelete(playlist)}
                    className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                    title="Remove Course"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Import Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 shadow-2xl rounded-3xl max-w-[480px] w-full relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} strokeWidth={2} />
              </button>

              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Import Course</h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-6">Paste a YouTube video or playlist URL to generate a structured curriculum.</p>

              {importError && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--color-error)]/10 text-[var(--color-error)] text-xs font-medium border border-[var(--color-error)]/20">
                  {importError}
                </div>
              )}

              <form onSubmit={handleImportPlaylist} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Source URL</label>
                  <input
                    type="text"
                    required
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/playlist?list=... or watch?v=..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold tracking-widest text-[var(--text-tertiary)] uppercase mb-2">Custom Title (Optional)</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="E.g., Master Full-Stack Web Development"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={importing || !youtubeUrl}
                    className="w-full bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 transition-opacity rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {importing ? <Loader2 size={16} className="animate-spin" /> : <span>Import Curriculum</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Remove Course?</h3>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                Are you sure you want to remove &quot;{courseToDelete.title}&quot; from your enrolled courses? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCourseToDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCourse}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--color-error)] text-white text-xs font-medium hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <span>Remove</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
