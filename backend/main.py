import os
import sys
import uuid
import tempfile
from datetime import datetime
from pathlib import Path

# Windows defaults stdout/stderr to the cp1252 codepage when the process
# isn't attached to a real console (e.g. output piped/redirected to a file,
# or run under certain process managers) — any print() with an emoji or
# other non-cp1252 character then raises UnicodeEncodeError and crashes the
# in-flight request instead of just failing to log. Reconfigure to UTF-8
# (falling back to '?' for anything truly unencodable) so a log line can
# never take down a request.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from openai import OpenAI
from dotenv import load_dotenv
from pydub import AudioSegment

from sqlalchemy import text
from database import engine, Base
from auth import get_current_user
from llm_extract import extract_structured, detect_language
from routers.patients import router as patients_router
from routers.assessments import router as assessments_router
from routers.evaluations import router as evaluations_router
from routers.diagnostics import router as diagnostics_router
from routers.treatments import router as treatments_router
from routers.lookup import router as lookup_router
from routers.auth import router as auth_router
from routers.followups import router as followups_router
from routers.prom_assignments import router as prom_assignments_router
from routers.prom_public import router as prom_public_router
from routers.prom_trend import router as prom_trend_router

load_dotenv()

app = FastAPI(title="OPD AI Unit - Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Router (public)
app.include_router(auth_router)

# OPD Routers (protected)
app.include_router(patients_router, dependencies=[Depends(get_current_user)])
app.include_router(assessments_router, dependencies=[Depends(get_current_user)])
app.include_router(evaluations_router, dependencies=[Depends(get_current_user)])
app.include_router(diagnostics_router, dependencies=[Depends(get_current_user)])
app.include_router(treatments_router, dependencies=[Depends(get_current_user)])
app.include_router(lookup_router, dependencies=[Depends(get_current_user)])
app.include_router(followups_router, dependencies=[Depends(get_current_user)])
app.include_router(prom_assignments_router, dependencies=[Depends(get_current_user)])
app.include_router(prom_trend_router, dependencies=[Depends(get_current_user)])

# Public (no login) — the tokenized patient self-completion link/QR
app.include_router(prom_public_router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Base.metadata.create_all() only creates brand-new tables — it never
    # alters columns on tables that already exist. These two columns were
    # added to models.py after the assessments/evaluations tables were first
    # created, so patch them in directly (no Alembic in this project).
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS \"chiefComplaint\" VARCHAR"))
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS \"sentToPatient\" BOOLEAN NOT NULL DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS \"soapNote\" JSON"))
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS \"followUpIntervalsMonths\" JSON"))
            conn.execute(text("ALTER TABLE followup_calls ALTER COLUMN \"intervalMonths\" DROP NOT NULL"))
            conn.execute(text("ALTER TABLE followup_calls ADD COLUMN IF NOT EXISTS \"promAssignmentId\" VARCHAR"))
            conn.execute(text("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS \"finalScore\" INTEGER"))
            conn.execute(text("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS \"interpretation\" JSON"))
            conn.execute(text("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS \"promCode\" VARCHAR"))
            conn.execute(text("ALTER TABLE assessment_configs ADD COLUMN IF NOT EXISTS \"promName\" VARCHAR"))
            conn.execute(text("ALTER TABLE assessment_configs ADD COLUMN IF NOT EXISTS \"scoreCalculation\" VARCHAR NOT NULL DEFAULT 'generic'"))
            conn.execute(text("ALTER TABLE assessment_configs ADD COLUMN IF NOT EXISTS \"scoreDirection\" VARCHAR NOT NULL DEFAULT 'higher_better'"))
            conn.execute(text("ALTER TABLE assessment_configs ADD COLUMN IF NOT EXISTS \"rawMax\" INTEGER"))
            conn.execute(text("ALTER TABLE assessment_configs ADD COLUMN IF NOT EXISTS \"conversionTable\" JSON"))
            conn.execute(text("ALTER TABLE assessment_configs ADD COLUMN IF NOT EXISTS \"icon\" VARCHAR"))
    except Exception as e:
        print(f"⚠️  Column migration skipped/failed (safe to ignore on a fresh DB): {e}")


# Audio storage directory
AUDIO_DIR = Path("audio")
AUDIO_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────
# Speech-to-text client (OpenAI API — audio leaves the machine for this call)
# ──────────────────────────────────────────────
OPENAI_TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
print(f"Using OpenAI transcription model: {OPENAI_TRANSCRIBE_MODEL}")

LANGUAGE_MAP = {
    "en": "english",
    "ar": "arabic",
    "fr": "french",
}

