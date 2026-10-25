import { expect, it } from 'vitest';
import * as THREE from 'three';
import { frameTutorialSubjects } from '../../src/render/tutorialFraming';
it('keeps both tutorial characters inside landscape, portrait and phone views', () => {
  const first = new THREE.Vector3(-3.8, 1.6, 0),
    second = new THREE.Vector3(0, 1, 0.4);
  for (const aspect of [1.33, 0.69, 0.46]) {
    const pose = frameTutorialSubjects(
      { position: new THREE.Vector3(1, 2.8, 4.9), target: second },
      { first, second, aspect, fov: aspect < 1 ? 52 : 38 },
    );
    const camera = new THREE.PerspectiveCamera(aspect < 1 ? 52 : 38, aspect, 0.1, 100);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
    for (const center of [first, second])
      for (const dx of [-0.7, 0.7])
        for (const dy of [-0.9, 0.9]) {
          const at = center
            .clone()
            .add(new THREE.Vector3(dx, dy, 0))
            .project(camera);
          expect(Math.abs(at.x)).toBeLessThan(0.95);
          expect(Math.abs(at.y)).toBeLessThan(0.95);
        }
  }
});
