/** Teacher "Saison" page (L1): dates, start/end and the class overview. */
import type { TeacherPage } from '../context';
import { esc } from '../../ui/esc';

interface SeasonRow {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  state: 'planned' | 'running' | 'ended' | 'closed';
  days_left: number;
  tiers: number;
  items: number;
  closed_at: string | null;
}

interface Overview {
  season: { id: string; label: string; starts_on: string; ends_on: string; state: string };
  pupils: Array<{
    id: string;
    nickname: string;
    xp: number;
    tier: number;
    claims: number;
    chests_open: number;
    chests_waiting: number;
    streak: number;
  }>;
}

interface ChangeRow {
  id: number;
  action: 'dates' | 'start' | 'end' | 'close';
  detail: Record<string, unknown>;
  created_at: string;
  teacher: string;
}

const ACTION_LABEL: Record<ChangeRow['action'], string> = {
  dates: 'Daten geändert',
  start: 'Gestartet',
  end: 'Beendet',
  close: 'Abgeschlossen',
};

const STATE_LABEL: Record<SeasonRow['state'], string> = {
  planned: 'geplant',
  running: 'läuft',
  ended: 'beendet',
  closed: 'abgeschlossen',
};

async function rpc<T>(ctx: Parameters<TeacherPage['mount']>[1], fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export default {
  title: 'Saison',
  async mount(root, ctx) {
    root.textContent = 'Saison wird geladen …';
    let seasons: SeasonRow[];
    try {
      seasons = await rpc<SeasonRow[]>(ctx, 'teacher_seasons');
    } catch {
      root.innerHTML = '<p class="error">Die Saisons konnten nicht geladen werden.</p>';
      return;
    }
    if (!ctx.alive()) return;
    const current = seasons.find((s) => s.state === 'running') ?? seasons.find((s) => s.state === 'planned') ?? seasons[0];

    async function overview(seasonId: string): Promise<Overview | null> {
      try {
        return await rpc<Overview>(ctx, 'teacher_season_overview', {
          p_class: ctx.classId,
          p_season: seasonId,
        });
      } catch {
        return null;
      }
    }

    let data: Overview | null = current ? await overview(current.id) : null;
    const changes = current
      ? await rpc<ChangeRow[]>(ctx, 'teacher_season_changes', { p_season: current.id }).catch(() => [])
      : [];
    if (!ctx.alive()) return;

    const card = (s: SeasonRow): string => `
      <article class="season-card ${s.state}">
        <header>
          <strong>${esc(s.label)}</strong>
          <span class="season-state">${STATE_LABEL[s.state]}</span>
        </header>
        <p>${esc(s.starts_on)} – ${esc(s.ends_on)} · ${s.days_left} Tage übrig · ${s.tiers} Stufen · ${s.items} Gegenstände</p>
        <div class="season-actions">
          ${s.state === 'planned' ? `<button type="button" class="primary" data-start="${esc(s.id)}">Jetzt starten</button>` : ''}
          ${s.state === 'running' ? `<button type="button" class="danger" data-end="${esc(s.id)}">Jetzt beenden</button>` : ''}
          ${s.state === 'ended' ? `<button type="button" class="primary" data-close="${esc(s.id)}">Saison abschließen</button>` : ''}
        </div>
        ${
          s.closed_at
            ? '<p class="season-note">Abgeschlossen – Daten sind gesperrt.</p>'
            : `<form class="season-dates" data-season="${esc(s.id)}">
                 <label>Start <input type="date" name="start" value="${esc(s.starts_on)}" required /></label>
                 <label>Ende (Sonntag) <input type="date" name="end" value="${esc(s.ends_on)}" required /></label>
                 <button type="submit" class="secondary">Daten speichern</button>
               </form>`
        }
      </article>`;

    const table = (o: Overview | null): string => {
      if (!o) return '<p class="error">Die Übersicht konnte nicht geladen werden.</p>';
      if (o.pupils.length === 0) return '<p>In dieser Klasse ist noch niemand angemeldet.</p>';
      const rows = o.pupils
        .map(
          (p) => `<tr>
            <td>${esc(p.nickname)}</td>
            <td class="num">${p.xp}</td>
            <td class="num">${p.tier}</td>
            <td class="num">${p.claims}</td>
            <td class="num">${p.chests_waiting}</td>
            <td class="num">${p.chests_open}</td>
            <td class="num">${p.streak}</td>
          </tr>`,
        )
        .join('');
      return `<table class="season-table">
        <thead><tr><th>Schüler</th><th class="num">Saison-XP</th><th class="num">Stufe</th><th class="num">Abgeholt</th>
          <th class="num">Truhen wartend</th><th class="num">Truhen offen</th><th class="num">Serie</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
    };

    root.innerHTML = `
      <section class="season-control">
        <p class="season-note">Änderungen an den Daten gelten sofort: Abgeholte Stufen bleiben, XP vor dem neuen Start zählen nicht mehr.</p>
        ${seasons.map(card).join('')}
      </section>
      <section class="season-overview">
        <h2>Klasse ${esc(ctx.classId)} · ${esc(current?.label ?? 'Keine Saison')}</h2>
        ${table(data)}
      </section>
      <section class="season-log">
        <h2>Protokoll</h2>
        ${
          changes.length === 0
            ? '<p>Noch keine Änderungen.</p>'
            : `<ul>${changes
                .map(
                  (c) =>
                    `<li><strong>${ACTION_LABEL[c.action]}</strong> · ${new Date(c.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} · ${esc(c.teacher)}</li>`,
                )
                .join('')}</ul>`
        }
      </section>`;

    root.querySelectorAll<HTMLButtonElement>('[data-start]').forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          await rpc(ctx, 'teacher_start_season_now', { p_season: button.dataset.start });
          ctx.status('Saison gestartet.');
          ctx.refresh();
        } catch (err) {
          ctx.status(err instanceof Error ? err.message : 'Start fehlgeschlagen.', 'error');
          button.disabled = false;
        }
      };
    });

    root.querySelectorAll<HTMLButtonElement>('[data-end]').forEach((button) => {
      button.onclick = async () => {
        if (!window.confirm('Saison jetzt beenden? Erreichte Stufen werden allen Schülern gutgeschrieben.')) return;
        button.disabled = true;
        try {
          await rpc(ctx, 'teacher_end_season_now', { p_season: button.dataset.end });
          ctx.status('Saison beendet, Stufen wurden gutgeschrieben.');
          ctx.refresh();
        } catch (err) {
          ctx.status(err instanceof Error ? err.message : 'Beenden fehlgeschlagen.', 'error');
          button.disabled = false;
        }
      };
    });

    root.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => {
      button.onclick = async () => {
        if (!window.confirm('Saison abschließen? Offene Stufen werden gutgeschrieben.')) return;
        button.disabled = true;
        try {
          await rpc(ctx, 'close_season', { p_season: button.dataset.close });
          ctx.status('Saison abgeschlossen.');
          ctx.refresh();
        } catch (err) {
          ctx.status(err instanceof Error ? err.message : 'Abschließen fehlgeschlagen.', 'error');
          button.disabled = false;
        }
      };
    });

    root.querySelectorAll<HTMLFormElement>('.season-dates').forEach((form) => {
      form.onsubmit = async (event) => {
        event.preventDefault();
        const d = new FormData(form);
        const season = form.dataset.season ?? '';
        try {
          await rpc(ctx, 'teacher_set_season_dates', {
            p_season: season,
            p_starts_on: String(d.get('start') ?? ''),
            p_ends_on: String(d.get('end') ?? ''),
          });
          ctx.status('Daten gespeichert.');
          ctx.refresh();
        } catch (err) {
          ctx.status(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.', 'error');
        }
      };
    });
  },
} satisfies TeacherPage;
