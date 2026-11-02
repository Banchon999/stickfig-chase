"""SFX for THE TOILET SURVIVAL GUIDE: documentary bed, flush, lid clack, door creak, splash, tap, scrub, gurgle."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100; OUT = sys.argv[1]; DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 192.0
rng = np.random.default_rng(21)
def filt(x, kind, fc):
    b, a = butter(2, np.array(fc) / (SR / 2), kind); return lfilter(b, a, x)
def save(name, x, gain):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def env(n, a=0.01, r=0.1):
    t = np.arange(n) / SR; d = n / SR
    return np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
# --- documentary bed: low string pad (Dm - Bb - Gm - A) + sneaky pizzicato, 100 bpm
N = int(SR * DUR); out = np.zeros(N); beat = 0.6
def add(x, t0, amp):
    s = int(SR * t0); e = min(N, s + x.size)
    if e > s: out[s:e] += x[: e - s] * amp
def pad(notes, dur):
    n = int(SR * dur); t = np.arange(n) / SR
    x = sum(sum(np.sin(2 * np.pi * hz(m) * (1 + d) * t) for d in (-0.003, 0, 0.003)) for m in notes)
    return x * np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.8)
def pizz(m, dur=0.25):
    n = int(SR * dur); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * hz(m) * t) + 0.4 * np.sin(4 * np.pi * hz(m) * t)) * np.exp(-t * 14)
chords = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]
roots = [38, 34, 31, 33]
riff = [0, None, 3, None, 5, 3, 0, None]
t = 0.0; bar = 0
while t < DUR - 2:
    ch = chords[bar % 4]
    add(pad(ch, beat * 4 + 0.8), t, 0.05)
    for i, r in enumerate(riff):
        if r is not None: add(pizz(roots[bar % 4] + 12 + r), t + i * beat / 2, 0.16)
    t += beat * 4; bar += 1
out = filt(out, "low", 3000) * np.minimum(1, np.arange(N) / SR / 1.5) * np.minimum(1, (DUR - np.arange(N) / SR) / 2.5)
save("docbed", out, 0.55)
# --- flush: roar of water + descending gurgle
n = int(SR * 2.2); tt = np.arange(n) / SR
roar = filt(rng.standard_normal(n), "band", [300, 3000]) * np.exp(-((tt - 0.6) ** 2) / 0.35)
gl = np.sin(2 * np.pi * np.cumsum(260 - 140 * tt + 40 * np.sin(2 * np.pi * 9 * tt)) / SR) * np.exp(-((tt - 1.3) ** 2) / 0.2) * 0.4
save("flush", (roar + gl) * env(n, 0.05, 0.4), 0.7)
# --- lid: plastic clack
n = int(SR * 0.25); tt = np.arange(n) / SR
save("lid", (filt(rng.standard_normal(n), "band", [900, 4000]) * np.exp(-tt * 40) + np.sin(2 * np.pi * 420 * tt) * np.exp(-tt * 30)), 0.6)
# --- creak: slow squeaky door hinge
n = int(SR * 1.1); tt = np.arange(n) / SR
fr = 520 + 180 * np.sin(2 * np.pi * 0.9 * tt) + 30 * rng.standard_normal(n).cumsum() / 400
cr = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * tt))
save("creak", filt(cr, "band", [400, 2500]) * env(n, 0.05, 0.2), 0.4)
# --- splash
n = int(SR * 0.8); tt = np.arange(n) / SR
save("splash", filt(rng.standard_normal(n), "band", [500, 6000]) * np.exp(-tt * 6) * env(n, 0.005, 0.1), 0.6)
# --- tap: running water loop 4 s
n = int(SR * 4); tt = np.arange(n) / SR
w = filt(rng.standard_normal(n), "band", [1500, 7000]) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * tt) * np.sin(2 * np.pi * 0.7 * tt))
save("tap", w * env(n, 0.2, 0.4), 0.35)
# --- scrub: soapy rub, rhythmic
n = int(SR * 3); tt = np.arange(n) / SR
save("scrub", filt(rng.standard_normal(n), "band", [600, 3500]) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * tt)) ** 2 * env(n, 0.1, 0.3), 0.35)
# --- gurgle: blocked pipe
n = int(SR * 1.4); tt = np.arange(n) / SR
bl = np.zeros(n)
for k in range(9):
    t0 = rng.uniform(0, 1.2); m = (tt >= t0) & (tt < t0 + 0.12); u = tt[m] - t0
    bl[m] += np.sin(2 * np.pi * (180 + 600 * u) * u) * np.sin(np.pi * u / 0.12)
save("gurgle", filt(bl, "low", 1500), 0.55)
print("ok")
