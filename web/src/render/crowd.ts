/**
 * Villagers in the 3D scene: placeholder figures that walk, sit, wait and greet each other.
 * Behaviour comes from avatars/behaviour.ts; this file only moves and shows them.
 * Placeholder figures (boxes) until the animated boy or girl model is loaded (render/character.ts).
 */
import * as THREE from 'three';
import { bakeStatic } from './merge';
import {
  DEFAULT_CHARACTER,
  instantiate,
  loadCharacter,
  type CharacterAsset,
  type CharacterInstance,
  type CharacterKind,
} from './character';
import { createRng, type Rng } from '../world/rng';
import type { Layout } from '../world/layout';
import { walkHeight } from '../world/walk';
import { HOUSE_FRONT_Z, PATH_X } from '../world/plotPlan';
import {
  arrivalAction,
  greetingFor,
  nextAction,
  PLAZA_SHARE_MAX,
  Walker,
  type Action,
} from '../avatars/behaviour';

const WALK_SPEED = 2.2; // world units per second
const GREET_RANGE = 3.2;
const GREET_COOLDOWN = 12; // seconds before the same pair greets again

export interface Villager {
  nickname: string;
  own: boolean;
  group: THREE.Group;
  node: number;
  walkPath: number[] | null;
  walker: Walker | null;
  action: Action | null;
  timer: number;
  waveTimer: number;
  /** Seconds left with the name shown, after a tap on the figure (SPEC §10.9). */
  nameTimer: number;
  bubbleTimer: number;
  rng: Rng;
  /** Animated model, once loaded. */
  fig: CharacterInstance | null;
  /** Chosen figure (boy or girl); the default until the pupil picks one. */
  character: CharacterKind;
  /** What plays now: 'stand' = walk clip frozen on its first frame, 'dance0', 'dance1' … */
  pose: Pose | null;
  /** Seconds left of a tap animation (catwalk or dance); the figure stops walking meanwhile. */
  emote: { pose: Pose; timer: number; loops?: number; done?: () => void } | null;
  /** True while the tutorial holds the figure on the spot (no wandering, no walking). */
  still: boolean;
}

type Pose = 'walk' | 'stand' | 'catwalk' | `dance${number}`;

/** Tap animations run two loops. */
const EMOTE_LOOPS = 2;
const FADE = 0.25;

interface Input {
  nickname: string;
  /** The pupil's own figure gets the marker and the highlighted name sign. */
  own?: boolean;
  /** Node index to start at; random wander node if omitted. */
  startNode?: number;
  /** Boy or girl; the default figure if the pupil has not picked one yet. */
  character?: CharacterKind | null;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SKIN = ['#f1c7a3', '#d9a27a', '#a8714a', '#7a4e30', '#f6d6bb'];
const TOPS = ['#e85d75', '#4b7bec', '#20bf6b', '#f7b731', '#8854d0', '#fd9644', '#2d98da'];

/** Simple figure: legs, body, head, nickname sign. Colours come from the nickname, so they are stable. */
function buildFigure(nickname: string, own: boolean): THREE.Group {
  const h = hashString(nickname);
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: SKIN[h % SKIN.length], roughness: 0.8 });
  const top = new THREE.MeshStandardMaterial({ color: TOPS[(h >>> 4) % TOPS.length], roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: '#34405a', roughness: 0.8 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.22), pants);
  const legR = legL.clone();
  legL.position.set(-0.13, 0.22, 0);
  legR.position.set(0.13, 0.22, 0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.4), top);
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
  head.position.y = 1.36;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.18), top);
  const armR = armL.clone();
  armL.position.set(-0.42, 0.75, 0);
  armR.position.set(0.42, 0.75, 0);
  armR.name = 'armR'; // the arm that waves
  for (const m of [legL, legR, body, head, armL, armR]) {
    m.castShadow = true;
    g.add(m);
  }

  // name sign above the head
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const cx = cv.getContext('2d');
  if (cx) {
    cx.fillStyle = own ? 'rgba(255,181,71,0.95)' : 'rgba(20,24,40,0.8)';
    cx.beginPath();
    cx.roundRect(6, 10, 244, 44, 22);
    cx.fill();
    cx.fillStyle = own ? '#2a1d05' : '#ffffff';
    cx.font = 'bold 26px Atkinson Hyperlegible, Verdana, sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(nickname, 128, 33, 236);
  }
  const sign = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true }),
  );
  sign.scale.set(1.6, 0.4, 1);
  sign.position.y = 2.0;
  sign.renderOrder = 10;
  g.add(sign);
  g.userData.sign = sign; // hidden when the camera is far away (SPEC §10.9)

  if (own) {
    // marker: a small arrow over the own figure
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.4, 8),
      new THREE.MeshBasicMaterial({ color: '#ffd23f' }),
    );
    arrow.position.y = 2.5;
    arrow.rotation.x = Math.PI;
    g.add(arrow);
  }
  return bakeStatic(g);
}

