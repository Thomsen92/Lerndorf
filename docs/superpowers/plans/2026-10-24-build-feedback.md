# Bau-Feedback Implementation Plan

## Ausführungsstand 25.10.2026

- [x] Tasks 1–7 umgesetzt; 744 Tests, Produktions-Build und ESLint grün.
- [x] Galerie: 36 Bilder unter `web/test-results/build-gallery/`, visuell gegen Soll und die Galerie vom 23.10. geprüft. Welt-Draw-Calls in allen 36 Ansichten unverändert (58–79; das bestehende Leistungsbudget ist damit noch nicht überall erreicht).
- [x] Task 8: beide Tablet-Browserprüfungen (1180 × 820 und 820 × 1180) grün; alle 14 Screenshots geprüft. Aufstellen, Wegräumen, reduzierte Bewegung, Verlassen während der Animation und RPC-Fehler abgedeckt. Bilder: `web/test-results/build-feedback/`.
- [ ] B.9: Abnahme durch die Lehrkraft auf dem Schul-Tablet.

Ausführungsdetails: Das Tutorial war bereits in `main` enthalten; `feature/build-feedback` wurde davon abgezweigt. Die externen Kenney-Quellen liegen unter `C:\Users\thoms\OneDrive\Desktop\Kenny`. Das im ursprünglichen Plan genannte Superpowers-Werkzeug war hier nicht verfügbar; umgesetzt und geprüft wurde direkt mit den Projektwerkzeugen. Die Prüfungen wurden zusammengefasst statt als einzelne Red/Green-Commits ausgeführt. `npm run galerie` erhielt einen optionalen Ausgabeordner, damit `Konzept/` unverändert bleibt. Die Hochformat-Kamera verwendet den LOOK-Wert 52°; beim Menüversatz wird zusätzlich die Navigation berücksichtigt.

