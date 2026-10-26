import re
import os
import json
import logging
import tempfile
import subprocess
import urllib.request
from typing import Optional, Dict, Any, List

from youtube_transcript_api import YouTubeTranscriptApi


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

def fetch_video_metadata(video_id: str) -> Dict[str, Any]:
    """Fetch video title and basic info using oEmbed without requiring YouTube Data API key."""
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {
                "title": data.get("title", f"YouTube Video ({video_id})"),
                "author_name": data.get("author_name", "YouTube Creator"),
                "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            }
    except Exception:
        return {
            "title": f"YouTube Video ({video_id})",
            "author_name": "Instructor",
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        }

logger = logging.getLogger("learnflow.transcript")

class TranscriptService:
    @staticmethod
    def get_transcript(video_id: str) -> Dict[str, Any]:
        """
        Attempts to fetch transcript using a rigid fallback pipeline:
        1. youtube-transcript-api (direct subtitles)
        2. yt-dlp subtitles
        3. yt-dlp audio extraction + Groq Whisper
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
            
        # 4. Total Failure with diagnostic detail
        diag_summary = "; ".join(errors)
        raise RuntimeError(
            f"Unable to obtain a transcript for video '{clean_id}'. "
            f"All extraction strategies failed: [{diag_summary}]"
        )

    @staticmethod
    def _get_via_api(clean_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        """Fetches transcript using youtube-transcript-api, compatible with 0.x and 1.x+ versions."""
        transcript_list = None
        
        # Check if YouTubeTranscriptApi has instance or class method
        if hasattr(YouTubeTranscriptApi, 'list'):
            # v1.x+ instance API
            api_instance = YouTubeTranscriptApi()
            transcript_list = api_instance.list(clean_id)
        elif hasattr(YouTubeTranscriptApi, 'list_transcripts'):
            # v0.x static method API
            transcript_list = YouTubeTranscriptApi.list_transcripts(clean_id)
        else:
            api_instance = YouTubeTranscriptApi()
            transcript_list = getattr(api_instance, '_fetcher', api_instance).fetch(clean_id)

        if not transcript_list:
            raise Exception("No transcript list returned for this video.")

        transcript_obj = None
        # Preferred English codes
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
                    # Pick first available transcript
                    for t in transcript_list:
                        transcript_obj = t
                        break

        if not transcript_obj:
            raise Exception("No usable transcript track found for video.")

        raw_pieces = transcript_obj.fetch()
        
        # Handle FetchedTranscript dataclass or list of dicts
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
                if len(segments) < 100:
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
    def _clean_vtt(text: str) -> str:
        lines = text.split('\n')
        clean_lines = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:') or '-->' in line:
                continue
            # Remove HTML-like tags e.g. <c>
            line = re.sub(r'<[^>]+>', '', line)
            # Remove positioning e.g. align:start
            if ':' in line and not bool(re.search(r'[a-zA-Z]', line)): 
                continue
            # Skip pure numbers (sequence numbers)
            if re.match(r'^\d+$', line):
                continue
            clean_lines.append(line)
        
        # Deduplicate sequential lines (common in auto-generated youtube VTT)
        dedup_lines = []
        for line in clean_lines:
            if not dedup_lines or dedup_lines[-1] != line:
                dedup_lines.append(line)
                
        final_text = " ".join(dedup_lines)
        return re.sub(r'\s+', ' ', final_text).strip()

    @staticmethod
    def _get_via_ytdlp_subs(clean_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        import yt_dlp
        url = f"https://www.youtube.com/watch?v={clean_id}"
        with tempfile.TemporaryDirectory() as tmpdir:
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en', 'en-orig', 'en-US', 'en-GB', 'en-IN', 'en-CA', 'en-AU'],
                'extractor_args': {'youtube': {'player_client': ['android', 'ios']}},
                'outtmpl': os.path.join(tmpdir, '%(id)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(url, download=True)
            
            # Find the subtitle file
            sub_file = None
            for f in os.listdir(tmpdir):
                if f.endswith('.vtt') or f.endswith('.srt'):
                    sub_file = os.path.join(tmpdir, f)
                    break
            
            if not sub_file:
                raise Exception("No subtitle files extracted by yt-dlp.")
                
            with open(sub_file, 'r', encoding='utf-8') as f:
                raw_text = f.read()
                
            clean_text = TranscriptService._clean_vtt(raw_text)
            if not clean_text:
                raise Exception("yt-dlp subtitles resulted in empty text.")
                
            return {
                "video_id": clean_id,
                "title": meta["title"],
                "thumbnail_url": meta["thumbnail_url"],
                "author": meta["author_name"],
                "transcript": clean_text,
                "segments": [],
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
                # If FFmpeg is missing, it might fail the postprocessor. We will try without it.
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
                # Search for any downloaded file
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
                    # ffmpeg failed to chunk, fallback to original if small enough, but it isn't
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
                "title": meta["title"],
                "thumbnail_url": meta["thumbnail_url"],
                "author": meta["author_name"],
                "transcript": final_text,
                "segments": [],
                "strategy": "whisper"
            }
