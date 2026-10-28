# Ollie Empire State souvenir — extraction brief

User task: isolate the Empire State Building from the supplied `new_york_buildings.glb`; replace Ollie's postcard reward with the building souvenir. Original Downloads file must remain untouched. Existing reward ID stays `reward_ollie_nyc_postcard` for saved ownership compatibility.

## Resolved intake

- Intended use: static garden decoration in an existing 3×3 slot; exterior visible all around; close orbit preview. No interior or moving components.
- Reference authority: user supplied GLB, specifically `emp_state._final_14` / `Object_28` / material `empire_state`. User's Empire State book photograph establishes identity; no reinvention requested.
- Art route: narrow extraction from sufficient supplied source. No Imagegen or new design.
- Protected features: source proportions, stepped crown, spire, facade texture and all-around silhouette. Center in horizontal plane, base at 0; height 1.8 m. No invented plinth.
- Quality target: retain the supplied textured building faithfully. This is not a new architectural reconstruction.
- Production: one exported mesh/material, 1368 triangles; textures at most 1024 px edge, self-contained GLB; editable .blend retains complete source collection hidden. No decimation needed. Identical LOD avoids loss of the thin spire.
- Budget: initial extraction + at most two targeted corrective passes; no image generation. One transform/bounds correction consumed.
- Application integration and browser verification: parent task owns registry, API, SQL and consuming app. This package verifies source/export fidelity separately.
- License verified directly from source GLB `asset.extras`: **CC-BY-4.0**, http://creativecommons.org/licenses/by/4.0/. **New York Buildings** by **sumitmangela** (https://sketchfab.com/sumitmangela), source https://sketchfab.com/3d-models/new-york-buildings-e7922fe0f7b14ed786f84529f9217dac. Attribution and modifications are recorded in the public `LICENSE-ollie-empire-state.txt`, manifest and `source-attribution.json`. The original user instruction authorizes this source despite the older project CC0-only default. This is not CC0.

## Scope and dependencies

`Source_NYC_Complete_Hidden` preserves every imported source object and embedded image, packed in the .blend. `Ollie_Empire_State` contains the normalized deliverable. Review cameras/lights are isolated in `Review_Stage_Not_Exported` and excluded from selected-only export.

Builder: `web/scripts/assets/extract-ollie-empire.py`, background Blender 5.2.2. Source input hash and final source/export dimensions, camera poses and hashes are in `audit-r01.json`. Evidence images are in `web/test-results/empire-souvenir/`. The manifest model metadata ID is `ollie_empire_state_souvenir_model`; it is not a new database item. The old postcard model/manifest entry is retained.

## Review ledger

- Transform correction: first technical audit exposed stale bound-box evaluation after applying source transforms. Explicit mesh/data and dependency-graph updates added before measuring and after scaling; recheck final audit and export bounds. This was a numeric production defect, not an artistic change.
- Target-to-candidate review: supplied complete-source overview shows the same beige stepped tower amongst other buildings. Extracted opposing close views retain its narrow tall body, evenly spaced vertical facade bands, stepped silver crown and thin antenna; no neighboring geometry is present. The source's simple rectangular lower shaft is retained, not silently redesigned.
- Front/opposite facade and crown: all four exterior sides remain textured; ledges, tower top and antenna remain distinct. The original mesh's flat bottom supports placement without an extra plinth.
- Neutral light / target size: close views expose the original facade texture; the primary stepped silhouette remains legible at garden thumbnail size. Tiny window texture naturally merges at distant views.
- Intersections/animation/interior: no interacting or moving parts introduced; not applicable. Garden collision/placement is owned by application integration.
- Export-fidelity review passed: fresh actual GLB reimport renders (`export-front.png`, `export-opposite.png`) inspected against selected native views. Narrow shaft, facade colors and window bands, ledges, crown and antenna match. No neighbors exported. Final source and reimported GLB dimensions agree at 0.2762544 × 0.2762545 × 1.79999995 m (Blender XYZ); base Z=0 and centered XY. Both independent skill technical audits passed, no findings: 1368 triangles, one mesh/material, one embedded 512×512 sRGB image and UVs.
- Artistic extraction gate: passed against supplied model appearance; no new architectural fidelity claim is made for unseen book-photo regions. No open blocking/major extraction defects. Consuming application remains parent-owned and not verified by this package.

## Application acceptance, parent integration

The actual exported GLB was loaded through the real item preview after the nine-question story. The mobile screenshot `web/test-results/ollie-nine/ollie-story-nine-gaps-gran-6ce74-d-the-souvenir-is-placeable/ollie-story-souvenir-mobile.png` was inspected: only the Empire State is visible, centred with uncropped spire/base and the expected textured shaft. Inventory action and place callback passed. Geometry regression independently verifies 1.8m height, centred X/Z, baseY0,1368tri,one material. Full suite1318 tests,17browserchecks and build passed. This closes the application-verification item recorded above; real-device FPS remains part of the wider village acceptance.
