from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Assessment, Encounter, FollowUpCall
import uuid
from datetime import datetime, timezone
from schemas import AssessmentCreate, AssessmentOut, PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Assessments"])


@router.post("/{patient_id}/assessments", response_model=PatientOut)
def add_assessment(patient_id: str, body: AssessmentCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    values = body.model_dump()
    encounter_id = values.pop("encounter_id", None)
    encounter_date = patient.appointmentDate or body.date
    if not encounter_id:
        encounter = (
            db.query(Encounter)
            .filter(Encounter.patient_id == patient_id, Encounter.encounterDate == encounter_date, Encounter.status == "open")
            .first()
        )
        if not encounter:
            now = datetime.now(timezone.utc).isoformat()
            encounter = Encounter(
                id=str(uuid.uuid4()), patient_id=patient_id,
                provider=None, encounterDate=encounter_date,
                encounterType="initial", bodyArea=body.bodyArea,
                previsitSource=body.completedBy, status="open",
                createdAt=now, updatedAt=now,
            )
            db.add(encounter)
            db.flush()
        encounter_id = encounter.id
    assessment = Assessment(**values, patient_id=patient_id, encounter_id=encounter_id)
    db.add(assessment)

    # If this patient has a pending PROM follow-up call, logging a fresh
    # assessment for them is exactly what that call was for — close out the
    # oldest one instead of leaving a stale reminder on the nurse dashboard.
    pending_call = (
        db.query(FollowUpCall)
        .filter(FollowUpCall.patient_id == patient_id, FollowUpCall.status == "pending")
        .order_by(FollowUpCall.scheduledDate)
        .first()
    )
    if pending_call:
        pending_call.status = "completed"
        pending_call.completedAssessmentId = assessment.id

    db.commit()
    return _build_patient(patient, db)
