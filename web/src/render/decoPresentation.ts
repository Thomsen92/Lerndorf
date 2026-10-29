import * as THREE from 'three';

export type DecoRarity = 'common' | 'rare' | 'epic' | 'legendary';
type Quality = 'low' | 'high';
const COLORS = { common: '#ffc56b', rare: '#62b8ff', epic: '#cc83ff', legendary: '#ffd15c' };
const COUNTS = {
  common: [0, 0, 0, 0],
  rare: [8, 16, 18, 44],
  epic: [10, 20, 24, 60],
  legendary: [12, 24, 32, 80],
};
const RADIUS = 1.27,
  RISE = 2.1,
  RING_Y = 0.224;
const output = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
const passVertex =
  'varying vec2 vLocal; varying vec2 vUv; void main(){vLocal=position.xy;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';

function material(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  vertexShader = passVertex,
) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
}

function rayGeometry(count: number) {
  const positions: number[] = [],
    uvs: number[] = [],
    phases: number[] = [],
    indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count,
      offset = positions.length / 3;
    for (let row = 0; row <= 6; row++)
      for (let side = 0; side < 2; side++) {
        const progress = row / 6,
          radius = RADIUS * 0.955 + progress * (1.45 - RADIUS * 0.955);
        const tangent = (side - 0.5) * (0.12 + (i % 3) * 0.045) * (1 - progress * 0.45);
        positions.push(
          Math.cos(angle) * radius - Math.sin(angle) * tangent,
          progress * RISE * (0.5 + (i % 5) * 0.13),
          Math.sin(angle) * radius + Math.cos(angle) * tangent,
        );
        uvs.push(side, progress);
        phases.push(i * 1.71);
      }
    for (let row = 0; row < 6; row++) {
      const a = offset + row * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setIndex(indices);
  geometry.setDrawRange(0, count * 36);
  geometry.computeBoundingSphere();
  return geometry;
}

function makeShared() {
  return {
    base: new THREE.BoxGeometry(2.8, 0.22, 2.8),
    plane: new THREE.PlaneGeometry(1, 1),
    ring: new THREE.RingGeometry(0.82, 1.08, 96),
    rays: new Map([8, 10, 12, 16, 20, 24].map((n) => [n, rayGeometry(n)])),
  };
}
let shared: ReturnType<typeof makeShared> | undefined;
let users = 0;

/** A model-independent stage. Its local origin is the bottom of the plinth. */
export function createDecoPresentation() {
  const geometry = (shared ??= makeShared());
  users++;
  const root = new THREE.Group();
  root.name = 'deco-presentation';
  root.userData.bakeStatic = false;
  root.userData.stageLightAllowed = false;
  const ownedMaterials: THREE.Material[] = [];
  const own = <T extends THREE.Material>(value: T): T => {
    ownedMaterials.push(value);
    return value;
  };
  const color = () => ({ value: new THREE.Color(COLORS.common) });
  const base = new THREE.Mesh(
    geometry.base,
    own(
      new THREE.MeshStandardMaterial({
        color: '#b39b74',
        roughness: 0.88,
        emissive: '#ffc071',
        emissiveIntensity: 0.14,
      }),
    ),
  );
  base.name = 'plinth-base';
  base.position.y = 0.11;
  base.receiveShadow = true;
  root.add(base);
  // Analytic radial gradients replace the prototype's canvas texture, so construction is DOM-free.
  const poolFragment = `varying vec2 vLocal;uniform vec3 uColor;uniform float uOpacity;
    void main(){float r=length(vLocal)*2.0;float alpha=exp(-r*r*4.5)*(1.0-smoothstep(0.65,1.0,r));
    gl_FragColor=vec4(uColor,alpha*uOpacity);${output}}`;
  const pool = new THREE.Mesh(
    geometry.plane,
    own(
      material(poolFragment, {
        uColor: { value: new THREE.Color('#ffbe6e') },
        uOpacity: { value: 0.48 },
      }),
    ),
  );
  pool.name = 'warm-light-pool';
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.221;
  pool.scale.setScalar(2.75);
  root.add(pool);
  const light = new THREE.SpotLight('#ffc071', 10, 9, Math.PI / 5, 0.9, 1.25);
  light.name = 'stage-light';
  light.position.set(0.9, 4.8, 1.8);
  light.castShadow = false;
  light.visible = false;
  const target = new THREE.Object3D();
  target.position.y = 1.2;
  light.target = target;
  root.add(light, target);
  const ringMaterial = own(
    material(
      `varying vec2 vLocal;uniform vec3 uColor;uniform float uOpacity;
    void main(){float radius=length(vLocal);float d=abs(radius-0.955);
    float soft=exp(-d*d/0.0018)*(1.0-smoothstep(1.055,1.08,radius));float core=exp(-d*d/0.0004);
    gl_FragColor=vec4(uColor*(1.0+0.45*core),max(soft,core)*uOpacity);${output}}`,
      { uColor: color(), uOpacity: { value: 0.65 } },
    ),
  );
  ringMaterial.blending = THREE.NormalBlending;
  const ring = new THREE.Mesh(geometry.ring, ringMaterial);
  ring.name = 'plinth-ring';
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = RING_Y;
  ring.scale.setScalar(RADIUS);
  root.add(ring);
  const mistMaterial = own(
    material(
      `varying vec2 vUv;uniform vec3 uColor;uniform float uTime;uniform float uOpacity;
    void main(){float x=(vUv.x-0.5)*2.0;float y=vUv.y;
    float sides=exp(-pow(x/(0.72+0.28*y),2.0)*2.7)*(1.0-smoothstep(0.78,1.0,abs(x)));
    float lift=pow(1.0-y,1.6);float base=exp(-y*5.0);
    float wisps=0.72+0.28*sin(vUv.x*13.0+y*9.0-uTime*0.45)*sin(vUv.x*7.0-y*17.0+uTime*0.3);
    float alpha=sides*lift*(0.38+0.62*base)*wisps*uOpacity;
    gl_FragColor=vec4(uColor*(1.0+0.35*base),alpha);${output}}`,
      { uColor: color(), uTime: { value: 0 }, uOpacity: { value: 0.44 } },
    ),
  );
  const mist = new THREE.Mesh(geometry.plane, mistMaterial);
  mist.name = 'colored-light-mist';
  mist.scale.set(2.9, RISE * 1.08, 1);
  mist.position.y = RING_Y + (RISE * 1.08) / 2;
  root.add(mist);
  const coloredPoolMaterial = own(material(poolFragment, { uColor: color(), uOpacity: { value: 0.62 } }));
  const coloredPool = new THREE.Mesh(geometry.plane, coloredPoolMaterial);
  coloredPool.name = 'colored-light-pool';
  coloredPool.rotation.x = -Math.PI / 2;
  coloredPool.scale.setScalar(2.9);
  coloredPool.position.y = 0.222;
  root.add(coloredPool);
  const raysMaterial = own(
    material(
      `varying vec2 vUv;varying float vPhase;uniform vec3 uColor;uniform float uTime;
    void main(){float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),0.85);float fade=pow(1.0-vUv.y,1.05);
    float head=fract(uTime*0.28+vPhase);float trail=exp(-pow((vUv.y-head)/0.17,2.0));
    gl_FragColor=vec4(uColor,edge*fade*(0.45+0.55*trail)*0.9);${output}}`,
      { uColor: color(), uTime: { value: 0 } },
      'varying vec2 vUv;varying float vPhase;attribute float aPhase;void main(){vUv=uv;vPhase=aPhase;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    ),
  );
  const rays = new THREE.Mesh(geometry.rays.get(24)!, raysMaterial);
  rays.name = 'rising-rays';
  rays.position.y = RING_Y;
  root.add(rays);
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(new Float32Array(80 * 3), 3).setUsage(
    THREE.DynamicDrawUsage,
  );
  const alpha = new THREE.Float32BufferAttribute(new Float32Array(80), 1).setUsage(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute('position', positions);
  particleGeometry.setAttribute('aAlpha', alpha);
  particleGeometry.setAttribute(
    'aSize',
    new THREE.Float32BufferAttribute(
      Array.from({ length: 80 }, (_, i) => (i % 5 === 0 ? 0.22 : 0.11)),
      1,
    ),
  );
  particleGeometry.setAttribute(
    'aSpark',
    new THREE.Float32BufferAttribute(
      Array.from({ length: 80 }, (_, i) => (i % 5 === 0 ? 1 : 0)),
      1,
    ),
  );
  particleGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, RISE / 2, 0), RADIUS + RISE);
  const particleMaterial = own(
    material(
      `varying float vAlpha;varying float vSpark;uniform vec3 uColor;
    void main(){vec2 q=gl_PointCoord*2.0-1.0;float disk=exp(-dot(q,q)*5.0);
    float star=exp(-abs(q.x)*22.0-abs(q.y)*3.0)+exp(-abs(q.y)*22.0-abs(q.x)*3.0);
    gl_FragColor=vec4(uColor,mix(disk,star*0.6,vSpark)*vAlpha*0.9);${output}}`,
      { uColor: color() },
      `attribute float aSize;attribute float aAlpha;attribute float aSpark;varying float vAlpha;varying float vSpark;
    void main(){vAlpha=aAlpha;vSpark=aSpark;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;
    gl_PointSize=clamp(aSize*480.0/max(1.0,-p.z),1.0,11.0);}`,
    ),
  );
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.name = 'rising-particles';
  particles.position.y = RING_Y;
  root.add(particles);
  const tintedMaterials = [ringMaterial, mistMaterial, coloredPoolMaterial, raysMaterial, particleMaterial];
  let rarity: DecoRarity = 'common',
    quality: Quality = 'high',
    disposed = false;
  const cameraWorld = new THREE.Vector3(),
    rootWorld = new THREE.Vector3(),
    localCamera = new THREE.Vector3();
  function setRarity(next: DecoRarity) {
    if (disposed) return;
    rarity = next;
    for (const mat of tintedMaterials) (mat.uniforms.uColor.value as THREE.Color).set(COLORS[next]);
    ringMaterial.uniforms.uOpacity.value = next === 'common' ? 0.65 : 1;
    mist.visible = coloredPool.visible = rays.visible = particles.visible = next !== 'common';
  }
  function update(timeSeconds: number, camera: THREE.Camera, nextQuality: Quality, reducedMotion: boolean) {
    if (disposed) return;
    quality = nextQuality;
    camera.getWorldPosition(cameraWorld);
    root.getWorldPosition(rootWorld);
    const distance = cameraWorld.distanceTo(rootWorld);
    light.visible = root.userData.stageLightAllowed === true && distance <= 25;
    const extras = rarity !== 'common' && distance <= (quality === 'low' ? 35 : 50);
    mist.visible = coloredPool.visible = rays.visible = extras;
    particles.visible = extras && !reducedMotion;
    const time = reducedMotion ? 0 : timeSeconds;
    mistMaterial.uniforms.uTime.value = raysMaterial.uniforms.uTime.value = time;
    if (!extras) return;
    const counts = COUNTS[rarity],
      low = quality === 'low';
    rays.geometry = geometry.rays.get(counts[low ? 0 : 1])!;
    const count = counts[low ? 2 : 3];
    particleGeometry.setDrawRange(0, count);
    mistMaterial.uniforms.uOpacity.value = low ? 0.3 : 0.44;
    root.worldToLocal(localCamera.copy(cameraWorld));
    const dx = localCamera.x,
      dz = localCamera.z,
      flatDistance = Math.max(0.001, Math.hypot(dx, dz));
    mist.rotation.y = Math.atan2(dx, dz);
    mist.position.x = (-dx / flatDistance) * RADIUS * 0.45;
    mist.position.z = (-dz / flatDistance) * RADIUS * 0.45;
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const life = 2.6 + (i % 7) * 0.36,
        age = (((time / life + ((i * 0.6180339) % 1)) % 1) + 1) % 1;
      const angle = i * 2.3999632;
      positions.setXYZ(
        i,
        Math.cos(angle) * RADIUS * 0.955 + Math.sin(time * 0.7 + i) * 0.045 * age,
        age * RISE,
        Math.sin(angle) * RADIUS * 0.955 + Math.cos(time * 0.61 + i) * 0.045 * age,
      );
      const fadeIn = THREE.MathUtils.smoothstep(age, 0, 0.12),
        fadeOut = THREE.MathUtils.smoothstep(age, 0.65, 1);
      alpha.setX(i, fadeIn * (1 - fadeOut));
    }
    positions.needsUpdate = alpha.needsUpdate = true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    root.clear();
    particleGeometry.dispose();
    light.dispose();
    for (const mat of ownedMaterials) mat.dispose();
    if (--users === 0) {
      geometry.base.dispose();
      geometry.plane.dispose();
      geometry.ring.dispose();
      for (const geo of geometry.rays.values()) geo.dispose();
      shared = undefined;
    }
  }
  setRarity('common');
  return { root, setRarity, update, dispose };
}

export type DecoPresentation = ReturnType<typeof createDecoPresentation>;
