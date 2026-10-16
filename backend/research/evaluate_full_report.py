"""Produces every Chapter-7-shaped number the thesis evaluation tables ask
for, computed from a real run of the project's own trainer/feature code
against a dataset (synthetic demo or real, whichever --input points at).
Nothing here is invented after the fact; every number is a direct output of
scikit-learn/CatBoost metrics on this project's own chronological split.

Example:
    python -m research.evaluate_full_report \
      --input research_exports/SYNTHETIC_DEMO_encounters.csv \
      --output research_exports/model_artifacts/full-report.json
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
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    import numpy as np
    import pandas as pd
    from catboost import CatBoostClassifier
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import (
        f1_score, precision_score, recall_score, roc_auc_score,
    )
    from sklearn.multiclass import OneVsRestClassifier
    from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder

    rows = load_rows(args.input)
    split_at = max(1, int(len(rows) * 0.8))
    train_rows, test_rows = rows[:split_at], rows[split_at:]

    labeler = MultiLabelBinarizer()
    y_train = labeler.fit_transform([labels(row) for row in train_rows])
    y_test = labeler.transform([labels(row) for row in test_rows])
    classes = list(labeler.classes_)

    numeric_feats = {"age", "prom_score", "prom_max_score", "final_score", "pain_score"}
    categorical_feats = [f for f in FEATURES if f not in numeric_feats]

    def to_frame(rowset):
        df = pd.DataFrame([feature_row(r) for r in rowset]).fillna("")
        for f in FEATURES:
            if f in numeric_feats:
                df[f] = pd.to_numeric(df[f], errors="coerce").fillna(0)
            else:
                df[f] = df[f].astype(str)
        return df

    x_train = to_frame(train_rows)
    x_test = to_frame(test_rows)

    # --- 7.1 Dataset statistics --------------------------------------------
    all_treatments = Counter(t for row in rows for t in labels(row))
    all_body_areas = Counter(row["body_area"] for row in rows)
    prom_complete = sum(1 for row in rows if row.get("prom_score"))
    outcome_complete = sum(1 for row in rows if row.get("outcome_response"))
    dataset_stats = {
        "total_encounters": len(rows),
        "unique_patients": len({row["patient_hash"] for row in rows}),
        "date_range": [rows[0]["encounter_date"], rows[-1]["encounter_date"]],
        "encounters_by_body_area": dict(sorted(all_body_areas.items(), key=lambda kv: -kv[1])),
        "encounters_by_treatment_class": dict(sorted(all_treatments.items(), key=lambda kv: -kv[1])),
        "prom_completion_rate": round(prom_complete / len(rows), 4),
        "outcome_completion_rate": round(outcome_complete / len(rows), 4),
        "train_rows": len(train_rows),
        "test_rows": len(test_rows),
    }

    # --- helpers for 7.2/7.3/7.4 --------------------------------------------
    def top3_recall(y_true, proba):
        hits, total = 0, 0
        for i in range(len(y_true)):
            true_idx = set(np.where(y_true[i] == 1)[0])
            if not true_idx:
                continue
            top3 = set(np.argsort(-proba[i])[:3])
            hits += len(true_idx & top3)
            total += len(true_idx)
        return round(hits / total, 4) if total else None

    def safe_auroc(y_true, proba):
        try:
            # only over classes present with both 0s and 1s in y_true
            usable = [i for i in range(y_true.shape[1]) if len(set(y_true[:, i])) > 1]
            if not usable:
                return None
            return round(roc_auc_score(y_true[:, usable], proba[:, usable], average="macro"), 4)
        except ValueError:
            return None

    def metrics_block(y_true, y_pred_binary, proba):
        return {
            "macro_f1": round(f1_score(y_true, y_pred_binary, average="macro", zero_division=0), 4),
            "precision_macro": round(precision_score(y_true, y_pred_binary, average="macro", zero_division=0), 4),
            "recall_macro": round(recall_score(y_true, y_pred_binary, average="macro", zero_division=0), 4),
            "top3_recall": top3_recall(y_true, proba) if proba is not None else None,
            "auroc_macro": safe_auroc(y_true, proba) if proba is not None else None,
        }

    model_comparison = {}

    # Majority-class baseline
    train_label_counts = Counter(l for row in train_rows for l in labels(row))
    majority_label = train_label_counts.most_common(1)[0][0]
    majority_idx = classes.index(majority_label)
    y_pred_majority = np.zeros_like(y_test)
    y_pred_majority[:, majority_idx] = 1
    proba_majority = np.tile(y_train.mean(axis=0), (len(test_rows), 1))
    model_comparison["majority_class_baseline"] = metrics_block(y_test, y_pred_majority, proba_majority)

    # One-hot encode categoricals for sklearn models
    encoder = OneHotEncoder(handle_unknown="ignore")
    x_train_cat = encoder.fit_transform(x_train[categorical_feats])
    x_test_cat = encoder.transform(x_test[categorical_feats])
    from scipy.sparse import hstack
    x_train_sk = hstack([x_train_cat, x_train[list(numeric_feats)].values]).tocsr()
    x_test_sk = hstack([x_test_cat, x_test[list(numeric_feats)].values]).tocsr()

    # Regularized logistic regression (one-vs-rest)
    logreg = OneVsRestClassifier(LogisticRegression(max_iter=2000, C=1.0))
    logreg.fit(x_train_sk, y_train)
    logreg_proba = logreg.predict_proba(x_test_sk)
    logreg_pred = (logreg_proba >= 0.5).astype(int)
    model_comparison["regularized_logistic_regression"] = metrics_block(y_test, logreg_pred, logreg_proba)

    # Random forest (one-vs-rest)
    rf = OneVsRestClassifier(RandomForestClassifier(n_estimators=300, max_depth=8, random_state=42))
    rf.fit(x_train_sk, y_train)
    rf_proba = rf.predict_proba(x_test_sk)
    rf_pred = (rf_proba >= 0.5).astype(int)
    model_comparison["random_forest"] = metrics_block(y_test, rf_pred, rf_proba)

    # CatBoost (project's own trainer config)
    cat_idx = [i for i, f in enumerate(FEATURES) if f not in numeric_feats]
    cat_model = CatBoostClassifier(
        iterations=250, depth=5, learning_rate=0.05,
        loss_function="MultiLogloss", verbose=False,
        random_seed=42, allow_writing_files=False,
    )
    cat_model.fit(x_train, y_train, cat_features=cat_idx)
    cat_proba = cat_model.predict_proba(x_test)
    cat_pred = (cat_proba >= 0.5).astype(int)
    model_comparison["catboost"] = metrics_block(y_test, cat_pred, cat_proba)

    # --- 7.3 Calibration (CatBoost) -----------------------------------------
    brier_per_class = [
        float(np.mean((cat_proba[:, i] - y_test[:, i]) ** 2)) for i in range(len(classes))
    ]
    brier_score = round(float(np.mean(brier_per_class)), 4)

    top_pred_idx = np.argmax(cat_proba, axis=1)
    top_pred_conf = cat_proba[np.arange(len(test_rows)), top_pred_idx]
    correct_mask = np.array([
        y_test[i, top_pred_idx[i]] == 1 for i in range(len(test_rows))
    ])
    mean_conf_correct = round(float(top_pred_conf[correct_mask].mean()), 4) if correct_mask.any() else None
    mean_conf_incorrect = round(float(top_pred_conf[~correct_mask].mean()), 4) if (~correct_mask).any() else None

    calibration = {
        "brier_score_mean_per_class": brier_score,
        "mean_confidence_correct_top_pick": mean_conf_correct,
        "mean_confidence_incorrect_top_pick": mean_conf_incorrect,
        "n_correct_top_pick": int(correct_mask.sum()),
        "n_incorrect_top_pick": int((~correct_mask).sum()),
    }

    # --- 7.4 Subgroup performance by body area (test set) -------------------
    subgroup = []
    for area in sorted(set(r["body_area"] for r in test_rows)):
        idxs = [i for i, r in enumerate(test_rows) if r["body_area"] == area]
        if not idxs:
            continue
        yt = y_test[idxs]
        yp = cat_pred[idxs]
        pr = cat_proba[idxs]
        subgroup.append({
            "body_area": area,
            "n": len(idxs),
            "macro_f1": round(f1_score(yt, yp, average="macro", zero_division=0), 4),
            "top3_recall": top3_recall(yt, pr),
            "note": "n < 5 in test split; treat as directional only" if len(idxs) < 5 else "",
        })

    report = {
        "dataset_stats": dataset_stats,
        "model_comparison": model_comparison,
        "calibration": calibration,
        "subgroup_by_body_area": subgroup,
        "classes": classes,
        "data_provenance": "SYNTHETIC demo data generated for pipeline validation; not real patient records.",
        "warning": "Predicts observed clinician treatment choice, not causal treatment benefit. "
                   "All figures are a pipeline-validation run on synthetic data, not a real clinical evaluation.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
