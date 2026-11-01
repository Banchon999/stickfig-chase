"""Procedurally generate cartoon SFX as WAV files (no sound library needed)."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, a=0.005, r=None, curve=4.0):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    tail = np.linspace(1, 0, n - na) ** curve
    e[na:] = tail
    return e


def lp(x, fc):
    b, a = butter(2, fc / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, fc):
    b, a = butter(2, fc / (SR / 2), "high")
    return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def save(name, x, gain=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name), SR, (x * 32767).astype(np.int16))


# pop: quick upward pitch blip (text / character appear)
tt = t(0.12)
f = np.linspace(380, 1300, tt.size)
pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(tt.size, 0.002, curve=3)
save("pop.wav", pop, 0.7)

# tick: clock tick
tt = t(0.05)
tick = bp(rng.standard_normal(tt.size), 2500, 6000) * env(tt.size, 0.0005, curve=8)
tick += 0.4 * np.sin(2 * np.pi * 1800 * tt) * env(tt.size, 0.0005, curve=10)
save("tick.wav", tick, 0.5)

# whoosh: filtered noise swell
tt = t(0.55)
n = rng.standard_normal(tt.size)
sweep = np.zeros_like(n)
seg = 2048
for i in range(0, n.size, seg):
    p = i / n.size
    fc = 300 + 2500 * np.sin(np.pi * p)
    sweep[i:i + seg] = bp(n[i:i + seg], max(120, fc * 0.5), fc * 1.6)
shape = np.sin(np.pi * np.linspace(0, 1, tt.size)) ** 1.5
save("whoosh.wav", sweep * shape, 0.6)

# boing (comedic wobble)
tt = t(0.6)
f = 220 + 120 * np.sin(2 * np.pi * 9 * tt) * np.exp(-3 * tt) + 80 * np.exp(-6 * tt)
boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(tt.size, 0.003, curve=2.2)
save("boing.wav", boing, 0.55)

# thud: body hitting floor
tt = t(0.45)
f = 110 * np.exp(-5 * tt) + 45
body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(tt.size, 0.001, curve=3)
crack = lp(rng.standard_normal(tt.size), 900) * env(tt.size, 0.0005, curve=14)
save("thud.wav", body + 0.7 * crack, 0.95)

# sip / slurp (coffee)
tt = t(0.35)
n = bp(rng.standard_normal(tt.size), 900, 3500)
mod = 0.5 + 0.5 * np.sin(2 * np.pi * 22 * tt)
save("sip.wav", n * mod * np.sin(np.pi * np.linspace(0, 1, tt.size)), 0.35)

# yawn-ish low hum glide (cartoon)
tt = t(0.9)
f = np.interp(tt, [0, 0.35, 0.9], [180, 260, 120])
y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
y = lp(y, 1200) * np.sin(np.pi * np.linspace(0, 1, tt.size)) ** 0.8
save("yawn.wav", y, 0.4)

# eerie shimmer (hallucination)
tt = t(1.6)
sh = sum(np.sin(2 * np.pi * fr * tt + ph) for fr, ph in [(660, 0), (663.5, 1), (990, 2), (1320.7, 3)])
sh *= (0.5 + 0.5 * np.sin(2 * np.pi * 5 * tt)) * np.sin(np.pi * np.linspace(0, 1, tt.size))
save("eerie.wav", sh, 0.3)

# ding (end card)
tt = t(1.0)
d = sum(a * np.sin(2 * np.pi * fr * tt) for fr, a in [(1046.5, 1), (2093, 0.4), (3140, 0.15)])
save("ding.wav", d * env(tt.size, 0.002, curve=3), 0.55)

# snore z
tt = t(0.8)
f = np.interp(tt, [0, 0.8], [95, 70])
sn = lp(rng.standard_normal(tt.size), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR))
save("snore.wav", sn * np.sin(np.pi * np.linspace(0, 1, tt.size)), 0.35)

print("ok", sorted(os.listdir(OUT)))
