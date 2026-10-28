"""Builds the game's own victory fanfare (web/public/assets/audio/sfx/victory-fanfare.mp3).

Own composition, synthesised from scratch (no samples), so it is free to publish (CC0, see
blender/sources/LICENSES.md). A rising C-major call of brass-like tones over a chord, a timpani
roll and a cymbal swell, about 3.6 seconds. Run: python3 web/scripts/audio/make-victory-fanfare.py
(needs numpy and ffmpeg).
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

RATE = 44100
OUT = Path(__file__).resolve().parents[2] / 'public/assets/audio/sfx/victory-fanfare.mp3'
rng = np.random.default_rng(7)


def hz(note: str) -> float:
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    return 440.0 * 2 ** ((names[note[0]] + 12 * (int(note[-1]) - 4)) / 12)


def brass(freq: float, length: float, loud: float = 1.0) -> np.ndarray:
    t = np.arange(int(length * RATE)) / RATE
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1)
    phase = 2 * np.pi * freq * np.cumsum(vib) / RATE
    # brightness grows during the attack, like a horn opening up
    bright = np.clip(t / 0.06, 0, 1)
    wave = sum((0.9 ** k) * (bright if k > 2 else 1) * np.sin(k * phase) / k for k in range(1, 9))
    attack = np.clip(t / 0.025, 0, 1)
    release = np.clip((length - t) / 0.08, 0, 1)
    return loud * wave * attack * release


def place(track: np.ndarray, sound: np.ndarray, at: float) -> None:
    i = int(at * RATE)
    end = min(len(track), i + len(sound))
    track[i:end] += sound[: end - i]


def noise_hit(length: float, decay: float, low: float) -> np.ndarray:
    n = rng.standard_normal(int(length * RATE))
    t = np.arange(len(n)) / RATE
    # crude high-pass: subtract a smoothed copy
    k = max(1, int(RATE / low))
    smooth = np.convolve(n, np.ones(k) / k, mode='same')
    return (n - smooth) * np.exp(-t / decay)


def timpani(freq: float, length: float) -> np.ndarray:
    t = np.arange(int(length * RATE)) / RATE
    return np.sin(2 * np.pi * freq * t * (1 + 0.02 * np.exp(-t * 20))) * np.exp(-t / 0.35)


LENGTH = 3.7
mix = np.zeros(int(LENGTH * RATE))
beat = 0.16  # one short note

# the call: four quick rising notes, a short answer, then the long top note
melody = [('G4', 0, 1), ('C5', 1, 1), ('E5', 2, 1), ('G5', 3, 2), ('F5', 5, 1), ('A5', 6, 1), ('C6', 7, 10)]
for note, start, dur in melody:
    place(mix, brass(hz(note), dur * beat + 0.04, 0.55), start * beat)
# a second voice a sixth below on the long note
place(mix, brass(hz('E5'), 10 * beat, 0.35), 7 * beat)
# chord underneath from the long note on: C major, with a soft swell
chord_at = 7 * beat
for note in ('C4', 'G4', 'C5'):
    tone = brass(hz(note), LENGTH - chord_at, 0.22)
    tone *= np.clip(np.arange(len(tone)) / RATE / 0.3, 0, 1)
    place(mix, tone, chord_at)
# timpani roll into the long note and a cymbal swell on it
for i in range(6):
    place(mix, timpani(hz('C3') if i % 2 else hz('G2'), 0.5) * (0.25 + 0.08 * i), chord_at - 0.42 + i * 0.07)
place(mix, timpani(hz('C3'), 1.4) * 0.8, chord_at)
place(mix, noise_hit(2.0, 0.5, 4000) * 0.07, chord_at)

# fade out at the end, normalise to -1 dBFS
t = np.arange(len(mix)) / RATE
mix *= np.clip((LENGTH - t) / 0.7, 0, 1)
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
pcm = (mix * 32767).astype('<i2').tobytes()

OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(
    ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-i', '-',
     '-codec:a', 'libmp3lame', '-q:a', '3', str(OUT)],
    input=pcm, check=True,
)
print(f'wrote {OUT} ({len(mix) / RATE:.1f} s)', file=sys.stderr)
