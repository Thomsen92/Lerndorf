// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import {
  HOUSE_AREAS,
  createAreaController,
  createModalTracker,
  releaseInert,
  type AreaHandle,
} from '../../src/ui/areas';
import { openModal } from '../../src/ui/dialog';
import type { NavArea } from '../../src/ui/gameNav';

function setup(refuse: Partial<Record<NavArea, boolean>> = {}) {
  const handles: Record<string, AreaHandle & { close: ReturnType<typeof vi.fn> }> = {};
  const opener = (name: NavArea) => async (): Promise<AreaHandle | null> => {
    if (refuse[name]) return null;
    const h = { close: vi.fn() };
    handles[name] = h;
    return h;
  };
  const onChange = vi.fn();
  const ctl = createAreaController({
    openers: {
      aufgaben: opener('aufgaben'),
      haus: opener('haus'),
      shop: opener('shop'),
      inventar: opener('inventar'),
      bauen: opener('bauen'),
      profil: opener('profil'),
    },
    onChange,
  });
  return { ctl, handles, onChange };
}

describe('area controller', () => {
  it('starts on dorf', () => {
    expect(setup().ctl.current).toBe('dorf');
  });

  it('opens the house menu', async () => {
    const { ctl, handles, onChange } = setup();
    await ctl.select('haus');
    expect(ctl.current).toBe('haus');
    expect(handles.haus).toBeDefined();
    expect(onChange).toHaveBeenCalledWith('haus', 'dorf');
  });

  it('shop from haus closes the menu and opens the shop', async () => {
    const { ctl, handles, onChange } = setup();
    await ctl.select('haus');
    await ctl.select('shop');
    expect(handles.haus.close).toHaveBeenCalledTimes(1);
    expect(ctl.current).toBe('shop');
    expect(onChange).toHaveBeenLastCalledWith('shop', 'haus');
  });

  it('selecting the current area does nothing', async () => {
    const { ctl, handles, onChange } = setup();
    await ctl.select('shop');
    onChange.mockClear();
    await ctl.select('shop');
    expect(onChange).not.toHaveBeenCalled();
    expect(handles.shop.close).not.toHaveBeenCalled();
  });

  it('an opener resolving null keeps the previous area', async () => {
    const { ctl, handles, onChange } = setup({ haus: true });
    await ctl.select('shop');
    onChange.mockClear();
    await ctl.select('haus');
    expect(ctl.current).toBe('shop');
    expect(handles.shop.close).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dorf closes the current handle', async () => {
    const { ctl, handles, onChange } = setup();
    await ctl.select('haus');
    await ctl.select('dorf');
    expect(handles.haus.close).toHaveBeenCalledTimes(1);
    expect(ctl.current).toBe('dorf');
    expect(onChange).toHaveBeenLastCalledWith('dorf', 'haus');
  });

  it('open() re-enters bauen with arguments without closing the new handle', async () => {
    const { ctl, onChange } = setup();
    await ctl.select('bauen');
    const second = { close: vi.fn() };
    await ctl.open('bauen', async () => second);
    expect(second.close).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
    await ctl.select('haus');
    expect(second.close).toHaveBeenCalledTimes(1);
  });

  it('a slow opener that is overtaken is closed again', async () => {
    const { ctl } = setup();
    let release: (h: AreaHandle) => void = () => undefined;
    const slow = new Promise<AreaHandle>((r) => (release = r));
    const p = ctl.open('shop', () => slow);
    await ctl.select('dorf');
    const late = { close: vi.fn() };
    release(late);
    await p;
    expect(late.close).toHaveBeenCalledTimes(1);
    expect(ctl.current).toBe('dorf');
  });

  it('reports leaving the house areas for aufgaben and dorf (camera unlock)', async () => {
    const leave = async (target: NavArea) => {
      const { ctl, onChange } = setup();
      await ctl.select('haus');
      await ctl.select(target);
      const [area, previous] = onChange.mock.calls.at(-1) as [NavArea, NavArea];
      expect(HOUSE_AREAS.has(previous)).toBe(true);
      expect(HOUSE_AREAS.has(area)).toBe(false);
    };
    await leave('aufgaben');
    await leave('dorf');
  });

  it('HOUSE_AREAS has exactly the four house areas', () => {
    expect([...HOUSE_AREAS].sort()).toEqual(['bauen', 'haus', 'inventar', 'shop']);
  });
});

describe('modal tracker (logout teardown)', () => {
  it('closeAll closes open modals and lifts inert', () => {
    const app = document.createElement('div');
    document.body.append(app);
    const t = createModalTracker();
    const m = t.track(openModal({ title: 'Einstellungen' }));
    expect(app.hasAttribute('inert')).toBe(true);
    expect(t.anyOpen).toBe(true);
    t.closeAll();
    expect(m.isOpen).toBe(false);
    expect(app.hasAttribute('inert')).toBe(false);
    expect(t.anyOpen).toBe(false);
    app.remove();
  });

  it('releaseInert removes leftover inert attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('inert', '');
    document.body.append(el);
    releaseInert();
    expect(el.hasAttribute('inert')).toBe(false);
    el.remove();
  });
});
