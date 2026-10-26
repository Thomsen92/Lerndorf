export interface LoginCredentials {
  nickname: string;
  password: string;
}
export function encodeLogin(nickname: string, password: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ n: nickname, p: password }));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export function decodeLogin(fragment: string): LoginCredentials | null {
  if (!/^#login=[A-Za-z0-9_-]+$/.test(fragment) || fragment.length > 4096) return null;
  try {
    const base = fragment.slice(7).replaceAll('-', '+').replaceAll('_', '/');
    const data = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(base), (c) => c.charCodeAt(0))),
    );
    return typeof data.n === 'string' &&
      data.n.length > 0 &&
      data.n.length <= 16 &&
      typeof data.p === 'string' &&
      data.p.length <= 1024
      ? { nickname: data.n, password: data.p }
      : null;
  } catch {
    return null;
  }
}
export function loginUrl(base: string, nickname: string, password: string): string {
  const url = new URL(base);
  url.search = '';
  url.hash = 'login=' + encodeLogin(nickname, password);
  return url.href;
}
export function takeLoginFragment(
  loc: Location = location,
  hist: History = history,
): LoginCredentials | null {
  if (!loc.hash.startsWith('#login=')) return null;
  const value = decodeLogin(loc.hash);
  hist.replaceState(null, '', loc.pathname + loc.search);
  return value;
}
