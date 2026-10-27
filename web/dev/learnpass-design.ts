/**
 * Design mock-up of the LearnPass, variant A revised (plan §14). Static sample data, no backend.
 * Reward pictures come from the game: Season I GLBs, the 3D chest, title plaque and frame artwork;
 * Kenney Graveyard figures stand in for the pass scenes until A3 builds them.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { configurePreviewRenderer, createPreviewScene } from '../src/render/itemPreview';
import { createChestModel } from '../src/render/chestPreview';
import { titlePlaque } from '../src/ui/titlePlaque';
import { frameSvg } from '../src/ui/frames';

type Kind = 'coins' | 'chest' | 'frame' | 'title' | 'scene' | 'pick';
interface Tier { n: number; xp: number; kind: Kind; name: string; extra: string; mile: boolean }

const FRAMES: Record<number, string> = { 8: 'Pumpkin', 18: 'Spider web', 28: 'Gravestone', 38: 'Cauldron' };
const TITLES: Record<number, string> = { 12: 'Pumpkin Rookie', 22: 'Ghost Hunter', 32: "Witch's Friend", 40: 'Halloween Legend' };
const SCENES: Record<number, [string, string]> = {
  21: ['Pumpkin bed', 'pumpkin-tall-carved'], 23: ['Fire basket', 'fire-basket'], 24: ['Autumn pine', 'pine-fall-crooked'],
  26: ['Lantern path', 'lightpost-double'], 27: ['Graveyard gate', 'iron-fence-border-gate'], 29: ['Candle altar', 'altar-stone'],
  31: ['Ghost at the grave', 'character-ghost'], 33: ['Skeleton on a bench', 'character-skeleton'],
  34: ['Zombie in the garden', 'character-zombie'], 36: ['Little crypt', 'crypt-small'],
  37: ['Vampire and coffin', 'character-vampire'], 39: ['Gravedigger', 'character-keeper'],
};
const GLOW: Record<Kind, string> = { coins: '#f2b630', chest: '#a46cf0', frame: '#ff8f2b', title: '#d2462e', scene: '#6fbf73', pick: '#f2b630' };
const XP_PER_TIER = [30, 60, 90, 120];
const PLAYER_XP = 452;
const PLAYER_TIER = 12; // reached, not collected yet

const tierXp = (n: number) => Array.from({ length: n }, (_, i) => XP_PER_TIER[Math.floor(i / 10)]).reduce((a, b) => a + b, 0);

function buildTier(n: number): Tier {
  const mile = n % 5 === 0;
  const coins = (n <= 20 ? 5 : 0) + (mile ? 25 : 0);
  const plusCoins = coins ? `+ ${coins} coins` : '';
  const t = { n, xp: tierXp(n), mile };
  if (n === 40) return { ...t, kind: 'pick', name: 'Pick any season item', extra: '+ chest, title, 25 coins' };
  if (mile) return { ...t, kind: 'chest', name: 'Season chest', extra: plusCoins };
  if (FRAMES[n]) return { ...t, kind: 'frame', name: `Frame: ${FRAMES[n]}`, extra: plusCoins };
  if (TITLES[n]) return { ...t, kind: 'title', name: 'New title', extra: plusCoins };
  if (SCENES[n]) return { ...t, kind: 'scene', name: SCENES[n][0], extra: 'Garden scene' };
  return { ...t, kind: 'coins', name: `${coins} coins`, extra: '' };
}
const TIERS = Array.from({ length: 40 }, (_, i) => buildTier(i + 1));
const stateOf = (n: number) => (n < PLAYER_TIER ? 'claimed' : n === PLAYER_TIER ? 'ready' : 'locked');

function q<T extends Element>(sel: string, root: ParentNode = document): T {
  const node = root.querySelector<T>(sel);
  if (!node) throw new Error(`missing ${sel}`);
  return node;
}

function art(t: Tier): HTMLElement {
  const box = document.createElement('span');
  if (t.kind === 'coins') box.innerHTML = '<span class="coins-art"><svg><use href="#i-coins" /></svg></span>';
  if (t.kind === 'chest') box.innerHTML = '<img class="thumb" data-src="chest" alt="" />';
  if (t.kind === 'scene') box.innerHTML = `<img class="thumb" data-src="kenney/${SCENES[t.n][1]}.glb" alt="" />`;
  if (t.kind === 'pick') box.innerHTML = '<span class="pick-art"><img class="thumb" data-src="season1/warlock.glb" alt="" /><img class="thumb" data-src="season1/house-horror.glb" alt="" /></span>';
  if (t.kind === 'frame') {
    box.className = 'frame-art';
    box.innerHTML = '<img src="/assets/characters/girl.png" alt="" />';
    box.append(frameSvg('frame_gold', 96)); // placeholder: the four season frame styles come with U5
  }
  if (t.kind === 'title') {
    box.className = 'title-art';
    box.append(titlePlaque(TITLES[t.n], 12, true));
  }
  return box;
}

function renderTrack(): void {
  const track = q<HTMLElement>('[data-track]');
  track.replaceChildren(
    ...TIERS.map((t) => {
      const s = stateOf(t.n);
      const wrap = document.createElement('div');
      wrap.className = `tier${t.n <= PLAYER_TIER ? ' done' : ''}${t.n === PLAYER_TIER ? ' here' : ''}`;
      const card = document.createElement('button');
      card.className = `card ${s}${t.mile ? ' mile' : ''}${t.n === 40 ? ' final' : ''}`;
      card.style.setProperty('--glow', GLOW[t.kind]);
      card.dataset.tier = String(t.n);
      const what = t.kind === 'title' ? `Title ${TITLES[t.n]}` : t.name;
      card.setAttribute('aria-label', `Tier ${t.n}: ${what}${t.extra ? `, ${t.extra}` : ''}, ${s}`);
      const mark = s === 'claimed' ? '<svg><use href="#i-check" /></svg>' : s === 'locked' ? '<svg style="color:#6d5a85"><use href="#i-lock" /></svg>' : '';
      const star = t.mile ? '<svg style="color:var(--gold)"><use href="#i-star" /></svg>' : '';
      card.innerHTML = `<span class="top"><span>${star ? `${star} ` : ''}Tier ${t.n}</span>${mark}</span><span class="art"></span><span class="name"><span class="nm">${t.name}</span>${t.extra ? `<span class="extra">${t.extra}</span>` : ''}</span><span class="foot">${s === 'claimed' ? 'Collected' : s === 'ready' ? 'Collect' : t.n === PLAYER_TIER + 1 ? `${t.xp - PLAYER_XP} XP to go` : `${t.xp} XP`}</span>`;
      q('.art', card).append(art(t));
      const node = document.createElement('span');
      node.className = 'node-box';
      node.innerHTML = '<span class="node"></span>';
      wrap.append(card, node);
      if (t.n === PLAYER_TIER) wrap.insertAdjacentHTML('afterbegin', '<span class="here-pin"><span>You</span></span>');
      return wrap;
    }),
  );
}

/** The rail runs from the first to the last node and is filled up to the player's tier. */
function placeRail(): void {
  const track = q<HTMLElement>('[data-track]');
  const rail = q<HTMLElement>('[data-rail]');
  const nodes = [...track.querySelectorAll<HTMLElement>('.node-box')];
  const origin = track.getBoundingClientRect().left - track.scrollLeft;
  const centre = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.left + r.width / 2 - origin;
  };
  const first = centre(nodes[0]);
  rail.style.left = `${first}px`;
  rail.style.width = `${centre(nodes[nodes.length - 1]) - first}px`;
  q<HTMLElement>('i', rail).style.width = `${centre(nodes[PLAYER_TIER - 1]) - first}px`;
  track.append(rail);
}

