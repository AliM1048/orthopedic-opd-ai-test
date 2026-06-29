"""
Turns one continuous physician dictation (diagnosis + diagnostics + treatment,
all spoken in a single take) into structured fields the UI can pre-fill.

Pipeline:
1. segment_dictation() splits the raw transcript into evaluation / diagnostics /
   treatment chunks using spoken keyword markers (e.g. "diagnosis...",
   "diagnostics...", "treatment plan..."). This is a deterministic, no-AI step
   so the split is predictable and doctors can learn the cues.
2. extract_structured() sends the transcript + those chunks to a local Ollama
   LLM, which maps free speech onto the app's fixed diagnostic-test / treatment
   option lists and resolves relative dates ("in two weeks") to ISO dates.
   If Ollama is unreachable, it falls back to the plain segmented text so the
   page still works (just without AI-mapped tests/treatments).
"""
import os
import re
import json
from datetime import datetime

import requests

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))

# Must stay in sync with frontend/src/data/mockData.js (DIAGNOSTIC_TESTS / TREATMENT_OPTIONS)
DIAGNOSTIC_TESTS = {
    "xray": "X-Ray",
    "mri": "MRI",
    "ct": "CT Scan",
    "lab": "Laboratory Tests",
    "us": "Ultrasound",
}

TREATMENT_OPTIONS = {
    "surgery": "Surgery",
    "medication": "Medication",
    "physio": "Physiotherapy",
    "injection": "Injection Therapy",
    "rest": "Rest & Monitoring",
    "rehab": "Long-term Rehab",
}

# Direct word-spotting for the two closed lists above. This runs regardless of
# whether the LLM is available — picking "x-ray" or "surgery" out of a sentence
# is a fixed-vocabulary match problem, not something that needs an LLM, and
# matching deterministically means the doctor's word always wins instead of an
# LLM's paraphrase of it.
DIAGNOSTIC_TEST_SYNONYMS = {
    "xray": [r"x[\s-]?ray", r"radiograph"],
    "mri": [r"mri", r"magnetic resonance"],
    "ct": [r"ct\s*scan", r"cat\s*scan", r"computed tomography"],
    "lab": [r"laborator\w*", r"lab\s*tests?", r"lab\s*work", r"blood\s*(?:test|work)", r"\bcbc\b", r"\besr\b", r"\bcrp\b"],
    "us": [r"ultrasound", r"sonograph\w*"],
}

TREATMENT_SYNONYMS = {
    "surgery": [r"surger\w*", r"surgical", r"operat\w*"],
    "medication": [r"medication\w*", r"\bmeds\b", r"prescri\w*", r"\bmedicine\b"],
    "physio": [r"physiotherap\w*", r"physical therap\w*", r"\bphysio\b"],
    "injection": [r"injection\w*", r"corticosteroid\w*", r"\bprp\b", r"steroid shot", r"cortisone"],
    "rest": [r"rest\s*(?:and|&)?\s*monitor\w*", r"conservative management", r"\bjust rest\b"],
    "rehab": [r"rehabilitation\w*", r"long[\s-]?term rehab\w*", r"\brehab\b"],
}


def keyword_match(text: str, synonyms: dict) -> list[str]:
    """Scan text for the first occurrence of any synonym for each known id,
    returning matched ids ordered by where they were said (earliest first)."""
    hits = []
    for id_, patterns in synonyms.items():
        for pattern in patterns:
            m = re.search(pattern, text, re.I)
            if m:
                hits.append((m.start(), id_))
                break
    hits.sort(key=lambda x: x[0])
    seen, ordered = set(), []
    for _, id_ in hits:
        if id_ not in seen:
            seen.add(id_)
            ordered.append(id_)
    return ordered

# Spoken section markers a physician uses to delimit one continuous dictation
# without touching the screen. Word-boundary regexes so "diagnosis" and
# "diagnostics" don't collide with each other.
_SECTION_PATTERNS = [
    ("treatment", re.compile(r"\btreatment\s*plan\b|\btreatment\b|\bprescri(?:be|bing|ption)\b", re.I)),
    ("diagnostics", re.compile(r"\bdiagnostics?\b|\border(?:ing)?\s+(?:tests?|imaging)\b|\brequest(?:ing)?\s+(?:tests?|imaging)\b|\blabs?\b|\bimaging\b", re.I)),
    ("evaluation", re.compile(r"\bdiagnosis\b|\bevaluation\b|\bassessment\b|\bfindings\b", re.I)),
]

# Within the treatment section, "instructions"/"details" is itself a spoken
# cue (same idea as the section markers above) — the LLM doesn't reliably
# pick it up as free text every time, so capture everything said after it
# directly. Only used as a fallback when the AI left details empty.
_DETAILS_CUE_PATTERN = re.compile(r"\b(?:instructions?\s*(?:and|&)?\s*details?|details?|instructions?)\b\s*[:,]?\s*", re.I)


