from fastapi import APIRouter, HTTPException, Depends, status, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, QuizStat
from app.services.auth import hash_password, verify_password, create_access_token
from typing import Optional
from fastapi import UploadFile, File
import os
import uuid
from pathlib import Path
from PIL import Image
import io

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
async def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
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
    
    # Get IP address from request
    ip_address = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    
    # Create user
    new_user = User(
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        is_admin=is_admin,
        last_ip=ip_address
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
    from datetime import datetime, timezone, timedelta
    
    user = db.query(User).filter(User.username == user_data.username).first()
    
    # Check if user is locked due to brute force
    if user and user.locked_until:
        now = datetime.now(timezone.utc)
        if now < user.locked_until:
            remaining_seconds = int((user.locked_until - now).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Account locked due to too many failed login attempts. Try again in {remaining_seconds} seconds"
            )
        else:
            # Unlock the account
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        # Record failed login attempt
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            user.last_failed_login = datetime.now(timezone.utc)
            
            # Lock account after 5 failed attempts for 30 minutes
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
            
            db.commit()
        
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Get client IP
    client_ip = request.client.host if request.client else None
    # Check for forwarded IP (if behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Reset failed login attempts on successful login
    user.failed_login_attempts = 0
    user.last_failed_login = None
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
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

# Upload profile picture
@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    # Validate token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    username = None
    
    try:
        from jose import jwt
        import os
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username = payload.get("sub")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Whitelist: allowed image extensions
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
    
    # Blacklist: dangerous extensions
    DANGEROUS_EXTENSIONS = {
        "py", "pyc", "pyo", "pyw", "pyx", "pyd", "pyz", "pywz",
        "exe", "dll", "so", "dylib", "app",
        "sh", "bash", "zsh", "fish", "bat", "cmd", "ps1",
        "js", "jsx", "ts", "tsx", "mjs",
        "php", "phtml", "php3", "php4", "php5", "php7", "phps",
        "jsp", "asp", "aspx", "cer", "csr",
        "rb", "pl", "cgi", "jar", "war",
        "sql", "sqlite", "db",
        "html", "htm", "xhtml", "xml", "svg",
        "swf", "fla",
        "dmg", "pkg", "deb", "rpm",
        "zip", "tar", "gz", "bz2", "xz", "7z", "rar"
    }
    
    # Extract file extension
    if "." not in file.filename:
        raise HTTPException(status_code=400, detail="File must have an extension")
    
    file_extension = file.filename.rsplit(".", 1)[-1].lower()
    
    # Check blacklist first
    if file_extension in DANGEROUS_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File extension '{file_extension}' is not allowed for security reasons"
        )
    
    # Check whitelist
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate declared content type
    allowed_content_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid content type. Only images are allowed")
    
    # Read file contents
    contents = await file.read()
    
    # Validate file size (max 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max size is 5MB")
    
    # Verify actual MIME type using magic numbers (file signatures)
    def verify_image_magic_number(data: bytes) -> bool:
        """Verify file is actually an image by checking magic numbers"""
        if len(data) < 12:
            return False
        
        # JPEG: FF D8 FF
        if data[:3] == b'\xFF\xD8\xFF':
            return True
        
        # PNG: 89 50 4E 47 0D 0A 1A 0A
        if data[:8] == b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A':
            return True
        
        # GIF: "GIF87a" or "GIF89a"
        if data[:6] in (b'GIF87a', b'GIF89a'):
            return True
        
        # WebP: "RIFF" ... "WEBP"
        if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
            return True
        
        return False
    
    # Verify the file is actually an image
    if not verify_image_magic_number(contents):
        raise HTTPException(
            status_code=400,
            detail="File content does not match image format. Possible file tampering detected."
        )
    
    # Additional validation: try to open and verify image with Pillow
    try:
        image = Image.open(io.BytesIO(contents))
        image.verify()  # Verify it's a valid image
        
        # Re-open for further checks (verify() closes the file)
        image = Image.open(io.BytesIO(contents))
        
        # Check image format matches extension
        image_format = image.format.lower() if image.format else None
        expected_formats = {
            "jpg": ["jpeg", "jpg"],
            "jpeg": ["jpeg", "jpg"],
            "png": ["png"],
            "gif": ["gif"],
            "webp": ["webp"]
        }
        
        if image_format not in expected_formats.get(file_extension, []):
            raise HTTPException(
                status_code=400,
                detail=f"Image format mismatch. File extension is '{file_extension}' but content is '{image_format}'"
            )
        
        # Check image dimensions (reasonable limit for profile pictures)
        max_dimension = 2048  # 2048x2048 pixels max for profile pictures
        if image.width > max_dimension or image.height > max_dimension:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions too large. Max {max_dimension}x{max_dimension} pixels for profile pictures"
            )
        
        # Check minimum dimensions (prevent tiny images)
        min_dimension = 50  # at least 50x50 pixels
        if image.width < min_dimension or image.height < min_dimension:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions too small. Minimum {min_dimension}x{min_dimension} pixels required"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or corrupted image file: {str(e)}"
        )
    
    # Sanitize filename: remove path traversal attempts
    safe_filename = file.filename.replace("/", "").replace("\\", "").replace("..", "")
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/profile_pictures")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Set directory permissions to 755 (rwxr-xr-x) - no write for others
    os.chmod(Path("uploads"), 0o755)
    os.chmod(upload_dir, 0o755)
    
    # Generate unique filename with sanitized extension
    unique_filename = f"{username}_{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Delete old profile picture if exists
    if user.profile_picture:
        old_file_path = Path(user.profile_picture)
        if old_file_path.exists():
            old_file_path.unlink()
    
    # Save new file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Set file permissions to 644 (rw-r--r--) - no execute permissions for security
    os.chmod(file_path, 0o644)
    
    # Update user profile picture path
    user.profile_picture = str(file_path)
    db.commit()
    
    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture": f"/uploads/profile_pictures/{unique_filename}"
    }

# Get profile picture
@router.get("/profile-picture")
async def get_profile_picture(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    # Validate token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    username = None
    
    try:
        from jose import jwt
        import os
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username = payload.get("sub")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.profile_picture:
        return {"profile_picture": None}
    
    # Return relative URL path
    file_path = Path(user.profile_picture)
    if file_path.exists():
        filename = file_path.name
        return {"profile_picture": f"/uploads/profile_pictures/{filename}"}
    
    return {"profile_picture": None}
