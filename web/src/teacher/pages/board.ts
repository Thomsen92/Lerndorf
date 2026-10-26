import type { TeacherPage } from '../context';
import { loadClassBoard } from '../api';
import { weekLabel } from '../week';
let cleanup = () => {};
const page: TeacherPage = {
  title: 'Tafelmodus',
  unmount() {
    cleanup();
  },
  async mount(host, ctx) {
    host.innerHTML = `<div class="class-board"><header><p></p><div><button data-fullscreen ${typeof document.documentElement.requestFullscreen === 'function' ? '' : 'hidden'}>Vollbild</button><button data-back>Zurück</button></div></header><div class="board-content" aria-live="polite">Lädt …</div></div>`;
    const back = () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      ctx.go('uebersicht');
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back();
    };
    window.addEventListener('keydown', key);
    host.querySelector<HTMLButtonElement>('[data-back]')!.onclick = back;
    host.querySelector<HTMLButtonElement>('[data-fullscreen]')!.onclick = () =>
      void document.documentElement.requestFullscreen?.().catch(() => {});
    let pending = false,
      disposed = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const r = await loadClassBoard(ctx.supabase, ctx.classId);
        if (disposed || !ctx.alive()) return;
        if (!r.ok) {
          ctx.status(r.message, 'error');
          return;
        }
        const b = r.value;
        host.querySelector('header p')!.textContent = `${ctx.classId} · ${weekLabel(b.week)}`;
        const content = host.querySelector('.board-content')!;
        content.innerHTML = `<h1>Quests diese Woche</h1><p class="board-total">${b.solvedWeek} von ${b.goalWeek}</p><div class="board-progress" role="progressbar" aria-label="Quests diese Woche" aria-valuenow="${b.solvedWeek}" aria-valuemax="${Math.max(1, b.goalWeek)}" aria-valuemin="0"><span style="width:${b.goalWeek ? Math.min(100, (100 * b.solvedWeek) / b.goalWeek) : 0}%"></span></div><div class="board-figures"><article><h2>Heute</h2><strong>${b.solvedToday}</strong></article><article><h2>Klassen-Serie</h2><strong>🔥 ${b.classStreak}</strong></article></div><p class="board-stamps">Stempel diese Woche: ${b.stampsWeek}</p><p class="board-notice"></p>`;
        content.querySelector('.board-notice')!.textContent = b.notice ?? '';
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(() => void refresh(), 60000);
    cleanup = () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener('keydown', key);
    };
    await refresh();
  },
};
export default page;
