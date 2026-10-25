// Development-only harness: real village and UI, in-memory RPCs, no remote service.
import { mountVillage } from '../src/ui/villageView';
import { BuildFx } from '../src/render/buildFx';
const state = {
  placements: [
    { player_id: 'u1', item_id: 'house_fachwerk', slot: 'house', rot: 0 },
    { player_id: 'u1', item_id: 'deco_bench', slot: 'deco_1', rot: 0 },
  ],
};
const debug = window as unknown as {
  __fxCount: number;
  __fxBusy: boolean;
  __captureFxAt: number | null;
  __fxTime: number;
  __dispose: () => void;
};
debug.__fxCount = 0;
debug.__captureFxAt = null;
debug.__fxTime = 0;
for (const action of ['place', 'remove'] as const) {
  const original = BuildFx.prototype[action];
  BuildFx.prototype[action] = function (...args) {
    debug.__fxCount++;
    debug.__fxTime = 0;
    return original.apply(this, args);
  };
}
const update = BuildFx.prototype.update;
BuildFx.prototype.update = function (dt, camera) {
  const step = debug.__captureFxAt === null ? dt : Math.min(dt, Math.max(0, debug.__captureFxAt - debug.__fxTime));
  if (this.busy) debug.__fxTime += step;
  update.call(this, step, camera);
  debug.__fxBusy = this.busy;
};
const fail = new Set((new URLSearchParams(location.search).get('fail') ?? '').split(','));
const ok = (data: unknown) => ({ data, error: null });
const member = { id: 'u1', nickname: 'Fuchs', plot_index: 6, avatar: { character: 'boy' } };
const items = [
  { id: 'house_fachwerk', kind: 'house', name_de: 'Fachwerkhaus', starter: false },
  { id: 'garage_holz', kind: 'garage', name_de: 'Holzgarage', starter: true },
  { id: 'deco_cat_sign', kind: 'deco', name_de: 'Katzenschild', starter: false },
  { id: 'deco_bench', kind: 'deco', name_de: 'Gartenbank', starter: false },
  { id: 'car_kleinwagen', kind: 'car', name_de: 'Kleinwagen', starter: false },
];
function table(name: string) {
  let single = false;
  const filters: Record<string, unknown> = {};
  const rows = () => {
    switch (name) {
      case 'profiles':
        return [{ ...member, class_id: '8a', coins: 200 }];
      case 'classes':
        return [{ id: '8a', layout_seed: 8, map_id: 'tal', shop_open: true, build_open: true }];
      case 'placements':
        return state.placements;
      case 'items':
        return items;
      case 'inventory':
        return items
          .filter((i) => !i.starter)
          .map((i) => ({ item_id: i.id, qty: i.kind === 'deco' && i.id !== 'deco_bench' ? 2 : 1 }));
      default:
        return [];
    }
  };
  const b = {
    select: () => b,
    in: () => b,
    gt: () => b,
    order: () => b,
    limit: () => b,
    eq: (key: string, value: unknown) => {
      filters[key] = value;
      return b;
    },
    single: () => {
      single = true;
      return b;
    },
    then(resolve: (value: unknown) => void) {
      const result = rows().filter((row) =>
        Object.entries(filters).every(
          ([k, v]) =>
            (row as Record<string, unknown>)[k] === undefined || (row as Record<string, unknown>)[k] === v,
        ),
      );
      return Promise.resolve(ok(single ? result[0] : result)).then(resolve);
    },
  };
  return b;
}
const fake = {
  from: table,
  async rpc(name: string, args: Record<string, unknown> = {}) {
    if (fail.delete(name)) return { data: null, error: { message: 'building is closed' } };
    if (name === 'tutorial_state')
      return ok({ needed: false, step: 'done', plot_index: 6, character: 'boy', answered: 5 });
    if (name === 'village_members') return ok([member]);
    if (name === 'place_in_slot' || name === 'clear_slot') {
      state.placements = state.placements.filter((p) => p.slot !== args.p_slot);
      if (name === 'place_in_slot')
        state.placements.push({
          player_id: 'u1',
          item_id: args.p_item_id as string,
          slot: args.p_slot as string,
          rot: args.p_rot as number,
        });
    }
    return ok([]);
  },
  auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }), signOut: async () => ({ error: null }) },
};
const root = document.getElementById('app')!;
void mountVillage(root, fake as never, () => {
  root.textContent = 'Abgemeldet.';
}).then((handle) => {
  debug.__dispose = () => handle.dispose();
});
