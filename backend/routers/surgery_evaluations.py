from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, SurgeryEvaluation
from notifications import create_report_notification
from patient_summary import generate_patient_summary
from schemas import SurgeryEvaluationCreate, SurgeryEvaluationUpdate, PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Surgery Evaluations"])


@router.post("/{patient_id}/surgery-evaluations", response_model=PatientOut)
def add_surgery_evaluation(patient_id: str, body: SurgeryEvaluationCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    evaluation = SurgeryEvaluation(**body.model_dump(), patient_id=patient_id)
    db.add(evaluation)
    db.commit()
    return _build_patient(patient, db)


@router.patch("/{patient_id}/surgery-evaluations/{evaluation_id}", response_model=PatientOut)
def update_surgery_evaluation(patient_id: str, evaluation_id: str, body: SurgeryEvaluationUpdate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    evaluation = db.query(SurgeryEvaluation).filter(
        SurgeryEvaluation.id == evaluation_id, SurgeryEvaluation.patient_id == patient_id
    ).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Surgery evaluation not found")
    was_sent = evaluation.sentToPatient
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(evaluation, key, val)
    if body.sentToPatient and not was_sent:
        soap = evaluation.soapNote or {}
        evaluation.patientSummary = generate_patient_summary(
            provider_label=evaluation.surgeon,
            date=evaluation.date,
            diagnosis=evaluation.diagnosis,
            assessment=soap.get("findings"),
            plan=soap.get("postoperativePlan"),
        )
    db.commit()
    if body.sentToPatient and not was_sent:
        create_report_notification(
            db, patient_id,
            related_type="surgery_evaluation", related_id=evaluation.id,
            title=f"New report from {evaluation.surgeon}",
            body=evaluation.diagnosis,
        )
    return _build_patient(patient, db)
