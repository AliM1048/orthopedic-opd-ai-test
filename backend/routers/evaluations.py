from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, Evaluation
from notifications import create_report_notification
from patient_summary import generate_patient_summary
from schemas import EvaluationCreate, EvaluationUpdate, PatientOut
from .patients import _build_patient
from .followups import generate_followup_schedule

router = APIRouter(prefix="/api/patients", tags=["Evaluations"])


@router.post("/{patient_id}/evaluations", response_model=PatientOut)
def add_evaluation(patient_id: str, body: EvaluationCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    is_first_evaluation = db.query(Evaluation).filter(Evaluation.patient_id == patient_id).count() == 0
    evaluation = Evaluation(**body.model_dump(), patient_id=patient_id)
    db.add(evaluation)
    db.commit()
    # First evaluation on file for this patient kicks off their recurring
    # PROM follow-up call schedule (e.g. 3/6/9 months out) — see
    # routers/followups.py.
    if is_first_evaluation:
        generate_followup_schedule(patient, evaluation, db)
    return _build_patient(patient, db)


@router.patch("/{patient_id}/evaluations/{evaluation_id}", response_model=PatientOut)
def update_evaluation(patient_id: str, evaluation_id: str, body: EvaluationUpdate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    evaluation = db.query(Evaluation).filter(
        Evaluation.id == evaluation_id, Evaluation.patient_id == patient_id
    ).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    was_sent = evaluation.sentToPatient
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(evaluation, key, val)
    if body.sentToPatient and not was_sent:
        soap = evaluation.soapNote or {}
        evaluation.patientSummary = generate_patient_summary(
            provider_label=evaluation.physician,
            date=evaluation.date,
            diagnosis=evaluation.diagnosis,
            assessment=soap.get("assessment"),
            plan=soap.get("plan"),
        )
    db.commit()
    if body.sentToPatient and not was_sent:
        create_report_notification(
            db, patient_id,
            related_type="evaluation", related_id=evaluation.id,
            title=f"New report from {evaluation.physician}",
            body=evaluation.diagnosis,
        )
    return _build_patient(patient, db)
