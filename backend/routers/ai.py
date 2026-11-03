from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from core.auth import get_current_user
from core.database import get_database
from services.transcript_service import TranscriptService, extract_video_id
from services.ai_service import AIService
from services.rag_service import RAGService
from schemas.chat import VideoChatRequest, VideoChatResponse, ChatCitation, ChatHistoryResponse, ChatMessageItem
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class ProcessRequest(BaseModel):
    youtube_url: str
    level: Optional[str] = "medium"

class RegenerateQuizRequest(BaseModel):
    video_id: str
    difficulty: Optional[str] = "mixed"
    count: Optional[int] = 4
    offset: Optional[int] = 0

class SummarizeRequest(BaseModel):
    text: str
    title: Optional[str] = "Study Topic"

class QuizRequest(BaseModel):
    text: str
    title: Optional[str] = "Study Topic"

class ClarifyRequest(BaseModel):
    concept: str
    context: Optional[str] = None

@router.post("/process")
async def process_video(
    req: ProcessRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """
    Main AI Studio Pipeline:
    1. Extracts transcript & metadata from YouTube video URL.
    2. Runs NLP Summarization with requested explanation level (simple, medium, detailed).
    3. Generates interactive quiz questions.
    """
    try:
        video_id = extract_video_id(req.youtube_url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL or Video ID provided")

        requested_level = (req.level or "medium").lower()
        if requested_level not in ["simple", "medium", "detailed"]:
            requested_level = "medium"

        # Check DB first for transcript
        transcript_doc = await db["transcripts"].find_one({"video_id": video_id})
        summary_doc = await db["summaries"].find_one({"video_id": video_id, "level": requested_level})
        if not summary_doc and requested_level == "medium":
            summary_doc = await db["summaries"].find_one({"video_id": video_id})
        quiz_doc = await db["quizzes"].find_one({"video_id": video_id})

        if transcript_doc and summary_doc and quiz_doc:
            return {
                "success": True,
                "video_id": video_id,
                "title": transcript_doc.get("title", f"Video {video_id}"),
                "author": transcript_doc.get("author", "Instructor"),
                "thumbnail_url": transcript_doc.get("thumbnail_url"),
                "summary": summary_doc.get("content", ""),
                "quiz": quiz_doc.get("questions", []),
                "transcript": transcript_doc.get("text", ""),
                "segments": transcript_doc.get("segments", []),
                "strategy": "cached",
                "level": requested_level
            }

        # If transcript is cached, reuse it!
        if transcript_doc:
            title = transcript_doc.get("title", f"Video {video_id}")
            transcript_text = transcript_doc.get("text", "")
            author = transcript_doc.get("author", "Instructor")
            thumbnail_url = transcript_doc.get("thumbnail_url")
            segments = transcript_doc.get("segments", [])
            strategy = "cached_transcript"
        else:
            transcript_data = TranscriptService.get_transcript(video_id)
            title = transcript_data.get("title", f"Video {video_id}")
            transcript_text = transcript_data.get("transcript", "")
            author = transcript_data.get("author", "Instructor")
            thumbnail_url = transcript_data.get("thumbnail_url")
            segments = transcript_data.get("segments", [])
            strategy = transcript_data.get("strategy", "direct")
            
            if not transcript_text:
                raise HTTPException(status_code=400, detail="Transcript extraction failed and returned empty text.")

            await db["transcripts"].insert_one({
                "video_id": video_id,
                "title": title,
                "author": author,
                "thumbnail_url": thumbnail_url,
                "text": transcript_text,
                "segments": segments,
                "strategy": strategy
            })

        # Generate summary if not cached for this level
        if not summary_doc:
            summary = AIService.generate_summary(transcript_text, title, level=requested_level)
            await db["summaries"].insert_one({
                "video_id": video_id,
                "level": requested_level,
                "content": summary
            })
        else:
            summary = summary_doc.get("content", "")

        # Generate quiz if not cached
        if not quiz_doc:
            quiz = AIService.generate_quiz(transcript_text, title)
            await db["quizzes"].insert_one({
                "video_id": video_id,
                "questions": quiz
            })
        else:
            quiz = quiz_doc.get("questions", [])

        return {
            "success": True,
            "video_id": video_id,
            "title": title,
            "author": author,
            "thumbnail_url": thumbnail_url,
            "summary": summary,
            "quiz": quiz,
            "transcript": transcript_text,
            "segments": segments,
            "strategy": strategy,
            "level": requested_level
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"[AI Process Error]: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")


@router.post("/regenerate-quiz")
async def regenerate_quiz(
    req: RegenerateQuizRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Generates new quiz questions for an already-processed video transcript."""
    transcript_doc = await db["transcripts"].find_one({"video_id": req.video_id})
    if not transcript_doc:
        raise HTTPException(status_code=404, detail="Video transcript not found. Please synthesize the video first.")

    quiz = AIService.generate_quiz(
        transcript_doc.get("text", ""),
        transcript_doc.get("title", f"Video {req.video_id}"),
        difficulty=req.difficulty or "mixed",
        count=req.count or 4,
        offset=req.offset or 0
    )
    return {
        "success": True,
        "video_id": req.video_id,
        "questions": quiz,
        "offset": req.offset,
        "count": len(quiz)
    }


@router.post("/summarize")
async def summarize_text(
    req: SummarizeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate structured study notes from arbitrary text."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")
    summary = AIService.generate_summary(req.text, req.title or "Study Notes")
    return {"summary": summary}

@router.post("/quiz")
async def generate_quiz_endpoint(
    req: QuizRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate multiple choice questions from arbitrary text."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be empty")
    quiz = AIService.generate_quiz(req.text, req.title or "Study Topic")
    return {"quiz": quiz}

@router.post("/clarify")
async def clarify_concept_endpoint(
    req: ClarifyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Simplifies and clarifies a difficult concept using real-world analogies."""
    if not req.concept.strip():
        raise HTTPException(status_code=400, detail="Concept cannot be empty")
    result = AIService.clarify_concept(req.concept, req.context)
    return result

@router.post("/chat", response_model=VideoChatResponse)
async def chat_with_video(
    req: VideoChatRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """
    RAG-Powered Chat with This Video:
    1. Ensures transcript exists (or fetches via TranscriptService).
    2. Indexes into ChromaDB vector store if not already indexed.
    3. Retrieves top-k semantically relevant chunks with exact timestamps.
    4. Generates a grounded tutor answer using Groq with timestamp citations.
    5. Saves interaction to MongoDB chat_history.
    """
    video_id = extract_video_id(req.video_id) or req.video_id.strip()
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid video ID")

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Fetch transcript from DB or extract it
    transcript_doc = await db["transcripts"].find_one({"video_id": video_id})
    if not transcript_doc:
        try:
            extracted = TranscriptService.get_transcript(video_id)
            transcript_doc = {
                "video_id": video_id,
                "title": extracted.get("title", f"Video {video_id}"),
                "author": extracted.get("author", "Instructor"),
                "thumbnail_url": extracted.get("thumbnail_url"),
                "text": extracted.get("transcript", ""),
                "segments": extracted.get("segments", []),
                "strategy": extracted.get("strategy", "direct")
            }
            await db["transcripts"].insert_one(transcript_doc)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to fetch transcript for video: {str(e)}")

    transcript_text = transcript_doc.get("text", "")
    segments = transcript_doc.get("segments", [])
    title = transcript_doc.get("title", f"Video {video_id}")

    if not transcript_text and not segments:
        raise HTTPException(status_code=400, detail="Transcript is empty for this video")

    # Ensure video is indexed into ChromaDB
    try:
        RAGService.index_video(video_id, transcript_text, segments)
    except Exception as e:
        print(f"[RAG Index Warning]: {e}")

    # Retrieve relevant chunks via semantic search
    try:
        retrieved_chunks = RAGService.query_video(video_id, question, top_k=4)
    except Exception as e:
        print(f"[RAG Query Warning]: {e}")
        retrieved_chunks = []

    # Generate grounded answer
    answer, citations = RAGService.generate_rag_answer(
        question=question,
        video_title=title,
        retrieved_chunks=retrieved_chunks,
        conversation_history=req.history
    )

    now = datetime.utcnow()
    # Persist user question and assistant answer in MongoDB chat_history
    await db["chat_history"].insert_one({
        "user_id": current_user["id"],
        "video_id": video_id,
        "playlist_id": req.playlist_id,
        "role": "user",
        "content": question,
        "citations": [],
        "created_at": now
    })

    await db["chat_history"].insert_one({
        "user_id": current_user["id"],
        "video_id": video_id,
        "playlist_id": req.playlist_id,
        "role": "assistant",
        "content": answer,
        "citations": citations,
        "created_at": now
    })

    return {
        "answer": answer,
        "citations": citations,
        "video_id": video_id
    }

@router.get("/chat/history/{video_id}", response_model=ChatHistoryResponse)
async def get_video_chat_history(
    video_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Retrieves previous chat messages for this user and video."""
    clean_id = extract_video_id(video_id) or video_id.strip()
    cursor = db["chat_history"].find({
        "user_id": current_user["id"],
        "video_id": clean_id
    }).sort("created_at", 1)
    
    docs = await cursor.to_list(length=100)
    messages = []
    for d in docs:
        messages.append({
            "id": str(d["_id"]),
            "user_id": d["user_id"],
            "video_id": d["video_id"],
            "role": d["role"],
            "content": d["content"],
            "citations": d.get("citations", []),
            "created_at": d["created_at"]
        })

    return {
        "video_id": clean_id,
        "messages": messages
    }

@router.delete("/chat/history/{video_id}")
async def clear_video_chat_history(
    video_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Deletes conversation history for this user and video."""
    clean_id = extract_video_id(video_id) or video_id.strip()
    result = await db["chat_history"].delete_many({
        "user_id": current_user["id"],
        "video_id": clean_id
    })
    return {
        "success": True,
        "deleted_count": result.deleted_count,
        "video_id": clean_id
    }
