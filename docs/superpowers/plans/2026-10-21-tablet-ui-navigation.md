# Tablet-UI und Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pupil HUD with a fixed, labelled three-button navigation (Dorf, Aufgaben, Mein Haus) plus a house menu (Bauen, Shop, Inventar, Einstellungen, Zurück) that opens with a camera flight to the own house, give shop and inventory one shared item card/detail view with a 3D preview, and let build mode preview an item on the own plot before it is saved.

**Architecture:** A pure item model (`api/items.ts`) merges catalog, inventory and placements behind an injectable `ItemApi`, so every view can be tested and screenshotted without Supabase. Shop, inventory, task board and the house menu are non-modal *areas* switched by an area controller; only the item detail and the settings menu are modal (shared `ui/dialog.ts`). „Mein Haus“ (nav button or a tap on the own plot) flies the camera to a fixed house view and locks it. Build mode previews by feeding a provisional `SlotMap` into the existing `village.userData.updateOwnPlot`, so no new placement transform is written.

**Tech Stack:** TypeScript strict, Vite 5, three.js 0.170.0 (pinned), Vitest 2 (+ happy-dom for DOM tests), Playwright (screenshot script), Supabase RPCs `buy_item`, `place_in_slot`, `clear_slot` (unchanged).

**Spec:** `docs/superpowers/specs/2026-10-21-tablet-ui-navigation-design.md` — read §10 „Präzisierungen nach Prüfung“ first; it overrides §3–§9. In particular §10.5 replaces the five-area navigation with three nav buttons and the house menu.

## Global Constraints

- Read `CLAUDE.md` first. Do not touch `Konzept/`, `Prototyp/`, `../Referenz`, the repo `Thomsen92/English-Club-8`, or the unrelated working-tree changes (`.gitignore`, `Video/`, `wrangler.jsonc`). Work in the current checkout, no worktree. `git add` only the files a task names.
- No database migration, no RPC change, no direct table writes. Purchases only via `buyItem` (`buy_item`), placements only via `placeInSlot` / `clearSlot`.
- three.js stays `0.170.0`. Only new dependency: dev dependency `happy-dom` (MIT, free). No analytics, no trackers.
- UI text German, plain language; code and comments English. Never write „KW“.
- Touch targets ≥ 44 × 44 CSS px; all actions reachable by keyboard; visible focus; state never shown by colour alone (always a text label).
- Exact UI strings (use verbatim):
  - Nav labels: `Dorf`, `Aufgaben`, `Mein Haus`; nav `aria-label="Hauptmenü"`.
  - House menu: region title `Mein Haus`; buttons `Bauen`, `Shop`, `Inventar`, `Einstellungen`, `Zurück`. Without own plot: notice `Du hast noch kein Grundstück.`
  - Dorf button: `Marktplatz`.
  - Settings menu title `Einstellungen`; actions `Kontoauszug`, `Abmelden`; quality group `Grafik-Qualität` with `Auto` / `Hoch` / `Niedrig`.
  - Category labels: `house` → `Häuser`, `garage` → `Garagen`, `car` → `Autos`, `deco` → `Garten-Deko`, `avatar` → `Für deinen Avatar`.
  - Reasons a purchase is blocked: `Hast du schon.`, `Der Shop ist gerade geschlossen.`, `Dafür reichen die Münzen nicht.`
  - Avatar preview hint: `Vorschau gibt es mit dem Avatar-Editor.`
  - Preview error: `Die Vorschau konnte nicht geladen werden.` + button `Nochmal versuchen`.
  - Build preview hint: `Vorschau – noch nicht gespeichert`; build buttons `Speichern`, `Drehen`, `Abbrechen`, `Wegräumen`, `Fertig`.
  - Empty inventory: `Du hast noch keine eigenen Sachen. Im Shop kannst du welche kaufen.`; empty category: `In dieser Kategorie gibt es gerade nichts.`
- Before a task counts as done: `npm test`, `npm run build`, `npx eslint src tests` in `web/` are green.

## Review Focus

1. **Double tap on „Ja, kaufen“ or „Speichern“** → exactly one RPC call; the button is disabled while the call runs. (Tests in Task 6 and Task 8.)
2. **Leaving „Bauen“ with an unsaved preview** (other nav area, „Fertig“, logout, auto-logout) → the own plot shows the server state again, nothing is saved. (Tests in Task 8 and Task 10.)
2b. **Camera lock released on every way out of the house** („Zurück“, „Dorf“, „Aufgaben“, tap on the task board, logout) → orbit controls enabled again; a camera drag that ends on the own house is not a tap and does not open the house menu. (Tests in Task 10.)
3. **Escape, backdrop or area switch while a purchase is running** → the detail dialog stays open until the result is shown; the result is not lost. (Test in Task 6.)
4. **Coins after a purchase** → nav status, a re-opened shop and the affordability of other items all use the new coin value. (Tests in Task 7 and Task 10.)
5. **Long German item names, portrait and landscape tablet** → no horizontal page scroll, nav fully visible, every nav button ≥ 44 px. (Checks in Task 11.)

---

## File Map

