from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    last_ip = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    failed_login_attempts = Column(Integer, default=0)
    last_failed_login = Column(DateTime, nullable=True)
    locked_until = Column(DateTime, nullable=True)

    quiz_stats = relationship("QuizStat", back_populates="user", cascade="all, delete-orphan")

class QuizStat(Base):
    __tablename__ = "quiz_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_name = Column(String)  # Nome del file o quiz
    score = Column(Float)  # Punteggio finale
    max_score = Column(Integer)  # Punteggio massimo
    correct_answers = Column(Integer)
    wrong_answers = Column(Integer)
    no_answers = Column(Integer)
    time_spent = Column(Integer)  # Secondi
    attempt_number = Column(Integer, default=1)  # Quale tentativo
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="quiz_stats")
