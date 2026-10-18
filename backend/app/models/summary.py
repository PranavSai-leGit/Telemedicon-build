from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    included_document_ids = Column(JSONB, nullable=False, default=list)
    summary_payload = Column(JSONB, nullable=False, default=dict)
    generation_mode = Column(String(50), nullable=False, default="auto")  # "gemini", "demo", "manual"
    model_identifier = Column(String(100), nullable=False, default="gemini-3.8-flash")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    patient = relationship("User", back_populates="summaries", foreign_keys=[patient_id])
    generator = relationship("User", foreign_keys=[generated_by])
