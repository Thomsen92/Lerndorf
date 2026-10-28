"""Builds the three almanac sounds (own synthesis, no samples, CC0; see blender/sources/LICENSES.md).

- mystery.mp3   a card is being drawn: a low shimmering swell with a rising whistle (~1.8 s)
- card-flip.mp3 a new card turns over: whoosh, impact and a sparkling chime (~1.6 s)
- giggle.mp3    the giant almanac on the horizon is tapped: a creepy witch-like cackle (~1.7 s)

Run: python3 web/scripts/audio/make-almanac-sounds.py   (needs numpy, scipy and ffmpeg)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

RATE = 44100
OUT = Path(__file__).resolve().parents[2] / 'public/assets/audio/sfx'
rng = np.random.default_rng(1031)


def seconds(n: float) -> np.ndarray:
    return np.arange(int(n * RATE)) / RATE


def band(x: np.ndarray, low: float, high: float, order: int = 2) -> np.ndarray:
    sos = butter(order, [low, high], btype='band', fs=RATE, output='sos')
    return sosfilt(sos, x)


def highpass(x: np.ndarray, f: float) -> np.ndarray:
    return sosfilt(butter(2, f, btype='high', fs=RATE, output='sos'), x)


def lowpass(x: np.ndarray, f: float) -> np.ndarray:
    return sosfilt(butter(2, f, btype='low', fs=RATE, output='sos'), x)


def reverb(x: np.ndarray, length: float, decay: float, mix: float) -> np.ndarray:
    t = seconds(length)
    ir = rng.standard_normal(len(t)) * np.exp(-t / decay)
    ir = lowpass(ir, 5000)
    wet = np.convolve(x, ir)
    wet = np.concatenate([wet, np.zeros(max(0, len(x) + len(t) - len(wet)))])[: len(x) + len(t)]
    wet /= np.max(np.abs(wet)) + 1e-9
    dry = np.concatenate([x, np.zeros(len(t))])
    dry /= np.max(np.abs(dry)) + 1e-9
    return dry * (1 - mix) + wet * mix


def finish(x: np.ndarray, name: str, fade: float = 0.25, peak_db: float = -1.5) -> None:
    t = np.arange(len(x)) / RATE
    x = x * np.clip((t[-1] - t) / fade, 0, 1)
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    pcm = (x * 32767).astype('<i2').tobytes()
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-i', '-',
         '-codec:a', 'libmp3lame', '-q:a', '4', str(path)],
        input=pcm, check=True,
    )
    print(f'wrote {path} ({len(x) / RATE:.1f} s)', file=sys.stderr)


def mystery() -> None:
    n = 1.9
    t = seconds(n)
    swell = np.clip(t / 1.2, 0, 1) ** 1.6
    # low drone: two detuned tones a tritone apart, slowly beating
    drone = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.7 * t)) for f in (110, 110.8, 155.6))
    # shimmer: band-passed noise sweeping up
    noise = rng.standard_normal(len(t))
    shimmer = np.zeros_like(t)
    for i, centre in enumerate(np.linspace(900, 4200, 12)):
        part = band(noise, centre * 0.92, centre * 1.08)
        window = np.exp(-((t - (0.25 + i * 0.11)) ** 2) / 0.05)
        shimmer += part * window
    # rising whistle with vibrato
    f = 520 * 2 ** (t / n * 1.4)
    whistle = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))) / RATE)
    whistle *= np.clip((t - 0.3) / 0.8, 0, 1) * 0.5
    mix = 0.45 * drone * swell + 0.9 * shimmer + whistle * swell
    finish(reverb(mix, 1.2, 0.35, 0.45), 'mystery.mp3', fade=0.5)


def card_flip() -> None:
    n = 1.7
    t = seconds(n)
    noise = rng.standard_normal(len(t))
    # whoosh: noise through a band that sweeps up quickly
    whoosh = np.zeros_like(t)
    for i, centre in enumerate(np.geomspace(300, 3000, 10)):
        whoosh += band(noise, centre * 0.8, centre * 1.2) * np.exp(-((t - 0.04 * i - 0.05) ** 2) / 0.004)
    # soft impact: low thump at the moment the card lands face up
    hit_at = 0.42
    th = np.clip(t - hit_at, 0, None)
    thump = np.sin(2 * np.pi * 70 * th * (1 + 0.6 * np.exp(-th * 25))) * np.exp(-th / 0.18) * (t >= hit_at)
    # sparkling chime: a bright major arpeggio of bell partials
    chime = np.zeros_like(t)
    for k, (freq, start) in enumerate([(1046.5, 0.45), (1318.5, 0.53), (1568.0, 0.61), (2093.0, 0.69)]):
        tt = np.clip(t - start, 0, None)
        bell = sum(a * np.sin(2 * np.pi * freq * r * tt) for a, r in ((1, 1), (0.5, 2.76), (0.25, 5.4)))
        chime += bell * np.exp(-tt / 0.45) * (t >= start)
    sparkle = highpass(noise, 6000) * np.exp(-np.clip(t - 0.45, 0, None) / 0.3) * (t >= 0.45) * 0.4
    mix = 0.8 * whoosh + 1.1 * thump + 0.35 * chime + sparkle
    finish(reverb(mix, 0.9, 0.25, 0.3), 'card-flip.mp3', fade=0.4)


def giggle() -> None:
    # a cackle: eight "heh-hah" syllables, high and falling, through vowel formants
    syllables = 9
    total = 1.55
    t = seconds(total)
    pitch = np.full_like(t, 1.0)
    env = np.zeros_like(t)
    vowel_mix = np.zeros_like(t)
    starts = []
    pos = 0.05
    for i in range(syllables):
        length = 0.11 + 0.012 * i
        gap = 0.045 + 0.004 * i
        starts.append((pos, length))
        pos += length + gap
    base = np.zeros_like(t)
    for i, (start, length) in enumerate(starts):
        tt = t - start
        on = (tt >= 0) & (tt < length)
        # each syllable glides down, the whole laugh falls from about 620 Hz to 360 Hz
        f0 = 620 * (0.94 ** i)
        base[on] = f0 * (1.06 - 0.12 * tt[on] / length)
        shape = np.sin(np.pi * np.clip(tt / length, 0, 1)) ** 0.6
        env[on] = shape[on] * (1 - 0.04 * i)
        vowel_mix[on] = (i % 2)  # alternate "eh" and "ah"
    base[base == 0] = 400
    jitter = 1 + 0.025 * np.sin(2 * np.pi * 9 * t) + 0.01 * rng.standard_normal(len(t))
    phase = 2 * np.pi * np.cumsum(base * jitter) / RATE
    # glottal pulse: many harmonics with falling amplitude (bright, nasal)
    voice = sum(np.sin(k * phase) / k ** 0.9 for k in range(1, 30))
    breath = rng.standard_normal(len(t)) * 0.35
    source = (voice + breath) * env

    def formants(x: np.ndarray, peaks) -> np.ndarray:
        return sum(g * band(x, f * 0.9, f * 1.1) for f, g in peaks)

    eh = formants(source, [(600, 1.0), (1900, 0.7), (2700, 0.45), (3500, 0.2)])
    ah = formants(source, [(850, 1.0), (1250, 0.8), (2600, 0.4), (3600, 0.18)])
    # crossfade the vowels softly, so no ringing tail is cut off (clicks)
    k = int(0.02 * RATE)
    vowel_mix = np.convolve(vowel_mix, np.ones(k) / k, mode='same')
    witch = eh * (1 - vowel_mix) + ah * vowel_mix
    # a second, lower and quieter voice a little late: makes it eerie instead of cute
    shift = int(0.035 * RATE)
    low = np.concatenate([np.zeros(shift), witch[:-shift]])
    low = lowpass(low, 1800)
    mix = highpass(witch + 0.45 * low, 220)
    finish(reverb(mix, 1.4, 0.45, 0.42), 'giggle.mp3', fade=0.5)


mystery()
card_flip()
giggle()
