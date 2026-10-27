/** Season entry card in the profile (plan §14.7, U5): tier, days left and waiting chests. */
import { tr, msg } from '../i18n';
import type { SeasonApi } from '../api/season';
import { chestSvg } from './learnpass/rewardArt';
import './seasonCard.css';

export interface SeasonCardOptions {
  api: SeasonApi;
  onOpen: () => void;
}

export function createSeasonCard(opts: SeasonCardOptions): HTMLElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'profile-season';
  card.disabled = true;
  card.innerHTML = `
    <span class="profile-season-icon">${chestSvg()}</span>
    <span class="profile-season-text">
      <strong>${tr('Season I – Halloween')}</strong>
      <span class="profile-season-meta">${tr('Season wird geladen…')}</span>
    </span>
    <span class="profile-season-badge" hidden></span>
    <span class="profile-season-arrow" aria-hidden="true">→</span>`;
  const meta = card.querySelector<HTMLElement>('.profile-season-meta')!;
  const badge = card.querySelector<HTMLElement>('.profile-season-badge')!;

  void opts.api
    .state()
    .then((state) => {
      const waiting = state.chests.pass + state.chests.streak + state.chests.shop;
      meta.textContent = msg`Stufe ${state.tier} von 40 · ${state.season.days_left} Tage übrig`;
      if (waiting > 0) {
        badge.textContent = `×${waiting}`;
        badge.hidden = false;
      }
      card.disabled = false;
      card.addEventListener('click', opts.onOpen);
      if (state.season.state !== 'running') card.classList.add('ended');
    })
    .catch(() => {
      meta.textContent = tr('Die Season konnte nicht geladen werden.');
    });

  return card;
}
