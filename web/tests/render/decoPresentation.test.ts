import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createDecoPresentation } from '../../src/render/decoPresentation';

const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 4, 8);
const find = (p: ReturnType<typeof createDecoPresentation>, name: string) => p.root.getObjectByName(name)!;

describe('decoration presentation', () => {
  it('places each surface and its fixed contour at the matching support height', () => {
    for (const [id, height] of [
      ['shop_pocket_meadow', 0.05],
      ['shop_evening_lantern', 0.16],
      ['reward_ollie_nyc_postcard', 0.38],
    ] as const) {
      const p = createDecoPresentation(id);
      const bounds = new THREE.Box3().setFromObject(find(p, 'plinth-base'));
      expect(bounds.min.y).toBeCloseTo(0);
      expect(bounds.max.y).toBeCloseTo(height);
      expect(find(p, 'plinth-ring').getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(height + 0.004);
      const position = find(p, 'plinth-ring').position.clone();
      p.update(20, camera, 'high', false);
      p.update(40, camera, 'low', true);
      expect(find(p, 'plinth-ring').position).toEqual(position);
      p.dispose();
    }
  });
  it('keeps one fixed contour on the top, warm lighting and the selected base for every rarity', () => {
    const p = createDecoPresentation();
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      p.setRarity(rarity);
      p.update(8, camera, 'high', false);
      expect(p.root.getObjectsByProperty('name', 'plinth-ring')).toHaveLength(1);
      const top = find(p, 'plinth-ring').getWorldPosition(new THREE.Vector3()).y;
      expect(top).toBeCloseTo(p.root.userData.plinthStyle.height + 0.004);
      expect(find(p, 'warm-light-pool').visible).toBe(true);
      const bounds = new THREE.Box3().setFromObject(find(p, 'plinth-base'));
      expect(bounds.min.y).toBeCloseTo(0);
      expect(bounds.max.y).toBeCloseTo(p.root.userData.plinthStyle.height);
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(p.root.userData.plinthStyle.width);
      expect(find(p, 'colored-light-mist').visible).toBe(rarity !== 'common');
    }
    p.dispose();
  });

  it('fits the loaded model in local space, without changing it, and ignores late loads after disposal', () => {
    const p = createDecoPresentation('shop_one_more_chapter');
    const model = new THREE.Mesh(new THREE.BoxGeometry(1.46, 1.7, 0.5));
    const parent = new THREE.Group();
    parent.rotation.y = 1.1;
    parent.position.set(8, 4, 7);
    parent.add(model);
    const originalScale = model.scale.clone();
    p.fitModel(model);
    expect(p.root.userData.plinthStyle.width).toBeCloseTo(1.8);
    expect(p.root.userData.plinthStyle.depth).toBeCloseTo(0.84);
    expect(p.root.userData.plinthStyle.shape).toBe('rect');
    expect(model.scale).toEqual(originalScale);
    p.setRarity('epic');
    p.update(10, camera, 'low', true);
    expect(p.root.getObjectsByProperty('name', 'plinth-ring')).toHaveLength(1);
    const before = { ...p.root.userData.plinthStyle };
    p.dispose();
    p.fitModel(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3)));
    expect(p.root.userData.plinthStyle).toEqual(before);
  });

  it('changes quality and rarity without replacing GPU resources; culls distant extras', () => {
    const p = createDecoPresentation();
    p.setRarity('legendary');
    const rays = find(p, 'rising-rays') as THREE.Mesh;
    const points = find(p, 'rising-particles') as THREE.Points;
    const geometry = points.geometry;
    p.update(1, camera, 'high', false);
    expect(geometry.drawRange.count).toBe(80);
    expect(rays.geometry.drawRange.count).toBe(24 * 36);
    p.update(2, camera, 'low', false);
    expect(points.geometry).toBe(geometry);
    expect(geometry.drawRange.count).toBe(32);
    expect(rays.geometry.drawRange.count).toBe(12 * 36);
    const far = camera.clone();
    far.position.z = 40;
    p.update(3, far, 'low', false);
    expect(rays.visible).toBe(false);
    expect(points.visible).toBe(false);
    expect(find(p, 'plinth-base').visible).toBe(true);
    p.update(3, far, 'high', false);
    expect(rays.visible).toBe(true);
    p.dispose();
  });

  it('freezes motion and hides particles for reduced motion and caps stage lighting by authorization and distance', () => {
    const p = createDecoPresentation();
    p.setRarity('rare');
    const rays = find(p, 'rising-rays') as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    const light = find(p, 'stage-light') as THREE.SpotLight;
    p.update(10, camera, 'high', true);
    expect(rays.material.uniforms.uTime.value).toBe(0);
    expect(find(p, 'rising-particles').visible).toBe(false);
    expect(light.visible).toBe(false);
    p.root.userData.stageLightAllowed = true;
    p.update(10, camera, 'high', false);
    expect(light.visible).toBe(true);
    expect(light.castShadow).toBe(false);
    const far = camera.clone();
    far.position.z = 30;
    p.update(10, far, 'high', false);
    expect(light.visible).toBe(false);
    p.dispose();
  });

  it('faces the mist toward the camera even below a rotated parent', () => {
    const p = createDecoPresentation();
    p.setRarity('epic');
    const parent = new THREE.Group();
    parent.rotation.y = 1.2;
    parent.position.set(3, 0, 2);
    parent.add(p.root);
    p.update(0, camera, 'high', false);
    const mist = find(p, 'colored-light-mist');
    const localCamera = p.root.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
    expect(mist.rotation.y).toBeCloseTo(Math.atan2(localCamera.x, localCamera.z));
    p.dispose();
  });

  it('disposes owned resources once and preserves shared resources while another presentation lives', () => {
    const a = createDecoPresentation(),
      b = createDecoPresentation();
    const scene = new THREE.Scene();
    scene.add(a.root, b.root);
    const ringA = find(a, 'plinth-ring') as THREE.Mesh;
    const ringB = find(b, 'plinth-ring') as THREE.Mesh;
    expect(ringA.geometry).toBe(ringB.geometry);
    const sharedDispose = vi.spyOn(ringA.geometry, 'dispose');
    const materialDispose = vi.spyOn(ringA.material as THREE.Material, 'dispose');
    a.dispose();
    a.dispose();
    expect(a.root.parent).toBeNull();
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(sharedDispose).not.toHaveBeenCalled();
    b.setRarity('epic');
    b.update(1, camera, 'high', false);
    expect(find(b, 'rising-rays').visible).toBe(true);
    b.dispose();
    expect(sharedDispose).toHaveBeenCalledTimes(1);
  });
});
