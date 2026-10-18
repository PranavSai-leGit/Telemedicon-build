from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.models.enums import FactType, ExtractionStatus, VerificationStatus

class ExtractedFact(Base):
    __tablename__ = "extracted_facts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    fact_type = Column(String(50), nullable=False, index=True)
    normalized_value = Column(String(255), nullable=False, index=True)
    value_json = Column(JSONB, nullable=False, default=dict)
    unit = Column(String(50), nullable=True)
    event_date = Column(Date, nullable=True, index=True)
    source_page = Column(Integer, nullable=True)
    source_excerpt = Column(Text, nullable=True)
    extraction_status = Column(String(50), nullable=False, default=ExtractionStatus.EXTRACTED.value)
    verification_status = Column(String(50), nullable=False, default=VerificationStatus.UNVERIFIED.value)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    patient = relationship("User", back_populates="extracted_facts", foreign_keys=[patient_id])
    document = relationship("Document", back_populates="facts")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
