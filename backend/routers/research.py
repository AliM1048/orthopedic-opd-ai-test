import csv
import hashlib
import io
import os
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Assessment, Diagnostic, Encounter, Evaluation, Patient, Treatment, TreatmentOutcome

router = APIRouter(prefix="/api/research", tags=["Research Dataset"])


def _patient_hash(patient_id: str) -> str:
    salt = os.getenv("RESEARCH_HASH_SALT", "change-research-hash-salt")
    return hashlib.sha256(f"{salt}:{patient_id}".encode("utf-8")).hexdigest()[:24]


def _latest(rows):
    return max(rows, key=lambda row: row.date or "", default=None)


@router.get("/encounters.csv")
def export_encounter_dataset(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Export one de-identified, reproducible row per encounter.

    Direct identifiers are intentionally excluded. The export is a research
    starting point, not a replacement for the normalized clinical database.
    """
    patients = {p.id: p for p in db.query(Patient).all()}
    assessments = {}
    for row in db.query(Assessment).all():
        if row.encounter_id:
            assessments.setdefault(row.encounter_id, []).append(row)
    evaluations = {}
    for row in db.query(Evaluation).all():
        if row.encounter_id:
            evaluations.setdefault(row.encounter_id, []).append(row)
    diagnostics = {}
    for row in db.query(Diagnostic).all():
        if row.encounter_id:
            diagnostics.setdefault(row.encounter_id, []).append(row)
    treatments = {}
    for row in db.query(Treatment).all():
        if row.encounter_id:
            treatments.setdefault(row.encounter_id, []).append(row)
    outcomes = {}
    for row in db.query(TreatmentOutcome).all():
        if row.encounter_id:
            outcomes.setdefault(row.encounter_id, []).append(row)

    fields = [
        "encounter_id", "patient_hash", "encounter_date", "encounter_type", "body_area",
        "previsit_source", "age", "gender", "prom_code", "prom_score", "prom_max_score",
        "final_score", "pain_score", "chief_complaint", "diagnosis", "diagnostic_types",
        "treatment_types", "treatment_count", "outcome_score",
            "outcome_response", "outcome_adherence", "outcome_escalation",
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()

    for encounter in db.query(Encounter).order_by(Encounter.encounterDate).all():
        patient = patients.get(encounter.patient_id)
        if not patient:
            continue
        assessment = _latest(assessments.get(encounter.id, []))
        evaluation = _latest(evaluations.get(encounter.id, []))
        encounter_treatments = treatments.get(encounter.id, [])
        encounter_outcomes = outcomes.get(encounter.id, [])
        encounter_diagnostics = diagnostics.get(encounter.id, [])
        answers = assessment.answers if assessment else {}
        writer.writerow({
            "encounter_id": encounter.id,
            "patient_hash": _patient_hash(encounter.patient_id),
            "encounter_date": encounter.encounterDate,
            "encounter_type": encounter.encounterType,
            "body_area": encounter.bodyArea or patient.bodyArea,
            "previsit_source": encounter.previsitSource or "",
            "age": patient.age,
            "gender": patient.gender,
            "prom_code": assessment.promCode if assessment else "",
            "prom_score": assessment.score if assessment else "",
            "prom_max_score": assessment.maxScore if assessment else "",
            "final_score": assessment.finalScore if assessment else "",
            "pain_score": answers.get("pain_scale", "") if isinstance(answers, dict) else "",
            "chief_complaint": assessment.chiefComplaint if assessment else "",
            "diagnosis": evaluation.diagnosis if evaluation else "",
            "diagnostic_types": "|".join(sorted({d.type for d in encounter_diagnostics if d.type})),
            "treatment_types": "|".join(sorted({t.type for t in encounter_treatments if t.type})),
            "treatment_count": len(encounter_treatments),
            "outcome_score": max((o.followupScore for o in encounter_outcomes if o.followupScore is not None), default=""),
                "outcome_response": next((o.response for o in sorted(encounter_outcomes, key=lambda item: item.outcomeDate, reverse=True) if o.response), ""),
                "outcome_adherence": next((o.adherence for o in sorted(encounter_outcomes, key=lambda item: item.outcomeDate, reverse=True) if o.adherence), ""),
                "outcome_escalation": next((o.escalation for o in sorted(encounter_outcomes, key=lambda item: item.outcomeDate, reverse=True) if o.escalation), ""),
        })

    output.seek(0)
    filename = f"encounter-dataset-{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
