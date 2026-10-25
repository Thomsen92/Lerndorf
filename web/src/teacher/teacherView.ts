/**
 * Teacher area (/lehrer): overview per class, stamps, accounts, printable cards, coin corrections,
 * shop and build switches. Plain German, one screen per class (SPEC §13).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isMonday, mondayOf, weekLabel } from './week';
import { renderQuestPanel } from './questsView';
import {
  adminCall,
  adjustCoins,
  bookStamps,
  loadClassFlags,
  loadPupils,
  loadStampedIds,
  isTeacherSession,
  loadTaskStats,
  loadInstance,
  saveLayout,
  saveRules,
  setItemSold,
  type InstanceRules,
  type ShopEntry,
  type TaskStat,
  setClassFlags,
  signInTeacher,
  type Pupil,
} from './api';

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

const CLASSES = ['8a', '8b'] as const;
type ClassId = (typeof CLASSES)[number];

/** Cards created in this session. Passwords are only known here, so the print view uses them. */
const createdCards: Array<{ nickname: string; password: string; classId: string }> = [];

export async function renderTeacher(root: HTMLElement, supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return renderTeacherLogin(root, supabase);
  // a pupil session must not see the teacher area (the data would be empty anyway)
  if (!(await isTeacherSession(supabase))) {
    await supabase.auth.signOut();
    return renderTeacherLogin(root, supabase, 'Dieses Konto hat keine Lehrer-Rechte');
  }
  return renderTeacherArea(root, supabase);
}

function renderTeacherLogin(root: HTMLElement, supabase: SupabaseClient, notice?: string): void {
  root.innerHTML = `
    <main class="login">
      <h1>Lehrkraft</h1>
      <form id="teacherLogin" novalidate>
        <label>E-Mail
          <input name="email" type="email" autocomplete="username" required />
        </label>
        <label>Passwort
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <p id="err" class="error" role="alert"${notice ? '' : ' hidden'}>${esc(notice ?? '')}</p>
        <button type="submit" class="primary">Anmelden</button>
      </form>
    </main>`;
  const form = root.querySelector<HTMLFormElement>('#teacherLogin');
  const err = root.querySelector<HTMLParagraphElement>('#err');
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = new FormData(form);
    const res = await signInTeacher(supabase, String(d.get('email') ?? ''), String(d.get('password') ?? ''));
    if (!res.ok) {
      if (err) {
        err.textContent = res.message;
        err.hidden = false;
      }
      return;
    }
    void renderTeacherArea(root, supabase);
  });
}

