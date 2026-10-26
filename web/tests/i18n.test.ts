// @vitest-environment happy-dom
import { afterEach, it, expect } from 'vitest';
import { getLocale, setLocale, tr, msg, html, itemName } from '../src/i18n';
import { EN } from '../src/i18n/en';
import { ITEM_NAMES } from '../src/i18n/itemNames';
afterEach(() => {
  localStorage.removeItem('lerndorf.language');
  setLocale(null);
});
it('defaults to English and persists a German preference', () => {
  localStorage.clear();
  setLocale(null);
  expect(getLocale()).toBe('en');
  expect(tr('Kleiderschrank')).toBe('Wardrobe');
  setLocale('de');
  expect(tr('Kleiderschrank')).toBe('Kleiderschrank');
  expect(localStorage.getItem('lerndorf.language')).toBe('de');
});
it('keeps dynamic values, IDs and the product name intact', () => {
  setLocale('en');
  expect(msg`${'Münzen'} · ${25} Münzen`).toBe('Münzen · 25 coins');
  expect(tr('house_fachwerk')).toBe('house_fachwerk');
  expect(tr('Lerndorf')).toBe('Lerndorf');
});
it('translates HTML text and accessible names without changing protocol attributes', () => {
  setLocale('en');
  expect(html`<button data-area="haus" aria-label="Mein Haus">Mein Haus</button>`).toBe(
    '<button data-area="haus" aria-label="My House">My House</button>',
  );
  expect(html`<p>${'Haus'} · ${20} Münzen</p>`).toBe('<p>Haus · 20 coins</p>');
});
it('uses stable catalogue IDs and never mutates server data', () => {
  const row = { id: 'house_fachwerk', name_de: 'Fachwerkhaus' };
  setLocale('en');
  expect(itemName(row.id, row.name_de)).toBe('Timber-frame house');
  expect(row.name_de).toBe('Fachwerkhaus');
  setLocale('de');
  expect(itemName(row.id, row.name_de)).toBe('Fachwerkhaus');
});
it('covers catalogue display names and preserves every translation placeholder', () => {
  for (const label of Object.values(ITEM_NAMES)) expect(EN[label], label).toBeDefined();
  const placeholders = (value: string) => [...value.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
  for (const [source, translated] of Object.entries(EN))
    expect(placeholders(translated), source).toEqual(placeholders(source));
});
it('keeps the teacher area German even with an English browser preference', () => {
  const original = location.href;
  history.replaceState(null, '', '/dev/teacher.html');
  try {
    setLocale('en');
    expect(getLocale()).toBe('de');
    expect(tr('Einstellungen')).toBe('Einstellungen');
  } finally {
    history.replaceState(null, '', original);
  }
});
