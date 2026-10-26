import { tr, html, msg } from '../i18n';
/**
 * Daily Quest area: today's quests and yesterday's catch-up quests, one open at a time.
 * Never shows a solution or an attempt counter; coins only within the first attempts (D11).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  QUEST_NOT_OPEN,
  loadDailyQuests,
  submitQuestAnswer,
  type DailyQuest,
  type QuestAnswerResult,
} from '../api/quests';
import { loadVoices, speakEnglish } from '../quests/speech';
import { answerMode, buildAnswer, type AnswerState } from '../tasks/answer';
import { answerForm, bindAnswerForm, emptyState, type AnswerFormSpec } from './answerForms';
import type { AreaHandle } from './areas';
import { esc } from './esc';
import type { ProgressDelta } from '../api/progress';
import { createCompanion, type Companion } from '../mascot/mascotStage';
import type { Sound } from './sound';

export interface DailyQuestsOptions {
  sound?: Pick<Sound, 'enabled'>;
  onProgress?: (delta: ProgressDelta, from: HTMLElement) => void;
  supabase: SupabaseClient;
  coins: number;
  onCoins: (coins: number) => void;
  onClose: () => void;
}

const TITLE = 'Daily Quests';
const LOAD_FAILED = tr('Die Quests konnten nicht geladen werden.');

let areaCounter = 0;

/** Non-modal area. Its own „Schließen“ button calls opts.onClose; the returned close() only removes it. */
export function openDailyQuests(opts: DailyQuestsOptions): AreaHandle {
  const titleId = `quests-title-${++areaCounter}`;
  const overlay = document.createElement('section');
  overlay.className = 'overlay area quests-area';
  overlay.setAttribute('role', 'region');
  overlay.setAttribute('aria-labelledby', titleId);
  document.body.appendChild(overlay);

  // warm up the voices now, so the tap on „Anhören“ can speak at once (iOS keeps the gesture then)
  const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  if (synth) void loadVoices(synth).catch(() => undefined);

  let closed = false;
  let byte: Companion | null = null;
  let coins = opts.coins;
  let quests: DailyQuest[] = [];
  let openKey: string | null = null;
  let state: AnswerState | null = null;
  let pending = false;
  /** Message above the list (e.g. after a quest disappeared). */
  let listMessage = '';
  /** Result line shown in a card after it was solved (HTML, already escaped). */
  let solvedNote: { key: string; html: string } | null = null;

  const head = (): string =>
    html` <header class="panel-head">
        <h2 id="${titleId}">${TITLE}</h2>
        <span class="coins">${coins} Münzen</span>
        <button type="button" id="close">Schließen</button>
      </header>
      <p class="quest-rule">Münzen gibt es bei den ersten 3 Versuchen.</p>`;

  const bindClose = (): void =>
    overlay.querySelector('#close')?.addEventListener('click', () => opts.onClose());

  const load = async (): Promise<void> => {
    overlay.innerHTML = html`<section class="panel">
      ${head()}
      <p>Lädt …</p>
    </section>`;
    bindClose();
    let res: Awaited<ReturnType<typeof loadDailyQuests>>;
    try {
      res = await loadDailyQuests(opts.supabase);
    } catch (err) {
      console.error('daily quests load failed', err);
      res = { ok: false, message: LOAD_FAILED };
    }
    if (closed) return;
    if (!res.ok) {
      overlay.innerHTML = `<section class="panel">${head()}<p class="status error">${esc(res.message)}</p></section>`;
      bindClose();
      return;
    }
    quests = res.value;
    byte ??= createCompanion({ sound: opts.sound });
    if (quests.filter((q) => !q.catchUp).every((q) => q.solved) && quests.some((q) => !q.catchUp))
      byte.say('allDone');
    else byte.greet();
    if (openKey && !quests.some((q) => q.key === openKey && !q.solved)) {
      openKey = null;
      state = null;
    }
    render();
  };

  const render = (): void => {
    const today = quests.filter((q) => !q.catchUp);
    const catchUp = quests.filter((q) => q.catchUp);
    const todayHtml =
      today.length === 0
        ? html('<p class="quest-empty">Heute gibt es keine neuen Quests.</p>')
        : `<ul class="quest-list">${today.map(cardHtml).join('')}</ul>${
            today.every((q) => q.solved)
              ? html('<p class="quest-done">Alle Quests für heute geschafft!</p>')
              : ''
          }`;
    overlay.innerHTML = html` <section class="panel quests">
      ${head()}
      <p class="status" id="status" role="status">${esc(listMessage)}</p>
      <div class="quests-with-byte">
        <div class="byte-slot"></div>
        <div class="quests-content">
          <h3>Heute</h3>
          ${todayHtml}
          ${
            catchUp.length === 0
              ? ''
              : html`<h3>Nachholen von gestern</h3>
                  <ul class="quest-list">
                    ${catchUp.map(cardHtml).join('')}
                  </ul>`
          }
        </div>
      </div>
    </section>`;
    overlay.querySelector('.byte-slot')?.replaceWith(byte!.el);
    bindClose();
    overlay.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (pending) return;
        const key = btn.dataset.open ?? null;
        const q = quests.find((x) => x.key === key);
        listMessage = '';
        solvedNote = null;
        if (!q || openKey === key) {
          openKey = null;
          state = null;
        } else {
          openKey = q.key;
          state = emptyState(formSpec(q));
        }
        render();
      }),
    );
    const open = quests.find((q) => q.key === openKey);
    byte?.lookAt(open ? overlay.querySelector(`[data-quest="${CSS.escape(open.key)}"]`) : null);
    if (open) bindCard(open);
  };

  const cardHtml = (q: DailyQuest): string => {
    const badge = q.catchUp ? html('<span class="quest-badge">Nachholen · halbe Münzen</span>') : '';
    const prompt = `<span class="quest-prompt" lang="en">${esc(q.prompt)}</span>`;
    if (q.solved) {
      const note = solvedNote?.key === q.key ? `<p class="status quest-feedback">${solvedNote.html}</p>` : '';
      return html`<li class="quest-card solved" data-quest="${esc(q.key)}">
        <div class="quest-head">
          ${prompt}<span class="quest-meta">${badge}<span class="quest-reward">gelöst ✓</span></span>
        </div>
        ${note}
      </li>`;
    }
    const isOpen = q.key === openKey && state !== null;
    return `<li class="quest-card${isOpen ? ' open' : ''}" data-quest="${esc(q.key)}">
      <button type="button" class="quest-head" data-open="${esc(q.key)}" aria-expanded="${isOpen}">
        ${prompt}<span class="quest-meta">${badge}<span class="quest-reward">${esc(rewardLabel(q))}</span></span>
      </button>
      ${isOpen && state ? bodyHtml(q, state) : ''}
    </li>`;
  };

  const bodyHtml = (q: DailyQuest, s: AnswerState): string =>
    html` <div class="quest-body">
      ${
        q.type === 'listening'
          ? html(
              '<button type="button" class="quest-listen" data-listen>▶ Anhören</button><p class="quest-fallback" hidden></p>',
            )
          : ''
      }
      <div class="quest-form">${answerForm(formSpec(q), s)}</div>
      <button type="button" class="primary" id="check">Prüfen</button>
      <p class="status quest-feedback" role="status"></p>
    </div>`;

  const bindCard = (q: DailyQuest): void => {
    const card = Array.from(overlay.querySelectorAll<HTMLElement>('[data-quest]')).find(
      (el) => el.dataset.quest === q.key,
    );
    const s = state;
    if (!card || !s) return;
    const formBox = card.querySelector<HTMLElement>('.quest-form');
    const feedback = card.querySelector<HTMLElement>('.quest-feedback');
    const bindForm = (): void => {
      if (!formBox) return;
      bindAnswerForm(formBox, s, () => {
        formBox.innerHTML = answerForm(formSpec(q), s);
        bindForm();
      });
    };
    bindForm();

    card.querySelector('[data-listen]')?.addEventListener('click', () => {
      byte?.listen();
      const speak = typeof q.data.speak === 'string' ? q.data.speak : '';
      void speakEnglish(speak).then((ok) => {
        const box = card.querySelector<HTMLElement>('.quest-fallback');
        if (ok || !box) return;
        box.innerHTML = html`Dein Gerät kann nicht vorlesen. Lies den Text:
          <span lang="en">${esc(speak)}</span>`;
        box.hidden = false;
      });
    });

    const check = card.querySelector<HTMLButtonElement>('#check');
    check?.addEventListener('click', async () => {
      if (pending) return;
      const answer = buildAnswer(s);
      if (answer === null) {
        if (feedback) feedback.textContent = tr('Bitte zuerst alles ausfüllen.');
        return;
      }
      pending = true;
      synth?.cancel?.();
      byte?.thinking();
      check.disabled = true;
      let res: Awaited<ReturnType<typeof submitQuestAnswer>>;
      try {
        res = await submitQuestAnswer(opts.supabase, q.key, answer);
      } catch (err) {
        console.error('quest answer failed', err);
        res = { ok: false, message: tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.') };
      } finally {
        pending = false;
      }
      if (closed) {
        // coins may have been booked on the server; keep the display in sync
        if (res.ok) opts.onCoins(res.value.coins);
        return;
      }
      check.disabled = false;
      if (!res.ok) {
        byte?.listen();
        if (res.message === QUEST_NOT_OPEN) {
          listMessage = res.message;
          openKey = null;
          state = null;
          void load();
          return;
        }
        if (feedback) feedback.textContent = res.message;
        return;
      }
      coins = res.value.coins;
      opts.onCoins(coins);
      if (res.value.correct || res.value.alreadySolved) {
        q.solved = true;
        q.rewardLeft = 0;
        if (!res.value.alreadySolved) {
          if (res.value.progress && res.value.progress.level > res.value.progress.levelBefore)
            void byte?.react('surprise');
          else
            void byte?.answer(
              q.key,
              true,
              !q.catchUp && quests.filter((q) => !q.catchUp).every((q) => q.solved),
            );
        }
        if (res.value.progress) opts.onProgress?.(res.value.progress, card);
        solvedNote = { key: q.key, html: esc(solvedText(res.value)) };
        openKey = null;
        state = null;
        render();
        return;
      }
      q.attempts += 1;
      void byte?.answer(q.key, false);
      q.rewardLeft = res.value.rewardLeft;
      const label = card.querySelector<HTMLElement>('.quest-reward');
      if (label) label.textContent = rewardLabel(q);
      const coinsBox = overlay.querySelector<HTMLElement>('.coins');
      if (coinsBox) coinsBox.textContent = msg`${coins} Münzen`;
      if (feedback) {
        feedback.innerHTML = res.value.hint
          ? html`Leider falsch. Tipp: <span lang="en">${esc(res.value.hint)}</span>`
          : tr('Leider falsch.');
      }
    });
  };

  void load();
  return {
    close() {
      closed = true;
      byte?.dispose();
      synth?.cancel?.();
      overlay.remove();
    },
  };
}

function formSpec(q: DailyQuest): AnswerFormSpec {
  return { type: answerMode(q.type, q.data), data: q.data };
}

function rewardLabel(q: DailyQuest): string {
  if (q.solved) return tr('gelöst ✓');
  return q.rewardLeft > 0 ? msg`${q.rewardLeft} Münzen` : tr('Keine Münzen mehr – üben geht trotzdem.');
}

function solvedText(r: QuestAnswerResult): string {
  if (r.alreadySolved) return tr('Diese Quest hast du schon gelöst.');
  return r.reward > 0 ? msg`Richtig! +${r.reward} Münzen` : tr('Richtig! Diesmal ohne Münzen.');
}
