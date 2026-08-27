import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ChatMessage, Patient
from notifications import create_report_notification
from schemas import ChatConversationSummary, ChatMessageCreate, ChatMessageOut

router = APIRouter(prefix="/api", tags=["Chat"])


@router.get("/chats", response_model=list[ChatConversationSummary])
def list_conversations(db: Session = Depends(get_db)):
    """One row per patient who has ever exchanged a message, most recently
    active first — powers the dashboard's chat list/inbox page (open to any
    logged-in nurse/physician, not scoped to whoever sent/received a given
    message)."""
    messages = db.query(ChatMessage).order_by(ChatMessage.createdAt).all()
    latest_by_patient: dict[str, ChatMessage] = {}
    for m in messages:
        latest_by_patient[m.patient_id] = m  # ascending order, so the last write per key is the latest message

    summaries = []
    for patient_id, last in latest_by_patient.items():
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            continue
        summaries.append(ChatConversationSummary(
            patientId=patient.id, patientName=patient.name, patientMrn=patient.mrn,
            patientAvatar=patient.avatar, lastMessageText=last.text,
            lastMessageAt=last.createdAt, lastSenderType=last.senderType,
        ))
    summaries.sort(key=lambda s: s.lastMessageAt, reverse=True)
    return summaries


@router.get("/patients/{patient_id}/messages", response_model=list[ChatMessageOut])
def list_patient_messages(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    messages = db.query(ChatMessage).filter(
        ChatMessage.patient_id == patient_id
    ).order_by(ChatMessage.createdAt).all()
    return [ChatMessageOut.model_validate(m) for m in messages]


@router.post("/patients/{patient_id}/messages", response_model=ChatMessageOut)
def send_patient_message(
    patient_id: str, body: ChatMessageCreate,
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    message = ChatMessage(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        senderType="staff",
        senderName=current_user.get("name") or current_user.get("email"),
        text=body.text,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(message)
    db.commit()
    create_report_notification(
        db, patient_id,
        related_type="chat_message", related_id=message.id,
        title="New message from your care team",
        body=body.text[:140],
        type="chat_message",
    )
    return ChatMessageOut.model_validate(message)