def extract_details_cue(treatment_text: str) -> str:
    """Return whatever was said after the last "instructions"/"details" cue
    in the treatment section, or "" if the cue wasn't used."""
    matches = list(_DETAILS_CUE_PATTERN.finditer(treatment_text))
    if not matches:
        return ""
    return treatment_text[matches[-1].end():].strip().rstrip(".").strip()


def _apply_details_fallback(treatments: list, fallback_details: str) -> None:
    """If the doctor used an explicit "instructions"/"details" cue but the AI
    left some treatment's details empty, fill it in directly. Applied to the
    last treatment still missing details, since that's the one the trailing
    speech most likely refers to."""
    if not fallback_details:
        return
    for entry in reversed(treatments):
        if not entry["details"]:
            entry["details"] = fallback_details
            return


def segment_dictation(text: str) -> dict:
    """Split one continuous dictation into evaluation/diagnostics/treatment
    chunks. Anything spoken before the first marker is treated as evaluation,
    since physicians naturally lead with findings before ordering tests or
    prescribing treatment."""
    matches = []
    for label, pattern in _SECTION_PATTERNS:
        for m in pattern.finditer(text):
            matches.append((m.start(), label))
    matches.sort(key=lambda x: x[0])

    sections = {"evaluation": "", "diagnostics": "", "treatment": ""}
    if not matches:
        sections["evaluation"] = text.strip()
        return sections

    pre_text = text[: matches[0][0]].strip()
    if pre_text:
        sections["evaluation"] += pre_text + " "

    for i, (start, label) in enumerate(matches):
        end = matches[i + 1][0] if i + 1 < len(matches) else len(text)
        sections[label] += text[start:end].strip() + " "

    return {k: v.strip() for k, v in sections.items()}


def _build_prompt(transcript: str, sections: dict) -> str:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    test_list = ", ".join(f'"{k}" ({v})' for k, v in DIAGNOSTIC_TESTS.items())
    treatment_list = ", ".join(f'"{k}" ({v})' for k, v in TREATMENT_OPTIONS.items())

    return f"""You are a clinical scribe assistant for an orthopedic clinic. A physician
dictated an entire patient visit in one continuous recording, covering diagnosis,
which tests to order, and a treatment plan. Extract structured data as JSON ONLY
(no markdown fences, no commentary, just the JSON object).

Today's date is {today}. Resolve relative dates ("in two weeks", "next month") to
an absolute YYYY-MM-DD date using today's date as the reference. Use null if no
date was mentioned.

Known diagnostic test ids (use ONLY these ids): {test_list}
Known treatment ids (use ONLY these ids): {treatment_list}

Full transcript:
\"\"\"{transcript}\"\"\"

Rough pre-split of the same transcript (may be incomplete/imperfect, use only as
a hint — the full transcript above is the source of truth):
- Evaluation part: \"\"\"{sections.get('evaluation', '')}\"\"\"
- Diagnostics part: \"\"\"{sections.get('diagnostics', '')}\"\"\"
- Treatment part: \"\"\"{sections.get('treatment', '')}\"\"\"

Return JSON with exactly this shape:
{{
  "diagnosis": "short diagnosis label, e.g. Osteoarthritis Grade 3, Right Knee",
  "notes": "clinical notes summarizing history/exam/findings from the evaluation part",
  "diagnostic_tests": ["<ids from the known diagnostic test ids that were mentioned>"],
  "treatments": [
    {{"type": "<id from the known treatment ids>", "duration": "<e.g. 6 weeks, or null>", "details": "<instructions mentioned>", "followUpDate": "<YYYY-MM-DD or null>"}}
  ]
}}

Rules:
- If a section wasn't mentioned at all, return an empty string/array for it
  instead of guessing.
- Only use ids from the known lists above for diagnostic_tests and
  treatments[].type — never invent new ids.
- If the same treatment (e.g. physiotherapy) has a duration AND a follow-up
  date, put BOTH on the SAME treatment object — never create a second,
  separate treatment object just to hold a follow-up date.
- Do not wrap string values in extra quote characters; "diagnosis": "Osteoarthritis"
  is correct, "diagnosis": "'Osteoarthritis'" is NOT."""


def _clean_str(value) -> str:
    """Strip stray wrapping quotes some smaller models add around string
    values despite the prompt's JSON shape (e.g. "'Osteoarthritis'"), and
    normalise the literal text "null"/"none" some models write instead of an
    actual JSON null when a field wasn't mentioned."""
    if not isinstance(value, str):
        return ""
    value = value.strip()
    while len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        value = value[1:-1].strip()
    if value.lower() in ("null", "none", "n/a"):
        return ""
    return value