Die folgenden Schrittlisten dokumentieren den ursprünglichen Ablauf; der tatsächliche Abschlussstand steht oben und in `docs/PLAN.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make building on the tablet easy and satisfying: clearly marked slots with a forgiving tap area, a big slot sheet with picture cards, and a pop/smoke/sound effect (Kenney CC0 assets) when an item is set or taken away, shown only to the pupil who builds.

**Architecture:** `BuildMode` (render/buildMode.ts) keeps all build logic and the server calls. It gets three additions: outline frames and icons for the slots, a big non-modal sheet, and `onFx` events that fire only after a successful RPC. The village turns those events into effects: `render/buildFx.ts` animates the slot object and one instanced smoke mesh, and `ui/sound.ts` plays the Kenney sounds through Web Audio. Nothing new reaches the server.

**Tech Stack:** TypeScript strict, Vite 5, three.js 0.170.0 (pinned), Vitest 2 + happy-dom, Playwright, ffmpeg (one-time asset conversion). RPCs `place_in_slot`, `clear_slot`, `tutorial_place_house` stay unchanged.

**Spec:** `docs/superpowers/specs/2026-10-21-build-feedback-design.md`. Read §6 „Präzisierungen“ first; it overrides §1–§5. Background: `docs/superpowers/specs/2026-10-21-tablet-ui-navigation-design.md` §10 (areas, dialogs, build preview).

## Global Constraints

- Read `CLAUDE.md` first. Do not touch `Konzept/`, `Prototyp/`, `Kenny/` (read only), `../Referenz`, the repo `Thomsen92/English-Club-8`.
- Branch: `feature/build-feedback` from `feature/first-login-tutorial`, because the guided placement of the tutorial lives in `buildMode.ts`. Rebase onto `main` once the tutorial is merged. `git add` only the files a task names.
- No migration, no RPC change, no new table, no Realtime event. Effects, sounds and highlights exist only on the building pupil's device.
- three.js stays `0.170.0`. No new runtime dependency. Assets only from `Kenny/Effects` (CC0), each listed in `blender/sources/LICENSES.md`.
- Performance: ≤ 8 smoke particles in one `InstancedMesh` (one draw call), one smoke texture of 128 × 128 px, no new texture per effect, never dispose shared `plotAssets` geometries or materials.
- UI text German, plain language; code and comments English. Touch targets ≥ 44 px (cards ≥ 64 px, thumbnails ≥ 96 px wide); keyboard reachable; state never shown by colour alone.
- Exact strings (verbatim):
  - Sheet buttons `Aufstellen`, `Drehen`, `Wegräumen`, `Zurück`; empty state `Du hast dafür noch nichts.` + button `Zum Shop`.
  - Sheet header: slot `nameDe` as `h2`, below `Jetzt: „<Name>“` or `Noch leer`.
  - Card status: `steht hier`, `frei: <n>`, `alle aufgestellt` (disabled card).
  - Success messages: `Aufgestellt!`, `Gedreht.`, `Weggeräumt. Es ist wieder im Inventar.` (unchanged). Preview hint stays `Vorschau – noch nicht gespeichert`.
  - Settings toggle: button `Töne: an` / `Töne: aus` with `aria-pressed`.
- Fixed values: pop 0.6 s with peak scale 1.15; smoke 0.5 s; shrink 0.4 s with 0.6 rad turn; pulse period 1.5 s; tap margin 0.5 m; sound gain 0.35; „Ding“ 0.12 s after „Plopp“; localStorage key `lerndorf.sound` (default on).
- Done means: in `web/`, `npm test`, `npm run build` and `npx eslint src tests` are green; UI tasks also have Playwright screenshots (Task 8).

## Review Focus

1. **Leaving „Bauen“ while an effect runs** („Fertig“, „Dorf“, logout or auto-logout during the 0.4 s shrink or the 0.6 s pop) → no half-scaled or floating object stays in the scene, the smoke is hidden, the plot shows the server state. (Tests in Task 4 `clear()` and Task 7.)
2. **Server error on „Aufstellen“ or „Wegräumen“** → no `onFx` event, no sound, no smoke; the preview stays so the pupil can retry. (Test in Task 6.)
3. **Sound not available** (no `AudioContext`, file 404, decode error, iPad not yet unlocked, localStorage blocked) → silent, nothing thrown, building works. (Tests in Task 2.)
4. **Tap on the border between two slots** (`deco_2` and `car` touch at x = 8; the path lies between `deco_1` and `deco_2`) → an exact hit always wins; within 0.5 m the nearest slot; further away nothing. (Tests in Task 3.)
5. **Landscape tablet with the sheet open** (40 % of the width on the right) → the own plot stays visible in the free part and a 3D tap still hits the right slot. (Test of the pure offset in Task 7, screenshots in Task 8.)

---

## File Map

- Create `web/public/assets/kenney/fx/` (`place.mp3`, `ding.mp3`, `remove.mp3`, `puff.png`); modify `blender/sources/LICENSES.md`.
- Create `web/src/ui/sound.ts`; modify `web/src/ui/accountMenu.ts`.
- Modify `web/src/world/plotPlan.ts` (`slotNear`).
- Create `web/src/render/buildFx.ts`.
- Modify `web/src/render/buildMode.ts` (highlights, sheet, fx events), `web/src/render/itemThumbs.ts` (wider param type), `web/src/style.css`.
- Modify `web/src/render/village.ts` (`ownSlotObject`), `web/src/render/houseCamera.ts` (`sheetViewOffset`), `web/src/ui/villageView.ts` (wiring).
- Create `web/dev/build.html`, `web/dev/build.ts`, `web/e2e/build-feedback.spec.ts`; modify `web/playwright.config.ts` (testIgnore / project like tutorial).
- Tests: `web/tests/content/fxAssets.test.ts`, `web/tests/ui/sound.test.ts`, extend `web/tests/ui/accountMenu.test.ts`, `web/tests/world/slotNear.test.ts`, `web/tests/render/buildFx.test.ts`, `web/tests/render/slotHighlight.test.ts`, extend `web/tests/ui/buildBar.test.ts`, extend `web/tests/render/houseCamera.test.ts`.
- Docs: `docs/PLAN.md` (Zwischenpaket B), spec status line.

---

### Task 1: Kenney effect assets

**Files:**
- Create: `web/public/assets/kenney/fx/place.mp3`, `ding.mp3`, `remove.mp3`, `puff.png`
- Modify: `blender/sources/LICENSES.md`
- Test: `web/tests/content/fxAssets.test.ts`

**Interfaces:**
- Produces: the four files above (paths relative to `import.meta.env.BASE_URL`: `assets/kenney/fx/<name>`).

- [ ] **Step 1: Write the failing test** `fxAssets.test.ts` (node): each of the four files exists; each `.mp3` is < 40 KB and starts with an MP3 frame or `ID3`; `puff.png` is a PNG of exactly 128 × 128 px with an alpha channel (read the IHDR: colour type 6) and < 30 KB.
- [ ] **Step 2: Run** `npx vitest run tests/content/fxAssets.test.ts` — FAIL (files missing).
- [ ] **Step 3: Convert** (from the repo root):
  ```bash
  FX=web/public/assets/kenney/fx; mkdir -p $FX
  ffmpeg -y -i Kenny/Effects/kenney_interface-sounds/Audio/drop_002.ogg -ac 1 -b:a 64k $FX/place.mp3
  ffmpeg -y -i Kenny/Effects/kenney_interface-sounds/Audio/confirmation_001.ogg -ac 1 -b:a 64k $FX/ding.mp3
  ffmpeg -y -i Kenny/Effects/kenney_impact-sounds/Audio/impactSoft_heavy_000.ogg -ac 1 -b:a 64k $FX/remove.mp3
  ffmpeg -y -i "Kenny/Effects/kenney_smoke-particles/PNG/White puff/whitePuff08.png" \
    -vf "scale=128:128:force_original_aspect_ratio=decrease,pad=128:128:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba" $FX/puff.png
  ```
  Open `puff.png` and check that it is a soft white puff on transparency (not a black box).
- [ ] **Step 4: Licences** — add two rows to `blender/sources/LICENSES.md` in the existing table style: *Interface Sounds 1.0 / Impact Sounds 1.0* (Kenney, CC0 1.0, https://kenney.nl/assets/interface-sounds, https://kenney.nl/assets/impact-sounds) → `web/public/assets/kenney/fx/place.mp3` (= `drop_002.ogg`), `ding.mp3` (= `confirmation_001.ogg`), `remove.mp3` (= `impactSoft_heavy_000.ogg`), mono MP3 64 kbit/s; *Smoke Particles* (Kenney, CC0 1.0, https://kenney.nl/assets/smoke-particles) → `puff.png` (= `PNG/White puff/whitePuff08.png`, scaled to 128 × 128).
- [ ] **Step 5: Run** the test — PASS.
- [ ] **Step 6: Commit** `git add web/public/assets/kenney/fx blender/sources/LICENSES.md web/tests/content/fxAssets.test.ts && git commit -m "chore(fx): Kenney sounds and smoke puff for build feedback"`

---

### Task 2: Sound module and settings toggle

**Files:**
- Create: `web/src/ui/sound.ts`
- Modify: `web/src/ui/accountMenu.ts`
- Test: `web/tests/ui/sound.test.ts` (happy-dom), extend `web/tests/ui/accountMenu.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SoundName = 'place' | 'ding' | 'remove';
  export const SOUND_FILES: Record<SoundName, string>;   // 'assets/kenney/fx/place.mp3', …
  export const SOUND_KEY = 'lerndorf.sound';
  type Store = Pick<Storage, 'getItem' | 'setItem'> | null;
  export function readSoundSetting(store?: Store): boolean;          // default true; any throw → true
  export function writeSoundSetting(on: boolean, store?: Store): void; // throw swallowed
  export interface Sound {
    readonly enabled: boolean;
    setEnabled(on: boolean): void;        // writes the setting
    unlock(): void;                        // call inside a user gesture: creates/resumes the context, starts loading
    play(name: SoundName, delayMs?: number): void; // no-op when disabled, not unlocked or not loaded
    dispose(): void;                       // closes the context
  }
  export function createSound(opts?: {
    createContext?: () => AudioContext | null;  // default: new AudioContext() in try/catch, null if missing
    fetchFn?: typeof fetch; base?: string; store?: Store;
  }): Sound;
  // accountMenu.ts: new optional option
  sound?: { on: boolean; onChange: (on: boolean) => void };
  ```

- [ ] **Step 1: Write the failing tests** (`sound.test.ts`, fake `AudioContext` with `resume`, `decodeAudioData`, `createBufferSource`, `createGain`, `currentTime`, `close` as spies; fake `fetchFn`):
  - `readSoundSetting(null)` → `true`; store returning `'0'` → `false`; store whose `getItem` throws → `true`; `writeSoundSetting` with a throwing store does not throw.
  - `play('place')` before `unlock()` → no `createBufferSource` call.
  - after `unlock()` and loaded buffers: `play('place')` starts one source through a gain node with `gain.value === 0.35`; `play('ding', 120)` starts at `currentTime + 0.12`.
  - `setEnabled(false)` → `play` does nothing and the store holds `'0'`.
  - `createContext` returning `null`, `fetchFn` rejecting, or `decodeAudioData` rejecting → `unlock()` and `play()` do not throw and play nothing.
  - `unlock()` twice → one context, files fetched once.
- [ ] **Step 2: Extend** `accountMenu.test.ts`: with `sound: { on: true, onChange }` there is a button `Töne: an` with `aria-pressed="true"`; a click calls `onChange(false)` and the label becomes `Töne: aus`; without `sound` no such button.
- [ ] **Step 3: Run** both — FAIL.
- [ ] **Step 4: Implement** `sound.ts` (buffers decoded once per name, kept in a map) and the toggle in `accountMenu.ts` (placed after the quality group).
- [ ] **Step 5: Run** — PASS; `npm test` green.
- [ ] **Step 6: Commit** `git add web/src/ui/sound.ts web/src/ui/accountMenu.ts web/tests/ui/sound.test.ts web/tests/ui/accountMenu.test.ts && git commit -m "feat(ui): Kenney sounds with on/off setting"`

---

### Task 3: Forgiving slot tap area

**Files:**
- Modify: `web/src/world/plotPlan.ts`, `web/src/render/buildMode.ts` (`handleTap` only)
- Test: `web/tests/world/slotNear.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const TAP_MARGIN = 0.5;
  /** Exact hit (slotAt) first; else the slot whose rectangle is nearest, if its distance ≤ margin; else undefined. */
  export function slotNear(lx: number, lz: number, margin?: number): SlotDef | undefined;
  ```

- [ ] **Step 1: Write the failing tests** (local coordinates: cell x minus `PLOT_COLS/2`): centre of every slot → that slot; a point exactly 0.01 m inside `car` next to `deco_2` (x = 8.01) → `car`, 0.01 m inside `deco_2` (x = 7.99) → `deco_2`; on the path 0.3 m right of `deco_1` (x = 3.3, z = 5) → `deco_1`; on the path midway (x = 4.0, z = 5) → `undefined` (1.0 m from both); 0.4 m behind the fence side of `deco_3` (z = 11.4) → `deco_3`; 0.6 m outside → `undefined`; `margin 0` behaves like `slotAt`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `slotNear` (distance from point to rectangle; ties go to the first slot in `SLOTS`) and use it in `BuildMode.handleTap` instead of `slotAt`.
- [ ] **Step 4: Run** — PASS; `npm test` green (existing build bar tests unchanged).
- [ ] **Step 5: Commit** `git add web/src/world/plotPlan.ts web/src/render/buildMode.ts web/tests/world/slotNear.test.ts && git commit -m "feat(build): tap area of a slot reaches 0.5 m beyond it"`

---

### Task 4: Effect engine (pop, shrink, smoke)

**Files:**
- Create: `web/src/render/buildFx.ts`
- Test: `web/tests/render/buildFx.test.ts` (node)

**Interfaces:**
- Consumes: `MAX_SIZE`, `SlotKind` from `world/plotPlan.ts`.
- Produces:
  ```ts
  export const PLACE_SECONDS = 0.6, REMOVE_SECONDS = 0.4, PUFF_SECONDS = 0.5, MAX_PUFFS = 8;
  export function popScale(t: number): number;                      // seconds → scale
  export function shrinkPose(t: number): { scale: number; yaw: number };
  export interface Puff { x: number; y: number; z: number; scale: number }
  export function puffLayout(count: number, radius: number, t: number): Puff[]; // local to the effect centre
  export function puffOpacity(t: number): number;                   // 0.9 → 0 over PUFF_SECONDS
  export class BuildFx {
    constructor(scene: THREE.Scene, opts: { texture: THREE.Texture | null; reducedMotion: () => boolean });
    place(obj: THREE.Object3D, kind: SlotKind): void;   // pop + 8 puffs
    remove(obj: THREE.Object3D, kind: SlotKind): void;  // detaches obj into the fx group (Object3D.attach), shrinks it, then removes it; 6 smaller puffs
    update(dt: number, camera: THREE.Camera): void;     // advances, billboards the puffs
    clear(): void;                                      // finish now: placed objects scale 1, removed objects gone, smoke hidden
    readonly busy: boolean;
    dispose(): void;                                    // disposes only its own puff geometry/material
  }
  export function loadPuffTexture(onError?: () => void): THREE.Texture; // TextureLoader on assets/kenney/fx/puff.png
  ```

- [ ] **Step 1: Write the failing pure tests:** `popScale(0) === 0`, `popScale(0.6) === 1`, `popScale(1) === 1`; the maximum over 0…0.6 s (step 0.01) lies within 1.15 ± 0.03 and after 0.3 s. `shrinkPose(0)` = `{scale 1, yaw 0}`, `shrinkPose(0.4)` = `{scale 0, yaw 0.6}`. `puffLayout(8, 2, t)` has 8 entries, all at distance ≤ 2 × 1.2 from the centre and y ≥ 0; scales grow with t; `puffLayout(9, …)` returns at most `MAX_PUFFS`. `puffOpacity(0) ≈ 0.9`, `puffOpacity(0.5) === 0`.
- [ ] **Step 2: Write the failing class tests** (plain `THREE.Scene`, `texture: new THREE.Texture()`):
  - the constructor adds exactly one `InstancedMesh` with `count` ≤ 8 to the scene, hidden while idle.
  - `place(obj,'deco')` → `obj.scale.x === 0`; after `update(0.3)` it is > 0; after a further `update(0.4)` it is exactly 1 and `busy` is false.
  - `remove(obj,'deco')` with `obj` inside a parent group → obj now hangs in the fx group with the same world position; after `update(0.45)` obj has no parent.
  - `remove`, then `clear()` → obj has no parent, smoke hidden (Review Focus 1). `place`, then `clear()` → scale 1.
  - `reducedMotion: () => true` → `place` leaves scale 1 and shows no smoke; `remove` removes obj from its parent at once.
  - `texture: null` → pop and shrink still run, no smoke mesh is shown.
- [ ] **Step 3: Run** — FAIL.
- [ ] **Step 4: Implement.** Pop: ease-out-back tuned so the peak is 1.15. Smoke: one `InstancedMesh(PlaneGeometry(1,1), MeshBasicMaterial({ map, transparent: true, depthWrite: false }))`, `frustumCulled = false`, each instance faces the camera (copy `camera.quaternion`), common opacity `puffOpacity`; radius = 0.45 × max(w, d) of `MAX_SIZE[kind]` for place and 0.3 × for remove. A new effect while another one runs: `clear()` the old one first.
- [ ] **Step 5: Run** — PASS; `npm run build` green.
- [ ] **Step 6: Commit** `git add web/src/render/buildFx.ts web/tests/render/buildFx.test.ts && git commit -m "feat(render): build effects with pop, shrink and Kenney smoke"`

---

### Task 5: Slot highlights

**Files:**
- Modify: `web/src/render/buildMode.ts` (`redraw`, new `update`)
- Test: `web/tests/render/slotHighlight.test.ts` (node), extend `web/tests/ui/buildBar.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SlotLook { free: boolean; selected: boolean; dimmed: boolean; icon: string | null; frame: number }
  /** free = empty or ruin; icon only on free, not dimmed slots: house '🏠', garage '🏠', car '🚗', deco '🌷'; frame 0.12 m, selected 0.3 m. */
  export function slotLook(slot: SlotDef, slots: SlotMap, selected: SlotId | null, handOverKind: string | null): SlotLook;
  export function pulseOpacity(t: number, reducedMotion: boolean): number; // 0.45…0.95, period 1.5 s; reduced → 0.8
  // BuildMode
  update(t: number): void;   // pulses the frames of free slots and lets the icons bob (≤ 0.15 m); nothing when inactive
  ```

- [ ] **Step 1: Write the failing pure tests:** empty `deco_2` → `free true, icon '🌷'`; `deco_1` with an item → `free false, icon null`; house slot with `RUIN_ID` → `free true, icon '🏠'`; selected slot → `frame 0.3` and `selected true`; hand-over of a car → every non-car slot `dimmed true, icon null`. `pulseOpacity(0,false) !== pulseOpacity(0.75,false)`, values stay in 0.45…0.95, `pulseOpacity(t,true) === 0.8` for any t.
- [ ] **Step 2: Extend the bar test:** after `enter()`, the build group holds 7 frame meshes (`userData.slotFrame` set to the slot id) and one sprite per free slot (`userData.slotIcon`); after selecting `deco_2`, its frame has `userData.frame === 0.3`.
- [ ] **Step 3: Run** — FAIL.
- [ ] **Step 4: Implement.** Replace the filled plates with a light fill plate (opacity 0.18, kept for orientation) plus a rectangular frame (`ShapeGeometry` of the outer rectangle minus the inner rectangle, thickness `frame`); colour = `SLOT_COLOUR`, selected `#ffd23f`. Icons: `THREE.Sprite` with one cached `CanvasTexture` per emoji (64 × 64 px), 1.2 m above the slot centre. `redraw()` stays the only place that rebuilds them; `update(t)` changes only opacity and icon height. Reduced motion is read by the caller and passed through the constructor option `reducedMotion: () => boolean` (new, default `() => false`).
- [ ] **Step 5: Run** — PASS; `npm test` green.
- [ ] **Step 6: Commit** `git add web/src/render/buildMode.ts web/tests/render/slotHighlight.test.ts web/tests/ui/buildBar.test.ts && git commit -m "feat(build): pulsing frames and icons on free slots"`

