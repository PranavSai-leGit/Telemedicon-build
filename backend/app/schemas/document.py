from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, Any, Dict, List

class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    uploaded_filename: str
    mime_type: str
    size_bytes: int
    sha256_hash: str
    document_type: str
    processing_status: str
    document_date: Optional[date] = None
    event_date: Optional[date] = None
    uploaded_at: datetime
    extracted_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    extracted_text: Optional[str] = None
    facts_count: int = 0

class ManualStructuredEntry(BaseModel):
    document_type: str
    document_date: Optional[date] = None
    event_date: Optional[date] = None
    medications: List[Dict[str, Any]] = []
    conditions: List[Dict[str, Any]] = []
    lab_tests: List[Dict[str, Any]] = []
    allergies: List[Dict[str, Any]] = []
    notes: Optional[str] = None
