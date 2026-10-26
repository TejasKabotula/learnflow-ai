import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.error

from services.youtube_service import YouTubeService, extract_playlist_id
from services.transcript_service import TranscriptService, extract_video_id
from services.ai_service import AIService

class TestLearnFlowSuite(unittest.TestCase):
    """Automated unit and integration test suite with deterministic mocks."""

    # =========================================================================
    # Problem A: Playlist and URL Import Tests
    # =========================================================================

    def test_extract_playlist_id_standard(self):
        url = "https://www.youtube.com/playlist?list=PLillGF-RfqbYeckUaD1z6nviTp31GLTH8"
        self.assertEqual(extract_playlist_id(url), "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8")

    def test_extract_playlist_id_with_extra_query_params(self):
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLillGF-RfqbYeckUaD1z6nviTp31GLTH8&index=5&t=42s"
        self.assertEqual(extract_playlist_id(url), "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8")

    def test_extract_playlist_id_raw_string(self):
        self.assertEqual(extract_playlist_id("PLillGF-RfqbYeckUaD1z6nviTp31GLTH8"), "PLillGF-RfqbYeckUaD1z6nviTp31GLTH8")

    def test_extract_video_id_variations(self):
        self.assertEqual(extract_video_id("dQw4w9WgXcQ"), "dQw4w9WgXcQ")
        self.assertEqual(extract_video_id("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ")
        self.assertEqual(extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share"), "dQw4w9WgXcQ")
        self.assertEqual(extract_video_id("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ")

    def test_parse_invalid_url_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            YouTubeService.parse_youtube_resource("https://invalid-website.com/not-youtube")
        self.assertIn("Invalid YouTube URL", str(ctx.exception))

    @patch("services.youtube_service.settings")
    def test_playlist_import_missing_api_key(self, mock_settings):
        mock_settings.YOUTUBE_API_KEY = ""
        with patch.dict("os.environ", {"YOUTUBE_API_KEY": ""}):
            with self.assertRaises(ValueError) as ctx:
                YouTubeService.parse_youtube_resource("https://www.youtube.com/playlist?list=PL123456789012")
            self.assertIn("YouTube API Key is required", str(ctx.exception))

    @patch("services.youtube_service.YouTubeService._fetch_json")
    @patch("services.youtube_service.settings")
    def test_playlist_import_success_with_pagination(self, mock_settings, mock_fetch):
        mock_settings.YOUTUBE_API_KEY = "test_key"
        
        # Page 1: metadata, Page 2: first 2 items with next page, Page 3: 1 item, no next page
        def side_effect(url):
            if "playlists?" in url:
                return {
                    "items": [{
                        "snippet": {
                            "title": "Complete Python Masterclass",
                            "description": "Learn python from scratch",
                            "thumbnails": {"high": {"url": "https://img.youtube.com/pl_thumb.jpg"}}
                        }
                    }]
                }
            elif "playlistItems?" in url and "pageToken" not in url:
                return {
                    "nextPageToken": "page2_token",
                    "items": [
                        {
                            "snippet": {
                                "title": "Lesson 1: Intro",
                                "resourceId": {"videoId": "vid001"},
                                "thumbnails": {"high": {"url": "https://img.youtube.com/vid001.jpg"}}
                            }
                        },
                        {
                            "snippet": {
                                "title": "Lesson 2: Variables",
                                "resourceId": {"videoId": "vid002"},
                                "thumbnails": {"high": {"url": "https://img.youtube.com/vid002.jpg"}}
                            }
                        }
                    ]
                }
            elif "pageToken=page2_token" in url:
                return {
                    "items": [
                        {
                            "snippet": {
                                "title": "Lesson 3: Functions",
                                "resourceId": {"videoId": "vid003"},
                                "thumbnails": {"high": {"url": "https://img.youtube.com/vid003.jpg"}}
                            }
                        }
                    ]
                }
            return {}

        mock_fetch.side_effect = side_effect

        result = YouTubeService.parse_youtube_resource("https://www.youtube.com/playlist?list=PL123456789012")
        self.assertEqual(result["title"], "Complete Python Masterclass")
        self.assertEqual(len(result["videos"]), 3)
        self.assertEqual(result["videos"][0]["video_id"], "vid001")
        self.assertEqual(result["videos"][2]["video_id"], "vid003")

    @patch("services.youtube_service.YouTubeService._fetch_json")
    @patch("services.youtube_service.settings")
    def test_playlist_empty_or_private_raises(self, mock_settings, mock_fetch):
        mock_settings.YOUTUBE_API_KEY = "test_key"
        mock_fetch.return_value = {"items": []}
        with self.assertRaises(ValueError) as ctx:
            YouTubeService.parse_youtube_resource("https://www.youtube.com/playlist?list=PL_EMPTY_123456")
        self.assertIn("was not found or is private", str(ctx.exception))

    @patch("services.youtube_service.fetch_video_metadata")
    def test_single_video_import_fallback(self, mock_meta):
        mock_meta.return_value = {
            "title": "Learn React in 30 Minutes",
            "author_name": "Tech Academy",
            "thumbnail_url": "https://img.youtube.com/react.jpg"
        }
        res = YouTubeService.parse_youtube_resource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        self.assertEqual(res["title"], "Learn React in 30 Minutes")
        self.assertEqual(len(res["videos"]), 1)
        self.assertEqual(res["videos"][0]["video_id"], "dQw4w9WgXcQ")


    # =========================================================================
    # Problem B: Transcript and Summarization Tests
    # =========================================================================

    @patch("services.transcript_service.YouTubeTranscriptApi")
    def test_transcript_tier1_success(self, mock_ytt_class):
        # Mock instance
        mock_instance = MagicMock()
        mock_transcript = MagicMock()
        mock_item = MagicMock()
        mock_item.text = "Hello world from subtitles"
        mock_item.start = 0
        mock_item.duration = 5
        mock_transcript.fetch.return_value = [mock_item]
        
        mock_tl = MagicMock()
        mock_tl.find_manually_created_transcript.return_value = mock_transcript
        mock_instance.list.return_value = mock_tl
        mock_ytt_class.return_value = mock_instance

        with patch("services.transcript_service.fetch_video_metadata") as mock_meta:
            mock_meta.return_value = {"title": "Test Vid", "author_name": "Tester", "thumbnail_url": "thumb"}
            res = TranscriptService.get_transcript("dQw4w9WgXcQ")
            self.assertEqual(res["strategy"], "youtube_api")
            self.assertEqual(res["transcript"], "Hello world from subtitles")

    @patch("services.transcript_service.TranscriptService._get_via_api")
    @patch("services.transcript_service.TranscriptService._get_via_ytdlp_subs")
    def test_transcript_tier2_fallback_when_tier1_fails(self, mock_ytdlp_subs, mock_api):
        mock_api.side_effect = Exception("Transcript disabled by YouTube")
        mock_ytdlp_subs.return_value = {
            "video_id": "test_id_123",
            "title": "Sub Test",
            "thumbnail_url": "thumb",
            "author": "Author",
            "transcript": "Subtitles recovered via yt-dlp",
            "segments": [],
            "strategy": "yt_dlp_subtitles"
        }
        with patch("services.transcript_service.fetch_video_metadata") as mock_meta:
            mock_meta.return_value = {"title": "Sub Test", "author_name": "Author", "thumbnail_url": "thumb"}
            res = TranscriptService.get_transcript("test_id_123")
            self.assertEqual(res["strategy"], "yt_dlp_subtitles")
            self.assertEqual(res["transcript"], "Subtitles recovered via yt-dlp")

    @patch("services.transcript_service.TranscriptService._get_via_api")
    @patch("services.transcript_service.TranscriptService._get_via_ytdlp_subs")
    @patch("services.transcript_service.TranscriptService._get_via_whisper")
    def test_transcript_tier3_whisper_fallback(self, mock_whisper, mock_ytdlp_subs, mock_api):
        mock_api.side_effect = Exception("No captions found")
        mock_ytdlp_subs.side_effect = Exception("No yt-dlp subtitles available")
        mock_whisper.return_value = {
            "video_id": "test_id_123",
            "title": "Audio Vid",
            "thumbnail_url": "thumb",
            "author": "Speaker",
            "transcript": "Audio transcribed successfully via Whisper",
            "segments": [],
            "strategy": "whisper"
        }
        with patch("services.transcript_service.fetch_video_metadata") as mock_meta:
            mock_meta.return_value = {"title": "Audio Vid", "author_name": "Speaker", "thumbnail_url": "thumb"}
            res = TranscriptService.get_transcript("test_id_123")
            self.assertEqual(res["strategy"], "whisper")
            self.assertEqual(res["transcript"], "Audio transcribed successfully via Whisper")

    @patch("services.transcript_service.TranscriptService._get_via_api")
    @patch("services.transcript_service.TranscriptService._get_via_ytdlp_subs")
    @patch("services.transcript_service.TranscriptService._get_via_whisper")
    def test_all_tiers_fail_raises_runtime_error(self, mock_whisper, mock_ytdlp_subs, mock_api):
        mock_api.side_effect = Exception("API error")
        mock_ytdlp_subs.side_effect = Exception("Subs error")
        mock_whisper.side_effect = Exception("Whisper error")

        with patch("services.transcript_service.fetch_video_metadata") as mock_meta:
            mock_meta.return_value = {"title": "Title", "author_name": "Author", "thumbnail_url": "thumb"}
            with self.assertRaises(RuntimeError) as ctx:
                TranscriptService.get_transcript("failedvid11")
            self.assertIn("All extraction strategies failed", str(ctx.exception))


    def test_clean_vtt_formatting(self):
        sample_vtt = """WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000
<c>Hello</c> and welcome to this lesson.

00:00:02.000 --> 00:00:04.000
<c>Hello</c> and welcome to this lesson.

00:00:04.000 --> 00:00:06.000
Today we will cover databases.
"""
        cleaned = TranscriptService._clean_vtt(sample_vtt)
        self.assertEqual(cleaned, "Hello and welcome to this lesson. Today we will cover databases.")

    @patch("services.ai_service.AIService._call_groq")
    def test_generate_summary_and_quiz_groq_and_fallback(self, mock_call):
        # 1. Test fallback when Groq returns None
        mock_call.return_value = None
        summary = AIService.generate_summary("Some transcript text", "Intro to Web")
        self.assertIn("# 📌 Overview & Core Focus", summary)
        self.assertIn("Intro to Web", summary)

        quiz = AIService.generate_quiz("Some transcript text", "Intro to Web")
        self.assertEqual(len(quiz), 4)
        self.assertEqual(quiz[0]["answer"], "A")

        # 2. Test successful Groq JSON parsing for quiz
        mock_call.return_value = json.dumps([
            {
                "id": 1,
                "question": "What is Python?",
                "options": ["A) Language", "B) Snake", "C) Car", "D) City"],
                "answer": "A",
                "explanation": "Python is a programming language."
            }
        ])
        groq_quiz = AIService.generate_quiz("Some transcript", "Python Video")
        self.assertEqual(len(groq_quiz), 1)
        self.assertEqual(groq_quiz[0]["question"], "What is Python?")

if __name__ == "__main__":
    unittest.main()
