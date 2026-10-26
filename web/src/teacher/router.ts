export type ClassId = '8a' | '8b';
export type PageId = 'uebersicht' | 'schueler' | 'muenzen' | 'quests' | 'konten' | 'dorf' | 'tafel';
export interface Route {
  classId: ClassId;
  page: PageId;
  pupil?: string;
  filter?: string;
}
export const PAGE_LABELS: Record<PageId, string> = {
  uebersicht: 'Übersicht',
  schueler: 'Schüler',
  muenzen: 'Münzen & Stempel',
  quests: 'Daily Quests',
  konten: 'Konten',
  dorf: 'Dorf & Regeln',
  tafel: 'Tafelmodus',
};
export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const [classId, page, pupil] = path.split('/');
  if ((classId !== '8a' && classId !== '8b') || !Object.hasOwn(PAGE_LABELS, page))
    return { classId: '8a', page: 'uebersicht' };
  const filter = new URLSearchParams(query).get('filter');
  return {
    classId,
    page: page as PageId,
    ...(pupil ? { pupil: decodeURIComponentSafe(pupil) } : {}),
    ...(filter === 'tutorial' || filter === 'inaktiv' ? { filter } : {}),
  };
}
function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return '';
  }
}
export function routeHash(r: Route): string {
  return `#${r.classId}/${r.page}${r.pupil ? '/' + encodeURIComponent(r.pupil) : ''}${r.filter ? '?filter=' + encodeURIComponent(r.filter) : ''}`;
}
