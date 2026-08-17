from pydantic import BaseModel
from typing import Optional


class AssessmentOut(BaseModel):
    id: str
    date: str
    type: str
    score: int
    maxScore: int
    bodyArea: str
    completedBy: str
    chiefComplaint: Optional[str] = None
    answers: Optional[dict] = None
    finalScore: Optional[int] = None
    interpretation: Optional[dict] = None
    promCode: Optional[str] = None

    class Config:
        from_attributes = True


class EvaluationOut(BaseModel):
    id: str
    date: str
    physician: str
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    audioUrl: Optional[str] = None
    sentToPatient: bool = False
    soapNote: Optional[dict] = None

    class Config:
        from_attributes = True


class DiagnosticOut(BaseModel):
    id: str
    type: str
    date: str
    status: str
    result: Optional[str] = None

    class Config:
        from_attributes = True


class TreatmentOut(BaseModel):
    id: str
    type: str
    date: str
    physician: str
    duration: str
    details: Optional[str] = None
    followUpDate: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class PatientOut(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    dob: str
    phone: str
    mrn: str
    email: str
    address: str
    bloodType: str
    allergies: str
    appointmentTime: str
    appointmentDate: str
    status: str
    bodyArea: str
    avatar: str
    followUpIntervalsMonths: Optional[list[int]] = None
    assessments: list[AssessmentOut] = []
    evaluations: list[EvaluationOut] = []
    diagnostics: list[DiagnosticOut] = []
    treatments: list[TreatmentOut] = []

    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    patients: list[PatientOut]


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    dob: str
    phone: str
    mrn: str
    email: str
    address: str
    bloodType: str
    allergies: str
    appointmentTime: str
    appointmentDate: str
    bodyArea: str
    avatar: str

    class Config:
        from_attributes = True


class UpdateStatusRequest(BaseModel):
    status: str


class UpdateBodyAreaRequest(BaseModel):
    bodyArea: str


class AssessmentCreate(BaseModel):
    id: str
    date: str
    type: str
    score: int
    maxScore: int
    bodyArea: str
    completedBy: str
    chiefComplaint: Optional[str] = None
    answers: Optional[dict] = None
    finalScore: Optional[int] = None
    interpretation: Optional[dict] = None
    promCode: Optional[str] = None


class EvaluationCreate(BaseModel):
    id: str
    date: str
    physician: str
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    audioUrl: Optional[str] = None


class EvaluationUpdate(BaseModel):
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    audioUrl: Optional[str] = None
    sentToPatient: Optional[bool] = None


class DiagnosticCreate(BaseModel):
    id: str
    type: str
    date: str
    status: str = "pending"
    result: Optional[str] = None


class DiagnosticUpdate(BaseModel):
    status: Optional[str] = None
    result: Optional[str] = None


class TreatmentCreate(BaseModel):
    id: str
    type: str
    date: str
    physician: str
    duration: str
    details: Optional[str] = None
    followUpDate: Optional[str] = None
    status: str = "active"


class FollowUpCallOut(BaseModel):
    id: str
    patient_id: str
    intervalMonths: Optional[int] = None
    scheduledDate: str
    status: str
    anchorEvaluationId: Optional[str] = None
    completedAssessmentId: Optional[str] = None

    class Config:
        from_attributes = True


class FollowUpCallCreate(BaseModel):
    scheduledDate: str
    intervalMonths: Optional[int] = None


class FollowUpCallDue(FollowUpCallOut):
    patientName: str
    patientMrn: str
    patientPhone: str
    patientAvatar: str


class FollowUpCallUpdate(BaseModel):
    scheduledDate: Optional[str] = None
    status: Optional[str] = None


class FollowUpSettingsOut(BaseModel):
    intervalsMonths: list[int]


class FollowUpSettingsUpdate(BaseModel):
    intervalsMonths: list[int]


class PatientFollowUpSettingsUpdate(BaseModel):
    intervalsMonths: Optional[list[int]] = None


class PROMAssignmentCreate(BaseModel):
    bodyArea: str
    promName: Optional[str] = None
    respondentType: str
    completionMethod: str
    timing: Optional[str] = None
    deferReason: Optional[str] = None
    evaluationId: Optional[str] = None


class PROMAssignmentUpdate(BaseModel):
    status: Optional[str] = None
    deferReason: Optional[str] = None
    answeredBy: Optional[str] = None
    enteredBy: Optional[str] = None
    completedAt: Optional[str] = None
    assessmentId: Optional[str] = None


class PROMAssignmentOut(BaseModel):
    id: str
    patient_id: str
    evaluationId: Optional[str] = None
    bodyArea: str
    promName: Optional[str] = None
    respondentType: str
    completionMethod: str
    timing: Optional[str] = None
    status: str
    deferReason: Optional[str] = None
    assignedBy: Optional[str] = None
    assignedAt: Optional[str] = None
    answeredBy: Optional[str] = None
    enteredBy: Optional[str] = None
    completedAt: Optional[str] = None
    assessmentId: Optional[str] = None
    accessToken: Optional[str] = None

    class Config:
        from_attributes = True


class PROMAssignmentWithPatient(PROMAssignmentOut):
    patientName: str
    patientMrn: str
    patientAvatar: str


class PublicPromConfigOut(BaseModel):
    patientFirstName: str
    bodyArea: str
    promName: Optional[str] = None
    status: str
    config: dict


class PublicPromSubmit(BaseModel):
    score: int
    maxScore: int
    finalScore: Optional[int] = None
    interpretation: Optional[dict] = None
    promCode: Optional[str] = None
    answers: Optional[dict] = None


class InjuryEventCreate(BaseModel):
    date: str
    note: Optional[str] = None


class InjuryEventOut(BaseModel):
    id: str
    patient_id: str
    date: str
    note: Optional[str] = None

    class Config:
        from_attributes = True


class PromTrendPoint(BaseModel):
    label: str          # "Baseline", "6 Weeks", "3 Months", ...
    dayOffset: int       # days from baseline, for x-axis positioning
    date: Optional[str] = None   # the actual assessment date used, if any
    score: Optional[int] = None  # None = Missing, never fabricated


class PromTrendEvent(BaseModel):
    type: str            # surgery | injection | physiotherapy | new_injury
    label: str
    date: str
    dayOffset: int


class PromTrendOut(BaseModel):
    promName: Optional[str] = None
    scoreDirection: str = "higher_better"
    baselineDate: Optional[str] = None
    points: list[PromTrendPoint] = []
    events: list[PromTrendEvent] = []
    improvement: Optional[int] = None  # latest known point minus baseline (sign per scoreDirection)
