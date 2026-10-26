import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Flame, Clock, ArrowRight, Play, CheckCircle2, Zap, Layers, Sparkles, HelpCircle, FileText, Bookmark } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsData = await playlistService.getDashboardStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAnalyze = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      navigate('/ai-learning', { state: { initialUrl: urlInput.trim() } });
    }
  };

  // Dynamic Learning Path based on user's real course progression
  const DynamicLearningMap = () => {
    const courses = stats.recent_courses || [];
    const hasCourses = courses.length > 0;

    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 relative overflow-hidden h-[340px] flex flex-col justify-between">
        <div className="flex items-center justify-between z-10">
          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase">
            Curriculum Flow
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-medium">
            {stats.completed_lessons} / {stats.total_lessons} lessons completed
          </span>
        </div>

        {/* Decorative background grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          {hasCourses ? (
            <div className="flex flex-col items-center space-y-4 w-full px-4">
              {/* Primary Active Course Node */}
              <div className="w-full max-w-xs px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--color-accent-primary)]/40 rounded-xl text-xs font-medium text-[var(--color-accent-primary)] shadow-[0_0_15px_rgba(139,92,246,0.12)] flex items-center justify-between">
                <span className="truncate pr-2">{courses[0].title}</span>
                <span className="text-[10px] bg-[var(--color-accent-primary)]/10 px-2 py-0.5 rounded text-[var(--color-accent-primary)]">
                  {courses[0].progress_percentage}%
                </span>
              </div>

              {/* Connecting vertical line */}
              <div className="w-px h-6 bg-[var(--border-strong)]" />

              {/* Secondary Branch Nodes */}
              <div className="flex gap-4 w-full justify-center">
                {courses.slice(1, 3).map((c, i) => (
                  <div
                    key={c.id || i}
                    className="flex-1 max-w-[130px] px-3 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg text-[11px] font-medium text-[var(--text-secondary)] truncate text-center"
                  >
                    {c.title}
                  </div>
                ))}
                {courses.length === 1 && (
                  <div className="flex-1 max-w-[130px] px-3 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] border-dashed rounded-lg text-[11px] font-medium text-[var(--text-tertiary)] truncate text-center">
                    Next Pathway
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-[var(--text-tertiary)] mb-3">No active learning path yet.</p>
              <Link
                to="/courses"
                className="text-xs font-semibold text-[var(--color-accent-primary)] hover:underline inline-flex items-center gap-1"
              >
                Import a Course <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Progress Bar */}
        <div className="z-10 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
          <span className="text-[var(--text-tertiary)]">Overall Pathway</span>
          <span className="font-semibold text-[var(--text-primary)]">{stats.overall_progress || 0}%</span>
        </div>
      </div>
    );
  };

  const recentCoursesList = stats.recent_courses || [];
  const recentMaterialsList = stats.recent_materials || [];

  return (
    <div className="pb-24 space-y-16">
      {/* 2-Column Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* LEFT COLUMN: Hero & Learning */}
        <div className="lg:col-span-7 space-y-12">
          {/* Editorial Hero */}
          <section className="space-y-4">
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-[0.15em] uppercase">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}.
            </div>
            <h1 className="text-display text-[var(--text-primary)]">
              Learn something <br />
              <span className="text-[var(--text-secondary)]">worth remembering.</span>
            </h1>
          </section>

          {/* Continue Learning Section */}
          <section>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-xs font-semibold tracking-widest text-[var(--text-secondary)] uppercase">
                CONTINUE LEARNING
              </h2>
              <Link to="/courses" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                View all ({stats.courses || 0})
              </Link>
            </div>

            {recentCoursesList.length === 0 ? (
              <div className="py-8">
                <p className="text-[var(--text-tertiary)] mb-6 text-sm">Your next lesson starts with a video.</p>
                <Link to="/courses" className="text-sm text-[var(--text-primary)] font-medium flex items-center gap-2 group w-fit">
                  <span>Start your library</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentCoursesList.map((course) => (
                  <Link
                    to={`/playlist/${course.id}`}
                    key={course.id}
                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all rounded-2xl"
                  >
                    <div className="flex-1 pr-6">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span>{course.videos_count || 0} lessons</span>
                        {course.last_lesson && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">Next: {course.last_lesson.title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 mt-3 md:mt-0">
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                        {course.progress_percentage || 0}% complete
                      </span>
                      <div className="w-32 bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--text-secondary)] h-full transition-all duration-700 ease-out"
                          style={{ width: `${course.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent AI Study Materials */}
          {recentMaterialsList.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <h2 className="text-xs font-semibold tracking-widest text-[var(--text-secondary)] uppercase">
                  RECENT SAVED MATERIALS
                </h2>
                <Link to="/saved" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  Open Library
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recentMaterialsList.map((mat) => (
                  <Link
                    key={mat.id}
                    to="/saved"
                    className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {mat.type === 'summary' ? (
                        <FileText size={13} className="text-purple-400" />
                      ) : mat.type === 'quiz' ? (
                        <HelpCircle size={13} className="text-amber-400" />
                      ) : (
                        <Bookmark size={13} className="text-emerald-400" />
                      )}
                      <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider">
                        {mat.type}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">{mat.title}</h4>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Visuals & Metrics */}
        <div className="lg:col-span-5 space-y-8 mt-4 lg:mt-0">
          {/* Progress Strip */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-4">
                <Zap size={14} className={stats.streak > 0 ? "text-amber-400" : ""} />
                <span className="text-[10px] font-semibold tracking-widest uppercase">Day Streak</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-[var(--text-primary)]">
                  {String(stats.streak).padStart(2, '0')}
                </span>
                <span className="text-sm text-[var(--text-tertiary)]">days</span>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-4">
                <Clock size={14} />
                <span className="text-[10px] font-semibold tracking-widest uppercase">Learned</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-[var(--text-primary)]">{stats.hours}</span>
                <span className="text-sm text-[var(--text-tertiary)]">hrs</span>
              </div>
            </div>
          </section>

          {/* Real Learning Pathway Map */}
          <DynamicLearningMap />
        </div>
      </div>

      {/* Integrated AI Studio CTA - Full Width Bottom */}
      <section className="pt-8 border-t border-[var(--border-subtle)]">
        <div className="p-8 md:p-10 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-surface)] relative overflow-hidden shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent-primary)] mb-2">
                <Sparkles size={14} /> Instant AI Learning
              </div>
              <h2 className="text-xl font-medium text-[var(--text-primary)] mb-2">
                Turn any video into an interactive lesson
              </h2>
              <p className="text-[var(--text-tertiary)] text-sm leading-relaxed">
                Paste a YouTube URL and Learn Flow will create structured notes, analogies, and active recall practice questions instantly.
              </p>
            </div>

            <form onSubmit={handleQuickAnalyze} className="flex w-full md:w-[420px] shrink-0">
              <div className="flex-1 flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-l-xl px-4 h-12 focus-within:border-[var(--border-strong)] transition-colors">
                <input
                  type="text"
                  placeholder="Paste YouTube video URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="bg-transparent border-none outline-none text-[var(--text-primary)] w-full text-xs placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 disabled:opacity-40 transition-opacity px-6 rounded-r-xl font-medium text-xs flex items-center justify-center border border-[var(--text-primary)]"
              >
                Analyze
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
