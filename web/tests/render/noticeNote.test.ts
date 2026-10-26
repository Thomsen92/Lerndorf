// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { setBoardNote } from '../../src/render/plaza';
it('keeps a single note and disposes replaced resources', () => {
  const root = new THREE.Group(),
    board = new THREE.Group();
  board.name = 'questBoard';
  board.userData.boardHeight = 2;
  root.add(board);
  const context = {
    fillStyle: '',
    font: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: (s: string) => ({ width: s.length * 12 }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  setBoardNote(root, 'Hello class');
  const first = board.getObjectByName('boardNote') as THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >;
  const dispose = vi.spyOn(first.material.map!, 'dispose');
  setBoardNote(root, 'Another note');
  expect(board.children.filter((c) => c.name === 'boardNote')).toHaveLength(1);
  expect(dispose).toHaveBeenCalled();
  setBoardNote(root, null);
  expect(board.children).toHaveLength(0);
  vi.restoreAllMocks();
});
