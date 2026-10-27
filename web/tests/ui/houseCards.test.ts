// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { SLOTS, rectCentre } from '../../src/world/plotPlan';
import { createHouseCards } from '../../src/ui/houseCards';
it('projects crisp own/nearby cards, opens the right profile and refreshes level/title', () => {
  const host = document.createElement('div');
  Object.defineProperties(host, { clientWidth: { value: 1024 }, clientHeight: { value: 768 } });
  document.body.append(host);
  const own = vi.fn(),
    visit = vi.fn();
  const cards = createHouseCards({
    host,
    plots: [
      { index: 0, x: 0, z: 0, h: 0, face: 0 },
      { index: 1, x: 8, z: 0, h: 0, face: 0 },
    ],
    members: [
      { id: 'a', plotIndex: 0, nickname: 'Lea', level: 7, titleLabel: 'Busy Bee' },
      { id: 'b', plotIndex: 1, nickname: 'Ben', level: 2, titleLabel: null },
    ],
    ownId: 'a',
    onOwn: own,
    onVisit: visit,
  });
  const camera = new PerspectiveCamera(38, 1024 / 768, 0.1, 400);
  camera.position.set(8, 12, 22);
  camera.lookAt(new Vector3(0, 0, 0));
  cards.update(camera);
  const mine = host.querySelector<HTMLButtonElement>('[data-member-id=a]')!,
    other = host.querySelector<HTMLButtonElement>('[data-member-id=b]')!;
  expect(mine.hidden).toBe(false);
  mine.click();
  expect(own).toHaveBeenCalled();
  other.click();
  expect(visit).toHaveBeenCalledWith('b', other);
  cards.updateMember({ id: 'a', nickname: 'Lea', level: 10, titleLabel: 'Grammar Explorer' });
  expect(mine.textContent).toContain('Grammar Explorer');
  cards.setVisible(false);
  expect(host.querySelector<HTMLElement>('.house-cards')!.hidden).toBe(true);
  cards.dispose();
  host.remove();
  expect(document.querySelector('.house-cards')).toBeNull();
});

it('chooses an on-screen neighbour even when a closer selected house is behind the camera', () => {
  const host = document.createElement('div'),
    centre = rectCentre(SLOTS[0]);
  const cards = createHouseCards({
    host,
    plots: [
      { index: 0, x: -centre.lx, z: 3 - centre.lz, h: 0, face: 0 },
      { index: 1, x: -centre.lx, z: -12 - centre.lz, h: 0, face: 0 },
    ],
    members: [
      { id: 'behind', plotIndex: 0, nickname: 'Behind' },
      { id: 'front', plotIndex: 1, nickname: 'Front' },
    ],
    ownId: 'own',
    onOwn: vi.fn(),
    onVisit: vi.fn(),
  });
  const camera = new PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(0, 6, 0);
  camera.lookAt(0, 6, -1);
  host.querySelector<HTMLButtonElement>('[data-member-id=behind]')!.click();
  cards.update(camera);
  expect(host.querySelector<HTMLButtonElement>('[data-member-id=behind]')!.hidden).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('[data-member-id=front]')!.hidden).toBe(false);
  cards.dispose();
});
