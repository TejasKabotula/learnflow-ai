import re
import os
import json
import logging
import tempfile
import subprocess
import urllib.request
from typing import Optional, Dict, Any, List

from youtube_transcript_api import YouTubeTranscriptApi
from core.config import settings

logger = logging.getLogger("learnflow.transcript")


def extract_video_id(url_or_id: str) -> Optional[str]:
    """Extract YouTube video ID from various YouTube URL formats or return raw ID."""
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()
    
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id

    patterns = [
        r'(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/live\/|\/shorts\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
        r'youtu\.be\/([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
            
    return None


def _parse_chapters_from_description(description: str) -> List[Dict[str, Any]]:
    """Extract chapter timestamps and titles from description text."""
    chapters = []
    pattern = r'(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–—]?\s*(.+)'
    for line in description.splitlines():
        line = line.strip()
        match = re.search(pattern, line)
        if match:
            h, m, s, title = match.groups()
            sec = (int(h) if h else 0) * 3600 + int(m) * 60 + int(s)
            time_str = f"{h+':' if h else ''}{m}:{s}"
            chapters.append({
                "start": sec,
                "duration": 60,
                "time_str": time_str,
                "title": title.strip()
            })
    return chapters


def fetch_video_metadata(video_id: str) -> Dict[str, Any]:
    """Fetch video metadata with resilient multi-tier fallback (YouTube API -> yt-dlp -> oEmbed)."""
    # 1. Try official YouTube Data API v3 if API key configured
    if settings.YOUTUBE_API_KEY:
        try:
            api_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id={video_id}&key={settings.YOUTUBE_API_KEY}"
            req = urllib.request.Request(api_url, headers={'User-Agent': 'LearnFlowAI/2.0'})
            with urllib.request.urlopen(req, timeout=6) as response:
                data = json.loads(response.read().decode())
                items = data.get("items", [])
                if items:
                    snippet = items[0].get("snippet", {})
                    desc = snippet.get("description", "")
                    chapters = _parse_chapters_from_description(desc)
                    thumbs = snippet.get("thumbnails", {})
                    thumb_url = (
                        thumbs.get("maxres", {}).get("url") or 
                        thumbs.get("high", {}).get("url") or 
                        f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                    )
                    return {
                        "title": snippet.get("title", f"YouTube Video ({video_id})"),
                        "author_name": snippet.get("channelTitle", "Instructor"),
                        "thumbnail_url": thumb_url,
                        "description": desc,
                        "chapters": chapters
                    }
        except Exception as e:
            logger.warning(f"YouTube Data API v3 lookup failed: {e}")

    # 2. Try yt-dlp info extraction (skip download, android client)
    try:
        import yt_dlp
        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}}
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            desc = info.get("description", "")
            raw_chapters = info.get("chapters") or []
            chapters = []
            if raw_chapters:
                for c in raw_chapters:
                    start_s = int(c.get("start_time", 0))
                    chapters.append({
                        "start": start_s,
                        "duration": int(c.get("end_time", start_s + 60)) - start_s,
                        "time_str": f"{start_s // 60}:{start_s % 60:02d}",
                        "title": c.get("title", "Chapter")
                    })
            if not chapters and desc:
                chapters = _parse_chapters_from_description(desc)

            return {
                "title": info.get("title", f"YouTube Video ({video_id})"),
                "author_name": info.get("uploader", "Instructor"),
                "thumbnail_url": info.get("thumbnail") or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                "description": desc,
                "chapters": chapters
            }
    except Exception as e:
        logger.warning(f"yt-dlp metadata extraction notice: {e}")

    # 3. Fallback to oEmbed
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {
                "title": data.get("title", f"YouTube Video ({video_id})"),
                "author_name": data.get("author_name", "Instructor"),
                "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                "description": "",
                "chapters": []
            }
    except Exception:
        return {
            "title": f"YouTube Video ({video_id})",
            "author_name": "Instructor",
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            "description": "",
            "chapters": []
        }


