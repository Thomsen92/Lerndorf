import { Object3D, SkinnedMesh, Skeleton, Bone } from 'three';
export const normalizeBone = (name: string): string => name.replace(/[^a-z0-9]/gi, '').toLowerCase();
export function bindClothing(root: Object3D, bones: Map<string, Bone>): void {
  root.updateMatrixWorld(true);
  const meshes: SkinnedMesh[] = [],
    importedRoots: Bone[] = [],
    oldSkeletons = new Set<Skeleton>();
  root.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) meshes.push(o as SkinnedMesh);
    if ((o as Bone).isBone && !(o.parent as Bone)?.isBone) importedRoots.push(o as Bone);
  });
  if (!meshes.length) throw Error('Clothing has no skinned mesh');
  const bindings = meshes.map((mesh) => ({
    mesh,
    bones: mesh.skeleton.bones.map((source) => {
      const bone = bones.get(normalizeBone(source.name));
      if (!bone) throw Error(`Missing bone ${source.name}`);
      return bone;
    }),
  }));
  for (const { mesh, bones: target } of bindings) {
    const old = mesh.skeleton;
    oldSkeletons.add(old);
    mesh.bind(
      new Skeleton(
        target,
        old.boneInverses.map((m) => m.clone()),
      ),
      mesh.bindMatrix.clone(),
    );
    mesh.frustumCulled = false;
  }
  for (const bone of importedRoots) bone.removeFromParent();
  for (const s of oldSkeletons) s.dispose();
}
