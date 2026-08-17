"""
Recurring PROM follow-up call schedule.

When a patient's first doctor evaluation is saved (see routers/evaluations.py),
generate_followup_schedule() below creates one FollowUpCall per interval in the
clinic-wide default (or the patient's own override) — e.g. calls at +3, +6, +9
months out from that first visit date. The nurse dashboard surfaces whichever
of these fall within REMINDER_LEAD_DAYS so the call to re-run the PROM
questionnaire doesn't get missed. Completing a fresh assessment for the
patient (routers/assessments.py) closes out whichever call it was for.
"""
import calendar
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient, Evaluation, FollowUpCall, FollowUpSettings
from schemas import (
    FollowUpCallOut, FollowUpCallDue, FollowUpCallUpdate, FollowUpCallCreate,
    FollowUpSettingsOut, FollowUpSettingsUpdate, PatientFollowUpSettingsUpdate,
    PatientOut,
)
from .prom_assignments import auto_progress_prom_assignments
from .patients import _build_patient

router = APIRouter(prefix="/api", tags=["Follow-Up Calls"])

DEFAULT_INTERVALS_MONTHS = [3, 6, 9]
REMINDER_LEAD_DAYS = 2


def add_months(d: date, months: int) -> date:
    """Adds calendar months to a date, clamping the day to the target month's
    length (e.g. Jan 31 + 1 month -> Feb 28/29) rather than overflowing."""
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def get_global_intervals(db: Session) -> list[int]:
    row = db.query(FollowUpSettings).filter(FollowUpSettings.id == "default").first()
    if row and row.intervalsMonths:
        return row.intervalsMonths
    return DEFAULT_INTERVALS_MONTHS


def generate_followup_schedule(
    patient: Patient, anchor_evaluation: Evaluation, db: Session, replace_pending: bool = False
) -> None:
    """Creates FollowUpCall rows at anchor_date + each interval (the
    patient's own override if set, else the clinic-wide default). If
    replace_pending, any of this patient's not-yet-completed calls are
    deleted first — used when staff change a patient's own interval choice
    so it actually takes effect instead of only applying next time."""
    intervals = patient.followUpIntervalsMonths or get_global_intervals(db)
    anchor_date = _parse_date(anchor_evaluation.date)

    if replace_pending:
        db.query(FollowUpCall).filter(
            FollowUpCall.patient_id == patient.id,
            FollowUpCall.status == "pending",
        ).delete()

    for months in intervals:
        scheduled = add_months(anchor_date, months)
        db.add(FollowUpCall(
            id=str(uuid.uuid4()),
            patient_id=patient.id,
            intervalMonths=months,
            scheduledDate=scheduled.strftime("%Y-%m-%d"),
            status="pending",
            anchorEvaluationId=anchor_evaluation.id,
        ))
    db.commit()


def _to_due(call: FollowUpCall, patient: Patient) -> FollowUpCallDue:
    return FollowUpCallDue(
        id=call.id, patient_id=call.patient_id, intervalMonths=call.intervalMonths,
        scheduledDate=call.scheduledDate, status=call.status,
        anchorEvaluationId=call.anchorEvaluationId, completedAssessmentId=call.completedAssessmentId,
        patientName=patient.name, patientMrn=patient.mrn,
        patientPhone=patient.phone, patientAvatar=patient.avatar,
    )


@router.get("/followups/due", response_model=list[FollowUpCallDue])
def list_due_followups(db: Session = Depends(get_db)):
    """Every pending call scheduled within REMINDER_LEAD_DAYS (also surfaces
    anything overdue, since a missed reminder shouldn't just disappear) —
    powers the nurse dashboard reminder widget. Also runs the auto-progress
    sweep (auto-sends the PROM for calls whose date has arrived, routes
    non-responders to the clerk) since this is the endpoint every dashboard
    load hits — see prom_assignments.auto_progress_prom_assignments."""
    auto_progress_prom_assignments(db)
    cutoff = (date.today() + timedelta(days=REMINDER_LEAD_DAYS)).strftime("%Y-%m-%d")
    rows = (
        db.query(FollowUpCall)
        .filter(FollowUpCall.status == "pending", FollowUpCall.scheduledDate <= cutoff)
        .order_by(FollowUpCall.scheduledDate)
        .all()
    )
    out = []
    for call in rows:
        patient = db.query(Patient).filter(Patient.id == call.patient_id).first()
        if patient:
            out.append(_to_due(call, patient))
    return out


