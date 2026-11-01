"""Horror-chase SFX: drone, buzz, heart, step, clunk, stinger, rise, boom."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100; OUT = sys.argv[1]; rng = np.random.default_rng(23)
t = lambda d: np.linspace(0, d, int(SR * d), endpoint=False)
def filt(x, kind, fc):
    b, a = butter(2, np.array(fc) / (SR / 2), kind); return lfilter(b, a, x)
def save(name, x, gain):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))
# drone: detuned low pad, slow swell, 15s
tt = t(15.0)
d = sum(np.sin(2*np.pi*f*tt + p) for f, p in [(55, 0), (55.4, 1), (82.4, 2), (110.7, .5)])
d += 0.6 * filt(rng.standard_normal(tt.size), "low", 220)
d *= (0.55 + 0.45 * np.minimum(1, tt / 11)) * np.minimum(1, tt / 1.5) * np.minimum(1, (15 - tt) / 1.0)
save("drone", d, 0.5)
# buzz: sodium lamp hum with crackle, 1.6s
tt = t(1.6)
b = 0.5*np.sign(np.sin(2*np.pi*100*tt)) * 0.3 + np.sin(2*np.pi*200*tt)*0.4
crack = (rng.random(tt.size) > 0.9993) * rng.standard_normal(tt.size) * 3
b = filt(b + filt(crack, "high", 2000), "band", [90, 3000]) * np.minimum(1, (1.6 - tt) / 0.5)
save("buzz", b, 0.35)
# heart: lub-dub
tt = t(0.45)
def thump(off, amp):
    x = np.zeros_like(tt); m = tt >= off; tl = tt[m] - off
    x[m] = amp * np.sin(2*np.pi*(55 - 20*tl)*tl) * np.exp(-tl * 22); return x
save("heart", thump(0, 1) + thump(0.16, 0.7), 0.85)
# step: soft shoe on concrete
tt = t(0.12)
s = filt(rng.standard_normal(tt.size), "band", [120, 1800]) * np.exp(-tt * 55)
s += 0.6*np.sin(2*np.pi*90*tt) * np.exp(-tt * 40)
save("step", s, 0.7)
# clunk: relay click + dying hum
tt = t(0.6)
c = filt(rng.standard_normal(tt.size), "band", [600, 5000]) * np.exp(-tt * 80)
c += 0.5*np.sin(2*np.pi*100*tt) * np.exp(-tt * 6) * (tt < 0.5)
save("clunk", c, 0.7)
# stinger: dissonant cluster hit + noise burst
tt = t(2.2)
st = sum(np.sin(2*np.pi*f*tt) for f in (233, 246.9, 349.2, 466, 493.9)) * np.exp(-tt * 1.6)
st += 1.5 * filt(rng.standard_normal(tt.size), "band", [200, 4000]) * np.exp(-tt * 9)
st += 1.2 * np.sin(2*np.pi*(45*np.exp(-tt*0.8))*tt) * np.exp(-tt * 2)
save("stinger", st, 0.9)
# rise: wind whoosh swelling upward 1.6s
tt = t(1.6)
n = rng.standard_normal(tt.size); r = np.zeros_like(n); seg = 2048
for i in range(0, n.size, seg):
    p = i / n.size; fc = 300 + 2500 * p
    r[i:i+seg] = filt(n[i:i+seg], "band", [fc * 0.5, fc * 1.4])
save("rise", r * np.sin(np.pi * np.minimum(1, tt / 1.6)) ** 1.2, 0.6)
# boom: sub drop
tt = t(2.5)
bm = np.sin(2*np.pi*np.cumsum(40*np.exp(-tt*0.9) + 22)/SR) * np.exp(-tt * 1.3)
bm += 0.8 * filt(rng.standard_normal(tt.size), "low", 150) * np.exp(-tt * 2.5)
save("boom", bm, 0.95)
print("ok")