# Biases the model toward orthopedic vocabulary it otherwise rarely produces
# (drug names, "osteoarthritis", "physiotherapy", the diagnostic test names,
# etc.), plus the spoken section cues this app relies on. Passed as the
# transcription API's "prompt" param, which nudges style/vocabulary the same
# way a preceding-context hint would, without any audio of it actually having
# been heard. One per supported language — matching the prompt language to
# the dictation language biases far more effectively than an English-only
# prompt would for Arabic/French audio.
CLINICAL_VOCAB_PROMPTS = {
    "en": (
        "Diagnosis. Diagnostics. Treatment plan. "
        "Osteoarthritis, rotator cuff tear, ACL tear, meniscus tear, herniated disc, "
        "lumbar disc herniation, sciatica, fracture, dislocation, tendinitis, bursitis, "
        "carpal tunnel syndrome, scoliosis, spinal stenosis. "
        "X-ray, MRI, CT scan, ultrasound, laboratory tests. "
        "Surgery, medication, physiotherapy, injection therapy, corticosteroid, "
        "rest and monitoring, long-term rehabilitation, follow-up."
    ),
    "ar": (
        "التشخيص. الفحوصات. خطة العلاج. "
        "خشونة المفاصل، تمزق الكفة المدورة، تمزق الرباط الصليبي، تمزق الغضروف الهلالي، انزلاق غضروفي، "
        "عرق النسا، كسر، خلع، التهاب الأوتار، التهاب الجراب، متلازمة النفق الرسغي، الجنف، ضيق القناة الشوكية. "
        "أشعة سينية، رنين مغناطيسي، أشعة مقطعية، موجات فوق صوتية، تحاليل مخبرية. "
        "جراحة، دواء، علاج طبيعي، حقن، كورتيزون، راحة ومتابعة، إعادة تأهيل طويلة الأمد، موعد متابعة."
    ),
    "fr": (
        "Diagnostic. Examens. Plan de traitement. "
        "Arthrose, déchirure de la coiffe des rotateurs, rupture du ligament croisé, déchirure méniscale, hernie discale, "
        "sciatique, fracture, luxation, tendinite, bursite, syndrome du canal carpien, scoliose, sténose spinale. "
        "Radiographie, IRM, scanner, échographie, analyses de laboratoire. "
        "Chirurgie, médicament, kinésithérapie, injection, corticoïde, repos et surveillance, "
        "rééducation à long terme, rendez-vous de suivi."
    ),
}


# ──────────────────────────────────────────────
# Transcription helper (OpenAI API)
# ──────────────────────────────────────────────

def run_transcription(path: str, language: str | None = None) -> dict:
    """Call OpenAI's transcription API and normalise its output to the
    {text, language, segments} shape the rest of this module expects.

    prompt biases the model toward the clinical vocabulary it otherwise rarely
    produces (drug names, "osteoarthritis", the diagnostic test names, etc.).

    gpt-4o-mini-transcribe only supports response_format="json" (no
    verbose_json/segment timestamps like whisper-1), so "segments" is always
    empty and, when `language` isn't passed in, there's no detected-language
    output to report back — callers fall back to "unknown" in that case.
    """
    with open(path, "rb") as f:
        kwargs = {
            "model": OPENAI_TRANSCRIBE_MODEL,
            "file": f,
            "prompt": CLINICAL_VOCAB_PROMPTS.get(language, CLINICAL_VOCAB_PROMPTS["en"]),
            "response_format": "json",
        }
        if language:
            kwargs["language"] = language
        response = openai_client.audio.transcriptions.create(**kwargs)
    return {
        "text": response.text.strip(),
        "language": language or "unknown",
        "segments": [],
    }


# ──────────────────────────────────────────────
# Audio helpers
# ──────────────────────────────────────────────

def audio_duration_seconds(path: str) -> float:
    """OpenAI's json response format doesn't return segment timestamps (unlike
    whisper-1's verbose_json), so duration is read directly from the audio
    file instead of derived from the last transcript segment."""
    try:
        return len(AudioSegment.from_file(path)) / 1000.0
    except Exception:
        return 0.0


def transcribe_with_fallback(path: str, language: str | None = None) -> dict:
    """run_transcription(), retrying once on a clean ffmpeg re-encode if the API
    rejects the raw upload.

    MediaRecorder's chunked WebM output can occasionally hand us a container
    that's momentarily malformed (dropped frame, device hand-off mid-recording)
    even though the audio is otherwise intact and ffmpeg (which pydub shells
    out to) can read it fine. Re-encoding through pydub/ffmpeg first and
    retrying sidesteps that.
    """
    try:
        return run_transcription(path, language=language)
    except Exception as e:
        print(f"⚠️ Transcription couldn't decode the upload directly ({e}); retrying via ffmpeg re-encode")
        reencoded_path = path + "_reencoded.wav"
        AudioSegment.from_file(path).export(reencoded_path, format="wav")
        try:
            return run_transcription(reencoded_path, language=language)
        finally:
            os.unlink(reencoded_path)


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "OPD AI Unit API is running",
        "opd_api": "/api/patients",
    }


