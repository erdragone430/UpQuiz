from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ParsedQuestion(BaseModel):
    """Schema for a single parsed question from PDF"""
    question_number: int = Field(description="Question number from the PDF")
    question_text: str = Field(description="The question text")
    question_type: Literal["multiple_choice", "numeric"] = Field(description="Type of question")
    
    # For multiple choice questions
    options: Optional[List[str]] = Field(default=None, description="List of options (A, B, C, D)")
    correct_answer_letter: Optional[str] = Field(default=None, description="Correct answer letter (A-D)")
    
    # For numeric questions
    correct_answer_numeric: Optional[float] = Field(default=None, description="Correct numeric answer")
    
    # Optional metadata
    points: Optional[float] = Field(default=None, description="Points for this question")
    explanation: Optional[str] = Field(default=None, description="Explanation or comment")


class ParsedExam(BaseModel):
    """Schema for the complete parsed exam from Moodle PDF"""
    student_name: Optional[str] = Field(default=None, description="Student name from header")
    student_id: Optional[str] = Field(default=None, description="Student ID/matricola")
    exam_date: Optional[str] = Field(default=None, description="Exam date")
    course_name: Optional[str] = Field(default=None, description="Course/subject name")
    total_score: Optional[float] = Field(default=None, description="Total score achieved")
    max_score: Optional[float] = Field(default=None, description="Maximum possible score")
    
    questions: List[ParsedQuestion] = Field(description="List of all questions")
    
    def get_completeness_warnings(self) -> list[str]:
        """
        Check data completeness and return warnings for missing data
        
        Returns:
            List of warning messages about incomplete data
        """
        warnings = []
        
        # Check metadata
        if not self.student_name:
            warnings.append("Student name not found in PDF")
        if not self.course_name:
            warnings.append("Course name not found in PDF")
        if not self.exam_date:
            warnings.append("Exam date not found in PDF")
        
        # Check questions
        if not self.questions:
            warnings.append("No questions found in PDF")
        else:
            incomplete_questions = []
            for q in self.questions:
                issues = []
                
                if q.question_type == "multiple_choice":
                    if not q.options or len(q.options) < 2:
                        issues.append("missing or incomplete options")
                    if not q.correct_answer_letter:
                        issues.append("correct answer not found")
                elif q.question_type == "numeric":
                    if q.correct_answer_numeric is None:
                        issues.append("correct answer not found")
                
                if issues:
                    incomplete_questions.append(f"Question {q.question_number}: {', '.join(issues)}")
            
            if incomplete_questions:
                warnings.append(f"Incomplete questions found: {'; '.join(incomplete_questions)}")
        
        return warnings


def convert_to_quiz_format(parsed_exam: ParsedExam) -> str:
    """
    Convert ParsedExam to the quiz .txt format used by the app
    Handles incomplete data gracefully
    
    Returns a string in the format:
    Esercizio 1.
    Question text?
    A) Option A
    B) Option B
    C) Option C
    D) Option D
    Risposta: B
    Commento: Explanation
    """
    lines = []
    
    for idx, q in enumerate(parsed_exam.questions, 1):
        lines.append(f"Esercizio {idx}.")
        lines.append(q.question_text)
        
        if q.question_type == "multiple_choice":
            # Add options A-D (even if incomplete)
            if q.options and len(q.options) > 0:
                option_letters = ["A", "B", "C", "D"]
                for letter, option in zip(option_letters, q.options):
                    lines.append(f"{letter}) {option}")
            else:
                # Fallback: create placeholder options if none found
                lines.append("A) Opzione non trovata")
                lines.append("B) Opzione non trovata")
            
            # Add correct answer (or placeholder if missing)
            if q.correct_answer_letter:
                lines.append(f"Risposta: {q.correct_answer_letter}")
            else:
                # If answer not found, default to A and add warning in comment
                lines.append("Risposta: A")
                if not q.explanation:
                    q.explanation = "ATTENZIONE: Risposta corretta non trovata nel PDF"
                else:
                    q.explanation = f"ATTENZIONE: Risposta corretta non trovata nel PDF. {q.explanation}"
                
        elif q.question_type == "numeric":
            # Numeric question - no options, just the answer
            if q.correct_answer_numeric is not None:
                lines.append(f"Risposta: {q.correct_answer_numeric}")
            else:
                # Fallback if answer not found
                lines.append("Risposta: 0")
                if not q.explanation:
                    q.explanation = "ATTENZIONE: Risposta numerica non trovata nel PDF"
                else:
                    q.explanation = f"ATTENZIONE: Risposta numerica non trovata nel PDF. {q.explanation}"
        
        # Add explanation/comment if available
        if q.explanation:
            lines.append(f"Commento: {q.explanation}")
        
        # Add blank line between questions
        lines.append("")
    
    return "\n".join(lines)
