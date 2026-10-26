import type { TeacherPage } from '../context';
import {
  loadClassFlags,
  loadInstance,
  setClassFlags,
  saveLayout,
  saveRules,
  setItemSold,
  type InstanceRules,
  type ShopEntry,
} from '../api';
import type { ClassId } from '../router';
import { esc } from '../../ui/esc';
export default {
  title: 'Dorf & Regeln',
  async mount(root, ctx) {
    const supabase = ctx.supabase;
    const status = (text: string, error = false) => ctx.status(text, error ? 'error' : 'ok');
    const drawClass = () => ctx.refresh();
    const [flags, inst] = await Promise.all([
      loadClassFlags(supabase, ctx.classId),
      loadInstance(supabase, ctx.classId),
    ]);
    if (!ctx.alive()) return;
    root.innerHTML =
      (flags.ok ? switchSection(flags.value) : '<p>Schalter nicht verfügbar</p>') +
      instanceSection(inst.ok ? inst.value : null);
    const wireSwitches = (cls: ClassId): void => {
      const form = root.querySelector<HTMLFormElement>('#switchForm');
      form?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = new FormData(form);
        const res = await setClassFlags(supabase, cls, {
          shopOpen: d.get('shop') === 'on',
          buildOpen: d.get('build') === 'on',
        });
        status(res.ok ? 'Schalter gespeichert' : res.message, !res.ok);
      });
    };

    const wireInstance = (cls: ClassId): void => {
      const layout = root.querySelector<HTMLFormElement>('#layoutForm');
      layout?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = new FormData(layout);
        const seed = Number(d.get('seed'));
        if (!Number.isInteger(seed) || seed < 1 || seed > 99999)
          return status('Seed: eine Zahl von 1 bis 99999', true);
        if (!window.confirm(`Dorf der Klasse ${cls} neu festlegen? Alle Grundstücke wandern.`)) return;
        const res = await saveLayout(supabase, cls, String(d.get('map')), seed);
        status(res.ok ? 'Dorf gespeichert.' : res.message, !res.ok);
        void drawClass();
      });
      const rules = root.querySelector<HTMLFormElement>('#rulesForm');
      rules?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = new FormData(rules);
        const res = await saveRules(supabase, cls, {
          stampReward: Number(d.get('stamp')),
          dailyTaskCap: Number(d.get('cap')),
          maxAttempts: Number(d.get('attempts')),
          plotCols: Number(d.get('cols')),
          plotRows: Number(d.get('rows')),
          mapId: '',
          layoutSeed: 0,
        });
        status(res.ok ? 'Regeln gespeichert.' : res.message, !res.ok);
      });
      const shop = root.querySelector<HTMLFormElement>('#shopForm');
      shop?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const soldIds = new Set(
          Array.from(shop.querySelectorAll<HTMLInputElement>('input[name=sold]:checked')).map((c) => c.value),
        );
        const all = Array.from(shop.querySelectorAll<HTMLInputElement>('input[name=sold]')).map(
          (c) => c.value,
        );
        for (const id of all) {
          const res = await setItemSold(supabase, cls, id, soldIds.has(id));
          if (!res.ok) return status(res.message, true);
        }
        status('Shop gespeichert.');
      });
    };

    wireSwitches(ctx.classId);
    wireInstance(ctx.classId);
  },
} satisfies TeacherPage;
function instanceSection(
  inst: { rules: InstanceRules; maps: Array<{ id: string; name: string }>; shop: ShopEntry[] } | null,
): string {
  if (!inst)
    return '<section><h2>Instanz</h2><p class="error">Die Einstellungen konnten nicht geladen werden.</p></section>';
  const r = inst.rules;
  const maps = inst.maps
    .map((m) => `<option value="${esc(m.id)}" ${m.id === r.mapId ? 'selected' : ''}>${esc(m.name)}</option>`)
    .join('');
  const shop = inst.shop
    .map(
      (s) =>
        `<label><input type="checkbox" name="sold" value="${esc(s.id)}" ${s.sold ? 'checked' : ''} /> ${esc(s.name)} (${s.price})</label>`,
    )
    .join('');
  return `<section><h2>Dorf und Regeln</h2>
    <h3>Dorf-Vorlage und Seed</h3>
    <p class="hint">Vorlage und Seed bestimmen das Dorf. Eine Änderung verschiebt alle Grundstücke dieser Klasse.</p>
    <form id="layoutForm" class="row">
      <label>Vorlage <select name="map">${maps}</select></label>
      <label>Seed <input name="seed" type="number" min="1" max="99999" value="${r.layoutSeed}" /></label>
      <button type="submit">Speichern</button>
    </form>
    <h3>Spielregeln</h3>
    <form id="rulesForm" class="row">
      <label>Stempel <input name="stamp" type="number" min="0" max="1000" value="${r.stampReward}" /></label>
      <label>Tageslimit <input name="cap" type="number" min="0" max="1000" value="${r.dailyTaskCap}" /></label>
      <label>Versuche <input name="attempts" type="number" min="1" max="10" value="${r.maxAttempts}" /></label>
      <!-- the plot plan is fixed (docs/ASSET_VERTRAG.md): 11 x 11, not changeable per class -->
      <input name="cols" type="hidden" value="${r.plotCols}" />
      <input name="rows" type="hidden" value="${r.plotRows}" />
      <button type="submit">Regeln speichern</button>
    </form>
    <h3>Shop: verkaufte Sachen</h3>
    <form id="shopForm">
      <div class="checklist">${shop}</div>
      <button type="submit">Shop speichern</button>
    </form></section>`;
}

function switchSection(flags: { shopOpen: boolean; buildOpen: boolean }): string {
  return `<section><h2>Schalter</h2>
    <form id="switchForm" class="row">
      <label><input type="checkbox" name="shop" ${flags.shopOpen ? 'checked' : ''} /> Shop offen</label>
      <label><input type="checkbox" name="build" ${flags.buildOpen ? 'checked' : ''} /> Bauen offen</label>
      <button type="submit">Speichern</button>
    </form></section>`;
}
