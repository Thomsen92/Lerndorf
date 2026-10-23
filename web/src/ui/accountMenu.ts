/**
 * Settings menu ("Einstellungen"): nickname and coins, graphics quality, ledger, logout.
 * Built on the shared modal; the ledger action closes the menu first so the two modals never stack.
 */
import type { QualityChoice } from '../render/quality';
import { openModal, type ModalHandle } from './dialog';

const QUALITY_LABEL: ReadonlyArray<readonly [QualityChoice, string]> = [
  ['auto', 'Auto'],
  ['high', 'Hoch'],
  ['low', 'Niedrig'],
];

export function openAccountMenu(opts: {
  opener: HTMLElement;
  nickname: string;
  coins: number;
  quality: QualityChoice;
  onQuality: (q: QualityChoice) => void;
  onLedger: () => void;
  /** opens the figure choice (boy or girl); omitted: no button */
  onCharacter?: () => void;
  onLogout: () => void;
}): ModalHandle {
  const modal = openModal({ title: 'Einstellungen', opener: opts.opener });

  const who = document.createElement('p');
  who.className = 'account-who';
  who.textContent = `${opts.nickname} · ${opts.coins} Münzen`;

  const group = document.createElement('div');
  group.className = 'seg quality-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Grafik-Qualität');
  const buttons = new Map<QualityChoice, HTMLButtonElement>();
  let current = opts.quality;
  const refresh = (): void => {
    for (const [choice, b] of buttons) b.setAttribute('aria-pressed', String(choice === current));
  };
  for (const [choice, label] of QUALITY_LABEL) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      current = choice;
      refresh();
      opts.onQuality(choice);
    });
    buttons.set(choice, b);
    group.appendChild(b);
  }
  refresh();

  const ledger = document.createElement('button');
  ledger.type = 'button';
  ledger.textContent = 'Kontoauszug';
  ledger.addEventListener('click', () => {
    modal.close();
    opts.onLedger();
  });

  const figure = document.createElement('button');
  figure.type = 'button';
  figure.textContent = 'Figur wechseln';
  figure.addEventListener('click', () => {
    modal.close();
    opts.onCharacter?.();
  });

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.textContent = 'Abmelden';
  logout.addEventListener('click', () => opts.onLogout());

  modal.body.append(who, group, ledger, ...(opts.onCharacter ? [figure] : []), logout);
  return modal;
}
