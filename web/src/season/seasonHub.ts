// Season hub: the stand and the HUD ticket open one welcome dialog. It is independent of the
// dark Halloween world (r13/r14) and only explains the quiz, 150 XP and the LearnPass.
import { tr } from '../i18n';
import { openModal, type ModalHandle } from '../ui/dialog';
import type { WorldThemeState } from '../api/worldTheme';
import './seasonHub.css';

export interface SeasonHubOptions {
  host: HTMLElement;
  openLearnPass: () => void;
  /** Opens the Spooky English Quiz (package S3); without it the button stays locked. */
  openQuiz?: () => void;
  canOpen: () => boolean;
  track?: (modal: ModalHandle) => void;
  /** Called once per shown welcome; the server stores the seen flag (plan package 7). */
  onAcknowledge?: (seasonId: string) => void;
}

export interface SeasonHub {
  el: HTMLButtonElement;
  open(): void;
  setState(state: WorldThemeState | null): void;
  /** Opens the welcome once per season and content version, never during tutorial or modals. */
  maybeAutoOpen(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createSeasonHub(opts: SeasonHubOptions): SeasonHub {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'season-world-ticket';
  el.setAttribute('aria-label', tr('Season I – Halloween öffnen'));
  const image = document.createElement('img');
  image.src = `${import.meta.env.BASE_URL}assets/halloween/season-ticket.svg`;
  image.alt = '';
  image.width = 100;
  image.height = 54;
  const label = document.createElement('span');
  label.textContent = 'Season I';
  el.append(image, label);
  opts.host.append(el);

  let state: WorldThemeState | null = null;
  let modal: ModalHandle | null = null;
  // A welcome acknowledged in this session must not pop again while the poll is in flight.
  let acknowledged: string | null = null;
  let pendingAck: string | null = null;
  let autoTried = false;

  function welcomeText(): string {
    return tr(
      'Eine gruselige Season ist in Lerndorf angekommen! Mach das Spooky English Quiz und verdiene 150 XP – genug für Tier 5 ohne Lehrerstempel. Öffne deinen LearnPass und hole deine Belohnungen ab.',
    );
  }

  function seasonLine(): string {
    if (!state?.seasonLabel) return '';
    if (state.seasonState === 'upcoming') return tr('Season startet bald.');
    if (state.seasonState === 'running') return tr('Die Season läuft.');
    return tr('Die Season ist beendet.');
  }

  function open(): void {
    if (modal?.isOpen) return;
    if (!opts.canOpen()) return;
    modal = openModal({
      title: tr('Willkommen bei Season I – Halloween!'),
      opener: el,
      onClose: () => {
        modal = null;
        if (pendingAck) {
          const season = pendingAck;
          pendingAck = null;
          acknowledged = season;
          opts.onAcknowledge?.(season);
        }
      },
    });
    opts.track?.(modal);
    modal.body.classList.add('season-world-welcome');
    const art = image.cloneNode(true) as HTMLImageElement;
    const intro = document.createElement('p');
    intro.className = 'season-world-intro';
    intro.textContent = welcomeText();
    const season = document.createElement('p');
    season.className = 'hint';
    season.textContent = seasonLine();
    const quiz = document.createElement('button');
    quiz.type = 'button';
    quiz.className = 'season-world-quiz';
    quiz.dataset.openQuiz = '';
    const upcoming = state?.seasonState === 'upcoming';
    quiz.disabled = !opts.openQuiz || upcoming || !state?.seasonId;
    quiz.textContent = upcoming ? tr('Spooky English Quiz · ab Season-Start') : tr('Spooky English Quiz');
    quiz.addEventListener('click', () => {
      // close first: no stacked dialogs; the quiz returns focus to the ticket
      modal?.close();
      opts.openQuiz?.();
    });
    const pass = document.createElement('button');
    pass.type = 'button';
    pass.className = 'primary';
    pass.dataset.openPass = '';
    pass.textContent = tr('LearnPass öffnen');
    pass.addEventListener('click', () => {
      modal?.close();
      opts.openLearnPass();
    });
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = tr('Zurück ins Dorf');
    back.addEventListener('click', () => modal?.close());
    const actions = document.createElement('div');
    actions.className = 'season-world-actions';
    actions.append(quiz, pass, back);
    modal.body.append(art, intro, season, actions);
    if (state?.seasonState === 'running' && state.seasonId) pendingAck = state.seasonId;
  }

  el.addEventListener('click', open);

  return {
    el,
    open,
    setState(next) {
      state = next;
      if (!next?.seasonId) return;
      if (acknowledged === next.seasonId) return;
      if (next.welcomeSeen) acknowledged = next.seasonId;
    },
    maybeAutoOpen() {
      if (!state || autoTried) return;
      if (state.seasonState !== 'running' || !state.seasonId) return;
      if (state.welcomeSeen || acknowledged === state.seasonId) return;
      if (!opts.canOpen()) return;
      autoTried = true;
      open();
    },
    setVisible(visible) {
      el.hidden = !visible;
    },
    dispose() {
      modal?.close();
      el.remove();
    },
  };
}
