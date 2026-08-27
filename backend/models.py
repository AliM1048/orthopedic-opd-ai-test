from sqlalchemy import Column, String, Integer, Float, JSON, Text, Boolean
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    mrn = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False)
    address = Column(String, nullable=False)
    bloodType = Column(String, nullable=False)
    allergies = Column(String, nullable=False)
    appointmentTime = Column(String, nullable=False)
    appointmentDate = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    bodyArea = Column(String, nullable=False)
    avatar = Column(String, nullable=False)
    # Per-patient override of the clinic-wide PROM follow-up call schedule
    # (see FollowUpSettings.intervalsMonths) — null means "use the default".
    followUpIntervalsMonths = Column(JSON, nullable=True)


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False)
    type = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    maxScore = Column(Integer, nullable=False)
    bodyArea = Column(String, nullable=False)
    completedBy = Column(String, nullable=False)
    chiefComplaint = Column(String, nullable=True)
    answers = Column(JSON, nullable=True)
    # Float, not Integer: some scoring formulas (e.g. ODI/NDI's percent-of-max)
    # deliberately keep one decimal place of precision.
    finalScore = Column(Float, nullable=True)
    interpretation = Column(JSON, nullable=True)
    promCode = Column(String, nullable=True)


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False)
    physician = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    diagnosis = Column(String, nullable=True)
    audioUrl = Column(String, nullable=True)
    sentToPatient = Column(Boolean, nullable=False, default=False)
    soapNote = Column(JSON, nullable=True)
    # AI-generated plain-language summary for the patient's mobile app,
    # generated once at the moment sentToPatient flips True — see
    # patient_summary.py.
    patientSummary = Column(Text, nullable=True)


class SurgeryEvaluation(Base):
    __tablename__ = "surgery_evaluations"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False)
    surgeon = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    diagnosis = Column(String, nullable=True)
    audioUrl = Column(String, nullable=True)
    sentToPatient = Column(Boolean, nullable=False, default=False)
    soapNote = Column(JSON, nullable=True)
    patientSummary = Column(Text, nullable=True)


class Document(Base):
    """A doctor-uploaded file (MRI image, scan report, etc.) attached to a
    specific Evaluation entry. See routers/documents.py."""
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    evaluation_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    originalName = Column(String, nullable=False)
    contentType = Column(String, nullable=False)
    uploadedBy = Column(String, nullable=False)
    uploadedAt = Column(String, nullable=False)


class Diagnostic(Base):
    __tablename__ = "diagnostics"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    date = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    result = Column(Text, nullable=True)


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    date = Column(String, nullable=False)
    physician = Column(String, nullable=False)
    duration = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    followUpDate = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)


class AssessmentConfig(Base):
    __tablename__ = "assessment_configs"

    bodyArea = Column(String, primary_key=True)
    configId = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    sections = Column(JSON, nullable=False)
    promName = Column(String, nullable=True)
    scoreCalculation = Column(String, nullable=False, default="generic")
    scoreDirection = Column(String, nullable=False, default="higher_better")
    rawMax = Column(Integer, nullable=True)
    conversionTable = Column(JSON, nullable=True)
    icon = Column(String, nullable=True)


class StatusConfig(Base):
    __tablename__ = "status_configs"

    statusId = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    badgeClass = Column(String, nullable=False)
    color = Column(String, nullable=False)
    sortOrder = Column(Integer, nullable=False, default=0)


class FollowUpSettings(Base):
    """Single-row table (id='default') holding the clinic-wide PROM follow-up
    call schedule, e.g. [3, 6, 9] months after a patient's first evaluation."""
    __tablename__ = "followup_settings"

    id = Column(String, primary_key=True)
    intervalsMonths = Column(JSON, nullable=False)


class FollowUpCall(Base):
    """A scheduled nurse call to re-run the PROM questionnaire on a patient at
    a fixed interval after their first doctor evaluation (e.g. 3/6/9 months
    out), so outcome scores get tracked over time instead of just at intake.
    Generated automatically when a patient's first evaluation is saved — see
    routers/followups.py:generate_followup_schedule()."""
    __tablename__ = "followup_calls"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    # Null for a manually-added, one-off call that doesn't correspond to a
    # 3/6/9-month interval — see POST /patients/{id}/followups.
    intervalMonths = Column(Integer, nullable=True)
    scheduledDate = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending | completed
    anchorEvaluationId = Column(String, nullable=True)
    completedAssessmentId = Column(String, nullable=True)
    # Set once the auto-send sweep (routers/prom_assignments.py:auto_progress_prom_assignments)
    # creates the linked self-completion PROMAssignment for this call's date.
    promAssignmentId = Column(String, nullable=True)


