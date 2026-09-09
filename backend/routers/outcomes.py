import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Patient, TreatmentOutcome
from schemas import TreatmentOutcomeCreate

router = APIRouter(prefix="/api/patients", tags=["Treatment Outcomes"])


@router.post("/{patient_id}/treatment-outcomes")
def add_treatment_outcome(
    patient_id: str,
    body: TreatmentOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    if body.response and body.response not in {"improved", "unchanged", "worse"}:
        raise HTTPException(status_code=422, detail="Invalid outcome response")
    outcome = TreatmentOutcome(
        id=str(uuid.uuid4()), patient_id=patient_id,
        **body.model_dump(), recordedBy=current_user.get("name") or current_user.get("email"),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
    db.add(outcome)
    db.commit()
    return {"id": outcome.id, "status": "recorded"}