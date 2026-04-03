import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/portfolio_tracker")
# Railway provides DATABASE_URL with postgresql:// prefix, SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

PIN = os.getenv("AUTH_PIN", "1002")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
