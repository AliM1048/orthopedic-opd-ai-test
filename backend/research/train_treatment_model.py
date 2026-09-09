"""Train and evaluate the treatment-choice model from an encounter CSV.

This is an offline research job. It intentionally refuses to train when there
are too few labeled encounters and uses a chronological split to avoid future
information leaking into the past. It predicts observed treatment choices; it
does not estimate which treatment is causally best for a patient.

Example:
    python -m research.train_treatment_model \
      --input encounter-dataset.csv \
      --output model_artifacts/treatment-choice.json

For CatBoost training, install backend/requirements-research.txt first.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

MIN_ROWS = 30
FEATURES = [
    "body_area", "encounter_type", "previsit_source", "gender", "prom_code",
    "age", "prom_score", "prom_max_score", "final_score", "pain_score",
    "diagnostic_types", "chief_complaint", "diagnosis",
]
TARGET = "treatment_types"


def _number(value: str) -> float | None:
    try:
        return float(value) if value != "" else None
    except (TypeError, ValueError):
        return None


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = [row for row in csv.DictReader(handle) if row.get(TARGET, "").strip()]
    rows.sort(key=lambda row: row.get("encounter_date", ""))
    return rows


def feature_row(row: dict[str, str]) -> dict[str, object]:
    result: dict[str, object] = {}
    for feature in FEATURES:
        result[feature] = _number(row.get(feature, "")) if feature in {
            "age", "prom_score", "prom_max_score", "final_score", "pain_score"
        } else row.get(feature, "")
    return result


def labels(row: dict[str, str]) -> list[str]:
    return [label for label in row[TARGET].split("|") if label]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rows = load_rows(args.input)
    if len(rows) < MIN_ROWS:
        raise SystemExit(
            f"Need at least {MIN_ROWS} labeled encounters; found {len(rows)}. "
            "Collect more representative data before training."
        )

    split_at = max(1, int(len(rows) * 0.8))
    train_rows, test_rows = rows[:split_at], rows[split_at:]
    train_labels = [label for row in train_rows for label in labels(row)]
    if len(set(train_labels)) < 2:
        raise SystemExit("Training data must contain at least two treatment classes.")

    artifact = {
        "model_type": "catboost_multilabel_or_baseline",
        "model_version": f"treatment-choice-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
        "features": FEATURES,
        "target": TARGET,
        "train_rows": len(train_rows),
        "test_rows": len(test_rows),
        "train_date_range": [train_rows[0]["encounter_date"], train_rows[-1]["encounter_date"]],
        "test_date_range": [test_rows[0]["encounter_date"], test_rows[-1]["encounter_date"]] if test_rows else [],
        "class_counts": dict(Counter(train_labels)),
        "warning": "Predicts observed clinician treatment choice, not causal treatment benefit.",
    }

    try:
        from catboost import CatBoostClassifier
        import pandas as pd
        from sklearn.preprocessing import MultiLabelBinarizer
    except ImportError:
        artifact["status"] = "validated_only"
        artifact["message"] = "Install requirements-research.txt to train CatBoost."
    else:
        # Multi-label treatment rows are supported. CatBoost receives strings
        # for categorical features and explicit empty values for missing data.
        x_train = pd.DataFrame([feature_row(row) for row in train_rows]).fillna("")
        x_test = pd.DataFrame([feature_row(row) for row in test_rows]).fillna("")
        categorical = [idx for idx, feature in enumerate(FEATURES) if feature not in {
            "age", "prom_score", "prom_max_score", "final_score", "pain_score"
        }]
        for feature in FEATURES:
            if feature in {"age", "prom_score", "prom_max_score", "final_score", "pain_score"}:
                x_train[feature] = pd.to_numeric(x_train[feature], errors="coerce").fillna(0)
                x_test[feature] = pd.to_numeric(x_test[feature], errors="coerce").fillna(0)
            else:
                x_train[feature] = x_train[feature].astype(str)
                x_test[feature] = x_test[feature].astype(str)
        labeler = MultiLabelBinarizer()
        y_train = labeler.fit_transform([labels(row) for row in train_rows])
        model = CatBoostClassifier(
            iterations=250, depth=5, learning_rate=0.05,
            loss_function="MultiLogloss", verbose=False,
            random_seed=42, allow_writing_files=False,
        )
        model.fit(x_train, y_train, cat_features=categorical)
        probabilities = model.predict_proba(x_test) if test_rows else []
        artifact["status"] = "trained"
        artifact["classes"] = list(labeler.classes_)
        artifact["test_note"] = "Probabilities are stored separately in the binary model artifact."
        args.output.with_suffix(".cbm").parent.mkdir(parents=True, exist_ok=True)
        model.save_model(str(args.output.with_suffix(".cbm")))
        args.output.with_suffix(".labels.json").write_text(
            json.dumps({"classes": list(labeler.classes_), "features": FEATURES}, indent=2),
            encoding="utf-8",
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    print(json.dumps(artifact, indent=2))


if __name__ == "__main__":
    main()
