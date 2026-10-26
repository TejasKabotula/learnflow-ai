import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
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
  Video
} from 'lucide-react';
import { playlistService } from '../services/playlistService';
import { notesService } from '../services/notesService';
import { progressService } from '../services/progressService';
import { useAuth } from '../context/AuthContext';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('player'); // 'player', 'modules', 'notes'
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

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
      // Note might not exist yet
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

  const handleToggleCompleted = async (e, videoId) => {
    e.stopPropagation();
    try {
      const data = await progressService.completeVideo(videoId);
      
      setPlaylist(prev => {
        if (!prev) return prev;
        const updatedVideos = prev.videos.map(v => 
          v.video_id === videoId ? { ...v, completed: data.completed } : v
        );
        // We'd ideally re-fetch playlist to get exact progress_percentage if the endpoint doesn't return it
        // Or calculate it manually:
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
      await notesService.createOrUpdateNote(id, activeVideo.video_id, note);
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

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading learning pathway...</div>;
  if (!playlist) return <div className="text-rose-400 py-12 text-center">Course pathway not found</div>;

  const activeVideo = playlist.videos?.[activeVideoIndex] || playlist.videos?.[0];
  const progress = playlist.progress_percentage || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header & Back Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/courses" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-3 text-sm">
            <ArrowLeft size={16} />
            <span>Back to All Courses</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{playlist.title}</h1>
          <p className="text-gray-400 text-sm max-w-3xl leading-relaxed">{playlist.description}</p>
        </div>

        <div className="flex items-center gap-4 bg-obsidian-800/80 border border-obsidian-700/80 p-4 rounded-2xl shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400 font-medium">Pathway Progress</p>
            <p className="text-2xl font-bold text-[#0ea5e9]">{progress}%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 flex items-center justify-center text-[#0ea5e9]">
            {progress === 100 ? <Award size={24} className="text-amber-400" /> : <Video size={24} />}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-obsidian-700 pb-1">
        <button 
          onClick={() => setActiveTab('player')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-medium transition-colors text-sm cursor-pointer ${
            activeTab === 'player' ? 'text-white border-b-2 border-[#0ea5e9] bg-obsidian-800/60' : 'text-gray-400 hover:text-white'
          }`}
        >
          <PlayCircle size={16} className="text-[#0ea5e9]" />
          Active Study Room
        </button>
        <button 
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-medium transition-colors text-sm cursor-pointer ${
            activeTab === 'modules' ? 'text-white border-b-2 border-[#8b5cf6] bg-obsidian-800/60' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Video size={16} className="text-[#8b5cf6]" />
          Curriculum Modules ({playlist.videos?.length || 0})
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-medium transition-colors text-sm cursor-pointer ${
            activeTab === 'notes' ? 'text-white border-b-2 border-emerald-400 bg-obsidian-800/60' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText size={16} className="text-emerald-400" />
          Course Notes
        </button>
      </div>

      {/* Tab 1: Active Study Room with Embedded Video and Side Module List */}
      {activeTab === 'player' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video View */}
          <div className="lg:col-span-2 space-y-4">
            <div className="tactile-card overflow-hidden bg-black aspect-video rounded-2xl relative border border-obsidian-700 shadow-2xl">
              {activeVideo ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.video_id}?autoplay=0&rel=0`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a module to begin
                </div>
              )}
            </div>

            {activeVideo && (
              <div className="tactile-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-[#8b5cf6] font-semibold uppercase tracking-wider">
                    Module {activeVideoIndex + 1}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{activeVideo.title}</h3>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAnalyzeWithAI(activeVideo)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#0ea5e9] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  >
                    <Sparkles size={14} /> AI Notes & Quiz
                  </button>

                  <button
                    onClick={(e) => handleToggleCompleted(e, activeVideo.video_id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      activeVideo.completed
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-obsidian-700 hover:bg-obsidian-600 border-obsidian-600 text-gray-300'
                    }`}
                  >
                    <CheckCircle2 size={14} className={activeVideo.completed ? 'text-emerald-400' : 'text-gray-400'} />
                    <span>{activeVideo.completed ? 'Completed' : 'Mark Done'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Module List */}
          <div className="tactile-card p-4 h-[540px] flex flex-col">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 px-2">
              Modules in Playlist
            </h4>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {playlist.videos?.map((vid, idx) => {
                const isActive = idx === activeVideoIndex;
                return (
                  <div
                    key={vid.video_id}
                    onClick={() => handleSelectVideo(idx)}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/50 text-white' 
                        : 'bg-obsidian-900/60 hover:bg-obsidian-800 border border-obsidian-700/50 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive ? 'bg-[#8b5cf6] text-white' : 'bg-obsidian-700 text-gray-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-xs font-medium truncate">{vid.title}</span>
                    </div>

                    <button
                      onClick={(e) => handleToggleCompleted(e, vid.video_id)}
                      className="shrink-0 p-1 cursor-pointer"
                    >
                      <CheckCircle2 size={18} className={vid.completed ? 'text-emerald-400' : 'text-gray-600'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Curriculum Modules */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          {playlist.videos && playlist.videos.length > 0 ? (
            playlist.videos.map((video, index) => (
              <motion.div 
                key={video.video_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setActiveVideoIndex(index);
                  setActiveTab('player');
                }}
                className="tactile-card p-5 flex items-center gap-6 cursor-pointer group hover:border-[#8b5cf6]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-obsidian-700 flex items-center justify-center text-gray-400 group-hover:text-[#8b5cf6] transition-colors shrink-0">
                  <PlayCircle size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-lg truncate mb-1 group-hover:text-[#0ea5e9] transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Module {index + 1} • {video.duration || '12:00'}
                  </p>
                </div>
                
                <button 
                  onClick={(e) => handleToggleCompleted(e, video.video_id)}
                  className={`p-2 transition-colors cursor-pointer ${
                    video.completed ? 'text-emerald-400' : 'text-obsidian-600 hover:text-gray-400'
                  }`}
                >
                  <CheckCircle2 size={24} />
                </button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 focus-container">
              <p className="text-gray-400">No modules found in this course.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Built-in Scratchpad / Notes */}
      {activeTab === 'notes' && (
        <div className="focus-container p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-obsidian-700/80 pb-4">
            <div className="flex items-center gap-2 text-white font-medium">
              <FileText size={20} className="text-[#0ea5e9]" />
              <h3>Course Scratchpad & Lesson Notes</h3>
            </div>
            <button
              onClick={handleSaveNote}
              disabled={noteSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#0ea5e9] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            >
              {noteSaved ? <Check size={14} className="text-emerald-300" /> : <Save size={14} />}
              <span>{noteSaved ? 'Saved!' : noteSaving ? 'Saving...' : 'Save Notes'}</span>
            </button>
          </div>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Jot down key takeaways, code patterns, and personal thoughts... Click Save Notes to persist."
            className="w-full h-96 bg-obsidian-900 border border-obsidian-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-[#0ea5e9] font-mono text-sm leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
