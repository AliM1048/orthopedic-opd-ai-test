import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Encounter, ModelFeedback, ModelSuggestion, Patient
from schemas import (
    EncounterCreate,
    EncounterOut,
    ModelFeedbackCreate,
    ModelSuggestionCreate,
    ModelSuggestionOut,
)

router = APIRouter(prefix="/api", tags=["Clinical Encounters"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/encounters", response_model=EncounterOut)
def create_encounter(
    body: EncounterCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    existing = (
        db.query(Encounter)
        .filter(Encounter.patient_id == body.patient_id, Encounter.encounterDate == body.encounterDate, Encounter.status == "open")
        .first()
    )
    if existing:
        return existing
    now = _now()
    encounter = Encounter(
        id=str(uuid.uuid4()),
        patient_id=body.patient_id,
        provider=body.provider or current_user.get("name") or current_user.get("email"),
        encounterDate=body.encounterDate,
        encounterType=body.encounterType,
        bodyArea=body.bodyArea or patient.bodyArea,
        previsitSource=body.previsitSource,
        status="open",
        createdAt=now,
        updatedAt=now,
    )
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    return encounter


@router.get("/patients/{patient_id}/encounters", response_model=list[EncounterOut])
def list_encounters(
    patient_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    if not db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(Encounter).filter(Encounter.patient_id == patient_id).order_by(Encounter.encounterDate.desc()).all()


@router.post("/model-suggestions", response_model=ModelSuggestionOut)
def save_model_suggestion(
    body: ModelSuggestionCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    suggestion = ModelSuggestion(
        id=str(uuid.uuid4()),
        patient_id=body.patient_id,
        encounter_id=body.encounter_id,
        modelVersion=body.modelVersion,
        featureSnapshot=body.featureSnapshot,
        suggestions=body.suggestions,
        warnings=body.warnings,
        generatedAt=_now(),
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


@router.post("/model-suggestions/{suggestion_id}/feedback")
def save_model_feedback(
    suggestion_id: str,
    body: ModelFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    suggestion = db.query(ModelSuggestion).filter(ModelSuggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Model suggestion not found")
    if body.action not in {"accepted", "edited", "rejected", "insufficient"}:
        raise HTTPException(status_code=422, detail="Invalid feedback action")
    feedback = ModelFeedback(
        id=str(uuid.uuid4()),
        suggestion_id=suggestion_id,
        patient_id=suggestion.patient_id,
        encounter_id=suggestion.encounter_id,
        action=body.action,
        finalTreatment=body.finalTreatment,
        note=body.note,
        clinician=current_user.get("name") or current_user.get("email"),
        createdAt=_now(),
    )
    db.add(feedback)
    db.commit()
    return {"status": "recorded", "id": feedback.id}