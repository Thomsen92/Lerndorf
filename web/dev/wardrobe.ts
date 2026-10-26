import { openWardrobe } from '../src/ui/wardrobeView';
import { openHouseMenu } from '../src/ui/houseMenu';
import { openShop } from '../src/ui/shopView';
import type { AreaHandle } from '../src/ui/areas';
import { avatarCatalog } from '../src/avatars/catalog';
import { emptyLook, DEFAULT_COLORS, readWardrobe } from '../src/avatars/look';
import type { WardrobeApi, WardrobeData } from '../src/api/wardrobe';
const params = new URLSearchParams(location.search),
  character = params.get('character') === 'girl' ? 'girl' : 'boy';
let data: WardrobeData = {
  character,
  wardrobe: readWardrobe(JSON.parse(sessionStorage.getItem('wardrobe-demo') ?? '{}')),
  ownedIds: params.has('empty') ? [] : avatarCatalog.map((p) => p.id),
  allowedColors: DEFAULT_COLORS,
};
if (!data.wardrobe) data.wardrobe = { v: 1, revision: 0, boy: emptyLook(), girl: emptyLook() };
const api: WardrobeApi = {
  async load() {
    return { ok: true, value: structuredClone(data) };
  },
  async save(kind, look, rev) {
    if (params.has('fail'))
      return {
        ok: false,
        message: 'Dein Look konnte nicht gespeichert werden. Bitte noch einmal versuchen.',
      };
    if (rev !== data.wardrobe.revision) return { ok: false, message: 'Dein Look wurde inzwischen geändert.' };
    data = { ...data, wardrobe: { ...data.wardrobe, [kind]: look, revision: rev + 1 } };
    sessionStorage.setItem('wardrobe-demo', JSON.stringify({ wardrobe: data.wardrobe }));
    return { ok: true, value: structuredClone(data) };
  },
};
let current: AreaHandle | null = null,
  coins = 500;
function home() {
  current?.close();
  document.body.querySelector('#home-note')?.remove();
  const p = document.createElement('p');
  p.id = 'home-note';
  p.textContent = 'Mein Haus';
  document.body.append(p);
  current = openHouseMenu({
    onBuild: () => {},
    onInventory: shop,
    onShop: shop,
    onWardrobe: () => open(),
    onSettings: () => {},
    onBack: () => {
      current?.close();
    },
  });
}
function shop() {
  current?.close();
  current = openShop({
    api: {
      async loadBook() {
        return {
          ok: true,
          value: avatarCatalog.map((p) => ({
            id: p.id,
            kind: 'avatar',
            nameDe: p.name,
            price: p.price,
            starter: false,
            owned: data.ownedIds.includes(p.id) ? 1 : 0,
            free: 1,
            placedIn: [],
            fits: [],
          })),
        };
      },
      async buy(id) {
        const part = avatarCatalog.find((p) => p.id === id)!;
        if (data.ownedIds.includes(id)) return { ok: false, message: 'Hast du schon.' };
        data.ownedIds.push(id);
        coins -= part.price;
        return { ok: true, value: { coins, qty: 1 } };
      },
    },
    character,
    getCoins: () => coins,
    onCoins: (c) => {
      coins = c;
    },
    shopOpen: !params.has('closed'),
    buildOpen: false,
    category: 'avatar',
    onCategory: () => {},
    onBuild: () => {},
    onShowSlot: () => {},
    onOpenInventory: shop,
    onWardrobe: (id) => open(id),
    onClose: () => open(),
  });
}
function open(initialItem?: string) {
  current?.close();
  current = openWardrobe({
    api,
    initialItem,
    onSaved: (d) => {
      data = d;
      document.body.dataset.saved = JSON.stringify(d);
    },
    onClose: home,
    onShop: shop,
  });
}
if (params.has('house')) home();
else open();
