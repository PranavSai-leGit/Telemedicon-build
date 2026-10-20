from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
from app.schemas.document import DocumentResponse

class CreateSharingGrantRequest(BaseModel):
    clinician_id: int
    document_ids: List[int]
    expires_in_days: Optional[int] = 30

class SharingGrantResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    clinician_id: int
    clinician_name: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    status: str
    documents: List[DocumentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ClinicianPatientItem(BaseModel):
    patient_id: int
    patient_name: str
    patient_email: str
    shared_document_count: int
    latest_share_date: datetime
    active_grants_count: int
