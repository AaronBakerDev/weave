import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Allow import in dev without env; will fail on first DB use
    DATABASE_URL = "postgresql://user:pass@localhost:5432/weave"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


def set_rls_user(session: Session, user_id: str) -> None:
    session.execute(text("set local app.user_id = :uid"), {"uid": user_id})


def get_db_with_rls(user_id: str) -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        set_rls_user(db, user_id)
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

