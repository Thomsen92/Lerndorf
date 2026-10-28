/**
 * Text-to-speech for listening quests. Uses the browser's own voices; no audio files.
 * Falls back to `false` so the caller can show the text instead.
 */

export interface VoiceLike {
  lang: string;
  name: string;
}

/** Android reports `en_GB`, desktop `en-GB`. */
const normaliseLang = (lang: string): string => lang.replace('_', '-');

/** Prefers British English, then any English voice; null if there is none. */
export function pickEnglishVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const english = voices.filter((v) => normaliseLang(v.lang).toLowerCase().startsWith('en'));
  return english.find((v) => normaliseLang(v.lang).toLowerCase() === 'en-gb') ?? english[0] ?? null;
}

/** Voices load asynchronously in some browsers: wait for `voiceschanged`, then give up. */
export async function loadVoices(synth: SpeechSynthesis, timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const now = synth.getVoices();
  if (now.length > 0) return now;
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener('voiceschanged', finish);
  });
}

/**
 * Speaks `text` in English. Returns false when nothing could be spoken. `onEnd` runs once when the
 * voice has finished or was stopped (the area turns the music back up then).
 */
export async function speakEnglish(
  text: string,
  synth: SpeechSynthesis | undefined = globalThis.speechSynthesis,
  onEnd?: () => void,
): Promise<boolean> {
  if (!synth) return false;
  try {
    const voice = pickEnglishVoice(await loadVoices(synth));
    if (!voice) return false;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = normaliseLang(voice.lang);
    utterance.rate = 0.9;
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
