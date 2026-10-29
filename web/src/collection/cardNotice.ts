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
 * request): nothing blocks the page or plays a sound until the player taps it. With `host` the
 * notice sits inline in that element (below "What's inside?" in the pass), big and impossible to
 * miss; a timeout of 0 keeps it until it is tapped or the host goes away.
 */
export function announceCardGrants(
  ids: string[],
  opts: { timeoutMs?: number; onOpen?: () => void; host?: HTMLElement } = {},
): CardNotice {
  const el = document.createElement('div');
  el.className = 'card-gain-notice';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const hint = opts.onOpen ? ` ${tr('Antippen zum Ansehen')}` : '';
  el.textContent = `${tr('Neue Sammelkarte!')}${hint}`;
  if (opts.host) el.classList.add('card-gain-notice--inline');
  (opts.host ?? document.body).append(el);
  // phones stack the tiles, so the notice can sit below the visible part of the pass
  if (opts.host) requestAnimationFrame(() => el.scrollIntoView?.({ block: 'nearest' }));
  const timeout = opts.timeoutMs ?? 6000;
  const timer = timeout > 0 ? setTimeout(() => el.remove(), timeout) : undefined;
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
    if (timer) clearTimeout(timer);
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
