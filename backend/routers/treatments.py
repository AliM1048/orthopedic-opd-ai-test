from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Treatment
from schemas import TreatmentCreate, TreatmentUpdate, PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Treatments"])


@router.post("/{patient_id}/treatments", response_model=PatientOut)
def add_treatment(patient_id: str, body: TreatmentCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    treatment = Treatment(**body.model_dump(), patient_id=patient_id)
    db.add(treatment)
    db.commit()
    return _build_patient(patient, db)


@router.patch("/{patient_id}/treatments/{treatment_id}", response_model=PatientOut)
def update_treatment(patient_id: str, treatment_id: str, body: TreatmentUpdate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    treatment = db.query(Treatment).filter(
        Treatment.id == treatment_id, Treatment.patient_id == patient_id
    ).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    # exclude_unset (not exclude_none, unlike the diagnostics PATCH) — a
    # surgery's followUpDate must be clearable back to null (e.g. the
    # Surgeries page un-scheduling a date), which exclude_none would silently
    # drop from the update.
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(treatment, field, value)
    db.commit()
    return _build_patient(patient, db)


@router.delete("/{patient_id}/treatments/{treatment_id}", response_model=PatientOut)
def delete_treatment(patient_id: str, treatment_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    treatment = db.query(Treatment).filter(
        Treatment.id == treatment_id, Treatment.patient_id == patient_id
    ).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    db.delete(treatment)
    db.commit()
    return _build_patient(patient, db)