- Create `web/src/api/items.ts` — item model: `ItemEntry`, `buildItemBook`, `purchaseState`, `groupByKind`, `ItemApi`, `supabaseItemApi`.
- Modify `web/src/api/build.ts` — export `loadOwnSlots`, reuse it in `loadBuildState`.
- Create `web/src/ui/dialog.ts` — accessible modal helper.
- Create `web/src/ui/gameNav.ts` — main navigation + status (nickname, coins) + live region.
- Create `web/src/ui/accountMenu.ts` — settings menu (ledger, quality, logout).
- Create `web/src/ui/houseMenu.ts` — house menu area; create `web/src/render/houseCamera.ts` — house view, camera flight and lock.
- Modify `web/src/ui/ledgerView.ts` — render inside `openModal`.
- Create `web/src/render/itemPreview.ts` — small preview renderer + pure `previewFrame`.
- Create `web/src/ui/itemDetail.ts` — shared item cards and detail dialog.
- Rewrite `web/src/ui/shopView.ts`; create `web/src/ui/inventoryView.ts` — the two item areas.
- Modify `web/src/ui/taskBoardView.ts` — return an `AreaHandle`.
- Create `web/src/ui/areas.ts` — area controller.
- Create `web/src/render/buildPreview.ts` — pure build-preview helpers; modify `web/src/render/buildMode.ts`.
- Modify `web/src/ui/villageView.ts`, `web/src/style.css` — wiring and layout.
- Create `web/dev/ui.html`, `web/dev/ui.ts`, `web/scripts/ui-shots.ts`; modify `web/package.json`.
- Tests: `web/tests/ui/items.test.ts`, `dialog.test.ts`, `gameNav.test.ts`, `accountMenu.test.ts`, `itemDetail.test.ts`, `itemAreas.test.ts`, `areas.test.ts`, `houseMenu.test.ts`, `web/tests/render/houseCamera.test.ts`, `web/tests/render/itemPreview.test.ts`, `web/tests/render/buildPreview.test.ts`.
- Docs: `docs/PLAN.md`, spec status line.

---

### Task 1: Item model

**Files:**
- Create: `web/src/api/items.ts`
- Modify: `web/src/api/build.ts`
- Test: `web/tests/ui/items.test.ts`

**Interfaces:**
- Consumes: `CatalogItem`, `Outcome`, `loadCatalog`, `loadInventory`, `buyItem` from `api/economy.ts`; `SlotMap`, `shownItem` from `api/build.ts`; `SLOTS`, `slotAccepts`, `SlotId` from `world/plotPlan.ts`.
- Produces:
  ```ts
  export type ItemKind = CatalogItem['kind'];
  export interface ItemEntry {
    id: string; kind: ItemKind; nameDe: string; price: number; starter: boolean;
    owned: number;          // starter items: always 1
    placedIn: SlotId[];     // slots that show this item (starters count where they are the fallback)
    free: number;           // max(0, owned - placedIn.length)
    fits: SlotId[];         // slot ids that accept the kind; [] for avatar
  }
  export const KIND_ORDER: readonly ItemKind[]; // ['house','garage','car','deco','avatar']
  export const KIND_LABEL: Record<ItemKind, string>;
  export function buildItemBook(catalog: CatalogItem[], inventory: Record<string, number>, slots: SlotMap): ItemEntry[];
  export function groupByKind(entries: ItemEntry[]): Array<{ kind: ItemKind; items: ItemEntry[] }>; // KIND_ORDER, empty groups kept
  export function purchaseState(e: ItemEntry, coins: number, shopOpen: boolean): { canBuy: boolean; reason: string | null };
  export interface ItemApi {
    loadBook(): Promise<Outcome<ItemEntry[]>>;
    buy(itemId: string): Promise<Outcome<{ coins: number; qty: number }>>;
  }
  export function supabaseItemApi(supabase: SupabaseClient, uid: string): ItemApi;
  // api/build.ts
  export async function loadOwnSlots(supabase: SupabaseClient, uid: string): Promise<Outcome<SlotMap>>;
  ```

- [ ] **Step 1: Write the failing tests** in `tests/ui/items.test.ts`:
  - `buildItemBook` with starter `house_fachwerk` (no inventory row, no placement) → `owned 1`, `placedIn ['house']`, `free 0`.
  - deco `deco_cat_sign` with inventory 2 and placement in `deco_3` → `owned 2`, `placedIn ['deco_3']`, `free 1`, `fits ['deco_1','deco_2','deco_3','deco_4']`.
  - avatar item → `fits []`, `placedIn []`.
  - catalog items the pupil does not own are still returned with `owned 0`.
  - `groupByKind` returns kinds in `KIND_ORDER`, five groups even when one is empty.
  - `purchaseState`: owned house → `{canBuy:false, reason:'Hast du schon.'}`; shop closed → `'Der Shop ist gerade geschlossen.'`; coins < price → `'Dafür reichen die Münzen nicht.'`; deco owned 3 times and affordable → `{canBuy:true, reason:null}`. Precedence: owned-once > closed > coins.
  - `supabaseItemApi(...).loadBook()` with a stub client whose `from()` returns an error → `{ ok:false }` (stub only the query-builder methods used).

- [ ] **Step 2: Run** `npx vitest run tests/ui/items.test.ts` — expect FAIL (module not found).

- [ ] **Step 3: Implement** `api/items.ts`. Once-only kinds: `house`, `garage`, `car` (same set as the old `ONCE` in `shopView.ts`). `buildItemBook` drops no items; `placedIn` uses `shownItem(slots, s.id, s.kind)` for every slot. `supabaseItemApi.loadBook` loads catalog, inventory and `loadOwnSlots` in parallel and returns the first error message. Move the `placements` query of `loadBuildState` into `loadOwnSlots` and call it from there (behaviour unchanged).

- [ ] **Step 4: Run** `npx vitest run tests/ui/items.test.ts` — expect PASS; then `npm test` — all green.

- [ ] **Step 5: Commit** `git add web/src/api/items.ts web/src/api/build.ts web/tests/ui/items.test.ts && git commit -m "feat(ui): item model for shop, inventory and build"`

---

### Task 2: Accessible modal helper and DOM test setup

**Files:**
- Modify: `web/package.json` (devDependency `happy-dom` `^15.11.0`)
- Create: `web/src/ui/dialog.ts`
- Test: `web/tests/ui/dialog.test.ts` (first line `// @vitest-environment happy-dom`)

**Interfaces:**
- Produces:
  ```ts
  export interface ModalOptions {
    title: string;
    opener?: HTMLElement | null;   // focus returns here on close
    canClose?: () => boolean;      // false while a transaction runs
    onClose?: () => void;
    wide?: boolean;
  }
  export interface ModalHandle { body: HTMLElement; close(): void; readonly isOpen: boolean; }
  export function openModal(opts: ModalOptions): ModalHandle;
  ```

