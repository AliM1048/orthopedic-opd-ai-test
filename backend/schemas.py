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
    answers: Optional[dict] = None

    class Config:
        from_attributes = True


class EvaluationOut(BaseModel):
    id: str
    date: str
    physician: str
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    audioUrl: Optional[str] = None

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
    assessments: list[AssessmentOut] = []
    evaluations: list[EvaluationOut] = []
    diagnostics: list[DiagnosticOut] = []
    treatments: list[TreatmentOut] = []

    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    patients: list[PatientOut]


class UpdateStatusRequest(BaseModel):
    status: str


class AssessmentCreate(BaseModel):
    id: str
    date: str
    type: str
    score: int
    maxScore: int
    bodyArea: str
    completedBy: str
    answers: Optional[dict] = None


class EvaluationCreate(BaseModel):
    id: str
    date: str
    physician: str
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    audioUrl: Optional[str] = None


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


class Question(BaseModel):
    id: str
    text: str
    options: list[str]


class AssessmentQuestions(BaseModel):
    questions: list[Question]
