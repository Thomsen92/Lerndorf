import * as THREE from 'three';
import { tr } from '../i18n';
import type { Layout } from '../world/layout';
import '../season/spookyFont.css';
import './questBoardCue.css';

/** Where a cue sits: the outline in the object's local front plane and the label above it. */
export interface CueShape {
  /** Outline points [x, y] in the local front plane, y from the object's base. */
  contour: Array<[number, number]>;
  /** Local z of the front plane. */
  z: number;
  /** Local y the contour starts from. */
  baseY: number;
  /** World position of the label's arrow tip. */
  at: THREE.Vector3;
}

/**
 * A label with an arrow above a world object plus an outline around it (the quest board, the
 * Halloween shop). `spooky` starts in the Halloween look: Creepster, pumpkin colours, hopping letters.
 */
export function createQuestBoardCue(opts: {
  host: HTMLElement;
  board?: THREE.Object3D;
  layout: Layout;
  onOpen: () => void;
  label?: string;
  ariaLabel?: string;
  shape?: CueShape;
  spooky?: boolean;
  /** Draw a glowing silhouette around this model (inverted hull) instead of the drawn outline. */
  silhouette?: THREE.Object3D;
  /** Label and arrow only, no outline (Ollie's market sign). */
  noOutline?: boolean;
}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'quest-board-cue';
  el.hidden = true;
  el.setAttribute('aria-label', opts.ariaLabel ?? tr('Questtafel öffnen – Tagesaufgaben'));
  const label = document.createElement('span'),
    arrow = document.createElement('img');
  label.className = 'quest-board-label';
  // one span per letter, so the Halloween look can let them hop one after another
  const text = opts.label ?? tr('Tagesaufgaben');
  Array.from(text).forEach((char, i) => {
    const letter = document.createElement('span');
    letter.className = 'quest-board-letter';
    letter.style.setProperty('--i', String(i));
    letter.textContent = char === ' ' ? '\u00a0' : char;
    letter.setAttribute('aria-hidden', 'true');
    label.append(letter);
  });
  arrow.src = `${import.meta.env.BASE_URL}assets/kenney/ui/quest-arrow.svg`;
  arrow.alt = '';
  arrow.draggable = false;
  el.append(label, arrow);
  opts.host.append(el);
  let enabled = true,
    hovered = false;
  // A single outline follows the roof, posts and the space below the board. No screen-size render pass.
  const contour: Array<[number, number]> = opts.shape?.contour ?? [
    [-1.7, 0],
    [-1.7, 2.9],
    [-2, 2.9],
    [0, 3.7],
    [2, 2.9],
    [1.7, 2.9],
    [1.7, 0],
    [1.5, 0],
    [1.5, 0.9],
    [-1.5, 0.9],
    [-1.5, 0],
    [-1.7, 0],
  ];
  const baseY = opts.shape?.baseY ?? opts.layout.plazaHeight,
    planeZ = opts.shape?.z ?? 0.46;
  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < contour.length; i++) {
    const a = contour[i - 1],
      b = contour[i];
    curve.add(
      new THREE.LineCurve3(
        new THREE.Vector3(a[0], baseY + a[1], planeZ),
        new THREE.Vector3(b[0], baseY + b[1], planeZ),
      ),
    );
  }
  const geometry = new THREE.TubeGeometry(curve, 100, 0.045, 5, false);
  const material = new THREE.MeshBasicMaterial({
    color: '#ffdb50',
    toneMapped: false,
    transparent: true,
    opacity: 0.8,
  });
  let outline: THREE.Object3D;
  if (opts.noOutline) {
    outline = new THREE.Object3D();
  } else if (opts.silhouette?.parent) {
    // a slightly larger copy that only shows its back faces: a glowing rim around the real shape
    const source = opts.silhouette;
    const parent = source.parent!;
    material.side = THREE.BackSide;
    material.depthWrite = false;
    const hull = source.clone(true);
    hull.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = material;
      object.castShadow = false;
      object.receiveShadow = false;
      object.userData.kind = 'live';
      object.raycast = () => {};
    });
    parent.updateMatrixWorld(true);
    const centre = parent.worldToLocal(new THREE.Box3().setFromObject(source).getCenter(new THREE.Vector3()));
    const grow = 1.035;
    hull.position.copy(source.position).sub(centre).multiplyScalar(grow).add(centre);
    hull.scale.copy(source.scale).multiplyScalar(grow);
    hull.name = 'cueSilhouette';
    parent.add(hull);
    outline = hull;
  } else {
    const tube = new THREE.Mesh(geometry, material);
    tube.name = 'questBoardOutline';
    tube.userData.kind = 'live';
    tube.raycast = () => {};
    opts.board?.add(tube);
    outline = tube;
  }
  let spooky = false;
  const setHovered = (on: boolean) => {
    hovered = enabled && on;
    if (spooky) material.color.set(hovered ? '#ffd27a' : '#ff8a1f');
    else material.color.set(hovered ? '#fff7ae' : '#ffdb50');
    material.opacity = hovered ? 1 : 0.8;
    el.classList.toggle('is-highlighted', hovered);
  };
  el.addEventListener('pointerenter', () => setHovered(true));
  el.addEventListener('pointerleave', () => setHovered(false));
  el.addEventListener('focus', () => setHovered(true));
  el.addEventListener('blur', () => setHovered(false));
  el.onclick = () => {
    if (enabled && !el.hidden) opts.onOpen();
  };
  const at =
    opts.shape?.at ??
    new THREE.Vector3(opts.layout.board.x, opts.layout.plazaHeight + 4.1, opts.layout.board.z);
  const api = {
    el,
    setHovered,
    /** Halloween world: Creepster, pumpkin colours and hopping letters (teacher, 28.10.2026). */
    setSpooky(on: boolean) {
      spooky = on;
      el.classList.toggle('spooky', on);
      setHovered(hovered);
    },
    setVisible(on: boolean) {
      enabled = on;
      outline.visible = on;
      if (!on) {
        el.hidden = true;
        setHovered(false);
      }
    },
    update(camera: THREE.Camera) {
      if (!enabled || !opts.board) {
        el.hidden = true;
        return;
      }
      camera.updateMatrixWorld();
      const p = at.clone().project(camera);
      el.hidden =
        at.distanceTo(camera.position) > 65 ||
        p.z < -1 ||
        p.z > 1 ||
        Math.abs(p.x) > 0.94 ||
        Math.abs(p.y) > 0.92;
      if (el.hidden) return;
      const width = opts.host.clientWidth || window.innerWidth,
        height = opts.host.clientHeight || window.innerHeight;
      el.style.left = `${Math.max(85, Math.min(width - 85, ((p.x + 1) * width) / 2))}px`;
      el.style.top = `${Math.max(150, Math.min(height - 20, ((1 - p.y) * height) / 2))}px`;
    },
    dispose() {
      el.remove();
      outline.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
  if (opts.spooky) api.setSpooky(true);
  return api;
}
