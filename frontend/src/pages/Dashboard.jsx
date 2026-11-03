import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Flame, 
  Clock, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Zap, 
  Layers, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  Bookmark,
  TrendingUp,
  PlusCircle,
  Library,
  Compass,
  ArrowUpRight,
  Video,
  X,
  Loader2,
  Check,
  FolderPlus,
  Tag
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { playlistService } from '../services/playlistService';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    courses: 0,
    total_lessons: 0,
    completed_lessons: 0,
    overall_progress: 0,
    streak: 0,
    hours: 0,
    recent_courses: [],
    recent_materials: []
  });
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [importingDirect, setImportingDirect] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '', link?: '' }

  // Add Single Video Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('existing'); // 'existing' | 'new'
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [modalError, setModalError] = useState('');

  const standardCategories = [
    'System Design',
    'Artificial Intelligence & ML',
    'Web Development',
    'Computer Science & DSA',
    'Frontend & UI/UX',
    'Backend & Cloud',
    'General'
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResult, playlistsResult] = await Promise.allSettled([
        playlistService.getDashboardStats(),
        playlistService.getAllPlaylists()
      ]);

      const allPlaylists = playlistsResult.status === 'fulfilled' ? playlistsResult.value : [];
      setUserPlaylists(allPlaylists);

      if (allPlaylists.length > 0 && !selectedPlaylistId) {
        setSelectedPlaylistId(allPlaylists[0].id);
      }

      if (statsResult.status === 'fulfilled' && statsResult.value) {
        const statsData = statsResult.value;
        // Fallback: If statsData has no recent_courses but playlists exist, populate with allPlaylists
        if ((!statsData.recent_courses || statsData.recent_courses.length === 0) && allPlaylists.length > 0) {
          statsData.recent_courses = allPlaylists.slice(0, 4).map(p => ({
            id: p.id,
            title: p.title,
            category: p.category || 'General',
            videos_count: p.videos?.length || 0,
            progress_percentage: p.progress_percentage || 0,
            last_lesson: p.videos && p.videos.length > 0 ? p.videos[0] : null
          }));
          statsData.courses = allPlaylists.length;
        }
        setStats(statsData);
      } else if (allPlaylists.length > 0) {
        setStats(prev => ({
          ...prev,
          courses: allPlaylists.length,
          recent_courses: allPlaylists.slice(0, 4).map(p => ({
            id: p.id,
            title: p.title,
            category: p.category || 'General',
            videos_count: p.videos?.length || 0,
            progress_percentage: p.progress_percentage || 0,
            last_lesson: p.videos && p.videos.length > 0 ? p.videos[0] : null
          }))
        }));
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Checks if given URL is a playlist or a single video
  const isPlaylistUrl = (url) => {
    const u = (url || '').trim().toLowerCase();
    return u.includes('list=') || u.includes('/playlist');
  };

  const handleAddCourseSubmit = async (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;

    const trimmed = urlInput.trim();

    // 1. If playlist URL: directly import as course without asking
    if (isPlaylistUrl(trimmed)) {
      setImportingDirect(true);
      setFeedback(null);
      try {
        const imported = await playlistService.importPlaylist(trimmed);
        setUrlInput('');
        setFeedback({
          type: 'success',
          message: `Playlist "${imported.title}" directly added to your courses!`,
          link: `/playlist/${imported.id}`
        });
        await fetchDashboardData();
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.response?.data?.detail || 'Failed to import playlist. Please verify the URL.'
        });
      } finally {
        setImportingDirect(false);
      }
    } else {
      // 2. Normal single video: open modal to choose existing playlist or new course category
      setModalError('');
      if (userPlaylists.length === 0) {
        setAddMode('new');
      } else {
        setAddMode('existing');
      }
      setIsAddModalOpen(true);
    }
  };

  const handleAddVideoToCourseSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsSubmittingVideo(true);
    setModalError('');

    try {
      if (addMode === 'existing') {
        if (!selectedPlaylistId) {
          setModalError('Please select a course to add this video to.');
          setIsSubmittingVideo(false);
          return;
        }
        const updated = await playlistService.addVideoToPlaylist(selectedPlaylistId, urlInput.trim());
        setIsAddModalOpen(false);
        setUrlInput('');
        setFeedback({
          type: 'success',
          message: `Video successfully added to "${updated.title}"!`,
          link: `/playlist/${updated.id}`
        });
        await fetchDashboardData();
      } else {
        // Create new course with this video and category
        const cat = selectedCategory === 'Other' ? (customCategory.trim() || 'General') : selectedCategory;
        const newCourse = await playlistService.importPlaylist(
          urlInput.trim(),
          newCourseTitle.trim() || undefined,
          cat
        );
        setIsAddModalOpen(false);
        setUrlInput('');
        setNewCourseTitle('');
        setCustomCategory('');
        setFeedback({
          type: 'success',
          message: `Created new course "${newCourse.title}" in ${cat}!`,
          link: `/playlist/${newCourse.id}`
        });
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Error adding video:", err);
      setModalError(err.response?.data?.detail || 'Failed to add video to course. Please verify the URL.');
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const sampleTags = [
    { label: 'System Design', query: 'https://www.youtube.com/watch?v=i53Gi_K3o7I' },
    { label: 'Machine Learning', query: 'https://www.youtube.com/watch?v=aircAruvnKk' },
    { label: 'React 19 Deep Dive', query: 'https://www.youtube.com/watch?v=8pDqJVdNa44' },
  ];

  return (
    <div className="pb-20 space-y-10 max-w-[1340px] mx-auto">
      
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-elevated)] to-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 sm:p-10 overflow-hidden shadow-sm">
        {/* Ambient background decoration */}
        <div 
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[90px] pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-semibold tracking-wider text-[var(--color-accent-primary)] uppercase">
              <Sparkles size={12} /> {getTimeGreeting()}
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Welcome back, <span>{user?.full_name?.split(' ')[0] || 'Learner'}</span>
            </h1>
            
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              You are on a <span className="font-semibold text-[var(--text-primary)]">{stats.streak || 0}-day study streak</span>. Add videos and playlists directly into your courses to build a structured curriculum.
            </p>
          </div>

          {/* Quick Streak & Progress Pill */}
          <div className="flex items-center gap-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-4 rounded-2xl shrink-0 shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Flame size={24} className={stats.streak > 0 ? "animate-pulse" : ""} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Daily Focus Streak
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.streak || 0}</span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">days active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick URL Input Bar inside Hero: Add to Course */}
        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
          <form onSubmit={handleAddCourseSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-3xl">
            <div className="flex-1 flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-4 py-2.5 focus-within:border-[var(--color-accent-primary)] focus-within:ring-1 focus-within:ring-[var(--color-accent-primary)] transition-all">
              <Video size={16} className="text-[var(--text-tertiary)] mr-3 shrink-0" />
              <input 
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste YouTube playlist URL to import directly, or single video to add to a course..."
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <button
              type="submit"
              disabled={!urlInput.trim() || importingDirect}
              className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              {importingDirect ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Importing Playlist...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={14} />
                  <span>Add to Course</span>
                </>
              )}
            </button>
          </form>

          {/* Feedback Toast Banner */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3.5 rounded-xl border text-xs font-medium max-w-3xl flex items-center justify-between gap-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <X size={15} />}
                <span>{feedback.message}</span>
              </div>
              {feedback.link && (
                <Link
                  to={feedback.link}
                  className="font-semibold underline hover:opacity-80 shrink-0"
                >
                  View Course →
                </Link>
              )}
            </motion.div>
          )}

          {/* Sample quick tags */}
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-tertiary)] flex-wrap">
            <span className="text-[11px] font-medium">Try exploring:</span>
            {sampleTags.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUrlInput(tag.query)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Courses */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Enrolled Courses
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {stats.courses || 0}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
              <Link to="/courses" className="text-[var(--color-accent-primary)] font-medium hover:underline inline-flex items-center gap-0.5">
                View curriculum <ArrowUpRight size={12} />
              </Link>
            </p>
          </div>
        </div>

        {/* Card 2: Lessons Completed */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Completed Modules
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {stats.completed_lessons || 0}
              <span className="text-base font-normal text-[var(--text-tertiary)] ml-1">
                / {stats.total_lessons || 0}
              </span>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${stats.total_lessons ? Math.min(100, Math.round((stats.completed_lessons / stats.total_lessons) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Study Duration */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Total Focused Time
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {stats.hours || 0}
              <span className="text-sm font-normal text-[var(--text-tertiary)] ml-1.5">hours</span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Structured video learning</p>
          </div>
        </div>

        {/* Card 4: Curriculum Mastery */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Curriculum Mastery
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {stats.overall_progress || 0}%
            </div>
            <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-[var(--color-accent-primary)] h-full transition-all duration-500"
                style={{ width: `${stats.overall_progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Learning Hub Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Continue Learning Courses */}
        <div className="lg:col-span-8 space-y-8">
          
          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Play size={16} className="text-[var(--text-primary)] fill-current" />
                <h2 className="text-sm font-semibold tracking-wider uppercase text-[var(--text-primary)]">
                  Continue Learning
                </h2>
              </div>
              <Link 
                to="/courses" 
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              >
                <span>Browse All ({stats.courses || userPlaylists.length || 0})</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {stats.recent_courses && stats.recent_courses.length > 0 ? (
              <div className="space-y-3.5">
                {stats.recent_courses.map((course) => (
                  <Link
                    to={`/playlist/${course.id}`}
                    key={course.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl transition-all gap-4"
                  >
                    {/* Course Thumbnail */}
                    {(() => {
                      const thumb = course.thumbnail_url 
                        || (course.last_lesson?.thumbnail_url)
                        || (course.last_lesson?.video_id ? `https://img.youtube.com/vi/${course.last_lesson.video_id}/hqdefault.jpg` : null);
                      if (thumb) {
                        return (
                          <div className="w-24 h-16 sm:w-28 sm:h-18 shrink-0 rounded-xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)] relative">
                            <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider">
                          {course.category || 'Course'}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {course.videos_count || 0} modules
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors line-clamp-1">
                        {course.title}
                      </h3>

                      {course.last_lesson && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1.5">
                          <Play size={10} className="text-[var(--color-accent-primary)] shrink-0" />
                          <span className="truncate max-w-sm">Up next: {course.last_lesson.title}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] shrink-0">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {course.progress_percentage || 0}% completed
                      </span>
                      <div className="w-28 bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                        <div 
                          className="bg-[var(--color-accent-primary)] h-full transition-all duration-500"
                          style={{ width: `${course.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] mx-auto mb-3">
                  <BookOpen size={20} />
                </div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No courses started yet</h4>
                <p className="text-xs text-[var(--text-tertiary)] max-w-xs mx-auto mb-4">
                  Paste a YouTube playlist link above to import directly, or a single video to add to a category.
                </p>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <PlusCircle size={14} /> Import First Course
                </Link>
              </div>
            )}
          </section>

          {/* Recent AI Materials in Knowledge Vault */}
          <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Bookmark size={16} className="text-[var(--text-primary)]" />
                <h2 className="text-sm font-semibold tracking-wider uppercase text-[var(--text-primary)]">
                  Knowledge Vault
                </h2>
              </div>
              <Link 
                to="/saved" 
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              >
                <span>Open Library</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {stats.recent_materials && stats.recent_materials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.recent_materials.map((item) => (
                  <Link
                    to="/saved"
                    key={item.id}
                    className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {item.type}
                        </span>
                        <FileText size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                      </div>
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                    </div>
                    <span className="text-[11px] text-[var(--color-accent-primary)] font-medium mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Review in Vault →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[var(--text-tertiary)] bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)]">
                No saved study notes or quizzes yet. Use AI Studio to synthesize your first lecture.
              </div>
            )}
          </section>

        </div>

        {/* Right Column (4 cols): Course Pathway & AI Assistant Cards */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Pathway Progress Widget */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
                  Curriculum Pathway
                </span>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  Active Learning Track
                </h3>
              </div>
              <span className="text-xs font-bold text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 px-2 py-0.5 rounded-md">
                {stats.overall_progress || 0}%
              </span>
            </div>

            <div className="space-y-3">
              {stats.recent_courses && stats.recent_courses.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent_courses.slice(0, 3).map((c, i) => (
                    <div 
                      key={c.id || i}
                      className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          i === 0 ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="font-medium text-[var(--text-primary)] truncate">{c.title}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] ml-2">
                        {c.progress_percentage || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] border-dashed text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">No active pathway yet</p>
                  <Link to="/courses" className="text-xs font-semibold text-[var(--color-accent-primary)] hover:underline">
                    Explore course catalog →
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
              <span>Status: In Progress</span>
              <Link to="/courses" className="font-semibold text-[var(--text-primary)] hover:underline">
                Manage Courses
              </Link>
            </div>
          </div>

          {/* AI Studio Feature Card */}
          <div className="bg-gradient-to-br from-[var(--color-accent-primary)]/10 via-[var(--bg-surface)] to-[var(--bg-surface)] border border-[var(--color-accent-primary)]/20 rounded-3xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] flex items-center justify-center mb-4 shadow-sm">
              <Sparkles size={20} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              AI Video-to-Notes Engine
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
              Paste single video links into AI Studio to create structured markdown study guides and interactive quizzes.
            </p>
            <Link 
              to="/ai-learning"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>Open AI Studio</span>
              <ArrowRight size={13} />
            </Link>
          </div>

        </div>

      </div>

      {/* MODAL: Add Single Video to Courses / Playlists */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-canvas)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6"
            >
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Video size={12} /> Single Video Detected
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Add Video to Course
                </h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Choose an existing course playlist to append this video to, or create a brand new categorized course.
                </p>
              </div>

              {/* Mode Switcher Pills */}
              <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-2xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAddMode('existing')}
                  disabled={userPlaylists.length === 0}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    addMode === 'existing'
                      ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40'
                  }`}
                >
                  Add to Existing Course ({userPlaylists.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('new')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    addMode === 'new'
                      ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Create New Course
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleAddVideoToCourseSubmit} className="space-y-4">
                
                {/* Mode 1: Add to Existing Course */}
                {addMode === 'existing' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Select Target Course / Playlist:
                    </label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {userPlaylists.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            selectedPlaylistId === pl.id
                              ? 'bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)] text-[var(--text-primary)] shadow-xs'
                              : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider block">
                              {pl.category || 'Course'}
                            </span>
                            <h4 className="text-xs font-semibold truncate text-[var(--text-primary)] mt-0.5">
                              {pl.title}
                            </h4>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {pl.videos?.length || 0} modules currently
                            </p>
                          </div>
                          {selectedPlaylistId === pl.id && (
                            <CheckCircle2 size={16} className="text-[var(--color-accent-primary)] shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 2: Create New Course Container */}
                {addMode === 'new' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                        Course Title (Optional):
                      </label>
                      <input
                        type="text"
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        placeholder="Leave blank to use YouTube video title..."
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--color-accent-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                        Choose Course Category:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {standardCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                              selectedCategory === cat
                                ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-xs'
                                : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingVideo}
                    className="px-6 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    {isSubmittingVideo ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus size={14} />
                        <span>{addMode === 'existing' ? 'Add to Course' : 'Create Course & Add'}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