async function renderTeacherArea(root: HTMLElement, supabase: SupabaseClient): Promise<void> {
  let classId: ClassId = CLASSES[0];
  root.innerHTML = `
    <header class="teacher-top">
      <h1>Lehrer-Bereich</h1>
      <nav class="class-tabs" aria-label="Klasse wählen">
        ${CLASSES.map((c) => `<button type="button" data-class="${c}" class="${c === classId ? 'primary' : ''}">Klasse ${c}</button>`).join('')}
      </nav>
      <button type="button" id="logout">Abmelden</button>
    </header>
    <main class="teacher" id="teacherMain"></main>
    <section class="print-only cards" id="cards" aria-label="Zugangskärtchen"></section>`;

  const main = root.querySelector<HTMLElement>('#teacherMain');
  root.querySelector<HTMLButtonElement>('#logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    void renderTeacher(root, supabase);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-class]').forEach((btn) =>
    btn.addEventListener('click', () => {
      classId = btn.dataset.class as ClassId;
      root
        .querySelectorAll<HTMLButtonElement>('[data-class]')
        .forEach((b) => b.classList.toggle('primary', b === btn));
      void drawClass();
    }),
  );

  const drawClass = async (): Promise<void> => {
    if (!main) return;
    main.innerHTML = '<p>Lädt …</p>';
    const pupils = await loadPupils(supabase, classId);
    const flags = await loadClassFlags(supabase, classId);
    const instance = await loadInstance(supabase, classId);
    if (!pupils.ok || !flags.ok) {
      main.innerHTML = `<p class="error">${esc(!pupils.ok ? pupils.message : flags.ok ? '' : flags.message)}</p>`;
      return;
    }
    const list = pupils.value;
    const questHtml = await renderQuestPanel(supabase);
    main.innerHTML = `
      ${overviewSection(list)}
      ${stampSection(list)}
      ${accountSection(list, classId)}
      ${coinSection(list)}
      ${switchSection(flags.value)}
      ${instanceSection(instance.ok ? instance.value : null)}
      ${questHtml}
      ${statsSection()}
      <p id="status" role="status" class="status"></p>`;
    wireStamps();
    wireAccounts(list, classId);
    wireCoins();
    wireSwitches(classId);
    wireInstance(classId);
    wireStats();
  };

  const status = (text: string, isError = false): void => {
    const el = root.querySelector<HTMLParagraphElement>('#status');
    if (!el) return;
    el.textContent = text;
    el.className = isError ? 'status error' : 'status';
  };

  // Each section wires its own events; `status` is shared for feedback.
  const wireStamps = (): void => {
    const form = root.querySelector<HTMLFormElement>('#stampForm');
    const week = root.querySelector<HTMLInputElement>('#week');
    if (!form || !week) return;
    const refresh = async (): Promise<void> => {
      const ids = await loadStampedIds(supabase, week.value);
      form.querySelectorAll<HTMLInputElement>('input[name=pupil]').forEach((cb) => {
        const stamped = ids.ok && ids.value.has(cb.value);
        cb.disabled = stamped;
        cb.checked = false;
        cb.closest('label')?.classList.toggle('done', stamped);
      });
    };
    week.addEventListener('change', () => {
      const monday = mondayOf(week.value);
      if (!monday) return status('Bitte ein gültiges Datum wählen', true);
      week.value = monday;
      void refresh();
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!isMonday(week.value)) return status('Die Woche muss mit einem Montag beginnen', true);
      const ids = Array.from(form.querySelectorAll<HTMLInputElement>('input[name=pupil]:checked')).map(
        (cb) => cb.value,
      );
      if (ids.length === 0) return status('Bitte mindestens einen Namen anhaken', true);
      const res = await bookStamps(supabase, classId, week.value, ids);
      if (!res.ok) return status(res.message, true);
      status(`${res.value} Stempel gebucht (${weekLabel(week.value)})`);
      void refresh();
      void drawClass();
    });
    void refresh();
  };

  const wireAccounts = (list: Pupil[], cls: ClassId): void => {
    const single = root.querySelector<HTMLFormElement>('#singleForm');
    single?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = new FormData(single);
      const nickname = String(d.get('nickname') ?? '').trim();
      const password = String(d.get('password') ?? '');
      const res = await adminCall(supabase, { action: 'create', nickname, password, class_id: cls });
      if (!res.ok) return status(res.message, true);
      createdCards.push({ nickname, password, classId: cls });
      single.reset();
      status(`Konto „${nickname}“ angelegt`);
      void drawClass();
    });

    const bulk = root.querySelector<HTMLFormElement>('#bulkForm');
    bulk?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const text = String(new FormData(bulk).get('list') ?? '');
      const res = await adminCall<{ results: Array<{ nickname: string; ok: boolean; error?: string }> }>(
        supabase,
        {
          action: 'create_bulk',
          text,
        },
      );
      if (!res.ok) return status(res.message, true);
      const failed = res.value.results.filter((r) => !r.ok);
      // remember the passwords of the ones that worked, for the cards
      const lines = text.split(/\r?\n/).map((l) => l.split(';').map((p) => p.trim()));
      for (const [nick, pw, c] of lines) {
        if (nick && pw && c && res.value.results.some((r) => r.nickname === nick && r.ok)) {
          createdCards.push({ nickname: nick, password: pw, classId: c });
        }
      }
      status(
        failed.length
          ? `${res.value.results.length - failed.length} Konten angelegt, ${failed.length} fehlgeschlagen: ${failed
              .map((f) => `${f.nickname} (${f.error ?? 'Fehler'})`)
              .join(', ')}`
          : `${res.value.results.length} Konten angelegt`,
        failed.length > 0,
      );
      void drawClass();
    });

    root.querySelector<HTMLButtonElement>('#printCards')?.addEventListener('click', () => {
      renderCards();
      window.print();
    });

    const reset = root.querySelector<HTMLFormElement>('#resetForm');
    reset?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = new FormData(reset);
      const res = await adminCall(supabase, {
        action: 'reset_password',
        user_id: String(d.get('pupil')),
        password: String(d.get('password') ?? ''),
      });
      if (!res.ok) return status(res.message, true);
      reset.reset();
      status('Passwort neu gesetzt');
    });

    const del = root.querySelector<HTMLFormElement>('#deleteForm');
    del?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = new FormData(del);
      if (!d.get('sure')) return status('Bitte das Kästchen „Ich bin sicher“ anhaken', true);
      const pupil = list.find((p) => p.id === String(d.get('pupil')));
      const res = await adminCall(supabase, { action: 'delete', user_id: String(d.get('pupil')) });
      if (!res.ok) return status(res.message, true);
      status(`Konto „${pupil?.nickname ?? ''}“ gelöscht`);
      void drawClass();
    });
  };

  const renderCards = (): void => {
    const cards = root.querySelector<HTMLElement>('#cards');
    if (!cards) return;
    cards.innerHTML = createdCards
      .map(
        (c) => `<div class="card-item">
          <p class="card-title">Lerndorf · Klasse ${esc(c.classId)}</p>
          <p class="card-nick">${esc(c.nickname)}</p>
          <p class="card-pass">Passwort: ${esc(c.password)}</p>
          <p class="card-url">Anmelden auf der Lerndorf-Seite</p>
        </div>`,
      )
      .join('');
  };

  const wireCoins = (): void => {
    const form = root.querySelector<HTMLFormElement>('#coinForm');
    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = new FormData(form);
      const delta = Number(d.get('delta'));
      if (!Number.isInteger(delta) || delta === 0)
        return status('Bitte eine ganze Zahl ungleich 0 eingeben', true);
      const res = await adjustCoins(supabase, String(d.get('pupil')), delta, String(d.get('note') ?? ''));
      if (!res.ok) return status(res.message, true);
      form.reset();
      status(`Neuer Stand: ${res.value} Münzen`);
      void drawClass();
    });
  };

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
      const all = Array.from(shop.querySelectorAll<HTMLInputElement>('input[name=sold]')).map((c) => c.value);
      for (const id of all) {
        const res = await setItemSold(supabase, cls, id, soldIds.has(id));
        if (!res.ok) return status(res.message, true);
      }
      status('Shop gespeichert.');
    });
  };

  const wireStats = (): void => {
    const week = root.querySelector<HTMLInputElement>('#statWeek');
    const out = root.querySelector<HTMLElement>('#statOut');
    if (!week || !out) return;
    const load = async (): Promise<void> => {
      const monday = mondayOf(week.value);
      if (!monday) return;
      week.value = monday;
      const res = await loadTaskStats(supabase, monday);
      out.innerHTML = res.ok ? taskStatsTable(res.value) : `<p class="error">${esc(res.message)}</p>`;
    };
    week.addEventListener('change', () => void load());
    void load();
  };

  void drawClass();
}

