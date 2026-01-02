from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.quiz import router as quiz_router
from app.routes.auth import router as auth_router
from app.database import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Quiz App with Auth")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for online deployment
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