- [ ] **Step 1: Install** `cd web && npm i -D happy-dom@^15.11.0` — `package.json` and lock file updated.
- [ ] **Step 2: Write the failing tests** (`dialog.test.ts`, happy-dom):
  - opened modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to an `h2` with the title.
  - every other child of `document.body` gets the `inert` attribute while open; removed after `close()`.
  - focus moves into the dialog (first focusable element, else the dialog panel with `tabindex="-1"`).
  - `Escape` keydown closes and calls `onClose` once; focus returns to `opener`.
  - with `canClose: () => false`, `Escape` and the close button do nothing.
  - two modals stacked: closing the top one keeps `inert` on the elements behind the lower one.
- [ ] **Step 3: Run** `npx vitest run tests/ui/dialog.test.ts` — expect FAIL.
- [ ] **Step 4: Implement** `openModal`: container `.overlay.modal` appended to `body` containing `section.panel` with header (`h2`, button `Schließen`) and `body`. Remember which elements it set `inert` on and only remove those. Reuse existing `.overlay` / `.panel` CSS; add `.overlay.modal { z-index: 30 }`.
- [ ] **Step 5: Run** the test — PASS; `npm test` green.
- [ ] **Step 6: Commit** `git add web/package.json web/package-lock.json web/src/ui/dialog.ts web/tests/ui/dialog.test.ts web/src/style.css && git commit -m "feat(ui): accessible modal helper"`

---

### Task 3: Main navigation

**Files:**
- Create: `web/src/ui/gameNav.ts`
- Modify: `web/src/style.css`
- Test: `web/tests/ui/gameNav.test.ts` (happy-dom)

**Interfaces:**
- Produces:
  ```ts
  export type NavButton = 'dorf' | 'aufgaben' | 'haus';               // the three nav buttons
  export type NavArea = NavButton | 'bauen' | 'shop' | 'inventar';    // all areas; the last three live under 'haus'
  export const NAV_BUTTONS: readonly NavButton[];                     // ['dorf','aufgaben','haus']
  /** Nav button that is marked for an area: bauen/shop/inventar → 'haus'. */
  export function navButtonFor(area: NavArea): NavButton;
  export interface GameNav {
    el: HTMLElement;                       // <nav class="game-nav" aria-label="Hauptmenü">
    status: HTMLElement;                   // <button class="nav-status"> nickname + coins
    setActive(area: NavArea): void;        // aria-current="page" on exactly one nav button (navButtonFor)
    setCoins(coins: number): void;         // updates status, announces gains
  }
  export function createGameNav(opts: {
    nickname: string; coins: number;
    onSelect: (area: NavButton, button: HTMLButtonElement) => void;
    onAccount: (button: HTMLButtonElement) => void;
  }): GameNav;
  ```

- [ ] **Step 1: Write the failing tests:**
  - three buttons with the exact labels `Dorf`, `Aufgaben`, `Mein Haus` in this order; each has visible text (icon spans are `aria-hidden="true"`).
  - `setActive('shop')` → only the `Mein Haus` button has `aria-current="page"` and class `active`; `setActive('aufgaben')` → only `Aufgaben`.
  - clicking `Mein Haus` calls `onSelect('haus', button)`.
  - status button text contains nickname and `130 Münzen`; clicking it calls `onAccount`.
  - `setCoins(140)` after 130 → live region (`role="status"`, `aria-live="polite"`) reads `Du hast jetzt 140 Münzen.` and a `.gain` tag `+10` appears; `setCoins(120)` announces without a gain tag.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `gameNav.ts`; icons are simple Unicode/emoji in `<span aria-hidden="true">` (🏘 Dorf, 📋 Aufgaben, 🏠 Mein Haus). The gain tag reuses the existing `.gain` CSS.
- [ ] **Step 4: CSS** in `style.css`:
  - `:root { --nav-bottom: 0px; --nav-left: 0px; }`; `.game-nav` fixed, `z-index: 20`, `padding` with `env(safe-area-inset-*)`.
  - Portrait (`@media (orientation: portrait)`): bottom bar, 3 equal columns, label under icon, `--nav-bottom: calc(64px + env(safe-area-inset-bottom))`.
  - Landscape (`@media (orientation: landscape)`): left rail 88 px wide, buttons stacked, `--nav-left: calc(88px + env(safe-area-inset-left))`.
  - Buttons `min-height: 56px; min-width: 44px`; `:focus-visible` outline 3px `var(--lantern)`; active state = background + bold label (not colour alone).
  - `.nav-status` fixed top-right (replaces `.village-hud`).
  - `.overlay:not(.modal)` and `.build-bar` respect `left: var(--nav-left); bottom: var(--nav-bottom)`.
  - `@media (prefers-reduced-motion: reduce) { .gain { animation: none; } * { scroll-behavior: auto; } }`
- [ ] **Step 5: Run** — PASS; `npm test` green.
- [ ] **Step 6: Commit** `git add web/src/ui/gameNav.ts web/src/style.css web/tests/ui/gameNav.test.ts && git commit -m "feat(ui): labelled main navigation"`

---

### Task 4: Settings menu and ledger as modal

**Files:**
- Create: `web/src/ui/accountMenu.ts`
- Modify: `web/src/ui/ledgerView.ts`
- Test: `web/tests/ui/accountMenu.test.ts` (happy-dom); keep `tests/ui/ledger.test.ts` green

**Interfaces:**
- Consumes: `openModal` (Task 2); `QualityChoice` from `render/quality.ts`.
- Produces:
  ```ts
  export function openAccountMenu(opts: {
    opener: HTMLElement; nickname: string; coins: number;
    quality: QualityChoice; onQuality: (q: QualityChoice) => void;
    onLedger: () => void; onLogout: () => void;
  }): ModalHandle;
  // ledgerView.ts — signature changes to:
  export function openLedger(supabase: SupabaseClient, opener?: HTMLElement | null): ModalHandle;
  ```