---

### Task 6: Big slot sheet and effect events

**Files:**
- Modify: `web/src/render/buildMode.ts`, `web/src/render/itemThumbs.ts`, `web/src/style.css`
- Test: extend `web/tests/ui/buildBar.test.ts`

**Interfaces:**
- Consumes: `ThumbSource` (itemThumbs), `fittingSlots` (buildPreview).
- Produces:
  ```ts
  // itemThumbs.ts: widen the parameter, behaviour unchanged
  export type ThumbItem = Pick<ItemEntry, 'id' | 'kind' | 'fits'>;
  export type ThumbSource = (e: ThumbItem) => Promise<string | null>;
  // buildMode.ts
  export interface BuildFxEvent { type: 'place' | 'turn' | 'remove'; slot: SlotId; kind: SlotKind }
  BuildModeOptions += {
    onFx?: (e: BuildFxEvent) => void;   // 'remove' fires BEFORE onSlots(server state), 'place'/'turn' AFTER it
    onShop?: () => void;
    onSheet?: (open: boolean) => void;  // the big sheet opened or closed
    thumbs?: ThumbSource;
    reducedMotion?: () => boolean;      // from Task 5
  }
  get sheetOpen(): boolean;
  ```

- [ ] **Step 1: Update the existing bar tests** to the new labels (`Speichern` → `Aufstellen`, `Abbrechen` → `Zurück`) and keep their assertions; the double-tap test now clicks `Aufstellen` twice → exactly one `place_in_slot`.
- [ ] **Step 2: Write the failing tests:**
  - without a slot: compact bar (class `build-bar`, no `build-bar--sheet`), seven slot buttons and `Fertig`; `onSheet` not called.
  - selecting `Deko-Platz 2` → class `build-bar--sheet`, `onSheet(true)`, `h2` `Deko-Platz 2` focused, text `Noch leer`; one card per fitting item, each a button with a thumbnail element (`.item-thumb`, placeholder until `thumbs` resolves, then `<img alt="">`) and status `frei: 1`; the bench placed in `deco_1` shows `alle aufgestellt` and is disabled when it is the only copy.
  - card click → preview as before (`onSlots` with the preview map, no `rpc`).
  - `Drehen` only for deco slots; `Wegräumen` only with a placement in a deco or car slot.
  - `Zurück` → compact bar, last `onSlots` equals the saved map, `onSheet(false)`, focus on the `Deko-Platz 2` slot button. `Escape` inside the sheet does the same.
  - car slot without a car → `Du hast dafür noch nichts.` and `Zum Shop` calling `onShop`.
  - successful `Aufstellen` of a new item → `onFx({type:'place', slot:'deco_2', kind:'deco'})` called after the last `onSlots`, message `Aufgestellt!`; saving the same item with another rotation → `type 'turn'`, message `Gedreht.`.
  - successful `Wegräumen` → `onFx({type:'remove', …})` called before the `onSlots` with the server state.
  - `rpc` error on `Aufstellen` or `Wegräumen` → `onFx` never called (Review Focus 2).
  - guided placement (tutorial) keeps its compact bar; on success `onFx` with `type 'place'`, `slot 'house'`.
