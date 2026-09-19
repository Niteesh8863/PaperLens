from celery import Celery
from sqlalchemy.orm import Session
from .config import settings
from .db import SessionLocal
from .models import Document, Extraction
from .pipeline import extract_pdf
celery_app=Celery("paperlens",broker=settings.redis_url,backend=settings.redis_url)
@celery_app.task
def process_document(document_id:int):
    db:Session=SessionLocal()
    d=None
    try:
        d=db.get(Document,document_id); d.status="processing"; db.commit()
        for item in extract_pdf(d.storage_path): db.add(Extraction(document_id=d.id,kind=item["kind"],value=item["value"],confidence=item["confidence"]))
        d.status="completed"; db.commit()
    except Exception:
        if d: d.status="failed"; db.commit()
        raise
    finally: db.close()
