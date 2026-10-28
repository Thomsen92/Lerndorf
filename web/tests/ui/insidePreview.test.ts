// @vitest-environment happy-dom
// DEEPSEEK_WHATS_INSIDE_3D: every chest item is one big button that opens a large 3D view;
// Escape closes the view before the list, focus and scroll return, nothing is granted or bought.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openInside } from '../../src/ui/learnpass/insideModal';
import type { Item3dView, Item3dViewFactory } from '../../src/ui/item3dPreview';
import type { PoolItem } from '../../src/api/season';
import { setLocale } from '../../src/i18n';

const POOL: PoolItem[] = [
  { id: 'season_warlock', kind: 'deco', rarity: 'legendary', sell: 250 },
  { id: 'season_house_horror', kind: 'house', rarity: 'legendary', sell: 250 },
  { id: 'season_dodge', kind: 'car', rarity: 'epic', sell: 100 },
  { id: 'season_bat', kind: 'deco', rarity: 'common', sell: 15 },
];

interface FakeView extends Item3dView {
  loads: Array<{ kind: string; id: string; resolve: () => void; reject: (e: Error) => void }>;
  disposed: boolean;
}
function fakeFactory() {
  const views: FakeView[] = [];
  const factory: Item3dViewFactory = () => {
    const view: FakeView = {
      loads: [],
      disposed: false,
      load(kind, id) {
        return new Promise<void>((resolve, reject) => view.loads.push({ kind, id, resolve, reject }));
      },
      reset: vi.fn(),
      dispose() {
        view.disposed = true;
      },
    };
    views.push(view);
    return view;
  };
  return { factory, views };
}
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};
const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const items = () => [...document.querySelectorAll<HTMLButtonElement>('.inside-item')];
const preview = () => document.querySelector<HTMLElement>('.item3d');

beforeEach(() => setLocale('en'));
afterEach(() => document.body.replaceChildren());

describe('what is inside: 3D view', () => {
  it('makes picture and name one button with a clear accessible name', async () => {
    const { factory } = fakeFactory();
    openInside(document.body, { pool: POOL, createView: factory });
    await settle();
    expect(items()).toHaveLength(4);
    expect(items()[0].getAttribute('aria-label')).toBe('View Warlock in 3D');
    expect(items()[0].querySelector('.inside-box')).not.toBeNull();
    expect(items()[0].textContent).toContain('Warlock');
    expect(document.querySelectorAll('.inside-items figure')).toHaveLength(0);
  });

  it('opens a large view of the tapped item and loads only that model', async () => {
    const { factory, views } = fakeFactory();
    openInside(document.body, { pool: POOL, createView: factory });
    await settle();
    items()[2].click();
    expect(preview()).not.toBeNull();
    expect(preview()!.textContent).toContain('Pickup truck');
    expect(preview()!.textContent).toContain('Epic');
    expect(views).toHaveLength(1);
    expect(views[0].loads.map((l) => [l.kind, l.id])).toEqual([['car', 'season_dodge']]);
    expect(document.querySelector<HTMLElement>('.inside-bands')!.hidden).toBe(true);
    expect(preview()!.querySelector('.item3d-status')!.textContent).toMatch(/Loading/);
    views[0].loads[0].resolve();
    await settle();
    expect(preview()!.querySelector<HTMLElement>('.item3d-status')!.hidden).toBe(true);
  });

  it('closes the view with the first Escape and the list with the second, returning focus', async () => {
    const onClose = vi.fn();
    const { factory, views } = fakeFactory();
    openInside(document.body, { pool: POOL, createView: factory, onClose });
    await settle();
    const dialog = document.querySelector<HTMLElement>('.inside-dialog')!;
    dialog.scrollTop = 120;
    items()[1].click();
    escape();
    expect(preview()).toBeNull();
    expect(views[0].disposed).toBe(true);
    expect(document.querySelector('.inside-overlay')).not.toBeNull();
    expect(document.activeElement).toBe(items()[1]);
    expect(dialog.scrollTop).toBe(120);
    expect(onClose).not.toHaveBeenCalled();
    escape();
    expect(document.querySelector('.inside-overlay')).toBeNull();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('lets the pupil open another item after Back, with a fresh view each time', async () => {
    const { factory, views } = fakeFactory();
    openInside(document.body, { pool: POOL, createView: factory });
    await settle();
    items()[0].click();
    preview()!.querySelector<HTMLButtonElement>('.item3d-back')!.click();
    items()[3].click();
    expect(views).toHaveLength(2);
    expect(views[0].disposed).toBe(true);
    expect(views[1].loads[0].id).toBe('season_bat');
    // A late answer of the closed view changes nothing in the new one.
    views[0].loads[0].resolve();
    await settle();
    expect(preview()!.textContent).toContain('Bat');
    expect(preview()!.querySelector<HTMLElement>('.item3d-status')!.hidden).toBe(false);
  });

  it('shows a retry when the model cannot load, with name and back still usable', async () => {
    const { factory, views } = fakeFactory();
    openInside(document.body, { pool: POOL, createView: factory });
    await settle();
    items()[0].click();
    views[0].loads[0].reject(new Error('404'));
    await settle();
    expect(preview()!.querySelector('.item3d-status')!.textContent).toMatch(/could not/);
    const retry = preview()!.querySelector<HTMLButtonElement>('.item3d-retry')!;
    retry.click();
    expect(views[0].loads).toHaveLength(2);
    expect(preview()!.querySelector('.item3d-back')).not.toBeNull();
  });

  it('works without WebGL and leaves nothing behind after many openings', async () => {
    openInside(document.body, { pool: POOL, createView: () => null });
    await settle();
    items()[0].click();
    expect(preview()!.textContent).toMatch(/not available/);
    escape();
    const { factory, views } = fakeFactory();
    document.body.replaceChildren();
    const handle = openInside(document.body, { pool: POOL, createView: factory });
    await settle();
    for (let i = 0; i < 20; i++) {
      items()[i % 4].click();
      escape();
    }
    expect(views).toHaveLength(20);
    expect(views.every((v) => v.disposed)).toBe(true);
    expect(document.querySelectorAll('.item3d')).toHaveLength(0);
    items()[0].click();
    handle.close();
    expect(views[20].disposed).toBe(true);
    expect(document.querySelector('.inside-overlay')).toBeNull();
  });

  it('offers a reset view button for the active model', async () => {
    const { factory, views } = fakeFactory();
    openInside(document.body, { pool: POOL, createView: factory });
    await settle();
    items()[0].click();
    preview()!.querySelector<HTMLButtonElement>('.item3d-reset')!.click();
    expect(views[0].reset).toHaveBeenCalledOnce();
  });
});