function jumpToPlayer(smooth: boolean): void {
  const track = q<HTMLElement>('[data-track]');
  const card = q<HTMLElement>(`[data-tier="${PLAYER_TIER}"]`, track);
  const parent = card.parentElement as HTMLElement;
  track.scrollTo({ left: parent.offsetLeft + parent.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
}

/** Finger swipe is native scrolling; a mouse can drag too, so the page can be tested on a laptop. */
function enableMouseDrag(track: HTMLElement): void {
  let startX = 0, startLeft = 0, moved = false, down = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
  });
  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { moved = true; track.classList.add('dragging'); }
    track.scrollLeft = startLeft - dx;
  });
  const up = () => { down = false; track.classList.remove('dragging'); };
  track.addEventListener('pointerup', up);
  track.addEventListener('pointerleave', up);
  track.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

// ---------- tier-40 pick and "what's inside" ----------
interface ManifestItem { file: string; name: string; rarity: string }
/** English item names (default language); the German ones are the manifest names (plan §14.1). */
const NAMES_EN: Record<string, string> = {
  warlock: 'Warlock', 'house-horror': 'Haunted house', 'pumpkin-patch': 'Pumpkin patch', 'clock-tower': 'Spooky clock tower',
  'dodge-pickup': 'Pickup truck', 'kit-monster-plant': 'Monster plant', 'jack-o-lantern-tree': 'Pumpkin tree',
  'candy-pile': 'Candy pile', 'graveyard-corner': 'Graveyard corner', 'fence-lamp': 'Fence with lantern', witch: 'Witch statue',
  'pumpkin-girl': 'Pumpkin girl', 'kit-witch': 'Witch', 'kit-mummy': 'Mummy', 'kit-skeleton': 'Skeleton', 'kit-zombie': 'Zombie',
  'kit-witch-cat': 'Witch cat', 'kit-cauldron': 'Cauldron', 'spooky-pumpkin-cat': 'Pumpkin cat', 'ghost-kitty': 'Ghost cat',
  'kit-candy-bucket': 'Candy bucket', 'kit-bat': 'Bat', 'kit-candle': 'Grave candle', 'kit-ghost': 'Little ghost',
  'kit-gravestone': 'Gravestone', 'kit-jack-o-lantern': 'Jack-o’-lantern', 'kit-broom': 'Broom', 'kit-sign': 'Halloween sign',
};
const nameOf = (file: string) => NAMES_EN[file.replace('.glb', '')] ?? file;
const PICKS: Array<[string, string]> = [
  ['warlock', 'legendary'], ['house-horror', 'legendary'], ['pumpkin-patch', 'epic'], ['clock-tower', 'epic'],
  ['kit-witch', 'rare'], ['kit-skeleton', 'rare'], ['kit-ghost', 'common'], ['kit-jack-o-lantern', 'common'],
];

