# Explainable Orthopedic AI Clinical Assistant

## Presentation Purpose

This document is a presentation-ready thesis outline for an orthopedic outpatient clinical decision-support system. It describes the research problem, the longitudinal data design, the machine-learning method, the physician workflow, the evaluation method, the safety boundaries, and the implementation roadmap.

The proposed system predicts **observed clinician treatment choices** from information available before the treatment decision. It does not autonomously diagnose, prescribe, or order tests.

---

## Slide 1 - Title

**Explainable AI Clinical Decision Support for Orthopedic Outpatient Care**

**Subtitle:**
Using pre-visit patient-reported outcomes and longitudinal clinical records to support physician treatment planning.

**Presented by:** [Student name]

**Program:** [Master's program]

**Institution:** [University]

**Speaker notes:**
This thesis proposes an AI assistant integrated into an orthopedic outpatient workflow. The assistant uses structured patient information and previous clinical records to rank treatment options for physician review. The physician remains responsible for the final decision.

---

## Slide 2 - Clinical Problem

Orthopedic clinicians must combine information from several sources during a short consultation:

- Patient demographics and medical history
- Pre-visit questionnaire responses
- Pain and functional scores
- Previous assessments
- Diagnoses and clinical notes
- Diagnostic tests and results
- Previous treatments and follow-up outcomes

This information is often distributed across multiple records and is difficult to compare consistently over time.

**Speaker notes:**
The problem is not simply a lack of data. The problem is that useful data is distributed, inconsistently structured, and difficult to interpret quickly at the point of care.

---

## Slide 3 - Research Motivation

The system aims to help the physician by:

- Summarizing the patient's current problem
- Showing the relevant pre-visit score
- Finding comparable historical patterns
- Ranking commonly selected treatment options
- Showing the factors supporting each suggestion
- Highlighting missing or concerning information

The system is designed as decision support, not as a replacement for clinical judgment.

**Speaker notes:**
The objective is to reduce information overload and improve consistency. The assistant should make the physician's review easier without hiding uncertainty or taking control of the decision.

---

## Slide 4 - Current Hospital Workflow

```text
Patient registered
       |
       v
Pre-visit form completed by patient or nurse
       |
       v
PROM score calculated
       |
       v
Physician reviews score and patient history
       |
       v
Physician records diagnosis, tests, and treatment
       |
       v
Follow-up assessment measures progress
```

**Speaker notes:**
The current application already supports much of this workflow. The research contribution is to connect these steps using a reliable encounter structure and an auditable AI layer.

---

## Slide 5 - Existing System Capabilities

The current system already includes:

- Patient records
- Mobile patient authentication
- Pre-visit PROM questionnaires
- Nurse-assisted assessments
- Physician evaluations
- Diagnostic orders
- Treatment records
- Uploaded documents
- Follow-up calls
- Patient notifications
- AI-assisted dictation extraction

**Relevant implementation:**

- `backend/models.py`
- `backend/routers/assessments.py`
- `backend/routers/evaluations.py`
- `backend/routers/treatments.py`
- `frontend/src/pages/PhysicianEvaluation.jsx`

**Speaker notes:**
This thesis extends an existing clinical application instead of building a disconnected prototype. That makes it possible to evaluate the assistant within a realistic workflow.

---

## Slide 6 - Current Data Problem

The existing system stores clinical information in separate tables, but many records are connected only by `patient_id`.

Current limitations include:

- No central visit or encounter identifier
- Treatments are not linked to a specific evaluation
- Diagnostics are not linked to a specific clinical decision
- Follow-up outcomes are difficult to associate with a treatment
- Dates are often stored without precise clinical timestamps
- Missing data reasons are not consistently recorded

**Speaker notes:**
A patient-level record is not enough for machine learning. The model must know which information was available at the time of a particular clinical decision.

---

## Slide 7 - Research Questions

1. Can a longitudinal encounter dataset be created from orthopedic outpatient records?
2. Can pre-visit PROM data improve prediction of observed treatment choices?
3. Which model provides the best balance between predictive performance and interpretability?
4. Can explanations and uncertainty be presented usefully to physicians?
5. Can the system abstain safely when the available data is insufficient?

**Speaker notes:**
These questions separate the engineering problem from the clinical machine-learning problem and from the usability problem.

---

## Slide 8 - Research Objectives

### Primary objective
Develop an explainable clinician-in-the-loop AI assistant that ranks observed orthopedic treatment choices using pre-decision clinical data.

### Secondary objectives

- Design an encounter-centered longitudinal data model
- Create a reproducible analysis dataset
- Compare baseline models with CatBoost
- Evaluate calibration and subgroup performance
- Record clinician feedback on suggestions
- Demonstrate integration into the Physician Evaluation workflow

---

## Slide 9 - Proposed Encounter-Centered Data Model

```text
Patient
  |
  +-- Encounter
        |
        +-- Pre-visit Assessment / PROM
        +-- Physician Evaluation
        +-- Diagnostic Orders and Results
        +-- Treatment Decisions
        +-- Documents
        +-- AI Suggestions
        +-- Clinician Feedback
        +-- Follow-up Outcomes
```

An encounter represents one clinical decision context.

**Speaker notes:**
The encounter is the most important structural addition. It provides the boundary needed to distinguish information known before the decision from information recorded afterward.

---

## Slide 10 - Encounter Record

The encounter record contains:

- Encounter ID
- Patient ID
- Provider
- Encounter date and time
- Encounter type
- Body area
- Pre-visit completion source
- Encounter status
- Creation and update timestamps

Possible encounter types include:

- Initial visit
- Follow-up visit
- Post-operative review
- Nurse-assisted assessment
- Telehealth review

**Implementation:** `backend/models.py` now contains the `Encounter` model.

---

## Slide 11 - Longitudinal Patient Record

Each patient can have many encounters:

```text
Patient A
  |
  +-- Initial knee visit
  |     +-- PROM
  |     +-- Diagnosis
  |     +-- Treatment
  |
  +-- Three-month follow-up
  |     +-- Follow-up PROM
  |     +-- Treatment response
  |
  +-- Six-month follow-up
        +-- PROM trend
        +-- Escalation or continuation decision
```

This structure supports both patient care and longitudinal research.

---

## Slide 12 - Analysis-Ready Row Dataset

One row represents one index encounter.

Example features:

- Age and gender
- Body area
- PROM instrument and score
- Pain score
- Selected questionnaire answers
- Chief complaint
- Previous diagnoses
- Previous treatment history
- Diagnostic information available before the visit
- Missing-data indicators

Target label:

- Treatment selected by the clinician during the encounter

**Speaker notes:**
The row is a research representation. It does not replace the normalized operational database. The same encounter can also produce future outcome rows for longitudinal analysis.

---

## Slide 13 - Treatment Outcome Data

To study outcomes later, treatment records should include:

- Standard treatment category
- Diagnosis or indication
- Protocol or duration
- Start and end dates
- Treating clinician
- Adherence information
- Side effects or complications
- Follow-up PROM score
- Improvement or deterioration
- Escalation, failure, or discontinuation

**Important distinction:**
Predicting treatment choice is not the same as proving treatment effectiveness.

---

## Slide 14 - Data Preprocessing

The preprocessing pipeline will:

1. Normalize dates and timestamps.
2. Standardize body-area labels.
3. Standardize treatment categories.
4. Version PROM instruments and scoring rules.
5. Preserve raw questionnaire answers.
6. Create structured score features.
7. Record missingness explicitly.
8. Remove or pseudonymize identifying information for research exports.
9. Detect duplicate patient and encounter records.
10. Produce a versioned dataset export.

---

## Slide 15 - Preventing Data Leakage

The model may use only information available before the treatment decision.

Allowed examples:

- Pre-visit PROM score
- Pain score
- Age and gender
- Existing diagnoses
- Previous treatment history
- Pre-existing diagnostic results

Forbidden as input features:

- The treatment being predicted
- Follow-up PROM score after treatment
- Later diagnosis changes
- Later complications
- Future treatment escalation

**Speaker notes:**
Leakage can produce excellent test accuracy while making the model unusable in practice. The feature cutoff must be enforced during both dataset creation and API inference.

---

## Slide 16 - Prediction Target

The first target is:

> Which treatment option did the clinician select during this encounter?

This target is feasible because treatment decisions already exist in the clinical record.

It must be described honestly as prediction of observed practice, not proof of optimal medical care.

Possible output classes include:

- Medication
- Physiotherapy
- Injection therapy
- Surgery
- Rest and monitoring
- Long-term rehabilitation

---

## Slide 17 - Model Comparison

The study will compare:

1. Majority-class baseline
2. Regularized logistic regression
3. Random Forest
4. CatBoost

The comparison is important because a complex model should only be used if it improves performance over simpler alternatives.

Metrics include:

- Macro-F1
- Precision and recall
- Top-3 recall
- AUROC where applicable
- Calibration and Brier score
- Abstention rate

---

## Slide 18 - Why CatBoost?

CatBoost is selected as the primary model because it:

- Supports categorical variables
- Handles missing values effectively
- Learns nonlinear feature interactions
- Performs well on tabular datasets
- Works with small-to-medium clinical datasets
- Supports feature importance and SHAP explanations
- Avoids the data requirements of deep neural networks

The thesis will still report results against simpler baselines.

**Speaker notes:**
The model choice is based on the structure and expected size of the data, not on choosing the most complex technology.

---

## Slide 19 - Hybrid AI Architecture

```text
Structured clinical database
          |
          v
Feature and quality pipeline
          |
          v
CatBoost treatment ranking model
          |
          +--> SHAP feature explanation
          |
          +--> Confidence calibration
          |
          v
Approved guideline/evidence retrieval
          |
          v
Readable assistant explanation
          |
          v
Physician review and feedback
```

The language model may explain information, but the structured model is responsible for treatment ranking.

---

## Slide 20 - AI Clinical Assistant UI

The Physician Evaluation page will contain a new section:

### AI Clinical Assistant

- Current patient problem summary
- Relevant PROM score and pain level
- Ranked treatment options
- Confidence level
- Main contributing factors
- Missing information
- Safety warnings
- Evidence or guideline references
- Model version and generation time

**Implementation target:** `frontend/src/pages/PhysicianEvaluation.jsx`

---

## Slide 21 - Clinician Control

The physician can:

- Accept a suggestion
- Edit the proposed treatment
- Reject the suggestion
- Mark the case as insufficient information

The final treatment is always saved as a clinician decision.

The system will never:

- Automatically prescribe
- Automatically order a diagnostic test
- Automatically save a treatment without confirmation
- Hide low confidence
- Replace physician review

---

## Slide 22 - Model Audit Trail

Every suggestion should store:

- Suggestion ID
- Patient and encounter ID
- Model version
- Feature snapshot
- Ranked suggestions
- Confidence values
- Warnings
- Generation timestamp
- Clinician feedback
- Final clinician treatment

The backend now includes `ModelSuggestion` and `ModelFeedback` entities and protected API routes for this audit trail.

---

## Slide 23 - Evaluation Protocol

Use patient-level and time-based data splits.

Recommended protocol:

- Training set: earlier encounters
- Validation set: later encounters
- Test set: the latest time period
- No patient appears in more than one split

Evaluate:

- Overall performance
- Performance by body area
- Performance by demographic group
- Performance with missing PROM data
- Calibration
- Low-confidence abstention
- Clinician agreement

---

## Slide 24 - Safety, Privacy, And Ethics

Required safeguards:

- Institutional ethics or IRB review where applicable
- De-identified research exports
- Role-based access control
- Audit logs
- Encrypted transport and storage
- No use of patient names in research datasets
- Explicit model limitations
- Human approval for every treatment decision
- Monitoring for subgroup performance differences

This system is clinical decision support, not an autonomous medical device.

---

## Slide 25 - Implementation Status

### Completed foundation

- Existing patient, assessment, evaluation, diagnostic, treatment, and follow-up models reviewed
- Encounter model added
- Encounter links added as backward-compatible fields
- Model suggestion audit model added
- Model feedback audit model added
- Protected encounter and AI feedback routes added

### Next implementation steps

- Create encounter automatically when a new visit begins
- Attach PROM and physician records to the encounter
- Build reproducible dataset export
- Add treatment normalization and outcome records
- Train baseline models
- Train and evaluate CatBoost
- Add recommendation endpoint
- Add Physician Evaluation assistant section

### Offline training pipeline now available

The research training job is located at:

```text
backend/research/train_treatment_model.py
```

Research dependencies are intentionally separate from the production API:

```text
backend/requirements-research.txt
```

The trainer sorts encounters chronologically, uses an 80/20 temporal split,
requires at least 30 labeled encounters, and refuses to train when there is
not enough class diversity. With the research dependencies installed, it
produces a versioned metadata JSON file and a CatBoost model artifact.

### Research export now available

The backend now exposes a protected de-identified export:

```text
GET /api/research/encounters.csv
```

It produces one row per encounter and excludes patient name, MRN, phone,
email, and address. It includes a salted pseudonymous patient hash, PROM
features, diagnosis, diagnostic types, and treatment labels. The export is a
research starting point and must still pass institutional data-governance review.

### Recommendation API now available

The protected assistant endpoints are:

```text
GET  /api/ai/status
POST /api/ai/patients/{patient_id}/recommendation
```

Before a validated CatBoost artifact is installed, these endpoints return an
explicit unavailable state rather than fabricating a recommendation. When a
trained artifact exists, the endpoint uses current and past features, returns
the top ranked treatment options, records the model suggestion, and includes
warnings for missing clinical information.

### Treatment outcome capture now available

Follow-up outcomes can be recorded through:

```text
POST /api/patients/{patient_id}/treatment-outcomes
```

The outcome record supports follow-up score, response, adherence, adverse
events, escalation, clinician notes, treatment ID, and encounter ID. The
research CSV includes the latest linked follow-up score when available.

The full reproducible checklist is maintained in:

```text
docs/research-steps.md
```

Outcome summaries can be generated offline with:

```bash
cd orthopedic-opd-ai-test/backend
python -m research.evaluate_outcomes \
        --input research_exports/encounters.csv \
        --output research_exports/outcome-report.json
```

---

## Slide 26 - Implementation Timeline

### Phase 1: Data foundation

- Encounter migration
- Record linking
- Dataset export
- Data-quality checks

### Phase 2: Research dataset

- Historical data extraction
- De-identification
- Treatment taxonomy
- Outcome definition

### Phase 3: Modeling

- Baselines
- CatBoost
- Calibration
- SHAP explanations

### Phase 4: Clinical integration

- Recommendation API
- Physician UI
- Feedback and audit trail

### Phase 5: Evaluation

- Silent-mode validation
- Physician review
- Error analysis
- Thesis results

---

## Slide 27 - Limitations

- One month of data may be insufficient for a reliable clinical model.
- Treatment choices reflect local practice and may not represent optimal treatment.
- Observational data contains confounding by indication.
- Missing data may be non-random.
- Different body areas may require different clinical models.
- Treatment outcome labels may be incomplete.
- The model cannot replace physical examination or clinical reasoning.

---

## Slide 28 - Expected Contributions

This thesis will contribute:

1. An encounter-centered orthopedic data model.
2. A reproducible longitudinal clinical dataset pipeline.
3. A comparison of interpretable tabular treatment-choice models.
4. An explainable CatBoost-based treatment ranking assistant.
5. A clinician feedback and audit mechanism.
6. A safety-conscious integration into a physician workflow.
7. An evaluation framework for accuracy, calibration, and clinical usefulness.

---

## Slide 29 - Conclusion

The proposed system connects:

```text
Patient-reported data
        +
Clinical history
        +
Physician documentation
        +
Treatment decisions
        +
Follow-up outcomes
        ↓
Explainable clinical decision support
```

The physician remains the final decision-maker. The AI assistant improves access to relevant information, exposes patterns in historical data, communicates uncertainty, and records how clinicians use its suggestions.

---

## Slide 30 - Final Research Statement

> This research develops and evaluates an explainable, clinician-in-the-loop machine-learning assistant that predicts observed orthopedic treatment choices from pre-visit patient-reported outcomes and longitudinal clinical records, while preserving physician control, auditability, privacy, and uncertainty communication.

---

## Technical Appendix A - Current API Foundation

### Create encounter

```text
POST /api/encounters
```

### Save model suggestion

```text
POST /api/model-suggestions
```

### Record clinician feedback

```text
POST /api/model-suggestions/{suggestion_id}/feedback
```

These routes require staff authentication.

---

## Technical Appendix B - Current Backend Files

- `backend/models.py` - clinical and AI audit models
- `backend/schemas.py` - API contracts
- `backend/routers/encounters.py` - encounter and model-feedback routes
- `backend/main.py` - route registration and compatibility migration
- `backend/llm_extract.py` - existing dictation extraction, separate from the treatment model
- `frontend/src/pages/PhysicianEvaluation.jsx` - target UI for the assistant

---

## Technical Appendix C - Research Warning

The model must not be described as learning the correct treatment from only one month of data. One month is an initial data-collection and pipeline-validation period.

Before clinical claims are made, the research should obtain:

- Adequate sample size
- Retrospective or multi-period data
- Reliable outcome follow-up
- Ethics approval where required
- Prospective silent-mode validation
- Subgroup and calibration analysis

The thesis should clearly distinguish prediction of clinician behavior from prediction of patient benefit.
