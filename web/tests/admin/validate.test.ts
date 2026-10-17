import { describe, it, expect } from 'vitest';
import {
  loginEmail,
  nextFreePlot,
  nicknameError,
  parseBulkLines,
  passwordError,
} from '../../../supabase/functions/admin-accounts/validate';

describe('nickname rule', () => {
  it.each(['anna', 'Fuchs17', 'Mo_Star', 'abc', 'abcdefghijklmnop'])('accepts %s', (n) => {
    expect(nicknameError(n)).toBeNull();
  });

  it.each(['ab', 'abcdefghijklmnopq', 'Jörg', 'Max Mustermann', 'a-b', ''])('rejects %j', (n) => {
    expect(nicknameError(n)).not.toBeNull();
  });
});

describe('password rule', () => {
  it('needs at least 6 characters', () => {
    expect(passwordError('hund4')).not.toBeNull();
    expect(passwordError('hund42')).toBeNull();
  });

  it('rejects more than 72 characters', () => {
    expect(passwordError('x'.repeat(73))).not.toBeNull();
  });
});

describe('login address', () => {
  it('is lower-cased so login ignores case', () => {
    expect(loginEmail('Fuchs17')).toBe('fuchs17@lerndorf.local');
  });
});

describe('bulk list', () => {
  it('parses valid lines and skips empty ones (CRLF too)', () => {
    const text = 'anna;hund42;8a\r\n\r\nben;katze99;8b\n';
    const { rows, errors } = parseBulkLines(text);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { nickname: 'anna', password: 'hund42', classId: '8a' },
      { nickname: 'ben', password: 'katze99', classId: '8b' },
    ]);
  });

  it('reports bad lines with their line number and returns no rows for them', () => {
    const text = 'anna;hund42;8a\nJörg;hund42;8a\nmax;kurz;8a\nlea;hund42;7c\nzu;viel';
    const { rows, errors } = parseBulkLines(text);
    expect(rows.map((r) => r.nickname)).toEqual(['anna']);
    expect(errors).toHaveLength(4);
    expect(errors[0]).toMatch(/Zeile 2/);
    expect(errors[1]).toMatch(/Zeile 3/);
    expect(errors[2]).toMatch(/Zeile 4/);
    expect(errors[3]).toMatch(/Zeile 5/);
  });

  it('rejects the same nickname twice, ignoring case', () => {
    const { errors } = parseBulkLines('anna;hund42;8a\nAnna;katze99;8a');
    expect(errors.some((e) => /doppelt/.test(e))).toBe(true);
  });
});

describe('plot index', () => {
  it('takes the smallest free index', () => {
    expect(nextFreePlot([])).toBe(0);
    expect(nextFreePlot([0, 1, 3])).toBe(2);
    expect(nextFreePlot([0, 1, 2])).toBe(3);
  });
});
