from fastapi import APIRouter, Depends, HTTPException
from core.database import get_database
from core.auth import get_current_user
from typing import Dict, Any, List

router = APIRouter()

@router.get("/")
async def global_search(
    q: str = "",
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    query_str = q.strip()
    if not query_str:
        return {
            "courses": [],
            "notes": [],
            "saved": [],
            "quizzes": []
        }

    regex_pattern = {"$regex": query_str, "$options": "i"}
    user_id = current_user["id"]

    # 1. Search enrolled courses/playlists
    course_cursor = db["playlists"].find({
        "user_id": user_id,
        "$or": [
            {"title": regex_pattern},
            {"description": regex_pattern}
        ]
    }).limit(10)
    course_docs = await course_cursor.to_list(length=10)
    courses = []
    for c in course_docs:
        courses.append({
            "id": str(c["_id"]),
            "title": c.get("title", "Course"),
            "subtitle": f"{len(c.get('videos', []))} lessons",
            "type": "course",
            "url": f"/playlist/{str(c['_id'])}"
        })

    # 2. Search notes
    note_cursor = db["notes"].find({
        "user_id": user_id,
        "$or": [
            {"title": regex_pattern},
            {"content": regex_pattern}
        ]
    }).limit(10)
    note_docs = await note_cursor.to_list(length=10)
    notes = []
    for n in note_docs:
        notes.append({
            "id": str(n["_id"]),
            "title": n.get("title", "Note"),
            "subtitle": (n.get("content", "")[:80] + "...") if len(n.get("content", "")) > 80 else n.get("content", ""),
            "type": "note",
            "url": "/notes"
        })

    # 3. Search saved resources
    saved_cursor = db["saved_resources"].find({
        "user_id": user_id,
        "$or": [
            {"title": regex_pattern},
            {"type": regex_pattern}
        ]
    }).limit(10)
    saved_docs = await saved_cursor.to_list(length=10)
    saved = []
    for s in saved_docs:
        saved.append({
            "id": str(s["_id"]),
            "title": s.get("title", "Saved Item"),
            "subtitle": f"Type: {s.get('type', 'resource').capitalize()}",
            "type": "saved",
            "url": "/saved"
        })

    # 4. Search user quizzes
    quiz_cursor = db["user_quizzes"].find({
        "user_id": user_id,
        "title": regex_pattern
    }).limit(10)
    quiz_docs = await quiz_cursor.to_list(length=10)
    quizzes = []
    for q_doc in quiz_docs:
        quizzes.append({
            "id": str(q_doc["_id"]),
            "title": q_doc.get("title", "Quiz"),
            "subtitle": f"{len(q_doc.get('questions', []))} questions",
            "type": "quiz",
            "url": "/quizzes"
        })

    return {
        "courses": courses,
        "notes": notes,
        "saved": saved,
        "quizzes": quizzes
    }
