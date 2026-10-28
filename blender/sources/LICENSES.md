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
| Farm & Figuren (28.10.2026) | Auftraggeber (GLB-, OBJ/MTL- und FBX-Dateien, geliefert am 27./28.10.2026) | Nutzung durch den Auftraggeber freigegeben; **Markenrechte der Vorlagen (u. a. Vault Boy, iPhone) sind vor einer Veröffentlichung zu klären** | – | `web/public/assets/shop/mascot.glb`, `smartphone.glb`, `moai.glb`, `water-tower.glb`, `chicken-coop.glb`, `windmill.glb`, `barn.glb`, `well.glb` (OBJ mit MTL-Farben bzw. FBX-Import, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Auto-Paket (28.10.2026) | Auftraggeber (Designersoup Low Poly Car Pack Vol. 1, FBX + `.fbm`-Texturen, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/beatall.glb`, `toyoyo-highlight.glb`, `delorean.glb`, `landyroamer.glb`, `tristar.glb` (texturiert, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Auto-Varianten (28.10.2026) | Auftraggeber (OBJ/MTL und Texturfarben, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/car5*.glb` und `car8*.glb` (rot/grün/grau, Polizei/LA, Lieferwagen grau/Post/lila; OBJ-Import mit Texturen, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Weitere Autos (28.10.2026) | Auftraggeber (OBJ/MTL und Texturfarben, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/car2.glb`, `car2-black.glb`, `car2-red.glb`, `car6.glb` (Limousinen und Kombi; OBJ-Import mit Texturen, meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Fast-Food-Schild (28.10.2026) | Auftraggeber (GLB, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; **Markenrechte der abgebildeten Ketten (McDonald's, Chick-fil-A) sind vor einer Veröffentlichung zu klären** | – | `web/public/assets/shop/fast-food-sign.glb` (meshopt; Fernversion; Maße und Preis in `manifest.json`) |
| Familienhaus (28.10.2026) | Auftraggeber (FBX + „Houses Colorscheme 3“-Palette, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/family-house.glb` (FBX-Import, 32×32-Palette als `tiny_treats_texture_1.png` eingesetzt, meshopt; Fernversion; Maße und Preis in `manifest.json`) |
| Weitere Häuser (28.10.2026) | Auftraggeber (GLB-Dateien, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/low-poly-house.glb` und `neuschwanstein.glb` (meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Hauspaket 2 (28.10.2026) | Auftraggeber (GLB-Dateien, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/panel-house.glb`, `forest-cabin.glb`, `classroom.glb`, `house-3.glb`, `home-1.glb`, `home-2.glb` (meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Wahrzeichen (28.10.2026) | Auftraggeber (GLB-Dateien, geliefert am 28.10.2026) | Nutzung durch den Auftraggeber freigegeben; Lizenz beim Auftraggeber | – | `web/public/assets/shop/burj-khalifa.glb` (von 661k auf 39k Dreiecke reduziert, unlit, damit die Glasfassade ohne Umgebungskarte sichtbar bleibt), `empire-state.glb`, `church.glb` (meshopt; je eine Fernversion; Maße und Preise in `manifest.json`) |
| Nicht verwendet (A2, 27.10.2026) | – | – | – | DAE-Häuser (Blender 5.2 ohne Collada-Import) und `the_halloween_cat` (nur Augen-Material) bleiben außerhalb des Katalogs; `web/tests/sql/asset-contract.test.ts` prüft, dass keine davon referenziert wird. Die früher fehlerhaften Autos (Tristar, Landyroamer, DeLorean) sind seit dem FBX-Import vom 28.10. im Shop. |
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

## Musik und Klänge (28.10.2026)

| Datei | Herkunft | Lizenz | Verwendung |
| --- | --- | --- | --- |
| `web/public/assets/audio/music/mischief-managed-loop.mp3` | vom Auftraggeber geliefert („Mischief_Managed_loop.mp3“) | Nutzung durch den Auftraggeber freigegeben; Quelle/Lizenz beim Auftraggeber, **vor Veröffentlichung bestätigen** | Hintergrundmusik im Dorf |
| `web/public/assets/audio/music/quiz-thinking-loop.mp3` | vom Auftraggeber geliefert | wie oben | Musik in Quizfenstern |
| `web/public/assets/audio/sfx/success.mp3`, `error.mp3` | vom Auftraggeber geliefert | wie oben | richtige/falsche Antwort |
| `web/public/assets/audio/sfx/dialog-blip.mp3` | vom Auftraggeber geliefert („Dialog_blip-131856“, vermutlich Pixabay) | wie oben | neue Sprechblase |
| `web/public/assets/audio/sfx/dialog-typing.mp3` | vom Auftraggeber geliefert | wie oben | Tippgeräusch bei Zeilen ohne Aufnahme |
| `web/public/assets/audio/sfx/chest-open.mp3`, `level-up.mp3` | vom Auftraggeber geliefert („LockChime_2.wav“, „LockChime_1.wav“), in MP3 umgewandelt | wie oben | Truhe öffnen, Level-up (die Kenney-Klänge bleiben im Repo) |
| `web/public/assets/audio/sfx/victory-fanfare.mp3` | eigene Komposition, synthetisch erzeugt mit `web/scripts/audio/make-victory-fanfare.py` (keine Samples) | CC0 | großes „Success!“ am Ende der Daily Quests und des Spooky English Quiz |

## Schrift „Creepster“ (28.10.2026)

| Datei | Herkunft | Lizenz | Verwendung |
| --- | --- | --- | --- |
| `web/public/fonts/Creepster-Regular.woff2` | Font Diner, Inc. (über Fontsource 5.3.0, Teilmenge latin) | SIL Open Font License 1.1, Text in `web/public/fonts/Creepster-OFL.txt` | Titel und Ergebnis im Spooky English Quiz; lokal ausgeliefert, kein Abruf bei Google |

## Ollies 14 normale Shop-Waren (28.10.2026)

- Katalogvertrag: `content/shop/ollie-items.json`; Inhaltsmigration `0054_ollie_shop_items.sql`. Ausschließlich normale kaufbare Waren in den bestehenden Kinds `deco`, `house`, `garage`; keine neuen Besitz-/Münzsysteme.
- Neun tatsächliche Produktformen aus `Prototyp/shop/models.mjs` per Three.js GLTFExporter 0.170.0 exportiert. Eigene prozedurale CC0-Geometrie: Bank, Blumenbox, Bücherregal, Eiche, Holzente, kleines Häuschen sowie die Kiste um die Kenney-Äpfel. Kenney Fantasy Town Kit 2.0: Laterne; Kenney Survival Kit: rotes Fass; Kenney Food Kit: Äpfel, jeweils CC0 1.0. Quelle: https://kenney.nl/ . Texturmaterialien in den GLBs eingebettet; keine fremden Modelle hinzugefügt.
- Fünf r05-Exporte unverändert aus `Prototyp/hauswerkstatt/assets/models/`: Apfelgiebel, Mooswinkel, Laternenhaus, Apfelgarage und Mooswerkstatt. Eigene Hauptgeometrie und CC0-Fantasy-Town-Module von Kenney, gemäß `Prototyp/hauswerkstatt/BRIEF.md`; keine Modelle aus den nicht als CC0 belegten anderen Paketen. Editierbare r05-Blenderquellen verbleiben unverändert in `Prototyp/hauswerkstatt/sources/`.
- Ziele: `web/public/assets/shop/`; die 14 Dateipfade, SHA-256-Hashes, Vollabmessungen und Dreieckszahlen stehen in `ollie-audit.json`. Beigefügte Lizenztexte `LICENSE-ollie-own.txt`, `LICENSE-ollie-kenney-town.txt`, `LICENSE-ollie-kenney-survival.txt`, `LICENSE-ollie-kenney-food.txt`. Keine CC0-Neuklassifizierung anderer vorhandener Shop-Assets.
- Reproduzierbarer Export: `web/scripts/export-ollie-items.mjs`; optionale visuelle Übersicht `content/shop/ollie-contact-sheet.png`. Prototypquellen bleiben schreibgeschützt. Alle Modelle behalten ihren entworfenen Metermaßstab und passen einschließlich Überständen in bestehende Slots; 158 bis 3.819 Dreiecke, keine künstliche Vergrößerung der Deko auf 3 × 3 m.

## Ollie-Händler, Stand und Shop-Klänge (28.10.2026)

- `web/public/assets/shopkeeper/ollie-shopkeeper.glb`: eigenes prozedurales CC0-Modell, unverändert aus `Prototyp/shop/assets/own/ollie-shopkeeper.glb`; bearbeitbare Quelle `Prototyp/shop/models.mjs:createOllie`, Rechtevermerk `Prototyp/shop/LICENSES.md`. SHA-256 `1048adfe9dfe51617a32350d223feb9966e33ef7cf35d5a9ca5e23e34875359c`; 628 Dreiecke, sechs Materialien. Benannte Animationsknoten bleiben erhalten.
- `web/public/assets/shopkeeper/ollie-portrait.png`: eigener transparenter Offline-Render desselben CC0-Modells mit Blender 5.2/Cycles, 768 × 768; kein Bildgenerierungsdienst. Einzelheiten, Hash und Quellen unter `web/public/assets/shopkeeper/credits.json`; Lizenztext `shopkeeper/LICENSE.txt`.
- Ollies Laufzeit-Stand verwendet bereits vorhandene Kenney-CC0-Assets über den gemeinsamen Cache: Fantasy Town Kit 2.0 (`stall-green.glb`, `lantern.glb`), Survival Kit (`barrel.glb`) und Food Kit (`apple.glb`, `loaf-round.glb`). Quelle https://kenney.nl/ ; vorhandene Paket-Lizenztexte bleiben maßgeblich. Händler und öffentliche Standausstattung sind keine Verkaufsartikel.
- Zehn gelieferte OGGs aus Cozy UI SFX Lite von friedspin unter `web/public/assets/audio/ollie-ui/`. **Nicht CC0**: proprietäre, gebührenfreie Lizenz erlaubt Nutzung/Bearbeitung und Einbettung in eigene Spiele/Apps, verbietet die Weitergabe der Rohdateien als eigenständiges Soundpaket, Soundbibliothek, Assetpack oder Template sowie Content ID und fremde Urheberschaftsbehauptungen. Vollständiger gelieferter Text unter `web/public/assets/audio/ollie-ui/LICENSE.txt`; Credit **SFX by friedspin** erhalten. Nur die verwendeten Effekte werden als Teil der Anwendung ausgeliefert.
- Aktualisierung auf Nutzerauftrag vom 28.10.2026: zwölf lokale Ollie-Sprachaufnahmen, sechs Dialoge je Sprache (en/de), mit ElevenLabs **Charlie** (`IKne3meq5aSn9XLyUdCD`), `eleven_multilingual_v2`. 989 Textzeichen aus dem vorhandenen Kontingent, kein Zukauf. Eigene Dialogtexte; synthetische Audios nach den für das Konto geltenden ElevenLabs-Bedingungen, **nicht als CC0 ausgewiesen**. Quelle/Parameter/Texte/Hashes: `web/public/assets/shopkeeper/voice/manifest.json`, Generierung: `web/scripts/audio/generate-ollie.mjs`, Inhaltsquelle: `content/shop/ollie-voice.json`. Im Spiel ausschließlich lokale MP3s; kein API-Schlüssel im Client und keine Laufzeit-TTS-Anfragen. Das ändert den Lizenzstatus der friedspin-Effekte nicht.

## Ollies Reisequest: New-York-Souvenir und Sprache (28.10.2026)

- `web/public/assets/shop/ollie-nyc-postcard.glb` und `.lod.glb`: eigenes stilisiertes CC0-Postkartenmodell mit Skyline, NY-Schriftzügen und Sockel; keine fremden Bilder oder Texturen. Quelle `web/scripts/assets/build-ollie-souvenir.mjs`; 408 Dreiecke, ein Vertexfarben-Material. Maße und SHA-256 in `content/quests/ollie-souvenir-audit.json`; Lizenztext `web/public/assets/shop/LICENSE-ollie-nyc-postcard.txt`.
- `web/public/assets/shopkeeper/story-voice/*.mp3`: 14 einmalig auf Nutzerauftrag erzeugte englische ElevenLabs-Charlie-Aufnahmen (`eleven_multilingual_v2`), 1.646 Textzeichen, eigene Geschichte/Dialogtexte. Synthetische Audios nach ElevenLabs-Kontobedingungen, nicht als CC0 ausgewiesen. Privates Quellen-/Hash-/Dekodierungsmanifest `content/quests/ollie-story-audio.json`; Erzeugung `web/scripts/audio/generate-ollie-story.mjs`. Keine Laufzeit-TTS-Anfragen, keine API-Schlüssel oder Lösungsmanifeste im Client.

## Empire-State-Souvenir aus gelieferter NYC-GLB (28.10.2026)

- Original `C:/Users/Thomas/Downloads/new_york_buildings.glb`: laut eingebetteten `asset.extras` **New York Buildings** von **sumitmangela** (https://sketchfab.com/sumitmangela), Quelle https://sketchfab.com/3d-models/new-york-buildings-e7922fe0f7b14ed786f84529f9217dac, **CC BY 4.0** https://creativecommons.org/licenses/by/4.0/ . Die ausdrückliche Nutzeranweisung zur Verwendung dieser Datei gilt für dieses gelieferte Asset; keine CC0-Umdeklarierung.
- Änderungen: ausschließlich `emp_state._final_14` / `Object_28` als Empire State Building exportiert; X/Z zentriert, Unterkante auf Y=0, proportional auf 1,80 m Höhe verkleinert. Alle anderen Gebäude sind nur in der editierbaren Quelle ausgeblendet, nicht gelöscht. Keine fremden neuen Texturen, Originalmaterial/512×512-Textur erhalten.
- Ziele `web/public/assets/shop/ollie-empire-state.glb` und `.lod.glb`; 1368 Dreiecke, ein Material, 454572 Bytes je GLB. Öffentliche Attribution einschließlich Änderungen unter `LICENSE-ollie-empire-state.txt` und neben den 3D-Vorschauen. Quelle, genauer Lizenznachweis, native Blender-Datei, Maße/Hashes/Reviews: `content/quests/empire-source/`. Erzeugung `web/scripts/assets/extract-ollie-empire.py`.
- Das alte eigene Postkartenmodell bleibt als CC0-Archiv erhalten; die bestehende Reward-ID wird für das neue Souvenir weiterverwendet. Sie erzeugt keinen zweiten Besitz-/Shopartikel und keine zusätzliche Belohnungsvergabe.
