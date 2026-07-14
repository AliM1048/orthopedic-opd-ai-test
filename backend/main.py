import os
import time  # TEMP DEBUG TIMING - remove after testing
import uuid
import tempfile
from datetime import datetime
from pathlib import Path

# numpy is only needed by the disabled speaker recognition/matching block below.
# import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from faster_whisper import WhisperModel
from pymongo import MongoClient
from dotenv import load_dotenv
# Speaker recognition/matching is disabled for now (see the commented-out
# block below "Speaker matching") — these imports are only needed by that
# feature, and importing resemblyzer pulls in a slow-to-load ML model.
# from resemblyzer import VoiceEncoder, preprocess_wav
from pydub import AudioSegment
# from pydub.silence import split_on_silence

from database import engine, Base
from auth import get_current_user
from llm_extract import extract_structured, warm_up_ollama
from routers.patients import router as patients_router
from routers.assessments import router as assessments_router
from routers.evaluations import router as evaluations_router
from routers.diagnostics import router as diagnostics_router
from routers.treatments import router as treatments_router
from routers.lookup import router as lookup_router
from routers.auth import router as auth_router

load_dotenv()

app = FastAPI(title="Orthopedic OPD AI - Backend")

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


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
try:
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    # Force an actual connection check
    client.admin.command("ping")
    print("✅ Successfully connected to MongoDB!")
except Exception as e:
    print(f"⚠️  Could not connect to MongoDB: {e}")
    print("↩️  Falling back to local file-based database (backend/data/db.json)...")
    from local_db import LocalMongoClient
    client = LocalMongoClient(MONGO_URI)
db = client["whisper_db"]
collection = db["transcriptions"]
speakers_collection = db["speakers"]

# Audio storage directory
AUDIO_DIR = Path("audio")
AUDIO_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────
# Load models once at startup
# ──────────────────────────────────────────────
# faster-whisper (CTranslate2 backend) is a drop-in replacement for
# openai-whisper that runs ~4x faster on CPU via int8 quantization, while
# also giving us built-in VAD so long single-take dictations don't drift
# into the silence-hallucination loops plain Whisper is prone to.
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")

print(f"Loading faster-whisper model ({WHISPER_MODEL_SIZE}, {WHISPER_DEVICE}/{WHISPER_COMPUTE_TYPE})...")
whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)
print("✅ Whisper model loaded!")

# Speaker recognition disabled for now — see the commented-out block below
# "Speaker matching" and the call sites in /transcribe and /dictate.
# print("Loading Resemblyzer voice encoder...")
# voice_encoder = VoiceEncoder()
# print("✅ Resemblyzer voice encoder loaded!")

# Cosine-similarity threshold for matching an existing speaker.
# Raise it (e.g. 0.80) if different people get merged.
# Lower it (e.g. 0.65) if the same person keeps getting split.
# NOTE: Short clips (<5s) and multi-language usage need a lower threshold.
SPEAKER_SIMILARITY_THRESHOLD = 0.60

# Maximum number of embeddings stored per speaker profile.
MAX_EMBEDDINGS_PER_SPEAKER = 20

LANGUAGE_MAP = {
    "en": "english",
    "ar": "arabic",
    "fr": "french",
}

# Biases Whisper's decoder toward orthopedic vocabulary it otherwise rarely
# sees in training data (drug names, "osteoarthritis", "physiotherapy", the
# diagnostic test names, etc.), plus the spoken section cues this app relies
# on. This is the single highest-leverage accuracy fix available without
# fine-tuning: Whisper conditions each decode on this text as if it were
# preceding context, so these words/phrases become measurably more likely
# even though no audio of them was actually heard yet.
CLINICAL_VOCAB_PROMPT = (
    "Diagnosis. Diagnostics. Treatment plan. "
    "Osteoarthritis, rotator cuff tear, ACL tear, meniscus tear, herniated disc, "
    "lumbar disc herniation, sciatica, fracture, dislocation, tendinitis, bursitis, "
    "carpal tunnel syndrome, scoliosis, spinal stenosis. "
    "X-ray, MRI, CT scan, ultrasound, laboratory tests. "
    "Surgery, medication, physiotherapy, injection therapy, corticosteroid, "
    "rest and monitoring, long-term rehabilitation, follow-up."
)


