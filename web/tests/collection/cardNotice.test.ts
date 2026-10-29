// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
const catalog = vi.hoisted(() => ({
  cards: [{ id: 'night-light', name: 'The Star' }],
}));
vi.mock('../../src/collection/catalog', () => ({
  collectionCatalog: async () => catalog,
  cardById: (source: { cards: Array<{ id: string; name: string }> }, id: string) =>
    source.cards.find((card) => card.id === id),
}));
import { announceCardGrants } from '../../src/collection/cardNotice';

afterEach(() => document.body.replaceChildren());

describe('card grant notice', () => {
  it('announces granted cards by name and removes itself on click', async () => {
    const notice = announceCardGrants(['night-light']);
    expect(notice.el.getAttribute('role')).toBe('status');
    expect(notice.el.getAttribute('aria-live')).toBe('polite');
    await Promise.resolve();
    await Promise.resolve();
    expect(notice.el.textContent).toContain('The Star');
    notice.el.click();
    expect(document.body.contains(notice.el)).toBe(false);
  });

  it('removes itself after the timeout', async () => {
    const notice = announceCardGrants(['night-light'], { timeoutMs: 10 });
    expect(notice.el.textContent).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(document.body.contains(notice.el)).toBe(false);
  });

  it('opens the reveal only when tapped, once', async () => {
    const onOpen = vi.fn();
    const notice = announceCardGrants(['night-light'], { onOpen });
    expect(onOpen).not.toHaveBeenCalled();
    expect(notice.el.textContent).toMatch(/Antippen|Tap/);
    notice.el.click();
    notice.el.click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('sits inline in a host and stays until tapped when the timeout is 0', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const notice = announceCardGrants(['night-light'], { host, timeoutMs: 0 });
    expect(notice.el.parentElement).toBe(host);
    expect(notice.el.classList.contains('card-gain-notice--inline')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(host.contains(notice.el)).toBe(true);
    notice.el.click();
    expect(host.contains(notice.el)).toBe(false);
  });
});
