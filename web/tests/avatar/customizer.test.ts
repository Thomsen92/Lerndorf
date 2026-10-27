import { expect, it } from 'vitest';
import { Group, Bone, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { AvatarCustomizer } from '../../src/avatars/customizer';
function base() {
  const root = new Group();
  for (const name of ['Head', 'Neck', 'Spine2']) {
    const b = new Bone();
    b.name = `mixamorig:${name}`;
    root.add(b);
  }
  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  root.add(mesh);
  return root;
}
it('reduces distant detail without changing the saved outfit and restores it nearby', async () => {
  const root = base(),
    long = new Group(),
    short = new Group(),
    hat = new Group();
  long.name = 'tripo_part_0';
  short.name = 'tripo_part_0_short';
  root.add(long, short);
  const c = new AvatarCustomizer(root, 'boy', async () => hat);
  await c.equip('avatar_boy_feathered_helmet');
  expect(long.visible).toBe(false);
  expect(short.visible).toBe(true);
  c.setDetail(false);
  expect(hat.visible).toBe(false);
  expect(long.visible).toBe(true);
  expect(short.visible).toBe(false);
  expect(c.getLook().items).toEqual(['avatar_boy_feathered_helmet']);
  c.setDetail(true);
  expect(hat.visible).toBe(true);
  expect(short.visible).toBe(true);
  c.dispose();
});
it('attaches the boy halberd to the girl spine and never applies foreign base-mesh visibility rules', async () => {
  const root = base(),
    body = new Group();
  body.name = 'tripo_part_0';
  root.add(body);
  const c = new AvatarCustomizer(root, 'girl', async () => new Group());
  await c.equip('avatar_boy_halberd');
  expect(root.getObjectByName('mixamorig:Spine2')?.children).toHaveLength(1);
  await c.equip('avatar_boy_feathered_helmet');
  expect(body.visible).toBe(true);
  expect(c.getLook().items).toEqual(['avatar_boy_halberd', 'avatar_boy_feathered_helmet']);
  c.dispose();
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
it('latest selection wins across conflicting slots', async () => {
  const slow = deferred<Group>(),
    root = base();
  const c = new AvatarCustomizer(root, 'girl', (p) =>
    p.slot === 'hair' ? slow.promise : Promise.resolve(new Group()),
  );
  const first = c.equip('avatar_girl_soft_bow');
  await c.equip('avatar_girl_cloud_beat');
  slow.resolve(new Group());
  await first;
  expect(c.getLook().items).toEqual(['avatar_girl_cloud_beat']);
  c.dispose();
});
it('a failed replacement preserves committed state', async () => {
  const c = new AvatarCustomizer(base(), 'boy', (p) =>
    p.slot === 'face' ? Promise.reject(Error('load')) : Promise.resolve(new Group()),
  );
  await c.equip('avatar_boy_gold_chain');
  await expect(c.equip('avatar_boy_gucci_sunglasses')).rejects.toThrow('load');
  expect(c.getLook().items).toEqual(['avatar_boy_gold_chain']);
  c.dispose();
});
it('never changes another instance material and can dispose twice', () => {
  const first = base(),
    second = first.clone(),
    shared = (second.children[3] as Mesh).material;
  const c = new AvatarCustomizer(first, 'boy');
  c.setColor('hair', '#5b3a29');
  expect((first.children[3] as Mesh).material).not.toBe(shared);
  expect((second.children[3] as Mesh).material).toBe(shared);
  c.dispose();
  c.dispose();
});
it('waits for every load before rejecting an atomic look', async () => {
  const slow = deferred<Group>(),
    c = new AvatarCustomizer(base(), 'boy', (p) =>
      p.slot === 'face' ? Promise.reject(Error('load')) : slow.promise,
    );
  let settled = false;
  const applying = c
    .applyLook({ items: ['avatar_boy_gold_chain', 'avatar_boy_gucci_sunglasses'], colors: {} })
    .catch(() => {
      settled = true;
    });
  await new Promise((r) => setTimeout(r, 0));
  expect(settled).toBe(false);
  slow.resolve(new Group());
  await applying;
  expect(settled).toBe(true);
  c.dispose();
});
