import { Bone, Euler, Object3D, Quaternion } from 'three';
/** Additive breathing and a quiet head movement over the standing pose; feet and yaw stay fixed. */
export function createWardrobeIdle(root: Object3D): (seconds: number, enabled: boolean) => void {
  const bones: Array<{ bone: Bone; rest: Quaternion; head: boolean }> = [];
  root.traverse((o) => {
    if ((o as Bone).isBone && /(spine2|head)$/i.test(o.name))
      bones.push({ bone: o as Bone, rest: o.quaternion.clone(), head: /head$/i.test(o.name) });
  });
  const delta = new Quaternion(),
    angles = new Euler();
  return (seconds, enabled) => {
    for (const { bone, rest, head } of bones) {
      bone.quaternion.copy(rest);
      if (!enabled) continue;
      angles.set(
        head ? Math.sin(seconds * 0.8) * 0.012 : Math.sin(seconds * 1.65) * 0.009,
        head ? Math.sin(seconds * 0.46) * 0.025 : 0,
        head ? Math.sin(seconds * 0.6) * 0.008 : Math.sin(seconds * 0.7) * 0.006,
      );
      bone.quaternion.multiply(delta.setFromEuler(angles));
    }
  };
}
