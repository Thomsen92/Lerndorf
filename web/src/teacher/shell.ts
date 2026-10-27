import { clearCards } from './cards';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeacherContext, TeacherPage } from './context';
import { PAGE_LABELS, parseRoute, routeHash, type PageId } from './router';
export const PAGES: Record<PageId, () => Promise<TeacherPage>> = {
  uebersicht: async () => (await import('./pages/overview')).default,
  schueler: async () => (await import('./pages/pupils')).default,
  muenzen: async () => (await import('./pages/coins')).default,
  quests: async () => (await import('./pages/quests')).default,
  konten: async () => (await import('./pages/accounts')).default,
  dorf: async () => (await import('./pages/village')).default,
  saison: async () => (await import('./pages/season')).default,
  tafel: async () => (await import('./pages/board')).default,
};
export function mountShell(
  root: HTMLElement,
  supabase: SupabaseClient,
  pages = PAGES,
  onLogout: () => void = () => location.reload(),
): { dispose(): void } {
  root.innerHTML = `<header class="teacher-top"><a class="teacher-brand" href="#8a/uebersicht">Lerndorf <span>Lehrkraft</span></a><button class="teacher-menu" type="button" aria-expanded="false" aria-controls="teacherNav">Menü</button><nav class="class-tabs" aria-label="Klasse wählen"><button data-class="8a">Klasse 8a</button><button data-class="8b">Klasse 8b</button></nav><button id="logout" type="button">Abmelden</button></header>
 <nav class="teacher-nav" id="teacherNav" aria-label="Arbeitsseiten"></nav><main class="teacher"><div class="teacher-page-heading"><p class="teacher-class"></p><h1></h1></div><p class="status" role="status" aria-live="polite"></p><div class="teacher-page-content"></div></main>`;
  const nav = root.querySelector<HTMLElement>('.teacher-nav')!,
    main = root.querySelector<HTMLElement>('.teacher-page-content')!,
    status = root.querySelector<HTMLElement>('[role=status]')!,
    menu = root.querySelector<HTMLButtonElement>('.teacher-menu')!;
  let active: TeacherPage | undefined,
    revision = 0,
    disposed = false;
  const collapse = () => {
    root.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false');
  };
  menu.onclick = () => {
    const on = !root.classList.contains('menu-open');
    root.classList.toggle('menu-open', on);
    menu.setAttribute('aria-expanded', String(on));
  };
  const draw = async (clear = true) => {
    const version = ++revision,
      r = parseRoute(location.hash);
    active?.unmount?.();
    active = undefined;
    collapse();
    root.classList.toggle('board-mode', r.page === 'tafel');
    root.querySelector('h1')!.textContent = PAGE_LABELS[r.page];
    root.querySelector('.teacher-class')!.textContent = `Klasse ${r.classId}`;
    nav.replaceChildren();
    for (const [id, label] of Object.entries(PAGE_LABELS)) {
      if (id === 'tafel') continue;
      const a = document.createElement('a');
      a.href = routeHash({ classId: r.classId, page: id as PageId });
      a.textContent = label;
      if (id === r.page) a.setAttribute('aria-current', 'page');
      nav.append(a);
    }
    root
      .querySelectorAll<HTMLElement>('[data-class]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.class === r.classId)));
    if (clear) status.textContent = '';
    const host = document.createElement('div');
    main.replaceChildren(host);
    host.textContent = 'Lädt …';
    const ctx: TeacherContext = {
      supabase,
      classId: r.classId,
      route: r,
      alive: () => !disposed && version === revision,
      status(text, kind = 'ok') {
        if (!ctx.alive()) return;
        status.textContent = text;
        status.className = `status ${kind}`;
      },
      go(page, pupil, filter) {
        location.hash = routeHash({ classId: r.classId, page, pupil, filter });
      },
      refresh() {
        if (ctx.alive()) void draw(false);
      },
    };
    try {
      const page = await pages[r.page]();
      if (!ctx.alive()) return;
      active = page;
      host.textContent = '';
      await page.mount(host, ctx);
    } catch {
      ctx.status('Diese Seite konnte nicht geladen werden. Bitte erneut öffnen.', 'error');
      host.textContent = '';
    }
  };
  const change = () => void draw();
  window.addEventListener('hashchange', change);
  root.querySelectorAll<HTMLButtonElement>('[data-class]').forEach((b) => {
    b.onclick = () => {
      const r = parseRoute(location.hash);
      location.hash = routeHash({ ...r, classId: b.dataset.class as '8a' | '8b', pupil: undefined });
    };
  });
  const subscription = supabase.auth.onAuthStateChange?.((event) => {
    if (event === 'SIGNED_OUT') {
      clearCards();
      queueMicrotask(() => {
        if (!disposed) {
          dispose();
          onLogout();
        }
      });
    }
  });
  root.querySelector<HTMLButtonElement>('#logout')!.onclick = async () => {
    await supabase.auth.signOut();
    if (disposed) return;
    clearCards();
    dispose();
    onLogout();
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    revision++;
    active?.unmount?.();
    subscription?.data.subscription.unsubscribe();
    window.removeEventListener('hashchange', change);
    root.classList.remove('board-mode', 'menu-open');
  }
  void draw();
  return { dispose };
}