- [ ] **Step 1: Write the failing tests:** modal title `Einstellungen`; shows nickname and coins; group `Grafik-Qualität` with three buttons and `aria-pressed="true"` on the current choice; clicking `Hoch` calls `onQuality('high')` and updates `aria-pressed`; `Kontoauszug` closes the menu then calls `onLedger`; `Abmelden` calls `onLogout`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `accountMenu.ts`; change `openLedger` to build its content inside `openModal({ title: 'Kontoauszug', opener, wide: true })` (keep `formatWhen` and `REASON_LABEL` exports unchanged).
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** `git add web/src/ui/accountMenu.ts web/src/ui/ledgerView.ts web/tests/ui/accountMenu.test.ts && git commit -m "feat(ui): settings menu with ledger, quality and logout"`

---

### Task 5: Item preview renderer

**Files:**
- Create: `web/src/render/itemPreview.ts`
- Test: `web/tests/render/itemPreview.test.ts` (node)

**Interfaces:**
- Consumes: `plotAsset`, `tintFor` from `render/plotAssets.ts`; `MAX_SIZE`, `SlotKind` from `world/plotPlan.ts`; `setupScene` lighting only if it works without the sky panorama, otherwise one `HemisphereLight` + one `DirectionalLight` using LOOK colours.
- Produces:
  ```ts
  export function previewFrame(kind: SlotKind): { distance: number; height: number; targetY: number };
  export interface ItemPreview { show(kind: SlotKind, itemId: string): void; dispose(): void; }
  /** null when WebGL is unavailable. onError fires on webglcontextlost. */
  export function createItemPreview(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; onError: () => void }): ItemPreview | null;
  export type PreviewFactory = typeof createItemPreview;
  ```

- [ ] **Step 1: Write the failing test:** `previewFrame('house').distance > previewFrame('deco').distance`; for every kind the model (`MAX_SIZE[kind]`) fits a 35° vertical FOV: `distance >= max(w,d,h) / (2*tan(17.5°))`; `targetY === MAX_SIZE[kind].h / 2`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** One `WebGLRenderer({ canvas, antialias: true, alpha: true })` per preview, pixel ratio ≤ 2, `SRGBColorSpace`, ACES tone mapping like `villageView.ts`. Turntable 0.4 rad/s via `requestAnimationFrame`; with `reducedMotion` render one still frame at yaw 0.6 rad. Stop the loop when `canvas.isConnected` is false. `dispose()` disposes geometries, materials and renderer (`forceContextLoss()`). Wrap the renderer constructor in `try/catch` → `null`.
- [ ] **Step 4: Run** — PASS; `npm run build` green.
- [ ] **Step 5: Commit** `git add web/src/render/itemPreview.ts web/tests/render/itemPreview.test.ts && git commit -m "feat(render): item preview renderer"`

---

### Task 6: Item cards and detail dialog

**Files:**
- Create: `web/src/ui/itemDetail.ts`
- Test: `web/tests/ui/itemDetail.test.ts` (happy-dom)

**Interfaces:**
- Consumes: `ItemEntry`, `ItemApi`, `purchaseState`, `KIND_LABEL` (Task 1); `openModal` (Task 2); `PreviewFactory`, `createItemPreview` (Task 5); `slotById` from `world/plotPlan.ts`.
- Produces:
  ```ts
  export type ItemOrigin = 'shop' | 'inventar';
  export function itemCard(e: ItemEntry, origin: ItemOrigin, ctx: { coins: number; shopOpen: boolean }): HTMLButtonElement;
  export interface DetailOptions {
    entry: ItemEntry; origin: ItemOrigin; opener: HTMLElement;
    api: ItemApi; getCoins: () => number; shopOpen: boolean; buildOpen: boolean;
    onCoins: (coins: number) => void;
    onBuild: (itemId: string) => void;          // „Aufstellen“ / „Jetzt aufstellen“
    onShowSlot: (slotId: SlotId) => void;       // „Zum Platz: <Platzname>“
    onOpenInventory: () => void;                // „Zum Inventar“
    onChanged: () => void;                      // reload the area list after a purchase
    createPreview?: PreviewFactory;             // tests pass () => null
    reducedMotion?: boolean;
  }
  export function openItemDetail(opts: DetailOptions): ModalHandle;
  ```

- [ ] **Step 1: Write the failing tests** (fake `ItemApi`, `createPreview: () => null` unless stated):
  - `itemCard` shop: shows name, `KIND_LABEL`, `120 Münzen`, and the blocked reason as text when `canBuy` is false; inventory: shows `Besitz: 2 · aufgestellt: 1`.
  - detail for a deco with a preview factory returning a stub → a `canvas` with `aria-label` `Vorschau: <Name>`; with factory returning `null` → text `Die Vorschau konnte nicht geladen werden.` and a `Nochmal versuchen` button that calls the factory again; the buy button is still enabled.
  - avatar item → no canvas, text `Vorschau gibt es mit dem Avatar-Editor.`, no `Aufstellen` button.
  - shop flow: `Kaufen für 120 Münzen` → confirm text `Für 120 Münzen „Katzenschild“ kaufen?` with `Abbrechen` / `Ja, kaufen`; two quick clicks on `Ja, kaufen` → `api.buy` called once (Review Focus 1).
  - while `api.buy` is pending, `Escape` does not close the modal (Review Focus 3); after it resolves `{ok:true, value:{coins:30,qty:1}}` → `onCoins(30)`, `onChanged()`, status `„Katzenschild“ gekauft. Du hast jetzt 30 Münzen.`, buttons `Zum Inventar` and (deco, `buildOpen`) `Jetzt aufstellen`.
  - buy failure `{ok:false, message:'Dafür reichen die Münzen nicht.'}` → message shown in `role="status"`, `onCoins` not called, `Ja, kaufen` available again.
  - inventory: `free > 0` and buildable → `Aufstellen` calls `onBuild(id)` and closes; `placedIn ['deco_3']` → `Zum Platz: Deko-Platz 3` calls `onShowSlot('deco_3')`; `buildOpen false` → `Aufstellen` disabled with text `Das Bauen ist gerade geschlossen.`
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `itemDetail.ts`. Use `openModal({ title: entry.nameDe, canClose: () => !busy })`. Preview `dispose()` on modal close. Escape all text with the existing `esc` pattern (move `esc` into `ui/esc.ts` and import it from shop, task board and here).
- [ ] **Step 4: Run** — PASS; `npm test` green.
- [ ] **Step 5: Commit** `git add web/src/ui/itemDetail.ts web/src/ui/esc.ts web/src/ui/taskBoardView.ts web/tests/ui/itemDetail.test.ts && git commit -m "feat(ui): shared item cards and detail dialog"`

