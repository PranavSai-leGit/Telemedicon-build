from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.models.enums import DocumentType, ProcessingStatus

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_filename = Column(String(255), nullable=False)
    storage_filename = Column(String(255), nullable=False, unique=True)
    storage_path = Column(String(512), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    document_type = Column(String(50), nullable=False, default=DocumentType.OTHER.value)
    processing_status = Column(String(50), nullable=False, default=ProcessingStatus.PENDING.value)
    extracted_text = Column(Text, nullable=True)
    extracted_data = Column(JSONB, nullable=True)
    document_date = Column(Date, nullable=True)
    event_date = Column(Date, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    patient = relationship("User", back_populates="documents", foreign_keys=[patient_id])
    facts = relationship("ExtractedFact", back_populates="document", cascade="all, delete-orphan")
    sharing_links = relationship("SharingGrantDocument", back_populates="document", cascade="all, delete-orphan")
