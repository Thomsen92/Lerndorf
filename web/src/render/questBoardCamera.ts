import * as THREE from 'three';
import type { Layout } from '../world/layout';
import type { CameraPose } from './houseCamera';
import { marketPose } from '../mascot/marketByte';

/** Always approach the front of the board, fitting the robot and arrow on narrow screens too. */
export function questBoardView(layout: Layout, aspect: number, fov: number): CameraPose {
  const byte = marketPose(layout),
    board = new THREE.Vector3(layout.board.x, layout.plazaHeight, layout.board.z);
  const target = byte.position.clone().lerp(board, 0.5);
  target.y = layout.plazaHeight + 2.2;
  const direction = new THREE.Vector3(Math.sin(byte.face), 0.65, Math.cos(byte.face)).normalize();
  const right = new THREE.Vector3(Math.cos(byte.face), 0, -Math.sin(byte.face));
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2)),
    tanH = tanV * Math.max(0.3, aspect);
  const subjects = [
    byte.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
    board
      .clone()
      .addScaledVector(right, -2.3)
      .add(new THREE.Vector3(0, 2, 0)),
    board
      .clone()
      .addScaledVector(right, 2.3)
      .add(new THREE.Vector3(0, 2, 0)),
    board.clone().add(new THREE.Vector3(0, 5.8, 0)),
    board.clone(),
  ];
  let distance = 12;
  for (const subject of subjects) {
    const at = subject.clone().sub(target),
      depth = at.dot(direction);
    distance = Math.max(
      distance,
      (Math.abs(at.dot(right)) + 0.8) / (tanH * 0.8) + depth,
      (Math.abs(at.dot(up)) + 0.5) / (tanV * 0.68) + depth,
    );
  }
  return { target, position: target.clone().addScaledVector(direction, distance) };
}
