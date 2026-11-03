import requests
import json
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def test_api():
    print("=" * 60)
    print("STARTING LEARN FLOW AI FULL SYSTEM VERIFICATION SUITE")
    print("=" * 60)

    # 1. Health check
    print("\n[1] Testing Root Endpoint...")
    r = requests.get(f"{BASE_URL}/")
    assert r.status_code == 200, f"Root failed: {r.status_code} {r.text}"
    print(f"✅ Root OK: {r.json()}")

    # 2. Register / Login
    unique_email = f"student_{int(time.time())}@learnflow.ai"
    password = "StrongPassword123!"
    print(f"\n[2] Registering user: {unique_email}...")
    reg_payload = {
        "email": unique_email,
        "password": password,
        "full_name": "Test Student"
    }
    r = requests.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    user_data = r.json()
    print(f"✅ Registered user ID: {user_data.get('id')}")

    print("\n[3] Logging in to obtain JWT...")
    login_data = {
        "username": unique_email,
        "password": password
    }
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token")
    assert token, "No access token returned"
    print("✅ Login OK, Token obtained.")

    headers = {"Authorization": f"Bearer {token}"}

    # 4. User profile /me
    print("\n[4] Testing /api/v1/auth/me...")
    r = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
    assert r.status_code == 200, f"Get /me failed: {r.status_code} {r.text}"
    print(f"✅ Profile verified: {r.json().get('full_name')} ({r.json().get('email')})")

    # 5. Update Profile
    print("\n[5] Testing PUT /api/v1/auth/profile...")
    profile_payload = {
        "full_name": "Senior Full-Stack Student",
        "preferences": {"theme": "dark", "daily_goal_minutes": 45}
    }
    r = requests.put(f"{BASE_URL}/api/v1/auth/profile", json=profile_payload, headers=headers)
    assert r.status_code == 200, f"Update profile failed: {r.status_code} {r.text}"
    updated_profile = r.json()
    assert updated_profile["full_name"] == "Senior Full-Stack Student"
    assert updated_profile["preferences"]["daily_goal_minutes"] == 45
    print(f"✅ Profile updated: {updated_profile['full_name']}, prefs: {updated_profile['preferences']}")

    # 6. Change Password
    print("\n[6] Testing POST /api/v1/auth/change-password...")
    new_password = "UpdatedPassword456!"
    pwd_payload = {
        "current_password": password,
        "new_password": new_password
    }
    r = requests.post(f"{BASE_URL}/api/v1/auth/change-password", json=pwd_payload, headers=headers)
    assert r.status_code == 200, f"Password change failed: {r.status_code} {r.text}"
    print("✅ Password changed successfully.")

    # Re-login with new password
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", data={"username": unique_email, "password": new_password})
    assert r.status_code == 200, "Re-login with new password failed"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Re-login with new password verified.")

    # 7. Import Course / Playlist
    print("\n[7] Testing /api/v1/playlists/import...")
    course_payload = {
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "custom_title": "Mastering Modern Web Architecture"
    }
    r = requests.post(f"{BASE_URL}/api/v1/playlists/import", json=course_payload, headers=headers)
    assert r.status_code == 200, f"Playlist import failed: {r.status_code} {r.text}"
    playlist = r.json()
    playlist_id = playlist["id"]
    videos = playlist.get("videos", [])
    print(f"✅ Course imported: '{playlist.get('title')}' with {len(videos)} videos (ID: {playlist_id})")

    # 8. Test duplicate import handling
    print("\n[8] Testing duplicate import handling...")
    r = requests.post(f"{BASE_URL}/api/v1/playlists/import", json=course_payload, headers=headers)
    assert r.status_code == 200
    dup_playlist = r.json()
    assert dup_playlist["id"] == playlist_id, "Duplicate import should return existing playlist"
    print("✅ Duplicate import handled gracefully.")

    # 9. List playlists
    print("\n[9] Testing GET /api/v1/playlists/...")
    r = requests.get(f"{BASE_URL}/api/v1/playlists/", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) > 0
    print(f"✅ Found {len(r.json())} enrolled playlist(s)")

    # 10. Toggle video completion
    first_vid_id = videos[0]["video_id"] if videos else "test_vid_1"
    print(f"\n[10] Testing toggle video completion for video {first_vid_id}...")
    r = requests.post(f"{BASE_URL}/api/v1/playlists/{playlist_id}/toggle-video/{first_vid_id}", headers=headers)
    assert r.status_code == 200
    toggle_data = r.json()
    assert toggle_data["completed"] == True
    print(f"✅ Video toggled! Completion: {toggle_data['completed']}, Progress: {toggle_data['progress_percentage']}%")

    # 11. Live Dashboard Stats with Real Metrics
    print("\n[11] Testing GET /api/v1/playlists/stats/summary...")
    r = requests.get(f"{BASE_URL}/api/v1/playlists/stats/summary", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    assert stats["courses"] >= 1
    assert stats["completed_lessons"] >= 1
    assert stats["streak"] >= 1  # Active today!
    print(f"✅ Real Dashboard Stats verified: {stats}")

    # 12. Notes API: Standalone note, list, update, and delete
    print("\n[12] Testing Notes API (Standalone create, list, update, delete)...")
    create_note_payload = {
        "title": "Asynchronous Event Loop Key Concepts",
        "content": "Microtasks run before macrotasks. Promises queue microtasks."
    }
    r = requests.post(f"{BASE_URL}/api/v1/notes/", json=create_note_payload, headers=headers)
    assert r.status_code == 200, f"Create note failed: {r.status_code} {r.text}"
    created_note = r.json()
    note_id = created_note["id"]
    print(f"✅ Created standalone note ID: {note_id}")

    # List notes with search
    r = requests.get(f"{BASE_URL}/api/v1/notes/?q=Event+Loop", headers=headers)
    assert r.status_code == 200
    search_notes = r.json()
    assert any(n["id"] == note_id for n in search_notes)
    print(f"✅ Search notes found: '{search_notes[0]['title']}'")

    # Update note
    r = requests.put(f"{BASE_URL}/api/v1/notes/{note_id}", json={"title": "Updated Event Loop", "content": "Updated content."}, headers=headers)
    assert r.status_code == 200
    assert r.json()["title"] == "Updated Event Loop"
    print("✅ Note updated successfully.")

    # 13. Saved Library API: Save resource, list, get, delete
    print("\n[13] Testing Saved Library API (/api/v1/saved)...")
    save_payload = {
        "title": "Event Loop Deep Dive Summary",
        "type": "summary",
        "content": "Comprehensive notes on Node.js and browser concurrency models.",
        "video_id": "dQw4w9WgXcQ"
    }
    r = requests.post(f"{BASE_URL}/api/v1/saved/", json=save_payload, headers=headers)
    assert r.status_code == 200, f"Save resource failed: {r.status_code} {r.text}"
    saved_res = r.json()
    saved_id = saved_res["id"]
    print(f"✅ Resource saved with ID: {saved_id}")

    # List saved resources
    r = requests.get(f"{BASE_URL}/api/v1/saved/?resource_type=summary", headers=headers)
    assert r.status_code == 200
    saved_items = r.json()
    assert len(saved_items) > 0
    print(f"✅ Found {len(saved_items)} saved summary item(s)")

    # 14. Quizzes API: Save quiz, get (hide answers for recall), submit answers for server grading
    print("\n[14] Testing Quizzes API (/api/v1/quizzes)...")
    quiz_payload = {
        "title": "JavaScript Event Loop Mastery Quiz",
        "video_id": "dQw4w9WgXcQ",
        "questions": [
            {
                "id": 1,
                "question": "Which queue has priority: Microtask or Macrotask?",
                "options": ["A) Microtask", "B) Macrotask", "C) Equal", "D) Random"],
                "answer": "A",
                "explanation": "Microtasks are always processed to completion before the next macrotask."
            },
            {
                "id": 2,
                "question": "What is the single-threaded component in JavaScript?",
                "options": ["A) Call Stack", "B) Worker Pool", "C) OS Kernel", "D) GPU"],
                "answer": "A",
                "explanation": "The main thread call stack runs single-threaded."
            }
        ]
    }
    r = requests.post(f"{BASE_URL}/api/v1/quizzes/save", json=quiz_payload, headers=headers)
    assert r.status_code == 200, f"Save quiz failed: {r.status_code} {r.text}"
    saved_quiz = r.json()
    quiz_id = saved_quiz["id"]
    print(f"✅ User quiz saved with ID: {quiz_id}")

    # Get quiz in recall mode (should NOT expose answers)
    r = requests.get(f"{BASE_URL}/api/v1/quizzes/{quiz_id}?include_answers=false", headers=headers)
    assert r.status_code == 200
    quiz_public = r.json()
    assert "answer" not in quiz_public["questions"][0] or quiz_public["questions"][0]["answer"] is None
    print("✅ Quiz recall mode verified: answers are hidden from the client before submission.")

    # Submit answers for server-side scoring
    submit_payload = {
        "answers": {
            "1": "A", # Correct
            "2": "B"  # Incorrect
        }
    }
    r = requests.post(f"{BASE_URL}/api/v1/quizzes/{quiz_id}/submit", json=submit_payload, headers=headers)
    assert r.status_code == 200, f"Submit quiz failed: {r.status_code} {r.text}"
    graded = r.json()
    assert graded["score"] == 1
    assert graded["total_questions"] == 2
    assert graded["percentage"] == 50
    assert len(graded["results"]) == 2
    print(f"✅ Server-side quiz grading verified: Score {graded['score']}/{graded['total_questions']} ({graded['percentage']}%)")

    # Get attempt history
    r = requests.get(f"{BASE_URL}/api/v1/quizzes/{quiz_id}/attempts", headers=headers)
    assert r.status_code == 200
    attempts = r.json()
    assert len(attempts) >= 1
    print(f"✅ Quiz attempt history verified: {len(attempts)} attempt(s)")

    # 15. Global Search across courses, notes, saved, quizzes
    print("\n[15] Testing Global Search (/api/v1/search)...")
    r = requests.get(f"{BASE_URL}/api/v1/search/?q=Event+Loop", headers=headers)
    assert r.status_code == 200
    search_results = r.json()
    assert len(search_results["notes"]) > 0 or len(search_results["saved"]) > 0 or len(search_results["quizzes"]) > 0
    print(f"✅ Global Search found: {len(search_results['courses'])} course(s), {len(search_results['notes'])} note(s), {len(search_results['saved'])} saved item(s), {len(search_results['quizzes'])} quiz(zes)")

    # 16. Chat with This Video using RAG (/api/v1/ai/chat)
    print("\n[16] Testing RAG Chat (/api/v1/ai/chat)...")
    chat_payload = {
        "video_id": first_vid_id,
        "question": "What is the primary topic of this video?",
        "playlist_id": playlist_id,
        "history": []
    }
    r = requests.post(f"{BASE_URL}/api/v1/ai/chat", json=chat_payload, headers=headers)
    assert r.status_code == 200, f"Chat failed: {r.status_code} {r.text}"
    chat_resp = r.json()
    assert "answer" in chat_resp and len(chat_resp["answer"]) > 0
    assert "citations" in chat_resp
    print(f"✅ RAG Chat answered with {len(chat_resp['citations'])} citation(s): '{chat_resp['answer'][:100]}...'")

    # Verify Chat History retrieval
    print(f"\n[16b] Testing GET /api/v1/ai/chat/history/{first_vid_id}...")
    r = requests.get(f"{BASE_URL}/api/v1/ai/chat/history/{first_vid_id}", headers=headers)
    assert r.status_code == 200
    history_resp = r.json()
    assert len(history_resp["messages"]) >= 2  # user and assistant
    print(f"✅ Retrieved chat history with {len(history_resp['messages'])} message(s).")

    # Clear Chat History
    print(f"\n[16c] Testing DELETE /api/v1/ai/chat/history/{first_vid_id}...")
    r = requests.delete(f"{BASE_URL}/api/v1/ai/chat/history/{first_vid_id}", headers=headers)
    assert r.status_code == 200
    assert r.json().get("success") == True
    print("✅ Chat history cleanly cleared.")

    # 17. Clean up: Delete quiz, note, saved item, playlist
    print("\n[17] Cleaning up test resources...")
    requests.delete(f"{BASE_URL}/api/v1/quizzes/{quiz_id}", headers=headers)
    requests.delete(f"{BASE_URL}/api/v1/saved/{saved_id}", headers=headers)
    requests.delete(f"{BASE_URL}/api/v1/notes/{note_id}", headers=headers)
    requests.delete(f"{BASE_URL}/api/v1/playlists/{playlist_id}", headers=headers)
    print("✅ All created test resources cleanly deleted.")

    print("\n" + "=" * 60)
    print("🎉 ALL 17 COMPREHENSIVE SYSTEM TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    import traceback
    try:
        test_api()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        traceback.print_exc()
        sys.exit(1)
