from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class QuizAttemptRequest(BaseModel):
    answers: Dict[str, int] # e.g. {"0": 1, "1": 3} where key is question index, value is selected option index

class QuestionReview(BaseModel):
    question_index: int
    is_correct: bool
    selected_answer: int
    correct_answer: int
    explanation: str

class QuizAttemptResponse(BaseModel):
    id: str
    quiz_id: str
    user_id: str
    score: int
    total_questions: int
    percentage: float
    question_review: List[QuestionReview]
    created_at: datetime
