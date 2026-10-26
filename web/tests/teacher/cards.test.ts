// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { decodeLogin } from '../../src/auth/qrLogin';
const payloads = vi.hoisted(() => [] as string[]);
vi.mock('qrcode-generator', async (original) => {
  const real = await original<{ default: typeof import('qrcode-generator') }>();
  return {
    default: (...args: Parameters<typeof real.default>) => {
      const qr = real.default(...args),
        add = qr.addData;
      qr.addData = (value, mode) => {
        payloads.push(value);
        add(value, mode);
      };
      return qr;
    },
  };
});
import { renderCards, rememberCard, sessionCards, clearCards } from '../../src/teacher/cards';
it('prints a QR for each card and replaces outdated passwords without persisting them', () => {
  const card = renderCards(
    [
      { nickname: 'anna', password: 'abc&ä', classId: '8a' },
      { nickname: 'ben', password: 'secret', classId: '8a' },
    ],
    'https://example.org/',
  );
  expect(card.querySelectorAll('svg')).toHaveLength(2);
  expect(decodeLogin(new URL(payloads[0]).hash)).toEqual({ nickname: 'anna', password: 'abc&ä' });
  expect(card.textContent).toContain('Bei Verlust: Passwort zurücksetzen.');
  rememberCard({ nickname: 'anna', password: 'old', classId: '8a' });
  rememberCard({ nickname: 'anna', password: 'new', classId: '8a' });
  expect(sessionCards).toHaveLength(1);
  expect(sessionCards[0].password).toBe('new');
  clearCards();
  expect(sessionCards).toHaveLength(0);
});