# ──────────────────────────────────────────────
# Whisper helper
# ──────────────────────────────────────────────

def run_whisper(path: str, language: str | None = None, fast: bool = False) -> dict:
    """Run faster-whisper and normalise its output to the
    {text, language, segments} shape the rest of this module expects.

    vad_filter skips silence so a long single-take dictation (diagnosis +
    diagnostics + treatment in one recording) doesn't trip Whisper's known
    hallucination/repetition failure mode on long audio. condition_on_previous_text
    is disabled for the same reason: it stops one bad guess from poisoning the
    rest of a long transcript. beam_size=5 trades a little speed for materially
    cleaner text, which matters more here since this transcript drives downstream
    LLM extraction.

    fast=True drops to greedy decoding (beam_size=1) for the live-caption
    preview path, where we re-transcribe the growing recording every few
    seconds and a rough-but-fast result matters more than the cleanest text.
    """
    segments_iter, info = whisper_model.transcribe(
        path,
        language=language,
        beam_size=1 if fast else 5,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        condition_on_previous_text=False,
        initial_prompt=CLINICAL_VOCAB_PROMPT,
    )
    segments = [{"start": seg.start, "end": seg.end, "text": seg.text} for seg in segments_iter]
    text = " ".join(seg["text"].strip() for seg in segments).strip()
    return {
        "text": text,
        "language": info.language,
        "language_probability": info.language_probability,
        "segments": segments,
    }


# ──────────────────────────────────────────────
# Audio helpers
# ──────────────────────────────────────────────

def transcribe_with_fallback(path: str, language: str | None = None, fast: bool = False) -> dict:
    """run_whisper(), retrying once on a clean ffmpeg re-encode if PyAV's
    decoder rejects the raw upload.

    faster-whisper decodes audio via PyAV, which is stricter than ffmpeg
    about MediaRecorder's chunked WebM output — a browser hiccup mid-recording
    (dropped frame, device hand-off) can produce a container PyAV refuses
    with "Invalid data found when processing input" even though the audio is
    otherwise intact and ffmpeg (which pydub shells out to) can read it fine.
    Re-encoding through pydub/ffmpeg first and retrying sidesteps that.
    """
    try:
        return run_whisper(path, language=language, fast=fast)
    except Exception as e:
        print(f"⚠️ Whisper couldn't decode the upload directly ({e}); retrying via ffmpeg re-encode")
        reencoded_path = path + "_reencoded.wav"
        AudioSegment.from_file(path).export(reencoded_path, format="wav")
        try:
            return run_whisper(reencoded_path, language=language, fast=fast)
        finally:
            os.unlink(reencoded_path)


# ──────────────────────────────────────────────
# Speaker recognition / matching — DISABLED (commented out below). It added
# noticeable per-request latency (embedding extraction + a full Mongo scan
# to compare voiceprints) that isn't worth paying while we only need
# speech-to-text. /transcribe and /dictate now hardcode speaker_id=None /
# similarity_score=0.0 instead of calling any of this.
#
# To re-enable: uncomment this block, the `from resemblyzer import ...`
# import and `voice_encoder = VoiceEncoder()` above, and swap the hardcoded
# values back to real calls (convert_to_wav + get_segment_embeddings +
# get_or_create_speaker) in /transcribe and /dictate below.
# ──────────────────────────────────────────────