- [ ] **Step 3: Run** — FAIL.
- [ ] **Step 4: Implement.** `renderBar` with a slot renders the sheet: `section` with `role="region"` and `aria-labelledby` the `h2`; cards grid `repeat(auto-fill, minmax(120px, 1fr))`; thumbnails request `thumbs?.({ id, kind, fits: fittingSlots(kind) })`. `after()` gets the action (`'place' | 'remove'`) and the previous slot content to choose the event type. Escape handler only while the sheet is open and the event target is inside it.
- [ ] **Step 5: CSS.** `.build-bar--sheet`: portrait `height: 40vh` (and `40dvh`) above the nav, landscape `top: 0; bottom: 0; left: auto; right: 0; width: 40vw` with `padding-right: max(12px, env(safe-area-inset-right))`; inner list scrolls (`overflow: auto`), the action row stays visible; action buttons `min-height: 56px`; cards `min-height: 64px`, thumbnail `width ≥ 96px`, `aspect-ratio: 4/3`, `object-fit: contain`; selected card = border 3 px + bold name.
- [ ] **Step 6: Run** — PASS; `npm test` green.
- [ ] **Step 7: Commit** `git add web/src/render/buildMode.ts web/src/render/itemThumbs.ts web/src/style.css web/tests/ui/buildBar.test.ts && git commit -m "feat(build): big slot sheet with picture cards and effect events"`

