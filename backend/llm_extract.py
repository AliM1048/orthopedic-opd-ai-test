"""
Turns one continuous physician dictation (diagnosis + diagnostics + treatment,
all spoken in a single take) into structured fields the UI can pre-fill.

Pipeline:
1. segment_dictation() splits the raw transcript into evaluation / diagnostics /
   treatment chunks using spoken keyword markers (e.g. "diagnosis...",
   "diagnostics...", "treatment plan..."). This is a deterministic, no-AI step
   so the split is predictable and doctors can learn the cues.
2. extract_structured() sends the transcript + those chunks to OpenAI
   (chat completions, JSON mode), which maps free speech onto the app's fixed
   diagnostic-test / treatment option lists and resolves relative dates
   ("in two weeks") to ISO dates. If the API call fails, it falls back to the
   plain segmented text so the page still works (just without AI-mapped
   tests/treatments).
"""
import os
import re
import json
from datetime import datetime

from openai import OpenAI

OPENAI_EXTRACT_MODEL = os.getenv("OPENAI_EXTRACT_MODEL", "gpt-4o-mini")
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
# Arabic/French alternatives are written in *normalised* Arabic form (see
# _normalize_arabic below — alef-hamza forms collapsed to ا, ة->ه, ى->ي)
# since keyword_match() always searches the normalised haystack. English and
# French matching is plain re.I; French adds an [ée] class where accents are
# ASR-optional so it matches whether or not OpenAI transcribes the accent.
# Arabic terms use an optional `(?:و)?(?:ال)?` definite-article prefix on each noun
# — the article glues directly onto the word with no space ("الفحوصات" =
# "the" + "diagnostics" as one token), so a bare `\bفحوصات\b` would never
# match the (very common) definite form. `(?:و)?(?:ال)?` before the word keeps `\b`
# anchored at the true start (article present or not) instead.
DIAGNOSTIC_TEST_SYNONYMS = {
    "xray": [
        r"x[\s-]?ray", r"radiograph",
        r"\b(?:و)?(?:ال)?اشعه\s*(?:و)?(?:ال)?سينيه\b", r"\b(?:و)?(?:ال)?اشعه\s*(?:و)?(?:ال)?اكس\b", r"\b(?:و)?(?:ال)?رنتجن\b",
        r"\bradiographie\b", r"\brayons?\s*x\b",
    ],
    "mri": [
        r"mri", r"magnetic resonance",
        r"\b(?:و)?(?:ال)?رنين\s*(?:و)?(?:ال)?مغناطيسي\b",
        r"\birm\b", r"\bimagerie\s*par\s*r[ée]sonance\s*magn[ée]tique\b", r"\br[ée]sonance\s*magn[ée]tique\b",
    ],
    "ct": [
        r"ct\s*scan", r"cat\s*scan", r"computed tomography",
        r"\b(?:و)?(?:ال)?اشعه\s*(?:و)?(?:ال)?مقطعيه\b", r"\b(?:و)?(?:ال)?تصوير\s*(?:و)?(?:ال)?مقطعي\b",
        r"\bscanner\b", r"\btomodensitom[ée]trie\b",
    ],
    "lab": [
        r"laborator\w*", r"lab\s*tests?", r"lab\s*work", r"blood\s*(?:test|work)", r"\bcbc\b", r"\besr\b", r"\bcrp\b",
        r"\b(?:و)?(?:ال)?تحاليل\s*(?:و)?(?:ال)?مخبريه\b", r"\b(?:و)?(?:ال)?فحوصات\s*(?:و)?(?:ال)?دم\b", r"\b(?:و)?(?:ال)?تحليل\s*(?:و)?(?:ال)?دم\b",
        r"\banalyses?\s*de\s*laboratoire\b", r"\banalyses?\s*sanguines?\b", r"\bbilan\s*sanguin\b",
    ],
    "us": [
        r"ultrasound", r"sonograph\w*",
        r"\b(?:و)?(?:ال)?سونار\b", r"\b(?:و)?(?:ال)?موجات\s*فوق\s*(?:و)?(?:ال)?صوتيه\b", r"\b(?:و)?(?:ال)?ايكو\b",
        r"\b[ée]chographie\b",
    ],
}