# def convert_to_wav(input_path: str) -> str:
#     """Convert any audio format to a 16 kHz mono WAV (required by Resemblyzer).
#     Also removes silence / background noise for cleaner embeddings."""
#     wav_path = input_path + "_16k.wav"
#     audio = AudioSegment.from_file(input_path)
#     audio = audio.set_frame_rate(16000).set_channels(1)
#
#     # Remove silence / noise segments for cleaner voice embeddings
#     chunks = split_on_silence(audio, min_silence_len=500, silence_thresh=-40)
#     if chunks:
#         clean_audio = chunks[0]
#         for c in chunks[1:]:
#             clean_audio += c
#         clean_audio.export(wav_path, format="wav")
#     else:
#         # Fallback: export as-is if no voiced chunks detected
#         audio.export(wav_path, format="wav")
#
#     return wav_path
#
#
# def get_voice_embedding(wav_path: str) -> np.ndarray:
#     """Return a 256-dim L2-normalised voice embedding via Resemblyzer."""
#     wav = preprocess_wav(Path(wav_path))
#     embedding = voice_encoder.embed_utterance(wav)
#     return embedding
#
#
# def get_segment_embeddings(wav_path: str, segments: list) -> np.ndarray:
#     """Extract per-segment embeddings using Whisper timestamps, then average.
#     This filters out non-speech and produces a cleaner voice representation
#     than embedding the entire file as one utterance."""
#     audio = AudioSegment.from_file(wav_path)
#     embeddings = []
#
#     for seg in segments:
#         start_ms = int(seg["start"] * 1000)
#         end_ms = int(seg["end"] * 1000)
#         if end_ms - start_ms < 500:  # skip very short segments (<0.5s)
#             continue
#
#         seg_audio = audio[start_ms:end_ms]
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
#             seg_audio.export(tmp.name, format="wav")
#             tmp_seg_path = tmp.name
#
#         try:
#             emb = get_voice_embedding(tmp_seg_path)
#             embeddings.append(emb)
#         finally:
#             os.unlink(tmp_seg_path)
#
#     if not embeddings:
#         # Fallback: embed the whole file if no valid segments
#         return get_voice_embedding(wav_path)
#
#     return np.mean(embeddings, axis=0)
#
#
# def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
#     """Cosine similarity in [−1, 1]; 1 = identical voice."""
#     norm = np.linalg.norm(a) * np.linalg.norm(b)
#     return float(np.dot(a, b) / (norm + 1e-9))
#
#
# def find_matching_speaker(embedding: np.ndarray):
#     """Return (speaker_id, best_score) for the closest stored voiceprint.
#     Compares against the *average* of all stored embeddings per speaker."""
#     best_id = None
#     best_score = -1.0
#
#     for doc in speakers_collection.find({}):
#         embs = doc.get("embeddings", [])
#         if not embs:
#             continue
#         stored_embeddings = [np.array(e) for e in embs]
#         avg_embedding = np.mean(stored_embeddings, axis=0)
#         score = cosine_similarity(embedding, avg_embedding)
#         num_embs = len(stored_embeddings)
#         print(f"  🔍 vs {doc.get('speaker_id', 'unknown')} (profile: {num_embs} embeddings) → score: {score:.4f}")
#         if score > best_score:
#             best_score = score
#             best_id = doc.get("speaker_id")
#
#     return best_id, best_score
#
#
# def get_or_create_speaker(embedding: np.ndarray):
#     """
#     Match the embedding against stored voiceprints.
#     If similarity >= SPEAKER_SIMILARITY_THRESHOLD  → return existing speaker
#     and progressively update their profile.
#     Otherwise → create and store a new Speaker_N.
#     Returns (speaker_id, is_new_speaker, best_score).
#     """
#     print(f"\n🎤 Speaker matching (threshold: {SPEAKER_SIMILARITY_THRESHOLD})")
#     speaker_id, score = find_matching_speaker(embedding)
#
#     if speaker_id and score >= SPEAKER_SIMILARITY_THRESHOLD:
#         print(f"  ✅ MATCHED → {speaker_id} (score: {score:.4f})")
#         # Progressively update the speaker profile (cap at MAX_EMBEDDINGS_PER_SPEAKER)
#         current = speakers_collection.find_one({"speaker_id": speaker_id})
#         if current and len(current.get("embeddings", [])) < MAX_EMBEDDINGS_PER_SPEAKER:
#             speakers_collection.update_one(
#                 {"speaker_id": speaker_id},
#                 {"$push": {"embeddings": embedding.tolist()}}
#             )
#             print(f"  📝 Profile updated ({len(current['embeddings'])+1} embeddings)")
#         return speaker_id, False, score
#
#     # New speaker — store first embedding in a list
#     count = speakers_collection.count_documents({})
#     new_id = f"Speaker_{count + 1}"
#     print(f"  🆕 NEW SPEAKER → {new_id} (best score was {score:.4f}, below {SPEAKER_SIMILARITY_THRESHOLD})")
#     speakers_collection.insert_one({
#         "speaker_id": new_id,
#         "embeddings": [embedding.tolist()],
#         "created_at": datetime.utcnow().isoformat() + "Z",
#     })
#     return new_id, True, score


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "Orthopedic OPD AI API is running",
        "whisper_stt": {"speaker_threshold": SPEAKER_SIMILARITY_THRESHOLD},
        "opd_api": "/api/patients",
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default=None),
):
    """
    1. Save uploaded audio to a temp file.
    2. Run Whisper for transcription + language detection.
    3. Save & return the transcription document.

    (Speaker recognition/matching is disabled for now — see the commented-out
    block above "Speaker matching" — so speaker_id/similarity_score below are
    just hardcoded neutral values instead of a real voiceprint lookup.)
    """
    if language and language not in LANGUAGE_MAP:
        return JSONResponse(status_code=400, content={"error": f"Unsupported language: {language}"})

    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Save original audio file
    audio_id = str(uuid.uuid4())
    audio_filename = f"{audio_id}{suffix}"
    audio_path = AUDIO_DIR / audio_filename
    with open(audio_path, "wb") as f:
        f.write(content)

    try:
        # ── Step 1: Whisper transcription ──────────────────────────────
        try:
            result = transcribe_with_fallback(tmp_path, language=language)
        except Exception as e:
            return JSONResponse(status_code=422, content={"detail": f"Could not process the recording audio: {e}"})
        text = result["text"]
        detected_code = result.get("language", language or "unknown")
        detected_language = LANGUAGE_MAP.get(detected_code, detected_code)

        # ── Step 2: Persist transcription ─────────────────────────────
        doc = {
            "id": str(uuid.uuid4()),
            "text": text,
            "language": detected_code,
            "language_name": detected_language.capitalize() if detected_language != "unknown" else "Unknown",
            "speaker_id": None,
            "is_new_speaker": False,
            "similarity_score": 0.0,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": (
                result.get("segments", [{}])[-1].get("end", 0)
                if result.get("segments") else 0
            ),
            "audio_filename": audio_filename,
        }

        collection.insert_one(doc)
        doc.pop("_id", None)

        return JSONResponse(content=doc)

    finally:
        os.unlink(tmp_path)


