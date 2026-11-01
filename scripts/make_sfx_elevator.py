"""SFX for ELEVATOR SURVIVAL: muzak bed, alarm beep, mystery toot, whistle, sniff."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100; OUT = sys.argv[1]; rng = np.random.default_rng(13)
def filt(x, kind, fc):
    b, a = butter(2, np.array(fc) / (SR / 2), kind); return lfilter(b, a, x)
def save(name, x, gain):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))
def hz(n): return 440 * 2 ** ((n - 69) / 12)
# muzak: soft electric-piano bossa, Cmaj7 Am7 Dm7 G7, 67 s
DUR = 67.0; N = int(SR * DUR); out = np.zeros(N); beat = 60 / 96
def ep(note, t0, dur, amp):
    n = int(SR * dur); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * hz(note) * t) + 0.3 * np.sin(2 * np.pi * hz(note) * 2 * t) * np.exp(-t * 6)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.005)
    s = int(SR * t0); e = min(N, s + n)
    if e > s: out[s:e] += (x * amp)[: e - s]
chords = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]]
bass = [36, 33, 38, 31]
t = 0.0; bar = 0
while t < DUR - 1:
    ch = chords[bar % 4]
    for b, off in enumerate([0, 1.5, 2.5, 3.0]):
        for nn in ch: ep(nn, t + off * beat, beat * 1.2, 0.12)
    ep(bass[bar % 4], t, beat * 1.5, 0.35)
    ep(bass[bar % 4] + 7, t + 2 * beat, beat * 1.2, 0.25)
    mel = [ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12]
    for i, m in enumerate(mel): ep(m, t + i * beat, beat * 0.9, 0.08)
    t += 4 * beat; bar += 1
out = filt(out, "low", 4500) * np.minimum(1, np.arange(N) / SR / 1.0) * np.minimum(1, (DUR - np.arange(N) / SR) / 2)
save("muzak", out, 0.6)
# beep: alarm blip
tt = np.arange(int(SR * 0.16)) / SR
save("beep", np.sign(np.sin(2 * np.pi * 1320 * tt)) * 0.4 * np.minimum(1, (0.16 - tt) / 0.03), 0.45)
# mystery: a low comic brass "toot" with a wobble (kept short, cartoonish)
tt = np.arange(int(SR * 0.9)) / SR
f = 92 + 18 * np.sin(2 * np.pi * 11 * tt) * (1 - tt / 0.9) - 25 * tt
ph = 2 * np.pi * np.cumsum(f) / SR
x = sum(np.sin(k * ph) / k ** 0.7 for k in range(1, 12))
x = filt(x, "low", 1400) * np.minimum(1, tt / 0.02) * (1 - tt / 0.9) ** 0.6
save("mystery", x, 0.8)
# whistle: innocent two-note whistle tune
tt = np.arange(int(SR * 1.4)) / SR
notes = [(0.0, 84), (0.25, 81), (0.5, 84), (0.75, 88), (1.0, 86)]
w = np.zeros_like(tt)
for t0, m in notes:
    seg = (tt >= t0) & (tt < t0 + 0.24)
    w[seg] = np.sin(2 * np.pi * hz(m) * (1 + 0.006 * np.sin(2 * np.pi * 6 * tt[seg])) * tt[seg])
w += 0.08 * filt(rng.standard_normal(tt.size), "band", [2000, 6000]) * (w != 0)
save("whistle", w, 0.45)
# sniff: three quick inhales
tt = np.arange(int(SR * 0.9)) / SR
sn = np.zeros_like(tt)
for t0 in (0.0, 0.25, 0.5):
    seg = (tt >= t0) & (tt < t0 + 0.18)
    sn[seg] = filt(rng.standard_normal(seg.sum()), "band", [800, 4000]) * np.sin(np.pi * (tt[seg] - t0) / 0.18)
save("sniff", sn, 0.6)
print("ok")