TREATMENT_SYNONYMS = {
    "surgery": [
        r"surger\w*", r"surgical", r"operat\w*",
        r"\b(?:و)?(?:ال)?جراحه\b", r"\b(?:و)?(?:ال)?عمليه\s*(?:و)?(?:ال)?جراحيه\b",
        r"\bchirurgie\b", r"\bop[ée]ration\b",
    ],
    "medication": [
        r"medication\w*", r"\bmeds\b", r"prescri\w*", r"\bmedicine\b",
        r"\b(?:و)?(?:ال)?دواء\b", r"\b(?:و)?(?:ال)?ادويه\b", r"\b(?:و)?(?:ال)?علاج\s*(?:و)?(?:ال)?دوائي\b",
        r"\bm[ée]dicament\w*\b", r"\btraitement\s*m[ée]dicamenteux\b",
    ],
    "physio": [
        r"physiotherap\w*", r"physical therap\w*", r"\bphysio\b",
        r"\b(?:و)?(?:ال)?علاج\s*(?:و)?(?:ال)?طبيعي\b", r"\b(?:و)?(?:ال)?فيزيوثيرابي\b",
        r"\bkin[ée]sith[ée]rapie\b", r"\bphysioth[ée]rapie\b",
    ],
    "injection": [
        r"injection\w*", r"corticosteroid\w*", r"\bprp\b", r"steroid shot", r"cortisone",
        r"\b(?:و)?(?:ال)?حقن\b", r"\b(?:و)?(?:ال)?حقنه\b", r"\b(?:و)?(?:ال)?ابره\s*كورتيزون\b",
        r"\binfiltration\b", r"\bcorticoth[ée]rapie\b",
    ],
    "rest": [
        r"rest\s*(?:and|&)?\s*monitor\w*", r"conservative management", r"\bjust rest\b",
        r"\b(?:و)?(?:ال)?راحه\s*(?:و)?(?:ال)?متابعه\b", r"\b(?:و)?(?:ال)?راحه\s*(?:و)?(?:ال)?مراقبه\b",
        r"\brepos\s*et\s*surveillance\b", r"\brepos\s*et\s*suivi\b",
    ],
    "rehab": [
        r"rehabilitation\w*", r"long[\s-]?term rehab\w*", r"\brehab\b",
        r"\b(?:و)?(?:ال)?اعاده\s*(?:و)?(?:ال)?تاهيل\b", r"\b(?:و)?(?:ال)?تاهيل\s*(?:و)?(?:ال)?طويل\s*(?:و)?(?:ال)?امد\b", r"\b(?:و)?(?:ال)?تاهيل\b",
        r"\br[ée][ée]ducation\b", r"\br[ée]adaptation\b",
    ],
}


# Length-preserving normalisation of common Arabic letter-form variants
# (alef-hamza forms, ta-marbuta/ha, alef-maksura/ya) so the Arabic
# alternatives in the patterns below only need to spell one canonical form
# instead of enumerating every variant. Only ever used to build the
# *haystack* passed to .search()/.finditer() — never applied to text that
# gets sliced or returned, since every substitution is one codepoint for one
# codepoint, so match offsets stay valid against the original string.
_ARABIC_NORMALIZE_MAP = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا",
    "ى": "ي",
    "ة": "ه",
})


def _normalize_arabic(text: str) -> str:
    return text.translate(_ARABIC_NORMALIZE_MAP)


# Auto-detects which of the app's 3 supported languages a transcript is in,
# from the transcript text itself — used to identify the dictation's language
# from the first few words spoken (see main.py /transcribe/preview) so the
# doctor doesn't have to pick a language up front, and so the rest of the
# recording can then be transcribed with that language forced (more accurate
# than leaving every chunk unforced/auto-detected — see run_transcription).
# Arabic is unambiguous by Unicode script. English vs French (both Latin
# script) is resolved by accented characters or common French stopwords;
# English is the default when neither signal is present.
_ARABIC_SCRIPT_PATTERN = re.compile(r"[؀-ۿ]")
_FRENCH_SIGNAL_PATTERN = re.compile(
    r"[àâäéèêëïîôöùûüÿœæç]"
    r"|\b(le|la|les|des|une|un|est|dans|avec|pour|que|qui|vous|nous|votre|nos|et|au|aux|du|ce|cette|ces|douleur|traitement)\b",
    re.I,
)


