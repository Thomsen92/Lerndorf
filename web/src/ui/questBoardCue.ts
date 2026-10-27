import * as THREE from 'three';
import { tr } from '../i18n';
import type { Layout } from '../world/layout';
import './questBoardCue.css';

export function createQuestBoardCue(opts: {
  host: HTMLElement;
  board?: THREE.Object3D;
  layout: Layout;
  onOpen: () => void;
}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'quest-board-cue';
  el.hidden = true;
  el.setAttribute('aria-label', tr('Questtafel öffnen – Tagesaufgaben'));
  const label = document.createElement('span'),
    arrow = document.createElement('img');
  label.className = 'quest-board-label';
  label.textContent = tr('Tagesaufgaben');
  arrow.src = `${import.meta.env.BASE_URL}assets/kenney/ui/quest-arrow.svg`;
  arrow.alt = '';
  arrow.draggable = false;
  el.append(label, arrow);
  opts.host.append(el);
  let enabled = true,
    hovered = false;
  // A single outline follows the roof, posts and the space below the board. No screen-size render pass.
  const contour = [
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
  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < contour.length; i++) {
    const a = contour[i - 1],
      b = contour[i];
    curve.add(
      new THREE.LineCurve3(
        new THREE.Vector3(a[0], opts.layout.plazaHeight + a[1], 0.46),
        new THREE.Vector3(b[0], opts.layout.plazaHeight + b[1], 0.46),
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
  const outline = new THREE.Mesh(geometry, material);
  outline.name = 'questBoardOutline';
  outline.userData.kind = 'live';
  outline.raycast = () => {};
  opts.board?.add(outline);
  const setHovered = (on: boolean) => {
    hovered = enabled && on;
    material.color.set(hovered ? '#fff7ae' : '#ffdb50');
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
  const at = new THREE.Vector3(opts.layout.board.x, opts.layout.plazaHeight + 4.1, opts.layout.board.z);
  return {
    el,
    setHovered,
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
}
