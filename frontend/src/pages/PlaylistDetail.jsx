import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  PlayCircle, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  Check, 
  ExternalLink,
  Award,
  Video,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Share2,
  Clock,
  Circle
} from 'lucide-react';
import { playlistService } from '../services/playlistService';
import { notesService } from '../services/notesService';
import { savedService } from '../services/savedService';
import { progressService } from '../services/progressService';
import { useAuth } from '../context/AuthContext';
import VideoChat from '../components/VideoChat';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('player'); // 'player', 'chat', 'notes', 'modules'
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const playerIframeRef = useRef(null);

  const handleSeekTo = (seconds) => {
    if (playerIframeRef.current?.contentWindow) {
      playerIframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true]
        }),
        '*'
      );
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      const data = await playlistService.getPlaylistById(id);
      setPlaylist(data);
      if (data.videos && data.videos.length > 0) {
        loadNoteForVideo(data.videos[0].video_id);
      }
    } catch (error) {
      console.error("Error fetching playlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNoteForVideo = async (videoId) => {
    try {
      const data = await notesService.getNotesByVideo(id, videoId);
      setNote(data.content || '');
    } catch (error) {
      setNote('');
    }
  };

  const handleSelectVideo = (index) => {
    setActiveVideoIndex(index);
    const vid = playlist.videos[index];
    if (vid) {
      loadNoteForVideo(vid.video_id);
    }
  };

  const handlePrevVideo = () => {
    if (activeVideoIndex > 0) {
      handleSelectVideo(activeVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (playlist?.videos && activeVideoIndex < playlist.videos.length - 1) {
      handleSelectVideo(activeVideoIndex + 1);
    }
  };

  const handleToggleCompleted = async (e, videoId) => {
    e?.stopPropagation();
    try {
      const data = await progressService.completeVideo(videoId);
      
      setPlaylist(prev => {
        if (!prev) return prev;
        const updatedVideos = prev.videos.map(v => 
          v.video_id === videoId ? { ...v, completed: data.completed } : v
        );
        const completedCount = updatedVideos.filter(v => v.completed).length;
        const progress_percentage = Math.floor((completedCount / updatedVideos.length) * 100);
        
        return {
          ...prev,
          videos: updatedVideos,
          progress_percentage: progress_percentage
        };
      });
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const handleSaveNote = async () => {
    const activeVideo = playlist?.videos?.[activeVideoIndex];
    if (!activeVideo) return;

    setNoteSaving(true);
    try {
      const noteTitle = activeVideo.title ? `${activeVideo.title} - Notes` : `Lesson Note (${activeVideo.video_id})`;
      await notesService.createOrUpdateNote(id, activeVideo.video_id, note, 0, noteTitle);
      await savedService.saveResource({
        title: noteTitle,
        type: 'note',
        content: note,
        video_id: activeVideo.video_id,
        playlist_id: id,
        metadata: {
          course_title: playlist.title,
          lesson_title: activeVideo.title
        }
      }).catch(e => console.error("Saved resource sync error:", e));

      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (error) {
      console.error("Save note error:", error);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleAnalyzeWithAI = (video) => {
    if (!video) return;
    const videoUrl = `https://www.youtube.com/watch?v=${video.video_id}`;
    navigate('/ai-learning', { state: { initialUrl: videoUrl } });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          Loading learning pathway...
        </p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <FileText size={22} />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Course pathway not found</h2>
        <p className="text-xs text-[var(--text-tertiary)]">This course may have been removed or the URL is invalid.</p>
        <Link to="/courses" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] text-xs font-medium">
          <ArrowLeft size={14} /> Back to My Courses
        </Link>
      </div>
    );
  }

  const activeVideo = playlist.videos?.[activeVideoIndex] || playlist.videos?.[0];
  const progress = playlist.progress_percentage || 0;
  const filteredVideos = (playlist.videos || []).filter(v => 
    v.title.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1340px] mx-auto pb-20">
      
      {/* Top Navigation & Course Header Banner */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <Link 
              to="/courses" 
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to All Courses</span>
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20 text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider">
                Curriculum Track
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {playlist.videos?.length || 0} Modules
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {playlist.title}
            </h1>

            {playlist.description && (
              <p className="text-xs text-[var(--text-secondary)] max-w-3xl line-clamp-2 leading-relaxed">
                {playlist.description}
              </p>
            )}
          </div>

          {/* Progress Card */}
          <div className="flex items-center gap-5 bg-[var(--bg-canvas)] border border-[var(--border-medium)] p-4 rounded-2xl shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Course Completion
              </p>
              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{progress}%</span>
              </div>
              <div className="w-28 bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-[var(--text-primary)] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              progress === 100 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' 
                : 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/30'
            }`}>
              {progress === 100 ? <Award size={24} /> : <Video size={24} />}
            </div>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[var(--border-subtle)] overflow-x-auto">
          {[
            { id: 'player', label: 'Study Cinema', icon: <PlayCircle size={15} /> },
            { id: 'chat', label: 'Chat with Video (RAG)', icon: <MessageSquare size={15} /> },
            { id: 'notes', label: 'Scratchpad & Notes', icon: <FileText size={15} /> },
            { id: 'modules', label: `Curriculum Modules (${playlist.videos?.length || 0})`, icon: <BookOpen size={15} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-sm'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Study Cinema (Theater Player + Side Playlist) */}
      {activeTab === 'player' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Video Cinema (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* 16:9 Video Player Frame with subtle ambient glow */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-[var(--border-subtle)] shadow-2xl">
              {activeVideo ? (
                <iframe
                  ref={playerIframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.video_id}?autoplay=0&rel=0&enablejsapi=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] space-y-2">
                  <PlayCircle size={36} />
                  <p className="text-xs">Select a module to play</p>
                </div>
              )}
            </div>

            {/* Video Controls & Action Bar */}
            {activeVideo && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-accent-primary)]/10">
                        Module {activeVideoIndex + 1} of {playlist.videos?.length}
                      </span>
                      {activeVideo.duration && (
                        <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                          <Clock size={11} /> {activeVideo.duration}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                      {activeVideo.title}
                    </h2>
                  </div>

                  {/* Previous / Next Module Navigation */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePrevVideo}
                      disabled={activeVideoIndex === 0}
                      className="p-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer"
                      title="Previous Module"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextVideo}
                      disabled={activeVideoIndex >= (playlist.videos?.length || 1) - 1}
                      className="p-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer"
                      title="Next Module"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--color-accent-primary)]/30 text-[var(--color-accent-primary)] text-xs font-semibold transition-all cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>Ask Video AI</span>
                    </button>

                    <button
                      onClick={() => handleAnalyzeWithAI(activeVideo)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                      title="Analyze this lecture with AI notes, interactive quiz, and transcript"
                    >
                      <Sparkles size={14} className="text-[var(--color-accent-primary)] animate-pulse" />
                      <span>Analyze Video with AI</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleToggleCompleted(e, activeVideo.video_id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      activeVideo.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <CheckCircle2 size={15} className={activeVideo.completed ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'} />
                    <span>{activeVideo.completed ? 'Lesson Completed' : 'Mark as Complete'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Playlist Modules (4 cols) */}
          <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-5 shadow-sm flex flex-col h-[580px]">
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                  Curriculum Playlist
                </h3>
                <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                  {playlist.videos?.filter(v => v.completed).length} / {playlist.videos?.length} done
                </span>
              </div>

              {/* Module Search Filter */}
              <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3 py-1.5 focus-within:border-[var(--color-accent-primary)] transition-colors">
                <Search size={13} className="text-[var(--text-tertiary)] mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter lessons..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredVideos.map((vid, idx) => {
                const originalIndex = playlist.videos.findIndex(v => v.video_id === vid.video_id);
                const isActive = originalIndex === activeVideoIndex;
                
                return (
                  <div
                    key={vid.video_id}
                    onClick={() => handleSelectVideo(originalIndex)}
                    className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)]/40 shadow-sm'
                        : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                      }`}>
                        {originalIndex + 1}
                      </div>
                      
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'
                        }`}>
                          {vid.title}
                        </p>
                        {vid.duration && (
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                            {vid.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleCompleted(e, vid.video_id)}
                      className="shrink-0 p-1 text-[var(--text-tertiary)] hover:text-emerald-400 transition-colors cursor-pointer"
                      title={vid.completed ? "Mark incomplete" : "Mark completed"}
                    >
                      <CheckCircle2 size={16} className={vid.completed ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Chat with Video (RAG) */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
          {/* Left: Video Player */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="aspect-video rounded-3xl overflow-hidden bg-black border border-[var(--border-subtle)] shadow-xl relative shrink-0">
              {activeVideo ? (
                <iframe
                  ref={playerIframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.video_id}?autoplay=0&rel=0&enablejsapi=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-[var(--text-tertiary)]">
                  Select a module
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider">
                  Module {activeVideoIndex + 1}
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">{activeVideo?.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  💡 <strong>Smart Timestamp Navigation:</strong> Ask questions about this specific lecture. When the AI answers with timestamp chips (e.g. <code>[04:20]</code>), clicking them jumps the video player immediately.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] mt-4">
                <button
                  onClick={() => setActiveTab('player')}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ← Back to full cinema
                </button>
                <button
                  onClick={(e) => handleToggleCompleted(e, activeVideo.video_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    activeVideo?.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[var(--bg-canvas)] border-[var(--border-medium)] text-[var(--text-secondary)]'
                  }`}
                >
                  <CheckCircle2 size={13} className={activeVideo?.completed ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'} />
                  <span>{activeVideo?.completed ? 'Completed' : 'Mark Done'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: RAG Chat */}
          <div className="lg:col-span-6 h-full">
            <VideoChat
              videoId={activeVideo?.video_id}
              videoTitle={activeVideo?.title}
              playlistId={id}
              onSeekTo={handleSeekTo}
            />
          </div>
        </div>
      )}

      {/* TAB 3: Scratchpad & Notes */}
      {activeTab === 'notes' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <FileText size={18} className="text-[var(--color-accent-primary)]" />
                <h3>Personal Lesson Notes & Scratchpad</h3>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Notes for: <span className="font-medium text-[var(--text-secondary)]">{activeVideo?.title}</span>
              </p>
            </div>

            <button
              onClick={handleSaveNote}
              disabled={noteSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
            >
              {noteSaved ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
              <span>{noteSaved ? 'Notes Saved!' : noteSaving ? 'Saving...' : 'Save Notes'}</span>
            </button>
          </div>

          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write key code snippets, formulas, or takeaways from this lesson... Notes are preserved automatically per module."
            className="w-full h-[450px] bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-2xl p-5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--color-accent-primary)] font-mono text-xs sm:text-sm leading-relaxed"
          />
        </div>
      )}

      {/* TAB 4: Curriculum Modules Matrix */}
      {activeTab === 'modules' && (
        <div className="space-y-3">
          {playlist.videos && playlist.videos.length > 0 ? (
            playlist.videos.map((video, index) => (
              <motion.div 
                key={video.video_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => {
                  setActiveVideoIndex(index);
                  setActiveTab('player');
                }}
                className="bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-2xl p-5 flex items-center gap-5 cursor-pointer group transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-[var(--color-accent-primary)] group-hover:border-[var(--color-accent-primary)]/40 transition-colors shrink-0">
                  <PlayCircle size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wider">
                      Module {index + 1}
                    </span>
                    {video.duration && (
                      <span className="text-xs text-[var(--text-tertiary)]">• {video.duration}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--color-accent-primary)] transition-colors">
                    {video.title}
                  </h4>
                </div>
                
                <button 
                  onClick={(e) => handleToggleCompleted(e, video.video_id)}
                  className="p-2 transition-colors cursor-pointer text-[var(--text-tertiary)] hover:text-emerald-400"
                  title={video.completed ? "Mark incomplete" : "Mark complete"}
                >
                  <CheckCircle2 size={20} className={video.completed ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'} />
                </button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-xs text-[var(--text-tertiary)]">
              No modules found in this course.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
