import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ItemEntry } from '../../src/api/items';
import { acquireSessionThumbs, createThumbSource, resetSessionThumbs } from '../../src/render/itemThumbs';

const entry = (id: string, over: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  kind: 'deco',
  nameDe: id,
  price: 1,
  starter: false,
  owned: 0,
  placedIn: [],
  free: 0,
  fits: ['deco_1'],
  ...over,
});

describe('createThumbSource', () => {
  it('renders an item once and shares the result', async () => {
    const render = vi.fn(() => 'data:a');
    const src = createThumbSource(render);
    const [a, b] = await Promise.all([src(entry('x')), src(entry('x'))]);
    expect(a).toBe('data:a');
    expect(b).toBe('data:a');
    await src(entry('x'));
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('renders strictly one at a time', async () => {
    const log: string[] = [];
    let release!: () => void;
    const render = vi.fn(async (_k: string, id: string) => {
      log.push(`start ${id}`);
      if (id === 'a') await new Promise<void>((r) => (release = r));
      log.push(`end ${id}`);
      return `data:${id}`;
    });
    const src = createThumbSource(render);
    const pa = src(entry('a'));
    const pb = src(entry('b'));
    await new Promise((r) => setTimeout(r, 5));
    expect(log).toEqual(['start a']);
    release();
    expect(await pa).toBe('data:a');
    expect(await pb).toBe('data:b');
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b']);
  });

  it('returns null for items without a model', async () => {
    const render = vi.fn(() => 'x');
    expect(await createThumbSource(render)(entry('hat', { kind: 'avatar', fits: [] }))).toBeNull();
    expect(render).not.toHaveBeenCalled();
  });

  it('does not cache failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const render = vi.fn<(k: string, id: string) => string>().mockImplementationOnce(() => {
      throw new Error('boom');
    });
    render.mockReturnValue('data:ok');
    const src = createThumbSource(render);
    expect(await src(entry('x'))).toBeNull();
    expect(await src(entry('x'))).toBe('data:ok');
    expect(render).toHaveBeenCalledTimes(2);
  });
});

describe('acquireSessionThumbs', () => {
  afterEach(() => resetSessionThumbs());
  const fake = () => {
    const dispose = vi.fn();
    const render = vi.fn(async (_k: string, id: string) => `data:${id}`);
    const factory = vi.fn(() => ({ render, dispose }));
    return { dispose, render, factory };
  };

  it('shares one renderer between acquirers and disposes it on the last release', async () => {
    const f = fake();
    const a = acquireSessionThumbs(f.factory);
    const b = acquireSessionThumbs(f.factory);
    await a.source(entry('x'));
    await b.source(entry('y'));
    expect(f.factory).toHaveBeenCalledTimes(1);
    a.release();
    a.release();
    expect(f.dispose).not.toHaveBeenCalled();
    b.release();
    expect(f.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps cached URLs after release', async () => {
    const f = fake();
    const a = acquireSessionThumbs(f.factory);
    await a.source(entry('x'));
    a.release();
    const b = acquireSessionThumbs(f.factory);
    expect(await b.source(entry('x'))).toBe('data:x');
    expect(f.render).toHaveBeenCalledTimes(1);
    b.release();
  });

  it('resolves queued renders to null after release and does not cache them', async () => {
    const f = fake();
    const a = acquireSessionThumbs(f.factory);
    const p1 = a.source(entry('x'));
    const p2 = a.source(entry('y'));
    a.release();
    expect(await p1).toBeNull();
    expect(await p2).toBeNull();
    const b = acquireSessionThumbs(f.factory);
    expect(await b.source(entry('y'))).toBe('data:y');
    b.release();
  });

  it('yields null quietly when the renderer is unavailable', async () => {
    const a = acquireSessionThumbs(() => null);
    expect(await a.source(entry('x'))).toBeNull();
    a.release();
  });
});
