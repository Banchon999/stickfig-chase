"""Transcribe a voice-over with word timestamps (faster-whisper) and print JSON to the log."""
import json, sys
from faster_whisper import WhisperModel

path, model_name = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "large-v3"
model = WhisperModel(model_name, device="cpu", compute_type="int8")
segs, info = model.transcribe(path, language="th", word_timestamps=True, vad_filter=False, beam_size=5)
out = []
for s in segs:
    out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                "words": [[round(w.start, 2), round(w.end, 2), w.word] for w in (s.words or [])]})
    print(f"SEG {s.start:7.2f}-{s.end:7.2f} | {s.text.strip()}", flush=True)
print("JSON_BEGIN")
print(json.dumps(out, ensure_ascii=False))
print("JSON_END")
