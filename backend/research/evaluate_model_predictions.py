"""Compute held-out classification metrics for a trained treatment-choice model.

train_treatment_model.py trains and saves the model but only reports class
counts, not predictive performance. This script reloads the saved CatBoost
artifact, re-predicts on the same chronological test split, and reports
standard multi-label classification metrics plus a majority-class baseline
for comparison. Descriptive only; not a causal treatment-effect estimate.

Example:
    python -m research.evaluate_model_predictions \
      --input research_exports/SYNTHETIC_DEMO_encounters.csv \
      --model research_exports/model_artifacts/treatment-choice.cbm \
      --output research_exports/model_artifacts/evaluation-report.json
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from research.train_treatment_model import FEATURES, feature_row, labels, load_rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    from catboost import CatBoostClassifier
    import pandas as pd
    from sklearn.metrics import (
        accuracy_score, f1_score, hamming_loss, precision_score, recall_score,
    )
    from sklearn.preprocessing import MultiLabelBinarizer

    rows = load_rows(args.input)
    split_at = max(1, int(len(rows) * 0.8))
    train_rows, test_rows = rows[:split_at], rows[split_at:]

    labeler = MultiLabelBinarizer()
    y_train = labeler.fit_transform([labels(row) for row in train_rows])
    y_test = labeler.transform([labels(row) for row in test_rows])

    x_test = pd.DataFrame([feature_row(row) for row in test_rows]).fillna("")
    categorical_cols = [f for f in FEATURES if f not in {
        "age", "prom_score", "prom_max_score", "final_score", "pain_score"
    }]
    for feature in FEATURES:
        if feature in {"age", "prom_score", "prom_max_score", "final_score", "pain_score"}:
            x_test[feature] = pd.to_numeric(x_test[feature], errors="coerce").fillna(0)
        else:
            x_test[feature] = x_test[feature].astype(str)

    model = CatBoostClassifier()
    model.load_model(str(args.model))
    y_pred = (model.predict_proba(x_test) >= 0.5).astype(int)

    # Majority-class baseline: always predict the single most frequent training label.
    train_label_counts = Counter(label for row in train_rows for label in labels(row))
    majority_label = train_label_counts.most_common(1)[0][0]
    majority_vec = [1 if cls == majority_label else 0 for cls in labeler.classes_]
    y_baseline = [majority_vec for _ in test_rows]

    def classification_block(y_true, y_hat):
        return {
            "subset_accuracy": round(accuracy_score(y_true, y_hat), 4),
            "hamming_loss": round(hamming_loss(y_true, y_hat), 4),
            "micro_f1": round(f1_score(y_true, y_hat, average="micro", zero_division=0), 4),
            "macro_f1": round(f1_score(y_true, y_hat, average="macro", zero_division=0), 4),
            "macro_precision": round(precision_score(y_true, y_hat, average="macro", zero_division=0), 4),
            "macro_recall": round(recall_score(y_true, y_hat, average="macro", zero_division=0), 4),
            "per_class_f1": {
                cls: round(score, 4)
                for cls, score in zip(labeler.classes_, f1_score(y_true, y_hat, average=None, zero_division=0))
            },
        }

    feature_importance = dict(zip(FEATURES, [round(v, 2) for v in model.get_feature_importance()]))
    feature_importance = dict(sorted(feature_importance.items(), key=lambda kv: -kv[1]))

    report = {
        "n_train": len(train_rows),
        "n_test": len(test_rows),
        "classes": list(labeler.classes_),
        "model": classification_block(y_test, y_pred),
        "majority_class_baseline": classification_block(y_test, y_baseline),
        "majority_baseline_label": majority_label,
        "feature_importance": feature_importance,
        "data_provenance": "SYNTHETIC demo data generated for pipeline validation; not real patient records.",
        "warning": "Predicts observed clinician treatment choice, not causal treatment benefit. "
                   "Descriptive pipeline-validation metrics only.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
