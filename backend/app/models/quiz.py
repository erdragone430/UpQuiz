from pydantic import BaseModel
from typing import List, Optional

class Question(BaseModel):
    id: int
    text: str
    options: List[str]
    correct_answer: int

class Quiz(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    questions: List[Question]

class Answer(BaseModel):
    question_id: int
    selected_option: int

class QuizSubmission(BaseModel):
    quiz_id: int
    answers: List[Answer]
