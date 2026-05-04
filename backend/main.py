import os
import uuid
import tempfile
from datetime import datetime
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import whisper
from pymongo import MongoClient
from dotenv import load_dotenv
from resemblyzer import VoiceEncoder, preprocess_wav
from pydub import AudioSegment
from pydub.silence import split_on_silence

load_dotenv()

app = FastAPI(title="Whisper STT API")

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

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["whisper_db"]
collection = db["transcriptions"]
speakers_collection = db["speakers"]

# ──────────────────────────────────────────────
# Load models once at startup
# ──────────────────────────────────────────────
print("Loading Whisper model...")
whisper_model = whisper.load_model("base")
print("✅ Whisper model loaded!")

print("Loading Resemblyzer voice encoder...")
voice_encoder = VoiceEncoder()
print("✅ Resemblyzer voice encoder loaded!")

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


# ──────────────────────────────────────────────
# Audio helpers
# ──────────────────────────────────────────────

def convert_to_wav(input_path: str) -> str:
    """Convert any audio format to a 16 kHz mono WAV (required by Resemblyzer).
    Also removes silence / background noise for cleaner embeddings."""
    wav_path = input_path + "_16k.wav"
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_frame_rate(16000).set_channels(1)

    # Remove silence / noise segments for cleaner voice embeddings
    chunks = split_on_silence(audio, min_silence_len=500, silence_thresh=-40)
    if chunks:
        clean_audio = chunks[0]
        for c in chunks[1:]:
            clean_audio += c
        clean_audio.export(wav_path, format="wav")
    else:
        # Fallback: export as-is if no voiced chunks detected
        audio.export(wav_path, format="wav")

    return wav_path


def get_voice_embedding(wav_path: str) -> np.ndarray:
    """Return a 256-dim L2-normalised voice embedding via Resemblyzer."""
    wav = preprocess_wav(Path(wav_path))
    embedding = voice_encoder.embed_utterance(wav)
    return embedding


