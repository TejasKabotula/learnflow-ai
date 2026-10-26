import os
import sys

# Add backend directory to path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.transcript_service import TranscriptService

def test_extraction():
    # Video 1: Normal video with transcripts
    vid1 = "dQw4w9WgXcQ"
    print(f"Testing video with API: {vid1}")
    try:
        res1 = TranscriptService.get_transcript(vid1)
        print("Success!", res1["strategy"])
    except Exception as e:
        print("Failed!", e)
        
    print("\nTesting Strategy 2: yt-dlp subtitles directly")
    try:
        res2 = TranscriptService._get_via_ytdlp_subs(vid1, {"title": "Test", "author_name": "Test", "thumbnail_url": "Test"})
        print("Strategy 2 Success!")
        print("Extracted Length:", len(res2["transcript"]))
    except Exception as e:
        print("Strategy 2 Failed:", e)

    print("\nTesting Strategy 3: yt-dlp Whisper fallback directly")
    try:
        # Short 2 sec video: "jNQXAC9IVRw" (Me at the zoo)
        res3 = TranscriptService._get_via_whisper("jNQXAC9IVRw", {"title": "Test", "author_name": "Test", "thumbnail_url": "Test"})
        print("Strategy 3 Success!")
        print("Extracted Whisper Text:", res3["transcript"])
    except Exception as e:
        print("Strategy 3 Failed:", e)

if __name__ == "__main__":
    test_extraction()
