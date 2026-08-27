"""
Public, unauthenticated endpoints for the "patient self-completion" PROM
assignment path — opened from the tokenized link/QR code a doctor generates
in the assignment modal (see routers/prom_assignments.py). No patient login
exists in this app, so these routes are deliberately excluded from the
Depends(get_current_user) gate main.py applies to the rest of /api — see how
this router is registered.

Only ever looked up by the random accessToken, and only exposes the minimum
needed to render/score the questionnaire (first name, not the full chart).
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient, Assessment, AssessmentConfig, FollowUpCall, PROMAssignment
from notifications import create_staff_notification
from schemas import PublicPromConfigOut, PublicPromSubmit

router = APIRouter(prefix="/api/public", tags=["Public PROM Link"])


def _get_assignment_or_404(token: str, db: Session) -> PROMAssignment:
    assignment = db.query(PROMAssignment).filter(PROMAssignment.accessToken == token).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="This link is invalid.")
    return assignment


@router.get("/prom-assignments/{token}", response_model=PublicPromConfigOut)
def get_public_prom(token: str, db: Session = Depends(get_db)):
    assignment = _get_assignment_or_404(token, db)
    patient = db.query(Patient).filter(Patient.id == assignment.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if assignment.status == "completed":
        raise HTTPException(status_code=410, detail="This questionnaire has already been completed.")

    cfg = db.query(AssessmentConfig).filter(AssessmentConfig.bodyArea == assignment.bodyArea).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Questionnaire not found")

    return PublicPromConfigOut(
        patientFirstName=patient.name.split(" ")[0],
        bodyArea=assignment.bodyArea,
        promName=assignment.promName or cfg.promName,
        status=assignment.status,
        config={
            "id": cfg.configId,
            "title": cfg.title,
            "description": cfg.description,
            "sections": cfg.sections,
            "promName": cfg.promName,
            "scoreCalculation": cfg.scoreCalculation,
            "scoreDirection": cfg.scoreDirection,
            "rawMax": cfg.rawMax,
            "conversionTable": cfg.conversionTable,
            "icon": cfg.icon,
        },
    )


@router.post("/prom-assignments/{token}/submit")
def submit_public_prom(token: str, body: PublicPromSubmit, db: Session = Depends(get_db)):
    assignment = _get_assignment_or_404(token, db)
    if assignment.status == "completed":
        raise HTTPException(status_code=410, detail="This questionnaire has already been completed.")

    patient = db.query(Patient).filter(Patient.id == assignment.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    now = datetime.utcnow()
    answered_by_label = "Parent/Caregiver (self-service)" if assignment.respondentType == "parent_caregiver" else "Patient (self-service)"

    assessment = Assessment(
        id=str(uuid.uuid4()),
        patient_id=assignment.patient_id,
        date=now.strftime("%Y-%m-%d"),
        type="Pre-Visit",
        score=body.score,
        maxScore=body.maxScore,
        bodyArea=assignment.bodyArea,
        completedBy=answered_by_label,
        finalScore=body.finalScore,
        interpretation=body.interpretation,
        promCode=body.promCode,
        answers=body.answers,
    )
    db.add(assessment)

    assignment.status = "completed"
    assignment.answeredBy = assignment.respondentType
    assignment.enteredBy = answered_by_label
    assignment.completedAt = now.isoformat() + "Z"
    assignment.assessmentId = assessment.id

    # Mirrors what the nurse's own web flow does after saving an assessment
    # (frontend/src/pages/PreVisitAssessment.jsx): flip the patient out of
    # "pending" so the dashboard's "Start Call" button and status badge
    # update immediately, same as if the nurse had made this call herself.
    if patient.status == "pending":
        patient.status = "assessment-completed"

    # If this assignment was auto-sent for a recurring follow-up call (see
    # prom_assignments.auto_progress_prom_assignments), close that call out
    # too — otherwise it would keep showing as due even though it's answered.
    linked_call = db.query(FollowUpCall).filter(FollowUpCall.promAssignmentId == assignment.id).first()
    if linked_call and linked_call.status == "pending":
        linked_call.status = "completed"
        linked_call.completedAssessmentId = assessment.id

    db.commit()

    create_staff_notification(
        db, patient.id,
        title=f"{patient.name} completed their {'follow-up' if linked_call else 'pre-visit'} questionnaire",
        body=f"{assignment.bodyArea} PROM · completed via mobile self-service",
        related_type="assessment", related_id=assessment.id,
    )

    return {"status": "ok"}
