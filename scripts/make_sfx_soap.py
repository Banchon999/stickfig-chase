"""SFX for the soap manual: march bed, dun-dun brass, squeak, plop, clang, fanfare."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100; OUT = sys.argv[1]; rng = np.random.default_rng(9)
def filt(x, kind, fc):
    b, a = butter(2, np.array(fc) / (SR / 2), kind); return lfilter(b, a, x)
def save(name, x, gain):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def brass(note, dur, amp=1.0):
    t = np.arange(int(SR * dur)) / SR
    f = hz(note) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 9))
    env = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.08)
    return filt(x * env * amp, "low", 3500)
# march bed: snare pattern + low brass ostinato, 72 s
DUR = 72.0; N = int(SR * DUR); bed = np.zeros(N); beat = 60 / 112
def place(x, t):
    s = int(SR * t); e = min(N, s + len(x))
    if e > s: bed[s:e] += x[: e - s]
snare = filt(rng.standard_normal(int(SR * 0.12)), "band", [1500, 7000]) * np.exp(-np.arange(int(SR * 0.12)) / SR * 35)
kick = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-np.arange(int(SR * 0.2)) / SR * 20) + 45) / SR) * np.exp(-np.arange(int(SR * 0.2)) / SR * 14)
t = 0.0; i = 0
notes = [43, 43, 50, 43, 41, 41, 48, 41]
while t < DUR - 1:
    if i % 2 == 0: place(kick * 0.9, t)
    place(snare * (0.55 if i % 2 else 0.3), t)
    if i % 4 == 3: place(snare * 0.25, t + beat / 2)
    place(brass(notes[(i // 2) % 8], beat * 0.9, 0.18), t)
    t += beat; i += 1
bed *= np.minimum(1, np.arange(N) / SR / 1.5) * np.minimum(1, (DUR - np.arange(N) / SR) / 2)
save("march", bed, 0.6)
# dun-dun: two dramatic brass hits
d = np.concatenate([brass(46, 0.35), np.zeros(int(SR * 0.08)), brass(45, 0.9)])
save("dundun", d + 0.6 * np.concatenate([brass(34, 0.35), np.zeros(int(SR * 0.08)), brass(33, 0.9)]), 0.8)
# squeak: wet slip
tt = np.arange(int(SR * 0.35)) / SR
f = 1800 + 900 * np.sin(2 * np.pi * 7 * tt)
sq = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.35) ** 0.6
save("squeak", sq, 0.35)
# plop: soap hits the wet floor
tt = np.arange(int(SR * 0.4)) / SR
pl = np.sin(2 * np.pi * np.cumsum(300 * np.exp(-tt * 18) + 140) / SR) * np.exp(-tt * 14) + 0.5 * filt(rng.standard_normal(tt.size), "band", [600, 3000]) * np.exp(-tt * 40)
save("plop", pl, 0.8)
# clang: metal bin lid
tt = np.arange(int(SR * 1.0)) / SR
cl = sum(np.sin(2 * np.pi * fr * tt) * np.exp(-tt * dk) for fr, dk in [(523, 5), (1187, 7), (1730, 9), (2610, 12)])
cl += filt(rng.standard_normal(tt.size), "high", 3000) * np.exp(-tt * 60)
save("clang", cl, 0.6)
# fanfare: heroic triad rise
fan = np.concatenate([brass(55, 0.22), brass(60, 0.22), brass(64, 0.22), brass(67, 1.2)])
fan2 = np.concatenate([brass(48, 0.22), brass(52, 0.22), brass(55, 0.22), brass(60, 1.2)])
save("fanfare", fan + 0.7 * fan2, 0.8)
print("ok")
