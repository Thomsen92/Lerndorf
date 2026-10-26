import { tr } from '../i18n';
/** Small non-modal house menu: Bauen / Shop / Inventar / Einstellungen / Zurück. The house stays visible beside it. */
import type { AreaHandle } from './areas';

export interface HouseMenuOptions {
  onBuild: () => void;
  onShop: () => void;
  onInventory: () => void;
  onWardrobe?: () => void;
  onSettings: (button: HTMLButtonElement) => void;
  onBack: () => void;
}

let counter = 0;

export function openHouseMenu(opts: HouseMenuOptions): AreaHandle {
  const titleId = `house-menu-title-${++counter}`;
  const el = document.createElement('section');
  el.className = 'house-menu';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-labelledby', titleId);
  const h = document.createElement('h2');
  h.id = titleId;
  h.textContent = tr('Mein Haus');
  el.append(h);

  const make = (label: string, run: (b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => run(b));
    el.append(b);
    return b;
  };
  const build = make(tr('Bauen'), () => opts.onBuild());
  if (opts.onWardrobe) make(tr('Kleiderschrank'), opts.onWardrobe);
  make(tr('Shop'), () => opts.onShop());
  make(tr('Inventar'), () => opts.onInventory());
  make(tr('Einstellungen'), (b) => opts.onSettings(b));
  make(tr('Zurück'), () => opts.onBack());

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      opts.onBack();
    }
  });

  document.body.append(el);
  build.focus();
  return { close: () => el.remove() };
}
