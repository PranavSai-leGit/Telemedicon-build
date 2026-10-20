export type UserRole = 'patient' | 'clinician' | 'administrator';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface SessionResponse {
  user: User;
  csrf_token: string;
  expires_at: string;
  message: string;
}

export interface MedicalDocument {
  id: number;
  patient_id: number;
  uploaded_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256_hash: string;
  document_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate';
  document_date?: string;
  event_date?: string;
  uploaded_at: string;
  extracted_data?: Record<string, any>;
  extracted_text?: string;
  facts_count?: number;
  facts?: ExtractedFact[];
}

export interface AIStatusInfo {
  ai_configured: boolean;
  ai_mode: string;
  ai_model: string;
  message: string;
}

export interface ExtractedFact {
  id: number;
  patient_id: number;
  document_id: number;
  document_name?: string;
  document_type?: string;
  fact_type: 'condition' | 'medication' | 'lab_result' | 'allergy' | 'procedure' | 'vital';
  normalized_value: string;
  value_json: Record<string, any>;
  unit?: string;
  event_date?: string;
  date_precision?: string;
  source_page?: number;
  source_excerpt?: string;
  char_offset_start?: number;
  char_offset_end?: number;
  extraction_status: 'extracted' | 'patient_corrected' | 'needs_review' | 'clinician_verified' | string;
  verification_status: 'unverified' | 'pending_verification' | 'verified_against_source' | 'clinician_verified' | 'needs_review' | 'contradicted_by_source' | 'rejected' | 'corrected_by_reviewer' | 'patient_confirmed' | 'disputed' | string;
  confidence_score?: number;
  confidence_label?: 'High' | 'Medium' | 'Low' | 'Unavailable' | string;
  confidence_breakdown?: {
    evidence_grounding: number;
    evidence_support: number;
    schema_validity: number;
    consistency: number;
    source_quality: number;
  };
  confidence_reasons?: string[];
  confidence_version?: string;
  model_reported_confidence?: number | null;
  reviewer_notes?: string;
  original_extracted_value?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
}

export interface FactConfidenceDetail {
  claim_id: number;
  extracted_value: string;
  entity_type: string;
  system_confidence: {
    score: number;
    label: string;
    meaning: string;
    calibrated: boolean;
    breakdown: {
      evidence_grounding: number;
      evidence_support: number;
      schema_validity: number;
      consistency: number;
      source_quality: number;
    };
    reasons: string[];
  };
  verification_status: string;
  model_reported_confidence?: number | null;
  source_document_id: number;
  source_document_name?: string;
  source_page?: number;
  source_excerpt?: string;
  char_offset_start?: number;
  char_offset_end?: number;
  reviewer_notes?: string;
}

export interface VerificationQueueItem {
  fact_id: number;
  patient_id: number;
  patient_name: string;
  document_id: number;
  document_name: string;
  fact_type: string;
  normalized_value: string;
  value_json: Record<string, any>;
  unit?: string;
  event_date?: string;
  date_precision?: string;
  source_page?: number;
  source_excerpt?: string;
  char_offset_start?: number;
  char_offset_end?: number;
  verification_status: string;
  confidence_score?: number;
  confidence_label?: string;
  confidence_breakdown?: Record<string, number>;
  confidence_reasons?: string[];
  has_discrepancy: boolean;
  reviewer_notes?: string;
  original_extracted_value?: string;
  reviewed_at?: string;
}

export interface AIMonitoringMetrics {
  summary: {
    total_requests: number;
    success_rate_percent: number;
    average_latency_ms: number;
    total_tokens: number;
    estimated_cost_usd: number;
    average_confidence: number;
    provider: string;
    active_model: string;
  };
  provider_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  recent_requests: Array<{
    id: number;
    request_id: string;
    provider: string;
    model_name: string;
    operation: string;
    status: string;
    latency_ms: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
    claims_count: number;
    average_confidence?: number;
    error_message?: string;
    created_at: string;
  }>;
}

export interface Discrepancy {
  id: number;
  patient_id: number;
  fact_id_1?: number;
  fact_id_2?: number;
  discrepancy_type: string;
  explanation: string;
  review_status: 'needs_review' | 'confirmed' | 'unresolved' | 'requires_additional_information';
  review_note?: string;
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  created_at: string;
  fact_1?: ExtractedFact;
  fact_2?: ExtractedFact;
}

export interface SharingGrant {
  id: number;
  patient_id: number;
  patient_name?: string;
  clinician_id: number;
  clinician_name?: string;
  created_at: string;
  expires_at?: string;
  revoked_at?: string;
  status: 'active' | 'revoked' | 'expired';
  documents: MedicalDocument[];
}

export interface SummaryClaim {
  claim_text: string;
  category: string;
  supporting_fact_ids: number[];
  is_supported?: boolean;
}

