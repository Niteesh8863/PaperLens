from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, documents, jobs
from .db import init_db
from .config import settings

app = FastAPI(title="PaperLens API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health(): return {"status":"ok"}
