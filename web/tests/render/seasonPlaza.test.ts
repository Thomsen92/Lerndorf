import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../../src/render/kenney', () => ({ kenneyModel: vi.fn().mockResolvedValue(null) }));
vi.mock('../../src/render/textures', () => ({ pavingTexture: () => new THREE.Texture() }));
import { buildPlaza } from '../../src/render/plaza';
import { bakeStatic } from '../../src/render/merge';
import { buildLayout } from '../../src/world/layout';

it('toggles only the fountain and replaceable stalls after baking, preserving the interactive board', () => {
  const plaza = bakeStatic(buildPlaza(buildLayout(11, 4)));
  const normal = plaza.getObjectByName('normalSeasonPlaza')!;
  const board = plaza.getObjectByName('questBoard')!;
  expect(normal.children.length).toBe(6);
  expect(board.children.length).toBeGreaterThan(10);
  plaza.userData.setSeasonTheme('halloween');
  expect(normal.visible).toBe(false);
  expect(board.visible).toBe(true);
  expect(board.children.every((o) => o.userData.kind === 'board')).toBe(true);
  const stalls = plaza.getObjectByName('halloweenStalls')!;
  expect(stalls.visible).toBe(true);
  expect(stalls.children).toHaveLength(3);
  plaza.userData.setSeasonTheme('normal');
  expect(normal.visible).toBe(true);
  expect(stalls.visible).toBe(false);
  plaza.userData.setSeasonTheme('halloween');
  expect(plaza.getObjectByName('halloweenStalls')).toBe(stalls);
  expect(stalls.children).toHaveLength(3);
});

it('builds no Halloween stalls while the plaza stays normal', () => {
  const plaza = bakeStatic(buildPlaza(buildLayout(11, 4)));
  plaza.userData.setSeasonTheme('normal');
  expect(plaza.getObjectByName('halloweenStalls')).toBeUndefined();
});
