# Quellen und Lizenzen der Grafik

Nur CC0-Inhalte oder eigene (CLAUDE.md). Die Quellpakete selbst liegen nicht im Repository.

| Paket | Autor | Lizenz | Link | Verwendet in |
| --- | --- | --- | --- | --- |
| Interface Sounds 1.0 / Impact Sounds 1.0 | Kenney | CC0 1.0 | https://kenney.nl/assets/interface-sounds · https://kenney.nl/assets/impact-sounds | `web/public/assets/kenney/fx/place.mp3` (`drop_002.ogg`), `ding.mp3` (`confirmation_001.ogg`), `remove.mp3` (`impactSoft_heavy_000.ogg`), mono MP3 64 kbit/s |
| Smoke Particles | Kenney | CC0 1.0 | https://kenney.nl/assets/smoke-particles | `web/public/assets/kenney/fx/puff.png` (`PNG/White puff/whitePuff08.png`), 128 × 128 px RGBA |
| Skyboxes 1.0 (14.07.2026) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/skyboxes | `web/public/sky/skybox-night.jpg` (aus `skybox-night.png`, auf 2048 × 1024 verkleinert, JPEG) |
| Foliage Sprites (08.02.2020) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/foliage-sprites | `web/public/foliage/grass-atlas.png` (Sprites 0001, 0002, 0003, 0004, 0011, 0012, 0016, 0018 aus `Kenny/Foliage/PNG/Flat`, zugeschnitten, als Atlas 4 × 2 zu je 256 px) |
| Forest Kit (14.07.2026) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets | `web/public/assets/kenney/forests/` (tree, tree-high, Textures/colormap.png; unverändert) |
| Survival Kit 2.0 (03.04.2024) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/survival-kit | `web/public/assets/kenney/survival/` (tree-tall, tree-autumn-tall, rock-a, rock-b, rock-c, Textures/colormap.png; unverändert). Neu für die Ruine (23.10.2026): barrel, floor-old, metal-panel, metal-panel-screws, resource-planks, structure-metal-wall (unverändert) |
| Fantasy Town Kit 2.0 (03.08.2025) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/fantasy-town-kit | `web/public/assets/kenney/town/` (tree-high, tree-high-round, tree-high-crooked, rock-small, rock-wide, rock-large, fountain-round-detail, lantern, stall-green, fence-gate, Textures/colormap.png; unverändert). Neu für die Ruine (23.10.2026): chimney, fence-broken, pillar-wood, planks, planks-half, roof-gable, roof-point, stairs-wood, wall-broken, wall-wood, wall-wood-broken, wall-wood-corner, wall-wood-doorway-square, wall-wood-half, wall-wood-side, wall-wood-window-shutters (unverändert) |
| Graveyard Kit (23.10.2026) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/graveyard-kit | `web/public/assets/kenney/graveyard/` (debris, debris-wood, fence-damaged, Textures/colormap.png; unverändert, aus `Kenny/Graveyard`) |
| Food Kit 2.0 (26.06.2024) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/food-kit | `web/public/assets/kenney/food/` (apple, pumpkin, loaf-round, Textures/colormap.png; unverändert) |
| Nature Kit 2.1 (29.04.2020) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/nature-kit | `web/public/assets/kenney/nature/` (flower_red/purple/yellow A–C, path_stone, stone_smallFlatA–C; unverändert, Blumenfarben im Code auf LOOK-Blumenfarben gesetzt) |
| Junge und Mädchen (23.10.2026) | eigene Erstellung der Lehrkraft mit Tripo AI (Rig und Animationen walk, Catwalk, Tänze) | **Tarif/Lizenz bei Tripo prüfen** (Projektregel: nur CC0 oder eigene Modelle) | – | `web/public/assets/characters/boy.glb`, `girl.glb` (unverändert); Vorschaubilder `boy.png`, `girl.png` daraus gerendert |
| UI Pack 2.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/ui-pack | `web/public/assets/kenney/ui/` (`bubble.png` = `PNG/Grey/Default/button_rectangle_depth_border.png`, `bubble-tip.png` = `PNG/Grey/Default/arrow_basic_s.png`, `tap-a.ogg` = `Sounds/tap-a.ogg`; unverändert, in CSS hell eingefärbt) |
| Comic Neue 2.3 (über das npm-Paket `@fontsource/comic-neue` 5.3.0, Latin-Teilmenge) | Craig Rozynski / The Comic Neue Project Authors | SIL Open Font License 1.1 | https://github.com/crozynski/comicneue | `web/public/fonts/ComicNeue-Regular.woff2`, `ComicNeue-Bold.woff2` (unverändert); Lizenztext: `web/public/fonts/OFL.txt` |

## XP-Rückmeldung (25.10.2026)

Die interaktiven 3D-Truhen (`web/src/render/chestPreview.ts`) und ihre SVG-Ersatzansicht (`web/src/ui/chestControl.ts`) sind eigene, im Code erstellte Modelle/Grafiken ohne fremde Modell- oder Texturdateien. Der Deckel besitzt ein eigenes Scharnier für die Öffnungsanimation.

| Datei | Quelle und Verarbeitung | Lizenz | Link |
| --- | --- | --- | --- |
| `web/public/assets/kenney/fx/xp.mp3` | Kenney Interface Sounds, `pluck_001.ogg`; mono MP3 64 kbps | CC0 | https://kenney.nl/assets/interface-sounds |
| `web/public/assets/kenney/fx/levelup.mp3` | Kenney Interface Sounds, `confirmation_003.ogg`; mono MP3 64 kbps | CC0 | https://kenney.nl/assets/interface-sounds |
| `web/public/assets/kenney/fx/chest.mp3` | Kenney Interface Sounds, `open_002.ogg`; mono MP3 64 kbps | CC0 | https://kenney.nl/assets/interface-sounds |
| `web/public/assets/kenney/fx/coins.mp3` | Kenney Interface Sounds, `glass_002.ogg`; mono MP3 64 kbps | CC0 | https://kenney.nl/assets/interface-sounds |
| `web/public/assets/kenney/fx/star.png` | Kenney Particle Pack, `star_06.png`; resized to 64 × 64 RGBA | CC0 | https://kenney.nl/assets/particle-pack |
