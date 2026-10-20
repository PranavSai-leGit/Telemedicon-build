from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Any, Dict
from app.schemas.fact import FactResponse

class DiscrepancyReviewRequest(BaseModel):
    review_status: str  # confirmed, unresolved, requires_additional_information
    review_note: Optional[str] = None

class DiscrepancyResponse(BaseModel):
    id: int
    patient_id: int
    fact_id_1: Optional[int] = None
    fact_id_2: Optional[int] = None
    discrepancy_type: str
    explanation: str
    review_status: str
    review_note: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    fact_1: Optional[FactResponse] = None
    fact_2: Optional[FactResponse] = None

    model_config = ConfigDict(from_attributes=True)
