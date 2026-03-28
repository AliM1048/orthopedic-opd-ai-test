import os
import uuid
import tempfile
from datetime import datetime

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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["whisper_db"]
collection = db["transcriptions"]

# Load Whisper model once at startup
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded!")

LANGUAGE_MAP = {
    "en": "english",
    "ar": "arabic",
    "fr": "french",
}


@app.get("/")
def root():
    return {"status": "Whisper STT API is running"}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    """
    Receive an audio file, run Whisper transcription, save to MongoDB.
    """
    # Validate language
    if language not in LANGUAGE_MAP:
        return JSONResponse(status_code=400, content={"error": f"Unsupported language: {language}"})

    # Save audio to temp file
    suffix = os.path.splitext(audio.filename)[-1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Run Whisper
        result = model.transcribe(
            tmp_path,
            language=LANGUAGE_MAP[language],
            fp16=False,  # Safe for CPU
        )
        text = result["text"].strip()

        # Build document
        doc = {
            "id": str(uuid.uuid4()),
            "text": text,
            "language": language,
            "language_name": LANGUAGE_MAP[language].capitalize(),
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
