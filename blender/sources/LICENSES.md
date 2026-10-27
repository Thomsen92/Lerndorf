# Quellen und Lizenzen der Grafik

Nur CC0-Inhalte oder eigene (CLAUDE.md). Die Quellpakete selbst liegen nicht im Repository.

## Sir Byte (25.10.2026)

Figur, Code und vorhandene Sprachaufnahmen: eigene Werke des Auftraggebers, [Thomsen92/Sir-Byte](https://github.com/Thomsen92/Sir-Byte), Stand `ea10e0c16cd7b0adc4393d9da173df1317049f2c`. Die Stimme wurde vom Auftraggeber mit ElevenLabs erstellt. Vier Module liegen unverändert bis auf den Herkunftskommentar in `web/src/mascot/vendor/`; Anpassungen fürs Lerndorf liegen außerhalb dieser Kopie. Die sechs ermutigenden Aufnahmen liegen in `web/public/assets/sir-byte/voice/`. Die beiden spöttischen Aufnahmen und die lange Demo-Aufnahme werden nicht ausgeliefert. `web/public/assets/sir-byte/preview.png` ist ein 320-px-Standbild des übernommenen Modells, reproduzierbar mit `web/scripts/byte-preview.mjs`.

## Weitere Quellen

| Paket | Autor | Lizenz | Link | Verwendet in |
| --- | --- | --- | --- | --- |
| Interface Sounds 1.0 / Impact Sounds 1.0 | Kenney | CC0 1.0 | https://kenney.nl/assets/interface-sounds · https://kenney.nl/assets/impact-sounds | `web/public/assets/kenney/fx/place.mp3` (`drop_002.ogg`), `ding.mp3` (`confirmation_001.ogg`), `remove.mp3` (`impactSoft_heavy_000.ogg`), mono MP3 64 kbit/s |
| Smoke Particles | Kenney | CC0 1.0 | https://kenney.nl/assets/smoke-particles | `web/public/assets/kenney/fx/puff.png` (`PNG/White puff/whitePuff08.png`), 128 × 128 px RGBA |
| Skyboxes 1.0 (14.07.2026) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/skyboxes | `web/public/sky/skybox-night.jpg` (aus `skybox-night.png`, auf 2048 × 1024 verkleinert, JPEG) |
| Foliage Sprites (08.02.2020) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/foliage-sprites | `web/public/foliage/grass-atlas.png` (Sprites 0001, 0002, 0003, 0004, 0011, 0012, 0016, 0018 aus `Kenny/Foliage/PNG/Flat`, zugeschnitten, als Atlas 4 × 2 zu je 256 px) |
| Forest Kit (14.07.2026) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets | `web/public/assets/kenney/forests/` (tree, tree-high, Textures/colormap.png; unverändert) |
| Survival Kit 2.0 (03.04.2024) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/survival-kit | `web/public/assets/kenney/survival/` (tree-tall, tree-autumn-tall, rock-a, rock-b, rock-c, Textures/colormap.png; unverändert). Neu für die Ruine (23.10.2026): barrel, floor-old, metal-panel, metal-panel-screws, resource-planks, structure-metal-wall (unverändert) |
| Fantasy Town Kit 2.0 (03.08.2025) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/fantasy-town-kit | `web/public/assets/kenney/town/` (tree-high, tree-high-round, tree-high-crooked, rock-small, rock-wide, rock-large, fountain-round-detail, lantern, stall-green, fence-gate, Textures/colormap.png; unverändert). Neu für die Ruine (23.10.2026): chimney, fence-broken, pillar-wood, planks, planks-half, roof-gable, roof-point, stairs-wood, wall-broken, wall-wood, wall-wood-broken, wall-wood-corner, wall-wood-doorway-square, wall-wood-half, wall-wood-side, wall-wood-window-shutters (unverändert) |
| Graveyard Kit (23.10.2026) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/graveyard-kit | `web/public/assets/kenney/graveyard/` (debris, debris-wood, fence-damaged, Textures/colormap.png; unverändert, aus `Kenny/Graveyard`). Neu für den LearnPass (26.10.2026): pumpkin, pumpkin-carved, detail-bowl, lantern-candle, candle-multiple, gravestone-round (unverändert). Nur für den LearnPass-Entwurf (27.10.2026, nicht im Spiel-Bundle): 12 Modelle und colormap.png unverändert unter `web/dev/mock-assets/kenney/`. Pass-Szenen (27.10.2026, A3, unverändert): altar-stone, bench-damaged, candle, character-ghost, character-keeper, character-skeleton, character-vampire, character-zombie, coffin, crypt-small, debris, detail-chalice, fire-basket, grave, grave-border, gravestone-round, hay-bale, hay-bale-bundled, iron-fence, iron-fence-border-column, iron-fence-border-gate, lantern-candle, lightpost-double, pine-fall-crooked, pumpkin-tall-carved, road, rocks, shovel-dirt, urn-round |
| Season I – Halloween (26.10.2026) | Auftraggeber (eigene Sammlung) | CC0 1.0 | – | `web/public/assets/season1/` (28 GLB: house-horror, warlock, witch, pumpkin-girl, clock-tower, dodge-pickup, 15× kit-*, jack-o-lantern-tree, spooky-pumpkin-cat, ghost-kitty, candy-pile, pumpkin-patch, graveyard-corner, fence-lamp; aus `Assets/Season I`, `Downloads` und dem Halloween-Set, decimiert/gebündelt, 512–2048 px WebP, meshopt; Details in `manifest.json`) |
| Nicht-Season-Shop (27.10.2026) | Auftraggeber (eigene Sammlung, `Assets/Season I/Nicht Season`) | CC0 1.0 (vom Auftraggeber bestätigt, 27.10.2026) | – | `web/public/assets/shop/` (6 GLB: cabin, beatall, toyoyo-highlight, president-car, trump-statue, white-house; decimiert, WebP-Texturen, meshopt; Details in `manifest.json`) |
| Halloween-Deko (27.10.2026) | Auftraggeber (Tripo-AI-Export, geliefert am 27.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz wie bei den übrigen Tripo-Modellen beim Auftraggeber | – | `web/public/assets/shop/chibi-trick-or-treater.glb` und `candy-cauldron.glb` (vereinfacht, 1024-WebP, meshopt; je eine 256-WebP-Fernversion; Maße und Preise in `manifest.json`) |
| Retro-Monitore (27.10.2026) | Auftraggeber (FBX-Dateien, geliefert am 27.10.2026) | Nutzung durch den Auftraggeber freigegeben; Quelle/Lizenz beim Auftraggeber | – | `web/public/assets/shop/monitor-01.glb`, `monitor-02.glb`, `monitor-05.glb`, `monitor-06.glb` (aus FBX importiert, mit `MasterMaterial1px.png`-Palette texturiert, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| CRT-Fernseher (27.10.2026) | Auftraggeber (FBX-Dateien und `MasterMaterial1px.png`, geliefert am 27.10.2026) | Nutzung durch den Auftraggeber freigegeben; Quelle/Lizenz beim Auftraggeber | – | `web/public/assets/shop/tv-crt-07.glb` und `tv-crt-09.glb` (aus FBX importiert, Palette texturiert, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Weitere Deko (27.10.2026) | Auftraggeber (GLB-Dateien, geliefert am 27.10.2026) | Nutzung durch den Auftraggeber freigegeben; **Marken-/Urheberrechte der Vorlagen (u. a. GTA 6, Thomas & Freunde) sind vor einer Veröffentlichung vom Auftraggeber zu klären** | – | `web/public/assets/shop/gta6-ps5-case.glb`, `gta6-phone-case.glb`, `cute-round-frog.glb`, `cute-fox.glb`, `blue-engine.glb` (optimiert, WebP-Texturen, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Farm & Figuren (28.10.2026) | Auftraggeber (GLB- und OBJ/MTL-Dateien, geliefert am 27./28.10.2026) | Nutzung durch den Auftraggeber freigegeben; **Markenrechte der Vorlagen (u. a. Vault Boy, iPhone) sind vor einer Veröffentlichung zu klären** | – | `web/public/assets/shop/mascot.glb`, `smartphone.glb`, `moai.glb`, `water-tower.glb`, `chicken-coop.glb`, `windmill.glb`, `barn.glb` (OBJ mit MTL-Farben, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Nicht verwendet (A2, 27.10.2026) | – | – | – | Tristar Racer, Landyroamer, DeLorean (Achsen/Größe), DAE-Häuser (Blender 5.2 ohne Collada-Import) und `the_halloween_cat` (nur Augen-Material) bleiben außerhalb des Katalogs; `web/tests/sql/asset-contract.test.ts` prüft, dass keine davon referenziert wird. |
| Food Kit 2.0 (26.06.2024) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/food-kit | `web/public/assets/kenney/food/` (apple, pumpkin, loaf-round, Textures/colormap.png; unverändert) |
| Nature Kit 2.1 (29.04.2020) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/nature-kit | `web/public/assets/kenney/nature/` (flower_red/purple/yellow A–C, path_stone, stone_smallFlatA–C; unverändert, Blumenfarben im Code auf LOOK-Blumenfarben gesetzt) |
| Junge und Mädchen (23.10.2026) | eigene Erstellung der Lehrkraft mit Tripo AI (Rig und Animationen walk, Catwalk, Tänze) | **Tarif/Lizenz bei Tripo prüfen** (Projektregel: nur CC0 oder eigene Modelle) | – | `web/public/assets/characters/girl.glb` und daraus gerendertes `girl.png`; ursprünglicher Junge am 26.10. ersetzt |
| Neuer Standard-Junge (26.10.2026) | Von der Lehrkraft geliefert: `../Assets/Characters/cartoon+boy+3d+model.glb`; Quelldatei unverändert | Lizenzstatus wie bisher: **Tarif/Lizenz bei Tripo prüfen** | – | Unveränderte Kopie als `web/public/assets/characters/boy.glb`; `boy.png` daraus gerendert. 9 Meshes, 65 Gelenke; Laufen, Catwalk und „froehliches springen hopsen“ als Jubel eingebunden. Weitere enthaltene Clips: cry, greet_03, swagger. |
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

## Software – QR-Zugangskarten

- qrcode-generator 1.4.4, Kazuhiko Arase, MIT. Quelle: https://github.com/kazuhikoarase/qrcode-generator. Nur im Lehrer-Bundle für gedruckte Zugangskarten; Lizenz: `web/node_modules/qrcode-generator/LICENSE`.


## Avatar-Kleiderschrank (26.10.2026)

| Inhalt | Herkunft und Verarbeitung | Rechte-/Quellenstand |
| --- | --- | --- |
| Modulare Figuren, vier Boy- und zwölf Girl-Artikel | Gelieferte Pakete Prototyp/StandardBoyShop und StandardGirlShop; Girl-r10-Base/Unterteile. Ziel web/public/assets/characters/wardrobe/. Animationsdaten aus den bisherigen Spielfiguren übernommen; Originalpakete unverändert. Farbshader und Bindungslogik aus den gelieferten Customizern in TypeScript integriert. | Wie bisher eigene Erstellung der Lehrkraft mit Tripo; Tarif-/Lizenznachweis weiterhin nicht neu bestätigt. |
| Girl-r10-Denimtexturen | Vom Nutzer gelieferte Vorder-/Rückseitenfotos, laut refinement/texture-provenance.json an UV-Projektion angepasst; normale/raue Texturkanäle abgeleitet. Nur ausgelieferte Kopien in der Auflösung reduziert. | Ursprüngliche Herkunftsnotiz im gelieferten Paket erhalten. |
| Rock-Anpassung | Eigene Exportkorrektur nur in der Spielkopie: stärkere Beinanbindung, bis zu 18 % Tiefenfreiheit am unteren Saum, korrigierte Normalen/Bounds; Bund und Rig erhalten. | Abgeleitetes Modell, Quellenstand wie Girl-Paket. |
| Offener Kleiderschrank | Nutzerdatei C:/Users/Thomas/Downloads/wooden wardrobe 3d model.glb; Referenz mit integriertem Imagegen erzeugt, Modell vom Nutzer mit Tripo erstellt. Texturen der Spielkopie reduziert; Geometrie unverändert. | Vom Nutzer bereitgestellt; Tripo-Lizenzstatus wie oben. Ziel assets/wardrobe/wardrobe.glb. |
| Runder Teppich | Nutzerdatei C:/Users/Thomas/Downloads/round+decorative+rug+3d+model.glb; Referenz mit integriertem Imagegen erzeugt, Modell vom Nutzer mit Tripo erstellt. Texturen der Spielkopie reduziert; Geometrie unverändert. | Vom Nutzer bereitgestellt; Tripo-Lizenzstatus wie oben. Ziel assets/wardrobe/rug.glb. |
| Zimmerwände, Boden, Licht, UI und Blur | Eigene Geometrie und Code; kein fremdes Raum-Asset. Referenzbilder und Prompts liegen unter blender/sources/references/. | Eigene Erstellung. |


## Profilrahmen und Level-Medaillen (27.10.2026)

- Kenney **Medals 1.1**, CC0: kreisrunde Medaillengeometrie aus `Kenny/Medals/Vector/medals_vector.svg`, für die sieben bestehenden Levelstufen eingefärbt und um gut lesbare Levelzahlen ergänzt. Quelle: https://kenney.nl/assets/medals
- Kenney **UI Pack – Adventure 1.1**, CC0: Rahmen aus `Kenny/UI 2/Vector/panel_border_brown.svg`, mit transparentem Portraitausschnitt und vorhandenen Rangfarben. Quelle: https://kenney.nl/assets/ui-pack-adventure
- Abgeleitete Vektorpfade: `content/ui/awards-artwork.json`; mitgelieferte Original-Lizenztexte: `web/public/assets/kenney/profile/LICENSE-medals.txt` und `LICENSE-adventure.txt`. Bestehende Freischalt-IDs bleiben erhalten.


## Neue Rangschilde und Avatarrahmen (27.10.2026)

Die aktuell verwendeten Rangschilde und runden Avatarrahmen sind eigene SVG-/Canvas-Vektorgrafiken in `web/src/ui/rankArtwork.ts`. Die vom Nutzer bereitgestellten Vecteezy-/Rahmenbilder dienen als Stilreferenz für gesättigte Farben, metallische Facetten, Kronen, Flügel und Edelsteine. Keine Bildausschnitte oder Vektordaten dieser Referenzen werden ausgeliefert. Die zuvor abgeleiteten Kenney-Grafiken werden für Profilrahmen und Rangabzeichen nicht mehr verwendet; deren Quellen/Lizenzen bleiben als Herkunftsverlauf dokumentiert.

Die Titelplaketten (27.10.2026) sind ebenfalls eigene Vektorgeometrien in `rankArtwork.ts`; die vom Nutzer gelieferten Plakettenbilder dienen ausschließlich als Stilreferenz. Keine Bilddaten dieser Referenzen werden ausgeliefert.


## Hinweis-Pfeil der Questtafel (27.10.2026)

Kenney UI Pack 2.0, CC0: `Kenny/UI/Vector/Yellow/arrow_decorative_s.svg`, unverändert als `web/public/assets/kenney/ui/quest-arrow.svg` ausgeliefert. Original-Lizenz unter `web/public/assets/kenney/ui/LICENSE.txt`. Quelle: https://kenney.nl/assets/ui-pack
Die goldene Tafelkontur und der Hinweis-Button sind eigene Geometrie/UI. Der Sir-Byte-Button verwendet das bereits vorhandene Portrait `assets/sir-byte/preview.png`.

## Halloween-Welt und Event-Shop (27.10.2026)

- Neue Blutmond-/Halo-/Nebel-/Brunnen-/Deko-Geometrie und Ticket-SVG sind eigene Lerndorf-Gestaltung nach der freigegebenen Referenz unter `Prototyp/marktplatz/`. Kein neues Drittanbieterpaket installiert.
- Kürbisse, Grabstein und Gruselfiguren verwenden vorhandene Kenney-Graveyard-Assets (CC0), siehe bestehende Kenney-Quellen in dieser Datei und `web/public/assets/kenney/graveyard/LICENSE.txt`. Aufgelistete tatsächlich verwendete Modelle: pumpkin-carved, gravestone-round, character-zombie, character-skeleton, character-vampire, character-keeper.
- `web/public/assets/halloween/halloween-shop-event.glb` ist das vom Nutzer ausdrücklich zur Verwendung beauftragte Ensemble aus seinen drei gelieferten GLBs (Halloween-Shop, nur die größte Halloween-Katze und Candy Cauldron davor). Keine CC0-Angabe für diese Fremdmodelle bekannt; keine eigene CC0-Erklärung für deren Geometrie/Texturen. Quellen, SHA-256-Hashes und Ableitung unter `Prototyp/marktplatz/sources/season-starter/LICENSES.md`, Runtime-Metadaten in `web/public/assets/halloween/credits.json`.
- Die Originale und der benchte eigene Stand bleiben im Prototyp erhalten. Runtime-Maps des Event-Shops maximal 1.024 px; 19.818 Dreiecke, drei Material-Primitives. Kein automatischer Loot-/Shop-Katalogeintrag durch die Weltdekoration.
