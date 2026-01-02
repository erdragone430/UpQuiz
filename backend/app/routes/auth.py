from fastapi import APIRouter, HTTPException, Depends, status, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, QuizStat
from app.services.auth import hash_password, verify_password, create_access_token
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_admin: bool = False

class UserStats(BaseModel):
    username: str
    total_quizzes: int
    average_score: float
    total_correct: int
    total_wrong: int
    total_unanswered: int
    total_time_spent: int

class QuizHistory(BaseModel):
    quiz_name: str
    score: float
    max_score: float
    score_percentage: float
    attempt_number: int
    time_spent: int
    completed_at: str

# Register
@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate username
    if len(user_data.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    
    # Check for spaces in username
    if " " in user_data.username:
        raise HTTPException(status_code=400, detail="Username cannot contain spaces. Use underscore (_) instead")
    
    # Check for valid characters (alphanumeric and underscore only)
    if not user_data.username.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, and underscores")
    
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Check if this is the admin account
    import os
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    is_admin = (user_data.username == admin_username)
    
    # Create user
    new_user = User(
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        is_admin=is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    access_token = create_access_token(data={"sub": new_user.username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": new_user.username,
        "is_admin": new_user.is_admin
    }

# Login
@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    from datetime import datetime
    user = db.query(User).filter(User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Get client IP
    client_ip = request.client.host if request.client else None
    # Check for forwarded IP (if behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Update last login and IP
    user.last_login = datetime.utcnow()
    user.last_ip = client_ip
    db.commit()
    
    # Generate token
    access_token = create_access_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "is_admin": user.is_admin
    }

# Get current user from token
def get_current_user(token: str, db: Session = Depends(get_db)):
    from fastapi import Header
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from app.services.auth import verify_token
    username = verify_token(token)
    
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Get user statistics
@router.get("/stats", response_model=UserStats)
async def get_stats(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_current_user(token, db)
    
    stats = db.query(QuizStat).filter(QuizStat.user_id == user.id).all()
    
    if not stats:
        return {
            "username": user.username,
            "total_quizzes": 0,
            "average_score": 0.0,
            "total_correct": 0,
            "total_wrong": 0,
            "total_unanswered": 0,
            "total_time_spent": 0
        }
    
    total_score = sum(s.score for s in stats)
    total_correct = sum(s.correct_answers for s in stats)
    total_wrong = sum(s.wrong_answers for s in stats)
    total_unanswered = sum(s.no_answers for s in stats)
    total_time = sum(s.time_spent for s in stats)
    average_score = total_score / len(stats)
    
    return {
        "username": user.username,
        "total_quizzes": len(stats),
        "average_score": round(average_score, 2),
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_unanswered": total_unanswered,
        "total_time_spent": total_time
    }

# Get quiz history
@router.get("/history")
async def get_history(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_current_user(token, db)
    
    stats = db.query(QuizStat).filter(
        QuizStat.user_id == user.id
    ).order_by(QuizStat.completed_at.desc()).all()
    
    history = []
    for stat in stats:
        score_percentage = (stat.score / stat.max_score * 100) if stat.max_score > 0 else 0
        history.append({
            "quiz_name": stat.quiz_name,
            "score": stat.score,
            "max_score": stat.max_score,
            "score_percentage": round(score_percentage, 2),
            "attempt_number": stat.attempt_number,
            "time_spent": stat.time_spent,
            "completed_at": stat.completed_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    return history

# Admin: Get all users
@router.get("/admin/users")
async def get_all_users(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    import httpx
    
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_current_user(token, db)
    
    # Check if user is admin (only kingdragone)
    if not user.is_admin or user.username != "kingdragone":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = db.query(User).all()
    
    users_list = []
    for u in users:
        # Get quiz count for each user
        quiz_count = db.query(QuizStat).filter(QuizStat.user_id == u.id).count()
        
        # Get geolocation for IP
        location = None
        if u.last_ip and u.last_ip not in ["127.0.0.1", "localhost", None]:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    response = await client.get(f"http://ip-api.com/json/{u.last_ip}")
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("status") == "success":
                            location = f"{data.get('city', '')}, {data.get('regionName', '')}, {data.get('country', '')}"
            except:
                location = "Unknown"
        
        users_list.append({
            "id": u.id,
            "username": u.username,
            "is_admin": u.is_admin,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "last_login": u.last_login.strftime("%Y-%m-%d %H:%M:%S") if u.last_login else "Never",
            "last_ip": u.last_ip or "N/A",
            "location": location or "N/A",
            "quiz_count": quiz_count
        })
    
    return users_list
