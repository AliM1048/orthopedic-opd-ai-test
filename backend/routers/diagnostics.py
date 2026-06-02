from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Diagnostic
from schemas import DiagnosticCreate, DiagnosticUpdate, PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Diagnostics"])


@router.post("/{patient_id}/diagnostics", response_model=PatientOut)
def add_diagnostic(patient_id: str, body: DiagnosticCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    diagnostic = Diagnostic(**body.model_dump(), patient_id=patient_id)
    db.add(diagnostic)
    db.commit()
    return _build_patient(patient, db)


@router.patch("/{patient_id}/diagnostics/{diagnostic_id}", response_model=PatientOut)
def update_diagnostic(patient_id: str, diagnostic_id: str, body: DiagnosticUpdate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    diagnostic = db.query(Diagnostic).filter(
        Diagnostic.id == diagnostic_id, Diagnostic.patient_id == patient_id
    ).first()
    if not diagnostic:
        raise HTTPException(status_code=404, detail="Diagnostic not found")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(diagnostic, key, val)
    db.commit()
    return _build_patient(patient, db)
