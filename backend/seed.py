"""Seed script: reads reference/demo data out of frontend/src/data/mockData.js
(patients, PROM assessment configs, status/diagnostic/treatment lookup data)
and inserts it into PostgreSQL, so the frontend can fetch it dynamically via
the API instead of bundling it as JS constants."""
import sys
import os
import re
import ast
import copy

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import (
    Patient, Assessment, Evaluation, Diagnostic, Treatment,
    AssessmentConfig, StatusConfig, DiagnosticTestOption, TreatmentOption,
)

MOCK_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "mockData.js")


def parse_js_export(content: str, export_name: str):
    """Extract a `export const <export_name> = <literal>` from mockData.js's
    JS source and return it as a native Python object.

    <literal> may be a `[...]` array or a `{...}` object — either way this
    bracket-matches on the *outermost* pair of that same bracket type only
    (ignoring the other bracket type entirely, and skipping bracket
    characters that appear inside string literals) to find where the export
    ends, then converts JS literal syntax to Python (null/true/false, bare
    object keys) and evaluates it with ast.literal_eval. This only works for
    plain data literals (no JS expressions/functions), which is all these
    exports are.
    """
    marker = f"export const {export_name} = "
    start = content.find(marker)
    if start == -1:
        raise ValueError(f"Could not find export '{export_name}' in mockData.js")
    start = start + len(marker)
    while content[start] in " \t\r\n":
        start += 1
    open_ch = content[start]
    close_ch = {"[": "]", "{": "}"}[open_ch]

    depth = 0
    in_string = False
    quote_ch = None
    esc = False
    end = start
    for i in range(start, len(content)):
        ch = content[i]
        if esc:
            esc = False
            continue
        if ch == "\\":
            esc = True
            continue
        if in_string:
            if ch == quote_ch:
                in_string = False
            continue
        if ch in ("'", '"', "`"):
            in_string = True
            quote_ch = ch
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    raw = content[start:end]

    # Strip // line comments (outside strings) — same approach as before,
    # applied to just this slice rather than the whole file.
    raw = re.sub(r"//[^\n]*", "", raw)

    # JS -> Python literal conversions
    raw = raw.replace("null", "None")
    raw = raw.replace("true", "True").replace("false", "False")

    # Quote bare object keys: word chars before `:` after `{`, `,`, or whitespace
    raw = re.sub(r"(?<=[{,\s])(\w+)(?=\s*:)", r"'\1'", raw)

    return ast.literal_eval(raw)


def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    # mockData.js is a one-time seed source, deleted from the frontend once
    # the DB held its data — this script has already served its original
    # purpose, so a fresh DB in the future simply skips patient seeding
    # rather than crashing on the missing file.
    content = None
    if os.path.exists(MOCK_PATH):
        with open(MOCK_PATH, "r", encoding="utf-8") as f:
            content = f.read()

    db = SessionLocal()
    try:
        if content and db.query(Patient).count() == 0:
            patients_data = copy.deepcopy(parse_js_export(content, "MOCK_PATIENTS"))
            print(f"Found {len(patients_data)} patients in mock data")

            for pdata in patients_data:
                assessments_data = pdata.pop("assessments", [])
                evaluations_data = pdata.pop("evaluations", [])
                diagnostics_data = pdata.pop("diagnostics", [])
                treatments_data = pdata.pop("treatments", [])

                patient = Patient(**pdata)
                db.add(patient)
                db.flush()

                for adata in assessments_data:
                    db.add(Assessment(**adata, patient_id=patient.id))
                for edata in evaluations_data:
                    db.add(Evaluation(**edata, patient_id=patient.id))
                for ddata in diagnostics_data:
                    db.add(Diagnostic(**ddata, patient_id=patient.id))
                for tdata in treatments_data:
                    db.add(Treatment(**tdata, patient_id=patient.id))

            db.commit()
            print(f"Seeded {len(patients_data)} patients with their nested data.")
        else:
            print(f"Database already has {db.query(Patient).count()} patients. Skipping patient seed.")

        if content and db.query(AssessmentConfig).count() == 0:
            configs = parse_js_export(content, "ASSESSMENT_CONFIG")
            for area, cfg in configs.items():
                db.add(AssessmentConfig(
                    bodyArea=area, configId=cfg["id"], title=cfg["title"],
                    description=cfg.get("description"), sections=cfg["sections"],
                ))
            db.commit()
            print(f"Seeded {len(configs)} assessment configs.")
        else:
            print("Assessment configs already seeded (or no mock source available), skipping.")

        if content and db.query(StatusConfig).count() == 0:
            rows = parse_js_export(content, "STATUS_CONFIG")
            for i, (status_id, cfg) in enumerate(rows.items()):
                db.add(StatusConfig(statusId=status_id, label=cfg["label"], badgeClass=cfg["class"], color=cfg["color"], sortOrder=i))
            db.commit()
            print(f"Seeded {len(rows)} status configs.")
        else:
            print("Status configs already seeded (or no mock source available), skipping.")

        if content and db.query(DiagnosticTestOption).count() == 0:
            rows = parse_js_export(content, "DIAGNOSTIC_TESTS")
            for i, row in enumerate(rows):
                db.add(DiagnosticTestOption(id=row["id"], name=row["name"], icon=row["icon"], desc=row["desc"], sortOrder=i))
            db.commit()
            print(f"Seeded {len(rows)} diagnostic test options.")
        else:
            print("Diagnostic test options already seeded (or no mock source available), skipping.")

        if content and db.query(TreatmentOption).count() == 0:
            rows = parse_js_export(content, "TREATMENT_OPTIONS")
            for i, row in enumerate(rows):
                db.add(TreatmentOption(id=row["id"], name=row["name"], icon=row["icon"], desc=row["desc"], sortOrder=i))
            db.commit()
            print(f"Seeded {len(rows)} treatment options.")
        else:
            print("Treatment options already seeded (or no mock source available), skipping.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
