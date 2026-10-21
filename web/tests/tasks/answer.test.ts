import { describe, it, expect } from 'vitest';
import { buildAnswer, stringList } from '../../src/tasks/answer';

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
});

describe('answerMode', () => {
  it('uses the task type directly and data.mode for listening', async () => {
    const { answerMode } = await import('../../src/tasks/answer');
    expect(answerMode('listening', { mode: 'gap' })).toBe('gap');
    expect(answerMode('listening', { mode: 'choice' })).toBe('choice');
    expect(answerMode('match', {})).toBe('match');
  });
});
