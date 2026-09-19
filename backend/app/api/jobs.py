from fastapi import APIRouter, Depends
from ..security import current_user
router=APIRouter()
@router.get("/status")
def status(user=Depends(current_user)): return {"worker":"celery","queue":"redis"}
