from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Depends
from pydantic import BaseModel
from app.services.parser import parse_quiz_text
from app.services.validator import validate_quiz_file
from app.database import get_db
from app.models.user import User, QuizStat
from app.services.auth import verify_token
from sqlalchemy.orm import Session
import random
from datetime import datetime

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# Security settings
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = [".txt"]

async def validate_file_upload(file: UploadFile) -> str:
    """Validates file upload and returns content"""
    # Check extension
    if not any(file.filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only .txt files allowed")
    
    # Read file with size limit
    content = b""
    chunk_size = 1024 * 1024  # 1 MB chunks
    total_size = 0
    
    try:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024:.1f} MB"
                )
            content += chunk
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Decode with error handling
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400, 
            detail="File encoding error: expected UTF-8"
        )
    
    return text

# 1️⃣ Endpoint POST /upload (test e caricamento)
@router.post("/upload")
async def upload_quiz(file: UploadFile = File(...)):
    text = await validate_file_upload(file)
    
    # Valida il file
    errors, warnings = validate_quiz_file(text)
    if errors:
        raise HTTPException(status_code=400, detail=f"File errors: {'; '.join(errors)}")
    
    questions = parse_quiz_text(text)

    return {
        "total": len(questions), 
        "questions": questions,
        "warnings": warnings
    }

# 2️⃣ Endpoint POST /simulate (quiz randomizzato senza risposte corrette)
@router.post("/simulate")
async def simulate_quiz(file: UploadFile = File(...), max_questions: int = 31):
    try:
        text = await validate_file_upload(file)
        
        # Valida il file
        errors, warnings = validate_quiz_file(text)
        if errors:
            print(f"Validation errors: {errors}")
            raise HTTPException(status_code=400, detail=f"File errors: {'; '.join(errors)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in simulate_quiz: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    
    questions = parse_quiz_text(text)

    if not questions:
        raise HTTPException(status_code=400, detail="No valid questions found after validation")

    # Limita a max_questions
    random.shuffle(questions)
    quiz = questions[:min(max_questions, len(questions))]

    # Rimuovi indice corretto dalle opzioni (già mescolate dal parser)
    quiz_for_user = []
    for q in quiz:
        quiz_for_user.append({
            "question": q["question"],
            "options": q["options"],
            "comment": q.get("comment", "")
        })

    return {
        "total": len(quiz_for_user), 
        "questions": quiz_for_user,
        "warnings": warnings
    }

# 3️⃣ Endpoint POST /submit (valutazione)
class QuizAnswer(BaseModel):
    question: str
    answer: str

class QuizSubmitRequest(BaseModel):
    questions: list[QuizAnswer]
    original_file_content: str
    quiz_name: str = "Unknown Quiz"
    time_spent: int = 0  # in seconds

@router.post("/submit")
def submit_quiz(
    data: QuizSubmitRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    all_questions = parse_quiz_text(data.original_file_content)

    # Dizionario delle risposte corrette
    answer_key = {
        q["question"]: {"correct_option": q["options"][q["correct"]], "comment": q.get("comment", "")}
        for q in all_questions
    }

    total_questions = len(data.questions)
    total_score = 0
    correct_answers = 0
    wrong_answers = 0
    no_answers = 0
    results = []

    for q in data.questions:
        question_text = q.question
        user_answer = q.answer
        correct_option = answer_key[question_text]["correct_option"]
        comment = answer_key[question_text]["comment"]

        # Calcolo punteggio
        is_correct = user_answer == correct_option
        if user_answer == "":
            score = 0  # non risposta
            no_answers += 1
        elif is_correct:
            score = 1  # risposta corretta
            correct_answers += 1
        else:
            score = -0.33  # risposta sbagliata
            wrong_answers += 1

        total_score += score

        results.append({
            "question": question_text,
            "your_answer": user_answer,
            "correct_answer": correct_option,
            "is_correct": is_correct,
            "score": score,
            "comment": comment
        })

    max_score = total_questions
    score_percentage = round((total_score / max_score) * 100, 2)

    # Save statistics if user is authenticated
    if authorization:
        try:
            token = authorization.replace("Bearer ", "")
            username = verify_token(token)
            if username:
                user = db.query(User).filter(User.username == username).first()
                if user:
                    # Get attempt number
                    attempt_count = db.query(QuizStat).filter(
                        QuizStat.user_id == user.id,
                        QuizStat.quiz_name == data.quiz_name
                    ).count()
                    
                    # Create new stat record
                    new_stat = QuizStat(
                        user_id=user.id,
                        quiz_name=data.quiz_name,
                        score=total_score,
                        max_score=max_score,
                        correct_answers=correct_answers,
                        wrong_answers=wrong_answers,
                        no_answers=no_answers,
                        time_spent=data.time_spent,
                        attempt_number=attempt_count + 1,
                        completed_at=datetime.now()
                    )
                    db.add(new_stat)
                    db.commit()
        except Exception as e:
            # Don't fail the request if stats saving fails
            print(f"Failed to save stats: {e}")

    return {
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "no_answers": no_answers,
        "total_score": round(total_score, 2),
        "max_score": max_score,
        "score_percentage": score_percentage,
        "results": results
    }
