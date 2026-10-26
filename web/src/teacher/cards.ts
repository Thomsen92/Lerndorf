import qrcode from 'qrcode-generator';
import { loginUrl } from '../auth/qrLogin';
export interface AccessCard {
  nickname: string;
  password: string;
  classId: string;
}
export const sessionCards: AccessCard[] = [];
export function rememberCard(card: AccessCard): void {
  const old = sessionCards.findIndex((c) => c.nickname.toLowerCase() === card.nickname.toLowerCase());
  if (old >= 0) sessionCards[old] = card;
  else sessionCards.push(card);
}
export function clearCards(): void {
  sessionCards.length = 0;
  document.querySelectorAll('.cards').forEach((e) => e.remove());
}
export function forgetCard(nickname: string): void {
  const i = sessionCards.findIndex((c) => c.nickname.toLowerCase() === nickname.toLowerCase());
  if (i >= 0) sessionCards.splice(i, 1);
  document.querySelectorAll('.cards').forEach((c) => c.remove());
}
export function renderCards(cards: AccessCard[], base: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'print-only cards';
  section.setAttribute('aria-label', 'Zugangskärtchen');
  for (const c of cards) {
    const card = document.createElement('article');
    card.className = 'card-item';
    const title = document.createElement('p');
    title.className = 'card-title';
    title.textContent = `Lerndorf · Klasse ${c.classId}`;
    const nick = document.createElement('p');
    nick.className = 'card-nick';
    nick.textContent = c.nickname;
    const password = document.createElement('p');
    password.className = 'card-pass';
    password.textContent = `Passwort: ${c.password}`;
    const qr = qrcode(0, 'M');
    qr.addData(loginUrl(base, c.nickname, c.password), 'Byte');
    qr.make();
    const svg = document.createElement('div');
    svg.className = 'card-qr';
    svg.innerHTML = qr.createSvgTag({ cellSize: 2, margin: 2, scalable: true });
    const hint = document.createElement('p');
    hint.className = 'card-url';
    hint.textContent =
      'Mit dem QR-Code meldet sich der Schüler direkt an. Bei Verlust: Passwort zurücksetzen.';
    card.append(title, nick, password, svg, hint);
    section.append(card);
  }
  return section;
}