def detect_language(text: str) -> str:
    """Best-effort en/ar/fr guess from transcribed text. Falls back to "en"
    when the text is empty or carries no clear signal either way."""
    if not text or not text.strip():
        return "en"
    if _ARABIC_SCRIPT_PATTERN.search(text):
        return "ar"
    if _FRENCH_SIGNAL_PATTERN.search(text):
        return "fr"
    return "en"


def keyword_match(text: str, synonyms: dict) -> list[str]:
    """Scan text for the first occurrence of any synonym for each known id,
    returning matched ids ordered by where they were said (earliest first)."""
    haystack = _normalize_arabic(text)
    hits = []
    for id_, patterns in synonyms.items():
        for pattern in patterns:
            m = re.search(pattern, haystack, re.I)
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
# "diagnostics" don't collide with each other. Arabic/French alternatives
# merged in via `|` rather than branching by detected language — this also
# handles a doctor code-switching mid-dictation (e.g. Arabic speech with
# English medical terms), which is realistic for a bilingual clinic. Arabic
# alternatives are written in normalised form (see _normalize_arabic above);
# matched against the normalised haystack in segment_dictation() below.
_SECTION_PATTERNS = [
    ("treatment", re.compile(
        r"\btreatment\s*plan\b|\btreatment\b|\bprescri(?:be|bing|ption)\b"
        r"|\b(?:و)?(?:ال)?خطه\s*(?:و)?(?:ال)?علاج\b|\b(?:و)?(?:ال)?علاج\b|\b(?:و)?(?:ال)?وصفه\s*(?:و)?(?:ال)?طبيه\b|\bصرف\s*(?:و)?(?:ال)?دواء\b"
        r"|\bplan\s*de\s*traitement\b|\btraitement\b|\bprescription\b|\bordonnance\b",
        re.I)),
    ("diagnostics", re.compile(
        r"\bdiagnostics?\b|\border(?:ing)?\s+(?:tests?|imaging)\b|\brequest(?:ing)?\s+(?:tests?|imaging)\b|\blabs?\b|\bimaging\b"
        r"|\b(?:و)?(?:ال)?فحوصات\b|\b(?:و)?(?:ال)?تحاليل\b|\b(?:و)?(?:ال)?اشعه\b|\bطلب\s*(?:و)?(?:ال)?فحوصات\b|\b(?:و)?(?:ال)?تصوير\b"
        r"|\bexamens?\b|\banalyses?\b|\bimagerie\b|\bdemande\s*d.examens?\b",
        re.I)),
    ("evaluation", re.compile(
        r"\bdiagnosis\b|\bevaluation\b|\bassessment\b|\bfindings\b"
        r"|\b(?:و)?(?:ال)?تشخيص\b|\b(?:و)?(?:ال)?تقييم\b|\b(?:و)?(?:ال)?نتائج\b|\b(?:و)?(?:ال)?فحص\b"
        # French "diagnostic" (noun) is spelled identically to the English
        # adjective in "diagnostic tests" — the negative lookahead keeps this
        # cue for standalone French use without stealing English "diagnostic
        # tests"/"diagnostic imaging" away from the diagnostics pattern above.
        r"|\bdiagnostic\b(?!\s+(?:tests?|imaging))|\b[ée]valuation\b|\br[ée]sultats\b|\bconstatations\b",
        re.I)),
]

# Within the treatment section, "instructions"/"details" is itself a spoken
# cue (same idea as the section markers above) — the LLM doesn't reliably
# pick it up as free text every time, so capture everything said after it
# directly. Only used as a fallback when the AI left details empty.
_DETAILS_CUE_PATTERN = re.compile(
    r"\b(?:instructions?\s*(?:and|&)?\s*details?|details?|instructions?)\b\s*[:,]?\s*"
    r"|\bتعليمات\s*(?:و)?\s*تفاصيل\b\s*[:,]?\s*|\bتفاصيل\b\s*[:,]?\s*|\bتعليمات\b\s*[:,]?\s*|\bملاحظات\b\s*[:,]?\s*"
    r"|\binstructions?\s*(?:et)?\s*d[ée]tails?\b\s*[:,]?\s*|\bd[ée]tails?\b\s*[:,]?\s*",
    re.I)


def extract_details_cue(treatment_text: str) -> str:
    """Return whatever was said after the last "instructions"/"details" cue
    in the treatment section, or "" if the cue wasn't used."""
    haystack = _normalize_arabic(treatment_text)
    matches = list(_DETAILS_CUE_PATTERN.finditer(haystack))
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