def get_segment_embeddings(wav_path: str, segments: list) -> np.ndarray:
    """Extract per-segment embeddings using Whisper timestamps, then average.
    This filters out non-speech and produces a cleaner voice representation
    than embedding the entire file as one utterance."""
    audio = AudioSegment.from_file(wav_path)
    embeddings = []

    for seg in segments:
        start_ms = int(seg["start"] * 1000)
        end_ms = int(seg["end"] * 1000)
        if end_ms - start_ms < 500:  # skip very short segments (<0.5s)
            continue

        seg_audio = audio[start_ms:end_ms]
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            seg_audio.export(tmp.name, format="wav")
            tmp_seg_path = tmp.name

        try:
            emb = get_voice_embedding(tmp_seg_path)
            embeddings.append(emb)
        finally:
            os.unlink(tmp_seg_path)

    if not embeddings:
        # Fallback: embed the whole file if no valid segments
        return get_voice_embedding(wav_path)

    return np.mean(embeddings, axis=0)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity in [−1, 1]; 1 = identical voice."""
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / (norm + 1e-9))


# ──────────────────────────────────────────────
# Speaker matching
# ──────────────────────────────────────────────

def find_matching_speaker(embedding: np.ndarray):
    """Return (speaker_id, best_score) for the closest stored voiceprint.
    Compares against the *average* of all stored embeddings per speaker."""
    best_id = None
    best_score = -1.0

    for doc in speakers_collection.find({}):
        stored_embeddings = [np.array(e) for e in doc["embeddings"]]
        avg_embedding = np.mean(stored_embeddings, axis=0)
        score = cosine_similarity(embedding, avg_embedding)
        num_embs = len(stored_embeddings)
        print(f"  🔍 vs {doc['speaker_id']} (profile: {num_embs} embeddings) → score: {score:.4f}")
        if score > best_score:
            best_score = score
            best_id = doc["speaker_id"]

    return best_id, best_score


def get_or_create_speaker(embedding: np.ndarray):
    """
    Match the embedding against stored voiceprints.
    If similarity >= SPEAKER_SIMILARITY_THRESHOLD  → return existing speaker
    and progressively update their profile.
    Otherwise → create and store a new Speaker_N.
    Returns (speaker_id, is_new_speaker, best_score).
    """
    print(f"\n🎤 Speaker matching (threshold: {SPEAKER_SIMILARITY_THRESHOLD})")
    speaker_id, score = find_matching_speaker(embedding)

    if speaker_id and score >= SPEAKER_SIMILARITY_THRESHOLD:
        print(f"  ✅ MATCHED → {speaker_id} (score: {score:.4f})")
        # Progressively update the speaker profile (cap at MAX_EMBEDDINGS_PER_SPEAKER)
        current = speakers_collection.find_one({"speaker_id": speaker_id})
        if current and len(current.get("embeddings", [])) < MAX_EMBEDDINGS_PER_SPEAKER:
            speakers_collection.update_one(
                {"speaker_id": speaker_id},
                {"$push": {"embeddings": embedding.tolist()}}
            )
            print(f"  📝 Profile updated ({len(current['embeddings'])+1} embeddings)")
        return speaker_id, False, score

    # New speaker — store first embedding in a list
    count = speakers_collection.count_documents({})
    new_id = f"Speaker_{count + 1}"
    print(f"  🆕 NEW SPEAKER → {new_id} (best score was {score:.4f}, below {SPEAKER_SIMILARITY_THRESHOLD})")
    speakers_collection.insert_one({
        "speaker_id": new_id,
        "embeddings": [embedding.tolist()],
        "created_at": datetime.utcnow().isoformat() + "Z",
    })
    return new_id, True, score


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Whisper STT API is running", "speaker_threshold": SPEAKER_SIMILARITY_THRESHOLD}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default=None),
):
    """
    1. Save uploaded audio to a temp file.
    2. Run Whisper for transcription + language detection.
    3. Convert audio to 16 kHz WAV.
    4. Run Resemblyzer to get a voice embedding.
    5. Match or create a speaker in MongoDB.
    6. Save & return the transcription document.
    """
    if language and language not in LANGUAGE_MAP:
        return JSONResponse(status_code=400, content={"error": f"Unsupported language: {language}"})

    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    wav_path = None
    try:
        # ── Step 1: Whisper transcription ──────────────────────────────
        transcribe_kwargs = {"fp16": False}
        if language:
            transcribe_kwargs["language"] = LANGUAGE_MAP[language]

        result = whisper_model.transcribe(tmp_path, **transcribe_kwargs)
        text = result["text"].strip()
        detected_language = result.get("language", language or "unknown")

        detected_code = None
        for code, lang in LANGUAGE_MAP.items():
            if lang == detected_language:
                detected_code = code
                break
        if not detected_code:
            detected_code = detected_language

        # ── Step 2: Convert to 16 kHz WAV ─────────────────────────────
        wav_path = convert_to_wav(tmp_path)

        # ── Step 3: Voice embedding + speaker lookup ───────────────────
        embedding = get_segment_embeddings(wav_path, result.get("segments", []))
        speaker_id, is_new, similarity_score = get_or_create_speaker(embedding)

        # ── Step 4: Persist transcription ─────────────────────────────
        doc = {
            "id": str(uuid.uuid4()),
            "text": text,
            "language": detected_code,
            "language_name": detected_language.capitalize() if detected_language != "unknown" else "Unknown",
            "speaker_id": speaker_id,
            "is_new_speaker": is_new,
            "similarity_score": round(similarity_score, 4),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": (
                result.get("segments", [{}])[-1].get("end", 0)
                if result.get("segments") else 0
            ),
        }

        collection.insert_one(doc)
        doc.pop("_id", None)

        return JSONResponse(content=doc)

    finally:
        os.unlink(tmp_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)


@app.get("/history")
def get_history(limit: int = 50):
    """Return recent transcriptions, newest first."""
    docs = list(collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return JSONResponse(content={"transcriptions": docs})


@app.delete("/history")
def clear_history():
    """Delete all transcriptions."""
    result = collection.delete_many({})
    return JSONResponse(content={"deleted": result.deleted_count})


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
