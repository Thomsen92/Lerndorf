// @vitest-environment happy-dom
// mountVillage with the 3D side faked: does the tutorial start, lock the navigation and leave logout usable?
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TutorialState } from '../../src/api/tutorial';
import type { TutorialContext } from '../../src/ui/tutorial/flow';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class FakeRenderer {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false, type: 0 };
    outputColorSpace = '';
    toneMapping = 0;
    toneMappingExposure = 1;
    setSize(): void {}
    setPixelRatio(): void {}
    setAnimationLoop(): void {}
    render(): void {}
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
});
vi.mock('three/addons/controls/OrbitControls.js', async () => {
  const THREE = await import('three');
  class OrbitControls {
    target = new THREE.Vector3();
    enabled = true;
    enablePan = true;
    enableDamping = false;
    minDistance = 0;
    maxDistance = 0;
    maxPolarAngle = 0;
    update(): void {}
  }
  return { OrbitControls };
});
vi.mock('../../src/render/scene', async () => {
  const THREE = await import('three');
  return {
    setupScene: () => ({
      sun: new THREE.DirectionalLight(),
      skyReady: Promise.resolve(null),
      follow: () => undefined,
    }),
  };
});
vi.mock('../../src/render/village', async () => {
  const THREE = await import('three');
  return { buildVillage: () => new THREE.Group() };
});
const crowdCalls: string[] = [];
vi.mock('../../src/render/crowd', () => ({
  Crowd: class {
    setCharacter(): void {}
    placeOwnInFrontOfHouse(): void {
      crowdCalls.push('place');
    }
    standStill(on: boolean): void {
      crowdCalls.push(`still:${on}`);
    }
    playDanceOnce(): Promise<void> {
      return Promise.resolve();
    }
    ownHeadPoint(): null {
      return null;
    }
    update(): void {}
    updateLabels(): void {}
    findByObject(): null {
      return null;
    }
    react(): void {}
  },
}));
const profile = vi.fn();
vi.mock('../../src/api/village', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api/village')>()),
  loadMyProfile: (...a: unknown[]) => profile(...a),
  loadClass: async () => ({ id: '8a', layoutSeed: 1, mapId: 'tal', shopOpen: false, buildOpen: false }),
  loadMembers: async () => [{ id: 'u1', nickname: 'Fuchs', plotIndex: 0, character: 'boy' }],
  saveCharacter: async () => ({ ok: true }),
}));
vi.mock('../../src/api/build', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api/build')>()),
  loadClassSlots: async () => new Map(),
}));
const tutorialState = vi.fn();
vi.mock('../../src/api/tutorial', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api/tutorial')>()),
  getTutorialState: (...a: unknown[]) => tutorialState(...a),
}));
const runTutorial = vi.fn();
vi.mock('../../src/ui/tutorial/flow', () => ({ runTutorial: (ctx: TutorialContext) => runTutorial(ctx) }));
const openDailyQuests = vi.fn();
vi.mock('../../src/ui/dailyQuestsView', () => ({
  openDailyQuests: (...a: unknown[]) => {
    openDailyQuests(...a);
    return { close: () => undefined };
  },
}));

