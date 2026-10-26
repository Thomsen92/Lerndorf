import { EN } from './i18n/en';
import { ITEM_NAMES } from './i18n/itemNames';
export type Locale = 'en' | 'de';
export const LANGUAGE_KEY = 'lerndorf.language';
let override: Locale | null = null;
export function getLocale(): Locale {
  if (
    typeof location !== 'undefined' &&
    (/\/lehrer(?:\/|$)/.test(location.pathname) || location.pathname.endsWith('/dev/teacher.html'))
  )
    return 'de';
  if (override) return override;
  try {
    const query = typeof location === 'undefined' ? null : new URL(location.href).searchParams.get('lang');
    if (query === 'en' || query === 'de') return query;
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'de' || saved === 'en') return saved;
  } catch {
    /* Storage may be blocked on shared devices. */
  }
  return 'en';
}
export function setLocale(locale: Locale | null): void {
  override = locale;
  if (locale)
    try {
      localStorage.setItem(LANGUAGE_KEY, locale);
    } catch {
      /* The settings action also preserves the selection in the URL. */
    }
  if (typeof document !== 'undefined') document.documentElement.lang = getLocale();
}
export const dateLocale = (): string => (getLocale() === 'en' ? 'en-GB' : 'de-DE');
export function tr(source: string): string {
  return getLocale() === 'de' ? source : (EN[source] ?? source);
}
export function itemName(id: string, fallback: string): string {
  return getLocale() === 'de' ? fallback : tr(ITEM_NAMES[id] ?? fallback);
}
function text(source: string): string {
  const tokens: string[] = [];
  const canonical = source.replace(/__LNG_(\d+)__/g, (token) => `{${tokens.push(token) - 1}}`);
  const leading = canonical.match(/^\s*/)?.[0] ?? '',
    trailing = canonical.match(/\s*$/)?.[0] ?? '';
  const exact = EN[canonical],
    core = exact ?? EN[canonical.trim()];
  if (!core) return source;
  const translated = exact ?? leading + core + trailing;
  return translated.replace(/\{(\d+)\}/g, (_m, i) => tokens[Number(i)] ?? `{${i}}`);
}
function tagged(strings: TemplateStringsArray, values: unknown[], markup: boolean): string {
  let source = strings.reduce((s, part, i) => s + (i ? `__LNG_${i - 1}__` : '') + part, '');
  if (getLocale() === 'en')
    source = markup
      ? source
          .replace(/(^|>)([^<>]*)(?=<|$)/g, (_m, start, body) => start + text(body))
          .replace(
            /((?:aria-label|title|alt|placeholder)=["'])([^"']*)(["'])/g,
            (_m, a, b, c) => a + text(b) + c,
          )
      : text(source);
  return source.replace(/__LNG_(\d+)__/g, (_m, i) => String(values[Number(i)] ?? ''));
}
export const msg = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  tagged(strings, values, false);
export function html(strings: TemplateStringsArray, ...values: unknown[]): string;
export function html(source: string): string;
export function html(source: TemplateStringsArray | string, ...values: unknown[]): string {
  return typeof source === 'string'
    ? tagged(Object.assign([source], { raw: [source] }), [], true)
    : tagged(source, values, true);
}
if (typeof document !== 'undefined') document.documentElement.lang = getLocale();