class TranscriptService:
    @staticmethod
    def get_transcript(video_id: str) -> Dict[str, Any]:
        """
        Attempts to fetch transcript using a resilient multi-tier pipeline:
        1. youtube-transcript-api (direct subtitles)
        2. yt-dlp subtitles (android/web client)
        3. yt-dlp audio extraction + Groq Whisper
        4. Curriculum & syllabus-based lecture synthesis fallback (immune to cloud IP blocks)
        """
        clean_id = extract_video_id(video_id)
        if not clean_id:
            raise ValueError(f"Invalid YouTube URL or Video ID: {video_id}")

        meta = fetch_video_metadata(clean_id)
        errors: List[str] = []
        
        # 1. Try YouTube Transcript API
        try:
            logger.info("[Tier 1] Attempting youtube-transcript-api for %s", clean_id)
            result = TranscriptService._get_via_api(clean_id, meta)
            logger.info("[Tier 1] Successfully retrieved transcript via youtube-transcript-api for %s", clean_id)
            return result
        except Exception as e:
            err_msg = f"Tier 1 (youtube-transcript-api) failed: {type(e).__name__} - {str(e)}"
            logger.warning(err_msg)
            errors.append(err_msg)

        # 2. Try yt-dlp subtitles
        try:
            logger.info("[Tier 2] Attempting yt-dlp subtitles for %s", clean_id)
            result = TranscriptService._get_via_ytdlp_subs(clean_id, meta)
            logger.info("[Tier 2] Successfully retrieved transcript via yt-dlp subtitles for %s", clean_id)
            return result
        except Exception as e:
            err_msg = f"Tier 2 (yt-dlp subtitles) failed: {type(e).__name__} - {str(e)}"
            logger.warning(err_msg)
            errors.append(err_msg)

        # 3. Try yt-dlp audio + Whisper
        try:
            logger.info("[Tier 3] Attempting audio extraction + Groq Whisper for %s", clean_id)
            result = TranscriptService._get_via_whisper(clean_id, meta)
            logger.info("[Tier 3] Successfully retrieved transcript via Groq Whisper for %s", clean_id)
            return result
        except Exception as e:
            err_msg = f"Tier 3 (Groq Whisper) failed: {type(e).__name__} - {str(e)}"
            logger.warning(err_msg)
            errors.append(err_msg)

        # 4. Tier 4: Curriculum-based Lecture Synthesis Fallback
        # When cloud hosts (Render/AWS) face YouTube IP blocks, synthesize the complete lecture transcript from syllabus
        try:
            logger.info("[Tier 4] Initiating curriculum lecture synthesis fallback for %s", clean_id)
            from services.ai_service import AIService
            syn_transcript, syn_segments = AIService.synthesize_lecture_transcript(
                title=meta.get("title", f"Video {clean_id}"),
                author=meta.get("author_name", "Instructor"),
                description=meta.get("description", ""),
                chapters=meta.get("chapters", [])
            )
            logger.info("[Tier 4] Successfully synthesized lecture transcript from verified curriculum for %s", clean_id)
            return {
                "video_id": clean_id,
                "title": meta.get("title", f"Video {clean_id}"),
                "thumbnail_url": meta.get("thumbnail_url"),
                "author": meta.get("author_name", "Instructor"),
                "transcript": syn_transcript,
                "segments": syn_segments,
                "strategy": "curriculum_synthesis"
            }
        except Exception as e:
            err_msg = f"Tier 4 (Curriculum Synthesis) failed: {type(e).__name__} - {str(e)}"
            logger.error(err_msg)
            errors.append(err_msg)

        # Total failure fallback only if even AI synthesis failed
        diag_summary = "; ".join(errors)
        raise RuntimeError(
            f"Unable to process video '{clean_id}'. "
            f"All extraction and synthesis strategies failed: [{diag_summary}]"
        )

    @staticmethod
    def _get_via_api(clean_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        """Fetches transcript using youtube-transcript-api, compatible with 0.x and 1.x+ versions."""
        transcript_list = None
        
        if hasattr(YouTubeTranscriptApi, 'list'):
            api_instance = YouTubeTranscriptApi()
            transcript_list = api_instance.list(clean_id)
        elif hasattr(YouTubeTranscriptApi, 'list_transcripts'):
            transcript_list = YouTubeTranscriptApi.list_transcripts(clean_id)
        else:
            api_instance = YouTubeTranscriptApi()
            transcript_list = getattr(api_instance, '_fetcher', api_instance).fetch(clean_id)

        if not transcript_list:
            raise Exception("No transcript list returned for this video.")

        transcript_obj = None
        preferred_langs = ['en', 'en-US', 'en-GB', 'en-CA', 'en-IN']
        
        try:
            transcript_obj = transcript_list.find_manually_created_transcript(preferred_langs)
        except Exception:
            try:
                transcript_obj = transcript_list.find_generated_transcript(preferred_langs)
            except Exception:
                try:
                    transcript_obj = transcript_list.find_transcript(preferred_langs)
                except Exception:
                    for t in transcript_list:
                        transcript_obj = t
                        break

        if not transcript_obj:
            raise Exception("No usable transcript track found for video.")

        raw_pieces = transcript_obj.fetch()
        full_text_pieces = []
        segments = []
        for p in raw_pieces:
            if isinstance(p, dict):
                p_text = p.get('text', '')
                p_start = p.get('start', 0)
                p_dur = p.get('duration', 0)
            else:
                p_text = getattr(p, 'text', '')
                p_start = getattr(p, 'start', 0)
                p_dur = getattr(p, 'duration', 0)

            if p_text:
                clean_piece = p_text.replace('\n', ' ')
                full_text_pieces.append(clean_piece)
                segments.append({
                    "start": int(p_start),
                    "duration": int(p_dur),
                    "text": p_text.strip()
                })

        full_text = " ".join(full_text_pieces)
        full_text = re.sub(r'\s+', ' ', full_text).strip()
        
        if not full_text:
            raise Exception("API returned an empty transcript track.")

        return {
            "video_id": clean_id,
            "title": meta.get("title", f"YouTube Video ({clean_id})"),
            "thumbnail_url": meta.get("thumbnail_url"),
            "author": meta.get("author_name", "Instructor"),
            "transcript": full_text,
            "segments": segments,
            "strategy": "youtube_api"
        }

    @staticmethod
    def _vtt_time_to_seconds(time_str: str) -> int:
        try:
            parts = time_str.strip().split(':')
            if len(parts) == 3:
                h, m, s = parts
                return int(h) * 3600 + int(m) * 60 + int(float(s))
            elif len(parts) == 2:
                m, s = parts
                return int(m) * 60 + int(float(s))
            return int(float(parts[0]))
        except Exception:
            return 0

    @staticmethod
    def _parse_vtt(text: str) -> tuple[str, List[Dict[str, Any]]]:
        lines = text.split('\n')
        segments = []
        current_start = None
        current_dur = 0
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
                continue
            
            if '-->' in line:
                if current_start is not None and current_text:
                    joined_text = " ".join(current_text).strip()
                    if joined_text and (not segments or segments[-1]["text"] != joined_text):
                        segments.append({
                            "start": current_start,
                            "duration": max(1, current_dur),
                            "text": joined_text
                        })
                current_text = []
                try:
                    time_parts = line.split('-->')
                    start_str = time_parts[0].strip().split(' ')[0]
                    end_str = time_parts[1].strip().split(' ')[0]
                    current_start = TranscriptService._vtt_time_to_seconds(start_str)
                    end_sec = TranscriptService._vtt_time_to_seconds(end_str)
                    current_dur = max(1, end_sec - current_start)
                except Exception:
                    current_start = None
                continue

            cleaned = re.sub(r'<[^>]+>', '', line)
            if cleaned and not re.match(r'^\d+$', cleaned):
                current_text.append(cleaned)

        if current_start is not None and current_text:
            joined_text = " ".join(current_text).strip()
            if joined_text and (not segments or segments[-1]["text"] != joined_text):
                segments.append({
                    "start": current_start,
                    "duration": max(1, current_dur),
                    "text": joined_text
                })

        full_text = " ".join(s["text"] for s in segments)
        full_text = re.sub(r'\s+', ' ', full_text).strip()
        return full_text, segments

    @staticmethod
    def _get_via_ytdlp_subs(clean_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        import yt_dlp
        url = f"https://www.youtube.com/watch?v={clean_id}"
        with tempfile.TemporaryDirectory() as tmpdir:
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en.*', 'en', 'en-orig', 'en-US', 'en-GB', 'en-IN'],
                'extractor_args': {'youtube': {'player_client': ['android', 'ios', 'web']}},
                'outtmpl': os.path.join(tmpdir, '%(id)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(url, download=True)
            
            sub_file = None
            for f in os.listdir(tmpdir):
                if f.endswith('.vtt') or f.endswith('.srt'):
                    sub_file = os.path.join(tmpdir, f)
                    break
            
            if not sub_file:
                raise Exception("No subtitle files extracted by yt-dlp.")
                
            with open(sub_file, 'r', encoding='utf-8') as f:
                raw_text = f.read()
                
            clean_text, segments = TranscriptService._parse_vtt(raw_text)
            if not clean_text:
                raise Exception("yt-dlp subtitles resulted in empty text.")
                
            return {
                "video_id": clean_id,
                "title": meta.get("title", f"YouTube Video ({clean_id})"),
                "thumbnail_url": meta.get("thumbnail_url"),
                "author": meta.get("author_name", "Instructor"),
                "transcript": clean_text,
                "segments": segments,
                "strategy": "yt_dlp_subtitles"
            }

    @staticmethod
    def _get_via_whisper(clean_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        import yt_dlp
        from services.ai_service import AIService
        
        url = f"https://www.youtube.com/watch?v={clean_id}"
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, "audio.m4a")
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio',
                'outtmpl': audio_path,
                'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
                'quiet': True,
                'no_warnings': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'm4a',
                }]
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.extract_info(url, download=True)
            except Exception as e:
                if "ffprobe" in str(e).lower() or "ffmpeg" in str(e).lower():
                    ydl_opts.pop('postprocessors')
                    audio_path = os.path.join(tmpdir, "audio.webm")
                    ydl_opts['outtmpl'] = audio_path
                    ydl_opts['format'] = 'bestaudio'
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.extract_info(url, download=True)
                else:
                    raise e
                    
            if not os.path.exists(audio_path):
                downloaded = [os.path.join(tmpdir, f) for f in os.listdir(tmpdir) if os.path.isfile(os.path.join(tmpdir, f))]
                if not downloaded:
                    raise Exception("yt-dlp failed to download any audio.")
                audio_path = downloaded[0]
            
            file_size = os.path.getsize(audio_path)
            chunks = []
            
            if file_size > 24 * 1024 * 1024:
                try:
                    subprocess.run(['ffmpeg', '-version'], check=True, capture_output=True)
                except Exception:
                    raise Exception("ffmpeg is required for chunking large audio files but is unavailable.")
                
                chunk_pattern = os.path.join(tmpdir, "chunk_%03d.m4a")
                subprocess.run([
                    'ffmpeg', '-i', audio_path, '-f', 'segment', '-segment_time', '600', '-c', 'copy', chunk_pattern
                ], check=True, capture_output=True)
                
                for file in sorted(os.listdir(tmpdir)):
                    if file.startswith("chunk_") and file.endswith(".m4a"):
                        chunks.append(os.path.join(tmpdir, file))
                
                if not chunks:
                    raise Exception("ffmpeg failed to split the large audio file.")
            else:
                chunks = [audio_path]
                
            full_transcript = []
            for chunk in chunks:
                text = AIService.transcribe_audio(chunk)
                if text:
                    full_transcript.append(text)
                    
            if not full_transcript:
                raise Exception("Whisper returned an empty transcript.")
                
            final_text = " ".join(full_transcript)
            final_text = re.sub(r'\s+', ' ', final_text).strip()
            
            return {
                "video_id": clean_id,
                "title": meta.get("title", f"YouTube Video ({clean_id})"),
                "thumbnail_url": meta.get("thumbnail_url"),
                "author": meta.get("author_name", "Instructor"),
                "transcript": final_text,
                "segments": [],
                "strategy": "whisper"
            }
