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

let rpcResult: Promise<{ error: { message: string } | null }>;
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
  mode = new BuildMode({
    scene: new THREE.Scene(),
    plot,
    supabase: fakeSupabase(),
    uid: 'u1',
    onSlots,
  });
});
afterEach(() => mode.dispose());

describe('build bar', () => {
  it('lists seven slots and selects one by button', async () => {
    await mode.enter();
    const names = ['Haus', 'Garage', 'Auto-Platz', 'Deko-Platz 1', 'Deko-Platz 2', 'Deko-Platz 3', 'Deko-Platz 4'];
    for (const n of names) expect(btn(n)).toBeTruthy();
    expect(btn('Deko-Platz 1').textContent).toContain('Gartenbank');
    btn('Deko-Platz 2').click();
    expect(document.querySelector('.build-info')?.textContent).toContain('Deko-Platz 2');
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

  it('Speichern twice quickly calls the RPC once', async () => {
    let resolve!: (v: { error: null }) => void;
    rpcResult = new Promise((r) => (resolve = r));
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Drehen').click();
    const save = btn('Speichern');
    save.click();
    save.click();
    expect(btn('Speichern').disabled).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('place_in_slot', { p_item_id: 'deco_cat_sign', p_slot: 'deco_2', p_rot: 1 });
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 1 });
    resolve({ error: null });
    await flush();
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 1 });
  });

  it('Abbrechen restores the saved map', async () => {
    await mode.enter();
    btn('Deko-Platz 2').click();
    btn('Katzenschild').click();
    btn('Abbrechen').click();
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
    btn('Speichern').click();
    await flush();
    expect(document.querySelector('.build-bar')?.textContent).toContain('Das Bauen ist gerade geschlossen.');
    expect(btn('Speichern').disabled).toBe(false);
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
    rpcResult = Promise.resolve({ error: null });
    btn('Speichern').click();
    await flush();
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('enter with an item preselects the free deco slot', async () => {
    await mode.enter({ itemId: 'deco_cat_sign' });
    expect(document.querySelector('.build-info')?.textContent).toContain('Deko-Platz 2');
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hand-over item with one copy previews only while a copy is free', async () => {
    await mode.enter({ itemId: 'deco_cat_sign' });
    btn('Speichern').click();
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 0 });
    await flush();
    onSlots.mockClear();
    btn('Deko-Platz 3').click();
    for (const c of onSlots.mock.calls) expect(c[0].deco_3).toBeUndefined();
    expect(btn('Speichern').disabled).toBe(true);
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
    btn('Speichern').click();
    mode.exit();
    placements.push({ item_id: 'deco_cat_sign', slot: 'deco_2', rot: 0 });
    resolve({ error: null });
    await flush();
    expect(lastSlots().deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 0 });
  });
});
