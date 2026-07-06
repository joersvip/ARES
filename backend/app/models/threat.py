import enum
from sqlalchemy import Column, String, Boolean, Enum, DateTime, func, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from backend.app.db.base_class import Base

class SeverityLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class Endpoint(Base):
    __tablename__ = "endpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    hostname = Column(String(255), nullable=False, unique=True, index=True)
    ip_address = Column(String(45), nullable=False)
    os_family = Column(String(50), nullable=False)
    agent_version = Column(String(20), nullable=False)
    status = Column(String(50), default="offline")
    last_ping = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    alerts = relationship("SecurityAlert", back_populates="endpoint", cascade="all, delete-orphan")

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    endpoint_id = Column(UUID(as_uuid=True), ForeignKey("endpoints.id", ondelete="SET NULL"), nullable=True)
    severity = Column(Enum(SeverityLevel), nullable=False)
    category = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    source_ip = Column(String(45), nullable=True)
    attack_vector = Column(String(100), nullable=True)
    is_mitigated = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    endpoint = relationship("Endpoint", back_populates="alerts")