@router.get("/followups", response_model=list[FollowUpCallDue])
def list_followups(status: str | None = None, db: Session = Depends(get_db)):
    """Full monitoring view — every call, optionally filtered by status
    ('pending'/'completed')."""
    query = db.query(FollowUpCall)
    if status:
        query = query.filter(FollowUpCall.status == status)
    rows = query.order_by(FollowUpCall.scheduledDate).all()
    out = []
    for call in rows:
        patient = db.query(Patient).filter(Patient.id == call.patient_id).first()
        if patient:
            out.append(_to_due(call, patient))
    return out


@router.get("/patients/{patient_id}/followups", response_model=list[FollowUpCallOut])
def list_patient_followups(patient_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(FollowUpCall)
        .filter(FollowUpCall.patient_id == patient_id)
        .order_by(FollowUpCall.scheduledDate)
        .all()
    )
    return [FollowUpCallOut.model_validate(r) for r in rows]


@router.post("/patients/{patient_id}/followups", response_model=FollowUpCallOut)
def create_followup(patient_id: str, body: FollowUpCallCreate, db: Session = Depends(get_db)):
    """Manually adds one call to a patient's schedule — e.g. a one-off
    check-in that doesn't fit the 3/6/9-month pattern. The automatic
    generator (generate_followup_schedule) covers the regular case."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    call = FollowUpCall(
        id=str(uuid.uuid4()), patient_id=patient_id,
        intervalMonths=body.intervalMonths, scheduledDate=body.scheduledDate, status="pending",
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return FollowUpCallOut.model_validate(call)


@router.patch("/followups/{followup_id}", response_model=FollowUpCallOut)
def update_followup(followup_id: str, body: FollowUpCallUpdate, db: Session = Depends(get_db)):
    """Lets a nurse reschedule a call's date or mark it done manually."""
    call = db.query(FollowUpCall).filter(FollowUpCall.id == followup_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Follow-up call not found")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(call, key, val)
    db.commit()
    db.refresh(call)
    return FollowUpCallOut.model_validate(call)


@router.delete("/followups/{followup_id}")
def delete_followup(followup_id: str, db: Session = Depends(get_db)):
    call = db.query(FollowUpCall).filter(FollowUpCall.id == followup_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Follow-up call not found")
    db.delete(call)
    db.commit()
    return {"status": "ok"}


@router.get("/followup-settings", response_model=FollowUpSettingsOut)
def get_followup_settings(db: Session = Depends(get_db)):
    return FollowUpSettingsOut(intervalsMonths=get_global_intervals(db))


@router.put("/followup-settings", response_model=FollowUpSettingsOut)
def set_followup_settings(body: FollowUpSettingsUpdate, db: Session = Depends(get_db)):
    row = db.query(FollowUpSettings).filter(FollowUpSettings.id == "default").first()
    if not row:
        db.add(FollowUpSettings(id="default", intervalsMonths=body.intervalsMonths))
    else:
        row.intervalsMonths = body.intervalsMonths
    db.commit()
    return FollowUpSettingsOut(intervalsMonths=body.intervalsMonths)


@router.patch("/patients/{patient_id}/followup-settings", response_model=PatientOut)
def set_patient_followup_settings(
    patient_id: str, body: PatientFollowUpSettingsUpdate, db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.followUpIntervalsMonths = body.intervalsMonths or None
    db.commit()
    db.refresh(patient)

    # Regenerate the pending schedule from the first evaluation on file (if
    # any) so the new interval choice takes effect immediately rather than
    # only applying to some hypothetical future first visit.
    first_eval = (
        db.query(Evaluation)
        .filter(Evaluation.patient_id == patient_id)
        .order_by(Evaluation.date)
        .first()
    )
    if first_eval:
        generate_followup_schedule(patient, first_eval, db, replace_pending=True)

    return _build_patient(patient, db)
