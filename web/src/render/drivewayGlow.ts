import * as THREE from 'three';
import type { DecoPresentation, DecoRarity } from './decoPresentation';

const COLORS = { common: '#ffc56b', rare: '#62b8ff', epic: '#cc83ff', legendary: '#ffd15c' };
const vertex =
  'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const output = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';

/** Flat driveway lighting; no raised platform, extra real lights or postprocessing. */
export function createDrivewayGlow(width: number, depth: number): DecoPresentation {
  const root = new THREE.Group();
  root.name = 'driveway-glow';
  root.userData.bakeStatic = false;
  const plane = new THREE.PlaneGeometry(1, 1);
  const shader = (body: string) =>
    new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: `varying vec2 vUv;uniform vec3 uColor;uniform float uTime;void main(){${body}${output}}`,
      uniforms: { uColor: { value: new THREE.Color(COLORS.common) }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
  const floorMaterial = shader(`
    vec2 q=abs(vUv*2.0-1.0);
    float edge=exp(-pow((q.x-0.91)/0.065,2.0))*(1.0-smoothstep(0.9,1.0,q.y));
    float ends=exp(-pow((q.y-0.93)/0.04,2.0))*(1.0-smoothstep(0.9,1.0,q.x));
    float pool=(1.0-smoothstep(0.4,1.0,q.x))*(1.0-smoothstep(0.65,1.0,q.y));
    float pulse=0.85+0.15*sin(vUv.y*9.0-uTime*1.1);
    gl_FragColor=vec4(uColor,(max(edge,ends)*0.8+pool*0.16)*pulse);`);
  const floor = new THREE.Mesh(plane, floorMaterial);
  floor.name = 'driveway-light';
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(width, depth, 1);
  floor.position.y = 0.015;
  root.add(floor);
  const mistMaterial = shader(`
    float fade=pow(1.0-vUv.y,2.2);
    float ends=smoothstep(0.0,0.12,vUv.x)*(1.0-smoothstep(0.88,1.0,vUv.x));
    float wisps=0.72+0.28*sin(vUv.x*22.0-uTime*0.5+vUv.y*7.0);
    gl_FragColor=vec4(uColor,fade*ends*wisps*0.22);`);
  const mist = new THREE.Group();
  mist.name = 'driveway-mist';
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(plane, mistMaterial);
    strip.scale.set(depth, 0.85, 1);
    strip.rotation.y = Math.PI / 2;
    strip.position.set(side * width * 0.45, 0.44, 0);
    mist.add(strip);
  }
  root.add(mist);
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(new Float32Array(48 * 3), 3).setUsage(
    THREE.DynamicDrawUsage,
  );
  particleGeometry.setAttribute('position', positions);
  particleGeometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, 0.7, 0),
    Math.hypot(width, depth) / 2 + 1.5,
  );
  const particleMaterial = new THREE.ShaderMaterial({
    vertexShader:
      'varying float vFade;void main(){vFade=sin(clamp(position.y/1.5,0.0,1.0)*3.14159);vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(65.0/max(1.0,-p.z),1.0,9.0);}',
    fragmentShader: `uniform vec3 uColor;varying float vFade;void main(){vec2 q=gl_PointCoord*2.0-1.0;gl_FragColor=vec4(uColor,exp(-dot(q,q)*5.0)*vFade*0.8);${output}}`,
    uniforms: { uColor: { value: new THREE.Color(COLORS.common) } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.name = 'driveway-sparks';
  root.add(particles);
  let rarity: DecoRarity = 'common',
    disposed = false;
  const cameraWorld = new THREE.Vector3(),
    world = new THREE.Vector3();
  function setRarity(value: DecoRarity): void {
    if (disposed) return;
    rarity = value;
    for (const mat of [floorMaterial, mistMaterial, particleMaterial])
      mat.uniforms.uColor.value.set(COLORS[value]);
    mist.visible = particles.visible = value !== 'common';
  }
  function update(time: number, camera: THREE.Camera, quality: 'low' | 'high', reduced: boolean): void {
    if (disposed) return;
    const near =
      camera.getWorldPosition(cameraWorld).distanceTo(root.getWorldPosition(world)) <=
      (quality === 'low' ? 35 : 50);
    const extras = rarity !== 'common' && near;
    mist.visible = extras;
    particles.visible = extras && !reduced;
    floorMaterial.uniforms.uTime.value = mistMaterial.uniforms.uTime.value = reduced ? 0 : time;
    if (!particles.visible) return;
    const count = (rarity === 'legendary' ? 48 : rarity === 'epic' ? 36 : 24) / (quality === 'low' ? 2 : 1);
    particleGeometry.setDrawRange(0, count);
    for (let i = 0; i < count; i++) {
      const age = (((time / (3 + (i % 5) * 0.3) + i * 0.618034) % 1) + 1) % 1;
      positions.setXYZ(
        i,
        (i % 2 ? 1 : -1) * width * 0.45,
        age * 1.5,
        (((i * 0.381966) % 1) - 0.5) * depth * 0.92,
      );
    }
    positions.needsUpdate = true;
  }
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    root.clear();
    plane.dispose();
    particleGeometry.dispose();
    floorMaterial.dispose();
    mistMaterial.dispose();
    particleMaterial.dispose();
  }
  setRarity('common');
  return { root, setRarity, update, dispose };
}