def _clean_date(value):
    cleaned = _clean_str(value)
    return cleaned or None


def warm_up_ollama():
    """Start loading the model into memory/VRAM ahead of time. Ollama unloads
    idle models after ~5 minutes, and a cold reload can take long enough to
    blow past OLLAMA_TIMEOUT_SECONDS on the real extraction call. Call this
    the moment the doctor starts recording so the model is already warm by
    the time they finish dictating.

    This already runs inside a FastAPI BackgroundTask (i.e. after the HTTP
    response to the browser has been sent), so there is no reason to cut the
    request short with a tight client timeout — doing that previously was
    actively counterproductive: Ollama is a Go server that cancels the
    in-flight model load when the client disconnects, so a short timeout here
    aborted the warm-up instead of completing it.
    """
    try:
        requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": "", "keep_alive": "30m"},
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )
    except Exception as e:
        print(f"⚠️ Ollama warm-up failed (will still try at extraction time): {e}")


def call_ollama(prompt: str) -> dict | None:
    try:
        resp = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "keep_alive": "30m",
                "options": {"temperature": 0},
            },
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
        return json.loads(raw)
    except Exception as e:
        print(f"⚠️ Ollama extraction unavailable, falling back to plain text ({e})")
        return None


def extract_structured(transcript: str) -> dict:
    """Best-effort structuring of a raw dictation transcript.

    Diagnostic tests and treatment types are matched by keyword regardless of
    whether the LLM is available — those two fields are picks from a small
    fixed list, so direct word-spotting in the diagnostics/treatment sections
    is both faster and more reliable than waiting on an LLM guess. The LLM is
    only relied on for the genuinely free-text parts: the diagnosis label,
    clinical notes, and resolving things like "duration" / follow-up dates.
    """
    sections = segment_dictation(transcript)
    keyword_tests = keyword_match(sections["diagnostics"], DIAGNOSTIC_TEST_SYNONYMS)
    keyword_treatment_types = keyword_match(sections["treatment"], TREATMENT_SYNONYMS)
    fallback_details = extract_details_cue(sections["treatment"])

    if not transcript.strip():
        return {
            "diagnosis": "", "notes": "", "diagnostic_tests": [], "treatments": [],
            "sections": sections, "ai_structured": False,
        }

    parsed = call_ollama(_build_prompt(transcript, sections))

    if parsed is None:
        # Ollama unreachable: still honor the keyword-matched tests/treatments
        # so voice selection works even with the LLM down — just without an
        # AI-written diagnosis/notes/duration/follow-up date.
        treatments = [
            {"type": t, "duration": "", "details": "", "followUpDate": None}
            for t in keyword_treatment_types
        ]
        _apply_details_fallback(treatments, fallback_details)
        return {
            "diagnosis": "",
            "notes": sections["evaluation"] or transcript,
            "diagnostic_tests": keyword_tests,
            "treatments": treatments,
            "sections": sections,
            "ai_structured": False,
        }

    ai_tests = [t for t in parsed.get("diagnostic_tests", []) or [] if t in DIAGNOSTIC_TESTS]
    diagnostic_tests = list(keyword_tests)
    for t in ai_tests:
        if t not in diagnostic_tests:
            diagnostic_tests.append(t)

    # Smaller/faster models occasionally split one treatment's duration and
    # follow-up date into two separate objects of the same type despite being
    # told not to — merge same-type entries back together defensively.
    treatments_by_type: dict[str, dict] = {}
    for t in keyword_treatment_types:
        treatments_by_type[t] = {"type": t, "duration": "", "details": "", "followUpDate": None}
    for t in parsed.get("treatments", []) or []:
        if not isinstance(t, dict) or t.get("type") not in TREATMENT_OPTIONS:
            continue
        entry = treatments_by_type.setdefault(t["type"], {
            "type": t["type"], "duration": "", "details": "", "followUpDate": None,
        })
        entry["duration"] = entry["duration"] or _clean_str(t.get("duration"))
        entry["details"] = entry["details"] or _clean_str(t.get("details"))
        entry["followUpDate"] = entry["followUpDate"] or _clean_date(t.get("followUpDate"))

    treatments = list(treatments_by_type.values())
    _apply_details_fallback(treatments, fallback_details)

    return {
        "diagnosis": _clean_str(parsed.get("diagnosis")),
        "notes": _clean_str(parsed.get("notes")) or sections["evaluation"],
        "diagnostic_tests": diagnostic_tests,
        "treatments": treatments,
        "sections": sections,
        "ai_structured": True,
    }
