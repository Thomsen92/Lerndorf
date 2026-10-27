/**
 * Season card in the profile (plan §14.5, U5): blood-moon corner, "SEASON I · HALLOWEEN", tier
 * chip, progress bar to the next tier, days left and waiting chests, and "Open LearnPass".
 */
import { tr, msg } from '../i18n';
import type { SeasonApi } from '../api/season';
import './seasonCard.css';

export interface SeasonCardOptions {
  api: SeasonApi;
  onOpen: () => void;
}

export function createSeasonCard(opts: SeasonCardOptions): HTMLElement {
  const card = document.createElement('section');
  card.className = 'profile-season';
  card.setAttribute('aria-label', tr('Season I – Halloween'));
  card.innerHTML = `
    <b class="profile-season-title">${tr('Season I')} · ${tr('Halloween')}</b>
    <span class="profile-season-chip" hidden></span>
    <span class="profile-season-bar"><i style="width:0"></i></span>
    <small class="profile-season-meta">${tr('Season wird geladen…')}</small>`;
  const chip = card.querySelector<HTMLElement>('.profile-season-chip')!;
  const bar = card.querySelector<HTMLElement>('.profile-season-bar i')!;
  const meta = card.querySelector<HTMLElement>('.profile-season-meta')!;
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'profile-season-open';
  open.textContent = tr('LearnPass öffnen');
  open.disabled = true;
  open.addEventListener('click', () => opts.onOpen());
  card.append(open);

  void opts.api
    .state()
    .then((state) => {
      const waiting = state.chests.pass + state.chests.streak + state.chests.shop;
      chip.textContent = msg`Stufe ${state.tier}`;
      chip.hidden = false;
      const prev = state.tiers[state.tier - 1]?.xp ?? 0;
      const pct = state.next ? Math.round((100 * (state.xp - prev)) / Math.max(1, state.next.xp - prev)) : 100;
      bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      const when =
        state.season.state === 'upcoming'
          ? msg`startet am ${state.season.starts_on.slice(8, 10)}.${state.season.starts_on.slice(5, 7)}.`
          : state.season.state === 'running'
            ? msg`noch ${state.season.days_left} Tage`
            : tr('Saison beendet');
      const chests = waiting === 0 ? '' : waiting === 1 ? tr('1 Truhe wartet') : msg`${waiting} Truhen warten`;
      meta.textContent = [when, chests].filter(Boolean).join(' · ');
      if (state.season.state !== 'running') card.classList.add('ended');
      open.disabled = false;
    })
    .catch(() => {
      meta.textContent = tr('Die Season konnte nicht geladen werden.');
    });

  return card;
}
