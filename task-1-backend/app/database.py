
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)


# Create database session factory
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False
)


# Base class for all database models
class Base(DeclarativeBase):
    pass


# Dependency for database sessions
def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()
