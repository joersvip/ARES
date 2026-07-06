from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from backend.app.models.threat import SeverityLevel

# --- Endpoint Schemas ---
class EndpointBase(BaseModel):
    hostname: str
    ip_address: str
    os_family: str
    agent_version: str
    status: Optional[str] = "offline"

class EndpointCreate(EndpointBase):
    pass

class EndpointUpdate(BaseModel):
    status: Optional[str] = None
    ip_address: Optional[str] = None
    agent_version: Optional[str] = None

class EndpointOut(EndpointBase):
    id: UUID
    last_ping: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Security Alert Schemas ---
class SecurityAlertBase(BaseModel):
    severity: SeverityLevel
    category: str
    message: str
    source_ip: Optional[str] = None
    attack_vector: Optional[str] = None
    is_mitigated: Optional[bool] = False

class SecurityAlertCreate(SecurityAlertBase):
    endpoint_id: Optional[UUID] = None

class SecurityAlertUpdate(BaseModel):
    is_mitigated: Optional[bool] = None

class SecurityAlertOut(SecurityAlertBase):
    id: UUID
    endpoint_id: Optional[UUID] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
