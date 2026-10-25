import * as THREE from 'three';
import type { Layout, Plot } from '../world/layout';
import { SLOTS, rectCentre, TUTORIAL_FIGURE_LZ } from '../world/plotPlan';
import type { Sound } from '../ui/sound';
import { createMascot, type MascotReaction } from './sirByte';
import { createVoicePlayer } from './voice';
import { createByteBubble } from './bubble';
import { LINES, type LineKey } from './lines';
export interface TutorialGuide {
  ask(key: LineKey): Promise<void>;
  say(key: LineKey): void;
  react(reaction: MascotReaction): void;
  atPlot(plot?: Plot): void;
  pointHouse(): void;
  hideBubble(): void;
  restore(): void;
}
export function marketPose(layout: Layout) {
  const face = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  return {
    position: new THREE.Vector3(
      layout.board.x - 3.0 * Math.cos(face) + Math.sin(face) * 0.6,
      layout.plazaHeight + 0.9,
      layout.board.z + 3.0 * Math.sin(face) + Math.cos(face) * 0.6,
    ),
    face,
  };
}
export type MarketByte = ReturnType<typeof createMarketByte>;
export function createMarketByte(opts: {
  scene: THREE.Scene;
  layout: Layout;
  sound: Pick<Sound, 'enabled'>;
  openQuests: () => void;
  questState?: () => Promise<{ todayOpen: boolean; catchUpOpen: boolean }>;
}) {
  const mascot = createMascot({ voice: createVoicePlayer({ sound: opts.sound }), quality: 'low' });
  const root = new THREE.Group();
  root.name = 'Sir Byte';
  root.add(mascot.root);
  root.scale.setScalar(0.52);
  opts.scene.add(root);
  const host = document.createElement('div');
  host.className = 'byte-world-bubble';
  document.body.append(host);
  const bubble = createByteBubble(host),
    pose = marketPose(opts.layout);
  let disposed = false,
    covered = false,
    tutorial = false,
    pointing = false,
    busy = false,
    ticket = 0,
    plot: Plot | undefined;
  const frustum = new THREE.Frustum(),
    matrix = new THREE.Matrix4(),
    point = new THREE.Vector3();
  const restore = (): void => {
    ticket++;
    tutorial = false;
    pointing = false;
    plot = undefined;
    root.position.copy(pose.position);
    root.rotation.y = pose.face;
    mascot.stopVoice();
    void mascot.react('idle', { silent: true });
    bubble.hide();
  };
  restore();
  const guide: TutorialGuide = {
    ask(key) {
      ticket++;
      mascot.say(key);
      return bubble.ask(LINES[key]);
    },
    say(key) {
      ticket++;
      bubble.show(mascot.say(key), true);
    },
    react(reaction) {
      const token = ++ticket;
      void mascot.react(reaction).then((say) => {
        if (!disposed && token === ticket && say) bubble.show(say);
      });
    },
    atPlot(value) {
      tutorial = true;
      pointing = false;
      plot = value ?? opts.layout.plots[0];
      mascot.pop();
      bubble.hide();
      const lx = -3.8,
        lz = TUTORIAL_FIGURE_LZ - 0.4;
      root.position.set(
        plot.x + lx * Math.cos(plot.face) + lz * Math.sin(plot.face),
        plot.h + 0.8,
        plot.z - lx * Math.sin(plot.face) + lz * Math.cos(plot.face),
      );
      root.rotation.y = plot.face;
    },
    pointHouse() {
      if (!plot) return;
      const at = rectCentre(SLOTS[0]);
      root.updateMatrixWorld(true);
      // The vendor converts this fixed world point into its animated rig's space.
      const world = new THREE.Vector3(
        plot.x + at.lx * Math.cos(plot.face) + at.lz * Math.sin(plot.face),
        plot.h + 0.7,
        plot.z - at.lx * Math.sin(plot.face) + at.lz * Math.cos(plot.face),
      );
      mascot.point(world);
      guide.say('place');
    },
    hideBubble() {
      ticket++;
      bubble.hide();
      mascot.stopVoice();
    },
    restore,
  };
  return {
    root,
    mascot,
    guide,
    atPlot: guide.atPlot,
    restore,
    setCovered(value: boolean) {
      covered = value;
      if (value) {
        pointing = false;
        guide.hideBubble();
        void mascot.react('idle', { silent: true });
      }
    },
    async tap() {
      if (disposed || covered || tutorial || busy) return;
      if (pointing) {
        guide.hideBubble();
        pointing = false;
        opts.openQuests();
        return;
      }
      busy = true;
      try {
        const state = (await opts.questState?.()) ?? { todayOpen: true, catchUpOpen: false };
        if (disposed || covered || tutorial) return;
        if (!state.todayOpen && !state.catchUpOpen) {
          guide.react('celebrate');
          const token = ticket;
          window.setTimeout(() => {
            if (!disposed && token === ticket) bubble.show(mascot.say('allDoneMarket'));
          }, 3700);
        } else {
          pointing = true;
          root.updateMatrixWorld(true);
          mascot.point(
            new THREE.Vector3(opts.layout.board.x, opts.layout.plazaHeight + 2, opts.layout.board.z),
          );
          bubble.show(mascot.say(state.todayOpen ? 'board' : 'catchUp'));
        }
      } catch {
        if (!disposed && !covered) {
          pointing = true;
          bubble.show(mascot.say('board'));
        }
      } finally {
        busy = false;
      }
    },
    setQuality: mascot.setQuality,
    update(dt: number, camera: THREE.Camera, reducedMotion: boolean) {
      if (disposed || covered) return;
      const distance = camera.position.distanceTo(root.position);
      root.visible = distance <= 90;
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      const visible =
        distance <= 60 &&
        frustum.intersectsSphere(new THREE.Sphere(root.position.clone().add(new THREE.Vector3(0, 1, 0)), 2));
      if (!visible) {
        bubble.anchor(null);
        return;
      }
      if (!tutorial && !pointing && distance < 25)
        root.rotation.y = Math.atan2(
          camera.position.x - root.position.x,
          camera.position.z - root.position.z,
        );
      mascot.update(dt, { reducedMotion, viewer: camera.position });
      root.updateMatrixWorld(true);
      point.set(0, 3.6, 0);
      root.localToWorld(point);
      point.project(camera);
      bubble.anchor({ x: ((point.x + 1) * innerWidth) / 2, y: ((1 - point.y) * innerHeight) / 2 });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ticket++;
      mascot.dispose();
      root.removeFromParent();
      bubble.dispose();
      host.remove();
    },
  };
}
