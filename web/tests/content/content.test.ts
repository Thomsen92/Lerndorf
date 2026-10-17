import { describe, it, expect } from 'vitest';
import { toRows, validateWeek, type WeekSpec } from '../../scripts/content.ts';

const valid = {
  week: '2026-11-09',
  class: null,
  tasks: [
    {
      id: 'v01',
      type: 'choice',
      reward: 5,
      prompt: "What is 'Fahrkarte'?",
      options: ['ticket', 'card', 'map', 'fare'],
      solution: 'ticket',
    },
    { id: 'g01', type: 'gap', reward: 10, prompt: 'Yesterday we ___ to Brooklyn.', solution: ['went'] },
    {
      id: 'm01',
      type: 'match',
      reward: 15,
      prompt: 'Match',
      pairs: [
        ['subway', 'U-Bahn'],
        ['sidewalk', 'Gehweg'],
        ['block', 'Häuserblock'],
      ],
    },
    { id: 'o01', type: 'order', reward: 10, prompt: 'Order', solution: ['I', 'went', 'home'] },
  ],
};

describe('validateWeek', () => {
  it('accepts a valid week with all four task types', () => {
    expect(validateWeek(valid)).toEqual([]);
  });

  it('rejects a week that does not start on a Monday', () => {
    expect(validateWeek({ ...valid, week: '2026-11-10' })).toContain('week: muss ein Montag sein');
  });

  it('rejects a choice whose solution is not among the options', () => {
    const bad = structuredClone(valid);
    bad.tasks[0].solution = 'bus';
    expect(validateWeek(bad).join(' ')).toMatch(/muss in options stehen/);
  });

  it('rejects a duplicate task id', () => {
    const bad = structuredClone(valid);
    bad.tasks[1].id = 'v01';
    expect(validateWeek(bad).join(' ')).toMatch(/doppelt/);
  });

  it('rejects a reward that is not 5, 10 or 15', () => {
    const bad = structuredClone(valid);
    bad.tasks[0].reward = 7;
    expect(validateWeek(bad).join(' ')).toMatch(/reward/);
  });

  it('rejects an id with capitals or spaces', () => {
    const bad = structuredClone(valid);
    bad.tasks[0].id = 'V 01';
    expect(validateWeek(bad).join(' ')).toMatch(/Kleinbuchstaben/);
  });

  it('reports every problem with its position', () => {
    const errors = validateWeek({ week: 'x', class: '7c', tasks: [{ id: 'a', type: 'nope' }] });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('toRows', () => {
  it('never puts the solution into the public data', () => {
    const { tasks } = toRows(valid as WeekSpec);
    for (const t of tasks) {
      expect(JSON.stringify(t.data)).not.toContain('"solution"');
    }
    expect(tasks[0].data).toEqual({ options: ['ticket', 'card', 'map', 'fare'] });
  });

  it('prefixes the id with the week', () => {
    const { tasks, solutions } = toRows(valid as WeekSpec);
    expect(tasks[0].id).toBe('2026-11-09-v01');
    expect(solutions[0]).toEqual({ task_id: '2026-11-09-v01', solution: 'ticket' });
  });

  it('shuffles the order and the match columns so they do not give the answer away', () => {
    const { tasks } = toRows(valid as WeekSpec);
    const order = tasks.find((t) => t.type === 'order');
    expect(order?.data).toEqual({ words: ['home', 'went', 'I'] });
    const match = tasks.find((t) => t.type === 'match');
    expect(match?.data).toEqual({
      left: ['subway', 'sidewalk', 'block'],
      right: ['Häuserblock', 'Gehweg', 'U-Bahn'],
    });
  });
});
