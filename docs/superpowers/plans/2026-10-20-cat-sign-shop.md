# Katzen-Schild-Shop-Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a wooden sign reading “Hallo Malik!” with a small seated low-poly cat as a purchasable decoration for 120 coins.

**Architecture:** Add the model as procedural Three.js geometry in the existing decoration registry and add its catalog row through a new Supabase migration. Keep the established shop, inventory purchase RPC, and plot placement flow unchanged.

**Tech Stack:** TypeScript, Three.js 0.170.0, Supabase SQL migrations.

## Global Constraints

- Work in the current Lerndorf checkout; do not create a worktree.
- Follow `docs/ASSET_VERTRAG.md`: decoration footprint 3 × 3 m, visible height ≤ 3 m, origin at footprint center on ground, front +Z, quarter-turn rotations, ≤ 1,500 triangles.
- Follow `docs/LOOK.md`: warm low-poly comic style, flat shading, palette colors, no pure black, darkest color `#2b2b33`.
- Item ID is `deco_cat_sign`; category `deco`; price 120 coins; rarity `common`; active and shop-visible; lootbox weight 0.
- Put the fixed greeting “Hallo Malik!” on the sign and the small seated cat beside it; do not embed the source HTML or its sample image/search UI.
- Render the greeting as simple light-colored block lettering made from geometry, not a bitmap texture.
- Do not change shop, purchase, placement, lootbox, or GLB-loading behavior.
- Do not touch `Konzept/`, `Prototyp/`, or the unrelated pre-existing `.gitignore`, `Video/`, and `wrangler.jsonc` changes.
- Do not add or run automated tests unless the user asks for testing or verification.

---

## File Map

- Modify `web/src/render/plotAssets.ts`: define the procedural sign-and-cat model and register `deco_cat_sign` in `DECO` (which feeds `MODEL_IDS`).
- Create `supabase/migrations/0014_cat_sign_shop_asset.sql`: seed the shop catalog item using the existing `items` schema and defaults from migration 0013.
- Create `docs/superpowers/plans/2026-10-20-cat-sign-shop.md`: this implementation plan.

No changes are planned for `web/src/ui/shopView.ts`, `web/src/api/economy.ts`, or placement RPCs: the current catalog and slot flow already handles active `deco` items.

## Task 1: Add the procedural model

**Files:**
- Modify: `web/src/render/plotAssets.ts`

**Interfaces:**
- Consumes: existing `box`, `cyl`, `blob`, `add`, `solid`, `WOOD`, and `TIMBER` helpers.
- Produces: `DECO.deco_cat_sign`, returned by `plotAsset('deco', 'deco_cat_sign')` and included in `MODEL_IDS.deco`.

- [x] Add a `deco_cat_sign` entry inside `DECO`, using only existing geometry helpers and materials.
- [x] Build two wooden support posts at the rear half of the footprint, a wide horizontal wood board facing +Z, and a small seated cat beside the sign. Give the cat a body, head, two pointed ears, short legs, and a curved-looking low-poly tail from a few simple segments; use muted palette colors and no textures.
- [x] Put the exact phrase `Hallo Malik!` on the board in readable, light-colored block lettering made from a single flat geometry; keep all glyphs coplanar on the +Z-facing board face and inset from its edges.
- [x] Keep the combined geometry close to the x=0/z=0 center; its explicit component bounds are within x/z ±1.5 m and y 0–3 m, with the lowest geometry at y=0 and the front toward +Z. Its approximate silhouette is 2.6 m wide, 0.7 m deep, and 1.7 m high.
- [x] Keep the mesh deliberately simple: boxes, cones, low-detail icosahedra, and one small flat text geometry. No ground plane or grass is added because the plot supplies the pedestal surface.
- [x] Confirm in the source that `MODEL_IDS.deco` picks up the ID automatically from `Object.keys(DECO)` and that no special-case code in `plotAsset` is required.

## Task 2: Seed the shop item

**Files:**
- Create: `supabase/migrations/0014_cat_sign_shop_asset.sql`

**Interfaces:**
- Consumes: `items` columns from `0001_schema.sql`, plus `rarity`, `lootbox_weight`, and `shop_visible` from `0013_plot_slots.sql`.
- Produces: one active catalog row with `id = 'deco_cat_sign'` and `kind = 'deco'`.

- [x] Add an idempotent insert consistent with `0013_plot_slots.sql`:

```sql
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible)
values ('deco_cat_sign', 'deco', null, 'Katzenschild', 120, '{3,3}', false, true, 'common', 0, true)
on conflict (id) do nothing;
```

- [x] Keep the row's `model` unset, matching the current procedural-asset catalog convention; the renderer resolves the model from the item ID.
- [x] Do not modify `buy_item`, `place_in_slot`, inventory, or lootbox weights for any other item.

## Task 3: Review the finished change

**Files:**
- Review: `web/src/render/plotAssets.ts`
- Review: `supabase/migrations/0014_cat_sign_shop_asset.sql`

- [x] Inspect the source diff and confirm only the planned model and catalog migration were changed by implementation; preserve unrelated working-tree changes.
- [x] Check the model's explicit component dimensions and placements against the 3 × 3 × 3 m limits, center-floor pivot, +Z front, and triangle budget. Do not run automated tests or the gallery script as part of this plan.
- [x] Report the changed files, catalog fields, and any database migration step the user needs to apply.

## Self-review

- Design coverage: board reading “Hallo Malik!”, adjacent seated cat, low-poly style, 3×3 pedestal bounds, centered ground pivot, +Z front, rotation compatibility through the existing decoration path, 120-coin common shop item, and no lootbox eligibility are all covered.
- Scope: shop and placement code stay unchanged because they already consume active catalog rows and resolve procedural decoration models by item ID.
- Project changes: existing uncommitted `.gitignore`, `Video/`, and `wrangler.jsonc` are explicitly excluded.
- Automated tests are excluded by the current instruction not to add or run tests unless the user requests testing or verification.
