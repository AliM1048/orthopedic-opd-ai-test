import os
import random
import uuid
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import create_patient_access_token
from database import get_db
from models import Patient, PatientOTP
from schemas import (
    PatientAuthProfile,
    PatientLoginResponse,
    PatientRequestOtp,
    PatientRequestOtpResponse,
    PatientVerifyOtp,
)

router = APIRouter(prefix="/api/patient/auth", tags=["Patient Auth"])

# No SMS provider is wired up yet — the code is printed to the console and,
# behind this flag, also returned in the response so the mobile app can be
# developed/demoed end-to-end without one. Flip to "false" once a real SMS
# provider is integrated.
OTP_DEV_MODE = os.getenv("OTP_DEV_MODE", "true").lower() == "true"
OTP_EXPIRE_MINUTES = 5
OTP_MAX_ATTEMPTS = 5


def _find_patient_by_mrn(mrn: str, db: Session) -> Patient | None:
    """Patient.mrn is unique (models.py), so unlike a phone number there's
    never an ambiguous multi-match case here — a case-insensitive, trimmed
    match is enough to tolerate how the patient happens to type it."""
    mrn = (mrn or "").strip()
    if not mrn:
        return None
    return db.query(Patient).filter(Patient.mrn.ilike(mrn)).first()


@router.post("/request-otp", response_model=PatientRequestOtpResponse)
def request_otp(body: PatientRequestOtp, db: Session = Depends(get_db)):
    patient = _find_patient_by_mrn(body.mrn, db)
    if not patient:
        print(f"No patient found with this MRN: {body.mrn}")
        raise HTTPException(status_code=404, detail="No patient found with this MRN")

    code = f"{random.randint(0, 999999):06d}"
    code_hash = bcrypt.hashpw(code.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    db.query(PatientOTP).filter(PatientOTP.patient_id == patient.id).delete()
    db.add(PatientOTP(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        phone=patient.phone,
        codeHash=code_hash,
        expiresAt=expires_at.isoformat() + "Z",
        attempts=0,
        createdAt=datetime.utcnow().isoformat() + "Z",
    ))
    db.commit()

    print(f"[DEV OTP] patient {patient.id} ({patient.phone}) code: {code}")

    return PatientRequestOtpResponse(
        message="A verification code has been sent to the phone number on file.",
        mrn=patient.mrn,
        devOtp=code if OTP_DEV_MODE else None,
    )


@router.post("/verify-otp", response_model=PatientLoginResponse)
def verify_otp(body: PatientVerifyOtp, db: Session = Depends(get_db)):
    patient = _find_patient_by_mrn(body.mrn, db)
    if not patient:
        raise HTTPException(status_code=401, detail="Invalid MRN or code")

    otp = db.query(PatientOTP).filter(PatientOTP.patient_id == patient.id).first()
    if not otp:
        raise HTTPException(status_code=401, detail="No verification code was requested for this MRN")

    if otp.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(otp)
        db.commit()
        raise HTTPException(status_code=401, detail="Too many attempts — request a new code")

    if datetime.utcnow() > datetime.fromisoformat(otp.expiresAt.rstrip("Z")):
        db.delete(otp)
        db.commit()
        raise HTTPException(status_code=401, detail="This code has expired — request a new one")

    if not bcrypt.checkpw(body.code.encode("utf-8"), otp.codeHash.encode("utf-8")):
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=401, detail="Incorrect code")

    db.delete(otp)
    db.commit()

    token = create_patient_access_token(patient.id, patient.phone)
    return PatientLoginResponse(
        access_token=token,
        patient=PatientAuthProfile(
            id=patient.id, name=patient.name or patient.mrn, mrn=patient.mrn,
            bodyArea=patient.bodyArea, phone=patient.phone,
        ),
    )
