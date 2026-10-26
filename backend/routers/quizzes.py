from fastapi import APIRouter, Depends, HTTPException, status
from core.database import get_database
from core.auth import get_current_user
from schemas.quiz import (
    QuizSaveRequest,
    QuizSubmitRequest,
    QuizResponse,
    QuizAttemptResult,
    QuestionResult
)
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter()

@router.get("/")
async def get_user_quizzes(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Returns all quizzes saved by the authenticated user and includes latest attempt stats."""
    cursor = db["user_quizzes"].find({"user_id": current_user["id"]}).sort("created_at", -1)
    quizzes = await cursor.to_list(length=100)
    
    result = []
    for q in quizzes:
        quiz_id = str(q["_id"])
        # Check for latest attempt
        latest_attempt = await db["quiz_attempts"].find_one(
            {"user_id": current_user["id"], "quiz_id": quiz_id},
            sort=[("completed_at", -1)]
        )
        
        result.append({
            "id": quiz_id,
            "title": q.get("title", "Untitled Quiz"),
            "video_id": q.get("video_id"),
            "total_questions": len(q.get("questions", [])),
            "created_at": q.get("created_at"),
            "latest_score": latest_attempt.get("score") if latest_attempt else None,
            "latest_percentage": latest_attempt.get("percentage") if latest_attempt else None,
            "attempts_count": await db["quiz_attempts"].count_documents({"user_id": current_user["id"], "quiz_id": quiz_id})
        })
    return result

@router.post("/save")
async def save_user_quiz(
    data: QuizSaveRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Saves a quiz generated in AI Studio or elsewhere to the user's personal quizzes."""
    # Convert questions into dicts
    questions_list = [q.model_dump() for q in data.questions]
    
    # Check if duplicate exists for user
    existing = await db["user_quizzes"].find_one({
        "user_id": current_user["id"],
        "title": data.title.strip()
    })
    
    if existing:
        await db["user_quizzes"].update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "questions": questions_list,
                "video_id": data.video_id,
                "updated_at": datetime.utcnow()
            }}
        )
        return {
            "id": str(existing["_id"]),
            "title": data.title.strip(),
            "video_id": data.video_id,
            "total_questions": len(questions_list),
            "message": "Quiz updated in library"
        }
        
    doc = {
        "user_id": current_user["id"],
        "title": data.title.strip(),
        "video_id": data.video_id,
        "questions": questions_list,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db["user_quizzes"].insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "title": doc["title"],
        "video_id": doc["video_id"],
        "total_questions": len(questions_list),
        "message": "Quiz saved successfully"
    }

@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    include_answers: bool = False,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Fetches a specific quiz. By default, hides correct answers and explanations to test recall."""
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    quiz = await db["user_quizzes"].find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = []
    for q in quiz.get("questions", []):
        q_item = {
            "id": q.get("id"),
            "question": q.get("question"),
            "options": q.get("options", [])
        }
        if include_answers:
            q_item["answer"] = q.get("answer")
            q_item["explanation"] = q.get("explanation")
        questions.append(q_item)

    return {
        "id": str(quiz["_id"]),
        "title": quiz.get("title", "Untitled Quiz"),
        "video_id": quiz.get("video_id"),
        "total_questions": len(questions),
        "questions": questions,
        "created_at": quiz.get("created_at")
    }

@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    submission: QuizSubmitRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Validates submitted answers server-side, stores attempt history, and returns scores with explanations."""
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    quiz = await db["user_quizzes"].find_one({"_id": obj_id, "user_id": current_user["id"]})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz.get("questions", [])
    results = []
    score = 0

    for q in questions:
        q_id_str = str(q.get("id"))
        user_choice = submission.answers.get(q_id_str)
        correct_answer = q.get("answer", "").strip().upper()
        
        is_correct = bool(user_choice and user_choice.strip().upper() == correct_answer)
        if is_correct:
            score += 1
            
        results.append({
            "question_id": q.get("id"),
            "question": q.get("question"),
            "selected_answer": user_choice,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })

    total = len(questions)
    percentage = int((score / total) * 100) if total > 0 else 0
    now = datetime.utcnow()

    # Save attempt record
    attempt_doc = {
        "user_id": current_user["id"],
        "quiz_id": quiz_id,
        "quiz_title": quiz.get("title"),
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "results": results,
        "completed_at": now
    }
    attempt_res = await db["quiz_attempts"].insert_one(attempt_doc)

    return {
        "id": str(attempt_res.inserted_id),
        "quiz_id": quiz_id,
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "results": results,
        "completed_at": now
    }

@router.get("/{quiz_id}/attempts")
async def get_quiz_attempts(
    quiz_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Retrieves all past attempts for a given quiz."""
    cursor = db["quiz_attempts"].find({
        "user_id": current_user["id"],
        "quiz_id": quiz_id
    }).sort("completed_at", -1)
    
    attempts = await cursor.to_list(length=50)
    for a in attempts:
        a["id"] = str(a["_id"])
        del a["_id"]
    return attempts

@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    result = await db["user_quizzes"].delete_one({"_id": obj_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Also clean up attempts
    await db["quiz_attempts"].delete_many({"quiz_id": quiz_id, "user_id": current_user["id"]})
    return {"message": "Quiz deleted successfully"}
