"""
Doctor-directed PROM assignment workflow — for walk-in / ER referral patients
(or anyone else) who reach the evaluation without a completed pre-visit PROM.

The doctor picks the instrument, who's answering (patient vs a parent/
caregiver — this same field doubles as the pediatric-respondent flag), and
how it gets completed:
  - self_completion  -> a tokenized public link/QR the patient fills in
                        themselves (see routers/prom_public.py)
  - clerk_assisted   -> routed to the clerk task queue; the clerk records
                        only the patient's answers via the normal PROM
                        question flow, no history re-taken
  - physician_assisted -> the doctor runs the same question flow live, right
                        after taking history
  - deferred         -> not done this visit, with a reason on file

An incomplete PROM never blocks the doctor from closing the visit — nothing
here gates evaluation completion.
"""
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Patient, PROMAssignment, FollowUpCall
from notifications import create_report_notification
from schemas import (
    PROMAssignmentCreate, PROMAssignmentUpdate, PROMAssignmentOut, PROMAssignmentWithPatient,
)

router = APIRouter(prefix="/api", tags=["PROM Assignments"])

# A sent/assigned PROM that's sat untouched this long shows as "Overdue" in
# staff-facing lists — derived at read time rather than stored, same pattern
# as the follow-up call reminders (see routers/followups.py).
OVERDUE_AFTER_DAYS = 3


def _with_derived_status(a: PROMAssignment) -> str:
    if a.status in ("sent_pending", "assigned_to_clerk") and a.assignedAt:
        try:
            assigned = datetime.strptime(a.assignedAt[:10], "%Y-%m-%d").date()
        except ValueError:
            return a.status
        if date.today() - assigned >= timedelta(days=OVERDUE_AFTER_DAYS):
            return "overdue"
    return a.status


def auto_progress_prom_assignments(db: Session) -> None:
    """Lazy sweep, run at the top of the staff-facing list endpoints below
    (same "roll forward on read" pattern _build_patient uses for follow-up
    status — see routers/patients.py). No scheduler exists in this backend,
    so 'automatically at every appointment' is implemented as: the next time
    any nurse/clerk screen loads, (1) any follow-up call whose date has
    arrived gets its PROM auto-sent as a self-completion link, and (2) any
    self-completion PROM that's gone quiet past OVERDUE_AFTER_DAYS gets
    handed to the clerk queue as a non-responder — never silently dropped.
    """
    today_iso = date.today().strftime("%Y-%m-%d")

    # 1) Auto-send: due follow-up calls with no PROM sent yet.
    due_calls = (
        db.query(FollowUpCall)
        .filter(FollowUpCall.status == "pending", FollowUpCall.scheduledDate <= today_iso, FollowUpCall.promAssignmentId.is_(None))
        .all()
    )
    for call in due_calls:
        patient = db.query(Patient).filter(Patient.id == call.patient_id).first()
        if not patient:
            continue
        assignment = PROMAssignment(
            id=str(uuid.uuid4()),
            patient_id=patient.id,
            bodyArea=patient.bodyArea,
            respondentType="patient",
            completionMethod="self_completion",
            timing=None,
            status="sent_pending",
            assignedBy="System (auto-sent at follow-up)",
            assignedAt=datetime.utcnow().isoformat() + "Z",
            accessToken=str(uuid.uuid4()),
        )
        db.add(assignment)
        db.flush()
        call.promAssignmentId = assignment.id

    # 2) Non-responder routing: overdue self-completion links go to the clerk.
    stale = (
        db.query(PROMAssignment)
        .filter(PROMAssignment.status == "sent_pending", PROMAssignment.completionMethod == "self_completion")
        .all()
    )
    for a in stale:
        if _with_derived_status(a) == "overdue":
            a.status = "assigned_to_clerk"

    db.commit()


def _to_out(a: PROMAssignment) -> PROMAssignmentOut:
    data = PROMAssignmentOut.model_validate(a).model_dump()
    data["status"] = _with_derived_status(a)
    return PROMAssignmentOut(**data)


def _to_with_patient(a: PROMAssignment, patient: Patient) -> PROMAssignmentWithPatient:
    data = _to_out(a).model_dump()
    return PROMAssignmentWithPatient(
        **data, patientName=patient.name, patientMrn=patient.mrn, patientAvatar=patient.avatar,
    )


@router.post("/patients/{patient_id}/prom-assignments", response_model=PROMAssignmentOut)
def create_prom_assignment(
    patient_id: str, body: PROMAssignmentCreate,
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if body.completionMethod not in ("self_completion", "clerk_assisted", "physician_assisted", "deferred"):
        raise HTTPException(status_code=400, detail="Invalid completionMethod")
    if body.completionMethod == "deferred" and not body.deferReason:
        raise HTTPException(status_code=400, detail="deferReason is required when deferring")

    status_by_method = {
        "self_completion": "sent_pending",
        "clerk_assisted": "assigned_to_clerk",
        "physician_assisted": "sent_pending",
        "deferred": "deferred",
    }

    assignment = PROMAssignment(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        evaluationId=body.evaluationId,
        bodyArea=body.bodyArea,
        promName=body.promName,
        respondentType=body.respondentType,
        completionMethod=body.completionMethod,
        timing=body.timing,
        status=status_by_method[body.completionMethod],
        deferReason=body.deferReason,
        assignedBy=current_user.get("name") or current_user.get("email"),
        assignedAt=datetime.utcnow().isoformat() + "Z",
        accessToken=str(uuid.uuid4()) if body.completionMethod == "self_completion" else None,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    if body.completionMethod == "self_completion":
        create_report_notification(
            db, patient.id,
            related_type="prom_assignment",
            related_id=assignment.id,
            title="A patient form is ready",
            body=f"Please complete your {assignment.promName or assignment.bodyArea} questionnaire before your appointment.",
            type="prom_assignment",
        )
    return _to_out(assignment)


@router.get("/patients/{patient_id}/prom-assignments", response_model=list[PROMAssignmentOut])
def list_patient_prom_assignments(patient_id: str, db: Session = Depends(get_db)):
    auto_progress_prom_assignments(db)
    rows = (
        db.query(PROMAssignment)
        .filter(PROMAssignment.patient_id == patient_id)
        .order_by(PROMAssignment.assignedAt.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.get("/prom-assignments", response_model=list[PROMAssignmentWithPatient])
def list_prom_assignments(status: str | None = None, db: Session = Depends(get_db)):
    """Full queue view (e.g. the clerk task list). `status` filters on the
    stored value; pass 'overdue' to filter on the derived state instead."""
    auto_progress_prom_assignments(db)
    query = db.query(PROMAssignment)
    if status and status != "overdue":
        query = query.filter(PROMAssignment.status == status)
    rows = query.order_by(PROMAssignment.assignedAt).all()
    out = []
    for a in rows:
        if status == "overdue" and _with_derived_status(a) != "overdue":
            continue
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        if patient:
            out.append(_to_with_patient(a, patient))
    return out


@router.patch("/prom-assignments/{assignment_id}", response_model=PROMAssignmentOut)
def update_prom_assignment(
    assignment_id: str, body: PROMAssignmentUpdate, db: Session = Depends(get_db),
):
    assignment = db.query(PROMAssignment).filter(PROMAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="PROM assignment not found")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(assignment, key, val)
    db.commit()
    db.refresh(assignment)
    return _to_out(assignment)