export interface HealthSummaryPayload {
  patient_name?: string;
  executive_summary: string;
  relevant_history: SummaryClaim[];
  medications: SummaryClaim[];
  allergies: SummaryClaim[];
  laboratory_measurements: SummaryClaim[];
  recent_events: SummaryClaim[];
  missing_information: string[];
  potential_discrepancies: string[];
}

export interface SummaryResponseData {
  id: number;
  patient_id: number;
  generated_by: number;
  included_document_ids: number[];
  summary_payload: HealthSummaryPayload;
  generation_mode: string;
  model_identifier: string;
  created_at: string;
  total_claims: number;
  supported_claims: number;
}

export interface ClinicianPatient {
  patient_id: number;
  patient_name: string;
  patient_email: string;
  shared_document_count: number;
  latest_share_date: string;
  active_grants_count: number;
}

export interface PaginationMetadata {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  has_previous: boolean;
  has_next: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export interface LabTrendPoint {
  date: string;
  value: number;
  unit?: string;
  abnormality_status?: string;
  is_abnormal?: boolean;
  reference_range?: string;
  original_test_name?: string;
  source_document_name?: string;
  source_document_id?: number;
  source_page?: number;
  source_excerpt?: string;
  fact_id: number;
  verification_status: string;
}

export interface LabTrendSeries {
  canonical_id?: string;
  test_name: string;
  category?: string;
  unit: string;
  reference_range: string;
  latest_value?: number;
  previous_value?: number | null;
  delta?: number | null;
  latest_date?: string;
  latest_status?: string;
  observation_count?: number;
  data_points: LabTrendPoint[];
}

export interface AdminStats {
  users: {
    total: number;
    patients: number;
    clinicians: number;
    administrators: number;
    active: number;
  };
  documents: {
    total_processed: number;
    completed: number;
    duplicates_detected: number;
    failed: number;
    by_type: Record<string, number>;
  };
  system_health: {
    status: string;
    database: string;
    storage: string;
    ai_integration: string;
  };
}

export interface AuditEventItem {
  id: number;
  actor_user_id?: number;
  actor_name: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  outcome: string;
  details?: Record<string, any>;
  created_at: string;
}

// Medical Relationship Map Interfaces
export interface GraphNode {
  id: string;
  label: string;
  type: string; // 'condition' | 'medication' | 'lab_result' | 'allergy' | 'document' | 'vital'
  category: string;
  date?: string;
  details: Record<string, any>;
  verification_status: string;
  confidence_score?: number;
  confidence_label?: string;
  document_name?: string;
  document_id?: number;
  source_page?: number;
  source_excerpt?: string;

  // Clinical Prioritization & Normalization Metadata
  is_active?: boolean;
  is_abnormal?: boolean;
  abnormality_status?: string;
  priority_score?: number;
  canonical_id?: string;
  is_archived?: boolean;
  is_temporary?: boolean;
  archived_date?: string;
  archive_reason?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string; // 'Indicated for' | 'Prescribed for' | 'Monitored by' | 'Documented in' | 'Concurrent in regimen'
  relationship_type: string;
  relationship_nature?: 'explicit_documented' | 'biomarker_monitoring' | 'inferred';
  status: string;
  explanation?: string;
  source_document_name?: string;
  source_page?: number;
  source_excerpt?: string;
}

export interface RelationshipGraphResponse {
  patient_id: number;
  patient_name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_counts: Record<string, number>;
  edge_counts: Record<string, number>;
  overview_node_ids?: string[];
  archived_conditions?: GraphNode[];
}

// Clinician Portal Expanded Interfaces
export interface ClinicianDocumentItem {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  uploaded_filename: string;
  document_type: string;
  processing_status: string;
  size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  document_date?: string;
  event_date?: string;
  uploaded_at: string;
  facts_count: number;
}

export interface ClinicianConsentItem {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  status: 'active' | 'revoked' | 'expired';
  document_count: number;
  created_at: string;
  expires_at?: string;
  revoked_at?: string;
}

export interface ClinicianHandoverItem {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  generation_mode: string;
  model_identifier: string;
  created_at: string;
  included_document_ids: number[];
  executive_summary: string;
  relevant_history_count: number;
  medications_count: number;
  discrepancies_count: number;
}

// Admin Portal Expanded Interfaces
export interface AdminDocumentItem {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  uploaded_filename: string;
  document_type: string;
  mime_type: string;
  size_bytes: number;
  sha256_hash: string;
  processing_status: string;
  uploaded_at: string;
  facts_count: number;
}

export interface AdminHealthDetailed {
  status: string;
  timestamp: string;
  database: {
    status: string;
    type: string;
    latency_ms: number | null;
  };
  storage: {
    status: string;
    path: string;
    writable: boolean;
    max_file_size_mb: number;
  };
  ai_engine: {
    status: string;
    configured_model: string;
    mode: string;
  };
  version: string;
}

export interface AdminConfig {
  app_name: string;
  version: string;
  environment: string;
  debug: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
  session_expire_hours: number;
  cors_origins: string[];
  ai_mode: string;
  ai_model: string;
  ai_configured: boolean;
  storage_directory: string;
}

