// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { openNoticeCard, noticeSeenKey } from '../../src/ui/noticeCard';
it('shows literal text, remembers acknowledgement and tolerates unavailable storage', () => {
  const n = { text: '<b>Hello</b>', validUntil: '2026-11-02', createdAt: 'one' },
    data = new Map<string, string>();
  const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
    },
    done = vi.fn();
  const card = openNoticeCard(n, { store, onDone: done })!;
  expect(card.body.textContent).toContain('<b>Hello</b>');
  expect(card.body.querySelector('b')).toBeNull();
  card.body.querySelector('button')!.click();
  expect(data.get(noticeSeenKey(n))).toBe('1');
  expect(done).toHaveBeenCalled();
  expect(openNoticeCard(n, { store, onDone: done })).toBeNull();
  const throwing = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  const second = openNoticeCard(n, { store: throwing, onDone: done });
  expect(second).not.toBeNull();
  second?.close();
});
