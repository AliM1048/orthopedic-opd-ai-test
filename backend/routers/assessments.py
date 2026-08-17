from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Assessment, FollowUpCall
from schemas import AssessmentCreate, AssessmentOut, PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Assessments"])


@router.post("/{patient_id}/assessments", response_model=PatientOut)
def add_assessment(patient_id: str, body: AssessmentCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    assessment = Assessment(**body.model_dump(), patient_id=patient_id)
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
