from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Database URL - Usa l'utente applicativo con privilegi limitati
# per limitare i danni in caso di SQL injection
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    # Default: utente con privilegi limitati (non amministratore)
    "postgresql://quiz_app_user:quiz_app_password@localhost:5432/quiz_db"
)

print(f"Database URL: {DATABASE_URL}")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
