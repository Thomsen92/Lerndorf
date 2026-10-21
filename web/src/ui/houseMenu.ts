/** Small non-modal house menu: Bauen / Shop / Inventar / Einstellungen / Zurück. The house stays visible beside it. */
import type { AreaHandle } from './areas';

export interface HouseMenuOptions {
  onBuild: () => void;
  onShop: () => void;
  onInventory: () => void;
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
  h.textContent = 'Mein Haus';
  el.append(h);

  const make = (label: string, run: (b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => run(b));
    el.append(b);
    return b;
  };
  const build = make('Bauen', () => opts.onBuild());
  make('Shop', () => opts.onShop());
  make('Inventar', () => opts.onInventory());
  make('Einstellungen', (b) => opts.onSettings(b));
  make('Zurück', () => opts.onBack());

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
