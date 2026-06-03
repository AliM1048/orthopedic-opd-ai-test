"""Seed script: reads patient data from frontend/src/data/mockData.js
and inserts it into PostgreSQL."""
import sys
import os
import re
import ast

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import Patient, Assessment, Evaluation, Diagnostic, Treatment

MOCK_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "mockData.js")


def parse_mock_data():
    with open(MOCK_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove JS comments
    content = re.sub(r"//.*", "", content)

    # Locate MOCK_PATIENTS array
    start = content.find("export const MOCK_PATIENTS = [")
    if start == -1:
        print("Could not find MOCK_PATIENTS in mockData.js")
        sys.exit(1)
    start = content.find("[", start)

    # Find matching closing bracket
    depth = 0
    in_string = False
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
        if ch in ("'", '"', "`"):
            in_string = not in_string
            continue
        if not in_string:
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break

    raw = content[start:end]

    # JS → Python conversions
    raw = raw.replace("null", "None")
    raw = raw.replace("true", "True").replace("false", "False")

    # Quote bare object keys: word chars before `:` after `{`, `,`, or whitespace
    raw = re.sub(r"(?<=[{,\s])(\w+)(?=\s*:)", r"'\1'", raw)

    # Evaluate as a Python literal
    data = ast.literal_eval(raw)
    return data


def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existing = db.query(Patient).count()
        if existing > 0:
            print(f"Database already has {existing} patients. Skipping (use --force to re-seed).")
            return

        patients_data = parse_mock_data()
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
    finally:
        db.close()


if __name__ == "__main__":
    seed()
