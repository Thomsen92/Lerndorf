import * as THREE from 'three';
import type { CameraPose } from './houseCamera';
/** Preserve the viewing direction, fitting the pupil and companion with room for their silhouettes. */
export function frameTutorialSubjects(
  pose: CameraPose,
  opts: { first: THREE.Vector3; second: THREE.Vector3; aspect: number; fov: number; overview?: boolean },
): CameraPose {
  const target = opts.overview
    ? pose.target.clone().lerp(opts.first, 0.25)
    : opts.first.clone().lerp(opts.second, 0.5);
  const direction = pose.position.clone().sub(pose.target).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(opts.fov / 2)),
    tanH = tanV * Math.max(0.3, opts.aspect);
  let distance = pose.position.distanceTo(pose.target);
  for (const subject of [opts.first, opts.second]) {
    const relative = subject.clone().sub(target),
      depth = relative.dot(direction);
    distance = Math.max(
      distance,
      (Math.abs(relative.dot(right)) + 1.1) / tanH + depth,
      (Math.abs(relative.dot(up)) + 1.5) / tanV + depth,
    );
  }
  return { target, position: target.clone().addScaledVector(direction, distance * 1.06) };
}
