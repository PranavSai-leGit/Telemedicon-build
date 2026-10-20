import re
from typing import Dict, Any, List, Optional, Tuple
from app.models.enums import ConfidenceBand, VerificationStatus

class ConfidenceWeights:
    MAX_GROUNDING = 40
    MAX_SUPPORT = 25
    MAX_VALIDITY = 15
    MAX_CONSISTENCY = 15
    MAX_SOURCE_QUALITY = 5

    HIGH_THRESHOLD = 85
    MEDIUM_THRESHOLD = 60

class ConfidenceScoringService:
    """
    Transparent, explainable, and deterministic extraction confidence scoring engine.
    Calculates a 0-100 score based on 5 verifiable dimensions:
    1. Evidence Grounding (0-40)
    2. Evidence Support Verification (0-25)
    3. Structural & Field Validity (0-15)
    4. Deterministic Consistency (0-15)
    5. Source Document Quality (0-5)
    """

    ALGORITHM_VERSION = "v1.0-heuristic"

    @classmethod
    def evaluate_claim_confidence(
        cls,
        fact_type: str,
        normalized_value: str,
        value_json: Dict[str, Any],
        source_excerpt: Optional[str],
        source_text: Optional[str],
        source_page: Optional[int],
        document_date: Optional[str],
        event_date: Optional[str],
        is_ocr: bool = False,
        known_conflicts: Optional[List[str]] = None,
        model_confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        breakdown = {
            "evidence_grounding": 0,
            "evidence_support": 0,
            "schema_validity": 0,
            "consistency": 0,
            "source_quality": 0,
        }
        reasons: List[str] = []
        is_contradicted = False
        has_evidence = False

        norm_val_clean = (normalized_value or "").strip().lower()
        excerpt_clean = (source_excerpt or "").strip()
        doc_text_clean = (source_text or "").strip()

        # ========================================================
        # 1. Evidence Grounding (0-40 points)
        # ========================================================
        if not excerpt_clean:
            reasons.append("Missing source excerpt: Claim lacks direct quotation from document.")
            breakdown["evidence_grounding"] = 0
        else:
            has_evidence = True
            grounding_points = 0
            # Check 1a: Excerpt length & substance
            if len(excerpt_clean) >= 10:
                grounding_points += 15
                reasons.append("Verifiable quotation provided from source document.")
            else:
                grounding_points += 5
                reasons.append("Very short source excerpt provided.")

            # Check 1b: Is excerpt present in full document text?
            if doc_text_clean:
                # Normalize spaces and compare
                norm_doc = re.sub(r'\s+', ' ', doc_text_clean.lower())
                norm_exc = re.sub(r'\s+', ' ', excerpt_clean.lower())
                if norm_exc in norm_doc:
                    grounding_points += 20
                    reasons.append("Source passage verified exactly in document text.")
                else:
                    # Fuzzy / partial token overlap (useful for OCR imperfect text)
                    exc_words = set(re.findall(r'\w+', norm_exc))
                    doc_words = set(re.findall(r'\w+', norm_doc))
                    if exc_words and len(exc_words.intersection(doc_words)) / len(exc_words) > 0.6:
                        grounding_points += 12
                        reasons.append("Substantial token overlap verified with document text.")
                    else:
                        grounding_points += 5
                        reasons.append("Excerpt differs somewhat from extracted digital text (possible OCR variation).")
            else:
                # Scanned image with no digital OCR text: excerpt was provided by multimodal model
                grounding_points += 15
                reasons.append("Quoted passage extracted directly from image document.")

            # Check 1c: Page coordinate
            if source_page is not None and source_page >= 1:
                grounding_points += 5
                reasons.append(f"Linked to document page {source_page}.")

            breakdown["evidence_grounding"] = min(ConfidenceWeights.MAX_GROUNDING, grounding_points)

        # ========================================================
        # 2. Evidence Support Verification (0-25 points)
        # ========================================================
        if not has_evidence:
            breakdown["evidence_support"] = 0
            reasons.append("No supporting passage available to verify claim.")
        else:
            support_points = 0
            exc_lower = excerpt_clean.lower()

            # Check 2a: Normalized value in excerpt
            if norm_val_clean and norm_val_clean in exc_lower:
                support_points += 15
                reasons.append(f"Primary entity '{normalized_value}' directly found in quoted passage.")
            elif norm_val_clean:
                # Check for root/token match
                tokens = [t for t in re.findall(r'[a-zA-Z0-9]+', norm_val_clean) if len(t) > 2]
                matched_tokens = [t for t in tokens if t in exc_lower]
                if tokens and len(matched_tokens) / len(tokens) >= 0.5:
                    support_points += 10
                    reasons.append(f"Key terms for '{normalized_value}' present in quoted passage.")
                else:
                    support_points += 2
                    reasons.append(f"Entity name '{normalized_value}' not clearly mentioned in quoted excerpt.")

            # Check 2b: Entity-specific attributes support
            if fact_type == "medication":
                dosage = (value_json.get("dosage") or "").lower()
                frequency = (value_json.get("frequency") or "").lower()
                if dosage and dosage in exc_lower:
                    support_points += 5
                    reasons.append(f"Dosage '{dosage}' confirmed in source excerpt.")
                elif dosage:
                    reasons.append(f"Dosage '{dosage}' not explicitly found in excerpt.")
                if frequency and any(freq_term in exc_lower for freq_term in ["daily", "od", "bid", "tid", "twice", "once", "hours", "prn"]):
                    support_points += 5
                    reasons.append("Administration frequency confirmed in excerpt.")

            elif fact_type == "lab_result":
                val = value_json.get("value")
                unit = value_json.get("unit")
                if val is not None and str(val) in exc_lower:
                    support_points += 5
                    reasons.append(f"Lab numerical value '{val}' confirmed in source passage.")
                if unit and unit.lower() in exc_lower:
                    support_points += 5
                    reasons.append(f"Lab unit '{unit}' confirmed in source passage.")

            elif fact_type == "allergy":
                allergen = (value_json.get("allergen") or normalized_value).lower()
                if allergen in exc_lower:
                    support_points += 10
                    reasons.append(f"Allergen '{allergen}' confirmed in excerpt.")

            else:
                # General condition or procedure
                if support_points < 15:
                    support_points += 5

            # Contradiction check: Check for negations or contraindications
            negation_patterns = [
                rf"no\s+{re.escape(norm_val_clean)}",
                rf"denies\s+{re.escape(norm_val_clean)}",
                rf"ruled\s+out\s+{re.escape(norm_val_clean)}",
                rf"negative\s+for\s+{re.escape(norm_val_clean)}",
                rf"discontinued\s+{re.escape(norm_val_clean)}",
            ]
            for pat in negation_patterns:
                if re.search(pat, exc_lower):
                    is_contradicted = True
                    support_points = 0
                    reasons.append(f"Potential contradiction: Negation pattern detected in source for '{normalized_value}'.")
                    break

            breakdown["evidence_support"] = min(ConfidenceWeights.MAX_SUPPORT, support_points)

        # ========================================================
        # 3. Structural & Field Validity (0-15 points)
        # ========================================================
        validity_points = 0
        valid_fact_types = {"condition", "medication", "lab_result", "allergy", "procedure", "vital"}

        if fact_type in valid_fact_types:
            validity_points += 5
        else:
            reasons.append(f"Non-standard entity type '{fact_type}'.")

        if normalized_value and len(normalized_value.strip()) >= 2:
            validity_points += 5
        else:
            reasons.append("Extracted entity value is empty or too short.")

        # Date representation validation
        if event_date:
            try:
                # Must be ISO date YYYY-MM-DD
                parts = event_date.split("-")
                if len(parts) == 3 and 1900 <= int(parts[0]) <= 2100:
                    validity_points += 5
                    reasons.append(f"Event date format validated ({event_date}).")
                else:
                    validity_points += 2
                    reasons.append(f"Non-standard date format '{event_date}'.")
            except Exception:
                validity_points += 2
        else:
            # Missing date is not fatal for medication/condition names
            validity_points += 2
            reasons.append("Event date is unspecified in document.")

        breakdown["schema_validity"] = min(ConfidenceWeights.MAX_VALIDITY, validity_points)

        # ========================================================
        # 4. Consistency Checks (0-15 points)
        # ========================================================
        consistency_points = 15
        if known_conflicts:
            for conflict in known_conflicts:
                consistency_points -= 5
                reasons.append(f"Clinical discrepancy flagged: {conflict}")
            consistency_points = max(0, consistency_points)
        else:
            reasons.append("No conflicting historical records detected.")

        # Temporal chronology sanity check
        if event_date and document_date:
            try:
                if event_date > document_date:
                    consistency_points = max(0, consistency_points - 4)
                    reasons.append(f"Event date ({event_date}) is after document date ({document_date}).")
            except Exception:
                pass

        breakdown["consistency"] = min(ConfidenceWeights.MAX_CONSISTENCY, consistency_points)

        # ========================================================
        # 5. Source Document Quality (0-5 points)
        # ========================================================
        quality_points = 0
        if not is_ocr:
            quality_points += 5
            reasons.append("High fidelity digital document format.")
        else:
            quality_points += 3
            reasons.append("Scanned document / OCR processed.")

        breakdown["source_quality"] = min(ConfidenceWeights.MAX_SOURCE_QUALITY, quality_points)

        # ========================================================
        # Total Raw Score & Hard Caps / Rejections
        # ========================================================
        raw_score = sum(breakdown.values())

        # Hard Cap 1: Missing evidence caps score at 35 (Low)
        if not has_evidence:
            raw_score = min(raw_score, 35)

        # Hard Cap 2: Contradicted claim caps score at 15
        if is_contradicted:
            raw_score = min(raw_score, 15)

        # Hard Cap 3: Unacceptable schema caps score at 30
        if breakdown["schema_validity"] < 8:
            raw_score = min(raw_score, 30)

        final_score = max(0, min(100, int(round(raw_score))))

        # Determine band
        if final_score >= ConfidenceWeights.HIGH_THRESHOLD:
            label = ConfidenceBand.HIGH.value
        elif final_score >= ConfidenceWeights.MEDIUM_THRESHOLD:
            label = ConfidenceBand.MEDIUM.value
        else:
            label = ConfidenceBand.LOW.value

        # Verification status recommendation
        if is_contradicted:
            rec_status = VerificationStatus.CONTRADICTED_BY_SOURCE.value
        elif known_conflicts or final_score < ConfidenceWeights.MEDIUM_THRESHOLD or not has_evidence:
            rec_status = VerificationStatus.NEEDS_REVIEW.value
        else:
            rec_status = VerificationStatus.PENDING_VERIFICATION.value

        return {
            "score": final_score,
            "label": label,
            "meaning": "Deterministic heuristic extraction-confidence score",
            "calibrated": False,
            "breakdown": breakdown,
            "reasons": reasons,
            "algorithm_version": cls.ALGORITHM_VERSION,
            "recommended_status": rec_status,
            "is_contradicted": is_contradicted,
            "has_evidence": has_evidence,
            "model_reported_confidence": model_confidence
        }
