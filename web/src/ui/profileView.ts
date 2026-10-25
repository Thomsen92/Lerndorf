import { PROGRESS_ERROR, XP_HELP, type Progress, type ProgressApi, type Reward } from '../api/progress';
import type { CharacterKind } from '../render/character';
import { avatarPortrait, frameSvg } from './frames';
import { crestSvg } from './crest';
import type { AreaHandle } from './areas';
import type { Sound } from './sound';
import { openChestDialog } from './levelUp';
import type { ModalHandle } from './dialog';
let serial = 0;
export function openProfile(opts: {
  api: ProgressApi;
  nickname: string;
  character: CharacterKind | null;
  getCoins: () => number;
  onCoins: (c: number) => void;
  onFrame: (id: string) => void;
  onTitle: (label: string | null) => void;
  onSettings: (b: HTMLButtonElement) => void;
  onClose: () => void;
  sound?: Sound;
  reducedMotion: boolean;
}): AreaHandle {
  const area = document.createElement('section');
  area.className = 'overlay area profile-area';
  area.setAttribute('role', 'region');
  const titleId = `profile-title-${++serial}`;
  area.setAttribute('aria-labelledby', titleId);
  const panel = document.createElement('div');
  panel.className = 'panel';
  const head = document.createElement('header');
  head.className = 'panel-head';
  const title = document.createElement('h2');
  title.id = titleId;
  title.textContent = 'Mein Profil';
  const makeButton = (text: string, fn: (b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', () => fn(b));
    return b;
  };
  head.append(
    title,
    makeButton('Einstellungen', opts.onSettings),
    makeButton('Schließen', () => opts.onClose()),
  );
  const content = document.createElement('div');
  content.className = 'area-content profile-content';
  panel.append(head, content);
  area.append(panel);
  document.body.append(area);
  let closed = false,
    p: Progress | null = null,
    rewards: Reward[] = [],
    dialog: ModalHandle | null = null,
    selectionBusy = false;
  const paragraph = (parent: HTMLElement, text: string): HTMLParagraphElement => {
    const e = document.createElement('p');
    e.textContent = text;
    parent.append(e);
    return e;
  };
  const section = (label: string): HTMLElement => {
    const s = document.createElement('section');
    s.className = 'profile-section';
    const h = document.createElement('h3');
    h.textContent = label;
    s.append(h);
    content.append(s);
    return s;
  };
  async function choose(
    reward: Reward | null,
    kind: 'title' | 'frame',
    b: HTMLButtonElement,
    error: HTMLElement,
  ): Promise<void> {
    if (!p || selectionBusy || closed) return;
    selectionBusy = true;
    b.disabled = true;
    try {
      const result =
        kind === 'title' ? await opts.api.setTitle(reward?.id ?? null) : await opts.api.setFrame(reward!.id);
      if (!result.ok) throw Error();
      if (closed) return;
      if (kind === 'title') {
        p.titleId = reward?.id ?? null;
        opts.onTitle(reward?.label ?? null);
      } else {
        p.frameId = reward!.id;
        opts.onFrame(reward!.id);
      }
      render();
    } catch {
      if (!closed) {
        error.textContent = PROGRESS_ERROR;
        b.disabled = false;
      }
    } finally {
      selectionBusy = false;
    }
  }
  function render(): void {
    if (!p || closed) return;
    content.replaceChildren();
    const hero = document.createElement('div');
    hero.className = 'profile-hero';
    hero.append(
      avatarPortrait({ character: opts.character, frameId: p.frameId, size: 'large' }),
      crestSvg(p.level, 116),
    );
    const identity = document.createElement('div');
    const nickname = document.createElement('h3');
    nickname.textContent = opts.nickname;
    identity.append(nickname);
    paragraph(identity, rewards.find((r) => r.id === p!.titleId)?.label ?? 'Kein Titel');
    paragraph(identity, `Level ${p.level}`);
    paragraph(identity, `${p.xp - p.levelXp} / ${p.nextLevelXp - p.levelXp} XP bis Level ${p.level + 1}`);
    const bar = document.createElement('div');
    bar.className = 'xp-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Erfahrung');
    bar.setAttribute('aria-valuenow', String(p.xp - p.levelXp));
    bar.setAttribute('aria-valuemax', String(p.nextLevelXp - p.levelXp));
    const fill = document.createElement('span');
    fill.style.width = `${100 * Math.max(0, Math.min(1, (p.xp - p.levelXp) / (p.nextLevelXp - p.levelXp)))}%`;
    bar.append(fill);
    identity.append(bar);
    paragraph(identity, `${opts.getCoins()} Münzen`);
    hero.append(identity);
    content.append(hero);
    const streak = section('Deine Serie');
    paragraph(streak, `🔥 ${p.streak.current} Schultage in Folge`);
    paragraph(streak, `Beste Serie: ${p.streak.best}`);
    paragraph(streak, p.streak.shieldLeft ? '🛡 1 Schutzschild diese Woche' : 'Schild verbraucht');
    paragraph(streak, `Heute: ${p.today.solved} von ${p.today.total} Quests`);
    const chests = section('Truhen');
    if (!p.chests.length) paragraph(chests, `Nächste Truhe bei Level ${p.level + 1}.`);
    for (const chest of p.chests) {
      const row = document.createElement('div');
      row.className = 'profile-chest';
      paragraph(
        row,
        `${chest.size === 'big' ? 'Große Truhe' : 'Truhe'} · ${chest.source === 'level' ? `Level ${chest.ref}` : chest.source === 'streak' ? 'Serie' : 'Willkommen zurück'}`,
      );
      row.append(
        makeButton('Öffnen', (b) => {
          dialog = openChestDialog({
            chest,
            api: opts.api,
            sound: opts.sound,
            reducedMotion: opts.reducedMotion,
            opener: b,
            onCoins: opts.onCoins,
            onDone: () => {
              dialog = null;
              if (!closed) void load();
            },
          });
        }),
      );
      chests.append(row);
    }
    for (const kind of ['title', 'frame'] as const) {
      const s = section(kind === 'title' ? 'Titel' : 'Rahmen'),
        list = document.createElement('div');
      list.className = 'profile-rewards';
      const items: Array<Reward | null> =
        kind === 'title'
          ? [null, ...rewards.filter((r) => r.kind === kind)]
          : rewards.filter((r) => r.kind === kind);
      for (const reward of items) {
        const selected = kind === 'title' ? p.titleId === (reward?.id ?? null) : p.frameId === reward?.id,
          locked = !!reward && reward.level > p.level;
        const card = document.createElement('div');
        card.className = 'profile-reward';
        if (reward?.kind === 'frame') card.append(frameSvg(reward.id, 72));
        const error = document.createElement('p');
        error.setAttribute('role', 'status');
        const b = makeButton(
          `${reward?.label ?? 'Kein Titel'}${locked ? ` · ab Level ${reward!.level}` : selected ? ' · gewählt' : ''}`,
          (button) => {
            void choose(reward, kind, button, error);
          },
        );
        b.disabled = locked || selected;
        b.setAttribute('aria-pressed', String(selected));
        card.append(b, error);
        list.append(card);
      }
      s.append(list);
    }
    const stats = section('Meine Erfolge');
    paragraph(stats, `${p.stats.quests} Quests gelöst`);
    paragraph(stats, `${p.stats.stamps} Stempel gesammelt`);
    paragraph(stats, `Beste Serie: ${p.stats.bestStreak}`);
    paragraph(stats, `Höchstes Level: ${p.level}`);
    const help = section('So bekommst du XP'),
      dl = document.createElement('dl');
    for (const [label, value] of XP_HELP) {
      const dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    }
    help.append(dl);
  }
  async function load(): Promise<void> {
    try {
      const [progress, catalogue] = await Promise.all([opts.api.load(), opts.api.rewards()]);
      if (closed) return;
      if (!progress.ok || !catalogue.ok) throw Error();
      p = progress.value;
      rewards = catalogue.value;
      render();
    } catch {
      if (closed) return;
      content.replaceChildren();
      const error = paragraph(content, PROGRESS_ERROR);
      error.setAttribute('role', 'status');
      content.append(
        makeButton('Nochmal versuchen', () => {
          void load();
        }),
      );
    }
  }
  paragraph(content, 'Profil wird geladen …');
  void load();
  return {
    close() {
      closed = true;
      dialog?.close();
      area.remove();
    },
  };
}