---

### Task 7: Shop and inventory areas

**Files:**
- Rewrite: `web/src/ui/shopView.ts`
- Create: `web/src/ui/inventoryView.ts`
- Modify: `web/src/ui/taskBoardView.ts` (return `AreaHandle`)
- Test: `web/tests/ui/itemAreas.test.ts` (happy-dom)

**Interfaces:**
- Consumes: Tasks 1, 6.
- Produces:
  ```ts
  // ui/areas.ts holds the shared type (created here, extended in Task 10)
  export interface AreaHandle { close(): void; }
  // shopView.ts
  export interface ItemAreaOptions {
    api: ItemApi; getCoins: () => number; onCoins: (c: number) => void;
    shopOpen: boolean; buildOpen: boolean;
    category: ItemKind | null; onCategory: (k: ItemKind) => void;
    onBuild: (itemId: string) => void; onShowSlot: (slot: SlotId) => void;
    onOpenInventory: () => void;
    createPreview?: PreviewFactory;
  }
  export function openShop(opts: ItemAreaOptions): AreaHandle;
  export function openInventory(opts: Omit<ItemAreaOptions, 'onOpenInventory'>): AreaHandle; // inventoryView.ts
  export function openTaskBoard(opts: TaskBoardOptions): AreaHandle;                      // was Promise<void>
  ```

- [ ] **Step 1: Write the failing tests:**
  - shop renders `section.overlay.area` with `role="region"` and `aria-labelledby` → `h2` `Shop`; it is **not** modal (no `inert` on siblings).
  - category bar: one button per `KIND_ORDER` kind with `aria-pressed`; starts on `opts.category ?? 'house'`; clicking `Garten-Deko` shows only deco cards and calls `onCategory('deco')`.
  - shop hides starter items; empty category → `In dieser Kategorie gibt es gerade nichts.`
  - shop closed → banner `Der Shop ist gerade geschlossen.` and cards show the reason.
  - `loadBook` failure → error text + `Nochmal versuchen` (reloads) + `Schließen`.
  - Review Focus 4: after a purchase in the detail (fake api returns coins 30), the list is reloaded and an item costing 50 shows `Dafür reichen die Münzen nicht.`
  - inventory lists only `owned > 0` (starters included), grouped by kind, category bar only for kinds the pupil owns; nothing owned → `Du hast noch keine eigenen Sachen. Im Shop kannst du welche kaufen.`
  - `close()` removes the element and disposes an open detail.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Cards in a CSS grid `repeat(auto-fill, minmax(160px, 1fr))`; the area scrolls inside itself (`overflow:auto`), never the page. Card click → `openItemDetail` with the card as `opener`. `openTaskBoard`: keep its content code; make the overlay a non-modal area (`role="region"`, `aria-labelledby`) and return `{ close }`; its own `Schließen` button stays and calls `onClose`.
- [ ] **Step 4: Run** — PASS; `npm test` green.
- [ ] **Step 5: Commit** `git add web/src/ui/shopView.ts web/src/ui/inventoryView.ts web/src/ui/taskBoardView.ts web/src/ui/areas.ts web/src/style.css web/tests/ui/itemAreas.test.ts && git commit -m "feat(ui): shop and inventory areas with categories"`

---

### Task 8: Build mode with preview, slot list and hand-over

**Files:**
- Create: `web/src/render/buildPreview.ts`
- Modify: `web/src/render/buildMode.ts`
- Test: `web/tests/render/buildPreview.test.ts` (node), `web/tests/ui/buildBar.test.ts` (happy-dom)

**Interfaces:**
- Consumes: `SlotMap`, `SlotContent`, `placeInSlot`, `clearSlot`, `loadBuildState` (`api/build.ts`); `SLOTS`, `ROTATIONS`, `slotAccepts`.
- Produces:
  ```ts
  // buildPreview.ts (pure)
  export interface Pending { itemId: string; rot: number; }
  export function previewSlots(saved: SlotMap, slot: SlotId, pending: Pending | null): SlotMap;
  export function nextRotation(kind: SlotKind, rot: number): number;      // cycles ROTATIONS[kind]
  export function fittingSlots(itemKind: string): SlotId[];
  /** The slot to pre-select for a hand-over: the only fitting slot, else the first fitting free deco slot, else null. */
  export function autoSlot(itemKind: string, saved: SlotMap): SlotId | null;
  // buildMode.ts
  export interface EnterOptions { itemId?: string; slotId?: SlotId; }
  async enter(opts?: EnterOptions): Promise<string | null>;
  ```
  `BuildModeOptions.onSlots` keeps its signature; it now also receives preview maps.