# "follow-up date"/"follow up on" is itself a spoken cue, same idea as the
# details cue above — but unlike free-text details, a date said as a raw
# number sequence ("13, 12, 20, 26") is a fixed-shape value a regex can parse
# far more reliably than a small local LLM reading garbled ASR text (ASR
# commonly splits a spoken year like "twenty twenty-six" into two separate
# two-digit numbers). Deterministic parsing wins over the AI guess here, the
# same as keyword_match already does for diagnostic tests/treatment types.
_FOLLOWUP_DATE_CUE_PATTERN = re.compile(
    r"\bfollow[\s-]?up\s*(?:date|visit)?\b\s*[:,]?\s*"
    r"|\bموعد\s*المتابعه\b\s*[:,]?\s*|\bتاريخ\s*المتابعه\b\s*[:,]?\s*|\bموعد\s*المراجعه\b\s*[:,]?\s*"
    r"|\bdate\s*de\s*suivi\b\s*[:,]?\s*|\brendez[\s-]?vous\s*de\s*suivi\b\s*[:,]?\s*|\bdate\s*de\s*contr[oô]le\b\s*[:,]?\s*",
    re.I)


def _numbers_to_iso_date(numbers: list[int], today: datetime) -> str | None:
    """Reconstruct a day/month/year date from a raw sequence of spoken
    numbers. Re-merges a split year (e.g. [20, 26] -> 2026) before assigning
    the remaining one or two numbers to day/month, preferring whichever
    ordering is actually valid (a value over 12 can only be a day)."""
    nums = list(numbers)
    year = None

    if len(nums) >= 2 and 19 <= nums[-2] <= 21 and 0 <= nums[-1] <= 99:
        year = nums[-2] * 100 + nums[-1]
        nums = nums[:-2]
    elif nums and nums[-1] >= 1000:
        year = nums[-1]
        nums = nums[:-1]
    elif nums and 0 <= nums[-1] <= 99:
        year = 2000 + nums[-1]
        nums = nums[:-1]

    if year is None or not (today.year - 1 <= year <= today.year + 5):
        return None

    if len(nums) == 2:
        a, b = nums
        if 1 <= a <= 12 and 1 <= b <= 31 and b > 12:
            month, day = a, b
        elif 1 <= b <= 12 and 1 <= a <= 31:
            day, month = a, b
        else:
            return None
    elif len(nums) == 1 and 1 <= nums[0] <= 31:
        day, month = nums[0], today.month
    else:
        return None

    try:
        return datetime(year, month, day).strftime("%Y-%m-%d")
    except ValueError:
        return None


def extract_followup_date_cue(treatment_text: str, today: datetime) -> str | None:
    """Return an ISO date parsed from whatever was said after a "follow-up
    date" cue in the treatment section, or None if the cue wasn't used or
    couldn't be parsed as a date."""
    m = _FOLLOWUP_DATE_CUE_PATTERN.search(_normalize_arabic(treatment_text))
    if not m:
        return None
    tail = treatment_text[m.end():]
    cutoff = len(tail)
    details_m = _DETAILS_CUE_PATTERN.search(_normalize_arabic(tail))
    if details_m:
        cutoff = min(cutoff, details_m.start())
    period = tail.find(".")
    if period != -1:
        cutoff = min(cutoff, period)
    tail = tail[:cutoff]
    numbers = [int(n) for n in re.findall(r"\d+", tail)]
    return _numbers_to_iso_date(numbers, today)


def _apply_followup_date_fallback(treatments: list, fallback_date: str | None) -> None:
    """If the doctor used an explicit "follow-up date" cue and it parsed
    cleanly, that value overrides whatever the LLM guessed for the last
    treatment mentioned — see extract_followup_date_cue for why the
    deterministic parse is trusted over the AI here."""
    if not fallback_date or not treatments:
        return
    treatments[-1]["followUpDate"] = fallback_date


