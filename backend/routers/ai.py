from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from core.auth import get_current_user
from core.database import get_database
from services.transcript_service import TranscriptService, extract_video_id
from services.ai_service import AIService

router = APIRouter()

class ProcessRequest(BaseModel):
    youtube_url: str

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
    2. Runs NLP Summarization into structured notes.
    3. Generates interactive quiz questions.
    """
    try:
        video_id = extract_video_id(req.youtube_url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL or Video ID provided")

        # Check DB first for transcript
        transcript_doc = await db["transcripts"].find_one({"video_id": video_id})
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
                "strategy": "cached"
            }

        transcript_data = TranscriptService.get_transcript(video_id)
        
        # Run AI tasks
        title = transcript_data.get("title", f"Video {video_id}")
        transcript_text = transcript_data.get("transcript", "")
        
        if not transcript_text:
            raise HTTPException(status_code=400, detail="Transcript extraction failed and returned empty text.")
            
        summary = AIService.generate_summary(transcript_text, title)
        quiz = AIService.generate_quiz(transcript_text, title)
        
        # Save to DB to cache for future requests
        if not transcript_doc:
            await db["transcripts"].insert_one({
                "video_id": video_id,
                "title": title,
                "author": transcript_data.get("author", "Instructor"),
                "thumbnail_url": transcript_data.get("thumbnail_url"),
                "text": transcript_text,
                "segments": transcript_data.get("segments", []),
                "strategy": transcript_data.get("strategy", "unknown")
            })
            
        if not summary_doc:
            await db["summaries"].insert_one({
                "video_id": video_id,
                "content": summary
            })
            
        if not quiz_doc:
            await db["quizzes"].insert_one({
                "video_id": video_id,
                "questions": quiz
            })

        return {
            "success": True,
            "video_id": video_id,
            "title": title,
            "author": transcript_data.get("author", "Instructor"),
            "thumbnail_url": transcript_data.get("thumbnail_url"),
            "summary": summary,
            "quiz": quiz,
            "transcript": transcript_text,
            "segments": transcript_data.get("segments", []),
            "strategy": transcript_data.get("strategy", "direct")
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Transcript extraction failure across tiers
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"[AI Process Error]: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")


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
