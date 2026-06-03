from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Assessment
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
    db.commit()
    return _build_patient(patient, db)
