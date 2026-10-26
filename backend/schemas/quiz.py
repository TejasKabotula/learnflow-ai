from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class QuizQuestionItem(BaseModel):
    id: Any
    question: str
    options: List[str]
    answer: Optional[str] = None
    explanation: Optional[str] = None

class QuizSaveRequest(BaseModel):
    title: str
    video_id: Optional[str] = None
    questions: List[QuizQuestionItem]

class QuizSubmitRequest(BaseModel):
    answers: Dict[str, str]  # map of question_id (string) to option chosen ('A', 'B', etc.)

class QuestionResult(BaseModel):
    question_id: Any
    question: str
    selected_answer: Optional[str]
    correct_answer: str
    is_correct: bool
    explanation: Optional[str]

class QuizAttemptResult(BaseModel):
    id: str
    quiz_id: str
    score: int
    total_questions: int
    percentage: int
    results: List[QuestionResult]
    completed_at: datetime

class QuizResponse(BaseModel):
    id: str
    title: str
    video_id: Optional[str] = None
    total_questions: int
    questions: List[QuizQuestionItem]
    created_at: datetime
