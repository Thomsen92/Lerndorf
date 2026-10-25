import type { Progress, ProgressApi, Reward } from '../src/api/progress';
import { createAvatarBadge } from '../src/ui/avatarBadge';
import { avatarPortrait, FRAMES } from '../src/ui/frames';
import { crestSvg } from '../src/ui/crest';
import { createPortraitSource, createWebGLPortraitRender } from '../src/render/portrait';
import { openProfile } from '../src/ui/profileView';
import { openLevelUp, openChestDialog } from '../src/ui/levelUp';
import { openWelcome, welcomeLines } from '../src/ui/welcome';

export const catalogue: Reward[] = [
  ...[
    [1, 'Newcomer'],
    [3, 'Word Collector'],
    [5, 'Quest Rookie'],
    [7, 'Busy Bee'],
    [10, 'Grammar Explorer'],
    [12, 'Verb Tamer'],
    [15, 'Vocab Hero'],
    [18, 'Storyteller'],
    [20, 'Village Star'],
    [23, 'English Wizard'],
    [25, 'Quest Master'],
    [28, 'Village Legend'],
    [30, 'Lerndorf Champion'],
  ].map(([level, label]) => ({
    id: `title_${String(label).toLowerCase().replaceAll(' ', '_')}`,
    kind: 'title' as const,
    level: Number(level),
    label: String(label),
  })),
  ...Object.values(FRAMES).map((frame, i) => ({
    id: frame.id,
    kind: 'frame' as const,
    level: i === 0 ? 1 : i * 5,
    label: frame.label,
  })),
];
const q = new URLSearchParams(location.search),
  view = q.get('view') ?? 'profil';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.querySelector<HTMLElement>('#app')!;
let coins = 230;
const progress: Progress = {
  xp: 620,
  level: 6,
  levelXp: 500,
  nextLevelXp: 675,
  titleId: 'title_quest_rookie',
  frameId: 'frame_bronze',
  streak: { current: 6, best: 9, shieldLeft: 1 },
  today: { solved: 2, total: 3 },
  chests: [
    { id: 1, size: 'normal', source: 'level', ref: '6' },
    { id: 2, size: 'big', source: 'level', ref: '5' },
  ],
  unseen: [{ id: 10, reason: 'stamp', ref: '2026-10-19', delta: 100, createdAt: '2026-10-25T12:00:00Z' }],
  stats: { quests: 42, stamps: 3, bestStreak: 9 },
};
const opened = new Map<number, { coinsWon: number; roll: 'double'; coins: number }>();
const api: ProgressApi = {
  async load() {
    return { ok: true, value: structuredClone(progress) };
  },
  async rewards() {
    return { ok: true, value: catalogue };
  },
  async markSeen() {
    progress.unseen = [];
    return { ok: true, value: true };
  },
  async openChest(id) {
    if (q.has('slow')) await new Promise((resolve) => setTimeout(resolve, 2000));
    let result = opened.get(id);
    if (!result) {
      result = { coinsWon: 100, roll: 'double', coins: coins + 100 };
      opened.set(id, result);
      coins = result.coins;
      progress.chests = progress.chests.filter((c) => c.id !== id);
    }
    return { ok: true, value: result };
  },
  async setTitle(id) {
    progress.titleId = id;
    return { ok: true, value: true };
  },
  async setFrame(id) {
    progress.frameId = id;
    return { ok: true, value: true };
  },
};
const onCoins = (value: number) => {
  coins = value;
};
const renderer = createWebGLPortraitRender();
const portraits = renderer ? createPortraitSource(renderer.render) : undefined;
addEventListener('pagehide', () => renderer?.dispose(), { once: true });
if (view === 'wappen') {
  const title = document.createElement('h1');
  title.textContent = 'Wappen und Rahmen';
  root.append(title);
  const grid = document.createElement('div');
  grid.className = 'preview-tiers';
  root.append(grid);
  Object.values(FRAMES).forEach((frame, i) => {
    const card = document.createElement('section');
    card.className = 'preview-tier';
    card.dataset.tier = frame.id;
    const h = document.createElement('h2');
    h.textContent = frame.label;
    card.append(h, crestSvg(i === 0 ? 1 : i * 5, 96));
    for (const character of ['boy', 'girl'] as const)
      card.append(avatarPortrait({ character, frameId: frame.id, size: 'large', portraits }));
    grid.append(card);
  });
} else if (view === 'profil') {
  openProfile({
    api,
    nickname: 'Fuchs',
    character: 'girl',
    getCoins: () => coins,
    onCoins,
    onFrame: () => {},
    onTitle: () => {},
    onSettings: () => {},
    onClose: () => {},
    reducedMotion,
  });
} else if (view === 'levelup') {
  openLevelUp({
    levelFrom: 4,
    levelTo: 7,
    rewards: catalogue,
    chests: [...progress.chests, { id: 3, size: 'normal', source: 'level', ref: '7' }],
    api,
    reducedMotion,
    onCoins,
    onEquip: () => {},
    onDone: () => {},
  });
} else if (view === 'chest') {
  openChestDialog({ chest: progress.chests[0], api, reducedMotion, onCoins, onDone: () => {} });
} else if (view === 'welcome') {
  openWelcome({ lines: welcomeLines(progress.unseen), onDone: () => {} });
} else {
  const badge = createAvatarBadge({
    nickname: 'Fuchs',
    character: 'girl',
    portraits,
    onOpen: () => {},
    reducedMotion: () => reducedMotion,
  });
  badge.update({
    level: 6,
    xp: 620,
    levelXp: 500,
    nextLevelXp: 675,
    coins,
    streak: 6,
    chests: 2,
    frameId: 'frame_bronze',
  });
  root.append(badge.el);
}
