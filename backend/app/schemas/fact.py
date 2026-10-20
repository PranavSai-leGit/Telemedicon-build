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
    type: str  # condition, medication, lab_result, allergy, document, vital
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
    
    # Clinical Prioritization & Normalization Metadata
    is_active: bool = True
    is_abnormal: bool = False
    abnormality_status: Optional[str] = "unknown"
    priority_score: int = 5
    canonical_id: Optional[str] = None
    is_archived: bool = False
    is_temporary: bool = False
    archived_date: Optional[str] = None
    archive_reason: Optional[str] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str  # "Indicated for", "Prescribed for", "Monitored by", "Documented in", "Concurrent in regimen"
    relationship_type: str  # treatment, biomarker_monitoring, provenance, discrepancy_transition, concurrent
    relationship_nature: str = "explicit_documented"  # "explicit_documented" | "biomarker_monitoring" | "inferred"
    status: str = "extracted"  # verified, patient_confirmed, extracted, flagged_discrepancy, inferred
    explanation: Optional[str] = None
    source_document_name: Optional[str] = None
    source_page: Optional[int] = None
    source_excerpt: Optional[str] = None


class RelationshipGraphResponse(BaseModel):
    patient_id: int
    patient_name: str
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    node_counts: Dict[str, int] = {}
    edge_counts: Dict[str, int] = {}
    overview_node_ids: List[str] = []  # Curated subset for initial clean overview
    archived_conditions: List[GraphNode] = []  # Expired/archived temporary conditions sorted chronologically


class LabObservationPoint(BaseModel):
    date: str
    value: float
    unit: str
    abnormality_status: str  # low, normal, high, unknown
    is_abnormal: bool
    reference_range: str
    original_test_name: str
    source_document_name: Optional[str] = None
    source_document_id: Optional[int] = None
    source_page: Optional[int] = None
    source_excerpt: Optional[str] = None
    fact_id: int
    verification_status: str


class CanonicalLabTrendResponse(BaseModel):
    canonical_id: str
    test_name: str
    category: str
    unit: str
    reference_range: str
    latest_value: float
    previous_value: Optional[float] = None
    delta: Optional[float] = None
    latest_date: str
    latest_status: str  # low, normal, high, unknown
    observation_count: int
    data_points: List[LabObservationPoint] = []

