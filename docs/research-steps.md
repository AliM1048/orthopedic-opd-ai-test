# Orthopedic AI Research Steps

This document is the implementation and research checklist for the thesis project. It records what has been completed, what must happen next, and what evidence must be reported in the final thesis.

## Research Scope

The first model predicts observed clinician treatment choices from information available before the treatment decision. It does not autonomously diagnose, prescribe, or prove which treatment is medically optimal.

The system supports all configured orthopedic body areas. Performance must be reported overall and separately by body area.

## Step 1 - Define The Research Question

Primary question:

> Can pre-visit patient-reported outcomes and longitudinal orthopedic records predict the treatment option selected by a clinician during an outpatient encounter?

Secondary questions:

- Does PROM information improve prediction over demographic data alone?
- Which model performs best on structured orthopedic data?
- Are the predictions calibrated and explainable?
- How often should the system abstain because information is insufficient?
- Are there differences in performance between body areas or patient groups?

Required decision:

- Do not describe observed treatment-choice prediction as causal treatment-effect prediction.

## Step 2 - Governance And Ethics

Before using real patient data for research:

- Obtain hospital approval.
- Confirm university ethics or IRB requirements.
- Define who can access identifiable records.
- Use de-identified exports for research.
- Store the research hash salt outside source control.
- Do not export patient name, MRN, phone, email, or address.
- Document consent and permitted secondary use of data.
- Define retention and deletion rules.

## Step 3 - Capture The Clinical Encounter

One encounter represents one clinical decision context.

The system now supports an `Encounter` record containing:

- Patient ID
- Provider
- Encounter date
- Encounter type
- Body area
- Pre-visit source
- Status
- Created and updated timestamps

The same encounter can contain:

- Patient or nurse PROM assessment
- Physician evaluation
- Diagnostics
- Treatments
- Documents
- AI suggestion
- Clinician feedback
- Later outcome information

## Step 4 - Link Clinical Records

New clinical records should include `encounter_id`:

- Assessments
- Evaluations
- Surgery evaluations
- Diagnostics
- Treatments
- Documents
- PROM assignments
- Treatment outcomes

Legacy records may have a null encounter ID. They must be marked as legacy or backfilled only when the visit relationship is reliable.

## Step 5 - Define The Treatment Taxonomy

Normalize free-text treatment records into stable categories, for example:

- Medication
- Physiotherapy
- Injection therapy
- Surgery
- Rest and monitoring
- Long-term rehabilitation

Record the original clinician text separately from the normalized label. Never overwrite the original clinical record during normalization.

## Step 6 - Define PROM Features

Keep the raw PROM answers and store derived fields:

- PROM instrument
- PROM version
- Body area
- Language
- Respondent type
- Raw score
- Maximum score
- Normalized score
- Score direction
- Pain score
- Completion source
- Completion date
- Missingness reason

The feature snapshot used by the model must contain only data available before the treatment decision.

## Step 7 - Record Treatment Outcomes

The Physician Evaluation page now supports `Record Outcome`.

Record:

- Treatment ID
- Encounter ID
- Outcome date
- Follow-up PROM score
- Improved, unchanged, or worse
- Adherence
- Adverse events
- Escalation
- Clinician note
- Recording clinician

Outcome collection should happen at predefined follow-up windows, such as 3, 6, and 9 months, or according to the hospital protocol.

## Step 8 - Export The Research Dataset

Protected endpoint:

```text
GET /api/research/encounters.csv
```

The export is one row per encounter and contains:

- Pseudonymous patient hash
- Encounter fields
- Demographics
- PROM features
- Pain score
- Diagnosis
- Diagnostic types
- Treatment labels
- Follow-up outcome information

Direct identifiers are excluded.

Set a production research hash salt using an environment variable:

```text
RESEARCH_HASH_SALT=<secret value>
```

Never use the default salt for a real research export.

## Step 9 - Validate Data Quality

Before training, produce a data-quality report containing:

- Number of unique patients
- Number of encounters
- Encounters by body area
- Encounters by treatment class
- PROM completion rate
- Outcome completion rate
- Missingness by feature
- Duplicate MRN count
- Duplicate encounter count
- Invalid dates
- Unknown treatment labels
- Patients with multiple encounters

Do not train until labels are clinically reviewed and treatment classes are sufficiently represented.

## Step 10 - Prevent Leakage

Use only pre-decision information as model input.

Never use:

- The treatment being predicted
- Follow-up PROM scores
- Outcome response
- Later complications
- Later escalation
- Future diagnoses

Use patient-level splitting so records from one patient cannot appear in both training and test sets.

