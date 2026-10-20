import enum

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    CLINICIAN = "clinician"
    ADMINISTRATOR = "administrator"

class DocumentType(str, enum.Enum):
    PRESCRIPTION = "prescription"
    LABORATORY_REPORT = "laboratory_report"
    DISCHARGE_SUMMARY = "discharge_summary"
    OTHER = "other"

class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DUPLICATE = "duplicate"

class FactType(str, enum.Enum):
    CONDITION = "condition"
    MEDICATION = "medication"
    LAB_RESULT = "lab_result"
    ALLERGY = "allergy"
    PROCEDURE = "procedure"
    VITAL = "vital"

class ExtractionStatus(str, enum.Enum):
    EXTRACTED = "extracted"
    PATIENT_CORRECTED = "patient_corrected"
    NEEDS_REVIEW = "needs_review"
    CLINICIAN_VERIFIED = "clinician_verified"

class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED_AGAINST_SOURCE = "verified_against_source"
    CLINICIAN_VERIFIED = "clinician_verified"
    NEEDS_REVIEW = "needs_review"
    CONTRADICTED_BY_SOURCE = "contradicted_by_source"
    REJECTED = "rejected"
    CORRECTED_BY_REVIEWER = "corrected_by_reviewer"
    PATIENT_CONFIRMED = "patient_confirmed"
    DISPUTED = "disputed"

class ConfidenceBand(str, enum.Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    UNAVAILABLE = "Unavailable"

class SharingStatus(str, enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"

class DiscrepancyType(str, enum.Enum):
    MEDICATION_CONFLICT = "medication_conflict"
    DOSAGE_MISMATCH = "dosage_mismatch"
    MISSING_FIELD = "missing_field"
    DATE_AMBIGUITY = "date_ambiguity"

class DiscrepancyReviewStatus(str, enum.Enum):
    NEEDS_REVIEW = "needs_review"
    CONFIRMED = "confirmed"
    UNRESOLVED = "unresolved"
    REQUIRES_ADDITIONAL_INFO = "requires_additional_information"

class AuditOutcome(str, enum.Enum):
    SUCCESS = "success"
    DENIED = "denied"
    FAILED = "failed"
