from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import AssessmentConfig, StatusConfig, DiagnosticTestOption, TreatmentOption

router = APIRouter(prefix="/api", tags=["Lookup Data"])


@router.get("/questions")
def get_questions(body_area: str = "Knee", db: Session = Depends(get_db)):
    cfg = (
        db.query(AssessmentConfig).filter(AssessmentConfig.bodyArea == body_area).first()
        or db.query(AssessmentConfig).filter(AssessmentConfig.bodyArea == "Other").first()
    )
    return {
        "bodyArea": cfg.bodyArea,
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
    }


@router.get("/body-areas")
def get_body_areas(db: Session = Depends(get_db)):
    # "Other" is a generic manual-entry fallback and "Spine" is the retired
    # legacy config (superseded by the real Low Back / Neck & Cervical
    # instruments) — neither belongs in the region-picker's selectable list.
    rows = (
        db.query(AssessmentConfig)
        .filter(AssessmentConfig.bodyArea.notin_(["Other", "Spine"]))
        .order_by(AssessmentConfig.bodyArea)
        .all()
    )
    return {
        "bodyAreas": [
            {"bodyArea": r.bodyArea, "promName": r.promName, "icon": r.icon, "title": r.title}
            for r in rows
        ]
    }


@router.get("/status-config")
def get_status_config(db: Session = Depends(get_db)):
    rows = db.query(StatusConfig).order_by(StatusConfig.sortOrder).all()
    return {
        "statusConfig": {
            r.statusId: {"label": r.label, "class": r.badgeClass, "color": r.color} for r in rows
        }
    }


@router.get("/diagnostic-tests")
def get_diagnostic_tests(db: Session = Depends(get_db)):
    rows = db.query(DiagnosticTestOption).order_by(DiagnosticTestOption.sortOrder).all()
    return {"diagnosticTests": [{"id": r.id, "name": r.name, "icon": r.icon, "desc": r.desc} for r in rows]}


@router.get("/treatment-options")
def get_treatment_options(db: Session = Depends(get_db)):
    rows = db.query(TreatmentOption).order_by(TreatmentOption.sortOrder).all()
    return {"treatmentOptions": [{"id": r.id, "name": r.name, "icon": r.icon, "desc": r.desc} for r in rows]}
