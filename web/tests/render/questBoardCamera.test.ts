import { expect, it } from 'vitest';
import * as THREE from 'three';
import { buildLayout } from '../../src/world/layout';
import { marketPose } from '../../src/mascot/marketByte';
import { questBoardView } from '../../src/render/questBoardCamera';
it('fits Sir Byte, the entire board and its cue in portrait and landscape without violating orbit limits', () => {
  for (const map of ['tal', 'fluss_mitte', 'bach_norden']) {
    const layout = buildLayout(8, 34, map);
    for (const aspect of [0.46, 0.75, 1.33, 1.78]) {
      const { position, target } = questBoardView(layout, aspect, 38);
      const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 400);
      camera.position.copy(position);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      const byte = marketPose(layout),
        board = new THREE.Vector3(layout.board.x, layout.plazaHeight, layout.board.z);
      const right = new THREE.Vector3(Math.cos(byte.face), 0, -Math.sin(byte.face));
      for (const point of [
        byte.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
        board
          .clone()
          .addScaledVector(right, -2.2)
          .add(new THREE.Vector3(0, 2, 0)),
        board
          .clone()
          .addScaledVector(right, 2.2)
          .add(new THREE.Vector3(0, 2, 0)),
        board.clone().add(new THREE.Vector3(0, 5.5, 0)),
      ]) {
        point.project(camera);
        expect(Math.abs(point.x)).toBeLessThan(0.9);
        expect(Math.abs(point.y)).toBeLessThan(0.9);
        expect(point.z).toBeGreaterThan(-1);
        expect(point.z).toBeLessThan(1);
      }
      const offset = position.clone().sub(target);
      expect(offset.length()).toBeGreaterThanOrEqual(12);
      expect(new THREE.Spherical().setFromVector3(offset).phi).toBeLessThanOrEqual(1.2);
    }
  }
});
