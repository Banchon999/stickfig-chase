"""Score + SFX for 'Boundaries': soft piano/pad bed (Am → C at 77.4 s), fadeout, shimmer."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100; OUT = sys.argv[1]; rng = np.random.default_rng(5)
def filt(x, kind, fc):
    b, a = butter(2, np.array(fc) / (SR / 2), kind); return lfilter(b, a, x)
def save(name, x, gain):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))
def hz(n): return 440 * 2 ** ((n - 69) / 12)
DUR = 99.0; N = int(SR * DUR); out = np.zeros(N)
BAR = 60 / 72 * 4  # 3.33 s
def piano(note, start, length=2.2, vel=1.0):
    n = int(SR * length); t = np.arange(n) / SR; f = hz(note)
    tone = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in [(1, 1), (2, 0.45), (3, 0.18), (4, 0.08)])
    env = np.minimum(1, t / 0.008) * np.exp(-t * 2.2)
    s = int(SR * start)
    e = min(N, s + n)
    if e > s:
        out[s:e] += (tone * env * vel)[: e - s]
def pad(notes, start, length):
    n = int(SR * length); t = np.arange(n) / SR
    tone = sum(np.sin(2 * np.pi * hz(m) * t + d) + 0.5 * np.sin(2 * np.pi * hz(m) * 1.003 * t) for m, d in zip(notes, [0, 1, 2, 3]))
    env = np.minimum(1, t / 1.2) * np.minimum(1, (length - t) / 1.2)
    s = int(SR * start); e = min(N, s + n)
    if e > s:
        out[s:e] += (tone * env * 0.08)[: e - s]
minor = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
major = [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]]   # C G Am F
t = 0.0; bar = 0
while t < DUR - 1:
    prog = major if t >= 77.4 else minor
    ch = prog[bar % 4]
    pad([n - 12 for n in ch], t, BAR + 0.6)
    # gentle arpeggio, quieter in the middle (greyest part), brighter at the end
    vel = 0.55 if t < 36 else (0.4 if t < 77 else 0.7)
    for i, nn in enumerate([ch[0], ch[1], ch[2], ch[1] + 12 if t >= 77.4 else ch[1]]):
        piano(nn + 12, t + i * BAR / 4, vel=vel)
    piano(ch[0] - 12, t, length=3.0, vel=0.5)
    t += BAR; bar += 1
out = filt(out, "low", 5000)
out *= np.minimum(1, np.arange(N) / SR / 2.0) * np.minimum(1, (DUR - np.arange(N) / SR) / 2.5)
save("bed", out, 0.6)
# fadeout: an item drains away — soft descending glide + airy noise
tt = np.arange(int(SR * 1.1)) / SR
f = 880 * np.exp(-tt * 1.6)
fo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.5) + 0.3 * filt(rng.standard_normal(tt.size), "band", [1500, 6000]) * np.exp(-tt * 4)
save("fadeout", fo, 0.5)
# shimmer: rising sparkle for the boundary line
tt = np.arange(int(SR * 1.8)) / SR
sh = sum(np.sin(2 * np.pi * (hz(m) * (1 + 0.15 * tt)) * tt) * np.exp(-((tt - 0.25 * i) ** 2) * 6) for i, m in enumerate([76, 79, 83, 88, 91]))
sh *= np.minimum(1, tt / 0.05)
save("shimmer", sh, 0.5)
print("ok")