import { mountVillage, type VillageHandle } from '../../src/ui/villageView';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
async function until(cond: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (cond()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}`);
}
const navButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-btn'));
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === label,
  );

const state = (over: Partial<TutorialState> = {}): TutorialState => ({
  needed: true,
  step: 'intro',
  plotIndex: null,
  character: null,
  answered: 0,
  ...over,
});

let root: HTMLElement;
let supabase: SupabaseClient;
let signOut: ReturnType<typeof vi.fn>;
let handle: VillageHandle | null;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app') as HTMLElement;
  signOut = vi.fn().mockResolvedValue({ error: null });
  supabase = { auth: { signOut }, rpc: vi.fn(), from: vi.fn() } as unknown as SupabaseClient;
  profile
    .mockReset()
    .mockResolvedValue({
      id: 'u1',
      nickname: 'Fuchs',
      classId: '8a',
      plotIndex: 0,
      coins: 0,
      character: 'boy',
    });
  tutorialState.mockReset();
  runTutorial.mockReset();
  openDailyQuests.mockReset();
  crowdCalls.length = 0;
  handle = null;
});
afterEach(() => {
  handle?.dispose();
  document.body.innerHTML = '';
});

describe('village and tutorial', () => {
  it('needed = false: no tutorial, no manual plot choice, navigation usable', async () => {
    tutorialState.mockResolvedValue({
      ok: true,
      value: state({ needed: false, step: 'done', plotIndex: 0, character: 'boy' }),
    });
    handle = await mountVillage(root, supabase, vi.fn());
    expect(runTutorial).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('freies Grundstück');
    expect(document.body.textContent).not.toContain('Wiese');
    expect(navButtons().length).toBe(3);
    expect(navButtons().some((b) => b.hasAttribute('aria-disabled'))).toBe(false);
    document.querySelector<HTMLButtonElement>('.nav-btn[data-area="aufgaben"]')?.click();
    await until(() => openDailyQuests.mock.calls.length === 1, 'quests open');
  });

  it('needed = true: the tutorial starts, the village is built on request, navigation is locked', async () => {
    tutorialState.mockResolvedValue({ ok: true, value: state() });
    let ctx: TutorialContext | null = null;
    runTutorial.mockImplementation((c: TutorialContext) => {
      ctx = c;
      return new Promise(() => undefined);
    });
    const mounting = mountVillage(root, supabase, vi.fn());
    await until(() => ctx !== null, 'runTutorial');
    const c = ctx as unknown as TutorialContext;
    expect(c.state.step).toBe('intro');
    // the plot comes from tutorial_start: the profile is read only when the tutorial asks for the village
    expect(profile).not.toHaveBeenCalled();
    const village = c.village();
    handle = await mounting;
    const side = await village;
    expect(profile).toHaveBeenCalled();
    expect(navButtons().every((b) => b.getAttribute('aria-disabled') === 'true')).toBe(true);
    document.querySelector<HTMLButtonElement>('.nav-btn[data-area="aufgaben"]')?.click();
    await tick();
    expect(openDailyQuests).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLElement>('.dorf-actions')?.hidden).toBe(true);
    side.placeFigure();
    side.releaseFigure();
    expect(crowdCalls).toEqual(['place', 'still:false']);
    // no forced second figure picker
    expect(document.querySelector('.character-choice')).toBeNull();
  });

  it('logout stays possible during the tutorial and stops it', async () => {
    tutorialState.mockResolvedValue({
      ok: true,
      value: state({ step: 'quiz', plotIndex: 0, character: 'boy' }),
    });
    let ctx: TutorialContext | null = null;
    runTutorial.mockImplementation((c: TutorialContext) => {
      ctx = c;
      void c.village();
      return new Promise(() => undefined);
    });
    const onLogout = vi.fn();
    handle = await mountVillage(root, supabase, onLogout);
    const status = document.querySelector<HTMLButtonElement>('.nav-status') as HTMLButtonElement;
    expect(status.hasAttribute('aria-disabled')).toBe(false);
    status.click();
    await until(() => Boolean(button('Abmelden')), 'account menu');
    button('Abmelden')?.click();
    await until(() => onLogout.mock.calls.length === 1, 'logout');
    expect(signOut).toHaveBeenCalled();
    expect((ctx as unknown as TutorialContext).signal?.aborted).toBe(true);
    handle = null;
  });

  it('at the end the navigation is unlocked and the Daily Quests open', async () => {
    tutorialState.mockResolvedValue({
      ok: true,
      value: state({ step: 'place', plotIndex: 0, character: 'boy' }),
    });
    let finish: () => void = () => undefined;
    runTutorial.mockImplementation(async (c: TutorialContext) => {
      await c.village();
      await new Promise<void>((r) => (finish = r));
      c.openDailyQuests();
    });
    handle = await mountVillage(root, supabase, vi.fn());
    await tick();
    expect(navButtons()[0].getAttribute('aria-disabled')).toBe('true');
    finish();
    await until(() => openDailyQuests.mock.calls.length === 1, 'quests');
    expect(navButtons().some((b) => b.hasAttribute('aria-disabled'))).toBe(false);
  });

  it('a tutorial state error shows the error screen with logout', async () => {
    tutorialState.mockResolvedValue({ ok: false, message: 'x' });
    handle = await mountVillage(root, supabase, vi.fn());
    expect(document.querySelector('#notice')?.textContent).toContain('nicht geladen');
    expect(button('Abmelden')).toBeTruthy();
    expect(runTutorial).not.toHaveBeenCalled();
  });
});
