// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { answerForm, bindAnswerForm, emptyState } from '../../src/ui/answerForms';
import { buildAnswer, type AnswerState, type TaskType } from '../../src/tasks/answer';

let root: HTMLElement;

/** Renders the form like an area does and re-renders it when the binding asks for it. */
function mount(type: TaskType, data: Record<string, unknown>): { state: AnswerState; redraws: () => number } {
  const spec = { type, data };
  const state = emptyState(spec);
  let count = 0;
  const draw = (): void => {
    root.innerHTML = answerForm(spec, state);
    bindAnswerForm(root, state, () => {
      count++;
      draw();
    });
  };
  draw();
  return { state, redraws: () => count };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root') as HTMLElement;
});

describe('answer forms', () => {
  it('choice: radio per option, the picked one becomes the answer', () => {
    const { state } = mount('choice', { options: ['apple', 'chair', 3] });
    const radios = root.querySelectorAll<HTMLInputElement>('input[type=radio]');
    expect(radios.length).toBe(2);
    expect(buildAnswer(state)).toBeNull();
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change'));
    expect(buildAnswer(state)).toBe('chair');
  });

  it('gap: text input, trimmed text is the answer', () => {
    const { state } = mount('gap', {});
    const input = root.querySelector<HTMLInputElement>('#gap') as HTMLInputElement;
    expect(input.getAttribute('autocapitalize')).toBe('off');
    input.value = '  reads ';
    input.dispatchEvent(new Event('input'));
    expect(buildAnswer(state)).toBe('reads');
  });

  it('match: a select per left word, all must be chosen', () => {
    const { state } = mount('match', { left: ['cow', 'horse'], right: ['Pferd', 'Kuh'] });
    const selects = root.querySelectorAll<HTMLSelectElement>('select[data-left]');
    expect(selects.length).toBe(2);
    selects[0].value = 'Kuh';
    selects[0].dispatchEvent(new Event('change'));
    expect(buildAnswer(state)).toBeNull();
    selects[1].value = 'Pferd';
    selects[1].dispatchEvent(new Event('change'));
    expect(buildAnswer(state)).toEqual([
      ['cow', 'Kuh'],
      ['horse', 'Pferd'],
    ]);
  });

  it('order: tapping words builds the sequence, Neu anfangen clears it', () => {
    const { state, redraws } = mount('order', { words: ['cat', 'the', 'sees'] });
    const tap = (w: string): void =>
      root.querySelector<HTMLButtonElement>(`[data-word="${w}"]`)?.click();
    tap('the');
    tap('cat');
    expect(buildAnswer(state)).toEqual(['the', 'cat']);
    expect(redraws()).toBe(2);
    expect(root.textContent).toContain('the cat');
    root.querySelector<HTMLButtonElement>('#reset')?.click();
    expect(buildAnswer(state)).toBeNull();
  });

  it('escapes the task data', () => {
    mount('choice', { options: ['<b>x</b>'] });
    expect(root.querySelector('b')).toBeNull();
    expect(root.textContent).toContain('<b>x</b>');
  });

  it('binding only touches controls inside its root', () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="gap" type="text" />');
    const { state } = mount('gap', {});
    const outside = document.body.lastElementChild as HTMLInputElement;
    outside.value = 'nope';
    outside.dispatchEvent(new Event('input'));
    expect(buildAnswer(state)).toBeNull();
  });
});
