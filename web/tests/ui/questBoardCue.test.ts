// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildLayout } from '../../src/world/layout';
import { createQuestBoardCue } from '../../src/ui/questBoardCue';
import { questBoardView } from '../../src/render/questBoardCamera';
it('anchors an accessible quest action to the board, highlights on hover and hides when covered or behind the camera', () => {
  const layout = buildLayout(8, 34, 'tal'),
    host = document.createElement('div'),
    board = new THREE.Group(),
    open = vi.fn();
  board.position.set(layout.board.x, 0, layout.board.z);
  board.rotation.y = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  document.body.append(host);
  const cue = createQuestBoardCue({ host, board, layout, onOpen: open });
  const pose = questBoardView(layout, 1.33, 38),
    camera = new THREE.PerspectiveCamera(38, 1.33, 0.1, 400);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  cue.update(camera);
  expect(cue.el.hidden).toBe(false);
  expect(cue.el.textContent).toContain('Tagesaufgaben');
  cue.el.dispatchEvent(new Event('pointerenter'));
  expect(cue.el.classList.contains('is-highlighted')).toBe(true);
  cue.el.click();
  expect(open).toHaveBeenCalledOnce();
  cue.setVisible(false);
  cue.el.click();
  expect(open).toHaveBeenCalledTimes(1);
  expect(cue.el.hidden).toBe(true);
  cue.setVisible(true);
  camera.lookAt(camera.position.clone().add(camera.position.clone().sub(pose.target)));
  cue.update(camera);
  expect(cue.el.hidden).toBe(true);
  cue.dispose();
  expect(host.children).toHaveLength(0);
  expect(board.children).toHaveLength(0);
  host.remove();
});
