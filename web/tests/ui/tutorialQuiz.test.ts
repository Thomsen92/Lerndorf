// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TutorialQuestion } from '../../src/api/tutorial';

const speakEnglish = vi.fn();
vi.mock('../../src/quests/speech', () => ({
  speakEnglish: (...a: unknown[]) => speakEnglish(...a),
  loadVoices: vi.fn().mockResolvedValue([]),
}));
import { openQuiz, type QuizApi } from '../../src/ui/tutorial/quizView';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
async function until(cond: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (cond()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}`);
}
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);

const QUESTIONS: TutorialQuestion[] = [
  { nr: 1, total: 5, type: 'choice', prompt: "What is 'Haus' in English?", data: { options: ['house', 'mouse', 'horse'] } },
  { nr: 2, total: 5, type: 'gap', prompt: 'My name ___ Tom.', data: {} },
  { nr: 3, total: 5, type: 'choice', prompt: 'Which word is a colour?', data: { options: ['red', 'run', 'rain'] } },
  {
    nr: 4,
    total: 5,
    type: 'match',
    prompt: 'Match the animals.',
    data: { left: ['dog', 'cat', 'bird'], right: ['Vogel', 'Hund', 'Katze'] },
  },
  {
    nr: 5,
    total: 5,
    type: 'listening',
    prompt: 'Listen. Who is talking?',
    data: {
      speak: 'Hello! I am your new neighbour. Welcome to the village!',
      mode: 'choice',
      options: ['your new neighbour', 'your teacher', 'your mum'],
    },
  },
];

function api(startAt: number, opts: { failQuestion?: boolean } = {}) {
  let current = startAt;
  let failQuestion = opts.failQuestion ?? false;
  const answers: Array<[number, unknown]> = [];
  const a: QuizApi = {
    question: async () => {
      if (failQuestion) {
        failQuestion = false;
        return { ok: false, message: 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.' };
      }
      return { ok: true, value: QUESTIONS[current - 1] };
    },
    answer: async (nr, answer) => {
      answers.push([nr, answer]);
      // every answer is wrong first time for question 4, right otherwise
      if (nr === 4 && answers.filter(([n]) => n === 4).length === 1)
        return { ok: true, value: { correct: false, hint: 'Think of animals.', answered: current - 1, done: false, coins: 0 } };
      current += 1;
      return { ok: true, value: { correct: true, hint: null, answered: nr, done: nr === 5, coins: nr === 5 ? 50 : 0 } };
    },
  };
  return { api: a, answers };
}

beforeEach(() => {
  speakEnglish.mockReset().mockResolvedValue(true);
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('tutorial quiz', () => {
  it('asks one question at a time, from the server position', async () => {
    const { api: a } = api(3);
    openQuiz({ api: a, onCoins: vi.fn() });
    await until(() => document.querySelector('h2')?.textContent === 'Frage 3 von 5', 'q3');
    expect(document.querySelectorAll('.quest-form').length).toBe(1);
    expect(document.querySelector('.tutorial-prompt')?.getAttribute('lang')).toBe('en');
    expect(document.querySelectorAll('input[name=choice]').length).toBe(3);
  });

  it('match: wrong answer shows the English hint, form stays for a retry', async () => {
    const { api: a, answers } = api(4);
    openQuiz({ api: a, onCoins: vi.fn() });
    await until(() => document.querySelectorAll('select[data-left]').length === 3, 'match form');
    const pick = (left: string, right: string): void => {
      const sel = document.querySelector<HTMLSelectElement>(`select[data-left="${left}"]`) as HTMLSelectElement;
      sel.value = right;
      sel.dispatchEvent(new Event('change'));
    };
    pick('dog', 'Katze');
    pick('cat', 'Hund');
    pick('bird', 'Vogel');
    button('Prüfen')?.click();
    await until(() => document.querySelector('.quest-feedback')?.textContent?.includes('Think of animals.') ?? false, 'hint');
    expect(document.querySelector('.quest-feedback span')?.getAttribute('lang')).toBe('en');
    expect(button('Prüfen')?.disabled).toBe(false);
    pick('dog', 'Hund');
    pick('cat', 'Katze');
    button('Prüfen')?.click();
    await until(() => document.body.textContent?.includes('Richtig!') ?? false, 'correct');
    expect(answers[1][1]).toEqual([
      ['dog', 'Hund'],
      ['cat', 'Katze'],
      ['bird', 'Vogel'],
    ]);
  });

  it('listening: reads the text aloud, offers a replay and then the choice form', async () => {
    const { api: a } = api(5);
    const onCoins = vi.fn();
    const quiz = openQuiz({ api: a, onCoins });
    await until(() => document.querySelector('[data-listen]') !== null, 'listen button');
    expect(speakEnglish).toHaveBeenCalledWith('Hello! I am your new neighbour. Welcome to the village!');
    (document.querySelector('[data-listen]') as HTMLButtonElement).click();
    expect(speakEnglish).toHaveBeenCalledTimes(2);
    // the spoken text is not printed while the device can speak
    expect(document.body.textContent).not.toContain('I am your new neighbour');
    const opt = document.querySelector<HTMLInputElement>('input[value="your new neighbour"]') as HTMLInputElement;
    opt.checked = true;
    opt.dispatchEvent(new Event('change'));
    button('Prüfen')?.click();
    await until(() => Boolean(button('Weiter')), 'done');
    expect(onCoins).toHaveBeenCalledWith(50);
    let resolved = false;
    void quiz.done.then(() => (resolved = true));
    button('Weiter')?.click();
    await tick();
    expect(resolved).toBe(true);
  });

  it('listening without a voice shows the text instead', async () => {
    speakEnglish.mockResolvedValue(false);
    const { api: a } = api(5);
    openQuiz({ api: a, onCoins: vi.fn() });
    await until(() => (document.querySelector('.quest-fallback') as HTMLElement | null)?.hidden === false, 'fallback');
    expect(document.querySelector('.quest-fallback')?.textContent).toContain('Welcome to the village!');
  });

  it('an empty answer is not sent', async () => {
    const { api: a, answers } = api(2);
    openQuiz({ api: a, onCoins: vi.fn() });
    await until(() => document.querySelector('#gap') !== null, 'gap');
    button('Prüfen')?.click();
    await tick();
    expect(answers).toEqual([]);
    expect(document.querySelector('.quest-feedback')?.textContent).toBe('Bitte zuerst alles ausfüllen.');
  });

  it('a failed question load offers a retry', async () => {
    const { api: a } = api(1, { failQuestion: true });
    openQuiz({ api: a, onCoins: vi.fn() });
    await until(() => Boolean(button('Noch einmal versuchen')), 'retry');
    expect(document.body.textContent).toContain('Bitte noch einmal versuchen');
    button('Noch einmal versuchen')?.click();
    await until(() => document.querySelector('h2')?.textContent === 'Frage 1 von 5', 'q1');
  });
});
