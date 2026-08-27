import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Document, Evaluation, Patient
from schemas import PatientOut
from .patients import _build_patient

router = APIRouter(prefix="/api/patients", tags=["Documents"])

DOCS_DIR = Path("documents")
DOCS_DIR.mkdir(exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}


@router.post("/{patient_id}/evaluations/{evaluation_id}/documents", response_model=PatientOut)
async def upload_document(
    patient_id: str,
    evaluation_id: str,
    file: UploadFile = File(...),
    uploadedBy: str = Form(...),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    evaluation = db.query(Evaluation).filter(
        Evaluation.id == evaluation_id, Evaluation.patient_id == patient_id
    ).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    extension = ALLOWED_CONTENT_TYPES.get(file.content_type)
    if not extension:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG images or PDF files are allowed")

    filename = f"{uuid.uuid4()}{extension}"
    content = await file.read()
    with open(DOCS_DIR / filename, "wb") as f:
        f.write(content)

    document = Document(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        evaluation_id=evaluation_id,
        filename=filename,
        originalName=file.filename or filename,
        contentType=file.content_type,
        uploadedBy=uploadedBy,
        uploadedAt=datetime.utcnow().isoformat() + "Z",
    )
    db.add(document)
    db.commit()
    return _build_patient(patient, db)


@router.delete("/{patient_id}/evaluations/{evaluation_id}/documents/{document_id}", response_model=PatientOut)
def delete_document(patient_id: str, evaluation_id: str, document_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    document = db.query(Document).filter(
        Document.id == document_id, Document.patient_id == patient_id, Document.evaluation_id == evaluation_id
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = DOCS_DIR / document.filename
    if file_path.exists():
        os.remove(file_path)

    db.delete(document)
    db.commit()
    return _build_patient(patient, db)
