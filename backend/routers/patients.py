from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Patient, Assessment, Evaluation, Diagnostic, Treatment
from schemas import (
    PatientOut, PatientListResponse, UpdateStatusRequest,
    AssessmentOut, EvaluationOut, DiagnosticOut, TreatmentOut,
)

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _build_patient(patient: Patient, db: Session) -> PatientOut:
    assessments = db.query(Assessment).filter(Assessment.patient_id == patient.id).all()
    evaluations = db.query(Evaluation).filter(Evaluation.patient_id == patient.id).all()
    diagnostics = db.query(Diagnostic).filter(Diagnostic.patient_id == patient.id).all()
    treatments = db.query(Treatment).filter(Treatment.patient_id == patient.id).all()
    return PatientOut(
        **{c.name: getattr(patient, c.name) for c in patient.__table__.columns},
        assessments=[AssessmentOut.model_validate(a) for a in assessments],
        evaluations=[EvaluationOut.model_validate(e) for e in evaluations],
        diagnostics=[DiagnosticOut.model_validate(d) for d in diagnostics],
        treatments=[TreatmentOut.model_validate(t) for t in treatments],
    )


@router.get("", response_model=PatientListResponse)
def list_patients(search: str = "", db: Session = Depends(get_db)):
    query = db.query(Patient)
    if search:
        q = f"%{search}%"
        query = query.filter(
            or_(
                Patient.name.ilike(q),
                Patient.mrn.ilike(q),
                Patient.bodyArea.ilike(q),
            )
        )
    patients = query.all()
    return PatientListResponse(
        patients=[_build_patient(p, db) for p in patients]
    )


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _build_patient(patient, db)


@router.patch("/{patient_id}/status", response_model=PatientOut)
def update_patient_status(patient_id: str, body: UpdateStatusRequest, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.status = body.status
    db.commit()
    db.refresh(patient)
    return _build_patient(patient, db)
