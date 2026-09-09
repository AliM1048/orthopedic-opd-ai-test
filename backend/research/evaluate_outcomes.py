"""Summarize treatment outcome labels from the de-identified encounter export.

This is descriptive observational analysis. It must not be interpreted as a
causal comparison of treatment effectiveness.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    with args.input.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    outcome_rows = [row for row in rows if row.get("outcome_response")]
    by_treatment: dict[str, Counter[str]] = defaultdict(Counter)
    for row in outcome_rows:
        treatments = [value for value in row.get("treatment_types", "").split("|") if value]
        for treatment in treatments or ["unknown"]:
            by_treatment[treatment][row["outcome_response"]] += 1

    report = {
        "rows": len(rows),
        "outcome_rows": len(outcome_rows),
        "outcome_completion_rate": round(len(outcome_rows) / len(rows), 4) if rows else 0,
        "response_counts": dict(Counter(row["outcome_response"] for row in outcome_rows)),
        "treatment_response_counts": {key: dict(value) for key, value in sorted(by_treatment.items())},
        "warning": "Descriptive observational analysis; not a causal treatment-effect estimate.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
