import { msg, tr } from '../i18n';
import type { ProgressDelta } from '../api/progress';
import type { AvatarBadge } from './avatarBadge';
import type { Sound } from './sound';
export function toastLines(delta: ProgressDelta): string[] {
  return delta.gained.map((g) =>
    g.reason === 'day_goal'
      ? msg`Tagesziel geschafft! +${g.xp} XP`
      : g.reason === 'streak'
        ? delta.streak?.restarted
          ? tr('Neue Serie: 1 Tag 🔥 – weiter so!')
          : msg`🔥 Serie: ${delta.streak?.current ?? 1} Tage! +${g.xp} XP`
        : `+${g.xp} XP`,
  );
}
export async function showXpGain(opts: {
  delta: ProgressDelta;
  from: HTMLElement | null;
  badge: AvatarBadge;
  live: HTMLElement;
  sound?: Sound;
  reducedMotion: boolean;
}): Promise<void> {
  const lines = toastLines(opts.delta);
  if (!lines.length) return;
  opts.live.textContent = lines.join(' ');
  const toast = document.createElement('div');
  toast.className = 'xp-toasts';
  toast.setAttribute('aria-hidden', 'true');
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    toast.append(p);
  }
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
  opts.sound?.play('xp');
  const levelXp = (opts.delta.level - 1) * 50 + (25 * (opts.delta.level - 1) * (opts.delta.level - 2)) / 2;
  const current = opts.badge.current?.();
  const coins = current?.coins ?? 0;
  const fly = document.createElement('span');
  if (!opts.reducedMotion) {
    fly.className = 'xp-fly';
    fly.setAttribute('aria-hidden', 'true');
    fly.textContent = `+${opts.delta.gained.reduce((n, g) => n + g.xp, 0)} XP`;
    const from = opts.from?.getBoundingClientRect() ?? opts.badge.target(),
      to = opts.badge.target();
    fly.style.left = `${from.x + from.width / 2}px`;
    fly.style.top = `${from.y}px`;
    document.body.append(fly);
    if (typeof fly.animate === 'function')
      await fly
        .animate(
          [
            { transform: 'translate(0,0)', opacity: 1 },
            { transform: `translate(${to.x - from.x}px,${to.y - from.y}px)`, opacity: 0 },
          ],
          { duration: 600, easing: 'ease-in' },
        )
        .finished.catch(() => undefined);
    fly.remove();
  }
  await opts.badge.animateTo({
    level: opts.delta.level,
    xp: opts.delta.xp,
    levelXp,
    nextLevelXp: levelXp + 50 + 25 * (opts.delta.level - 1),
    coins,
    streak: opts.delta.streak?.current ?? current?.streak ?? 0,
    chests: (current?.chests ?? 0) + opts.delta.newChests,
    frameId: current?.frameId ?? 'frame_wood',
  });
}
