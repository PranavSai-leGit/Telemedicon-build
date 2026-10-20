from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, Any, Dict, List
from app.schemas.fact import FactResponse

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
    facts_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    extracted_text: Optional[str] = None
    facts_count: int = 0
    facts: List[FactResponse] = []

class ManualStructuredEntry(BaseModel):
    document_type: str
    document_date: Optional[date] = None
    event_date: Optional[date] = None
    medications: List[Dict[str, Any]] = []
    conditions: List[Dict[str, Any]] = []
    lab_tests: List[Dict[str, Any]] = []
    allergies: List[Dict[str, Any]] = []
    notes: Optional[str] = None

class AIConfigRequest(BaseModel):
    gemini_api_key: str
    gemini_model: Optional[str] = "gemini-3.8-flash"

class AIStatusResponse(BaseModel):
    ai_configured: bool
    ai_mode: str
    ai_model: str
    message: str