- [ ] **Step 1: Write the failing pure tests:** `previewSlots(saved,'deco_2',{itemId:'deco_cat_sign',rot:1})` returns a new object with that entry and leaves `saved` untouched; `pending null` → equals `saved`; `nextRotation('deco',3) === 0`, `nextRotation('house',0) === 0`; `fittingSlots('car')` → `['car']`; `autoSlot('deco', {deco_1:…})` → `'deco_2'`; `autoSlot('avatar', {})` → `null`.
- [ ] **Step 2: Write the failing bar tests** (happy-dom; construct `BuildMode` with a stub scene `new THREE.Scene()`, a plot object, a fake supabase whose `rpc` and `from` are spies, and an `onSlots` spy):
  - after `enter()` without options the bar lists seven slot buttons (`Haus`, `Garage`, `Auto-Platz`, `Deko-Platz 1`…`4`) with current content; clicking `Deko-Platz 2` selects it (2D path, no 3D tap).
  - choosing an item → `onSlots` called with the preview map, text `Vorschau – noch nicht gespeichert`, no `rpc` call.
  - `Drehen` on a deco → `onSlots` with `rot 1`, still no `rpc` call.
  - `Speichern` twice quickly → exactly one `rpc('place_in_slot', {p_item_id, p_slot:'deco_2', p_rot:1})` (Review Focus 1).
  - `Abbrechen` → last `onSlots` call equals the saved map; no `rpc`.
  - `exit()` with a pending preview → last `onSlots` call equals the saved map (Review Focus 2).
  - `rpc` error → saved map unchanged, message from `explain`, pending kept so `Speichern` can be retried.
  - `enter({ itemId: 'deco_cat_sign' })` → `deco_2` preselected (with `deco_1` occupied), the item chosen and previewed.
- [ ] **Step 3: Run** both — FAIL.
- [ ] **Step 4: Implement** `buildPreview.ts`, then change `buildMode.ts`: replace `chosen` with `pending: Pending | null`; `renderBar` without slot → slot list; with slot → item buttons + `Speichern` (disabled without pending), `Drehen` (only if `ROTATIONS[kind].length > 1` and something is shown), `Abbrechen` (only with pending), `Wegräumen` (as before, immediate), `Fertig`. Selecting the currently placed item to turn it creates `pending = {itemId: current, rot: current.rot}`. On `enter({itemId})` plates of non-fitting slots get opacity `0.1`. `Speichern` sets `busy` and disables the button until the RPC returns. Every path that drops `pending` calls `onSlots(state.slots)`.
- [ ] **Step 5: Run** — PASS; `npm test` green.
- [ ] **Step 6: Commit** `git add web/src/render/buildPreview.ts web/src/render/buildMode.ts web/tests/render/buildPreview.test.ts web/tests/ui/buildBar.test.ts && git commit -m "feat(build): preview before saving, slot list, hand-over from shop"`

---

### Task 8b: Item thumbnails on every card (added 21.10.2026 on request of the teacher)

Every shop and inventory card shows a small picture of the item (avatar items: a placeholder). Pictures are rendered once with ONE shared offscreen renderer and cached, never one WebGL context per card.

**Files:**
- Create: `web/src/render/itemThumbs.ts`
- Modify: `web/src/render/itemPreview.ts` (share scene/light/camera setup, no duplicated light values), `web/src/ui/itemDetail.ts` (`itemCard`), `web/src/ui/shopView.ts`, `web/src/ui/inventoryView.ts`, `web/src/style.css`
- Test: `web/tests/render/itemThumbs.test.ts` (node), extend `web/tests/ui/itemDetail.test.ts` and `web/tests/ui/itemAreas.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // itemThumbs.ts
  /** Data URL (PNG) of the item, or null for items without a model (avatar) or on failure. */
  export type ThumbSource = (e: ItemEntry) => Promise<string | null>;
  /** Caches by item id across calls and area openings; renders strictly one at a time. */
  export function createThumbSource(render: (kind: SlotKind, itemId: string) => Promise<string> | string): ThumbSource;
  /** Real renderer: one lazily created offscreen WebGLRenderer (256×192 px, alpha), still frame at yaw 0.6 like the reduced-motion preview, framed with previewFrame; null when WebGL is unavailable. */
  export function createWebGLThumbRender(): { render: (kind: SlotKind, itemId: string) => string; dispose(): void } | null;
  export const THUMB_PLACEHOLDER: Record<ItemKind, string>; // emoji per kind, e.g. avatar '👕'
  // itemDetail.ts
  export function itemCard(e: ItemEntry, origin: ItemOrigin, ctx: { coins: number; shopOpen: boolean }, thumbs?: ThumbSource): HTMLButtonElement;
  // ItemAreaOptions gets `thumbs?: ThumbSource` (default: real WebGL source, created when the area opens; its renderer disposed on area close; the data-URL cache stays for the session)
  ```

- [ ] **Step 1: Write failing tests** (`itemThumbs.test.ts`, fake render function): same item twice → render called once, both promises resolve to the same URL; two different items requested together → renders run one after another (second starts after first resolves); avatar entry → `null`, render not called; render throws → `null` and the next request for that item tries again (failures are not cached).
- [ ] **Step 2: Card tests** (happy-dom): card shows `<span class="item-thumb" aria-hidden="true">` with the kind placeholder immediately; after the ThumbSource resolves an `<img alt="">` with that src replaces it; source resolving `null` keeps the placeholder; without `thumbs` the card still renders (placeholder). Area test: opening the shop with a fake `thumbs` requests a thumbnail for every visible card of the current category only.
- [ ] **Step 3: Run** — FAIL.
- [ ] **Step 4: Implement.** Extract the light/camera setup of `itemPreview.ts` into one exported helper used by both preview and thumbnails. Thumbnail render: build model with `plotAsset(kind, id, tintFor(0))`, render, `toDataURL('image/png')`, dispose only the model's geometries (never the shared plotAssets materials). Card layout: thumbnail on top (aspect 4/3, max-height 96px, `object-fit: contain`), then name, category, price/status text. When a card is redrawn (purchase reload) it reuses the cached URL without flicker.
- [ ] **Step 5: Run** focused tests, `npm test`, `npm run build`, eslint — green.
- [ ] **Step 6: Commit** `git commit -m "feat(ui): item thumbnails on shop and inventory cards"` (only the files above).

