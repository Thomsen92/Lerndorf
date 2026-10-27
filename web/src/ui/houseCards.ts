import { Vector3, type Camera } from 'three';
import type { Plot } from '../world/layout';
import { SLOTS, rectCentre } from '../world/plotPlan';
import { crestSvg } from './crest';
import { titlePlaque } from './titlePlaque';
import { msg } from '../i18n';
import './houseCards.css';
export interface HouseMember {
  id: string;
  plotIndex: number | null;
  nickname: string;
  level?: number;
  titleLabel?: string | null;
}
export function createHouseCards(opts: {
  host: HTMLElement;
  plots: ReadonlyArray<Pick<Plot, 'index' | 'x' | 'z' | 'h' | 'face'>>;
  members: HouseMember[];
  ownId: string;
  onOwn: () => void;
  onVisit: (id: string, opener: HTMLElement) => void;
}) {
  const el = document.createElement('div');
  el.className = 'house-cards';
  opts.host.append(el);
  const centre = rectCentre(SLOTS[0]),
    axis = new Vector3(0, 1, 0);
  const cards = new Map<string, { member: HouseMember; button: HTMLButtonElement; point: Vector3 }>();
  let selected: string | null = null,
    visible = true;
  function draw(card: { member: HouseMember; button: HTMLButtonElement }) {
    const { member: m, button: b } = card,
      name = document.createElement('strong'),
      title = document.createElement('span'),
      text = document.createElement('span');
    name.textContent = m.nickname;
    if (m.titleLabel) title.append(titlePlaque(m.titleLabel, m.level ?? 1, true));
    else title.hidden = true;
    title.className = 'house-card-title';
    text.className = 'house-card-text';
    text.append(name, title);
    b.replaceChildren(crestSvg(m.level ?? 1, 56), text);
    b.setAttribute(
      'aria-label',
      m.id === opts.ownId ? msg`Haus von ${m.nickname} öffnen` : msg`Profil von ${m.nickname} öffnen`,
    );
  }
  for (const member of opts.members) {
    const plot = opts.plots.find((p) => p.index === member.plotIndex);
    if (!plot) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.hidden = true;
    b.dataset.memberId = member.id;
    b.className = member.id === opts.ownId ? 'house-card house-card--own' : 'house-card';
    const point = new Vector3(centre.lx, 6, centre.lz)
      .applyAxisAngle(axis, plot.face)
      .add(new Vector3(plot.x, plot.h, plot.z));
    const card = { member: { ...member }, button: b, point };
    draw(card);
    b.onclick = () => {
      if (member.id === opts.ownId) opts.onOwn();
      else {
        selected = member.id;
        opts.onVisit(member.id, b);
      }
    };
    cards.set(member.id, card);
    el.append(b);
  }
  return {
    el,
    update(camera: Camera) {
      if (!visible) return;
      camera.updateMatrixWorld();
      const projected = new Map(
        [...cards.values()].map((card) => [card, card.point.clone().project(camera)]),
      );
      const inView = (p: Vector3) => p.z >= -1 && p.z <= 1 && Math.abs(p.x) <= 1.05 && Math.abs(p.y) <= 1.05;
      const others = [...cards.values()]
        .filter(
          (c) =>
            c.member.id !== opts.ownId &&
            inView(projected.get(c)!) &&
            c.point.distanceTo(camera.position) < 28,
        )
        .sort(
          (a, b) => a.point.distanceToSquared(camera.position) - b.point.distanceToSquared(camera.position),
        );
      const nearby = others.find((c) => c.member.id === selected)?.member.id ?? others[0]?.member.id;
      for (const card of cards.values()) {
        const p = projected.get(card)!,
          allowed = card.member.id === opts.ownId || card.member.id === nearby;
        card.button.hidden = !allowed || !inView(p);
        if (card.button.hidden) continue;
        const width = opts.host.clientWidth || window.innerWidth,
          height = opts.host.clientHeight || window.innerHeight;
        const x = Math.max(122, Math.min(width - 122, ((p.x + 1) * width) / 2)),
          y = Math.max(100, Math.min(height - 14, ((1 - p.y) * height) / 2));
        card.button.style.left = `${x}px`;
        card.button.style.top = `${y}px`;
      }
    },
    updateMember(info: Pick<HouseMember, 'id' | 'nickname' | 'level' | 'titleLabel'>) {
      const card = cards.get(info.id);
      if (card) {
        card.member = { ...card.member, ...info };
        draw(card);
      }
    },
    setVisible(on: boolean) {
      visible = on;
      el.hidden = !on;
    },
    dispose() {
      el.remove();
      cards.clear();
    },
  };
}
