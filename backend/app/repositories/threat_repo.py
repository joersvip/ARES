from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.repositories.base import CRUDBase
from backend.app.models.threat import Endpoint, SecurityAlert, SeverityLevel
from backend.app.schemas.threat import (
    EndpointCreate,
    EndpointUpdate,
    SecurityAlertCreate,
    SecurityAlertUpdate,
)

class CRUDEndpoint(CRUDBase[Endpoint, EndpointCreate, EndpointUpdate]):
    def get_by_hostname(self, db: Session, *, hostname: str) -> Optional[Endpoint]:
        return db.query(Endpoint).filter(Endpoint.hostname == hostname).first()

    def get_active(self, db: Session) -> List[Endpoint]:
        return db.query(Endpoint).filter(Endpoint.status == "active").all()

class CRUDSecurityAlert(CRUDBase[SecurityAlert, SecurityAlertCreate, SecurityAlertUpdate]):
    def get_by_severity(self, db: Session, *, severity: SeverityLevel) -> List[SecurityAlert]:
        return db.query(SecurityAlert).filter(SecurityAlert.severity == severity).all()

    def get_unmitigated(self, db: Session) -> List[SecurityAlert]:
        return db.query(SecurityAlert).filter(SecurityAlert.is_mitigated == False).all()

endpoint_repo = CRUDEndpoint(Endpoint)
alert_repo = CRUDSecurityAlert(SecurityAlert)
