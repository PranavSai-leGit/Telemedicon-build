from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.models.enums import DiscrepancyType, DiscrepancyReviewStatus

class Discrepancy(Base):
    __tablename__ = "discrepancies"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fact_id_1 = Column(Integer, ForeignKey("extracted_facts.id", ondelete="SET NULL"), nullable=True)
    fact_id_2 = Column(Integer, ForeignKey("extracted_facts.id", ondelete="SET NULL"), nullable=True)
    discrepancy_type = Column(String(100), nullable=False, default=DiscrepancyType.MEDICATION_CONFLICT.value)
    explanation = Column(Text, nullable=False)
    review_status = Column(String(50), nullable=False, default=DiscrepancyReviewStatus.NEEDS_REVIEW.value)
    review_note = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id])
    fact_1 = relationship("ExtractedFact", foreign_keys=[fact_id_1])
    fact_2 = relationship("ExtractedFact", foreign_keys=[fact_id_2])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
