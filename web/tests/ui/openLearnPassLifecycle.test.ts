// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SeasonApi, SeasonState } from '../../src/api/season';
const mocks = vi.hoisted(() => ({
  release: vi.fn(),
  destroy: vi.fn(),
  actions: null as null | { onClaim(tier: number): Promise<number> },
  reveal: vi.fn(),
}));
vi.mock('../../src/ui/learnpass/rewardArt', () => ({ seasonPictures: () => ({ release: mocks.release }) }));
vi.mock('../../src/ui/learnpass/learnpassView', () => ({
  renderLearnPass: (_state: unknown, actions: typeof mocks.actions) => {
    mocks.actions = actions;
    return { el: document.createElement('section'), update: vi.fn(), destroy: mocks.destroy };
  },
}));
vi.mock('../../src/collection/cardReveal', () => ({ revealCards: mocks.reveal }));
vi.mock('../../src/collection/catalog', () => ({
  collectionCatalog: async () => ({}),
  cardById: (_catalog: unknown, id: string) => ({ id }),
}));
import { openLearnPass } from '../../src/ui/learnpass/openLearnPass';
import { createModalTracker } from '../../src/ui/areas';
describe('LearnPass entered through the season hub', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });
  const options = (state: () => Promise<SeasonState>) => ({
    api: { state } as SeasonApi,
    getCoins: () => 0,
    onCoins: vi.fn(),
    reducedMotion: true,
    onOpenInventory: vi.fn(),
  });
  it('logout closes a pending pass and a late state never remounts it', async () => {
    let resolve!: (s: SeasonState) => void;
    const tracker = createModalTracker();
    const pass = tracker.track(
      openLearnPass(
        options(
          () =>
            new Promise((r) => {
              resolve = r;
            }),
        ),
      ),
    );
    expect(tracker.anyOpen).toBe(true);
    tracker.closeAll();
    expect(pass.isOpen).toBe(false);
    resolve({ season: { id: 'test' } } as SeasonState);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body.children).toHaveLength(0);
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it('removes a load error when the tracked pass is closed', async () => {
    const pass = openLearnPass(
      options(async () => {
        throw Error('offline');
      }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('.learnpass-error')).not.toBe(null);
    pass.close();
    expect(document.querySelector('.learnpass-error')).toBe(null);
    expect(pass.isOpen).toBe(false);
  });
  it('closes the pass before the almanac opens from a drawn card (the almanac would open behind it)', async () => {
    const onOpenAlmanac = vi.fn();
    const state = { season: { id: 'test' } } as SeasonState;
    const pass = openLearnPass({
      ...options(async () => state),
      api: {
        state: async () => state,
        claim: async () => ({ rewards: { coins: 5, cards: [{ id: 'c1', granted: true }] } }),
      } as unknown as SeasonApi,
      onOpenAlmanac,
    });
    await Promise.resolve();
    await Promise.resolve();
    await mocks.actions!.onClaim(1);
    // nothing opens by itself: the notice is tapped first
    const notice = document.querySelector<HTMLElement>('.card-gain-notice')!;
    expect(notice).not.toBe(null);
    expect(mocks.reveal).not.toHaveBeenCalled();
    notice.click();
    await vi.waitFor(() => expect(mocks.reveal).toHaveBeenCalledOnce());
    mocks.reveal.mock.calls[0][0].onAlmanac('c1');
    expect(pass.isOpen).toBe(false);
    expect(onOpenAlmanac).toHaveBeenCalledWith('c1');
  });
  it('still announces a drawn card when the state reload after the claim fails', async () => {
    const state = { season: { id: 'test' } } as SeasonState;
    let calls = 0;
    openLearnPass({
      ...options(async () => state),
      api: {
        state: async () => {
          if (++calls > 1) throw Error('offline');
          return state;
        },
        claim: async () => ({ rewards: { cards: [{ id: 'c1', granted: true }] } }),
      } as unknown as SeasonApi,
    });
    await Promise.resolve();
    await Promise.resolve();
    await expect(mocks.actions!.onClaim(1)).rejects.toThrow('offline');
    expect(document.querySelector('.card-gain-notice')).not.toBe(null);
  });
});