class InjuryEvent(Base):
    """A clinical timeline marker — new injury, surgery, injection, or start
    of physiotherapy — plotted as a vertical line on the PROM trend graph.
    Surgery/Injection/Physiotherapy are usually already on file as Treatment
    rows and are read from there; this table exists for "New Injury", which
    has no other home in the data model."""
    __tablename__ = "injury_events"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False)
    note = Column(String, nullable=True)


class PROMAssignment(Base):
    """Tracks a doctor-directed request to complete a PROM questionnaire that
    wasn't filled in ahead of the visit — e.g. a walk-in/ER referral who
    skipped the normal pre-visit call. The doctor selects the instrument and
    routes it (self-completion link/QR, clerk-assisted, physician-assisted
    now, or deferred) but never answers on the patient's behalf. See
    routers/prom_assignments.py and routers/prom_public.py."""
    __tablename__ = "prom_assignments"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    evaluationId = Column(String, nullable=True)
    bodyArea = Column(String, nullable=False)
    promName = Column(String, nullable=True)
    respondentType = Column(String, nullable=False)       # patient | parent_caregiver
    completionMethod = Column(String, nullable=False)     # self_completion | clerk_assisted | physician_assisted | deferred
    timing = Column(String, nullable=True)                # before_exam | after_exam | after_intervention
    # sent_pending | assigned_to_clerk | completed | deferred | declined
    # ("overdue" is a derived display state computed from assignedAt — see routers/prom_assignments.py)
    status = Column(String, nullable=False, default="sent_pending")
    deferReason = Column(String, nullable=True)
    assignedBy = Column(String, nullable=True)
    assignedAt = Column(String, nullable=True)
    answeredBy = Column(String, nullable=True)             # patient | parent_caregiver
    enteredBy = Column(String, nullable=True)              # name of whoever typed the answers in
    completedAt = Column(String, nullable=True)
    assessmentId = Column(String, nullable=True)
    accessToken = Column(String, nullable=True, unique=True)


class PatientOTP(Base):
    """A one-time login code issued to a patient's phone number for the
    mobile app. See routers/patient_auth.py — dev-mode only for now (no SMS
    provider wired up), so the code is also logged/returned to the caller
    behind OTP_DEV_MODE."""
    __tablename__ = "patient_otps"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False)
    codeHash = Column(String, nullable=False)
    expiresAt = Column(String, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    createdAt = Column(String, nullable=False)


class PatientNotification(Base):
    """In-app inbox row for the mobile app — created whenever a doctor or
    surgeon marks a visit report sentToPatient=True. See notifications.py
    and routers/patient_self.py."""
    __tablename__ = "patient_notifications"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, default="visit_report")
    title = Column(String, nullable=False)
    body = Column(String, nullable=True)
    relatedType = Column(String, nullable=True)  # evaluation | surgery_evaluation
    relatedId = Column(String, nullable=True)
    isRead = Column(Boolean, nullable=False, default=False)
    createdAt = Column(String, nullable=False)


class StaffNotification(Base):
    """Dashboard-wide inbox row for staff — created when a patient
    self-completes a pre-visit PROM via the mobile app, so a nurse sees a
    toast without having to notice the "Pre-Visit Calls Due" list changed.
    Not scoped to one nurse's login — every staff dashboard shares the same
    queue. See notifications.py and routers/prom_public.py."""
    __tablename__ = "staff_notifications"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, default="prom_self_completed")
    title = Column(String, nullable=False)
    body = Column(String, nullable=True)
    relatedType = Column(String, nullable=True)  # assessment
    relatedId = Column(String, nullable=True)
    isRead = Column(Boolean, nullable=False, default=False)
    createdAt = Column(String, nullable=False)


class ChatMessage(Base):
    """One message in a patient's single running conversation with the
    clinic — shared between the mobile app (patient side, shown as
    "Care Assistant") and the web dashboard (staff side, one thread per
    patient, open to any logged-in nurse/physician). Plain send-only
    history — no edit/delete, no read-receipts beyond the existing
    Patient/StaffNotification unread badges. See routers/patient_self.py
    (patient endpoints) and routers/chat.py (staff endpoints)."""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    senderType = Column(String, nullable=False)  # "patient" | "staff"
    senderName = Column(String, nullable=True)   # staff member's display name; null for patient-sent messages
    text = Column(Text, nullable=False)
    createdAt = Column(String, nullable=False)


class DiagnosticTestOption(Base):
    __tablename__ = "diagnostic_test_options"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    desc = Column(String, nullable=False)
    sortOrder = Column(Integer, nullable=False, default=0)


class TreatmentOption(Base):
    __tablename__ = "treatment_options"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    desc = Column(String, nullable=False)
    sortOrder = Column(Integer, nullable=False, default=0)
