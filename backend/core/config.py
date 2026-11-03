import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Learn Flow AI"
    API_V1_STR: str = "/api/v1"
    
    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "a_very_secret_key_for_development_only_12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # MongoDB Connection
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "learn_flow_db")
    
    # AI Engine (Groq)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")
    
    # YouTube Data API
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")

    # RAG & Vector Database (ChromaDB + Sentence Transformers)
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db"))
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