---

### Task 9: House menu and house camera

**Files:**
- Create: `web/src/render/houseCamera.ts`, `web/src/ui/houseMenu.ts`
- Test: `web/tests/render/houseCamera.test.ts` (node), `web/tests/ui/houseMenu.test.ts` (happy-dom)

**Interfaces:**
- Consumes: `Plot` from `world/layout.ts`; `AreaHandle` (Task 7).
- Produces:
  ```ts
  // houseCamera.ts
  export interface CameraPose { position: THREE.Vector3; target: THREE.Vector3; }
  /** Fixed view of the own house: target = plot centre at house height, camera in front of the house (+Z of the plot, rotated by plot.face), 30° above, distance 26. */
  export function houseView(plot: Plot): CameraPose;
  /** Pose at t ∈ [0,1] with smoothstep easing; t ≥ 1 returns `to`. */
  export function lerpPose(from: CameraPose, to: CameraPose, t: number): CameraPose;
  /** True when the world point lies on the given plot (same rotated-rectangle test as freePlotAt in villageView.ts). */
  export function onPlot(plot: Plot, p: THREE.Vector3): boolean;
  export const FLIGHT_SECONDS = 0.8;
  // houseMenu.ts
  export function openHouseMenu(opts: {
    onBuild: () => void; onShop: () => void; onInventory: () => void;
    onSettings: (button: HTMLButtonElement) => void; onBack: () => void;
  }): AreaHandle;
  ```

