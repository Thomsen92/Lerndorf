import type { SupabaseClient } from '@supabase/supabase-js';
import type { AreaHandle } from './areas';
import { esc } from './esc';
export function openReadOnlyQuests(
  s: SupabaseClient,
  pupilId: string,
  nickname: string,
  onClose: () => void,
): AreaHandle {
  const el = document.createElement('section');
  el.className = 'overlay area read-only-quests';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', `Aufgaben von ${nickname}`);
  el.innerHTML = `<div class="panel"><div class="panel-head"><h2>Aufgaben von ${esc(nickname)}</h2><button type="button">Schließen</button></div><p class="hint">Nur ansehen. Antworten und Buchungen sind hier ausgeschaltet.</p><div class="read-only-list">Lädt …</div></div>`;
  document.body.append(el);
  let closed = false;
  const close = () => {
    closed = true;
    el.remove();
  };
  el.querySelector('button')!.onclick = () => {
    close();
    onClose();
  };
  void (async () => {
    try {
      const { data, error } = await s.rpc('teacher_pupil_quests', { p_player_id: pupilId });
      if (closed) return;
      const out = el.querySelector('.read-only-list')!;
      if (error) {
        out.textContent = 'Die Aufgaben konnten nicht geladen werden.';
        return;
      }
      out.innerHTML =
        (
          (data as Array<{
            key: string;
            day: string;
            prompt: string;
            solved: boolean;
            catch_up: boolean;
            attempts: number;
          }>) ?? []
        )
          .map(
            (q) =>
              `<article><p>${esc(q.day)}${q.catch_up ? ' · Nachholen von gestern' : ' · Heute'} · ${q.solved ? 'gelöst' : 'offen'} · ${q.attempts} Versuche</p><p lang="en">${esc(q.prompt)}</p></article>`,
          )
          .join('') || '<p>Keine Quests für heute oder gestern.</p>';
    } catch {
      if (!closed)
        el.querySelector('.read-only-list')!.textContent = 'Keine Verbindung. Bitte erneut öffnen.';
    }
  })();
  return { close };
}
