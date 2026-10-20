from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(64), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    provider = Column(String(50), nullable=False, default="gemini")
    model_name = Column(String(100), nullable=False)
    operation = Column(String(100), nullable=False, index=True)  # document_extraction, handover_synthesis, verification
    status = Column(String(50), nullable=False, default="success")  # success, failed, fallback, rate_limited
    latency_ms = Column(Float, nullable=False, default=0.0)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(Float, nullable=True)
    claims_count = Column(Integer, default=0)
    average_confidence = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    metadata_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    document = relationship("Document", foreign_keys=[document_id])
