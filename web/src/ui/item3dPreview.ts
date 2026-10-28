/**
 * "What's in it?" → large 3D view of one chest item (DEEPSEEK_WHATS_INSIDE_3D). Opened from the
 * item list of a season chest; a preview only: no draw, no purchase, no ownership change. The model
 * loads only on selection; one view and one model at a time, each opening gets a fresh view so a
 * late answer of an earlier one can never replace the current item.
 */
import { tr } from '../i18n';
import type { PoolItem } from '../api/season';
import type { SlotKind } from '../world/plotPlan';
import { itemName } from './seasonChests';
import { RARITY, rarityOf } from './learnpass/rewardArt';
import { createItemOrbitView } from '../render/itemOrbitView';
import './item3dPreview.css';

export interface Item3dView {
  /** Resolves once the model is shown; rejects when it cannot be loaded. */
  load(kind: SlotKind, itemId: string): Promise<void>;
  /** Back to the framed start view. */
  reset(): void;
  dispose(): void;
}
/** null when WebGL is unavailable. */
export type Item3dViewFactory = (
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
) => Item3dView | null;

export interface Item3dPreviewOptions {
  item: Pick<PoolItem, 'id' | 'kind' | 'rarity'>;
  onClose?: () => void;
  reducedMotion?: boolean;
  createView?: Item3dViewFactory;
}

export interface Item3dPreviewHandle {
  el: HTMLElement;
  close(): void;
}

export function openItem3dPreview(host: HTMLElement, opts: Item3dPreviewOptions): Item3dPreviewHandle {
  const name = itemName(opts.item.id);
  const rarity = rarityOf(opts.item.rarity);
  const el = document.createElement('section');
  el.className = 'item3d';
  el.style.setProperty('--r', RARITY[rarity].color);
  el.setAttribute('aria-label', name);

  const head = document.createElement('header');
  head.className = 'item3d-head';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'item3d-back';
  back.textContent = tr('← Zurück zur Liste');
  const title = document.createElement('h3');
  title.textContent = name;
  const badge = document.createElement('span');
  badge.className = 'item3d-rarity';
  badge.textContent = RARITY[rarity].label;
  head.append(back, title, badge);

  const stage = document.createElement('div');
  stage.className = 'item3d-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'item3d-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', name);
  const status = document.createElement('p');
  status.className = 'item3d-status';
  status.setAttribute('role', 'status');
  stage.append(canvas, status);

  const tools = document.createElement('div');
  tools.className = 'item3d-tools';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'item3d-reset';
  reset.textContent = tr('Ansicht zurücksetzen');
  const help = document.createElement('p');
  help.className = 'item3d-help';
  help.textContent = tr('Mit dem Finger drehen, mit zwei Fingern zoomen.');
  tools.append(reset, help);

  el.append(head, stage, tools);
  host.append(el);

  let closed = false;
  const view = (opts.createView ?? createItemOrbitView)(canvas, {
    reducedMotion:
      opts.reducedMotion ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  });
  if (!view) {
    status.textContent = tr('3D-Ansicht ist auf diesem Gerät nicht verfügbar.');
    reset.disabled = true;
  } else {
    load();
  }

  function load(): void {
    if (!view || closed) return;
    el.querySelector('.item3d-retry')?.remove();
    status.hidden = false;
    status.classList.remove('error');
    status.textContent = tr('Modell wird geladen …');
    view
      .load(opts.item.kind as SlotKind, opts.item.id)
      .then(() => {
        if (closed) return;
        status.hidden = true;
      })
      .catch(() => {
        if (closed) return;
        status.classList.add('error');
        status.textContent = tr('Das Modell konnte nicht geladen werden.');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'item3d-retry';
        retry.textContent = tr('Erneut versuchen');
        retry.addEventListener('click', load);
        status.after(retry);
      });
  }

  reset.addEventListener('click', () => view?.reset());
  back.addEventListener('click', () => close());
  back.focus();

  function close(): void {
    if (closed) return;
    closed = true;
    view?.dispose();
    el.remove();
    opts.onClose?.();
  }
  return { el, close };
}
