from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any

class SummaryClaim(BaseModel):
    claim_text: str
    category: str
    supporting_fact_ids: List[int] = []
    is_supported: bool = True  # Verified against DB fact IDs

class StructuredSummaryPayload(BaseModel):
    patient_name: Optional[str] = None
    executive_summary: str
    relevant_history: List[SummaryClaim] = []
    medications: List[SummaryClaim] = []
    allergies: List[SummaryClaim] = []
    laboratory_measurements: List[SummaryClaim] = []
    recent_events: List[SummaryClaim] = []
    missing_information: List[str] = []
    potential_discrepancies: List[str] = []

class GenerateSummaryRequest(BaseModel):
    document_ids: Optional[List[int]] = None  # None means all authorized documents

class SummaryResponse(BaseModel):
    id: int
    patient_id: int
    generated_by: int
    included_document_ids: List[int]
    summary_payload: Dict[str, Any]
    generation_mode: str
    model_identifier: str
    created_at: datetime
    total_claims: int = 0
    supported_claims: int = 0

    class Config:
        from_attributes = True
