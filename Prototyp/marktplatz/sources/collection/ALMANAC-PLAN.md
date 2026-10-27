# Collection · Almanac expansion

Historical r03 plan below. Superseded by `TEXTBOOK-PLAN.md` for the current r04 revision: 38 cards/motifs, sourced original verses and eight user-authorized textbook adaptations. Current technical reports live in assets/collection; user retains visual review.

User request: 24 additional collectible cards with rotatable motifs, including proverbs and rhymes. Collection navigation: Cards (almanac) and Achievements (not yet implemented). Keep implementation/integration notes. All work remains in Prototyp/marktplatz; visual review stays with user.

- [x] Preserve six card IDs; extend to 30 with 10 Normal, 10 Rare, 7 Epic, 3 Legendary cards. Original rhymes, traditional proverbs, simple meanings and examples; no graded tasks or answers.
- [x] Create 24 new low-poly motifs and export a standalone rotatable motif GLB for every card. Update front/back print to 30-card numbering. Keep original native six-card source; save the expanded source separately.
- [x] Rebuild SVG faces, small thumbnails and embedded 1024 × 768 atlases. Audit every card and motif export against native geometry.
- [x] Reshape collection.html into a book/almanac with rarity chapters, search, previous/next pages, 3D Card/Motif inspection and bounded lazy-loading cache. Achievements is a clear placeholder.
- [x] Preserve earlier frame/title designs and make them viewable in a separate design archive. No achievement progress/unlocking yet.
- [x] Browser-check all 30 cards/motifs, filtering, paging, flipping, resource limits, mobile layout and placeholder. No screenshots unless user requests.
- [x] Document schema, IDs, future ownership/RPC boundaries, asset loading, cleanup, achievements scope and explicit integration handoff. No changes to web/src or other existing repository files; no commits/push.

Use contract: close inspection of both card faces, edges and detached motifs from all sides. Closed low-poly motif solids; an inspection pivot is separate from the card. No new animation rigs or hidden interiors. Up to 4,000 card triangles / 4,000 motif triangles, at most eight materials per file, texture edge ≤1024 px. Native source remains editable in Blender 5.2. Existing Blender workflow and directly delegated design apply; no new concept-approval gate.

Completed: 30 card and 30 motif GLBs reimported successfully; 143 browser checks passed. Visual review remains with the user. Integration notes: ../../INTEGRATION_COLLECTION.md. No commits/push or production changes.
