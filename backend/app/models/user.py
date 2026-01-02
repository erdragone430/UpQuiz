from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    last_ip = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_stats")
