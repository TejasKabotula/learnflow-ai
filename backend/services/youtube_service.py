import os
import re
import urllib.request
import urllib.parse
import urllib.error
import json
import logging
from typing import Dict, Any, List, Optional
from core.config import settings
from services.transcript_service import extract_video_id, fetch_video_metadata

logger = logging.getLogger("learnflow.youtube")

def extract_playlist_id(url: str) -> Optional[str]:
    """Extract YouTube playlist ID from various URL formats and handle query parameters."""
    if not url:
        return None
    url = url.strip()
    # Check if raw playlist ID was provided directly (e.g. PL... or similar standard formats)
    if re.match(r'^[a-zA-Z0-9_-]{12,}$', url) and not re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url

    # Extract using query parameter matching
    match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    return None

class YouTubeService:
    @staticmethod
    def _fetch_json(url: str) -> Dict[str, Any]:
        """Helper to fetch and parse JSON with sanitized error handling."""
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            err_msg = f"HTTP Error {e.code}"
            try:
                err_json = json.loads(e.read().decode('utf-8'))
                if "error" in err_json and "message" in err_json["error"]:
                    err_msg = err_json["error"]["message"]
            except Exception:
                pass

            if e.code == 400:
                raise ValueError(f"YouTube API error: {err_msg}")
            elif e.code == 403:
                raise ValueError(f"YouTube API access denied or quota exceeded: {err_msg}")
            elif e.code == 404:
                raise ValueError("YouTube playlist not found or is private.")
            else:
                raise ValueError(f"YouTube API returned error: {err_msg}")
        except urllib.error.URLError as e:
            raise ValueError(f"Network error while contacting YouTube API: {e.reason}")
        except Exception as e:
            raise ValueError(f"Failed to communicate with YouTube API: {str(e)}")

    @staticmethod
    def parse_youtube_resource(url_or_id: str) -> Dict[str, Any]:
        """
        Extracts metadata for a YouTube video or playlist URL.
        Returns a formatted structure suitable for creating a course/playlist.
        """
        api_key = settings.YOUTUBE_API_KEY or os.environ.get("YOUTUBE_API_KEY", "")
        playlist_id = extract_playlist_id(url_or_id)
        clean_id = extract_video_id(url_or_id)

        # 1. Process as Playlist if a playlist ID is present
        if playlist_id:
            if not api_key:
                raise ValueError(
                    "YouTube API Key is required to import playlists. "
                    "Please configure YOUTUBE_API_KEY in the backend environment."
                )

            logger.info("Parsing YouTube playlist ID: %s", playlist_id)

            # 1a. Fetch Playlist Metadata
            meta_params = urllib.parse.urlencode({
                "part": "snippet",
                "id": playlist_id,
                "key": api_key
            })
            meta_url = f"https://www.googleapis.com/youtube/v3/playlists?{meta_params}"
            meta_data = YouTubeService._fetch_json(meta_url)

            items = meta_data.get("items", [])
            if not items:
                raise ValueError(f"Playlist with ID '{playlist_id}' was not found or is private.")

            snippet = items[0]["snippet"]
            title = snippet.get("title", "Imported Playlist")
            description = snippet.get("description", "Imported YouTube Playlist")
            thumb = snippet.get("thumbnails", {}).get("high", {}).get("url", "")
            if not thumb:
                thumb = snippet.get("thumbnails", {}).get("default", {}).get("url", "")

            # 1b. Fetch Playlist Items with Pagination
            videos: List[Dict[str, Any]] = []
            page_token = None
            max_pages = 10  # Up to 500 videos safety boundary

            while True:
                items_params_dict = {
                    "part": "snippet,contentDetails",
                    "maxResults": "50",
                    "playlistId": playlist_id,
                    "key": api_key
                }
                if page_token:
                    items_params_dict["pageToken"] = page_token

                items_url = f"https://www.googleapis.com/youtube/v3/playlistItems?{urllib.parse.urlencode(items_params_dict)}"
                items_data = YouTubeService._fetch_json(items_url)

                for item in items_data.get("items", []):
                    item_snippet = item.get("snippet", {})
                    v_title = item_snippet.get("title", "")
                    if v_title in ["Private video", "Deleted video"]:
                        continue

                    resource_id = item_snippet.get("resourceId", {})
                    v_id = resource_id.get("videoId")
                    if not v_id:
                        continue

                    v_thumb = item_snippet.get("thumbnails", {}).get("high", {}).get("url", "")
                    if not v_thumb:
                        v_thumb = item_snippet.get("thumbnails", {}).get("default", {}).get("url", f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg")

                    videos.append({
                        "video_id": v_id,
                        "title": v_title,
                        "thumbnail_url": v_thumb,
                        "duration": "00:00",
                        "completed": False
                    })

                page_token = items_data.get("nextPageToken")
                max_pages -= 1
                if not page_token or max_pages <= 0:
                    break

            if not videos:
                raise ValueError("The requested playlist contains no accessible videos.")

            return {
                "title": title,
                "description": description,
                "youtube_url": f"https://www.youtube.com/playlist?list={playlist_id}",
                "thumbnail_url": thumb,
                "videos": videos
            }

        # 2. Process as Single Video if video ID is present and not a playlist
        if clean_id:
            logger.info("Parsing single YouTube video ID: %s", clean_id)
            meta = fetch_video_metadata(clean_id)
            return {
                "title": meta["title"],
                "description": f"Video by {meta['author_name']}",
                "youtube_url": f"https://www.youtube.com/watch?v={clean_id}",
                "thumbnail_url": meta["thumbnail_url"],
                "videos": [
                    {
                        "video_id": clean_id,
                        "title": meta["title"],
                        "thumbnail_url": meta["thumbnail_url"],
                        "duration": "00:00",
                        "completed": False
                    }
                ]
            }

        raise ValueError("Invalid YouTube URL or ID provided. Please enter a valid YouTube video or playlist link.")