- [ ] **Step 1: Write the failing camera tests:** `houseView` target equals `(plot.x, plot.h + 2, plot.z)`; distance from target to position is 26 (±0.01); for `face = 0` the camera z is greater than the plot z (it looks at the front); for `face = π/2` the offset is rotated accordingly. `lerpPose(a,b,0)` = a, `lerpPose(a,b,1)` = b, `t = 0.5` lies strictly between. `onPlot` true for the centre, false 1 m outside the half width, correct for a rotated plot (move `freePlotAt`'s maths here and let `freePlotAt` call `onPlot`).
- [ ] **Step 2: Write the failing menu tests:** non-modal region with `h2` `Mein Haus`; five buttons in the order `Bauen`, `Shop`, `Inventar`, `Einstellungen`, `Zurück`; each calls its callback; focus lands on `Bauen` when opened; `Escape` calls `onBack`.
- [ ] **Step 3: Run** both — FAIL.
- [ ] **Step 4: Implement** both files. CSS: `.house-menu` is a compact panel (not full screen) at the right edge in landscape and above the nav in portrait, so the house stays visible; buttons ≥ 56 px high.
- [ ] **Step 5: Run** — PASS; `npm test` green.
- [ ] **Step 6: Commit** `git add web/src/render/houseCamera.ts web/src/ui/houseMenu.ts web/src/ui/villageView.ts web/src/style.css web/tests/render/houseCamera.test.ts web/tests/ui/houseMenu.test.ts && git commit -m "feat(ui): house menu and fixed house camera"`

---

### Task 10: Area controller and village wiring

**Files:**
- Modify: `web/src/ui/areas.ts`, `web/src/ui/villageView.ts`, `web/src/style.css`
- Test: `web/tests/ui/areas.test.ts` (happy-dom)

**Interfaces:**
- Consumes: everything above.
- Produces:
  ```ts
  export interface AreaController {
    readonly current: NavArea;
    select(area: NavArea): Promise<void>;
    /** Re-open an area with arguments, e.g. bauen with an item. */
    open(area: NavArea, open: () => Promise<AreaHandle | null>): Promise<void>;
  }
  export function createAreaController(opts: {
    openers: Record<Exclude<NavArea, 'dorf'>, () => Promise<AreaHandle | null>>;
    onChange: (area: NavArea, previous: NavArea) => void; // nav.setActive, camera lock, village pause
  }): AreaController;
  /** Areas in which the camera stays on the own house. */
  export const HOUSE_AREAS: ReadonlySet<NavArea>; // haus, bauen, shop, inventar
  ```

- [ ] **Step 1: Write the failing tests:** starts on `dorf`; `select('haus')` opens the house menu; `select('shop')` from `haus` closes the menu handle and opens the shop, `onChange('shop','haus')`; `select('shop')` while on shop does nothing; an opener resolving `null` (no plot, building closed) keeps the previous area; `select('dorf')` closes the current handle; `HOUSE_AREAS` has exactly the four areas.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `createAreaController`.
- [ ] **Step 4: Wire `villageView.ts`:**
  - Remove `.village-hud` markup; mount `createGameNav`; `.dorf-actions` with the single button `Marktplatz`, visible only on `dorf`.
  - `coinsNow` stays the single source: `onCoins` updates it and calls `nav.setCoins`; item areas get `getCoins: () => coinsNow` (Review Focus 4).
  - Openers: `aufgaben` → `openTaskBoard`; `haus` → without own plot `showNotice('Du hast noch kein Grundstück.')` and `null`, else `openHouseMenu`; `shop` / `inventar` → Task 7 with `supabaseItemApi(supabase, profile.id)` and the remembered category per area; `bauen` → `null` with notice when building is closed, else `await buildMode.enter(opts)` and handle `{ close: () => buildMode.exit() }`.
  - Back paths: shop/inventory `onClose`, build `onDone` → `areas.select('haus')`; house menu `onBack` → `areas.select('dorf')`; `onSettings` → `openAccountMenu`; `onBuild(itemId)` → `areas.open('bauen', () => enterBuild({ itemId }))`; `onShowSlot(slot)` → same with `{ slotId }`; `onOpenInventory` → `areas.select('inventar')`.
  - Camera (`onChange`): entering a `HOUSE_AREAS` area from outside → fly from the current pose to `houseView(home)` over `FLIGHT_SECONDS` in the animation loop (instant when `matchMedia('(prefers-reduced-motion: reduce)')` matches); in `haus`, `shop`, `inventar`: `controls.enabled = false`; in `bauen`: `controls.enabled = true`, `controls.enablePan = false`, target stays on the house. Leaving `HOUSE_AREAS` → `controls.enabled = true`, `enablePan = true` (camera stays where it is). Remove the old `toHouse` button and `jumpTo(homeTarget)` calls of build mode.
  - 3D tap: existing tap rule (< 8 px movement) first; then, if not in build mode and `home && onPlot(home, hit.point)` → `areas.select('haus')`. Tap on the task board → `areas.select('aufgaben')`.
  - Status button → `openAccountMenu` as well (logout reachable without plot).
  - Pause: `paused = area === 'shop' || area === 'inventar' || area === 'aufgaben'`; the animation loop skips `gl.render` and the Auto measurement while paused (keeps `last = now`); the camera flight is finished before pausing.
  - `stop()` closes the current area (build preview reverts via `exit`) and removes the nav.
  - Tests for Review Focus 2b: in `areas.test.ts`, a spy `onChange` sequence `haus → aufgaben` and `haus → dorf` each reports leaving `HOUSE_AREAS`; the unlock itself is checked on the device screenshots and in T.12.
- [ ] **Step 5: Run** `npm test`, `npm run build` — green.
- [ ] **Step 6: Commit** `git add web/src/ui/areas.ts web/src/ui/villageView.ts web/src/style.css web/tests/ui/areas.test.ts && git commit -m "feat(ui): wire navigation, house menu and areas into the village"`

---

### Task 11: UI preview page, tablet screenshots and docs

**Files:**
- Create: `web/dev/ui.html`, `web/dev/ui.ts`, `web/scripts/ui-shots.ts`
- Modify: `web/package.json` (script `"ui-shots": "node scripts/ui-shots.ts"`), `docs/PLAN.md`, spec status line

**Interfaces:**
- Consumes: `createGameNav`, `createAreaController`, `openShop`, `openInventory`, `openAccountMenu`, a fake `ItemApi`.

- [ ] **Step 1: `dev/ui.ts`** mounts nav, house menu and areas over a plain background (`#3f6b4a`), no village, no Supabase. Fake `ItemApi` with: starter house and garage, `house_stein` 300, `car_kleinwagen` 150, `deco_cat_sign` (owned 2, placed in `deco_3`), one deco with a long name `Großer Blumenkübel mit Sonnenblumen und Gießkanne`, one avatar item. Coins 130. URL `?area=dorf|haus|shop|inventar&detail=<itemId>&menu=1` opens that state; sets `window.uiReady = true`.
- [ ] **Step 2: `scripts/ui-shots.ts`** (same server pattern as `scripts/galerie.ts`, port 5175) shoots portrait 820×1180 and landscape 1180×820 for `dorf`, `haus`, `shop`, `shop` + detail `deco_cat_sign`, `inventar`, `menu=1`, plus `shop` with `reducedMotion: 'reduce'`; saves to `docs/img/ui/<YYYY-MM-DD>/<state>_<orientation>.png`. It exits with code 1 if any of these fail (Review Focus 5): page errors; `document.documentElement.scrollWidth > clientWidth`; any `.game-nav button` bounding box smaller than 44×44 or outside the viewport.
- [ ] **Step 3: Run** `npm run ui-shots` — exit 0; open every picture and check: nav labelled and fully visible, no overlap of area and nav, long name wraps, texts readable.
- [ ] **Step 4: Full check** `npm test && npm run build && npx eslint src tests` — green. `npm run galerie` is not required (no change in `world/` or village rendering); if `render/village.ts` was touched after all, run it and compare.
- [ ] **Step 5: Docs.** Add to `docs/PLAN.md` after Stufe 4 a block `## Zwischenpaket T – Tablet-UI und Navigation` with rows T.1–T.11 (one per task, all `[x]`) and `[ ] T.12 | LK | **Abnahme Tablet-UI** auf dem Schul-Tablet: Navigation, Tipp aufs Haus und Haus-Menü, Kamera fest und wieder frei, Shop-Vorschau, Bauen mit Vorschau, Hoch- und Querformat`. Set the spec status line to `Umgesetzt laut Plan 2026-10-21; Abnahme durch die Lehrkraft (T.12) steht aus.`
- [ ] **Step 6: Commit** `git add web/dev/ui.html web/dev/ui.ts web/scripts/ui-shots.ts web/package.json docs/img/ui docs/PLAN.md docs/superpowers/specs/2026-10-21-tablet-ui-navigation-design.md && git commit -m "feat(ui): tablet screenshot page, PLAN entry"`
- [ ] **Step 7: Report to the teacher in German:** what changed for pupils (one short list), that „Drehen“ now needs „Speichern“, where the screenshots are, and the tablet checklist for T.12.

---

## Self-review

- Spec §3/§10.5 nav (3 buttons) + house menu + camera + status + settings → Tasks 3, 4, 9, 10. §4 shared item view, shop, inventory, build flows, hand-over → Tasks 1, 6, 7, 8, 10. §5 touch/keyboard/screen reader/2D slot list/reduced motion → Tasks 2, 3, 5, 8, 9, 11. §6 RPC-only writes, local preview → Tasks 6, 8. §7 error and empty states → Tasks 6, 7, 8. §8 acceptance 1 (now: three nav buttons + house menu, shop/inventory in two taps per §10.5), 2–10 → Tasks 3/9/10 (1, 2), 7 (3), 6/10 (4), 8 (5, 6), 6/8 (7), 2/3/6/8/9 (8), 8/9 (9: nav button „Mein Haus“ is the non-3D path to the house), 3/11 (10). §10 decisions 1–10 each mapped (10 = explicitly out of scope).
- Names consistent: `ItemEntry`, `ItemApi`, `AreaHandle`, `NavArea`, `NavButton`, `CameraPose`, `HOUSE_AREAS`, `PreviewFactory`, `Pending`, `EnterOptions` are defined once and reused.