@app.post("/llm/warmup")
def llm_warmup(background_tasks: BackgroundTasks):
    """
    Call this the moment the doctor clicks the mic. Ollama unloads idle models
    after ~5 minutes; a cold reload can take long enough to blow past the
    extraction timeout in /dictate. Kicking off the load now means the model
    is usually warm by the time the doctor finishes a 10-60s dictation.
    """
    # TEMP DEBUG TIMING - remove after testing
    print(f"⏱️  [warmup] requested at t={time.time():.2f}")

    def _timed_warmup():
        t0 = time.time()
        warm_up_ollama()
        print(f"⏱️  [warmup] finished in {time.time() - t0:.2f}s")

    background_tasks.add_task(_timed_warmup)
    return JSONResponse(content={"status": "warming"})


@app.post("/transcribe/preview")
async def transcribe_preview(
    audio: UploadFile = File(...),
):
    """
    Throwaway transcription of the recording-so-far, used purely to show the
    doctor a live "what the mic is hearing" caption while they're still
    talking. No speaker ID, no LLM structuring, nothing persisted to Mongo or
    disk — just transcribe and return text as fast as possible.

    Forced to English: physicians dictate in English, and skipping Whisper's
    language auto-detection pass is both faster and avoids the model
    occasionally mis-detecting language on short/ambiguous preview clips.
    """
    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        result = run_whisper(tmp_path, language="en", fast=True)
        return JSONResponse(content={"text": result["text"], "language": result.get("language")})
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
):
    """
    One-take physician dictation: the doctor speaks diagnosis, diagnostics to
    order, and the treatment plan in a single recording instead of filling out
    three separate screens.

    1. Transcribe with faster-whisper (forced to English — physicians dictate
       in English, and forcing it skips Whisper's language-detection pass and
       avoids it ever mis-detecting language on accented or noisy audio).
    2. Hand the transcript to llm_extract.extract_structured(), which splits it by
       spoken section markers and uses a local LLM to map free speech onto the
       app's diagnosis/diagnostic-test/treatment fields.
    3. Persist the recording + structured result and return it so the physician
       only has to review and confirm, instead of typing/clicking through every field.

    (Speaker recognition/matching is disabled for now — see the commented-out
    block above "Speaker matching" — so speaker_id/similarity_score below are
    just hardcoded neutral values instead of a real voiceprint lookup.)
    """
    # TEMP DEBUG TIMING - remove after testing
    t_request_start = time.time()
    print(f"⏱️  [dictate] request received at t={t_request_start:.2f}")

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

    # TEMP DEBUG TIMING - remove after testing
    print(f"⏱️  [dictate] audio saved (upload+write took {time.time() - t_request_start:.2f}s), size={len(content)} bytes")

    try:
        t0 = time.time()  # TEMP DEBUG TIMING - remove after testing
        try:
            result = transcribe_with_fallback(tmp_path, language="en")
        except Exception as e:
            return JSONResponse(status_code=422, content={"detail": f"Could not process the recording audio: {e}"})
        text = result["text"]
        detected_code = result.get("language", "en")
        detected_language = LANGUAGE_MAP.get(detected_code, detected_code)

        # TEMP DEBUG TIMING - remove after testing
        t_whisper_done = time.time()
        print(f"⏱️  [dictate] Whisper transcription took {t_whisper_done - t0:.2f}s (audio duration ~{result.get('segments', [{}])[-1].get('end', 0) if result.get('segments') else 0:.1f}s)")

        speaker_id, similarity_score = None, 0.0

        structured = extract_structured(text)

        # TEMP DEBUG TIMING - remove after testing
        t_llm_done = time.time()
        print(f"⏱️  [dictate] LLM extraction (Ollama) took {t_llm_done - t_whisper_done:.2f}s")

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
            "duration_seconds": (
                result.get("segments", [{}])[-1].get("end", 0)
                if result.get("segments") else 0
            ),
            "audio_filename": audio_filename,
        }

        t_mongo_start = time.time()  # TEMP DEBUG TIMING - remove after testing
        collection.insert_one(doc)
        doc.pop("_id", None)

        # TEMP DEBUG TIMING - remove after testing
        print(f"⏱️  [dictate] Mongo insert took {time.time() - t_mongo_start:.2f}s")
        print(f"⏱️  [dictate] TOTAL request time: {time.time() - t_request_start:.2f}s\n")

        return JSONResponse(content=doc)

    finally:
        os.unlink(tmp_path)


