import { getLocale } from '../i18n';
import { createVoicePlayer, type VoicePlayer } from '../mascot/voice';
import type { Sound } from '../ui/sound';
import type { OllieLineId } from './lines';

/** Local speech plus cheap portrait transforms; no live TTS, extra canvas or idle animation loop. */
export function createOllieSpeech(opts: {
  portrait: HTMLElement;
  sound?: Sound;
  voice?: VoicePlayer;
  reducedMotion?: () => boolean;
}): { say(id: OllieLineId): Promise<void>; dispose(): void } {
  const voice =
    opts.voice ??
    (opts.sound ? createVoicePlayer({ sound: opts.sound, clipDirectory: 'assets/shopkeeper/voice' }) : null);
  let closed = false,
    sequence = 0,
    request = 0;
  let releaseMusic: (() => void) | undefined;
  const still = (): void => {
    opts.portrait.dataset.speaking = 'false';
    opts.portrait.style.setProperty('--ollie-bob', '0px');
    opts.portrait.style.setProperty('--ollie-lean', '0deg');
    opts.portrait.style.setProperty('--ollie-stretch', '1');
  };
  const stop = (): void => {
    sequence++;
    window.cancelAnimationFrame(request);
    request = 0;
    voice?.stop();
    releaseMusic?.();
    releaseMusic = undefined;
    still();
  };
  const onHidden = (): void => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onHidden);
  still();
  return {
    async say(id) {
      if (closed || document.hidden) return;
      stop();
      const mine = sequence;
      voice?.unlock();
      const duration = (await voice?.playFile(`${getLocale()}-${id}`)) ?? null;
      if (closed || mine !== sequence || document.hidden) return;
      const recorded = duration !== null;
      if (recorded) releaseMusic = opts.sound?.quiet();
      else if (opts.sound?.enabled) opts.sound.play('ollieBlip');
      const start = performance.now();
      let last = -Infinity;
      const tick = (now: number): void => {
        if (closed || mine !== sequence) return;
        if (document.hidden) {
          stop();
          return;
        }
        if (opts.sound?.enabled === false) {
          stop();
          return;
        }
        const frame = recorded ? voice?.frame() : null;
        if (recorded ? !frame?.speaking : now - start > 1600) {
          stop();
          return;
        }
        if (now - last >= 30) {
          last = now;
          const reduced =
            opts.reducedMotion?.() ??
            (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
          const t = frame?.speechTime ?? (now - start) / 1000;
          const energy = frame?.speechLevel ?? 0.35;
          opts.portrait.dataset.speaking = 'true';
          opts.portrait.style.setProperty(
            '--ollie-bob',
            `${reduced ? 0 : -(3 + energy * 11) * (0.5 + 0.5 * Math.sin(t * 15))}px`,
          );
          opts.portrait.style.setProperty(
            '--ollie-lean',
            `${reduced ? 0 : Math.sin(t * 7) * (0.35 + energy * 0.8)}deg`,
          );
          opts.portrait.style.setProperty(
            '--ollie-stretch',
            String(reduced ? 1 : 1 + Math.sin(t * 15) * energy * 0.022),
          );
        }
        request = window.requestAnimationFrame(tick);
      };
      request = window.requestAnimationFrame(tick);
    },
    dispose() {
      if (closed) return;
      closed = true;
      stop();
      voice?.dispose();
      document.removeEventListener('visibilitychange', onHidden);
    },
  };
}
