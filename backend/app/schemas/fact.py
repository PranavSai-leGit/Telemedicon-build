from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, Any, Dict

class FactBase(BaseModel):
    fact_type: str
    normalized_value: str
    value_json: Dict[str, Any] = {}
    unit: Optional[str] = None
    event_date: Optional[date] = None
    source_page: Optional[int] = None
    source_excerpt: Optional[str] = None

class FactCreate(FactBase):
    document_id: int

class FactUpdate(BaseModel):
    normalized_value: Optional[str] = None
    value_json: Optional[Dict[str, Any]] = None
    unit: Optional[str] = None
    event_date: Optional[date] = None
    extraction_status: Optional[str] = None
    verification_status: Optional[str] = None

class FactResponse(FactBase):
    id: int
    patient_id: int
    document_id: int
    document_name: Optional[str] = None
    document_type: Optional[str] = None
    extraction_status: str
    verification_status: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
