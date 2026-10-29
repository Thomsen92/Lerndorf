/**
 * Spelling Bee (teacher, 28.10.2026): seven letters in a honeycomb, three minutes, words with the
 * yellow centre letter. The first three rounds of a day pay coins and XP by score, later rounds only
 * count for the weekly high score list of both classes. The server recounts every word; the browser
 * only gives instant feedback from salted hashes. A modal of its own: the village pauses meanwhile.
 */
import { tr, msg, html } from '../../i18n';
import { openModal, type ModalHandle } from '../../ui/dialog';
import { JOKERS_PER_ROUND } from '../../api/spellingBee';
import type {
  SpellingApi,
  SpellingBoard,
  SpellingList,
  SpellingResult,
  SpellingRound,
  SpellingState,
} from '../../api/spellingBee';
import type { ProgressDelta } from '../../api/progress';
import { createCompanion, type Companion } from '../../mascot/mascotStage';
import { speakEnglish } from '../../quests/speech';
import { celebrate } from '../../ui/celebration';
import type { SoundName } from '../../ui/sound';
import { esc } from '../../ui/esc';
import { beeSvg } from './beeArt';
import { evaluate, isPangram, normalise, shuffled, wordHash, wordPoints, type Verdict } from './game';
import './spellingBee.css';

export interface SpellingBeeOptions {
  api: SpellingApi;
  reducedMotion: boolean;
  sound?: { play(name: SoundName, delayMs?: number): void; readonly enabled: boolean } | null;
  opener?: HTMLElement | null;
  onCoins?: (coins: number) => void;
  onProgress?: (delta: ProgressDelta) => void;
  onClose?: () => void;
}

export interface SpellingBeeHandle {
  close(): void;
  readonly isOpen: boolean;
}

const MESSAGES: Record<Exclude<Verdict, 'ok'>, string> = {
  'too-short': 'Zu kurz – mindestens 4 Buchstaben.',
  'missing-center': 'Der gelbe Buchstabe fehlt.',
  'bad-letter': 'Nur die Buchstaben der Waben.',
  'not-in-list': 'Dieses Wort kennt die Biene nicht.',
  'already-found': 'Schon gefunden!',
};