---

### Task 7: Wiring in the village

**Files:**
- Modify: `web/src/render/village.ts`, `web/src/render/houseCamera.ts`, `web/src/ui/villageView.ts`
- Test: extend `web/tests/render/houseCamera.test.ts`; existing `web/tests/ui/villageTutorial.test.ts` stays green

**Interfaces:**
- Consumes: Tasks 2, 4, 5, 6.
- Produces:
  ```ts
  // village.ts: plotContents sets model.userData.slot = slot.id; buildVillage adds
  root.userData.ownSlotObject = (slot: SlotId): THREE.Object3D | null;
  // houseCamera.ts
  /** View offset so the plot sits in the part not covered by the sheet: landscape (w > h) x = 0.2·w, portrait y = 0.2·h. */
  export function sheetViewOffset(w: number, h: number): { x: number; y: number };
  ```

- [ ] **Step 1: Write the failing test:** `sheetViewOffset(1180, 820)` → `{x: 236, y: 0}`; `sheetViewOffset(820, 1180)` → `{x: 0, y: 236}`; square → treated as landscape.
- [ ] **Step 2: Run** — FAIL; implement; PASS.
- [ ] **Step 3: Wire `villageView.ts`:**
  - `const sound = createSound()`; a `pointerdown` listener on `window` calls `sound.unlock()`; removed in `stop()`, `sound.dispose()` too.
  - `const fx = new BuildFx(scene, { texture: loadPuffTexture(), reducedMotion })`; `fx.update(dt, camera)` in the animation loop right before `gl.render`; `stop()` calls `fx.clear()` then `fx.dispose()`.
  - `BuildMode` options: `reducedMotion`, `thumbs` from `acquireSessionThumbs()` (released in `stop()`), `onShop: () => void areas?.select('shop')`, `onSheet: (open) => open ? camera.setViewOffset(w, h, off.x, off.y, w, h) : camera.clearViewOffset()` (also re-applied in `resize` while open, cleared in `buildMode.exit` paths), `onFx`:
    - `remove`: `obj = ownSlotObject(e.slot)` → `fx.remove(obj, e.kind)`; `sound.play('remove')`.
    - `place`: `obj = ownSlotObject(e.slot)` → `fx.place(obj, e.kind)`; `sound.play('place')`; `sound.play('ding', 120)`.
    - `turn`: `sound.play('ding')`.
    - a missing object is skipped silently (sound still plays).
  - Animation loop: `buildMode?.update(performance.now() / 1000)`.
  - Leaving „Bauen“ (area close handle) calls `fx.clear()` after `buildMode.exit()` (Review Focus 1).
  - Settings menu: pass `sound: { on: sound.enabled, onChange: (on) => sound.setEnabled(on) }`.
