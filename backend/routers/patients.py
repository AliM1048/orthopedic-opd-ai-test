from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Patient, Assessment, Evaluation, Diagnostic, Treatment
from schemas import (
    PatientOut, PatientListResponse, UpdateStatusRequest, UpdateBodyAreaRequest,
    AssessmentOut, EvaluationOut, DiagnosticOut, TreatmentOut,
    PatientCreate,
)
import uuid

router = APIRouter(prefix="/api/patients", tags=["Patients"])

FOLLOW_UP_LEAD_DAYS = 3
# Statuses that represent "nothing currently pending" for this patient — safe
# to roll over into the follow-up call queue. A patient with an active
# pending call is left alone rather than being bumped out of that queue.
FOLLOW_UP_ELIGIBLE_STATUSES = {"completed", "assessment-completed"}


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _is_follow_up_due(treatments, assessments):
    today = date.today()
    completed_follow_ups = [
        d for a in assessments if a.type == "Follow-Up" for d in [_parse_date(a.date)] if d
    ]
    for t in treatments:
        follow_up_date = _parse_date(t.followUpDate)
        if not follow_up_date:
            continue
        due_from = follow_up_date - timedelta(days=FOLLOW_UP_LEAD_DAYS)
        if today < due_from:
            continue
        # A follow-up assessment already completed for this follow-up window
        # means it's handled — don't re-flag it as due again.
        if any(d >= due_from for d in completed_follow_ups):
            continue
        return True
    return False


def _build_patient(patient: Patient, db: Session) -> PatientOut:
    assessments = db.query(Assessment).filter(Assessment.patient_id == patient.id).all()
    evaluations = db.query(Evaluation).filter(Evaluation.patient_id == patient.id).all()
    diagnostics = db.query(Diagnostic).filter(Diagnostic.patient_id == patient.id).all()
    treatments = db.query(Treatment).filter(Treatment.patient_id == patient.id).all()

    # Roll the patient into the existing 'follow-up' status bucket once their
    # follow-up date is within FOLLOW_UP_LEAD_DAYS — this reuses the nurse
    # dashboard's stat card, filter chip, and "Follow-Up" action button as-is,
    # so nothing downstream needs its own copy of this date check.
    if patient.status in FOLLOW_UP_ELIGIBLE_STATUSES and _is_follow_up_due(treatments, assessments):
        patient.status = "follow-up"
        db.commit()

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


@router.post("", response_model=PatientOut)
def create_patient(body: PatientCreate, db: Session = Depends(get_db)):
    # create a new patient with generated UUID
    pid = str(uuid.uuid4())
    patient = Patient(
        id=pid,
        name=body.name,
        age=body.age,
        gender=body.gender,
        dob=body.dob,
        phone=body.phone,
        mrn=body.mrn,
        email=body.email,
        address=body.address,
        bloodType=body.bloodType,
        allergies=body.allergies,
        appointmentTime=body.appointmentTime,
        appointmentDate=body.appointmentDate,
        status="pending",
        bodyArea=body.bodyArea,
        avatar=body.avatar,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _build_patient(patient, db)


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


@router.patch("/{patient_id}/body-area", response_model=PatientOut)
def update_patient_body_area(patient_id: str, body: UpdateBodyAreaRequest, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.bodyArea = body.bodyArea
    db.commit()
    db.refresh(patient)
    return _build_patient(patient, db)
