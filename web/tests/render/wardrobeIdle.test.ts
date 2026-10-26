import { it, expect } from 'vitest';
import { Group, Bone } from 'three';
import { createWardrobeIdle } from '../../src/render/wardrobeIdle';
it('adds gentle breathing without moving the feet or overriding manual rotation', () => {
  const root = new Group(),
    chest = new Bone();
  chest.name = 'mixamorigSpine2';
  root.add(chest);
  root.rotation.y = 1.2;
  const rest = chest.quaternion.clone(),
    idle = createWardrobeIdle(root);
  idle(1, true);
  expect(chest.quaternion.equals(rest)).toBe(false);
  expect(root.rotation.y).toBeCloseTo(1.2);
  expect(root.position.y).toBe(0);
  idle(2, false);
  expect(chest.quaternion.equals(rest)).toBe(true);
});
