"""Mix a voice-over + SFX cues exactly as the composition places them.
usage: python3 scripts/mix.py <cues.json> <voice.mp3> <frames> <out.m4a> [fps]"""
import json, subprocess, sys
import numpy as np
cues_path, vo, frames, out_path = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
FPS = int(sys.argv[5]) if len(sys.argv) > 5 else 30
SR = 48000
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
out = np.zeros((int(SR * frames / FPS), 2), dtype=np.float32)
def place(buf, at, vol):
    s = int(round(at / FPS * SR)); n = min(len(buf), len(out) - s)
    if n > 0: out[s:s + n] += buf[:n] * vol
cache = {}
for c in json.load(open(cues_path)):
    f = c["file"]
    if f not in cache: cache[f] = load(f"public/sfx/{f}.wav")
    place(cache[f], c["at"], c["vol"])
place(load(vo), 0, 1.0)
peak = float(np.abs(out).max()); print("peak", peak)
if peak > 0.98: out *= 0.98 / peak
pcm = (out * 32767).astype(np.int16).tobytes()
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "aac", "-b:a", "192k", out_path], input=pcm, check=True)
print("ok")