def segment_dictation(text: str) -> dict:
    """Split one continuous dictation into evaluation/diagnostics/treatment
    chunks. Anything spoken before the first marker is treated as evaluation,
    since physicians naturally lead with findings before ordering tests or
    prescribing treatment."""
    haystack = _normalize_arabic(text)
    matches = []
    for label, pattern in _SECTION_PATTERNS:
        for m in pattern.finditer(haystack):
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
  "soap": {{
    "chiefComplaint": "the patient's presenting complaint, in their own words if stated",
    "historyOfPresentIllness": "onset, duration, character, aggravating/relieving factors of the current problem",
    "pastMedicalHistory": "relevant prior conditions, surgeries, medications mentioned — empty string if none was said",
    "examination": "physical exam findings described (inspection, palpation, range of motion, special tests, etc.)",
    "assessment": "the clinical assessment / diagnosis, same content as the top-level diagnosis field",
    "plan": "the management plan in prose — may restate the diagnostic tests and treatments below in sentence form"
  }},
  "diagnostic_tests": ["<ids from the known diagnostic test ids that were mentioned>"],
  "treatments": [
    {{"type": "<id from the known treatment ids>", "duration": "<e.g. 6 weeks, or null>", "details": "<instructions mentioned>", "followUpDate": "<YYYY-MM-DD or null>"}}
  ]
}}

Rules:
- If a section wasn't mentioned at all, return an empty string/array for it
  instead of guessing.
- Write every "soap" field in clear, grammatically correct clinical English —
  the doctor is dictating out loud, so silently fix any spoken disfluency,
  filler word, or grammatical slip; never transcribe verbatim if the phrasing
  was awkward. Keep the clinical meaning exact; do not add information that
  was not said.
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


_SOAP_FIELDS = (
    "chiefComplaint", "historyOfPresentIllness", "pastMedicalHistory",
    "examination", "assessment", "plan",
)


def _clean_soap(raw) -> dict:
    """Normalises the LLM's `soap` object to always carry all 6 fields as
    plain strings, regardless of whether the model included every key."""
    raw = raw if isinstance(raw, dict) else {}
    return {field: _clean_str(raw.get(field)) for field in _SOAP_FIELDS}


def call_openai_extract(prompt: str) -> dict | None:
    try:
        resp = _openai_client.chat.completions.create(
            model=OPENAI_EXTRACT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
        )
        raw = resp.choices[0].message.content or ""
        return json.loads(raw)
    except Exception as e:
        print(f"⚠️ OpenAI extraction unavailable, falling back to plain text ({e})")
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
    today = datetime.utcnow()
    sections = segment_dictation(transcript)
    keyword_tests = keyword_match(sections["diagnostics"], DIAGNOSTIC_TEST_SYNONYMS)
    keyword_treatment_types = keyword_match(sections["treatment"], TREATMENT_SYNONYMS)
    fallback_details = extract_details_cue(sections["treatment"])
    fallback_followup_date = extract_followup_date_cue(sections["treatment"], today)

    if not transcript.strip():
        return {
            "diagnosis": "", "notes": "", "soap": _clean_soap(None),
            "diagnostic_tests": [], "treatments": [],
            "sections": sections, "ai_structured": False,
        }

    parsed = call_openai_extract(_build_prompt(transcript, sections))

    if parsed is None:
        # Extraction call failed: still honor the keyword-matched
        # tests/treatments so voice selection works even with the API down —
        # just without an AI-written diagnosis/notes/soap/duration/follow-up
        # date. The one soap field a deterministic fallback CAN populate is
        # historyOfPresentIllness, from the same "evaluation" chunk `notes`
        # already falls back to below — better than leaving it blank.
        treatments = [
            {"type": t, "duration": "", "details": "", "followUpDate": None}
            for t in keyword_treatment_types
        ]
        _apply_details_fallback(treatments, fallback_details)
        _apply_followup_date_fallback(treatments, fallback_followup_date)
        fallback_soap = _clean_soap(None)
        fallback_soap["historyOfPresentIllness"] = sections["evaluation"]
        return {
            "diagnosis": "",
            "notes": sections["evaluation"] or transcript,
            "soap": fallback_soap,
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
    _apply_followup_date_fallback(treatments, fallback_followup_date)

    return {
        "diagnosis": _clean_str(parsed.get("diagnosis")),
        "notes": _clean_str(parsed.get("notes")) or sections["evaluation"],
        "soap": _clean_soap(parsed.get("soap")),
        "diagnostic_tests": diagnostic_tests,
        "treatments": treatments,
        "sections": sections,
        "ai_structured": True,
    }
