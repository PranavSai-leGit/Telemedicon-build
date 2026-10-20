from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, Any, Dict, List

class FactBase(BaseModel):
    fact_type: str
    normalized_value: str
    value_json: Dict[str, Any] = {}
    unit: Optional[str] = None
    event_date: Optional[date] = None
    date_precision: Optional[str] = "exact"
    source_page: Optional[int] = None
    source_excerpt: Optional[str] = None
    char_offset_start: Optional[int] = None
    char_offset_end: Optional[int] = None

class FactCreate(FactBase):
    document_id: int

class FactUpdate(BaseModel):
    normalized_value: Optional[str] = None
    value_json: Optional[Dict[str, Any]] = None
    unit: Optional[str] = None
    event_date: Optional[date] = None
    extraction_status: Optional[str] = None
    verification_status: Optional[str] = None
    reviewer_notes: Optional[str] = None

class FactVerificationRequest(BaseModel):
    verification_status: str  # verified_against_source, needs_review, rejected, corrected_by_reviewer
    reviewer_notes: Optional[str] = None
    corrected_value: Optional[str] = None

class FactConfidenceDetailResponse(BaseModel):
    claim_id: int
    extracted_value: str
    entity_type: str
    system_confidence: Dict[str, Any]
    verification_status: str
    model_reported_confidence: Optional[float] = None
    source_document_id: int
    source_document_name: Optional[str] = None
    source_page: Optional[int] = None
    source_excerpt: Optional[str] = None
    char_offset_start: Optional[int] = None
    char_offset_end: Optional[int] = None

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
    reviewer_notes: Optional[str] = None
    original_extracted_value: Optional[str] = None

    # Confidence Scoring Fields
    confidence_score: Optional[int] = None
    confidence_label: Optional[str] = None
    confidence_breakdown: Optional[Dict[str, Any]] = None
    confidence_reasons: Optional[List[str]] = None
    confidence_version: Optional[str] = None
    model_reported_confidence: Optional[float] = None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # condition, medication, lab_result, allergy, document
    category: str
    date: Optional[str] = None
    details: Dict[str, Any] = {}
    verification_status: str = "unverified"
    confidence_score: Optional[int] = None
    confidence_label: Optional[str] = None
    document_name: Optional[str] = None
    document_id: Optional[int] = None
    source_page: Optional[int] = None
    source_excerpt: Optional[str] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str  # "Prescribed for", "Monitored by", "Documented in", "Supersedes previous prescription", "Dosage mismatch"
    relationship_type: str
    status: str = "extracted"  # verified, patient_confirmed, extracted, flagged_discrepancy
    explanation: Optional[str] = None


class RelationshipGraphResponse(BaseModel):
    patient_id: int
    patient_name: str
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    node_counts: Dict[str, int] = {}
    edge_counts: Dict[str, int] = {}