@app.get("/history")
def get_history(limit: int = 50):
    """Return recent transcriptions, newest first."""
    docs = list(collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return JSONResponse(content={"transcriptions": docs})


@app.delete("/history")
def clear_history():
    """Delete all transcriptions and their audio files."""
    # Get all audio filenames before deleting
    docs = list(collection.find({}, {"audio_filename": 1}))
    audio_files = [doc.get("audio_filename") for doc in docs if doc.get("audio_filename")]

    # Delete audio files
    for filename in audio_files:
        file_path = AUDIO_DIR / filename
        if file_path.exists():
            file_path.unlink()

    # Delete transcriptions
    result = collection.delete_many({})
    return JSONResponse(content={"deleted": result.deleted_count})


@app.delete("/history/{item_id}")
def delete_transcription(item_id: str):
    """Delete a single transcription and its audio file."""
    doc = collection.find_one({"id": item_id})
    if not doc:
        return JSONResponse(status_code=404, content={"error": "Transcription not found"})

    audio_file = doc.get("audio_filename")
    if audio_file:
        file_path = AUDIO_DIR / audio_file
        if file_path.exists():
            file_path.unlink()

    collection.delete_one({"id": item_id})
    return JSONResponse(content={"deleted": 1, "id": item_id})


@app.get("/speakers")
def get_speakers():
    """List all registered speakers (without raw embeddings)."""
    docs = list(speakers_collection.find({}, {"_id": 0, "embeddings": 0}))
    return JSONResponse(content={"speakers": docs, "count": len(docs)})


@app.delete("/speakers")
def clear_speakers():
    """
    Reset all stored speaker voiceprints.
    Call this if you want to re-learn speaker identities from scratch.
    """
    result = speakers_collection.delete_many({})
    return JSONResponse(content={"deleted": result.deleted_count})


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