function overviewSection(list: Pupil[]): string {
  const rows = list
    .map(
      (p) =>
        `<tr><td>${esc(p.nickname)}</td><td class="num">${p.coins}</td><td class="num">${
          p.plotIndex === null ? '–' : p.plotIndex + 1
        }</td><td class="num">${p.level ?? 1}</td><td class="num">${p.xp ?? 0}</td><td class="num">${p.streak ?? 0}</td></tr>`,
    )
    .join('');
  return `<section><h2>Übersicht (${list.length} Schüler)</h2>
    <table><thead><tr><th>Spitzname</th><th>Münzen</th><th>Grundstück</th><th>Level</th><th>XP</th><th>Serie</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Noch keine Konten</td></tr>'}</tbody></table></section>`;
}

function stampSection(list: Pupil[]): string {
  const monday = mondayOf(new Date().toISOString().slice(0, 10)) ?? '';
  const items = list
    .map((p) => `<label><input type="checkbox" name="pupil" value="${p.id}" /> ${esc(p.nickname)}</label>`)
    .join('');
  return `<section><h2>Stempel buchen</h2>
    <form id="stampForm">
      <label>Woche (Montag) <input type="date" id="week" value="${monday}" /></label>
      <div class="checklist">${items || '<p>Noch keine Schüler</p>'}</div>
      <button type="submit" class="primary">Stempel buchen</button>
    </form></section>`;
}

