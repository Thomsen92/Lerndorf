// @vitest-environment happy-dom
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuildMode } from '../../src/render/buildMode';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plot } from '../../src/world/layout';
import type { SlotMap } from '../../src/api/build';

const ITEMS = [
  { id: 'house_fachwerk', kind: 'house', name_de: 'Fachwerkhaus', starter: true },
  { id: 'garage_holz', kind: 'garage', name_de: 'Holzgarage', starter: true },
  { id: 'deco_cat_sign', kind: 'deco', name_de: 'Katzenschild', starter: false },
  { id: 'deco_bench', kind: 'deco', name_de: 'Gartenbank', starter: false },
];
const INV = [
  { item_id: 'deco_cat_sign', qty: 1 },
  { item_id: 'deco_bench', qty: 1 },
];

let rpcResult: Promise<{ error: { message: string } | null; data?: unknown }>;
let rpc: ReturnType<typeof vi.fn>;
let placements: Array<{ item_id: string; slot: string; rot: number }>;

function fakeSupabase(): SupabaseClient {
  const done = <T>(data: T) => Promise.resolve({ data, error: null });
  rpc = vi.fn(() => rpcResult);
  return {
    rpc,
    from: () => ({
      select: () => ({
        in: () => done(ITEMS),
        gt: () => done(INV),
        eq: () => done(placements),
        then: undefined,
      }),
    }),
  } as unknown as SupabaseClient;
}

const plot = { x: 0, z: 0, h: 0, face: 0 } as unknown as Plot;
let onSlots: ReturnType<typeof vi.fn>;
let onFx: ReturnType<typeof vi.fn>;
let mode: BuildMode;

const btn = (label: string): HTMLButtonElement => {
  const b = Array.from(document.querySelectorAll<HTMLButtonElement>('.build-bar button')).find((x) =>
    (x.textContent ?? '').startsWith(label),
  );
  if (!b) throw new Error(`button ${label} not found`);
  return b;
};
const lastSlots = (): SlotMap => onSlots.mock.calls[onSlots.mock.calls.length - 1][0];
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  document.body.innerHTML = '';
  placements = [{ item_id: 'deco_bench', slot: 'deco_1', rot: 0 }];
  rpcResult = Promise.resolve({ error: null });
  onSlots = vi.fn();
  onFx = vi.fn();
  mode = new BuildMode({
    scene: new THREE.Scene(),
    plot,
    supabase: fakeSupabase(),
    uid: 'u1',
    onSlots,
    onFx,
  });
});
afterEach(() => mode.dispose());

