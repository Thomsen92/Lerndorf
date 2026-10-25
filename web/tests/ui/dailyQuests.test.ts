// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DailyQuest, QuestAnswerResult } from '../../src/api/quests';

const loadDailyQuests = vi.fn();
const submitQuestAnswer = vi.fn();
vi.mock('../../src/api/quests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api/quests')>()),
  loadDailyQuests: (...a: unknown[]) => loadDailyQuests(...a),
  submitQuestAnswer: (...a: unknown[]) => submitQuestAnswer(...a),
}));
const speakEnglish = vi.fn();
const loadVoices = vi.fn();
vi.mock('../../src/quests/speech', () => ({
  speakEnglish: (...a: unknown[]) => speakEnglish(...a),
  loadVoices: (...a: unknown[]) => loadVoices(...a),
}));
import { openDailyQuests } from '../../src/ui/dailyQuestsView';
import type { AreaHandle } from '../../src/ui/areas';

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

const quest = (over: Partial<DailyQuest> = {}): DailyQuest => ({
  key: 'q1',
  day: '2026-10-21',
  catchUp: false,
  type: 'gap',
  prompt: 'She ___ a book.',
  data: {},
  reward: 10,
  rewardLeft: 10,
  solved: false,
  attempts: 0,
  ...over,
});

const result = (over: Partial<QuestAnswerResult> = {}): QuestAnswerResult => ({
  correct: true,
  alreadySolved: false,
  coins: 25,
  reward: 10,
  rewardLeft: 0,
  hint: null,
  ...over,
});

let handles: AreaHandle[] = [];
const open = (onClose = vi.fn(), onCoins = vi.fn()) => {
  const h = openDailyQuests({ supabase: {} as SupabaseClient, coins: 5, onCoins, onClose });
  handles.push(h);
  return { h, onClose, onCoins };
};

const region = (): HTMLElement => document.querySelector('section.overlay.area') as HTMLElement;
const text = (): string => region()?.textContent ?? '';
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === label,
  );
