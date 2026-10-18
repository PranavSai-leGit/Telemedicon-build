from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.models.enums import UserRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.PATIENT.value)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="patient", foreign_keys="Document.patient_id", cascade="all, delete-orphan")
    extracted_facts = relationship("ExtractedFact", back_populates="patient", foreign_keys="ExtractedFact.patient_id", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="patient", foreign_keys="Summary.patient_id", cascade="all, delete-orphan")
    
    # Sharing grants where this user is the patient
    patient_grants = relationship("SharingGrant", back_populates="patient", foreign_keys="SharingGrant.patient_id", cascade="all, delete-orphan")
    # Sharing grants where this user is the clinician
    clinician_grants = relationship("SharingGrant", back_populates="clinician", foreign_keys="SharingGrant.clinician_id")
