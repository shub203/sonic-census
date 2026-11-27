import os
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database.base import Base

def _normalize_database_url(url: str) -> str:
    """Normalize provider postgres:// or postgresql:// URLs to SQLAlchemy psycopg v3 dialect."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _configure_sqlite_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.execute("PRAGMA temp_store=MEMORY;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _ensure_audio_hash_columns():
    """Add file_hash and entry_hash columns idempotently for pre-existing databases."""
    inspector = inspect(engine)
    if "audio_files" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("audio_files")}
    with engine.begin() as conn:
        if "file_hash" not in existing:
            conn.exec_driver_sql("ALTER TABLE audio_files ADD COLUMN file_hash VARCHAR(64)")
        if "entry_hash" not in existing:
            conn.exec_driver_sql("ALTER TABLE audio_files ADD COLUMN entry_hash VARCHAR(64)")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_audio_files_file_hash ON audio_files (file_hash)")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_audio_files_entry_hash ON audio_files (entry_hash)")

def init_db():
    # Import all models before create_all
    import app.database.models
    Base.metadata.create_all(bind=engine)
    _ensure_audio_hash_columns()
    if DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            conn.exec_driver_sql("PRAGMA journal_mode=WAL;")
