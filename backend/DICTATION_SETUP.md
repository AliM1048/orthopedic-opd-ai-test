# One-Take Visit Dictation Setup

The "Record Full Visit" button on the Physician Evaluation page lets a doctor
dictate diagnosis, diagnostic tests, and treatment plan in a single recording.
This needs two things running locally:

## 1. faster-whisper (transcription)

Already in `requirements.txt` — no extra setup. Configure via `.env` if needed:

```
WHISPER_MODEL_SIZE=base   # tiny/base/small/medium/large-v3
WHISPER_COMPUTE_TYPE=int8 # int8 for CPU; float16 if you have a CUDA GPU
WHISPER_DEVICE=cpu        # or "cuda"
```

`small` or `medium` give noticeably cleaner transcripts than `base` at the
cost of speed — worth trying if accuracy matters more than turnaround time.

## 2. Ollama (turns the transcript into structured fields)

This maps free speech onto the app's diagnosis/diagnostic-test/treatment
fields and resolves spoken dates ("in two weeks") to real dates.

1. Install Ollama: https://ollama.com/download
2. Pull a model:
   ```bash
   ollama pull mistral
   ```
3. Make sure Ollama is running (it runs as a background service after install,
   or start it manually with `ollama serve`).
4. Configure in `.env` if you used a different model or host:
   ```
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=mistral
   ```

**Model choice matters a lot for turnaround time, and not just by parameter
count.** On this project's dev machine (RTX 4060, 8GB VRAM), `mistral` (7B)
generated at ~45 tokens/sec (~7s per extraction) while `llama3:latest` (8B,
Q4_0 quant) ran at only ~5.5 tokens/sec (~25-45s) despite reportedly fitting
fully in VRAM — and `qwen2.5:14b` was slower still (~3.6 tokens/sec, ~110s)
since it doesn't fit in 8GB and partially falls back to CPU. If structured
extraction feels slow, run a quick benchmark before assuming the GPU is the
bottleneck — pull whichever model and check `ollama ps` while it's generating
to see GPU vs CPU layer split, and try `mistral` or another `Q4_K_M`-quantized
model if a "should be fast" model is unexpectedly slow.

If Ollama isn't reachable, dictation still works — the transcript is dropped
into Clinical Notes as plain text, and the doctor fills diagnostic tests /
treatment plan manually instead of having them auto-filled.

## Spoken section markers

The doctor doesn't need to touch the screen between sections — just say the
cue word and keep talking:

- **"Diagnosis…" / "Evaluation…" / "Findings…"** — diagnosis + clinical notes
- **"Diagnostics…" / "Order tests…" / "Labs…" / "Imaging…"** — diagnostic tests
- **"Treatment plan…" / "Treatment…" / "Prescribing…"** — treatment plan

Anything said before the first cue is treated as part of the evaluation,
since doctors naturally lead with findings.
