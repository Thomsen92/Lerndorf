# Approved Ollie catalogue

`ollie-items.json` records the fourteen approved normal-shop additions, with stable
item IDs, existing backend kinds, approved prices and bilingual product content.
The runtime continues to read prices and ownership from the existing Supabase API;
this file is a build/review contract, never a client wallet or inventory store.

`supabase/migrations/0054_ollie_shop_items.sql` only upserts those item rows. It adds
no schema, category, purchase RPC, reward, class override or starter. Replaying it
preserves existing items, balances, placements, inventories and class restrictions.
The earlier `deco_lantern` remains a different, older procedural street-lamp model;
`shop_evening_lantern` is the approved slender Kenney lamp from the shop prototype.

Rebuild from the read-only prototype sources, from `web/`:

```powershell
node scripts/export-ollie-items.mjs --preview
```

Set `CHROMIUM_PATH` when the documented local Chromium path is unavailable.
The exporter reads `Prototyp/shop/models.mjs` directly to preserve the nine actual
product shapes and their Kenney materials. It copies the five top-level r05
Hauswerkstatt GLBs byte for byte. All delivered GLBs are self-contained. Existing
prototype files are never edited. An ephemeral HTTP server serves local source
files to headless Chromium and is closed after export.

Runtime files and reproducible byte counts/SHA-256 hashes/bounds/triangle counts
are in `web/public/assets/shop/ollie-audit.json`. The shared shop manifest retains
all earlier entries. `ollie-contact-sheet.png` is the visual review of all models.
The measured full bounds include roofs, flowers, steps and other overhangs.
Models remain at their authored metre scale: decorations are not enlarged to fill
3 × 3 slots, and the tiny cottage stays tiny. Models have 158–3,819 triangles;
the existing GLB loader uses `lod: false` for these already-small models to retain
the cached high template at all distances without requesting missing LOD files.

All added geometry is CC0: own procedural shapes; Kenney Fantasy Town, Survival
and Food; own r05 building geometry incorporating Kenney Fantasy Town modules.
The central sources list and three accompanying Kenney license texts name the
actual sources. No other existing asset is reclassified as CC0.

Verification: API tests check metadata and uncertain purchase failures; model
tests check all fourteen IDs/prices/paths, embedded resources, authored scale and
runtime slot bounds; PGlite tests replay every migration and check real purchases,
repeatable decorations, building uniqueness, placement quantities and server gates.
The complete textured exports were loaded successfully in Chromium for the audit.
