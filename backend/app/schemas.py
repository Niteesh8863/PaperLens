from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
class UserCreate(BaseModel): email: EmailStr; password: str
class Token(BaseModel): access_token: str; token_type: str = "bearer"
class DocumentOut(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:int; filename:str; status:str; created_at:datetime
class ExtractionOut(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:int; kind:str; value:dict; confidence:int; review_status:str; reviewer_note:str|None
class ReviewIn(BaseModel): review_status:str; reviewer_note:str|None=None
