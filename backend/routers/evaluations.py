from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Evaluation
from schemas import EvaluationCreate, PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Evaluations"])


@router.post("/{patient_id}/evaluations", response_model=PatientOut)
def add_evaluation(patient_id: str, body: EvaluationCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    evaluation = Evaluation(**body.model_dump(), patient_id=patient_id)
    db.add(evaluation)
    db.commit()
    return _build_patient(patient, db)
