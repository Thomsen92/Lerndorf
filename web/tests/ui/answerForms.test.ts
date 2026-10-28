// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  afterWrong,
  answerForm,
  bindAnswerForm,
  emptyState,
  needsCheck,
  type AnswerFormSpec,
} from '../../src/ui/answerForms';
import { buildAnswer, type AnswerState, type TaskType } from '../../src/tasks/answer';

let root: HTMLElement;

interface Mounted {
  spec: AnswerFormSpec;
  state: () => AnswerState;
  redraws: () => number;
  readies: () => unknown[];
  wrong: () => void;
}

/** Renders the form like an area does, re-renders it on request and records every „ready“. */
function mount(type: TaskType, data: Record<string, unknown>): Mounted {
  const spec = { type, data };
  let state = emptyState(spec);
  let count = 0;
  const sent: unknown[] = [];
  const draw = (): void => {
    root.innerHTML = answerForm(spec, state);
    bindAnswerForm(
      root,
      spec,
      state,
      () => {
        count++;
        draw();
      },
      () => sent.push(buildAnswer(state)),
    );
  };
  draw();
  return {
    spec,
    state: () => state,
    redraws: () => count,
    readies: () => sent,
    wrong: () => {
      state = afterWrong(spec, state);
      draw();
    },
  };
}

const tap = (selector: string): void => root.querySelector<HTMLButtonElement>(selector)?.click();

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root') as HTMLElement;
});

describe('one-tap answer forms', () => {
  it('never renders dropdowns, radio buttons or checkboxes', () => {
    const forms: Array<[TaskType, Record<string, unknown>]> = [
      ['choice', { options: ['a', 'b'] }],
      ['gap', { bank: ['went', 'go'] }],
      ['match', { left: ['cow', 'horse'], right: ['Pferd', 'Kuh'] }],
      ['order', { words: ['the', 'cat'] }],
    ];
    for (const [type, data] of forms) {
      mount(type, data);
      expect(root.querySelector('select, input[type=radio], input[type=checkbox]')).toBeNull();
      expect(needsCheck({ type, data })).toBe(false);
    }
  });

  it('choice: one tap on a tile is the answer and sends it', () => {
    const m = mount('choice', { options: ['apple', 'chair', 3] });
    expect(root.querySelectorAll('[data-pick]').length).toBe(2);
    tap('[data-pick="chair"]');
    expect(m.readies()).toEqual(['chair']);
  });

  it('choice: a wrongly tapped tile stays greyed out for the next try', () => {
    const m = mount('choice', { options: ['card', 'ticket', 'map'] });
    tap('[data-pick="card"]');
    m.wrong();
    const card = root.querySelector<HTMLButtonElement>('[data-pick="card"]') as HTMLButtonElement;
    expect(card.disabled).toBe(true);
    expect(card.classList.contains('wrong')).toBe(true);
    tap('[data-pick="ticket"]');
    expect(m.readies()).toEqual(['card', 'ticket']);
  });

  it('gap with word bank: one tap fills the gap and sends it', () => {
    const m = mount('gap', { bank: ['went', 'go', 'gone'] });
    expect(root.querySelector('#gap')).toBeNull();
    tap('[data-pick="went"]');
    expect(m.readies()).toEqual(['went']);
  });

  it('gap without word bank (older content): text field and a check button', () => {
    const m = mount('gap', {});
    expect(needsCheck(m.spec)).toBe(true);
    const input = root.querySelector<HTMLInputElement>('#gap') as HTMLInputElement;
    expect(input.getAttribute('autocapitalize')).toBe('off');
    input.value = '  reads ';
    input.dispatchEvent(new Event('input'));
    expect(buildAnswer(m.state())).toBe('reads');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(m.readies()).toEqual(['reads']);
  });

  it('match: tap left, tap right makes a pair; the last pair sends the answer', () => {
    const m = mount('match', { left: ['cow', 'horse'], right: ['Pferd', 'Kuh'] });
    tap('[data-left="cow"]');
    expect(root.querySelector('[data-left="cow"]')?.classList.contains('active')).toBe(true);
    tap('[data-right="Kuh"]');
    expect(root.querySelector('[data-right="Kuh"]')?.className).toContain('pair-0');
    expect(m.readies()).toEqual([]);
    // right side first works too
    tap('[data-right="Pferd"]');
    tap('[data-left="horse"]');
    expect(m.readies()).toEqual([
      [
        ['cow', 'Kuh'],
        ['horse', 'Pferd'],
      ],
    ]);
  });

  it('match: tapping a pair undoes it, a wrong answer starts again', () => {
    const m = mount('match', { left: ['cow', 'horse'], right: ['Pferd', 'Kuh'] });
    tap('[data-left="cow"]');
    tap('[data-right="Pferd"]');
    tap('[data-left="cow"]');
    expect(buildAnswer(m.state())).toBeNull();
    expect(root.querySelector('.paired')).toBeNull();
    tap('[data-left="cow"]');
    tap('[data-right="Pferd"]');
    tap('[data-left="horse"]');
    tap('[data-right="Kuh"]');
    expect(m.readies()).toHaveLength(1);
    m.wrong();
    expect(root.querySelector('.paired')).toBeNull();
  });

  it('order: tapped words build the sentence, a placed word goes back, the last word sends', () => {
    const m = mount('order', { words: ['cat', 'the', 'sees', 'the'] });
    tap('[data-word="1"]');
    tap('[data-word="0"]');
    expect(buildAnswer(m.state())).toEqual(['the', 'cat']);
    expect(root.querySelector('.order-sentence')?.textContent).toContain('the');
    tap('[data-placed="1"]'); // „cat“ back into the bank
    expect(buildAnswer(m.state())).toEqual(['the']);
    tap('[data-word="0"]');
    tap('[data-word="2"]');
    expect(m.readies()).toEqual([]);
    tap('[data-word="3"]'); // the second „the“ is its own tile
    expect(m.readies()).toEqual([['the', 'cat', 'sees', 'the']]);
    m.wrong();
    expect(buildAnswer(m.state())).toBeNull();
    expect(root.querySelectorAll('[data-word]').length).toBe(4);
  });

  it('escapes the task data', () => {
    mount('choice', { options: ['<b>x</b>'] });
    expect(root.querySelector('b')).toBeNull();
    expect(root.textContent).toContain('<b>x</b>');
  });

  it('binding only touches controls inside its root', () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="gap" type="text" />');
    const m = mount('gap', {});
    const outside = document.body.lastElementChild as HTMLInputElement;
    outside.value = 'nope';
    outside.dispatchEvent(new Event('input'));
    expect(buildAnswer(m.state())).toBeNull();
  });
});
