"""
Generates a short, plain-language summary of a single visit report for the
patient themselves — shown in the mobile app and exportable as a PDF there.
Reuses the same OpenAI client/model as llm_extract.py's dictation-to-SOAP-note
pipeline for consistency (no second client, no separate model env var).

Triggered once, at the moment a doctor/surgeon marks a report "sent to
patient" (see routers/evaluations.py / routers/surgery_evaluations.py), and
the result is stored on that same row — never regenerated silently, so what
the patient reads always matches what was true right when their doctor sent
it, even if the underlying evaluation is edited later.
"""
from llm_extract import _openai_client, OPENAI_EXTRACT_MODEL

_PROMPT_TEMPLATE = """You are writing a short, plain-language summary of an orthopedic clinic visit
for the PATIENT themselves to read in their patient portal app. Use ONLY the
clinical information given below — never invent, assume, or add any detail,
test result, medication, or instruction that isn't explicitly stated. If a
section below says "(not recorded)", simply don't mention it; do not guess
what it might have said.

Write directly to the patient ("you"/"your"), in warm, clear, non-alarming
language a non-medical person can understand. Briefly explain any clinical
term you must use. 3 to 5 sentences, one paragraph, no headings, no bullet
points, no markdown.

Provider: {provider_label}
Visit date: {date}
Diagnosis on file: {diagnosis}
Assessment: {assessment}
Plan: {plan}
"""


def generate_patient_summary(
    provider_label: str, date: str, diagnosis: str | None,
    assessment: str | None, plan: str | None,
) -> str | None:
    """Best-effort — returns None (never raises) if the OpenAI call fails, so
    a flaky API never blocks the "Send to Patient" action itself."""
    prompt = _PROMPT_TEMPLATE.format(
        provider_label=provider_label, date=date,
        diagnosis=diagnosis or "(not recorded)",
        assessment=assessment or "(not recorded)",
        plan=plan or "(not recorded)",
    )
    try:
        resp = _openai_client.chat.completions.create(
            model=OPENAI_EXTRACT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or None
    except Exception as e:
        print(f"⚠️ Patient summary generation unavailable ({e})")
        return None
