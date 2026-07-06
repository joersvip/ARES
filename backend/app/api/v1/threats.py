from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.app.api import deps
from backend.app.models.user import UserRole
from backend.app.repositories.threat_repo import endpoint_repo, alert_repo
from backend.app.schemas.threat import (
    EndpointOut,
    EndpointCreate,
    EndpointUpdate,
    SecurityAlertOut,
    SecurityAlertCreate,
    SecurityAlertUpdate,
)

router = APIRouter()

# --- Endpoint Management ---

@router.get("/endpoints", response_model=List[EndpointOut])
def read_endpoints(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: Any = Depends(deps.RoleChecker([UserRole.USER, UserRole.ANALYST, UserRole.ADMIN]))
) -> Any:
    """
    Retrieve registered monitoring endpoints. Accessible by any authenticated user.
    """
    return endpoint_repo.get_multi(db, skip=skip, limit=limit)

@router.post("/endpoints", response_model=EndpointOut, status_code=status.HTTP_201_CREATED)
def create_endpoint(
    *,
    db: Session = Depends(deps.get_db),
    endpoint_in: EndpointCreate,
    current_user: Any = Depends(deps.RoleChecker([UserRole.ANALYST, UserRole.ADMIN]))
) -> Any:
    """
    Register a new monitored endpoint. Restricted to Security Analysts and Admins.
    """
    existing_endpoint = endpoint_repo.get_by_hostname(db, hostname=endpoint_in.hostname)
    if existing_endpoint:
        raise HTTPException(
            status_code=400,
            detail="An endpoint with this hostname already exists.",
        )
    return endpoint_repo.create(db, obj_in=endpoint_in)


# --- Threat / Security Alerts ---

@router.get("/alerts", response_model=List[SecurityAlertOut])
def read_alerts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: Any = Depends(deps.RoleChecker([UserRole.USER, UserRole.ANALYST, UserRole.ADMIN]))
) -> Any:
    """
    Retrieve security alerts. Accessible by any authenticated user.
    """
    return alert_repo.get_multi(db, skip=skip, limit=limit)

@router.post("/alerts", response_model=SecurityAlertOut, status_code=status.HTTP_201_CREATED)
def create_alert(
    *,
    db: Session = Depends(deps.get_db),
    alert_in: SecurityAlertCreate,
    current_user: Any = Depends(deps.RoleChecker([UserRole.ANALYST, UserRole.ADMIN]))
) -> Any:
    """
    Record a new threat event / security alert. Restricted to Security Analysts and Admins.
    """
    if alert_in.endpoint_id:
        endpoint = endpoint_repo.get(db, id=alert_in.endpoint_id)
        if not endpoint:
            raise HTTPException(
                status_code=404,
                detail="Monitored endpoint associated with alert not found.",
            )
    return alert_repo.create(db, obj_in=alert_in)

@router.patch("/alerts/{alert_id}/mitigate", response_model=SecurityAlertOut)
def mitigate_alert(
    *,
    db: Session = Depends(deps.get_db),
    alert_id: UUID,
    current_user: Any = Depends(deps.RoleChecker([UserRole.ADMIN]))
) -> Any:
    """
    Mark an active security alert as mitigated. Restriced strictly to system Administrators.
    """
    alert = alert_repo.get(db, id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Security alert not found.",
        )
    return alert_repo.update(db, db_obj=alert, obj_in=SecurityAlertUpdate(is_mitigated=True))
