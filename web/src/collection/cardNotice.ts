// A small, accessible notice after a grant. The card names come from the public catalogue;
// the grant itself already happened on the server.
import { tr } from '../i18n';
import { cardById, collectionCatalog } from './catalog';
import './cardNotice.css';

export interface CardNotice {
  el: HTMLElement;
  dispose(): void;
}

/**
 * `onOpen` turns the notice into a tap target (the LearnPass uses it to show the card reveal on
 * request): nothing blocks the page or plays a sound until the player taps it.
 */
export function announceCardGrants(
  ids: string[],
  opts: { timeoutMs?: number; onOpen?: () => void } = {},
): CardNotice {
  const el = document.createElement('div');
  el.className = 'card-gain-notice';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const hint = opts.onOpen ? ` ${tr('Antippen zum Ansehen')}` : '';
  el.textContent = `${tr('Neue Sammelkarte!')}${hint}`;
  document.body.append(el);
  const timer = setTimeout(() => el.remove(), opts.timeoutMs ?? 6000);
  void collectionCatalog()
    .then((catalog) => {
      const names = ids
        .map((id) => cardById(catalog, id)?.name)
        .filter((name): name is string => Boolean(name));
      if (names.length) el.textContent = `${tr('Neue Sammelkarten')}: ${names.join(', ')}${hint}`;
    })
    .catch(() => {
      // The notice is decoration; the server grant stays valid.
    });
  const dispose = (): void => {
    clearTimeout(timer);
    el.remove();
  };
  let tapped = false;
  el.addEventListener('click', () => {
    dispose();
    if (tapped) return;
    tapped = true;
    opts.onOpen?.();
  });
  return { el, dispose };
}