const BUBBLE_FONT = "'Comic Neue', 'Comic Sans MS', cursive";
let bubbleFontReady = false;
let bubbleFontLoad: Promise<void> | null = null;

/** Loads Comic Neue once; resolves quietly when the font API or the file is unavailable (fallback font is used then). */
function ensureBubbleFont(): Promise<void> {
  if (!bubbleFontLoad) {
    bubbleFontLoad =
      typeof document !== 'undefined' && document.fonts
        ? document.fonts.load("bold 30px 'Comic Neue'").then(
            (faces) => {
              bubbleFontReady = faces.length > 0;
            },
            () => undefined,
          )
        : Promise.resolve();
  }
  return bubbleFontLoad;
}

/** Comic bubble: white rounded body, dark outline, tip pointing down to the figure. */
function drawBubble(cv: HTMLCanvasElement, text: string): void {
  const cx = cv.getContext('2d');
  if (!cx) return;
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.beginPath();
  cx.roundRect(8, 8, 204, 52, 22);
  cx.moveTo(96, 59);
  cx.lineTo(110, 83);
  cx.lineTo(124, 59);
  cx.closePath();
  cx.fillStyle = '#ffffff';
  cx.fill();
  cx.lineJoin = 'round';
  cx.lineWidth = 7;
  cx.strokeStyle = '#1c1c28';
  cx.stroke();
  // cover the seam between body and tip, then redraw the two tip edges
  cx.fillStyle = '#ffffff';
  cx.fillRect(99, 56, 22, 8);
  cx.fillStyle = '#1c1c28';
  cx.font = `bold 32px ${BUBBLE_FONT}`;
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, 110, 35, 186);
}

/** Speech bubble with one fixed greeting, shown for a short time. */
function bubble(text: string): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 220;
  cv.height = 90;
  drawBubble(cv, text);
  const tex = new THREE.CanvasTexture(cv);
  if (!bubbleFontReady) {
    // first draw may have used the fallback font: redraw once Comic Neue has arrived
    void ensureBubbleFont().then(() => {
      if (!bubbleFontReady) return;
      drawBubble(cv, text);
      tex.needsUpdate = true;
    });
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.5, 0.6, 1);
  s.position.y = 2.9;
  s.renderOrder = 11;
  return s;
}

export class Crowd {
  readonly villagers: Villager[] = [];
  private readonly lastGreet = new Map<string, number>();
  private clock = 0;

  constructor(
    scene: THREE.Scene,
    private readonly layout: Layout,
    inputs: Input[],
  ) {
    const wander = layout.graph.wander;
    inputs.forEach((input, i) => {
      const rng = createRng(hashString(input.nickname) ^ (layout.seed * 7919) ^ i);
      const start = input.startNode ?? wander[Math.floor(rng() * wander.length)];
      const own = input.own ?? false;
      const group = buildFigure(input.nickname, own);
      scene.add(group);
      const v: Villager = {
        nickname: input.nickname,
        own,
        group,
        node: start,
        walkPath: null,
        walker: null,
        action: null,
        timer: rng() * 3,
        waveTimer: 0,
        nameTimer: 0,
        bubbleTimer: 0,
        rng,
        fig: null,
        character: input.character ?? DEFAULT_CHARACTER,
        pose: null,
        emote: null,
        still: false,
      };
      this.placeAt(v, layout.graph.nodes[start]);
      this.villagers.push(v);
    });
    for (const v of this.villagers) this.loadFigure(v);
  }

  /** Loads the villager's model and swaps the placeholder body for it; sign, marker and bubbles stay. */
  private loadFigure(v: Villager): void {
    const kind = v.character;
    void loadCharacter(kind).then((asset) => {
      if (asset && v.character === kind) this.attachModel(v, asset);
    });
  }