- [ ] **Step 4: Run** `npm test`, `npm run build`, eslint — green.
- [ ] **Step 5: Commit** `git add web/src/render/village.ts web/src/render/houseCamera.ts web/src/ui/villageView.ts web/tests/render/houseCamera.test.ts && git commit -m "feat(ui): build effects, sounds and sheet camera in the village"`

---

### Task 8: Screenshots, gallery check and docs

**Files:**
- Create: `web/dev/build.html`, `web/dev/build.ts`, `web/e2e/build-feedback.spec.ts`
- Modify: `web/playwright.config.ts`, `docs/PLAN.md`, spec status line

- [ ] **Step 1: `dev/build.ts`** follows `dev/tutorial.ts`: `mountVillage` with a fake Supabase whose tutorial is finished, coins 200, inventory `deco_cat_sign` ×2, `deco_bench` ×1, `car_kleinwagen` ×1, placement `deco_bench` in `deco_1`; RPCs `place_in_slot` / `clear_slot` update the fake placements; URL param `fail=place_in_slot` makes that RPC fail once.
- [ ] **Step 2: `e2e/build-feedback.spec.ts`** (dev server, like the tutorial project) at 1180 × 820 and 820 × 1180: open „Mein Haus“ → „Bauen“ → shot `01-slots`; tap `Deko-Platz 2` in the list → shot `02-sheet`; choose `Katzenschild` → `03-preview`; `Aufstellen` → wait 0.3 s → `04-pop-smoke`, wait 0.6 s → `05-placed`; `Wegräumen` → `06-shrink`; reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`) → `07-reduced`; with `fail=place_in_slot` → message visible, no fx (assert via `window.__fxCount` exposed by `dev/build.ts`). Fail on any page error and on `document.documentElement.scrollWidth > clientWidth`. Shots go to `test-results/build-feedback/`.
- [ ] **Step 3: Run** `npx playwright test e2e/build-feedback.spec.ts` — green; open every picture: frames and icons visible, sheet does not hide the plot (landscape: plot left of the sheet), smoke soft and white, nothing overlaps the nav.
- [ ] **Step 4: Gallery** — `village.ts` changed (`userData.slot`): run `npm run galerie` and compare a few pictures with the previous run; nothing may look different.
- [ ] **Step 5: Full check** `npm test && npm run build && npx eslint src tests` — green.
- [ ] **Step 6: Docs.** In `docs/PLAN.md` replace the line „Nächstes: Zwischenpaket B …“ with a block `## Zwischenpaket B – Bau-Feedback` (Spec + Plan paths, rows B.1–B.8 = Tasks 1–8, all `[x]`) and `[ ] B.9 | LK | **Abnahme Bau-Feedback** auf dem Schul-Tablet: Plätze erkennbar, großes Platz-Menü, Plopp/Rauch/Töne beim Aufstellen und Wegräumen, Töne abschaltbar, reduzierte Bewegung | Notiz hier |`. Spec status line: `Umgesetzt laut Plan 2026-10-24; Abnahme durch die Lehrkraft (B.9) steht aus.`
- [ ] **Step 7: Commit** `git add web/dev/build.html web/dev/build.ts web/e2e/build-feedback.spec.ts web/playwright.config.ts docs/PLAN.md docs/superpowers/specs/2026-10-21-build-feedback-design.md && git commit -m "test(e2e): build feedback screenshots, PLAN entry"`
- [ ] **Step 8: Report to the teacher in German:** what pupils see now (short list), that „Speichern“ is now „Aufstellen“ and „Abbrechen“ is „Zurück“, which Kenney sounds were chosen (and that they can be swapped in `SOUND_FILES`), where the screenshots are, and the checklist for B.9.

