"""Mix VO + SFX cues exactly as the Remotion composition places them (30 fps)."""
import json, subprocess, sys
import numpy as np
SR = 48000; FPS = 30; DUR = 504
def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
out = np.zeros((int(SR * DUR / FPS), 2), dtype=np.float32)
def place(buf, at, vol):
    s = int(round(at / FPS * SR)); n = min(len(buf), len(out) - s)
    if n > 0: out[s:s + n] += buf[:n] * vol
cache = {}
for c in json.load(open(sys.argv[1])):
    f = c["file"]
    if f not in cache: cache[f] = load(f"public/sfx/{f}.wav")
    place(cache[f], c["at"], c["vol"])
place(load("public/vo/vo2.mp3"), 0, 1.0)
peak = np.abs(out).max(); print("peak", peak)
if peak > 0.98: out *= 0.98 / peak
pcm = (out * 32767).astype(np.int16).tobytes()
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "aac", "-b:a", "192k", sys.argv[2]], input=pcm, check=True)
print("ok")
