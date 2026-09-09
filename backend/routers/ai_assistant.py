import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Assessment, Diagnostic, Encounter, Evaluation, ModelSuggestion, Patient, Treatment

router = APIRouter(prefix="/api/ai", tags=["AI Clinical Assistant"])

FEATURES = [
    "body_area", "encounter_type", "previsit_source", "gender", "prom_code",
    "age", "prom_score", "prom_max_score", "final_score", "pain_score",
    "diagnostic_types", "chief_complaint", "diagnosis",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _artifact_paths() -> tuple[Path, Path]:
    configured = os.getenv("MODEL_ARTIFACT_PATH")
    metadata = Path(configured) if configured else Path(__file__).resolve().parents[1] / "model_artifacts" / "treatment-choice.json"
    return metadata, metadata.with_suffix(".cbm")


def _latest(rows):
    return max(rows, key=lambda row: row.date or "", default=None)


def _feature_values(patient, assessment, evaluation, diagnostics, encounter):
    answers = assessment.answers if assessment and isinstance(assessment.answers, dict) else {}
    return {
        "body_area": encounter.bodyArea if encounter else patient.bodyArea,
        "encounter_type": encounter.encounterType if encounter else "initial",
        "previsit_source": encounter.previsitSource if encounter else "",
        "gender": patient.gender or "",
        "prom_code": assessment.promCode if assessment else "",
        "age": patient.age or 0,
        "prom_score": assessment.score if assessment else 0,
        "prom_max_score": assessment.maxScore if assessment else 0,
        "final_score": assessment.finalScore if assessment and assessment.finalScore is not None else 0,
        "pain_score": answers.get("pain_scale", 0),
        "diagnostic_types": "|".join(sorted({d.type for d in diagnostics if d.type})),
        "chief_complaint": assessment.chiefComplaint if assessment else "",
        "diagnosis": evaluation.diagnosis if evaluation else "",
    }


@router.get("/status")
def model_status(_: dict = Depends(get_current_user)):
    metadata_path, model_path = _artifact_paths()
    if not metadata_path.exists() or not model_path.exists():
        return {
            "available": False,
            "message": "No trained treatment model is installed. Collect and train a validated research dataset first.",
        }
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    return {"available": metadata.get("status") == "trained", "modelVersion": metadata.get("model_version"), "metadata": metadata}


@router.post("/patients/{patient_id}/recommendation")
def recommend_treatment(
    patient_id: str,
    encounter_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    metadata_path, model_path = _artifact_paths()
    if not metadata_path.exists() or not model_path.exists():
        return {"available": False, "suggestions": [], "warnings": ["No validated treatment model is installed."]}

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("status") != "trained":
        return {"available": False, "suggestions": [], "warnings": ["The model artifact is not marked as trained."]}
    try:
        import pandas as pd
        from catboost import CatBoostClassifier
    except ImportError:
        return {"available": False, "suggestions": [], "warnings": ["Research model dependencies are not installed on this server."]}

    encounter = None
    if encounter_id:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id, Encounter.patient_id == patient_id).first()
    if not encounter:
        encounter = db.query(Encounter).filter(Encounter.patient_id == patient_id, Encounter.status == "open").order_by(Encounter.encounterDate.desc()).first()
    assessments = db.query(Assessment).filter(Assessment.patient_id == patient_id).all()
    evaluations = db.query(Evaluation).filter(Evaluation.patient_id == patient_id).all()
    diagnostics = db.query(Diagnostic).filter(Diagnostic.patient_id == patient_id).all()
    assessment = _latest([a for a in assessments if not encounter or a.encounter_id in (None, encounter.id)])
    evaluation = _latest([e for e in evaluations if not encounter or e.encounter_id in (None, encounter.id)])
    # Scoped the same way as assessment/evaluation above — unscoped, this used
    # to feed every diagnostic the patient has ever had (including future/other
    # encounters) into "today's" prediction, a feature distribution the model
    # was never trained on (training only ever sees diagnostics keyed to the
    # one encounter they belong to — see routers/research.py's CSV export).
    encounter_diagnostics = [d for d in diagnostics if not encounter or d.encounter_id in (None, encounter.id)]
    values = _feature_values(patient, assessment, evaluation, encounter_diagnostics, encounter)
    frame = pd.DataFrame([{feature: values.get(feature, "") for feature in FEATURES}])
    for feature in ("age", "prom_score", "prom_max_score", "final_score", "pain_score"):
        frame[feature] = pd.to_numeric(frame[feature], errors="coerce").fillna(0)
    for feature in set(FEATURES) - {"age", "prom_score", "prom_max_score", "final_score", "pain_score"}:
        frame[feature] = frame[feature].fillna("").astype(str)

    model = CatBoostClassifier()
    model.load_model(str(model_path))
    probabilities = model.predict_proba(frame)
    classes = metadata.get("classes", [])
    if hasattr(probabilities, "tolist"):
        probabilities = probabilities.tolist()
    row = probabilities[0] if probabilities else []
    ranked = sorted(zip(classes, row), key=lambda item: item[1], reverse=True)[:3]
    suggestions = [{"treatment": treatment, "confidence": round(float(score), 4)} for treatment, score in ranked]
    warnings = []
    if not assessment:
        warnings.append("No pre-visit assessment is available for this encounter.")
    suggestion = ModelSuggestion(
        id=str(uuid.uuid4()), patient_id=patient_id,
        encounter_id=encounter.id if encounter else None,
        modelVersion=metadata.get("model_version", "unknown"),
        featureSnapshot=values, suggestions=suggestions,
        warnings=warnings, generatedAt=_now(),
    )
    db.add(suggestion)
    db.commit()
    return {"available": True, "suggestionId": suggestion.id, "modelVersion": suggestion.modelVersion, "suggestions": suggestions, "warnings": warnings}
