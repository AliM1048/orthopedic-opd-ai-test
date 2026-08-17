"""
PROM outcome trend — plots a patient's score at fixed clinical follow-up
timepoints (Baseline, 6 Weeks, 3/6/12 Months, 2/5 Years) rather than raw
visit dates, with vertical markers for Surgery/Injection/Start Physiotherapy
(read from existing Treatment rows) and New Injury (see InjuryEvent below,
the one event type with no other home in the data model).

A timepoint with no assessment close enough to it is reported as a missing
(null) point — never interpolated or fabricated. "Close enough" is a
tolerance window proportional to how far out the timepoint is (tighter near
baseline, looser at 2/5 years, since visits drift further from the exact
target date the longer the horizon).
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient, Assessment, Treatment, InjuryEvent, AssessmentConfig
from schemas import (
    InjuryEventCreate, InjuryEventOut, PromTrendOut, PromTrendPoint, PromTrendEvent,
)

router = APIRouter(prefix="/api", tags=["PROM Trend"])

# (label, target day offset, tolerance in days)
TIMEPOINTS = [
    ("Baseline",   0,    0),
    ("6 Weeks",    42,   14),
    ("3 Months",   91,   21),
    ("6 Months",   182,  42),
    ("12 Months",  365,  56),
    ("2 Years",    730,  91),
    ("5 Years",    1825, 182),
]

# Treatment.type values, as stored (see frontend TREATMENT_OPTIONS names).
_SURGERY = "Surgery"
_INJECTION = "Injection Therapy"
_PHYSIO = "Physiotherapy"


def _parse_date(value: str):
    return datetime.strptime(value, "%Y-%m-%d").date()


@router.get("/patients/{patient_id}/prom-trend", response_model=PromTrendOut)
def get_prom_trend(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    assessments = (
        db.query(Assessment)
        .filter(Assessment.patient_id == patient_id, Assessment.finalScore.isnot(None))
        .order_by(Assessment.date)
        .all()
    )
    if not assessments:
        cfg = db.query(AssessmentConfig).filter(AssessmentConfig.bodyArea == patient.bodyArea).first()
        return PromTrendOut(
            promName=cfg.promName if cfg else None,
            scoreDirection=cfg.scoreDirection if cfg else "higher_better",
            points=[PromTrendPoint(label=label, dayOffset=offset, date=None, score=None) for label, offset, _ in TIMEPOINTS],
        )

    baseline = assessments[0]
    baseline_date = _parse_date(baseline.date)
    cfg = db.query(AssessmentConfig).filter(AssessmentConfig.bodyArea == baseline.bodyArea).first()

    # For each timepoint after baseline, take whichever assessment lands
    # closest to (baseline + offset), but only if it's within that
    # timepoint's tolerance — otherwise the point stays Missing.
    points = []
    for label, offset, tolerance in TIMEPOINTS:
        if offset == 0:
            points.append(PromTrendPoint(label=label, dayOffset=0, date=baseline.date, score=baseline.finalScore))
            continue
        target = baseline_date.toordinal() + offset
        best, best_diff = None, None
        for a in assessments:
            diff = abs(_parse_date(a.date).toordinal() - target)
            if best_diff is None or diff < best_diff:
                best, best_diff = a, diff
        if best is not None and best_diff <= tolerance:
            points.append(PromTrendPoint(label=label, dayOffset=offset, date=best.date, score=best.finalScore))
        else:
            points.append(PromTrendPoint(label=label, dayOffset=offset, date=None, score=None))

    # Vertical event markers.
    treatments = db.query(Treatment).filter(Treatment.patient_id == patient_id).order_by(Treatment.date).all()
    events = []
    seen_physio_start = False
    for t in treatments:
        try:
            offset = (_parse_date(t.date).toordinal() - baseline_date.toordinal())
        except ValueError:
            continue
        if t.type == _SURGERY:
            events.append(PromTrendEvent(type="surgery", label="Surgery", date=t.date, dayOffset=offset))
        elif t.type == _INJECTION:
            events.append(PromTrendEvent(type="injection", label="Injection", date=t.date, dayOffset=offset))
        elif t.type == _PHYSIO and not seen_physio_start:
            events.append(PromTrendEvent(type="physiotherapy", label="Start Physiotherapy", date=t.date, dayOffset=offset))
            seen_physio_start = True

    injuries = db.query(InjuryEvent).filter(InjuryEvent.patient_id == patient_id).order_by(InjuryEvent.date).all()
    for inj in injuries:
        try:
            offset = (_parse_date(inj.date).toordinal() - baseline_date.toordinal())
        except ValueError:
            continue
        events.append(PromTrendEvent(type="new_injury", label="New Injury", date=inj.date, dayOffset=offset))
    events.sort(key=lambda e: e.dayOffset)

    known = [p for p in points if p.score is not None]
    improvement = (known[-1].score - known[0].score) if len(known) >= 2 else None

    return PromTrendOut(
        promName=cfg.promName if cfg else None,
        scoreDirection=cfg.scoreDirection if cfg else "higher_better",
        baselineDate=baseline.date,
        points=points,
        events=events,
        improvement=improvement,
    )


@router.get("/patients/{patient_id}/injury-events", response_model=list[InjuryEventOut])
def list_injury_events(patient_id: str, db: Session = Depends(get_db)):
    rows = db.query(InjuryEvent).filter(InjuryEvent.patient_id == patient_id).order_by(InjuryEvent.date).all()
    return [InjuryEventOut.model_validate(r) for r in rows]


@router.post("/patients/{patient_id}/injury-events", response_model=InjuryEventOut)
def create_injury_event(patient_id: str, body: InjuryEventCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    event = InjuryEvent(id=str(uuid.uuid4()), patient_id=patient_id, date=body.date, note=body.note)
    db.add(event)
    db.commit()
    db.refresh(event)
    return InjuryEventOut.model_validate(event)


@router.delete("/injury-events/{event_id}")
def delete_injury_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(InjuryEvent).filter(InjuryEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Injury event not found")
    db.delete(event)
    db.commit()
    return {"status": "ok"}
