import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from models import PatientNotification, StaffNotification


def create_report_notification(
    db: Session,
    patient_id: str,
    related_type: str,
    related_id: str,
    title: str,
    body: str | None = None,
    type: str = "visit_report",
) -> PatientNotification:
    """Drops an in-app inbox row for the mobile app. Originally just the
    moment a doctor/surgeon evaluation flips sentToPatient False -> True (see
    routers/evaluations.py and routers/surgery_evaluations.py) — the `type`
    param defaults to that so those call sites are unaffected; also used for
    a new staff chat message arriving (type="chat_message", see
    routers/chat.py).

    This is also the exact point a real push notification would be sent from
    once device push tokens are wired up (deferred for now — see AGENTS.md /
    plan notes on Expo Go's Android push limitations).
    """
    notification = PatientNotification(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        type=type,
        title=title,
        body=body,
        relatedType=related_type,
        relatedId=related_id,
        isRead=False,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(notification)
    db.commit()
    return notification


def create_staff_notification(
    db: Session,
    patient_id: str,
    title: str,
    body: str | None = None,
    related_type: str | None = None,
    related_id: str | None = None,
    type: str = "prom_self_completed",
) -> StaffNotification:
    """Drops a dashboard-wide inbox row for staff. Originally just the moment
    a patient self-completes a PROM through the public/mobile link (see
    routers/prom_public.py) — the `type` param defaults to that so that call
    site is unaffected; also used for a new patient chat message arriving
    (type="chat_message", see routers/chat.py). Every nurse's dashboard
    shares this same queue (not scoped to whoever's logged in), surfaced as a
    toast on load — see frontend/src/pages/NurseDashboard.jsx.
    """
    notification = StaffNotification(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        type=type,
        title=title,
        body=body,
        relatedType=related_type,
        relatedId=related_id,
        isRead=False,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(notification)
    db.commit()
    return notification
