import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth import get_current_patient
from database import get_db
from models import ChatMessage, Diagnostic, Document, Evaluation, Patient, PatientNotification, PROMAssignment, SurgeryEvaluation, Treatment
from notifications import create_staff_notification
from schemas import (
    ActiveCareItemOut, ChatMessageCreate, ChatMessageOut, PatientAppointmentOut, PatientNotificationOut,
    PatientProfileOut, PatientPromStatusOut, PromTrendOut, VisitReportDocumentOut, VisitReportOut,
)
from .prom_assignments import _with_derived_status
from .prom_trend import compute_prom_trend

router = APIRouter(prefix="/api/patient", tags=["Patient Self-Service"])

DOCS_DIR = Path("documents")

DOCUMENT_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
}


def _get_patient(patient_id: str, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _evaluation_report(e: Evaluation, documents: list[Document]) -> VisitReportOut:
    return VisitReportOut(
        id=f"eval-{e.id}",
        reportType="physician",
        date=e.date,
        providerName=e.physician,
        diagnosis=e.diagnosis,
        soapNote=e.soapNote,
        patientSummary=e.patientSummary,
        documents=[
            VisitReportDocumentOut(id=d.id, originalName=d.originalName, contentType=d.contentType)
            for d in documents
        ],
    )


def _surgery_report(e: SurgeryEvaluation) -> VisitReportOut:
    return VisitReportOut(
        id=f"surg-{e.id}",
        reportType="surgery",
        date=e.date,
        providerName=e.surgeon,
        diagnosis=e.diagnosis,
        soapNote=e.soapNote,
        patientSummary=e.patientSummary,
        documents=[],  # SurgeryEvaluation has no document relation today
    )


@router.get("/me", response_model=PatientProfileOut)
def get_me(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient = _get_patient(current_patient["patient_id"], db)
    return PatientProfileOut.model_validate(patient)


@router.get("/visit-reports", response_model=list[VisitReportOut])
def list_visit_reports(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient_id = current_patient["patient_id"]
    evaluations = db.query(Evaluation).filter(
        Evaluation.patient_id == patient_id, Evaluation.sentToPatient == True  # noqa: E712
    ).all()
    surgery_evaluations = db.query(SurgeryEvaluation).filter(
        SurgeryEvaluation.patient_id == patient_id, SurgeryEvaluation.sentToPatient == True  # noqa: E712
    ).all()
    documents = db.query(Document).filter(Document.patient_id == patient_id).all()
    documents_by_evaluation: dict[str, list[Document]] = {}
    for doc in documents:
        documents_by_evaluation.setdefault(doc.evaluation_id, []).append(doc)

    reports = [
        _evaluation_report(e, documents_by_evaluation.get(e.id, [])) for e in evaluations
    ] + [
        _surgery_report(e) for e in surgery_evaluations
    ]
    reports.sort(key=lambda r: r.date, reverse=True)
    return reports


@router.get("/visit-reports/{report_id}", response_model=VisitReportOut)
def get_visit_report(report_id: str, current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient_id = current_patient["patient_id"]

    if report_id.startswith("eval-"):
        evaluation = db.query(Evaluation).filter(
            Evaluation.id == report_id[len("eval-"):],
            Evaluation.patient_id == patient_id,
            Evaluation.sentToPatient == True,  # noqa: E712
        ).first()
        if not evaluation:
            raise HTTPException(status_code=404, detail="Report not found")
        documents = db.query(Document).filter(Document.evaluation_id == evaluation.id).all()
        return _evaluation_report(evaluation, documents)

    if report_id.startswith("surg-"):
        evaluation = db.query(SurgeryEvaluation).filter(
            SurgeryEvaluation.id == report_id[len("surg-"):],
            SurgeryEvaluation.patient_id == patient_id,
            SurgeryEvaluation.sentToPatient == True,  # noqa: E712
        ).first()
        if not evaluation:
            raise HTTPException(status_code=404, detail="Report not found")
        return _surgery_report(evaluation)

    raise HTTPException(status_code=404, detail="Report not found")


@router.get("/documents/{document_id}/file")
def get_patient_document_file(document_id: str, current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient_id = current_patient["patient_id"]
    document = db.query(Document).filter(
        Document.id == document_id, Document.patient_id == patient_id
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    evaluation = db.query(Evaluation).filter(Evaluation.id == document.evaluation_id).first()
    if not evaluation or not evaluation.sentToPatient:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = DOCS_DIR / document.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")

    media_type = DOCUMENT_MEDIA_TYPES.get(file_path.suffix.lower(), document.contentType)
    return FileResponse(file_path, media_type=media_type, filename=document.originalName)


@router.get("/notifications", response_model=list[PatientNotificationOut])
def list_notifications(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    notifications = db.query(PatientNotification).filter(
        PatientNotification.patient_id == current_patient["patient_id"]
    ).order_by(PatientNotification.createdAt.desc()).all()
    return [PatientNotificationOut.model_validate(n) for n in notifications]


@router.patch("/notifications/{notification_id}/read", response_model=PatientNotificationOut)
def mark_notification_read(notification_id: str, current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    notification = db.query(PatientNotification).filter(
        PatientNotification.id == notification_id,
        PatientNotification.patient_id == current_patient["patient_id"],
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.isRead = True
    db.commit()
    return PatientNotificationOut.model_validate(notification)


@router.patch("/notifications/read-all")
def mark_all_notifications_read(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    db.query(PatientNotification).filter(
        PatientNotification.patient_id == current_patient["patient_id"],
        PatientNotification.isRead == False,  # noqa: E712
    ).update({"isRead": True})
    db.commit()
    return {"message": "All notifications marked read"}


@router.get("/appointment", response_model=PatientAppointmentOut)
def get_appointment(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient = _get_patient(current_patient["patient_id"], db)
    latest_evaluation = (
        db.query(Evaluation)
        .filter(Evaluation.patient_id == patient.id)
        .order_by(Evaluation.date.desc())
        .first()
    )
    return PatientAppointmentOut(
        date=patient.appointmentDate,
        time=patient.appointmentTime,
        physicianName=latest_evaluation.physician if latest_evaluation else None,
    )


@router.get("/active-care", response_model=list[ActiveCareItemOut])
def get_active_care(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient_id = current_patient["patient_id"]
    treatments = db.query(Treatment).filter(
        Treatment.patient_id == patient_id, Treatment.status == "active"
    ).all()
    diagnostics = db.query(Diagnostic).filter(
        Diagnostic.patient_id == patient_id, Diagnostic.status == "pending"
    ).all()

    items = [
        ActiveCareItemOut(
            id=t.id, kind="treatment", title=t.type, detail=t.details,
            date=t.date, status=t.status, followUpDate=t.followUpDate,
        )
        for t in treatments
    ] + [
        ActiveCareItemOut(
            id=d.id, kind="diagnostic", title=d.type, detail=d.result,
            date=d.date, status=d.status, followUpDate=None,
        )
        for d in diagnostics
    ]
    items.sort(key=lambda i: i.date, reverse=True)
    return items


@router.get("/prom-status", response_model=Optional[PatientPromStatusOut])
def get_prom_status(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient_id = current_patient["patient_id"]
    assignments = (
        db.query(PROMAssignment)
        .filter(
            PROMAssignment.patient_id == patient_id,
            PROMAssignment.status.in_(["sent_pending", "assigned_to_clerk"]),
        )
        .order_by(PROMAssignment.assignedAt.desc())
        .all()
    )
    if not assignments:
        return None
    a = assignments[0]
    return PatientPromStatusOut(
        id=a.id,
        promName=a.promName,
        bodyArea=a.bodyArea,
        status=_with_derived_status(a),
        completionMethod=a.completionMethod,
        assignedAt=a.assignedAt,
        accessToken=a.accessToken if a.completionMethod == "self_completion" else None,
    )


@router.get("/prom-trend", response_model=PromTrendOut)
def get_patient_prom_trend(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient = _get_patient(current_patient["patient_id"], db)
    return compute_prom_trend(patient, db)


@router.get("/messages", response_model=list[ChatMessageOut])
def list_messages(current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(
        ChatMessage.patient_id == current_patient["patient_id"]
    ).order_by(ChatMessage.createdAt).all()
    return [ChatMessageOut.model_validate(m) for m in messages]


@router.post("/messages", response_model=ChatMessageOut)
def send_message(body: ChatMessageCreate, current_patient: dict = Depends(get_current_patient), db: Session = Depends(get_db)):
    patient = _get_patient(current_patient["patient_id"], db)
    message = ChatMessage(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        senderType="patient",
        senderName=None,
        text=body.text,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(message)
    db.commit()
    create_staff_notification(
        db, patient.id,
        title=f"New message from {patient.name}",
        body=body.text[:140],
        related_type="chat_message", related_id=message.id,
        type="chat_message",
    )
    return ChatMessageOut.model_validate(message)