  private attachModel(v: Villager, asset: CharacterAsset): void {
    for (const child of [...v.group.children]) {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) mesh.visible = false;
    }
    if (v.fig) {
      v.fig.mixer.stopAllAction();
      v.group.remove(v.fig.root);
    }
    v.fig = instantiate(asset);
    v.group.add(v.fig.root);
    // spread the walk phase so the figures do not step in sync
    v.fig.mixer.setTime(v.rng() * 2);
    v.pose = null;
    v.emote = null;
  }

  /** Changes a villager's figure (after the pupil picked boy or girl). */
  setCharacter(nickname: string, kind: CharacterKind): void {
    const v = this.villagers.find((x) => x.nickname === nickname);
    if (!v || (v.character === kind && v.fig)) return;
    v.character = kind;
    this.loadFigure(v);
  }

  /** Single tap: catwalk, double tap: a dance, each two loops. Without the model the figure hops. */
  react(v: Villager, kind: 'single' | 'double'): void {
    const fig = v.fig;
    if (!fig) {
      this.wave(v);
      return;
    }
    let pose: Pose = 'catwalk';
    if (kind === 'double') pose = `dance${Math.floor(v.rng() * fig.dances.length)}`;
    const seconds = this.actionOf(fig, pose).getClip().duration * EMOTE_LOOPS;
    v.emote = { pose, timer: seconds };
    if (v.pose === pose) {
      // same animation again: start it over
      fig.mixer.stopAllAction();
      v.pose = null;
    }
    v.nameTimer = Math.max(3, seconds);
  }

  private ownVillager(): Villager | undefined {
    return this.villagers.find((x) => x.own);
  }

  /** Tutorial: puts the own figure in front of the house slot of the plot (ahead of the ruin, on the footpath), facing the street (+Z, towards the camera), and holds it there. */
  placeOwnInFrontOfHouse(plotIndex: number): void {
    const v = this.ownVillager();
    const plot = this.layout.plots[plotIndex];
    if (!v || !plot) return;
    const lz = HOUSE_FRONT_Z + 1.6;
    const cos = Math.cos(plot.face);
    const sin = Math.sin(plot.face);
    const x = plot.x + PATH_X * cos + lz * sin;
    const z = plot.z - PATH_X * sin + lz * cos;
    v.walker = null;
    v.walkPath = null;
    v.action = null;
    v.emote = null;
    v.group.position.set(x, walkHeight(this.layout, { x, z }), z);
    v.group.userData.baseY = v.group.position.y;
    v.group.rotation.y = plot.face; // heading 0 looks along +Z
    v.still = true;
  }

  /** Tutorial: pauses (on) or resumes (off) wandering of the own figure. */
  standStill(on: boolean): void {
    const v = this.ownVillager();
    if (!v) return;
    v.still = on;
    if (on) {
      v.walker = null;
      v.walkPath = null;
      v.action = null;
    } else {
      v.timer = 0;
    }
  }

  /** Plays the first dance of the own figure once; resolves when it ends, or after 2 s when no model is loaded. */
  playDanceOnce(): Promise<void> {
    const v = this.ownVillager();
    return new Promise<void>((resolve) => {
      let finished = false;
      const done = (): void => {
        if (finished) return;
        finished = true;
        resolve();
      };
      if (!v || !v.fig || v.fig.dances.length === 0) {
        setTimeout(done, 2000);
        return;
      }
      const seconds = v.fig.dances[0].getClip().duration;
      if (v.pose === 'dance0') {
        v.fig.mixer.stopAllAction();
        v.pose = null;
      }
      v.emote = { pose: 'dance0', timer: seconds, loops: 1, done };
      v.nameTimer = Math.max(3, seconds);
      setTimeout(done, seconds * 1000 + 2000); // safety net if update() is not running
    });
  }

  private actionOf(fig: CharacterInstance, pose: Pose): THREE.AnimationAction {
    if (pose === 'walk' || pose === 'stand') return fig.walk;
    if (pose === 'catwalk') return fig.catwalk;
    return fig.dances[Number(pose.slice(5))] ?? fig.dances[0];
  }

  private setPose(v: Villager, pose: Pose, loops = EMOTE_LOOPS): void {
    const fig = v.fig;
    if (!fig || v.pose === pose) return;
    const prev = v.pose === null ? null : this.actionOf(fig, v.pose);
    const next = this.actionOf(fig, pose);
    if (prev && prev !== next) prev.fadeOut(FADE);
    if (prev !== next) next.reset();
    next.setEffectiveTimeScale(pose === 'stand' ? 0 : 1);
    if (pose === 'stand') next.time = 0;
    if (pose === 'walk' || pose === 'stand') {
      next.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      next.reset();
      if (loops === 1) next.setLoop(THREE.LoopOnce, 1);
      else next.setLoop(THREE.LoopRepeat, loops);
      next.clampWhenFinished = true;
    }
    next.setEffectiveWeight(1);
    if (prev && prev !== next) next.fadeIn(FADE);
    next.play();
    v.pose = pose;
  }

  /** Figure under a pointer tap: returns the villager, so the caller can make it wave. */
  findByObject(obj: THREE.Object3D): Villager | null {
    for (const v of this.villagers) {
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        if (cur === v.group) return v;
        cur = cur.parent;
      }
    }
    return null;
  }

  wave(v: Villager): void {
    v.waveTimer = 2;
    v.nameTimer = 3;
  }

  /** Figure names only within about 28 m of the camera. */
  updateLabels(cam: THREE.Camera): void {
    const p = new THREE.Vector3();
    for (const v of this.villagers) {
      const sign = v.group.userData.sign as THREE.Sprite | undefined;
      if (!sign) continue;
      v.group.getWorldPosition(p);
      sign.visible = v.nameTimer > 0 || p.distanceTo(cam.position) < 28;
    }
  }

  update(dt: number): void {
    this.clock += dt;
    for (const v of this.villagers) {
      if (v.emote) {
        v.emote.timer -= dt;
        if (v.emote.timer <= 0) {
          const done = v.emote.done;
          v.emote = null;
          done?.();
        }
      }
      if (v.emote) {
        // the figure stays on the spot while it dances; walking resumes afterwards
      } else if (v.still) {
        // held on the spot by the tutorial
      } else if (v.walker) {
        v.walker.advance(dt);
        const p = v.walker.position();
        v.group.position.set(p.x, walkHeight(this.layout, p), p.z);
        v.group.userData.baseY = v.group.position.y;
        v.group.rotation.y = p.heading;
        if (v.walker.done) {
          const last = this.lastNodeOf(v);
          v.walker = null;
          v.node = last;
          v.action = arrivalAction(v.rng, this.layout.graph, last);
          v.timer = v.action.kind === 'walk' ? 0 : v.action.seconds;
        }
      } else {
        v.timer -= dt;
        if (v.timer <= 0) this.startNext(v);
      }
      if (v.waveTimer > 0) v.waveTimer -= dt;
      if (v.nameTimer > 0) v.nameTimer -= dt;
      if (v.bubbleTimer > 0) {
        v.bubbleTimer -= dt;
        if (v.bubbleTimer <= 0) this.removeBubble(v);
      }
      if (v.fig) {
        this.setPose(v, v.emote ? v.emote.pose : v.walker ? 'walk' : 'stand', v.emote?.loops);
        v.fig.mixer.update(dt);
      } else {
        this.animateArm(v);
      }
    }
    this.checkGreetings();
  }

  private placeAt(v: Villager, node: { x: number; z: number }): void {
    v.group.position.set(node.x, walkHeight(this.layout, node), node.z);
    v.group.userData.baseY = v.group.position.y;
  }

  private lastNodeOf(v: Villager): number {
    const path = v.walkPath ?? [];
    return path.length ? path[path.length - 1] : v.node;
  }

  /** Share of villagers standing on the plaza (fountain, board or plaza ring). */
  private plazaShare(): number {
    if (this.villagers.length === 0) return 0;
    const onPlaza = this.villagers.filter((v) => {
      const tag = this.layout.graph.nodes[v.node].tag;
      return tag === 'fountain' || tag === 'board' || tag === 'plaza';
    }).length;
    return onPlaza / this.villagers.length;
  }

  private startNext(v: Villager): void {
    const full = this.plazaShare() >= PLAZA_SHARE_MAX;
    const action = nextAction(v.rng, this.layout.graph, v.node, full);
    v.action = action;
    if (action.kind === 'walk') {
      v.walkPath = action.path;
      v.walker = new Walker(
        action.path.map((n) => this.layout.graph.nodes[n]),
        WALK_SPEED,
      );
    } else {
      v.timer = action.seconds;
    }
  }

  /** Waving: the figure hops on the spot (the arms are merged into the body, see bakeStatic). */
  private animateArm(v: Villager): void {
    const hop = v.waveTimer > 0 ? Math.abs(Math.sin(this.clock * 9)) * 0.18 : 0;
    v.group.position.y = ((v.group.userData.baseY as number | undefined) ?? v.group.position.y) + hop;
  }

  /** Two villagers close to each other: one of them says a fixed greeting. */
  private checkGreetings(): void {
    for (let i = 0; i < this.villagers.length; i++) {
      for (let j = i + 1; j < this.villagers.length; j++) {
        const a = this.villagers[i];
        const b = this.villagers[j];
        const dx = a.group.position.x - b.group.position.x;
        const dz = a.group.position.z - b.group.position.z;
        if (Math.hypot(dx, dz) > GREET_RANGE) continue;
        const key = [a.nickname, b.nickname].sort().join('|');
        const last = this.lastGreet.get(key) ?? -Infinity;
        if (this.clock - last < GREET_COOLDOWN) continue;
        this.lastGreet.set(key, this.clock);
        const speaker = a.rng() < 0.5 ? a : b;
        this.showBubble(speaker, greetingFor(speaker.rng));
      }
    }
  }

  private showBubble(v: Villager, text: string): void {
    this.removeBubble(v);
    const s = bubble(text);
    s.name = 'bubble';
    v.group.add(s);
    v.bubbleTimer = 2;
  }

  private removeBubble(v: Villager): void {
    const s = v.group.getObjectByName('bubble');
    if (s) v.group.remove(s);
    v.bubbleTimer = 0;
  }
}
