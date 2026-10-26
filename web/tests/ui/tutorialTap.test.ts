// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import type { Result } from '../../src/api/build';
import type { TutorialAnswerResult } from '../../src/api/tutorial';
import { openQuiz } from '../../src/ui/tutorial/quizView';
vi.mock('../../src/quests/speech', () => ({ loadVoices: async () => [], speakEnglish: async () => true }));
afterEach(() => { document.body.innerHTML = ''; });
const tick = () => new Promise(r => setTimeout(r, 0));
it('submits an answer with one tap, prevents duplicate requests and supports retry', async () => {
  let finish!: (value: Result<TutorialAnswerResult>) => void;
  const answer = vi.fn(() => new Promise<Result<TutorialAnswerResult>>(r => { finish = r; }));
  const quiz = openQuiz({
    api: { question: async () => ({ ok: true, value: { nr: 1, total: 3, type: 'choice', prompt: 'Choose.', data: { options: ['house', 'mouse'] } } }), answer },
    onCoins: vi.fn(),
  });
  await tick();
  expect(document.querySelectorAll('input, select, #check')).toHaveLength(0);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.tutorial-answer')];
  expect(buttons).toHaveLength(2);
  buttons[1].click(); buttons[0].click();
  expect(answer).toHaveBeenCalledTimes(1);
  expect(answer).toHaveBeenCalledWith(1, 'mouse');
  expect(buttons.every(b => b.disabled)).toBe(true);
  finish({ ok: true, value: { correct: false, hint: 'You live in it.', answered: 0, done: false, coins: 0 } });
  await tick();
  expect(buttons.every(b => !b.disabled)).toBe(true);
  expect(document.querySelector('.quest-feedback')?.textContent).toContain('You live in it.');
  buttons[0].click();
  expect(answer).toHaveBeenLastCalledWith(1, 'house');
  finish({ ok: true, value: { correct: true, hint: null, answered: 1, done: false, coins: 0 } });
  await tick();
  expect(buttons.every(b => b.disabled)).toBe(true);
  quiz.close();
});
