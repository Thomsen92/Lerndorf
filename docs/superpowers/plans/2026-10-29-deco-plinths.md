# Asset-specific decoration plinths

Approved direction: low meadow pads for garden assets, shallow stepped stone
for larger decorations, a compact display pedestal for small collectibles.
Keep one fixed light contour on top, warm stage lighting and existing rarity
colors. No backend/schema changes, push or merge.

- [x] Add frontend style rules and measured footprint sizing with slot limits.
- [x] Build shared low-poly bevelled/stepped base geometry with muted colors.
- [x] Adapt the contour, rays, particles and model height together; refit once
      after the actual GLB loads, without measuring every frame or altering GLB resources.
- [x] Show lantern, bookshelf, miniature landmark and flowerbed together;
      provide an alternate garden comparison with bench/tree.
- [x] Verify sizing, fixed contour, disposal, deferred loading and quality/motion
      behavior with focused tests, full tests, build and screenshots/gallery.
- [x] Commit locally on codex/deko-glow-spiel. No push.

Validation: focused renderer/loader tests pass; production build passes. Full
suite: 1339 passed, only the two pre-existing catalogue-byte-size and seed-CRLF
failures. Two additional surface/joint tests pass in the final focused run.
Final gallery: 36 images, inspected alongside the existing village appearance;
interactive close-ups cover all three base types, garden switching, low quality
and reduced motion. Real school-tablet performance remains a manual acceptance.
