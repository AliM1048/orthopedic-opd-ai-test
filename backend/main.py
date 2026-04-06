import os
import uuid
import tempfile
from datetime import datetime
import hashlib
import random

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import whisper
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Whisper STT API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
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

# Load Whisper model once at startup
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded!")

# Simple speaker identification (for demo purposes)
# In production, you'd use proper speaker diarization like pyannote.audio
LANGUAGE_MAP = {
    "en": "english",
    "ar": "arabic",
    "fr": "french",
}


def identify_speakers_simple(audio_path, language):
    """Simple speaker identification based on audio characteristics"""
    # For demo: randomly assign speakers (in real implementation, use proper diarization)
    # This is a placeholder - replace with actual speaker diarization
    
    # Get file size as a simple characteristic
    file_size = os.path.getsize(audio_path)
    
    # Create a hash based on file characteristics
    speaker_hash = hashlib.md5(f"{file_size}_{language}_{random.randint(1, 100)}".encode()).hexdigest()[:8]
    
    return speaker_hash


def get_or_create_speaker_id(speaker_hash):
    """Get existing speaker ID or create new one"""
    # Check if this speaker already exists
    existing = speakers_collection.find_one({"hash": speaker_hash})
    if existing:
        return existing["speaker_id"]
    
    # Create new speaker ID
    speaker_count = speakers_collection.count_documents({})
    speaker_id = f"Speaker_{speaker_count + 1}"
    
    speakers_collection.insert_one({
        "speaker_id": speaker_id,
        "hash": speaker_hash,
        "created_at": datetime.utcnow().isoformat() + "Z"
    })
    
    return speaker_id


@app.get("/")
def root():
    return {"status": "Whisper STT API is running"}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default=None),
):
    """
    Receive an audio file, run Whisper transcription, save to MongoDB.
    """
    # Validate language if provided
    if language and language not in LANGUAGE_MAP:
        return JSONResponse(status_code=400, content={"error": f"Unsupported language: {language}"})

    # Save audio to temp file
    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Run Whisper first to detect language
        transcribe_kwargs = {"fp16": False}  # Safe for CPU
        if language:
            transcribe_kwargs["language"] = LANGUAGE_MAP[language]
        
        result = model.transcribe(tmp_path, **transcribe_kwargs)
        text = result["text"].strip()
        detected_language = result.get("language", language or "unknown")

        # Map detected language back to code if possible
        detected_code = None
        for code, lang in LANGUAGE_MAP.items():
            if lang == detected_language:
                detected_code = code
                break
        if not detected_code:
            detected_code = detected_language  # fallback

        # Run speaker identification using detected language
        speaker_hash = identify_speakers_simple(tmp_path, detected_code)
        speaker_id = get_or_create_speaker_id(speaker_hash)

        # Build document
        doc = {
            "id": str(uuid.uuid4()),
            "text": text,
            "language": detected_code,
            "language_name": detected_language.capitalize() if detected_language != "unknown" else "Unknown",
            "speaker_id": speaker_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "duration_seconds": result.get("segments", [{}])[-1].get("end", 0) if result.get("segments") else 0,
        }

        # Save to MongoDB
        collection.insert_one(doc)
        doc.pop("_id", None)

        return JSONResponse(content=doc)
    finally:
        os.unlink(tmp_path)


@app.get("/history")
def get_history(limit: int = 50):
    """
    Return recent transcriptions from MongoDB.
    """
    docs = list(collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return JSONResponse(content={"transcriptions": docs})


@app.delete("/history")
def clear_history():
    """
    Clear all transcriptions from MongoDB.
    """
    result = collection.delete_many({})
    return JSONResponse(content={"deleted": result.deleted_count})