describe('build bar', () => {
  it('forwards only confirmed placement XP to the progression loop', async () => {
    mode.dispose();
    const onProgress = vi.fn();
    mode = new BuildMode({ scene: new THREE.Scene(), plot, supabase: fakeSupabase(), uid: 'u1', onProgress });
    const delta = {
      gained: [{ reason: 'first_place', xp: 10 }],
      xp: 10,
      level: 1,
      level_before: 1,
      new_chests: 0,
    };
    rpcResult = Promise.resolve({ data: { ok: true, progress: delta }, error: null });
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Aufstellen').click();
    await flush();
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ xp: 10, levelBefore: 1 }));
    expect(onProgress).toHaveBeenCalledTimes(1);
  });
  it('opens a non-modal sheet, loads thumbnails and returns keyboard focus', async () => {
    mode.dispose();
    const onSheet = vi.fn(),
      scene = new THREE.Scene();
    mode = new BuildMode({
      scene,
      plot,
      supabase: fakeSupabase(),
      uid: 'u1',
      onSlots,
      onSheet,
      thumbs: async () => 'data:image/png;base64,AA==',
    });
    await mode.enter();
    expect(onSheet).not.toHaveBeenCalled();
    expect(scene.children[0].children.filter((o) => o.userData.slotFrame)).toHaveLength(7);
    btn('Deko-Platz 2').click();
    expect(mode.sheetOpen).toBe(true);
    expect(onSheet).toHaveBeenLastCalledWith(true);
    expect(document.activeElement?.tagName).toBe('H2');
    expect(document.querySelector('.build-bar--sheet [role="region"]')).toBeTruthy();
    expect(btn('Gartenbank').disabled).toBe(true);
    expect(btn('Gartenbank').textContent).toContain('alle aufgestellt');
    expect(btn('Katzenschild').textContent).toContain('frei: 1');
    await flush();
    expect(btn('Katzenschild').querySelector('img')?.alt).toBe('');
    btn('Katzenschild').click();
    document
      .querySelector('.build-bar')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(mode.sheetOpen).toBe(false);
    expect(onSheet).toHaveBeenLastCalledWith(false);
    expect(document.activeElement).toBe(btn('Deko-Platz 2'));
    expect(lastSlots().deco_2).toBeUndefined();
  });
  it('offers the shop when no owned item fits', async () => {
    mode.dispose();
    const onShop = vi.fn();
    mode = new BuildMode({ scene: new THREE.Scene(), plot, supabase: fakeSupabase(), uid: 'u1', onShop });
    await mode.enter();
    btn('Auto-Platz').click();
    expect(document.body.textContent).toContain('Du hast dafür noch nichts.');
    btn('Zum Shop').click();
    expect(onShop).toHaveBeenCalledOnce();
    expect(document.querySelector('#clear')).toBeNull();
    expect(document.querySelector('#rot')).toBeNull();
  });
  it('emits place and turn after server state, removal before it, and no effect for failures', async () => {
    mode.dispose();
    const onFx = vi.fn();
    mode = new BuildMode({
      scene: new THREE.Scene(),
      plot,
      supabase: fakeSupabase(),
      uid: 'u1',
      onSlots,
      onFx,
    });
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    rpcResult = Promise.resolve({ error: { message: 'building is closed' } });
    btn('Aufstellen').click();
    await flush();
    expect(onFx).not.toHaveBeenCalled();
    rpcResult = Promise.resolve({ error: null });
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 0 });
    btn('Aufstellen').click();
    await flush();
    expect(onFx).toHaveBeenLastCalledWith({ type: 'place', slot: 'deco_2', kind: 'deco' });
    expect(onFx.mock.invocationCallOrder.at(-1)).toBeGreaterThan(onSlots.mock.invocationCallOrder.at(-1)!);
    expect(document.body.textContent).toContain('Aufgestellt!');
    btn('Drehen').click();
    placements[1].rot = 1;
    btn('Aufstellen').click();
    await flush();
    expect(onFx).toHaveBeenLastCalledWith({ type: 'turn', slot: 'deco_2', kind: 'deco' });
    expect(document.body.textContent).toContain('Gedreht.');
    onFx.mockClear();
    rpcResult = Promise.resolve({ error: { message: 'building is closed' } });
    btn('Wegräumen').click();
    await flush();
    expect(onFx).not.toHaveBeenCalled();
    rpcResult = Promise.resolve({ error: null });
    placements.pop();
    btn('Wegräumen').click();
    await flush();
    expect(onFx).toHaveBeenLastCalledWith({ type: 'remove', slot: 'deco_2', kind: 'deco' });
    expect(onFx.mock.invocationCallOrder.at(-1)).toBeLessThan(onSlots.mock.invocationCallOrder.at(-1)!);
  });
  it('lists seven slots and selects one by button', async () => {
    await mode.enter();
    const names = [
      'Haus',
      'Garage',
      'Auto-Platz',
      'Deko-Platz 1',
      'Deko-Platz 2',
      'Deko-Platz 3',
      'Deko-Platz 4',
    ];
    for (const n of names) expect(btn(n)).toBeTruthy();
    expect(btn('Deko-Platz 1').textContent).toContain('Gartenbank');
    btn('Deko-Platz 2').click();
    expect(document.querySelector('h2')?.textContent).toContain('Deko-Platz 2');
  });

  it('previews a chosen item without saving', async () => {
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
    expect(document.querySelector('.build-bar')?.textContent).toContain('Vorschau – noch nicht gespeichert');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('Drehen only changes the preview', async () => {
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Drehen').click();
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 1 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('Aufstellen twice quickly calls the RPC once', async () => {
    let resolve!: (v: { error: null }) => void;
    rpcResult = new Promise((r) => (resolve = r));
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Drehen').click();
    const save = btn('Aufstellen');
    save.click();
    save.click();
    expect(btn('Aufstellen').disabled).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('place_in_slot', {
      p_item_id: 'deco_cat_sign',
      p_slot: 'deco_2',
      p_rot: 1,
    });
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 1 });
    resolve({ error: null });
    await flush();
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 1 });
  });

  it('Zurück restores the saved map', async () => {
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Zurück').click();
    expect(lastSlots()).toEqual({ deco_1: { itemId: 'deco_bench', rot: 0 } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('exit with a pending preview restores the saved map', async () => {
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    mode.exit();
    expect(lastSlots()).toEqual({ deco_1: { itemId: 'deco_bench', rot: 0 } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps the preview and shows the reason when saving fails', async () => {
    rpcResult = Promise.resolve({ error: { message: 'building is closed' } });
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Aufstellen').click();
    await flush();
    expect(document.querySelector('.build-bar')?.textContent).toContain('Das Bauen ist gerade geschlossen.');
    expect(btn('Aufstellen').disabled).toBe(false);
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
    rpcResult = Promise.resolve({ error: null });
    btn('Aufstellen').click();
    await flush();
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('enter with an item preselects the free deco slot', async () => {
    await mode.enter({ itemId: 'deco_cat_sign' });
    expect(document.querySelector('h2')?.textContent).toContain('Deko-Platz 2');
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hand-over item with one copy previews only while a copy is free', async () => {
    await mode.enter({ itemId: 'deco_cat_sign' });
    btn('Aufstellen').click();
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 0 });
    await flush();
    onSlots.mockClear();
    btn('Zurück').click();
    btn('Deko-Platz 3').click();
    for (const c of onSlots.mock.calls) expect(c[0].deco_3).toBeUndefined();
    expect(btn('Aufstellen').disabled).toBe(true);
  });

  it('enter with an item whose only copy is placed shows no preview', async () => {
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_3', rot: 0 });
    await mode.enter({ itemId: 'deco_cat_sign' });
    expect(onSlots).not.toHaveBeenCalled();
    expect(document.querySelector('.build-bar')?.textContent).not.toContain('Vorschau');
  });

  it('a save that finishes after exit still shows the server state', async () => {
    let resolve!: (v: { error: null }) => void;
    rpcResult = new Promise((r) => (resolve = r));
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Aufstellen').click();
    mode.exit();
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 0 });
    resolve({ error: null });
    await flush();
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
    expect(onFx).not.toHaveBeenCalled();
  });
});

describe('build bar: ruin and guided tutorial placement', () => {
  it('an empty house slot (ruin) is shown as empty, not as an item', async () => {
    await mode.enter();
    expect(btn('Haus').textContent).toContain('leer');
    expect(document.querySelector('.build-bar')?.textContent).not.toContain('ruin');
    btn('Haus').click();
    expect(document.querySelector('.build-info')?.textContent).toContain('Noch leer');
  });

  it('guided: only the house slot, the house item and one confirm button; saves via the tutorial call', async () => {
    INV.push({ item_id: 'house_fachwerk', qty: 1 });
    ITEMS[0].starter = false;
    try {
      const place = vi.fn().mockResolvedValue({ ok: true });
      const onPlaced = vi.fn();
      await mode.enter({
        guided: {
          itemId: 'house_fachwerk',
          slotId: 'house',
          place,
          onPlaced,
          hint: 'Tipp',
          button: 'Haus hinstellen',
        },
      });
      const bar = document.querySelector('.build-bar') as HTMLElement;
      expect(bar.classList.contains('build-bar--guided')).toBe(true);
      expect(bar.querySelectorAll('[data-slot]').length).toBe(1);
      expect(bar.textContent).not.toContain('Fertig');
      expect(bar.textContent).not.toContain('Wegräumen');
      const item = btn('Fachwerkhaus');
      expect(item.classList.contains('tutorial-highlight')).toBe(true);
      expect(btn('Haus hinstellen').disabled).toBe(true);
      item.click();
      expect(lastSlots().house?.itemId).toBe('house_fachwerk');
      expect(btn('Haus hinstellen').disabled).toBe(false);
      // after the server confirmed, the plot shows the reloaded server state
      placements = [{ item_id: 'house_fachwerk', slot: 'house', rot: 0 }];
      btn('Haus hinstellen').click();
      await flush();
      await flush();
      expect(place).toHaveBeenCalledTimes(1);
      expect(rpc).not.toHaveBeenCalled(); // never place_in_slot
      expect(onPlaced).toHaveBeenCalledTimes(1);
      expect(onFx).toHaveBeenLastCalledWith({ type: 'place', slot: 'house', kind: 'house' });
      expect(lastSlots().house?.itemId).toBe('house_fachwerk');
    } finally {
      INV.pop();
      ITEMS[0].starter = true;
    }
  });

  it('guided: an error keeps the preview and the button usable', async () => {
    INV.push({ item_id: 'house_fachwerk', qty: 1 });
    ITEMS[0].starter = false;
    try {
      const place = vi.fn().mockResolvedValue({ ok: false, message: 'Bitte noch einmal versuchen.' });
      const onPlaced = vi.fn();
      await mode.enter({
        guided: {
          itemId: 'house_fachwerk',
          slotId: 'house',
          place,
          onPlaced,
          hint: 'Tipp',
          button: 'Haus hinstellen',
        },
      });
      btn('Fachwerkhaus').click();
      btn('Haus hinstellen').click();
      await flush();
      expect(onPlaced).not.toHaveBeenCalled();
      expect(document.querySelector('.build-info')?.textContent).toContain('Bitte noch einmal versuchen.');
      expect(btn('Haus hinstellen').disabled).toBe(false);
      expect(lastSlots().house?.itemId).toBe('house_fachwerk');
    } finally {
      INV.pop();
      ITEMS[0].starter = true;
    }
  });
});
