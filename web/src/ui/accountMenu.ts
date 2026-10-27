import { tr, msg, getLocale, setLocale, type Locale } from '../i18n';
/**
 * Settings menu ("Einstellungen"): nickname and coins, graphics quality, ledger, logout.
 * Built on the shared modal; the ledger action closes the menu first so the two modals never stack.
 */
import type { QualityChoice } from '../render/quality';
import { openModal, type ModalHandle } from './dialog';
import { readUiScale, setUiScale, type UiScale } from './uiScale';

const QUALITY_LABEL: ReadonlyArray<readonly [QualityChoice, string]> = [
  ['auto', 'Auto'],
  ['high', tr('Hoch')],
  ['low', tr('Niedrig')],
];

export function openAccountMenu(opts: {
  opener: HTMLElement;
  nickname: string;
  coins: number;
  quality: QualityChoice;
  sound?: { on: boolean; onChange: (on: boolean) => void };
  onQuality: (q: QualityChoice) => void;
  /** opens the figure choice (boy or girl); omitted: no button */
  onCharacter?: () => void;
  onLogout: () => void;
  onLanguageChange?: (locale: Locale) => void;
}): ModalHandle {
  const modal = openModal({ title: tr('Einstellungen'), opener: opts.opener });
  const language = document.createElement('div');
  language.className = 'seg language-group';
  language.setAttribute('role', 'group');
  language.setAttribute('aria-label', tr('Sprache'));
  for (const [value, label] of [
    ['en', 'English'],
    ['de', 'Deutsch'],
  ] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.language = value;
    b.setAttribute('aria-pressed', String(getLocale() === value));
    b.addEventListener('click', () => {
      if (getLocale() === value) return;
      setLocale(value);
      if (opts.onLanguageChange) {
        opts.onLanguageChange(value);
        return;
      }
      const url = new URL(location.href);
      url.searchParams.set('lang', value);
      history.replaceState(null, '', url);
      location.reload();
    });
    language.append(b);
  }
  modal.body.append(language);

  const size = document.createElement('div');
  size.className = 'seg ui-size-group';
  size.setAttribute('role', 'group');
  size.setAttribute('aria-label', tr('Größe der Oberfläche'));
  const sizeButtons = new Map<UiScale, HTMLButtonElement>();
  let scale = readUiScale();
  const refreshSize = (): void => {
    for (const [value, b] of sizeButtons) b.setAttribute('aria-pressed', String(value === scale));
  };
  for (const [value, label] of [
    ['xs', tr('Mini')],
    ['s', tr('Klein')],
    ['m', tr('Mittel')],
    ['l', tr('Groß')],
  ] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.uiScale = value;
    b.addEventListener('click', () => {
      scale = value;
      refreshSize();
      setUiScale(value);
    });
    sizeButtons.set(value, b);
    size.append(b);
  }
  refreshSize();
  modal.body.append(size);

  const who = document.createElement('p');
  who.className = 'account-who';
  who.textContent = msg`${opts.nickname} · ${opts.coins} Münzen`;

  const group = document.createElement('div');
  group.className = 'seg quality-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', tr('Grafik-Qualität'));
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

  const figure = document.createElement('button');
  figure.type = 'button';
  figure.textContent = tr('Figur wechseln');
  figure.addEventListener('click', () => {
    modal.close();
    opts.onCharacter?.();
  });

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.textContent = tr('Abmelden');
  logout.addEventListener('click', () => opts.onLogout());

  modal.body.append(who, group, ...(opts.onCharacter ? [figure] : []), logout);
  if (opts.sound) {
    const setting = opts.sound;
    let on = setting.on;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    const refreshSound = (): void => {
      toggle.textContent = on ? tr('Töne: an') : tr('Töne: aus');
      toggle.setAttribute('aria-pressed', String(on));
    };
    toggle.addEventListener('click', () => {
      on = !on;
      refreshSound();
      setting.onChange(on);
    });
    refreshSound();
    group.after(toggle);
  }
  return modal;
}