function renderPick(): void {
  q('[data-pick]').innerHTML = PICKS.map(
    ([f, r], i) => `<button class="r-${r}${i === 2 ? ' own' : ''}" aria-pressed="${i === 2}" aria-label="${nameOf(f)}, ${r}"><img class="thumb" data-src="season1/${f}.glb" alt="" /></button>`,
  ).join('');
}

async function renderInside(): Promise<void> {
  const res = await fetch('/assets/season1/manifest.json');
  const items = ((await res.json()) as { items: ManifestItem[] }).items;
  const bands: Array<[string, string, number]> = [['legendary', 'Legendary', 3], ['epic', 'Epic', 12], ['rare', 'Rare', 30], ['normal', 'Normal', 55]];
  q('[data-bands]').innerHTML = bands
    .map(([key, label, pct]) => {
      const list = items.filter((i) => i.rarity === key);
      const cls = key === 'normal' ? 'common' : key;
      return `<div class="band r-${cls}"><div class="pct">${pct} %<small>${label} · ${list.length} items</small></div><div class="items">${list
        .map((i) => `<figure><div class="box"><img class="thumb" data-src="season1/${i.file}" alt="" /></div>${nameOf(i.file)}</figure>`)
        .join('')}</div></div>`;
    })
    .join('');
}

// ---------- pictures: one renderer, one model at a time ----------
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, Promise<string | null>>();
let tail: Promise<unknown> = Promise.resolve();

async function modelFor(src: string): Promise<THREE.Object3D> {
  if (src === 'chest') {
    const chest = createChestModel('big').root;
    chest.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat?.color?.getHexString() === '536491') mat.color.set('#5b2c6f'); // season chest: purple wood
    });
    return chest;
  }
  const base = src.startsWith('kenney/') ? '/dev/mock-assets/' : '/assets/';
  return (await loader.loadAsync(base + src)).scene;
}

function picture(src: string): Promise<string | null> {
  const hit = cache.get(src);
  if (hit) return hit;
  const job = tail.then(async () => {
    try {
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        configurePreviewRenderer(renderer);
        renderer.setSize(256, 256);
      }
      const { scene, camera } = createPreviewScene();
      const model = await modelFor(src);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const s = 1 / Math.max(size.x, size.y, size.z);
      model.scale.multiplyScalar(s);
      model.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
      const pivot = new THREE.Group();
      pivot.rotation.y = -0.5;
      pivot.add(model);
      scene.add(pivot);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      camera.position.set(0, 0.95, 2.05);
      camera.lookAt(0, 0.42, 0);
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    } catch (err) {
      console.warn('picture failed', src, err);
      return null;
    }
  });
  tail = job;
  cache.set(src, job);
  return job;
}

function fillPictures(root: ParentNode = document): void {
  for (const img of root.querySelectorAll<HTMLImageElement>('img[data-src]')) {
    const src = img.dataset.src ?? '';
    void picture(src).then((url) => { if (url) img.src = url; });
  }
  for (const slot of root.querySelectorAll<HTMLElement>('[data-art^="chest-small"]')) {
    void picture('chest').then((url) => { if (url) slot.innerHTML = `<img class="thumb" src="${url}" alt="" />`; });
  }
}

// ---------- wiring ----------
renderTrack();
renderPick();
const track = q<HTMLElement>('[data-track]');
enableMouseDrag(track);
requestAnimationFrame(() => { placeRail(); jumpToPlayer(false); });
fillPictures();

const modal = q<HTMLElement>('[data-inside]');
let insideReady: Promise<void> | null = null;
document.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  if (t.closest('[data-jump]')) return jumpToPlayer(true);
  if (t.closest('[data-open-inside]')) {
    modal.hidden = false;
    insideReady ??= renderInside().then(() => fillPictures(modal));
    q<HTMLButtonElement>('[data-close]', modal).focus();
    return;
  }
  if (t.closest('[data-close]') || t === modal) { modal.hidden = true; return; }
  const pick = t.closest<HTMLButtonElement>('[data-pick] button');
  if (pick) for (const b of pick.parentElement?.querySelectorAll('button') ?? []) b.setAttribute('aria-pressed', String(b === pick));
  const replay = t.closest('[data-replay]');
  if (replay) {
    const pic = replay.closest('.reveal')?.querySelector<HTMLElement>('.pic');
    pic?.classList.remove('shake');
    void pic?.offsetWidth;
    pic?.classList.add('shake');
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });
if (location.hash === '#inside') q<HTMLButtonElement>('[data-open-inside]').click();
