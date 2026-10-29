import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createDecoPresentation } from '../../src/render/decoPresentation';

const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 4, 8);
const find = (p: ReturnType<typeof createDecoPresentation>, name: string) => p.root.getObjectByName(name)!;

describe('decoration presentation', () => {
  it('keeps one fixed ring, warm lighting and a 2.8 m base for every rarity', () => {
    const p = createDecoPresentation();
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      p.setRarity(rarity);
      p.update(8, camera, 'high', false);
      expect(p.root.children.filter((o) => o.name === 'plinth-ring')).toHaveLength(1);
      expect(find(p, 'plinth-ring').position.y).toBe(0.224);
      expect(find(p, 'warm-light-pool').visible).toBe(true);
      const bounds = new THREE.Box3().setFromObject(find(p, 'plinth-base'));
      expect(bounds.min.y).toBeCloseTo(0);
      expect(bounds.max.y).toBeCloseTo(0.22);
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(2.8);
      expect(find(p, 'colored-light-mist').visible).toBe(rarity !== 'common');
    }
    p.dispose();
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
