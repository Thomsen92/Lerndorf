import { tr, html } from '../i18n';
import './wardrobe.css';
import type { WardrobeApi, WardrobeData } from '../api/wardrobe';
import { avatarCatalog, partById, partUrl } from '../avatars/catalog';
import { emptyLook, equipInLook, lookKey, type AvatarLook, type ColorChannel } from '../avatars/look';
import { createWardrobeStage, type WardrobeStage } from '../render/wardrobeStage';
import type { AreaHandle } from './areas';
type Tab = 'head' | 'clothing' | 'extras' | 'colors';
export function openWardrobe(opts: {
  api: WardrobeApi;
  onClose: () => void;
  onShop: () => void;
  onSaved: (data: WardrobeData) => void;
  initialItem?: string;
  maxPixelRatio?: number;
  stageFactory?: typeof createWardrobeStage;
}): AreaHandle {
  const el = document.createElement('section');
  el.className = 'wardrobe-view';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', tr('Kleiderschrank'));
  el.innerHTML = html(
    `<header class="wardrobe-head"><button type="button" data-action="back">← Zurück</button><h1>Kleiderschrank</h1><button type="button" class="wardrobe-done" data-action="done" disabled>Fertig</button></header><div class="wardrobe-layout"><div class="wardrobe-scene"><div class="wardrobe-stage"></div><div class="wardrobe-rotate"><button type="button" aria-label="Nach links drehen">↶</button><span>Ziehe, um dich zu drehen</span><button type="button" aria-label="Nach rechts drehen">↷</button></div><button type="button" class="wardrobe-reset">Ansicht zurücksetzen</button></div><aside class="wardrobe-inventory" aria-label="Deine Sachen"><nav class="wardrobe-tabs" aria-label="Auswahlbereiche"></nav><div class="wardrobe-list"></div></aside></div><p class="wardrobe-status" role="status" aria-live="polite">Dein Kleiderschrank wird vorbereitet …</p>`,
  );
  document.body.append(el);
  const list = el.querySelector<HTMLElement>('.wardrobe-list')!,
    tabs = el.querySelector<HTMLElement>('.wardrobe-tabs')!,
    done = el.querySelector<HTMLButtonElement>('[data-action="done"]')!,
    status = el.querySelector<HTMLElement>('.wardrobe-status')!;
  let closed = false,
    data: WardrobeData | undefined,
    stage: WardrobeStage | undefined,
    look = emptyLook(),
    desired = emptyLook(),
    original = '',
    busy = true,
    saving = false,
    op = 0,
    tab: Tab = 'head';
  let stageAbort: AbortController | undefined;
  const button = (text: string, run: () => void, cls = ''): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.className = cls;
    b.onclick = run;
    return b;
  };
  const owned = () =>
    avatarCatalog.filter((p) => p.character === data?.character && data.ownedIds.includes(p.id));
  const belongs = (slot: string, t: Tab) =>
    t === 'head'
      ? ['headwear', 'hair', 'face'].includes(slot)
      : t === 'clothing'
        ? slot === 'bottoms'
        : t === 'extras'
          ? ['back', 'bag', 'wrist', 'necklace'].includes(slot)
          : false;
  const available = (): Tab[] =>
    ['head', 'clothing', 'extras', 'colors'].filter(
      (t) => t === 'colors' || owned().some((p) => belongs(p.slot, t as Tab)),
    ) as Tab[];
  const message = (text: string) => {
    status.textContent = text;
  };
  function draw(): void {
    if (!data || closed) return;
    const focused = (document.activeElement as HTMLElement)?.dataset.key;
    const all = available();
    if (!all.includes(tab)) tab = all[0];
    tabs.replaceChildren();
    list.replaceChildren();
    const labels: Record<Tab, string> = {
      head: tr('Kopf'),
      clothing: tr('Kleidung'),
      extras: tr('Extras'),
      colors: tr('Farben'),
    };
    for (const t of all) {
      const b = button(labels[t], () => {
        tab = t;
        draw();
      });
      b.dataset.tab = t;
      b.dataset.key = `tab-${t}`;
      b.setAttribute('aria-pressed', String(t === tab));
      tabs.append(b);
    }
    if (tab === 'colors') {
      const channels: ColorChannel[] =
        data.character === 'girl'
          ? ['top', 'bottoms', 'shoes', 'hair', 'skin']
          : ['bottoms', 'shoes', 'hair', 'skin'];
      const names: Record<ColorChannel, string> = {
        top: tr('Oberteil'),
        bottoms: tr('Hose / Rock'),
        shoes: tr('Schuhe'),
        hair: tr('Haare'),
        skin: tr('Haut'),
      };
      for (const c of channels) {
        const group = document.createElement('fieldset'),
          legend = document.createElement('legend');
        legend.textContent = names[c];
        group.append(legend);
        const palette = document.createElement('div');
        palette.className = 'wardrobe-swatches';
        for (const value of [null, ...(data.allowedColors[c] ?? [])]) {
          const b = button(
            value ? '' : tr('Original'),
            () => {
              const colors = { ...desired.colors };
              if (value) colors[c] = value;
              else delete colors[c];
              void apply({ ...desired, colors });
            },
            value ? 'wardrobe-swatch' : 'wardrobe-original',
          );
          if (value) {
            b.style.setProperty('--swatch', value);
            b.setAttribute('aria-label', `${names[c]}: ${value}`);
          }
          b.dataset.key = `${c}-${value}`;
          b.setAttribute('aria-pressed', String(value === null ? !look.colors[c] : look.colors[c] === value));
          palette.append(b);
        }
        group.append(palette);
        list.append(group);
      }
    } else {
      const grid = document.createElement('div');
      grid.className = 'wardrobe-grid';
      const reset = button(
        tab === 'clothing' ? tr('Originalkleidung') : tr('Ohne Extras'),
        () =>
          void apply({
            ...desired,
            items: desired.items.filter((id) => !belongs(partById(id)?.slot ?? '', tab)),
          }),
        'wardrobe-card wardrobe-original-card',
      );
      reset.setAttribute('aria-label', tab === 'clothing' ? tr('Originalkleidung') : tr('Ohne Extras'));
      reset.dataset.key = `original-${tab}`;
      reset.setAttribute(
        'aria-pressed',
        String(!look.items.some((id) => belongs(partById(id)?.slot ?? '', tab))),
      );
      grid.append(reset);
      for (const p of owned().filter((p) => belongs(p.slot, tab))) {
        const b = button(
          '',
          () => {
            const next = desired.items.includes(p.id)
              ? { ...desired, items: desired.items.filter((id) => id !== p.id) }
              : equipInLook(desired, p.id);
            void apply(next);
          },
          'wardrobe-card',
        );
        b.dataset.item = p.id;
        b.dataset.key = p.id;
        b.setAttribute('aria-pressed', String(look.items.includes(p.id)));
        const img = document.createElement('img');
        img.src = partUrl(p, true);
        img.alt = '';
        const title = document.createElement('span');
        title.textContent = p.name;
        b.append(img, title);
        grid.append(b);
      }
      list.append(grid);
    }
    if (!owned().length) {
      const empty = document.createElement('p');
      empty.className = 'wardrobe-empty';
      empty.textContent = tr('Deine Grundausstattung ist bereit. Weitere Sachen findest du im Shop.');
      list.append(
        empty,
        button(tr('Zum Shop'), () => leave(opts.onShop), 'wardrobe-shop'),
      );
    }
    done.disabled = busy || saving;
    if (focused)
      Array.from(el.querySelectorAll<HTMLElement>('[data-key]'))
        .find((b) => b.dataset.key === focused)
        ?.focus({ preventScroll: true });
  }
  async function apply(next: AvatarLook): Promise<void> {
    if (!stage || saving || closed) return;
    const mine = ++op;
    desired = structuredClone(next);
    busy = true;
    done.disabled = true;
    message(tr('Wird angezogen …'));
    try {
      await stage.applyLook(next);
      if (closed || mine !== op) return;
      look = structuredClone(next);
      busy = false;
      message(tr('Dein Look ist bereit.'));
      draw();
    } catch {
      if (closed || mine !== op) return;
      desired = structuredClone(look);
      busy = false;
      message(tr('Das Teil konnte nicht geladen werden. Bitte noch einmal versuchen.'));
      draw();
    }
  }
  function leave(action: () => void): void {
    if (saving || closed) return;
    if (!data || lookKey(look) === original) {
      action();
      return;
    }
    if (el.querySelector('.wardrobe-guard')) return;
    const guard = document.createElement('div');
    guard.className = 'wardrobe-guard';
    guard.setAttribute('role', 'alertdialog');
    guard.setAttribute('aria-label', tr('Änderungen verwerfen?'));
    const text = document.createElement('p');
    text.textContent = tr('Deine Änderungen sind noch nicht gespeichert.');
    const stay = button(tr('Weiter anziehen'), () => guard.remove());
    guard.append(
      text,
      stay,
      button(tr('Verwerfen'), () => {
        guard.remove();
        action();
      }),
    );
    el.append(guard);
    stay.focus();
  }
  async function load(): Promise<void> {
    busy = true;
    done.disabled = true;
    message(tr('Dein Kleiderschrank wird vorbereitet …'));
    list.replaceChildren();
    let result: Awaited<ReturnType<WardrobeApi['load']>>;
    try {
      result = await opts.api.load();
    } catch {
      result = { ok: false, message: tr('Der Kleiderschrank konnte nicht geladen werden.') };
    }
    if (closed) return;
    if (!result.ok) {
      busy = false;
      message(result.message);
      list.append(button(tr('Erneut versuchen'), () => void load()));
      return;
    }
    data = result.value;
    look = structuredClone(data.wardrobe[data.character]);
    desired = structuredClone(look);
    original = lookKey(look);
    try {
      stage?.dispose();
      stageAbort?.abort();
      stageAbort = new AbortController();
      stage = await (opts.stageFactory ?? createWardrobeStage)(el.querySelector('.wardrobe-stage')!, {
        character: data.character,
        look,
        signal: stageAbort.signal,
        maxPixelRatio: opts.maxPixelRatio,
        reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      });
      if (closed) {
        stage.dispose();
        return;
      }
      busy = false;
      message('');
      draw();
      if (
        opts.initialItem &&
        data.ownedIds.includes(opts.initialItem) &&
        partById(opts.initialItem)?.character === data.character
      ) {
        const p = partById(opts.initialItem)!;
        tab = belongs(p.slot, 'head') ? 'head' : belongs(p.slot, 'clothing') ? 'clothing' : 'extras';
        await apply(equipInLook(look, opts.initialItem));
      }
    } catch {
      if (closed) return;
      busy = false;
      message(tr('Die Vorschau konnte nicht geladen werden.'));
      list.replaceChildren(button(tr('Erneut versuchen'), () => void load()));
    }
  }
  done.onclick = async () => {
    if (!data || busy || saving || closed) return;
    saving = true;
    done.disabled = true;
    message(tr('Dein Look wird gespeichert …'));
    let result: Awaited<ReturnType<WardrobeApi['save']>>;
    try {
      result = await opts.api.save(data.character, look, data.wardrobe.revision);
    } catch {
      result = {
        ok: false,
        message: tr('Dein Look konnte nicht gespeichert werden. Bitte noch einmal versuchen.'),
      };
    }
    if (closed) return;
    saving = false;
    if (result.ok) {
      original = lookKey(look);
      opts.onSaved(result.value);
      opts.onClose();
    } else {
      message(result.message);
      done.disabled = false;
      if (
        (result.code === 'revision_conflict' || result.message.includes('inzwischen')) &&
        !list.querySelector('[data-reload]')
      ) {
        const b = button(tr('Gespeicherten Look laden'), () => void load());
        b.dataset.reload = 'true';
        list.prepend(b);
      }
    }
  };
  el.querySelector<HTMLButtonElement>('[data-action="back"]')!.onclick = () => leave(opts.onClose);
  const turns = el.querySelectorAll<HTMLButtonElement>('.wardrobe-rotate button');
  turns[0].onclick = () => stage?.rotateBy(-0.3);
  turns[1].onclick = () => stage?.rotateBy(0.3);
  el.querySelector<HTMLButtonElement>('.wardrobe-reset')!.onclick = () => stage?.resetView();
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      leave(opts.onClose);
    }
    if (e.key === 'Tab') {
      const nodes = Array.from(
        (el.querySelector('.wardrobe-guard') ?? el).querySelectorAll<HTMLElement>(
          'button:not(:disabled),canvas[tabindex="0"]',
        ),
      ).filter((n) => !n.closest('[hidden]'));
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first?.focus();
        e.preventDefault();
      }
    }
  });
  void load();
  el.querySelector<HTMLButtonElement>('[data-action="back"]')!.focus();
  return {
    close() {
      if (closed) return;
      closed = true;
      op++;
      stageAbort?.abort();
      stage?.dispose();
      el.remove();
    },
  };
}