Use chronological splitting so earlier encounters train the model and later encounters test generalization.

## Step 11 - Train Baselines

Compare:

1. Majority-class baseline
2. Regularized logistic regression
3. Random Forest
4. CatBoost

The trainer is located at:

```text
backend/research/train_treatment_model.py
```

Research dependencies are separate from production dependencies:

```text
backend/requirements-research.txt
```

The trainer refuses to train with fewer than 30 labeled encounters or fewer than two treatment classes. This threshold is a pipeline safeguard, not proof that 30 cases are clinically sufficient.

## Step 12 - Train CatBoost

Install research dependencies in a research environment:

```bash
cd orthopedic-opd-ai-test/backend
pip install -r requirements-research.txt
```

Export the dataset from an authenticated staff session, save it outside source control, and train:

```bash
python -m research.train_treatment_model \
  --input research_exports/encounters.csv \
  --output model_artifacts/treatment-choice.json
```

Keep these artifacts private:

- CatBoost model file
- Feature metadata
- Class labels
- Research dataset
- Hash salt

## Step 13 - Evaluate The Treatment Model

Report:

- Macro-F1
- Per-class precision and recall
- Top-3 recall
- AUROC where meaningful
- Calibration curve
- Brier score
- Confusion matrix
- Performance by body area
- Performance by demographic group
- Abstention rate

Compare CatBoost against every baseline. A complex model is justified only if it improves meaningful metrics without unacceptable calibration or subgroup degradation.

## Step 14 - Evaluate Patient Outcomes

Treatment-choice prediction and outcome analysis are separate analyses.

For outcomes, report:

- Follow-up completion rate
- Response distribution
- PROM score change
- Response by treatment category
- Response by body area
- Adverse-event rate
- Escalation rate

This observational analysis does not prove that one treatment caused improvement. Treatment selection may be influenced by disease severity and other confounders.

## Step 15 - Deploy The Assistant Safely

Protected endpoints:

```text
GET  /api/ai/status
POST /api/ai/patients/{patient_id}/recommendation
POST /api/model-suggestions/{suggestion_id}/feedback
```

If no validated model artifact is installed, the API must return an unavailable state. It must not fabricate a suggestion.

Every suggestion stores:

- Model version
- Feature snapshot
- Ranked suggestions
- Warnings
- Generated time
- Encounter ID

## Step 16 - Use The Physician Interface

The Physician Evaluation page displays:

- AI Clinical Assistant
- Ranked treatment options
- Confidence values
- Warnings
- Model version
- Accept action
- Edit action
- Reject action
- Not enough information action

The AI does not automatically create a prescription, treatment order, or diagnostic order.

## Step 17 - Silent-Mode Validation

Before showing suggestions as part of clinical care:

1. Run the model without displaying recommendations to physicians.
2. Compare predictions with actual clinician decisions.
3. Review errors with orthopedic clinicians.
4. Check subgroup performance.
5. Verify that the model does not use future information.
6. Check calibration and abstention.
7. Obtain approval for the next prospective phase.

## Step 18 - Model Documentation

Create a model card containing:

- Intended use
- Out-of-scope use
- Training population
- Date range
- Body areas
- Features
- Target definition
- Splitting strategy
- Metrics
- Calibration
- Subgroup performance
- Known limitations
- Ethical risks
- Version and artifact hash

## Step 19 - Thesis Results

The thesis should report:

- Data-flow architecture
- Database and encounter design
- Dataset size and completeness
- Preprocessing decisions
- Leakage controls
- Baseline results
- CatBoost results
- Explainability examples
- Outcome analysis
- Clinician feedback
- Safety and privacy controls
- Limitations

## Step 20 - Final Claims

Acceptable claim:

> The system provides explainable predictions of observed clinician treatment choices from pre-decision orthopedic data.

Unacceptable claim without a much stronger study:

> The system determines the medically correct treatment.

Unacceptable claim from one month of data:

> The model is clinically reliable for all orthopedic patients.

## Current Implementation Status

Completed:

- Encounter data model
- Encounter links on clinical records
- Encounter creation and listing API
- De-identified encounter CSV export
- Model suggestion audit record
- Model feedback audit record
- Treatment outcome record
- Treatment outcome API
- Offline CatBoost training scaffold
- Safe recommendation API
- Physician AI Assistant panel
- Clinician feedback controls
- Physician treatment outcome form
- Thesis presentation document

Next:

- Export a real de-identified dataset
- Review labels with a clinician
- Collect sufficient encounters
- Train baseline models
- Train CatBoost
- Evaluate model and outcomes
- Perform silent-mode validation
- Complete model card and thesis results
