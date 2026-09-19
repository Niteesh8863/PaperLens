import os, uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..config import settings
from ..db import get_db
from ..models import User, Document, Extraction
from ..schemas import DocumentOut, ExtractionOut, ReviewIn
from ..security import current_user
from ..tasks import process_document
router=APIRouter()
@router.post("/upload", response_model=DocumentOut)
def upload(file:UploadFile=File(...), user:User=Depends(current_user), db:Session=Depends(get_db)):
    if file.content_type != "application/pdf": raise HTTPException(415,"PDF required")
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > 25 * 1024 * 1024: raise HTTPException(413, "PDF must be smaller than 25 MB")
    os.makedirs(settings.upload_dir,exist_ok=True); name=f"{uuid.uuid4()}.pdf"; path=os.path.join(settings.upload_dir,name)
    with open(path,"wb") as out: out.write(file.file.read())
    d=Document(owner_id=user.id,filename=file.filename or name,storage_path=path); db.add(d); db.commit(); db.refresh(d); process_document.delay(d.id); return d
@router.get("", response_model=list[DocumentOut])
def list_documents(user=Depends(current_user),db:Session=Depends(get_db)): return db.query(Document).filter_by(owner_id=user.id).order_by(Document.created_at.desc()).all()
@router.get("/{doc_id}/extractions", response_model=list[ExtractionOut])
def extractions(doc_id:int,user=Depends(current_user),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=doc_id,owner_id=user.id).first()
    if not d: raise HTTPException(404,"Document not found")
    return d.extractions
@router.patch("/{doc_id}/extractions/{extraction_id}", response_model=ExtractionOut)
def review(doc_id:int,extraction_id:int,data:ReviewIn,user=Depends(current_user),db:Session=Depends(get_db)):
    e=db.query(Extraction).join(Document).filter(Extraction.id==extraction_id,Document.id==doc_id,Document.owner_id==user.id).first()
    if not e: raise HTTPException(404,"Extraction not found")
    if data.review_status not in {"pending","approved","rejected"}: raise HTTPException(400,"Invalid review status")
    e.review_status=data.review_status; e.reviewer_note=data.reviewer_note; db.commit(); db.refresh(e); return e