export function openSpellingBee(opts: SpellingBeeOptions): SpellingBeeHandle {
  let closed = false;
  let byte: Companion | null = null;
  let state: SpellingState | null = null;
  /** The golden word found in the current round ('' until found). */
  let roundGolden = '';
  let timer: ReturnType<typeof setInterval> | undefined;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let removeKeys: (() => void) | null = null;

  const modal: ModalHandle = openModal({
    title: 'Spelling Bee',
    opener: opts.opener,
    wide: true,
    onClose: () => {
      closed = true;
      clearInterval(timer);
      clearTimeout(toastTimer);
      removeKeys?.();
      byte?.dispose();
      opts.onClose?.();
    },
  });
  modal.body.closest('.overlay')?.classList.add('bee-overlay');
  modal.body.classList.add('bee');
  const side = document.createElement('aside');
  side.className = 'bee-side';
  const main = document.createElement('div');
  main.className = 'bee-main';
  modal.body.append(side, main);
  byte = createCompanion({ sound: opts.sound ?? undefined });
  side.append(byte.el);

  void load();

  async function load(): Promise<void> {
    main.innerHTML = html`<p class="bee-status">Lädt …</p>`;
    try {
      state = await opts.api.state();
    } catch {
      if (closed) return;
      main.innerHTML = html`<p class="bee-status error">Die Spelling Bee konnte nicht geladen werden.</p>`;
      return;
    }
    if (closed) return;
    byte?.say('bee');
    showStart();
  }

  type BoardTab = 'week' | 'all' | 'total';
  const TABS: Array<[BoardTab, string, string]> = [
    ['week', 'Woche', 'Beste Runde dieser Woche'],
    ['all', 'Allzeit', 'Beste Runde aller Zeiten'],
    ['total', 'Fleißigste', 'Alle Punkte dieser Woche zusammen'],
  ];
  let boardTab: BoardTab = 'week';

  function listHtml(list: SpellingList): string {
    if (!list.top.length)
      return html`<p class="bee-board-empty">Noch niemand auf der Bestenliste. Sei die oder der Erste!</p>`;
    const rows = list.top
      .map(
        (r) =>
          `<li class="${r.me ? 'me' : ''}"><span class="bee-rank">${r.rank}</span><span class="bee-nick">${esc(r.nickname)}</span><span class="bee-class">${esc(r.classId)}</span><strong>${r.score}</strong></li>`,
      )
      .join('');
    const mine =
      list.me && !list.top.some((r) => r.me)
        ? `<p class="bee-mine">${esc(msg`Dein Platz: ${list.me.rank} · ${list.me.score} Punkte`)}</p>`
        : '';
    return `<ol class="bee-board">${rows}</ol>${mine}`;
  }

  /** The high score lists with three tabs: week (best round), all time (best round), most points this week. */
  function boardHtml(board: SpellingBoard): string {
    const lists: Record<BoardTab, SpellingList> = { week: board, all: board.all, total: board.total };
    const tabs = TABS.map(
      ([key, label]) =>
        `<button type="button" role="tab" data-board-tab="${key}" aria-selected="${key === boardTab}">${esc(tr(label))}</button>`,
    ).join('');
    const panels = TABS.map(
      ([key, , hint]) =>
        `<div role="tabpanel" data-board-panel="${key}"${key === boardTab ? '' : ' hidden'}><p class="bee-board-hint">${esc(tr(hint))}</p>${listHtml(lists[key])}</div>`,
    ).join('');
    return `<div class="bee-boards"><h3>${esc(tr('Bestenliste'))}</h3><div class="bee-tabs" role="tablist">${tabs}</div>${panels}</div>`;
  }

  function wireBoard(): void {
    main.querySelectorAll<HTMLButtonElement>('[data-board-tab]').forEach((button) =>
      button.addEventListener('click', () => {
        boardTab = button.dataset.boardTab as BoardTab;
        main.querySelectorAll<HTMLButtonElement>('[data-board-tab]').forEach((b) => {
          b.setAttribute('aria-selected', String(b === button));
        });
        main.querySelectorAll<HTMLElement>('[data-board-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.boardPanel !== boardTab;
        });
      }),
    );
  }

  function showStart(): void {
    if (!state) return;
    const s = state;
    const reward = s.tutorial
      ? tr(
          'Deine erste Runde ist eine Übungsrunde: Sir Byte zeigt dir die ersten 2 Wörter. Sie bringt Extra-Münzen, deine 3 Runden bleiben.',
        )
      : s.rewardedLeft > 0
        ? msg`Heute noch ${s.rewardedLeft} von ${s.freeRounds} Runden mit Münzen und XP.`
        : tr('Heute gibt es keine Münzen mehr – du spielst für die Bestenliste.');
    const go = s.tutorial ? tr('Übungsrunde starten · 5 Minuten') : tr('Runde starten · 3 Minuten');
    const best = s.board.me ? msg`Dein Bestwert diese Woche: ${s.board.me.score} Punkte` : '';
    main.innerHTML = html`<div class="bee-start">
      <div class="bee-hero">${beeSvg(140)}</div>
      <ul class="bee-rules">
        <li>Bilde Wörter mit mindestens 4 Buchstaben.</li>
        <li>Jedes Wort braucht den gelben Buchstaben.</li>
        <li>Buchstaben dürfen mehrmals vorkommen.</li>
        <li>Ein Wort mit allen 7 Buchstaben bringt 7 Extrapunkte.</li>
        ${s.puzzle.golden ? html`<li class="bee-golden-rule">Ein Wort ist heute golden: Es zählt doppelt!</li>` : ''}
      </ul>
      <p class="bee-reward ${s.tutorial ? 'practice' : s.rewardedLeft > 0 ? '' : 'none'}">${esc(reward)}</p>
      <button type="button" class="primary bee-go" data-start>${esc(go)}</button>
      ${boardHtml(s.board)}
      <p class="bee-best">${esc(best)}</p>
    </div>`;
    wireBoard();
    main.querySelector<HTMLButtonElement>('[data-start]')?.addEventListener('click', (ev) => {
      void startRound(ev.currentTarget as HTMLButtonElement);
    });
  }

  async function startRound(button: HTMLButtonElement): Promise<void> {
    if (!state) return;
    button.disabled = true;
    let round;
    try {
      round = await opts.api.start();
    } catch {
      button.disabled = false;
      toast(tr('Keine Verbindung. Bitte noch einmal versuchen.'), 'bad');
      return;
    }
    if (closed) return;
    play(round);
  }

  function play(round: SpellingRound): void {
    const { round: roundId, seconds, rewarded } = round;
    const s = state!;
    // practice round: two help words, the next letter to tap glows
    const hints = round.tutorial ? round.hints : [];
    const puzzle = {
      id: s.puzzle.id,
      center: s.puzzle.center,
      letters: s.puzzle.letters,
      hashes: s.puzzle.hashes,
    };
    let outer = s.puzzle.letters.slice();
    let input = '';
    let score = 0;
    let checking = false;
    const found: string[] = [];
    roundGolden = '';
    const deadline = performance.now() + seconds * 1000;

    main.innerHTML = html`<div class="bee-game">
      <div class="bee-top">
        <span class="bee-time" aria-live="off"></span>
        <span class="bee-bar"><span></span></span>
        <span class="bee-score"></span>
      </div>
      ${s.puzzle.golden ? `<p class="bee-golden">${esc(tr('Goldenes Wort: noch versteckt'))}</p>` : ''}
      <p class="bee-input" aria-live="polite"></p>
      <div class="bee-hive" role="group" aria-label="Buchstaben"></div>
      <div class="bee-actions">
        <button type="button" data-delete>Löschen</button>
        <button type="button" data-shuffle aria-label="Mischen">⟳</button>
        <button type="button" data-joker aria-label="Joker">💡 Joker <b data-jokers>${JOKERS_PER_ROUND}</b></button>
        <button type="button" class="primary" data-enter>Enter</button>
      </div>
      <p class="bee-joker-hints" aria-live="polite"></p>
      <p class="bee-toast" role="status"></p>
      ${
        hints.length
          ? `<div class="bee-help"><span>${esc(tr('Übungsrunde – tippe diese Wörter:'))}</span>${hints
              .map((w) => `<b lang="en" data-hint="${esc(w)}">${esc(w.toUpperCase())}</b>`)
              .join('')}</div>`
          : ''
      }
      <div class="bee-found-head"><span></span><button type="button" data-stop>Runde beenden</button></div>
      <ul class="bee-found"></ul>
    </div>`;
    const q = <T extends HTMLElement>(sel: string): T => main.querySelector<T>(sel)!;
    const hive = q('.bee-hive');
    const time = q('.bee-time');
    const bar = q<HTMLElement>('.bee-bar > span');
    const scoreBox = q('.bee-score');
    const inputBox = q('.bee-input');
    const list = q('.bee-found');
    const foundHead = q('.bee-found-head > span');

    const drawHive = (): void => {
      const cells = [s.puzzle.center, ...outer];
      hive.innerHTML = cells
        .map(
          (l, i) =>
            `<button type="button" class="bee-cell${i === 0 ? ' center' : ''}" data-letter="${esc(l)}" style="--slot:${i}" aria-label="${esc(l.toUpperCase())}"><span>${esc(l.toUpperCase())}</span></button>`,
        )
        .join('');
      hive
        .querySelectorAll<HTMLButtonElement>('[data-letter]')
        .forEach((b) => b.addEventListener('click', () => add(b.dataset.letter!)));
      if (hints.length) guide();
    };
    let helped = hints.length === 0;
    const guide = (): void => {
      main.querySelectorAll('.glow, .current').forEach((el) => el.classList.remove('glow', 'current'));
      main.querySelectorAll<HTMLElement>('[data-hint]').forEach((el) => {
        el.classList.toggle('done', found.includes(el.dataset.hint!));
      });
      const next = hints.find((w) => !found.includes(w));
      if (!next) {
        if (!helped) {
          helped = true;
          byte?.say('beeTutorialDone');
        }
        return;
      }
      main.querySelector(`[data-hint="${next}"]`)?.classList.add('current');
      let target: Element | null;
      if (!next.startsWith(input)) target = main.querySelector('[data-delete]');
      else if (input.length < next.length)
        target = hive.querySelector(`[data-letter="${next[input.length]}"]`);
      else target = main.querySelector('[data-enter]');
      target?.classList.add('glow');
    };
    const drawInput = (): void => {
      inputBox.innerHTML = input
        ? [...input]
            .map((c) => `<span class="${c === s.puzzle.center ? 'c' : ''}">${esc(c.toUpperCase())}</span>`)
            .join('')
        : `<span class="bee-caret">${esc(tr('Tippe auf die Waben'))}</span>`;
      guide();
    };
    const drawScore = (): void => {
      scoreBox.textContent = msg`${score} Punkte`;
      foundHead.textContent = msg`${found.length} von ${s.puzzle.wordCount} Wörtern`;
      list.innerHTML = found
        .slice()
        .sort()
        .map(
          (w) =>
            `<li class="${w === roundGolden ? 'golden' : isPangram(w, puzzle) ? 'pangram' : ''}" lang="en">${esc(w)}</li>`,
        )
        .join('');
    };
    const add = (letter: string): void => {
      if (input.length >= 19) return;
      input += letter;
      drawInput();
    };
    const back = (): void => {
      input = input.slice(0, -1);
      drawInput();
    };
    const mix = (): void => {
      outer = shuffled(outer);
      drawHive();
    };
    const enter = async (): Promise<void> => {
      if (checking || !input) return;
      checking = true;
      const word = normalise(input);
      const verdict = await evaluate(word, puzzle, new Set(found));
      checking = false;
      if (closed) return;
      if (verdict === 'ok') {
        found.push(word);
        const golden = !!s.puzzle.golden && (await wordHash(s.puzzle.id, word)) === s.puzzle.golden;
        if (closed) return;
        if (golden) roundGolden = word;
        const points = wordPoints(word, puzzle) * (golden ? 2 : 1);
        score += points;
        opts.sound?.play('ding');
        void speakEnglish(word);
        if (golden) {
          toast(msg`Goldenes Wort! ×2 +${points}`, 'golden');
          byte?.say('beeGolden');
          const box = main.querySelector('.bee-golden');
          if (box) {
            box.textContent = msg`Goldenes Wort gefunden: ${word.toUpperCase()}`;
            box.classList.add('found');
          }
        } else if (isPangram(word, puzzle)) {
          toast(msg`Pangram! +${points}`, 'pangram');
          byte?.say('beePangram');
        } else {
          toast(word.length >= 7 ? msg`Super! +${points}` : msg`Gut! +${points}`, 'good');
          if (word.length >= 7) byte?.say('beeLong');
        }
        drawScore();
      } else {
        toast(tr(MESSAGES[verdict]), 'bad');
        inputBox.classList.remove('shake');
        void inputBox.offsetWidth;
        inputBox.classList.add('shake');
      }
      input = '';
      drawInput();
    };

    const onKey = (ev: KeyboardEvent): void => {
      if (ev.target instanceof HTMLButtonElement && ev.key === 'Enter') return;
      const key = ev.key.toLowerCase();
      if (key === 'backspace') back();
      else if (key === 'enter') void enter();
      else if (key === ' ') {
        ev.preventDefault();
        mix();
      } else if (/^[a-z]$/.test(key) && [s.puzzle.center, ...outer].includes(key)) add(key);
      else return;
      ev.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    removeKeys = () => document.removeEventListener('keydown', onKey);

    q('[data-delete]').addEventListener('click', back);
    q('[data-shuffle]').addEventListener('click', mix);
    // Jokers: three a round, each shows the start of a word that is not found yet (the server knows the words)
    const jokerButton = q<HTMLButtonElement>('[data-joker]');
    const hintBox = q('.bee-joker-hints');
    let jokersLeft = JOKERS_PER_ROUND;
    let jokerBusy = false;
    const drawJokers = (): void => {
      q('[data-jokers]').textContent = String(jokersLeft);
      jokerButton.disabled = jokersLeft <= 0 || jokerBusy;
    };
    jokerButton.addEventListener('click', async () => {
      if (jokerBusy || jokersLeft <= 0) return;
      jokerBusy = true;
      drawJokers();
      try {
        const hint = await opts.api.hint(roundId, found);
        if (closed) return;
        jokersLeft = hint.jokersLeft;
        if ('prefix' in hint) {
          const chip = document.createElement('b');
          chip.lang = 'en';
          chip.textContent = `${hint.prefix.toUpperCase()}${'·'.repeat(Math.max(0, hint.length - hint.prefix.length))}`;
          chip.title = msg`${hint.length} Buchstaben`;
          chip.setAttribute('aria-label', msg`Hinweis: ${hint.prefix} und noch ${hint.length - hint.prefix.length} Buchstaben`);
          hintBox.append(chip);
        } else toast(tr('Du hast schon alle Wörter!'), 'good');
      } catch {
        if (!closed) toast(tr('Joker gerade nicht möglich.'), 'bad');
      } finally {
        jokerBusy = false;
        if (!closed) drawJokers();
      }
    });
    q('[data-enter]').addEventListener('click', () => void enter());
    q('[data-stop]').addEventListener('click', () => void end());

    let ended = false;
    const tick = (): void => {
      const left = Math.max(0, deadline - performance.now());
      const secs = Math.ceil(left / 1000);
      time.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      time.classList.toggle('hurry', secs <= 20);
      bar.style.width = `${(left / (seconds * 1000)) * 100}%`;
      if (left <= 0) void end();
    };

    async function end(): Promise<void> {
      if (ended) return;
      ended = true;
      clearInterval(timer);
      removeKeys?.();
      removeKeys = null;
      byte?.say('beeDone');
      await finish(roundId, found, rewarded);
    }

    drawHive();
    drawInput();
    drawScore();
    if (hints.length) byte?.say('beeTutorial');
    tick();
    timer = setInterval(tick, 250);
  }

  async function finish(roundId: number, words: string[], rewarded: boolean): Promise<void> {
    main.innerHTML = html`<p class="bee-status">Wird gezählt …</p>`;
    let result: SpellingResult;
    try {
      result = await opts.api.finish(roundId, words);
    } catch {
      if (closed) return;
      main.innerHTML = html`<div class="bee-start">
        <p class="bee-status error">Das Ergebnis konnte nicht gesendet werden.</p>
        <button type="button" class="primary" data-retry>Noch einmal senden</button>
      </div>`;
      main
        .querySelector('[data-retry]')
        ?.addEventListener('click', () => void finish(roundId, words, rewarded));
      return;
    }
    if (closed) return;
    const s = state!;
    const bestBefore = s.board.me?.score ?? 0;
    const allTimeBefore = s.board.all.me?.score ?? 0;
    s.board = result.board;
    s.rewardedLeft = result.rewardedLeft;
    if (result.coinsGained > 0) opts.onCoins?.(result.coins);
    if (result.progress) opts.onProgress?.(result.progress);
    const newBest = result.score > bestBefore && result.score > 0;
    if (newBest)
      celebrate({
        theme: 'gold',
        title:
          result.score > allTimeBefore && allTimeBefore > 0
            ? tr('Neuer Allzeit-Rekord!')
            : tr('Neuer Rekord!'),
        sound: opts.sound ?? null,
        reduced: opts.reducedMotion,
      });
    const gain = result.rewarded
      ? result.coinsGained > 0
        ? msg`+${result.coinsGained} Münzen · +${result.xpGained} XP`
        : tr('Diesmal ohne Belohnung – 0 Punkte.')
      : tr('Ohne Münzen: Diese Runde zählt für die Bestenliste.');
    const missed = s.puzzle.wordCount - result.words.length;
    main.innerHTML = html`<div class="bee-start bee-result">
      <div class="bee-hero">${beeSvg(110)}</div>
      <p class="bee-final">${esc(msg`${result.score} Punkte`)}</p>
      <p class="bee-gain ${result.rewarded && result.coinsGained > 0 ? '' : 'none'}">${esc(gain)}</p>
      <p class="bee-words-line">
        ${esc(msg`${result.words.length} Wörter gefunden, ${missed} warten noch im Bienenstock.`)}
      </p>
      <ul class="bee-found done">
        ${result.words
          .map((w) => `<li class="${w === roundGolden ? 'golden' : ''}" lang="en">${esc(w)}</li>`)
          .join('')}
      </ul>
      <div class="bee-actions">
        <button type="button" class="primary" data-again>Noch eine Runde</button>
        <button type="button" data-close>Schließen</button>
      </div>
      ${boardHtml(result.board)}
    </div>`;
    wireBoard();
    main.querySelector('[data-again]')?.addEventListener('click', () => showStart());
    main.querySelector('[data-close]')?.addEventListener('click', () => modal.close());
  }

  function toast(text: string, kind: 'good' | 'bad' | 'pangram' | 'golden'): void {
    const box = main.querySelector<HTMLElement>('.bee-toast') ?? null;
    if (!box) return;
    box.textContent = text;
    box.className = `bee-toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 1600);
  }

  return {
    close: () => modal.close(),
    get isOpen() {
      return modal.isOpen;
    },
  };
}
