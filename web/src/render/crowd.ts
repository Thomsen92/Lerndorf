/**
 * Villagers in the 3D scene: placeholder figures that walk, sit, wait and greet each other.
 * Behaviour comes from avatars/behaviour.ts; this file only moves and shows them.
 * Placeholder models (boxes and spheres). Real animated figures come in Stufe 2.
 */
import * as THREE from 'three';
import { bakeStatic } from './merge';
import { createRng, type Rng } from '../world/rng';
import type { Layout } from '../world/layout';
import { walkHeight } from '../world/walk';
import { arrivalAction, greetingFor, nextAction, Walker, type Action } from '../avatars/behaviour';

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
  bubbleTimer: number;
  rng: Rng;
}

interface Input {
  nickname: string;
  /** The pupil's own figure gets the marker and the highlighted name sign. */
  own?: boolean;
  /** Node index to start at; random wander node if omitted. */
  startNode?: number;
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

/** Speech bubble with one fixed greeting, shown for a short time. */
function bubble(text: string): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 220;
  cv.height = 90;
  const cx = cv.getContext('2d');
  if (cx) {
    cx.fillStyle = '#ffffff';
    cx.beginPath();
    cx.roundRect(6, 6, 208, 58, 22);
    cx.fill();
    cx.fillStyle = '#222';
    cx.font = 'bold 30px Atkinson Hyperlegible, Verdana, sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, 110, 35, 200);
  }
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }),
  );
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
        bubbleTimer: 0,
        rng,
      };
      this.placeAt(v, layout.graph.nodes[start]);
      this.villagers.push(v);
    });
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
  }

  /** Figure names only within about 28 m of the camera. */
  updateLabels(cam: THREE.Camera): void {
    const p = new THREE.Vector3();
    for (const v of this.villagers) {
      const sign = v.group.userData.sign as THREE.Sprite | undefined;
      if (!sign) continue;
      v.group.getWorldPosition(p);
      sign.visible = p.distanceTo(cam.position) < 28;
    }
  }

  update(dt: number): void {
    this.clock += dt;
    for (const v of this.villagers) {
      if (v.walker) {
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
      if (v.bubbleTimer > 0) {
        v.bubbleTimer -= dt;
        if (v.bubbleTimer <= 0) this.removeBubble(v);
      }
      this.animateArm(v);
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

  private startNext(v: Villager): void {
    const action = nextAction(v.rng, this.layout.graph, v.node);
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
