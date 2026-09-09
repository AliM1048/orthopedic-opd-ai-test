# One-Take Visit Dictation Setup

The "Record Full Visit" button on the Physician Evaluation page lets a doctor
dictate diagnosis, diagnostic tests, and treatment plan in a single recording.
This needs two things running locally:

## 1. OpenAI transcription API

Transcription runs through OpenAI's API rather than a local model, so audio
leaves the machine for this call and an API key + billing is required.
Configure via `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

Get a key at https://platform.openai.com/api-keys. The live-caption preview
(`/transcribe/preview`) fires an API call roughly every 4 seconds while the
doctor is recording (see `PREVIEW_INTERVAL_MS` in `useDictation.js`), on top
of the final transcription call — factor that into API cost expectations.

## 2. OpenAI structured extraction (turns the transcript into structured fields)

This maps free speech onto the app's diagnosis/diagnostic-test/treatment
fields and resolves spoken dates ("in two weeks") to real dates. It runs
through the same OpenAI API/key as transcription above (chat completions,
JSON mode) — no separate service to install or keep running.

Configure via `.env` (optional — defaults to `gpt-4o-mini` if unset):

```
OPENAI_EXTRACT_MODEL=gpt-4o-mini
```

`gpt-4o-mini` is fast (typically 1-3s per extraction) and inexpensive — well
under $0.001 per visit note at this prompt's size, negligible next to the
transcription cost above.

If the extraction call fails (network issue, bad key, rate limit), dictation
still works — the transcript is dropped into Clinical Notes as plain text,
and the doctor fills diagnostic tests / treatment plan manually instead of
having them auto-filled.

## Spoken section markers

The doctor doesn't need to touch the screen between sections — just say the
cue word and keep talking:

- **"Diagnosis…" / "Evaluation…" / "Findings…"** — diagnosis + clinical notes
- **"Diagnostics…" / "Order tests…" / "Labs…" / "Imaging…"** — diagnostic tests
- **"Treatment plan…" / "Treatment…" / "Prescribing…"** — treatment plan

Anything said before the first cue is treated as part of the evaluation,
since doctors naturally lead with findings.
