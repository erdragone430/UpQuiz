from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes.quiz import router as quiz_router
from app.routes.auth import router as auth_router
from app.database import Base, engine
from pathlib import Path
import os

# Create database tables
Base.metadata.create_all(bind=engine)

# Create uploads directory with secure permissions
uploads_dir = Path("uploads/profile_pictures")
uploads_dir.mkdir(parents=True, exist_ok=True)

# Set secure permissions: 755 for directories (rwxr-xr-x)
os.chmod(Path("uploads"), 0o755)
os.chmod(uploads_dir, 0o755)

app = FastAPI(title="Quiz App with Auth")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS configuration
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(quiz_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Quiz App API"}
