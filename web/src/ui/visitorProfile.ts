import { tr, msg } from '../i18n';
import type { Outcome } from '../api/economy';
import type { PublicProfile } from '../api/publicProfile';
import type { PortraitSource } from '../render/portrait';
import { openModal, type ModalHandle } from './dialog';
import { avatarPortrait } from './frames';
import { crestSvg } from './crest';
import { titlePlaque } from './titlePlaque';
import './visitorProfile.css';
export function openVisitorProfile(opts: {
  id: string;
  load: (id: string) => Promise<Outcome<PublicProfile>>;
  opener?: HTMLElement | null;
  portraits?: PortraitSource;
  onClose?: () => void;
}): ModalHandle {
  let closed = false;
  const modal = openModal({
    title: tr('Profil ansehen'),
    opener: opts.opener,
    onClose: () => {
      closed = true;
      opts.onClose?.();
    },
  });
  modal.body.closest('.modal')?.classList.add('visitor-modal');
  modal.body.classList.add('visitor-profile');
  const load = async () => {
    modal.body.replaceChildren();
    modal.body.setAttribute('aria-busy', 'true');
    const status = document.createElement('p');
    status.className = 'visitor-status';
    status.setAttribute('role', 'status');
    status.textContent = tr('Profil wird geladen …');
    modal.body.append(status);
    let result: Outcome<PublicProfile>;
    try {
      result = await opts.load(opts.id);
    } catch {
      result = { ok: false, message: tr('Das Profil konnte nicht geladen werden.') };
    }
    if (closed) return;
    modal.body.setAttribute('aria-busy', 'false');
    if (!result.ok) {
      status.textContent = result.message;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.dataset.visitorRetry = '';
      retry.textContent = tr('Nochmal versuchen');
      retry.onclick = () => void load();
      modal.body.append(retry);
      return;
    }
    const p = result.value,
      hero = document.createElement('div');
    hero.className = 'visitor-hero';
    hero.append(
      avatarPortrait({
        character: p.character,
        frameId: p.frameId,
        size: 'large',
        portraits: opts.portraits,
        look: p.look,
      }),
      crestSvg(p.level, 92),
    );
    const name = document.createElement('h3');
    name.textContent = p.nickname;
    const title = document.createElement('p');
    title.className = 'visitor-title';
    if (p.titleLabel) title.append(titlePlaque(p.titleLabel, p.level));
    else title.textContent = tr('Noch kein Titel');
    const stats = document.createElement('div');
    stats.className = 'visitor-stats';
    for (const [label, value] of [
      [tr('Level'), String(p.level)],
      [tr('Serie'), msg`🔥 ${p.streak} Tage`],
    ]) {
      const card = document.createElement('div'),
        small = document.createElement('span'),
        strong = document.createElement('strong');
      small.textContent = label;
      strong.textContent = value;
      card.append(small, strong);
      stats.append(card);
    }
    modal.body.replaceChildren(hero, name, title, stats);
  };
  void load();
  return modal;
}
