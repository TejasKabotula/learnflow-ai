from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import connect_to_mongo, close_mongo_connection
from routers import auth, playlists, notes, ai, progress, saved, quizzes, search

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(playlists.router, prefix=f"{settings.API_V1_STR}/playlists", tags=["playlists"])
app.include_router(progress.router, prefix=f"{settings.API_V1_STR}/videos", tags=["progress"])
app.include_router(notes.router, prefix=f"{settings.API_V1_STR}/notes", tags=["notes"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(saved.router, prefix=f"{settings.API_V1_STR}/saved", tags=["saved"])
app.include_router(quizzes.router, prefix=f"{settings.API_V1_STR}/quizzes", tags=["quizzes"])
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["search"])

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.get("/health")
async def health():
    try:
        from core.database import db
        if db.client:
            await db.client.admin.command('ping')
            db_status = "connected"
        else:
            db_status = "uninitialized"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "healthy",
        "database": db_status
    }