function accountSection(list: Pupil[], cls: ClassId): string {
  const options = list.map((p) => `<option value="${p.id}">${esc(p.nickname)}</option>`).join('');
  return `<section><h2>Konten</h2>
    <h3>Einzeln anlegen (Klasse ${cls})</h3>
    <form id="singleForm" class="row">
      <input name="nickname" placeholder="Spitzname" required />
      <input name="password" placeholder="Passwort (min. 6)" required />
      <button type="submit">Anlegen</button>
    </form>
    <h3>Liste anlegen</h3>
    <p class="hint">Eine Zeile pro Schüler: <code>Spitzname;Passwort;Klasse</code></p>
    <form id="bulkForm">
      <textarea name="list" rows="6" placeholder="anna;hund42;8a"></textarea>
      <button type="submit">Liste anlegen</button>
    </form>
    <h3>Zugangskärtchen</h3>
    <p class="hint">Passwörter sind nur direkt nach dem Anlegen bekannt. Die Karten gelten für diese Sitzung.</p>
    <button type="button" id="printCards">Karten drucken</button>
    <h3>Passwort zurücksetzen</h3>
    <form id="resetForm" class="row">
      <select name="pupil" required>${options}</select>
      <input name="password" placeholder="neues Passwort" required />
      <button type="submit">Setzen</button>
    </form>
    <h3>Konto löschen</h3>
    <form id="deleteForm" class="row">
      <select name="pupil" required>${options}</select>
      <label><input type="checkbox" name="sure" /> Ich bin sicher</label>
      <button type="submit" class="danger">Löschen</button>
    </form></section>`;
}

function coinSection(list: Pupil[]): string {
  const options = list
    .map((p) => `<option value="${p.id}">${esc(p.nickname)} (${p.coins})</option>`)
    .join('');
  return `<section><h2>Münzen korrigieren</h2>
    <form id="coinForm" class="row">
      <select name="pupil" required>${options}</select>
      <input name="delta" type="number" step="1" placeholder="z. B. 10 oder -5" required />
      <input name="note" placeholder="Notiz (Pflicht)" required />
      <button type="submit">Buchen</button>
    </form></section>`;
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

function statsSection(): string {
  const monday = mondayOf(new Date().toISOString().slice(0, 10)) ?? '';
  return `<section><h2>Aufgaben-Statistik</h2>
    <label>Woche (Montag) <input type="date" id="statWeek" value="${monday}" /></label>
    <div id="statOut"></div></section>`;
}

function taskStatsTable(rows: TaskStat[]): string {
  if (rows.length === 0) return '<p>Keine Aufgaben in dieser Woche.</p>';
  const body = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.prompt)}</td><td class="num">${r.answers}</td><td class="num">${
          r.share === null ? '–' : `${r.share} %`
        }</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Aufgabe</th><th class="num">Antworten</th><th class="num">richtig</th></tr></thead><tbody>${body}</tbody></table>`;
}

function switchSection(flags: { shopOpen: boolean; buildOpen: boolean }): string {
  return `<section><h2>Schalter</h2>
    <form id="switchForm" class="row">
      <label><input type="checkbox" name="shop" ${flags.shopOpen ? 'checked' : ''} /> Shop offen</label>
      <label><input type="checkbox" name="build" ${flags.buildOpen ? 'checked' : ''} /> Bauen offen</label>
      <button type="submit">Speichern</button>
    </form></section>`;
}