@app.post("/transcribe/preview")
async def transcribe_preview(
    audio: UploadFile = File(...),
    language: str = Form(default=""),
):
    """
    Throwaway transcription of the recording-so-far, used purely to show the
    doctor a live "what the mic is hearing" caption while they're still
    talking. No speaker ID, no LLM structuring, nothing persisted —
    just transcribe and return text as fast as possible.

    The doctor no longer picks a language up front — `language` arrives
    empty on the first preview of a new recording. That first call is
    transcribed unforced (best-effort, auto/multilingual) and the resulting
    text is run through detect_language() to identify en/ar/fr from
    whatever's been said so far, so it's effectively "detected from the
    first words spoken." The frontend then remembers that result and sends
    it back on every later preview in the same recording, at which point it
    IS forced — same reasoning as before: forcing is faster and more
    accurate than re-detecting on every short, possibly-ambiguous chunk.
    """
    had_language = language in LANGUAGE_MAP

    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        result = run_transcription(tmp_path, language=language if had_language else None)
        detected = language if had_language else detect_language(result["text"])
        return JSONResponse(content={"text": result["text"], "language": detected})
    except Exception as e:
        # A handful of these can legitimately fail to decode (the recorder may
        # hand us a momentarily truncated container mid-recording) - that's
        # fine, the live caption just skips a beat instead of erroring out.
        return JSONResponse(status_code=200, content={"text": "", "language": None, "warning": str(e)})
    finally:
        os.unlink(tmp_path)


@app.post("/dictate")
async def dictate(
    audio: UploadFile = File(...),
    patient_id: str = Form(default=None),
    language: str = Form(default=""),
):
    """
    One-take physician dictation: the doctor speaks diagnosis, diagnostics to
    order, and the treatment plan in a single recording instead of filling out
    three separate screens.

    1. Transcribe via the OpenAI API. `language` normally arrives already
       detected from the live-preview phase (see /transcribe/preview — the
       doctor doesn't pick a language up front, it's identified from the
       first words spoken and forced from then on for accuracy). If this
       recording was too short for any preview to have fired, `language`
       arrives empty here and this call transcribes unforced, then
       detect_language() tags the result from the full transcript instead.
       Extraction (llm_extract.py) supports en/ar/fr plus code-switching
       between them, so the dictation language and the app's UI language are
       independent either way.
    2. Hand the transcript to llm_extract.extract_structured(), which splits it by
       spoken section markers and uses OpenAI (chat completions) to map free
       speech onto the app's diagnosis/diagnostic-test/treatment fields.
    3. Persist the recording + structured result and return it so the physician
       only has to review and confirm, instead of typing/clicking through every field.

    (Speaker recognition/matching isn't implemented — speaker_id/similarity_score
    below are just hardcoded neutral values.)
    """
    had_language = language in LANGUAGE_MAP

    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    audio_id = str(uuid.uuid4())
    audio_filename = f"{audio_id}{suffix}"
    audio_path = AUDIO_DIR / audio_filename
    with open(audio_path, "wb") as f:
        f.write(content)

    try:
        try:
            result = transcribe_with_fallback(tmp_path, language=language if had_language else None)
        except Exception as e:
            return JSONResponse(status_code=422, content={"detail": f"Could not process the recording audio: {e}"})
        text = result["text"]
        detected_code = language if had_language else detect_language(text)
        detected_language = LANGUAGE_MAP.get(detected_code, detected_code)

        speaker_id, similarity_score = None, 0.0

        structured = extract_structured(text)

        doc = {
            "id": str(uuid.uuid4()),
            "mode": "dictation",
            "patient_id": patient_id,
            "text": text,
            "language": detected_code,
            "language_name": detected_language.capitalize() if detected_language != "unknown" else "Unknown",
            "speaker_id": speaker_id,
            "similarity_score": round(similarity_score, 4),
            "structured": structured,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": audio_duration_seconds(tmp_path),
            "audio_filename": audio_filename,
        }

        return JSONResponse(content=doc)

    finally:
        os.unlink(tmp_path)


@app.get("/audio/{filename}")
def get_audio(filename: str):
    """Serve audio files for playback."""
    file_path = AUDIO_DIR / filename
    if not file_path.exists():
        return JSONResponse(status_code=404, content={"error": "Audio file not found"})
    
    # Determine media type based on file extension
    suffix = file_path.suffix.lower()
    media_type = "audio/webm" if suffix == ".webm" else "audio/wav" if suffix == ".wav" else "audio/mpeg"
    
    return FileResponse(file_path, media_type=media_type)