---

## Self-review

- Spec §1 highlights (pulse 1.5 s, icon, selected thicker frame, +0.5 m tap, reduced motion) → Tasks 3, 5. §2 sheet (portrait bottom / landscape right, 40 %, only fitting items, cards with pictures ≥ 96 px, tap ≥ 64 px, Aufstellen/Drehen/Wegräumen/Zurück, empty state + Zum Shop, keyboard) → Task 6 (+ §6.3/§6.4). §3 place effect 0.6 s, ease-out-back 1.15, smoke 0.5 s, plopp + ding → Tasks 1, 2, 4, 7 (Kenney per §6.1/§6.2). §4 shrink 0.4 s with turn, smaller smoke, puff → Tasks 4, 7. §5 only after RPC success → Task 6; sound only after a gesture, quiet, toggle stored in localStorage with try/catch → Task 2; reduced motion → Tasks 4, 5 (§6.6); ≤ 8 particles, one texture, `buildFx.ts` / `sound.ts` → Tasks 1, 4; local only → Global Constraints, Task 7 (no API call added). §6.5 tutorial → Task 6. §6.7 tap → Task 3. §6.8 free = empty or ruin → Task 5. Acceptance 1–5 → B.9 checklist with screenshots from Task 8.
- Names used across tasks: `BuildFxEvent`, `BuildFx`, `Sound`, `SoundName`, `slotNear`, `slotLook`, `pulseOpacity`, `ThumbItem`, `ownSlotObject`, `sheetViewOffset`, `onFx`, `onShop`, `onSheet`, `reducedMotion` — each defined once.
