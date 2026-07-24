from sqlalchemy import Column, String, Integer, JSON, Text, Boolean
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
    finalScore = Column(Integer, nullable=True)
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
