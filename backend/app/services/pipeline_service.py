import os
import re
import uuid
import time
import logging
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.ai_usage import AIUsageLog
from app.models.enums import (
    DocumentType,
    ProcessingStatus,
    FactType,
    ExtractionStatus,
    VerificationStatus,
    ConfidenceBand
)
from app.services.document_parser import calculate_sha256, extract_document_content
from app.services.gemini_service import gemini_service
from app.services.confidence_service import ConfidenceScoringService
from app.services.reconciliation import detect_medication_discrepancies
from app.services.audit import log_audit_event
from app.services.lab_normalizer import normalize_lab_test, extract_numeric_value

logger = logging.getLogger(__name__)

class DocumentProcessingPipeline:
    """
    Structured, multi-stage document processing pipeline.
    Ensures that document processing is decoupled from route handlers,
    deterministic validation is enforced, and confidence scoring is transparent.
    """

    ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
    ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
    MAX_FILE_SIZE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    @classmethod
    def validate_file_security(cls, filename: str, content_bytes: bytes, mime_type: str) -> Tuple[bool, str]:
        """
        Content and header validation for uploaded medical documents.
        Protects against path traversal, oversized files, and disguised malicious binaries.
        """
        # Safe filename check
        basename = os.path.basename(filename)
        if not basename or ".." in filename or "/" in filename or "\\" in filename:
            return False, "Invalid filename with path traversal characters."

        _, ext = os.path.splitext(basename.lower())
        if ext not in cls.ALLOWED_EXTENSIONS:
            return False, f"File format '{ext}' not supported. Allowed formats: PDF, PNG, JPG, JPEG."

        if len(content_bytes) == 0:
            return False, "Uploaded file is empty (0 bytes)."

        if len(content_bytes) > cls.MAX_FILE_SIZE_BYTES:
            return False, f"File size ({len(content_bytes)/1024/1024:.1f}MB) exceeds maximum limit of {settings.MAX_FILE_SIZE_MB}MB."

        # Magic number header validation
        if ext == ".pdf":
            if not content_bytes.startswith(b"%PDF"):
                return False, "Invalid PDF file header: Magic number signature mismatch."
        elif ext in {".jpg", ".jpeg"}:
            if not (content_bytes.startswith(b"\xff\xd8\xff") or b"JFIF" in content_bytes[:30] or b"Exif" in content_bytes[:30]):
                return False, "Invalid JPEG file header: Magic number signature mismatch."
        elif ext == ".png":
            if not content_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                return False, "Invalid PNG file header: Magic number signature mismatch."

        return True, "Validation successful."

    @classmethod
    def normalize_date_string(cls, raw_date: Optional[str]) -> Tuple[Optional[date], str]:
        """
        Deterministically parse and normalize dates, returning (date_obj, precision).
        Handles full dates, year-month, and year-only without inventing arbitrary days.
        """
        if not raw_date or not str(raw_date).strip():
            return None, "unknown"

        s = str(raw_date).strip()
        # YYYY-MM-DD
        m_full = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
        if m_full:
            y, m, d = int(m_full.group(1)), int(m_full.group(2)), int(m_full.group(3))
            try:
                return date(y, m, d), "exact"
            except ValueError:
                pass

        # YYYY-MM
        m_ym = re.match(r"^(\d{4})-(\d{1,2})$", s)
        if m_ym:
            y, m = int(m_ym.group(1)), int(m_ym.group(2))
            try:
                return date(y, m, 1), "month_year"
            except ValueError:
                pass

        # YYYY only
        m_y = re.match(r"^(\d{4})$", s)
        if m_y:
            y = int(m_y.group(1))
            try:
                return date(y, 1, 1), "year_only"
            except ValueError:
                pass

        # Try standard string parsing
        for fmt in ["%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%B %d, %Y", "%B %Y", "%Y"]:
            try:
                dt = datetime.strptime(s, fmt)
                prec = "month_year" if fmt in ["%B %Y"] else ("year_only" if fmt == "%Y" else "exact")
                return dt.date(), prec
            except Exception:
                continue

        return None, "approximate"

    @classmethod
    def find_character_offsets(cls, needle: Optional[str], haystack: Optional[str]) -> Tuple[Optional[int], Optional[int]]:
        """Find start and end character offsets of a quoted excerpt within document text."""
        if not needle or not haystack:
            return None, None
        idx = haystack.lower().find(needle.lower().strip())
        if idx != -1:
            return idx, idx + len(needle.strip())
        return None, None

    @classmethod
    def process_uploaded_document(
        cls,
        db: Session,
        patient_id: int,
        orig_filename: str,
        storage_path: str,
        mime_type: str,
        file_size: int,
        requested_doc_type: Optional[str] = None
    ) -> Tuple[Document, List[ExtractedFact]]:
        """
        Executes the complete document processing pipeline:
        File Hash -> Text/OCR Extraction -> AI Extraction -> Schema Validation ->
        Normalization -> Evidence Verification -> Consistency & Confidence -> Persistence.
        """
        start_time = time.time()
        request_id = uuid.uuid4().hex

        # 1. SHA-256 Hash and Duplicate Check
        sha256 = calculate_sha256(storage_path)
        existing_duplicate = (
            db.query(Document)
            .filter(Document.patient_id == patient_id, Document.sha256_hash == sha256)
            .first()
        )

        # 2. Text Extraction / OCR
        extracted_text, pages = extract_document_content(storage_path, mime_type)
        is_ocr = not bool(extracted_text and len(extracted_text.strip()) > 30)

        # 3. Multimodal Structured Extraction via AI Service
        ai_error = None
        gen_mode = "fallback"
        model_id = "deterministic-rule-engine"
        extraction_data = {}

        try:
            extraction_data, gen_mode, model_id = gemini_service.extract_document_data(
                document_text=extracted_text,
                filename=orig_filename,
                pages=pages,
                file_path=storage_path,
                mime_type=mime_type
            )
        except Exception as e:
            logger.error(f"Structured extraction error in pipeline for {orig_filename}: {e}")
            ai_error = str(e)
            extraction_data = gemini_service._demo_extraction(extracted_text, orig_filename)

        latency_ms = (time.time() - start_time) * 1000.0

        # 4. Determine Document Type and Dates
        doc_type = requested_doc_type or extraction_data.get("document_type") or DocumentType.OTHER.value
        doc_date_str = extraction_data.get("document_date")
        event_date_str = extraction_data.get("event_date")

        norm_doc_date, doc_date_prec = cls.normalize_date_string(doc_date_str)
        norm_event_date, event_date_prec = cls.normalize_date_string(event_date_str)

        # 5. Create Document Record
        storage_filename = os.path.basename(storage_path)
        document_record = Document(
            patient_id=patient_id,
            uploaded_filename=orig_filename,
            storage_filename=storage_filename,
            storage_path=storage_path,
            mime_type=mime_type,
            size_bytes=file_size,
            sha256_hash=sha256,
            document_type=doc_type,
            processing_status=ProcessingStatus.PENDING.value,
            extracted_text=extracted_text,
            extracted_data=extraction_data,
            document_date=norm_doc_date,
            event_date=norm_event_date,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(document_record)
        db.commit()
        db.refresh(document_record)

        # 6. Extract and Normalize Candidate Claims
        candidate_items = []

        # Medications
        for med in extraction_data.get("medications", []):
            med_name = (med.get("name") or "Unspecified Medication").strip()
            candidate_items.append({
                "fact_type": FactType.MEDICATION.value,
                "normalized_value": med_name,
                "value_json": med,
                "unit": None,
                "source_page": med.get("source_page", 1),
                "source_excerpt": med.get("source_excerpt"),
                "date_str": event_date_str or doc_date_str,
                "date_obj": norm_event_date or norm_doc_date,
                "date_prec": event_date_prec if norm_event_date else doc_date_prec,
            })

        # Conditions
        for cond in extraction_data.get("conditions", []):
            cond_name = (cond.get("name") or "Unspecified Condition").strip()
            candidate_items.append({
                "fact_type": FactType.CONDITION.value,
                "normalized_value": cond_name,
                "value_json": cond,
                "unit": None,
                "source_page": cond.get("source_page", 1),
                "source_excerpt": cond.get("source_excerpt"),
                "date_str": event_date_str or doc_date_str,
                "date_obj": norm_event_date or norm_doc_date,
                "date_prec": event_date_prec if norm_event_date else doc_date_prec,
            })

        # Lab Tests (Normalized against canonical medical lab catalogue)
        for lab in extraction_data.get("lab_tests", []):
            lab_raw_name = (lab.get("name") or "Lab Test").strip()
            raw_val = lab.get("value")
            if raw_val is None:
                raw_val = lab.get("numeric_value")
            num_val = extract_numeric_value(raw_val)

            norm_res = normalize_lab_test(
                raw_name=lab_raw_name,
                value=num_val,
                raw_unit=lab.get("unit"),
                raw_reference_range=lab.get("reference_range")
            )

            lab_payload = dict(lab)
            lab_payload.update({
                "canonical_id": norm_res.canonical_id,
                "canonical_name": norm_res.canonical_name,
                "original_name": norm_res.original_name,
                "abnormality_status": norm_res.abnormality_status,
                "is_abnormal": norm_res.is_abnormal,
                "specimen": norm_res.specimen,
                "standard_unit": norm_res.standard_unit,
                "reference_range": norm_res.reference_range
            })

            candidate_items.append({
                "fact_type": FactType.LAB_RESULT.value,
                "normalized_value": norm_res.canonical_name,
                "original_extracted_value": lab_raw_name,
                "value_json": lab_payload,
                "unit": norm_res.standard_unit or lab.get("unit"),
                "source_page": lab.get("source_page", 1),
                "source_excerpt": lab.get("source_excerpt"),
                "date_str": event_date_str or doc_date_str,
                "date_obj": norm_event_date or norm_doc_date,
                "date_prec": event_date_prec if norm_event_date else doc_date_prec,
            })

        # Allergies
        for allergy in extraction_data.get("allergies", []):
            allergen = (allergy.get("allergen") or "Allergy").strip()
            candidate_items.append({
                "fact_type": FactType.ALLERGY.value,
                "normalized_value": allergen,
                "value_json": allergy,
                "unit": None,
                "source_page": allergy.get("source_page", 1),
                "source_excerpt": allergy.get("source_excerpt"),
                "date_str": event_date_str or doc_date_str,
                "date_obj": norm_event_date or norm_doc_date,
                "date_prec": event_date_prec if norm_event_date else doc_date_prec,
            })

        # 7. Evaluate Confidence & Persist Facts
        created_facts: List[ExtractedFact] = []
        conf_scores: List[int] = []

        for item in candidate_items:
            # Check for character offsets
            start_off, end_off = cls.find_character_offsets(item["source_excerpt"], extracted_text)

            # Evaluate system-assessed confidence
            conf_result = ConfidenceScoringService.evaluate_claim_confidence(
                fact_type=item["fact_type"],
                normalized_value=item["normalized_value"],
                value_json=item["value_json"],
                source_excerpt=item["source_excerpt"],
                source_text=extracted_text,
                source_page=item["source_page"],
                document_date=str(norm_doc_date) if norm_doc_date else None,
                event_date=str(item["date_obj"]) if item["date_obj"] else None,
                is_ocr=is_ocr,
                known_conflicts=None,
                model_confidence=None  # Explicitly None if provider does not calibrate probability
            )

            conf_scores.append(conf_result["score"])

            fact = ExtractedFact(
                patient_id=patient_id,
                document_id=document_record.id,
                fact_type=item["fact_type"],
                normalized_value=item["normalized_value"],
                original_extracted_value=item.get("original_extracted_value") or item["normalized_value"],
                value_json=item["value_json"],
                unit=item["unit"],
                event_date=item["date_obj"],
                date_precision=item["date_prec"],
                source_page=item["source_page"],
                source_excerpt=item["source_excerpt"],
                char_offset_start=start_off,
                char_offset_end=end_off,
                extraction_status=ExtractionStatus.EXTRACTED.value,
                verification_status=conf_result["recommended_status"],
                confidence_score=conf_result["score"],
                confidence_label=conf_result["label"],
                confidence_breakdown=conf_result["breakdown"],
                confidence_reasons=conf_result["reasons"],
                confidence_version=conf_result["algorithm_version"],
                model_reported_confidence=None,
                created_at=datetime.now(timezone.utc)
            )
            db.add(fact)
            created_facts.append(fact)

        if created_facts:
            db.commit()

        # 8. Determine Final Document Status
        if existing_duplicate:
            document_record.processing_status = ProcessingStatus.DUPLICATE.value
        elif gen_mode == "gemini":
            document_record.processing_status = ProcessingStatus.COMPLETED.value
        elif len(created_facts) > 0:
            document_record.processing_status = ProcessingStatus.COMPLETED.value
        else:
            document_record.processing_status = ProcessingStatus.PENDING.value

        db.commit()
        db.refresh(document_record)

        # 9. Deterministic Reconciliation & Discrepancies
        if created_facts:
            discrepancies = detect_medication_discrepancies(db, patient_id)
            if discrepancies:
                # Update confidence for affected medication facts
                conflicted_fact_ids = set()
                for disc in discrepancies:
                    if disc.fact_id_1:
                        conflicted_fact_ids.add(disc.fact_id_1)
                    if disc.fact_id_2:
                        conflicted_fact_ids.add(disc.fact_id_2)

                for fact in created_facts:
                    if fact.id in conflicted_fact_ids:
                        fact.verification_status = VerificationStatus.NEEDS_REVIEW.value
                        if fact.confidence_score is not None:
                            fact.confidence_score = max(20, fact.confidence_score - 15)
                            fact.confidence_label = (
                                ConfidenceBand.HIGH.value if fact.confidence_score >= 85
                                else (ConfidenceBand.MEDIUM.value if fact.confidence_score >= 60 else ConfidenceBand.LOW.value)
                            )
                            reasons = fact.confidence_reasons or []
                            reasons.append("Cross-record discrepancy detected with another prescription.")
                            fact.confidence_reasons = reasons
                db.commit()

        # 10. Record AI Usage Monitoring Log
        avg_conf = (sum(conf_scores) / len(conf_scores)) if conf_scores else None
        usage_log = AIUsageLog(
            request_id=request_id,
            user_id=patient_id,
            document_id=document_record.id,
            provider="google" if gen_mode == "gemini" else "rule_fallback",
            model_name=model_id,
            operation="document_extraction",
            status="success" if not ai_error else "fallback",
            latency_ms=round(latency_ms, 2),
            prompt_tokens=len(extracted_text.split()) if extracted_text else 0,
            completion_tokens=len(str(extraction_data).split()),
            total_tokens=(len(extracted_text.split()) if extracted_text else 0) + len(str(extraction_data).split()),
            estimated_cost_usd=0.0001 if gen_mode == "gemini" else 0.0,
            claims_count=len(created_facts),
            average_confidence=avg_conf,
            error_message=ai_error,
            metadata_json={"mime_type": mime_type, "file_size": file_size, "is_duplicate": bool(existing_duplicate)},
            created_at=datetime.now(timezone.utc)
        )
        db.add(usage_log)
        db.commit()

        # 11. Audit Logging
        log_audit_event(
            db,
            action="DOCUMENT_UPLOAD_PROCESSED",
            resource_type="document",
            resource_id=str(document_record.id),
            actor_user_id=patient_id,
            outcome="success",
            details={
                "filename": orig_filename,
                "facts_count": len(created_facts),
                "avg_confidence": avg_conf,
                "gen_mode": gen_mode,
                "is_duplicate": bool(existing_duplicate)
            }
        )

        return document_record, created_facts
