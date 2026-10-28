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
import { worldThemeApi, type WorldThemeState } from '../../api/worldTheme';
export default {
  title: 'Dorf & Regeln',
  async mount(root, ctx) {
    const supabase = ctx.supabase;
    const classId = ctx.classId;
    const themes = worldThemeApi(supabase);
    const status = (text: string, error = false) => ctx.status(text, error ? 'error' : 'ok');
    const drawClass = () => ctx.refresh();
    const [flags, inst, worldTheme] = await Promise.all([
      loadClassFlags(supabase, ctx.classId),
      loadInstance(supabase, ctx.classId),
      themes.teacherState(classId).catch(() => null),
    ]);
    if (!ctx.alive()) return;
    root.innerHTML =
      worldThemeSection(classId, worldTheme) +
      (flags.ok ? switchSection(flags.value) : '<p>Schalter nicht verfügbar</p>') +
      instanceSection(inst.ok ? inst.value : null);
    root.querySelector<HTMLButtonElement>('[data-world-theme-retry]')?.addEventListener('click', () => {
      if (ctx.alive()) ctx.refresh();
    });
    const themeForm = root.querySelector<HTMLFormElement>('#worldThemeForm');
    const themeChoice = themeForm?.querySelector<HTMLSelectElement>('[name=worldTheme]');
    const themeButton = themeForm?.querySelector<HTMLButtonElement>('button');
    const themeStatus = root.querySelector<HTMLElement>('#worldThemeStatus');
    let savedTheme = worldTheme;
    let themePending = false;
    themeForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (themePending || !savedTheme || !themeChoice || !themeButton || !themeStatus || !ctx.alive()) return;
      const theme = themeChoice.value;
      if (theme !== 'normal' && theme !== 'halloween') return;
      if (theme === 'halloween' && !savedTheme.seasonId) {
        themeChoice.value = savedTheme.requestedTheme;
        themeStatus.className = 'error';
        themeStatus.textContent = 'Keine Saison vorhanden. Halloween braucht eine Season im System.';
        return;
      }
      themePending = true;
      themeChoice.disabled = true;
      themeButton.disabled = true;
      themeStatus.className = 'hint';
      themeStatus.textContent = 'Weltstimmung wird gespeichert …';
      try {
        const result = await themes.teacherSet(
          classId,
          theme,
          theme === 'halloween' ? savedTheme.seasonId : null,
        );
        if (!ctx.alive()) return;
        savedTheme = result;
        themeChoice.value = result.requestedTheme;
        const summary = root.querySelector<HTMLElement>('#worldThemeSummary');
        if (summary) summary.textContent = themeSummary(result);
        themeStatus.className = 'hint';
        themeStatus.textContent = themeMessage(result);
        status(themeStatus.textContent);
      } catch {
        if (!ctx.alive()) return;
        themeChoice.value = savedTheme.requestedTheme;
        themeStatus.className = 'error';
        themeStatus.textContent = 'Weltstimmung wurde nicht gespeichert. Bitte erneut versuchen.';
        status(themeStatus.textContent, true);
      } finally {
        if (ctx.alive()) {
          themePending = false;
          themeChoice.disabled = false;
          themeButton.disabled = false;
        }
      }
    });
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

function worldThemeSection(classId: string, state: WorldThemeState | null): string {
  const season = state?.seasonLabel
    ? `${esc(state.seasonLabel)}${state.seasonState === 'upcoming' ? ' (geplant)' : ''}`
    : 'keine Saison';
  return `<section aria-labelledby="worldThemeTitle"><h2 id="worldThemeTitle">Weltstimmung</h2>
    <p class="hint">Ändert nur die Dorfstimmung dieser Klasse. LearnPass und Saisonzeitraum werden hier nicht verändert. Saison: ${season}.</p>
    ${
      state
        ? `<form id="worldThemeForm" class="row">
      <label>Welt für Klasse ${esc(classId)} <select name="worldTheme">
        <option value="normal" ${state.requestedTheme === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="halloween" ${state.requestedTheme === 'halloween' ? 'selected' : ''}>Season I – Halloween</option>
      </select></label><button type="submit">Weltstimmung speichern</button>
    </form>
    <p id="worldThemeSummary" class="hint">${themeSummary(state)}</p>
    <p id="worldThemeStatus" class="hint" role="status" aria-live="polite"></p>`
        : '<p class="error" role="status">Weltstimmung konnte nicht geladen werden.</p><button type="button" data-world-theme-retry>Erneut laden</button>'
    }
    </section>`;
}

/** Requested and effective world; redrawn after every save so it never contradicts the status line. */
function themeSummary(state: WorldThemeState): string {
  const effective =
    state.effectiveTheme === 'halloween'
      ? 'Halloween ist aktiv.'
      : state.requestedTheme === 'halloween'
        ? 'Halloween ist vorgemerkt und wirkt, sobald die Season läuft.'
        : 'Normal ist aktiv.';
  return `Angefordert: ${state.requestedTheme === 'halloween' ? 'Halloween' : 'Normal'} · Revision ${state.revision}. ${effective}`;
}

function themeMessage(state: WorldThemeState): string {
  if (state.effectiveTheme === 'halloween') return `Halloween ist für Klasse ${state.classId} aktiv.`;
  if (state.requestedTheme === 'halloween')
    return `Halloween ist für Klasse ${state.classId} vorgemerkt und wirkt, sobald die Season läuft.`;
  return `Normal ist für Klasse ${state.classId} aktiv.`;
}

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
