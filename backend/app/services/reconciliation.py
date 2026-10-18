from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from app.models.fact import ExtractedFact
from app.models.discrepancy import Discrepancy
from app.models.document import Document
from app.models.enums import DiscrepancyType, DiscrepancyReviewStatus
import logging

logger = logging.getLogger(__name__)

def detect_medication_discrepancies(db: Session, patient_id: int) -> List[Discrepancy]:
    """
    Scan normalized medication facts for potential contradictions, dosage discrepancies,
    or overlapping contradictory instructions across dates.
    """
    med_facts = (
        db.query(ExtractedFact)
        .filter(
            ExtractedFact.patient_id == patient_id,
            ExtractedFact.fact_type == "medication"
        )
        .order_by(ExtractedFact.event_date.desc().nullslast(), ExtractedFact.created_at.desc())
        .all()
    )

    created_discrepancies = []
    
    # Group by base medication name (e.g. Metformin)
    med_groups = {}
    for fact in med_facts:
        base_name = fact.normalized_value.lower().split()[0]
        if base_name not in med_groups:
            med_groups[base_name] = []
        med_groups[base_name].append(fact)

    for base_name, group in med_groups.items():
        if len(group) >= 2:
            # Compare facts in the group
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    f1 = group[i]
                    f2 = group[j]
                    
                    # Check if dosage or frequency differs
                    dose1 = (f1.value_json or {}).get("dosage", "")
                    dose2 = (f2.value_json or {}).get("dosage", "")
                    freq1 = (f1.value_json or {}).get("frequency", "")
                    freq2 = (f2.value_json or {}).get("frequency", "")

                    if (dose1 and dose2 and dose1 != dose2) or (freq1 and freq2 and freq1 != freq2):
                        # Check if a discrepancy already exists for this pair
                        existing = (
                            db.query(Discrepancy)
                            .filter(
                                Discrepancy.patient_id == patient_id,
                                (
                                    ((Discrepancy.fact_id_1 == f1.id) & (Discrepancy.fact_id_2 == f2.id)) |
                                    ((Discrepancy.fact_id_1 == f2.id) & (Discrepancy.fact_id_2 == f1.id))
                                )
                            )
                            .first()
                        )
                        if not existing:
                            d1_date = f1.event_date.strftime('%Y-%m-%d') if f1.event_date else 'Date unrecorded'
                            d2_date = f2.event_date.strftime('%Y-%m-%d') if f2.event_date else 'Date unrecorded'
                            
                            explanation = (
                                f"Potential discrepancy — review required. "
                                f"Record 1 ({d1_date}) specifies '{f1.normalized_value}: {dose1} {freq1}'. "
                                f"Record 2 ({d2_date}) specifies '{f2.normalized_value}: {dose2} {freq2}'. "
                                f"Confirm whether this represents an intentional dosage adjustment or contradictory instruction."
                            )
                            
                            disc = Discrepancy(
                                patient_id=patient_id,
                                fact_id_1=f1.id,
                                fact_id_2=f2.id,
                                discrepancy_type=DiscrepancyType.DOSAGE_MISMATCH.value,
                                explanation=explanation,
                                review_status=DiscrepancyReviewStatus.NEEDS_REVIEW.value,
                                created_at=datetime.now(timezone.utc)
                            )
                            db.add(disc)
                            created_discrepancies.append(disc)

    if created_discrepancies:
        db.commit()
        for d in created_discrepancies:
            db.refresh(d)

    return created_discrepancies
