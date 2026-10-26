import type { CharacterKind } from '../render/character';
import type { PortraitSource } from '../render/portrait';
import type { AvatarLook } from '../avatars/look';
import { avatarPortrait } from './frames';
import { crestSvg } from './crest';
export interface BadgeProgress {
  level: number;
  xp: number;
  levelXp: number;
  nextLevelXp: number;
  coins: number;
  streak: number;
  chests: number;
  frameId: string;
}
export interface AvatarBadge {
  el: HTMLButtonElement;
  update(p: BadgeProgress): void;
  animateTo(p: BadgeProgress): Promise<void>;
  target(): DOMRect;
  setCoins?(coins: number): void;
  current?(): BadgeProgress;
  updateCharacter?(kind: CharacterKind | null): void;
  updateLook?(look: AvatarLook): void;
}
export function createAvatarBadge(opts: {
  nickname: string;
  character: CharacterKind | null;
  onOpen: (b: HTMLButtonElement) => void;
  reducedMotion?: () => boolean;
  portraits?: PortraitSource;
  look?: AvatarLook;
}): AvatarBadge {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'avatar-badge nav-status';
  el.addEventListener('click', () => opts.onOpen(el));
  const portrait = document.createElement('span'),
    crest = document.createElement('span'),
    info = document.createElement('span'),
    who = document.createElement('strong'),
    bar = document.createElement('div'),
    fill = document.createElement('span'),
    details = document.createElement('span'),
    dot = document.createElement('span');
  who.textContent = opts.nickname;
  bar.className = 'xp-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Erfahrung');
  bar.append(fill);
  details.className = 'badge-details';
  dot.className = 'chest-dot';
  info.className = 'badge-info';
  info.append(who, bar, details);
  el.append(portrait, crest, info, dot);
  let current: BadgeProgress = {
      level: 1,
      xp: 0,
      levelXp: 0,
      nextLevelXp: 50,
      coins: 0,
      streak: 0,
      chests: 0,
      frameId: 'frame_wood',
    },
    frame = '';
  const update = (p: BadgeProgress): void => {
    current = { ...p };
    const span = p.nextLevelXp - p.levelXp,
      into = Math.max(0, p.xp - p.levelXp);
    if (frame !== p.frameId) {
      frame = p.frameId;
      portrait.replaceChildren(
        avatarPortrait({
          character: opts.character,
          frameId: frame,
          size: 'small',
          portraits: opts.portraits,
          look: opts.look,
        }),
      );
    }
    crest.replaceChildren(crestSvg(p.level, 56));
    bar.setAttribute('aria-valuenow', String(into));
    bar.setAttribute('aria-valuemax', String(span));
    bar.setAttribute('aria-valuemin', '0');
    fill.style.width = `${Math.min(100, span > 0 ? (100 * into) / span : 0)}%`;
    details.textContent = `${p.coins} Münzen · 🔥 ${p.streak}`;
    dot.hidden = p.chests === 0;
    dot.textContent = '';
    if (p.chests) {
      const hidden = document.createElement('span');
      hidden.className = 'sr-only';
      hidden.textContent = `${p.chests} Truhen ungeöffnet`;
      dot.append(hidden);
    }
    el.setAttribute(
      'aria-label',
      `Profil: ${opts.nickname}, Level ${p.level}, ${into} von ${span} XP, ${p.coins} Münzen`,
    );
  };
  update(current);
  return {
    el,
    update,
    current: () => ({ ...current }),
    updateCharacter(kind) {
      opts.character = kind;
      frame = '';
      update(current);
    },
    updateLook(look) {
      opts.look = look;
      frame = '';
      update(current);
    },
    target: () => bar.getBoundingClientRect(),
    setCoins: (coins) => update({ ...current, coins }),
    async animateTo(p) {
      const previous = fill.style.width;
      update(p);
      if (!opts.reducedMotion?.() && typeof fill.animate === 'function') {
        await fill
          .animate([{ width: previous }, { width: fill.style.width }], { duration: 600, easing: 'ease-out' })
          .finished.catch(() => undefined);
      }
    },
  };
}
