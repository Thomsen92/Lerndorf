/** Shared browser/build contract. No audio URL or answer is stored in public quest data. */
export const LISTENING_VOICE = 'en-GB-SoniaNeural';
export const LISTENING_RATE = '-10%';
export function listeningPath(text: string, voice = LISTENING_VOICE, rate = LISTENING_RATE): string {
  const input = `${voice}|${rate}|${text}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `assets/listening/${hash.toString(16).padStart(8, '0')}.mp3`;
}
