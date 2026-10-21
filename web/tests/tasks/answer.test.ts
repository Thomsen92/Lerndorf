import { describe, it, expect } from 'vitest';
import { berlinToday, buildAnswer, stringList, wrongMessage } from '../../src/tasks/answer';

describe('buildAnswer', () => {
  it('choice needs a picked option', () => {
    expect(buildAnswer({ type: 'choice', picked: null })).toBeNull();
    expect(buildAnswer({ type: 'choice', picked: 'ticket' })).toBe('ticket');
  });

  it('gap trims the text and rejects an empty field', () => {
    expect(buildAnswer({ type: 'gap', text: '   ' })).toBeNull();
    expect(buildAnswer({ type: 'gap', text: '  went ' })).toBe('went');
  });

  it('match needs a right side for every left word', () => {
    expect(buildAnswer({ type: 'match', picks: { subway: 'U-Bahn', block: null } })).toBeNull();
    expect(buildAnswer({ type: 'match', picks: { subway: 'U-Bahn', block: 'Häuserblock' } })).toEqual([
      ['subway', 'U-Bahn'],
      ['block', 'Häuserblock'],
    ]);
  });

  it('order sends the sequence as chosen', () => {
    expect(buildAnswer({ type: 'order', sequence: [] })).toBeNull();
    expect(buildAnswer({ type: 'order', sequence: ['I', 'went'] })).toEqual(['I', 'went']);
  });
});

describe('helpers', () => {
  it('reads word lists from the task data and ignores other values', () => {
    expect(stringList({ options: ['a', 'b', 3] }, 'options')).toEqual(['a', 'b']);
    expect(stringList({}, 'options')).toEqual([]);
  });

  it('gives today in Berlin time, also around midnight', () => {
    // 2026-10-17 23:30 UTC is already 2026-10-18 in Berlin
    expect(berlinToday(new Date('2026-10-17T23:30:00Z'))).toBe('2026-10-18');
    expect(berlinToday(new Date('2026-10-17T10:00:00Z'))).toBe('2026-10-17');
  });

  it('tells the pupil how many attempts are left, in plain German', () => {
    expect(wrongMessage(2)).toBe('Leider falsch. Noch 2 Versuche.');
    expect(wrongMessage(1)).toBe('Leider falsch. Noch 1 Versuch.');
    expect(wrongMessage(0)).toMatch(/aufgebraucht/);
  });
});

describe('answerMode', () => {
  it('uses the task type directly and data.mode for listening', async () => {
    const { answerMode } = await import('../../src/tasks/answer');
    expect(answerMode('listening', { mode: 'gap' })).toBe('gap');
    expect(answerMode('listening', { mode: 'choice' })).toBe('choice');
    expect(answerMode('match', {})).toBe('match');
  });
});
