from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.models.enums import SharingStatus

class SharingGrant(Base):
    __tablename__ = "sharing_grants"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    clinician_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default=SharingStatus.ACTIVE.value)

    # Relationships
    patient = relationship("User", back_populates="patient_grants", foreign_keys=[patient_id])
    clinician = relationship("User", back_populates="clinician_grants", foreign_keys=[clinician_id])
    shared_documents = relationship("SharingGrantDocument", back_populates="grant", cascade="all, delete-orphan")


class SharingGrantDocument(Base):
    __tablename__ = "sharing_grant_documents"
    __table_args__ = (
        UniqueConstraint("sharing_grant_id", "document_id", name="uq_grant_document"),
    )

    id = Column(Integer, primary_key=True, index=True)
    sharing_grant_id = Column(Integer, ForeignKey("sharing_grants.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    grant = relationship("SharingGrant", back_populates="shared_documents")
    document = relationship("Document", back_populates="sharing_links")
