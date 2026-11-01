"""Extra SFX for EarthStop: screech, rumble, wind, stamp."""
import sys, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100; OUT = sys.argv[1]; rng = np.random.default_rng(11)
t = lambda d: np.linspace(0, d, int(SR * d), endpoint=False)
def filt(x, kind, fc):
    b, a = butter(2, np.array(fc) / (SR / 2), kind); return lfilter(b, a, x)
def save(name, x, gain):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name), SR, (x * 32767).astype(np.int16))
# screech: squealing brake, pitch wobble + noise, fade
tt = t(0.9)
f = 2300 + 250 * np.sin(2 * np.pi * 13 * tt) - 500 * tt
sq = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR)
sq += 0.5 * filt(rng.standard_normal(tt.size), "band", [1800, 5000])
e = np.minimum(1, tt / 0.03) * (1 - tt / 0.9) ** 1.4
save("screech.wav", sq * e, 0.35)
# rumble: deep impact boom
tt = t(1.4)
f = 60 * np.exp(-2 * tt) + 32
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) + filt(rng.standard_normal(tt.size), "low", 180) * 1.5
save("rumble.wav", boom * np.exp(-2.6 * tt) * np.minimum(1, tt / 0.01), 0.9)
# wind: gusty band noise, 4.2s with fade in/out
tt = t(4.2)
n = rng.standard_normal(tt.size)
w = filt(n, "band", [250, 1400]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt) * np.sin(2 * np.pi * 1.9 * tt + 1))
w += 0.4 * filt(n, "band", [1500, 3500]) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.6 * tt))
e = np.minimum(1, tt / 0.25) * np.minimum(1, (4.2 - tt) / 0.6)
save("wind.wav", w * e, 0.5)
# stamp: punchy hit for the X on the ticket
tt = t(0.3)
st = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-12 * tt) + 70) / SR) * np.exp(-14 * tt)
st += 0.6 * filt(rng.standard_normal(tt.size), "low", 2500) * np.exp(-40 * tt)
save("stamp.wav", st, 0.9)
print("ok")