const card = (key: string): HTMLElement => document.querySelector(`[data-quest="${key}"]`) as HTMLElement;
/** Opens the quest card and returns its gap input (if any). */
const openCard = async (key: string): Promise<HTMLInputElement | null> => {
  card(key).querySelector<HTMLButtonElement>('[data-open]')?.click();
  await flush();
  return card(key).querySelector<HTMLInputElement>('#gap');
};
const typeGap = (input: HTMLInputElement | null, value: string): void => {
  if (!input) throw new Error('no gap input');
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

beforeEach(() => {
  document.body.innerHTML = '';
  loadDailyQuests.mockReset().mockResolvedValue({ ok: true, value: [] });
  submitQuestAnswer.mockReset();
  speakEnglish.mockReset().mockResolvedValue(true);
  loadVoices.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  handles.forEach((h) => h.close());
  handles = [];
});

describe('daily quest area', () => {
  it('forwards a confirmed XP delta from the answered card', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    const delta = { gained: [{ reason: 'quest', xp: 15 }], xp: 15, level: 1, levelBefore: 1, newChests: 0 };
    submitQuestAnswer.mockResolvedValue({
      ok: true,
      value: result({ progress: delta as QuestAnswerResult['progress'] }),
    });
    const onProgress = vi.fn();
    handles.push(
      openDailyQuests({
        supabase: {} as SupabaseClient,
        coins: 5,
        onCoins: vi.fn(),
        onClose: vi.fn(),
        onProgress,
      }),
    );
    await flush();
    typeGap(await openCard('q1'), 'reads');
    button('Prüfen')?.click();
    await flush();
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress.mock.calls[0][0]).toEqual(delta);
    expect(onProgress.mock.calls[0][1]).toBeInstanceOf(HTMLElement);
  });
  it('is a region; Schließen calls onClose, close() only removes', async () => {
    const { h, onClose } = open();
    await flush();
    expect(region().getAttribute('role')).toBe('region');
    expect(document.getElementById(region().getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'Daily Quests',
    );
    button('Schließen')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(region()).not.toBeNull();
    h.close();
    expect(region()).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses a distinct title id per area', async () => {
    open();
    open();
    await flush();
    const ids = Array.from(document.querySelectorAll('section.overlay.area')).map((r) =>
      r.getAttribute('aria-labelledby'),
    );
    expect(ids[0]).not.toBe(ids[1]);
    expect(document.querySelectorAll(`[id="${ids[0]}"]`).length).toBe(1);
  });

  it('shows the rule line under the title', async () => {
    open();
    await flush();
    expect(text()).toContain('Münzen gibt es bei den ersten 3 Versuchen.');
  });

  it('shows today and catch-up sections with labels and badge', async () => {
    loadDailyQuests.mockResolvedValue({
      ok: true,
      value: [
        quest({ key: 't1', prompt: 'Today one', reward: 10, rewardLeft: 10 }),
        quest({ key: 't2', prompt: 'Today two', rewardLeft: 0, attempts: 3 }),
        quest({ key: 't3', prompt: 'Today three', solved: true, rewardLeft: 0 }),
        quest({
          key: 'y1',
          day: '2026-10-20',
          catchUp: true,
          prompt: 'Yesterday',
          reward: 10,
          rewardLeft: 5,
        }),
      ],
    });
    open();
    await flush();
    const headings = Array.from(region().querySelectorAll('h3')).map((h) => h.textContent);
    expect(headings).toEqual(['Heute', 'Nachholen von gestern']);
    expect(card('t1').textContent).toContain('10 Münzen');
    expect(card('t2').textContent).toContain('Keine Münzen mehr – üben geht trotzdem.');
    expect(card('t3').textContent).toContain('gelöst ✓');
    expect(card('t3').querySelector('[data-open]')).toBeNull();
    expect(card('y1').textContent).toContain('Nachholen · halbe Münzen');
    expect(card('y1').textContent).toContain('5 Münzen');
    expect(card('t1').textContent).not.toContain('Nachholen');
    expect(text()).not.toMatch(/Versuch \d|von 3/);
  });

  it('hides the catch-up section when it is empty', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    open();
    await flush();
    expect(text()).not.toContain('Nachholen von gestern');
  });

  it('says so when there are no quests today', async () => {
    loadDailyQuests.mockResolvedValue({
      ok: true,
      value: [quest({ key: 'y1', catchUp: true, day: '2026-10-20', rewardLeft: 5 })],
    });
    open();
    await flush();
    expect(text()).toContain('Heute gibt es keine neuen Quests.');
    expect(text()).toContain('Nachholen von gestern');
  });

  it('says so when all of today is solved', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest({ solved: true, rewardLeft: 0 })] });
    open();
    await flush();
    expect(text()).toContain('Alle Quests für heute geschafft!');
  });

  it('escapes quest text', async () => {
    loadDailyQuests.mockResolvedValue({
      ok: true,
      value: [quest({ prompt: '<img src=x onerror=alert(1)>' })],
    });
    open();
    await flush();
    expect(region().querySelector('img')).toBeNull();
    expect(text()).toContain('<img src=x onerror=alert(1)>');
  });

  it('asks to fill in first when the answer is empty', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    open();
    await flush();
    await openCard('q1');
    button('Prüfen')?.click();
    await flush();
    expect(card('q1').textContent).toContain('Bitte zuerst alles ausfüllen.');
    expect(submitQuestAnswer).not.toHaveBeenCalled();
  });

  it('wrong answer shows the hint, keeps the form and its value, label follows rewardLeft', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    submitQuestAnswer.mockResolvedValue({
      ok: true,
      value: result({ correct: false, coins: 5, reward: 0, rewardLeft: 0, hint: 'Use the form with s.' }),
    });
    const { onCoins } = open();
    await flush();
    typeGap(await openCard('q1'), 'read');
    button('Prüfen')?.click();
    await flush();
    expect(submitQuestAnswer).toHaveBeenCalledWith(expect.anything(), 'q1', 'read');
    const c = card('q1');
    expect(c.textContent).toContain('Leider falsch. Tipp: Use the form with s.');
    expect(c.querySelector('.quest-feedback span[lang="en"]')?.textContent).toBe('Use the form with s.');
    expect(c.querySelector<HTMLInputElement>('#gap')?.value).toBe('read');
    expect(c.textContent).toContain('Keine Münzen mehr – üben geht trotzdem.');
    expect(c.textContent).not.toContain('10 Münzen');
    // the server's balance is passed on as it is (unchanged after a wrong answer)
    expect(onCoins).toHaveBeenCalledWith(5);
  });

  it('correct answer calls onCoins and marks the card solved', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    submitQuestAnswer.mockResolvedValue({ ok: true, value: result({ coins: 25, reward: 10 }) });
    const { onCoins } = open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    button('Prüfen')?.click();
    await flush();
    expect(onCoins).toHaveBeenCalledWith(25);
    expect(card('q1').textContent).toContain('gelöst ✓');
    expect(card('q1').textContent).toContain('Richtig! +10 Münzen');
    expect(card('q1').querySelector('#gap')).toBeNull();
    expect(text()).toContain('25 Münzen');
    expect(text()).toContain('Alle Quests für heute geschafft!');
  });

  it('correct answer without reward says so', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest({ rewardLeft: 0, attempts: 3 })] });
    submitQuestAnswer.mockResolvedValue({ ok: true, value: result({ coins: 5, reward: 0 }) });
    open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    button('Prüfen')?.click();
    await flush();
    expect(card('q1').textContent).toContain('Richtig! Diesmal ohne Münzen.');
  });

  it('already solved elsewhere says so and marks the card', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    submitQuestAnswer.mockResolvedValue({
      ok: true,
      value: result({ alreadySolved: true, coins: 25, reward: 0 }),
    });
    open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    button('Prüfen')?.click();
    await flush();
    expect(card('q1').textContent).toContain('Diese Quest hast du schon gelöst.');
    expect(card('q1').textContent).toContain('gelöst ✓');
  });

  it('two quick clicks on Prüfen submit once; the button is disabled while pending', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    let resolve: (v: unknown) => void = () => undefined;
    submitQuestAnswer.mockReturnValue(new Promise((r) => (resolve = r)));
    open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    const check = button('Prüfen') as HTMLButtonElement;
    check.click();
    check.click();
    expect(check.disabled).toBe(true);
    expect(submitQuestAnswer).toHaveBeenCalledTimes(1);
    resolve({ ok: true, value: result({ correct: false, rewardLeft: 10, reward: 0, coins: 5 }) });
    await flush();
    expect(button('Prüfen')?.disabled).toBe(false);
  });

  it('quest not available: shows the message and reloads the list', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    submitQuestAnswer.mockResolvedValue({ ok: false, message: 'Diese Quest ist nicht mehr offen.' });
    open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    loadDailyQuests.mockResolvedValue({ ok: true, value: [] });
    button('Prüfen')?.click();
    await flush();
    expect(loadDailyQuests).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Diese Quest ist nicht mehr offen.');
    expect(text()).toContain('Heute gibt es keine neuen Quests.');
  });

  it('other answer failures keep the form open', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    submitQuestAnswer.mockResolvedValue({
      ok: false,
      message: 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.',
    });
    open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    button('Prüfen')?.click();
    await flush();
    expect(loadDailyQuests).toHaveBeenCalledTimes(1);
    expect(card('q1').textContent).toContain('Das hat leider nicht geklappt.');
    expect(card('q1').querySelector<HTMLInputElement>('#gap')?.value).toBe('reads');
  });

  it('shows the load failure message (e.g. for a teacher account)', async () => {
    loadDailyQuests.mockResolvedValue({ ok: false, message: 'Nur Schülerkonten können Quests lösen.' });
    open();
    await flush();
    expect(text()).toContain('Nur Schülerkonten können Quests lösen.');
    expect(text()).not.toContain('Lädt');
    expect(button('Schließen')).toBeDefined();
  });

  it('shows an error when loading throws', async () => {
    loadDailyQuests.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    open();
    await flush();
    expect(text()).toContain('Die Quests konnten nicht geladen werden.');
    expect(button('Schließen')).toBeDefined();
  });

  it('listening: plays the speak text and uses the answer form of its mode', async () => {
    loadDailyQuests.mockResolvedValue({
      ok: true,
      value: [
        quest({
          type: 'listening',
          prompt: 'Listen. Where is the girl going?',
          data: {
            speak: 'The girl is going to the station.',
            mode: 'choice',
            options: ['the station', 'the park'],
          },
        }),
      ],
    });
    open();
    await flush();
    await openCard('q1');
    expect(card('q1').querySelectorAll('input[type=radio]').length).toBe(2);
    expect(card('q1').textContent).not.toContain('The girl is going');
    button('▶ Anhören')?.click();
    await flush();
    expect(speakEnglish).toHaveBeenCalledWith('The girl is going to the station.');
    expect(card('q1').textContent).not.toContain('Dein Gerät kann nicht vorlesen.');
  });

  it('listening: falls back to the text when the device cannot speak', async () => {
    speakEnglish.mockResolvedValue(false);
    loadDailyQuests.mockResolvedValue({
      ok: true,
      value: [quest({ type: 'listening', data: { speak: 'He is waiting at the station.', mode: 'gap' } })],
    });
    open();
    await flush();
    const input = await openCard('q1');
    expect(input).not.toBeNull();
    button('▶ Anhören')?.click();
    await flush();
    expect(card('q1').textContent).toContain('Dein Gerät kann nicht vorlesen. Lies den Text:');
    const english = Array.from(card('q1').querySelectorAll('[lang="en"]')).map((e) => e.textContent ?? '');
    expect(english.some((t) => t.includes('He is waiting at the station.'))).toBe(true);
  });

  it('preloads the voices once when speech exists', async () => {
    const synth = { getVoices: () => [] } as unknown as SpeechSynthesis;
    vi.stubGlobal('speechSynthesis', synth);
    try {
      open();
      await flush();
      expect(loadVoices).toHaveBeenCalledTimes(1);
      expect(loadVoices).toHaveBeenCalledWith(synth);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('a result arriving after close() still calls onCoins', async () => {
    loadDailyQuests.mockResolvedValue({ ok: true, value: [quest()] });
    let resolve: (v: unknown) => void = () => undefined;
    submitQuestAnswer.mockReturnValue(new Promise((r) => (resolve = r)));
    const { h, onCoins } = open();
    await flush();
    typeGap(await openCard('q1'), 'reads');
    button('Prüfen')?.click();
    h.close();
    resolve({ ok: true, value: result({ coins: 33 }) });
    await flush();
    expect(onCoins).toHaveBeenCalledWith(33);
    expect(region()).toBeNull();
  });
});
