from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    # For PostgreSQL standard deployments
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
