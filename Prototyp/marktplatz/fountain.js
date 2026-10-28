import * as T from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const BURST_PERIOD = 2.8;
const BURST_BEATS = [0, .55, 1.10];
const BURST_DURATIONS = [.18, .18, .32];
export function centerPulseAt(time) {
  const phase = ((time % BURST_PERIOD) + BURST_PERIOD) % BURST_PERIOD;
  for (let i = 0; i < BURST_BEATS.length; i++) {
    const age = phase - BURST_BEATS[i];
    if (age >= 0 && age < BURST_DURATIONS[i]) {
      const amount = Math.sin(age / BURST_DURATIONS[i] * Math.PI) ** .55;
      return { active: amount > .015, height: amount * (i === 2 ? 3.25 : 2.8) };
    }
  }
  return { active: false, height: 0 };
}

// Ballistic water curves start at the upper pool. Thin tapering streams,
// moving highlights and fine impact spray avoid a solid, beaded-branch look.
export function createFountainEffects(scene, { originY, waterY, waterMaterial, candles }) {
  const streams = [], streamGeometries = [], streamRanges = [], centerZ = 1;
  let vertexOffset = 0;
  const flowUniform = { value: 0 };
  const streamMaterial = new T.MeshStandardMaterial({
    color: '#b02c3c', roughness: .14, metalness: .04,
    emissive: '#721a2c', emissiveIntensity: .10,
    transparent: true, opacity: .86, depthWrite: false,
  });
  streamMaterial.onBeforeCompile = shader => {
    shader.uniforms.uFlowTime = flowUniform;
    shader.vertexShader = 'varying vec2 vStreamUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStreamUv = uv;');
    shader.fragmentShader = 'uniform float uFlowTime; varying vec2 vStreamUv;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.82 + 0.18 * sin(vStreamUv.x * 54.0 - uFlowTime * 18.0);');
  };
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    const startRadius = .24, radius = 2.30, gravity = 9.81;
    const verticalSpeed = 3.5 + (i % 2) * .35;
    const flight = (verticalSpeed + Math.sqrt(verticalSpeed ** 2 + 2 * gravity * (originY - waterY))) / gravity;
    const horizontalSpeed = (radius - startRadius) / flight;
    const start = new T.Vector3(Math.sin(angle) * startRadius, originY, centerZ + Math.cos(angle) * startRadius);
    const velocity = new T.Vector3(Math.sin(angle) * horizontalSpeed, verticalSpeed, Math.cos(angle) * horizontalSpeed);
    const end = new T.Vector3(Math.sin(angle) * radius, waterY, centerZ + Math.cos(angle) * radius);
    // Quadratic Bezier is the exact constant-gravity parabola over this flight.
    const curve = new T.QuadraticBezierCurve3(start, start.clone().addScaledVector(velocity, flight * .5), end);
    streams.push(curve);
    const tubularSegments = 48, radialSegments = 8;
    const tube = new T.TubeGeometry(curve, tubularSegments, .027, radialSegments, false);
    const positions = tube.getAttribute('position'), center = new T.Vector3(), radial = new T.Vector3();
    const centers = new Float32Array((tubularSegments + 1) * 3);
    for (let segment = 0; segment <= tubularSegments; segment++) {
      const t = segment / tubularSegments, taper = 1 - t * .42;
      curve.getPointAt(t, center);
      center.toArray(centers, segment * 3);
      for (let side = 0; side <= radialSegments; side++) {
        const index = segment * (radialSegments + 1) + side;
        radial.fromBufferAttribute(positions, index).sub(center).multiplyScalar(taper).add(center);
        positions.setXYZ(index, radial.x, radial.y, radial.z);
      }
    }
    tube.computeVertexNormals(); streamGeometries.push(tube);
    streamRanges.push({ vertexOffset, centers, angle, segments: tubularSegments, sides: radialSegments + 1 });
    vertexOffset += positions.count;
  }
  const streamMesh = new T.Mesh(mergeGeometries(streamGeometries), streamMaterial);
  const jetPositions = streamMesh.geometry.getAttribute('position');
  const restPositions = new Float32Array(jetPositions.array);
  jetPositions.setUsage(T.DynamicDrawUsage); streamMesh.frustumCulled = false;
  streamGeometries.forEach(g => g.dispose()); scene.add(streamMesh);
  const centerJet = new T.Mesh(new T.CylinderGeometry(.026, .06, 1, 8, 8, true), streamMaterial);
  centerJet.frustumCulled = false; scene.add(centerJet);

  const dropMesh = new T.InstancedMesh(new T.SphereGeometry(.022, 6, 4),
    new T.MeshStandardMaterial({ color: '#d45a64', emissive: '#872b3b', emissiveIntensity: .12, roughness: .14, transparent: true, opacity: .75, depthWrite: false }), 128);
  dropMesh.frustumCulled = false; scene.add(dropMesh);
  const ringGeometry = new T.RingGeometry(.92, 1, 32); ringGeometry.rotateX(-Math.PI / 2);
  const rings = new T.InstancedMesh(ringGeometry,
    new T.MeshBasicMaterial({ color: '#bd4a58', transparent: true, opacity: .27, depthWrite: false }), 11);
  rings.frustumCulled = false; scene.add(rings);

  const flameMaterial = new T.MeshBasicMaterial({ color: '#ffd794', toneMapped: false, fog: false });
  const flames = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), flameMaterial, 3);
  flames.frustumCulled = false; scene.add(flames);
  const candleLight = new T.PointLight('#ffb068', 7, 6.5, 1.6);
  candleLight.position.set(0, .95, 7.0); scene.add(candleLight);

  const object = new T.Object3D(), point = new T.Vector3(), tangent = new T.Vector3(), color = new T.Color();
  const up = new T.Vector3(0, 1, 0);
  let flowTime = 0;
  function update(time, reduced) {
    flowTime = reduced ? 0 : time;
    flowUniform.value = flowTime;
    const pulse = reduced ? { active: true, height: .7 } : centerPulseAt(flowTime);
    centerJet.visible = pulse.active;
    centerJet.position.set(0, originY + pulse.height / 2, centerZ);
    centerJet.scale.set(1, Math.max(.001, pulse.height), 1);
    // Animate the actual stream vertices: pressure changes the arch height,
    // travelling ripples move along it, while both water-surface anchors stay put.
    streamRanges.forEach((range, i) => {
      const lift = Math.sin(flowTime * 2.2 + i * .8) * .16;
      const sway = Math.sin(flowTime * 1.35 + i * 1.1) * .055;
      for (let segment = 0; segment <= range.segments; segment++) {
        const t = segment / range.segments, envelope = Math.sin(t * Math.PI);
        const wave = Math.sin(t * 26 - flowTime * 11 + i) * .012;
        const radius = 1 + Math.sin(t * 45 - flowTime * 16 + i * .7) * .15 * envelope;
        const cx = range.centers[segment * 3], cy = range.centers[segment * 3 + 1], cz = range.centers[segment * 3 + 2];
        for (let side = 0; side < range.sides; side++) {
          const vertex = range.vertexOffset + segment * range.sides + side, offset = vertex * 3;
          jetPositions.setXYZ(vertex,
            cx + (restPositions[offset] - cx) * radius + Math.sin(range.angle) * (sway + wave) * envelope,
            cy + (restPositions[offset + 1] - cy) * radius + lift * envelope,
            cz + (restPositions[offset + 2] - cz) * radius + Math.cos(range.angle) * (sway + wave) * envelope);
        }
      }
    });
    jetPositions.needsUpdate = true;
    for (let i = 0; i < 32; i++) {
      const stream = Math.floor(i / 4), phase = (flowTime * 1.65 + (i % 4) * .25 + stream * .071) % 1;
      const age = phase * .37, angle = i * 2.39996;
      streams[stream].getPoint(1, point);
      object.position.set(point.x + Math.cos(angle) * age * .65,
        waterY + .012 + (1.1 + (i % 3) * .14) * age - 4.905 * age * age,
        point.z + Math.sin(angle) * age * .65);
      object.rotation.set(0, 0, 0);
      const fade = 1 - phase * .55;
      object.scale.set(fade, fade * 1.25, fade); object.updateMatrix(); dropMesh.setMatrixAt(i, object.matrix);
    }
    // Fine glints travel visibly down the water, without oversized beads.
    for (let i = 32; i < 80; i++) {
      const stream = Math.floor((i - 32) / 6), t = (flowTime * .85 + (i - 32) % 6 / 6 + stream * .071) % 1;
      const envelope = Math.sin(t * Math.PI), angle = streamRanges[stream].angle;
      const lift = Math.sin(flowTime * 2.2 + stream * .8) * .16;
      const sway = Math.sin(flowTime * 1.35 + stream * 1.1) * .055;
      const wave = Math.sin(t * 26 - flowTime * 11 + stream) * .012;
      streams[stream].getPointAt(t, point); streams[stream].getTangentAt(t, tangent);
      object.position.set(point.x + Math.sin(angle) * (sway + wave) * envelope,
        point.y + lift * envelope, point.z + Math.cos(angle) * (sway + wave) * envelope);
      object.quaternion.setFromUnitVectors(up, tangent.normalize());
      object.scale.set(.50, 2.0, .50); object.updateMatrix(); dropMesh.setMatrixAt(i, object.matrix);
    }
    // Emitted droplets keep rising and falling after each short pump burst.
    for (let i = 80; i < 128; i++) {
      const slot = i - 80, beat = Math.floor(slot / 16);
      const birth = BURST_BEATS[beat] + (slot % 16) / 16 * BURST_DURATIONS[beat];
      const age = ((flowTime - birth) % BURST_PERIOD + BURST_PERIOD) % BURST_PERIOD;
      const velocity = beat === 2 ? 8.0 : 7.4;
      const airborne = age < 2 * velocity / 9.81;
      const spread = Math.max(0, age - .45) * .13;
      object.position.set(Math.sin(slot * 2.39996) * spread,
        originY + velocity * age - 4.905 * age * age, centerZ + Math.cos(slot * 2.39996) * spread);
      object.rotation.set(0, 0, 0);
      const size = airborne ? .75 : 0;
      object.scale.set(size, size * 1.7, size); object.updateMatrix(); dropMesh.setMatrixAt(i, object.matrix);
    }
    dropMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 11; i++) {
      const t = (flowTime * .70 + i * .19) % 1, scale = .06 + t * .43;
      if (i < 8) streams[i].getPoint(1, point);
      else point.set(0, originY - .012, centerZ);
      object.position.set(point.x, point.y + .008, point.z);
      object.rotation.set(0, 0, 0); object.scale.set(scale, 1, scale);
      object.updateMatrix(); rings.setMatrixAt(i, object.matrix);
      rings.setColorAt(i, color.setScalar(.8 - t * .65));
    }
    rings.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true;
    candles.forEach((candle, i) => {
      const flicker = reduced ? 1 : 1 + Math.sin(time * 4.3 + i * 2.1) * .09;
      object.position.set(candle.x, candle.flameY, candle.z);
      object.rotation.set(0, 0, reduced ? 0 : Math.sin(time * 2.6 + i) * .075);
      object.scale.set(.065, .16 * flicker, .065); object.updateMatrix(); flames.setMatrixAt(i, object.matrix);
    });
    flames.instanceMatrix.needsUpdate = true;
    candleLight.intensity = reduced ? 7 : 7 * (1 + Math.sin(time * 4.3) * .045);
  }
  update(0, true);
  return {
    update,
    snapshot: () => ({ time: flowTime, jet: Array.from(streamMesh.geometry.getAttribute('position').array.slice(24 * 9 * 3, 24 * 9 * 3 + 9)), centerJet: { visible: centerJet.visible, height: centerJet.scale.y }, drop: Array.from(dropMesh.instanceMatrix.array.slice(0, 16)), flame: Array.from(flames.instanceMatrix.array.slice(0, 16)) }),
    details: () => ({ candles: candles.length, jets: streams.length, centerJet: true, burstPeriod: BURST_PERIOD, waterColor: `#${waterMaterial.color.getHexString()}`, originY, waterY }),
  };
}
