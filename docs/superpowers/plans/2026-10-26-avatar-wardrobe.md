# Avatar-Kleiderschrank – Umsetzungsplan für Lerndorf

> **Ausführung:** Ein Agent, sequenziell mit `executing-plans`; keine Subagents. Jeden Abschnitt erst nach dessen Prüfungen abschließen. Dieser Plan ist noch nicht ausgeführt.

**Ziel:** Über das Hausmenü eine eigene Zimmer-Szene öffnen, gekaufte Kleidung und Accessoires direkt an der drehbaren Figur anprobieren und den bestätigten Look im ganzen Lerndorf zeigen.

**Architektur:** Gemeinsamer typisierter Look-Vertrag für beide Figuren; modularisierte, weiterhin animierte Charaktere; ein Editor-Renderer bei pausiertem Dorf. Autorisierter Besitz und gespeicherter Look bleiben in Supabase, Vorschauzustände lokal.

**Technik:** Vorhandenes TypeScript strict, Vite, Three.js **0.170.0**, Supabase/PostgreSQL, Vitest/PGlite und Playwright. Kein neues UI-Framework, kein kostenpflichtiger Dienst.

**Designgrundlage:** [Avatar-Kleiderschrank](../specs/2026-10-26-avatar-wardrobe-design.md). Ausgangspunkt der Prüfung: lokaler Commit `f7502e2`, 848 Tests, neue Jungenfigur bereits eingebunden.

## Verbindliche Grenzen

- Nutzerauftrag: eigener Raum mit offenem Schrank, unscharfer Hintergrund, scharfe drehbare Figur, moderne direkte Tablet-Bedienung, nur besessene Teile anziehen.
- `Prototyp/StandardBoyShop`, `Prototyp/StandardGirlShop`, `Konzept` und Quelldateien nur lesen. Neue oder angepasste Exporte ausschließlich in neue Arbeits-/Zielpfade schreiben.
- Nur eigene/CC0-Inhalte; vorhandene Herkunft in `blender/sources/LICENSES.md` ergänzen. Keine neuen externen Accounts oder Generierungsdienste.
- Münzen/Besitz/Aussehen nur über geprüfte RPCs verändern; Klassen-/Rollen-Grenzen beibehalten. Keine echten Schülerdaten in Tests.
- Die Planung allein führt keine Migration und kein Deployment aus. Vor späterem Live-Schritt den bereits bestehenden Stand einschließlich 0022 prüfen; Migration 0023 nicht als bereits angewendet darstellen.
- Interface auf Deutsch, Code und Kommentare auf Englisch. Keine technischen Rig-/Shader-Begriffe im Schüler-UI.
- Vor jedem lokalen Commit passende Tests und Diff prüfen. Zum Gesamtabschluss Tests, Build, Lint, echte WebGL-Sichtprüfung und Dorf-Galerie. Kein grüner Abschluss allein aufgrund der mitgelieferten Audit-JSONs.

## Dateien und Zuständigkeiten

| Neu | Verantwortung |
| --- | --- |
| `content/avatar/wardrobe.json` | Ein geprüftes Importmanifest: kanonische IDs, Runtime-IDs, Figur, Slot, Konflikte, Quelle, Thumbnail, geplanter Preis |
| `blender/scripts/prepare_wardrobe.py` | Reproduzierbarer, nicht destruktiver Zusammenbau der modularen Bases mit den bisherigen Animationsclips |
| `web/scripts/audit-wardrobe.mjs` | Export-/Katalog-/Dateipfadprüfung einschließlich Clips, Farbkanälen und Revisionen |
| `web/public/assets/characters/wardrobe/{boy,girl}/` | Ausgewählte neue Exporte, lokale Kataloge, Zubehör und PNGs; keine alten ZIPs oder Blend-Dateien ausliefern |
| `web/src/avatars/look.ts` | Persistenztypen, reine Normalisierung/Validierung, Slot-/Konflikt- und Farbregeln |
| `web/src/avatars/catalog.ts` | Typisierter Asset-Katalog und Zuordnung DB-ID → Runtime-Asset |
| `web/src/avatars/customizer.ts` | Gemeinsame Runtime mit getrennten Hilfen für Materialfarben und Kleidungsbindung |
| `web/src/avatars/materialColors.ts`, `clothingBinding.ts` | Shader-Anpassung beziehungsweise Skeleton-Rebinding ohne UI-Abhängigkeit |
| `web/src/api/wardrobe.ts` | Laden und RPC-Speichern, Fehlermeldungen und Serverantworten |
| `web/src/render/wardrobeRoom.ts`, `wardrobeStage.ts` | Generisches Zimmer/Blur-Cache sowie Figur, Kamera, Drehung und Ressourcenbesitz |
| `web/src/ui/wardrobeView.ts`, `wardrobe.css` | Vollbildansicht, Entwurf, Kategorien, Karten, Farben und Speicherablauf |
| `supabase/migrations/0023_avatar_wardrobe.sql` | Serverkatalog, Paletten, geschütztes Look-Speichern und Kauf-/Legacy-Anpassungen |
| `web/dev/wardrobe.html`, `wardrobe.ts` | Deterministische Testseite mit realen GLBs und simulierten Daten/Fehlern |
| `web/tests/avatar/`, `web/tests/sql/wardrobe.test.ts`, `web/tests/ui/wardrobeView.test.ts`, `web/e2e/wardrobe.spec.ts` | Reine Regeln, Servergrenzen, Bedienzustände und tatsächliche Render-/Touch-Prüfung |

Bestehende Integrationspunkte: `render/character.ts`, `render/crowd.ts`, `render/portrait.ts`, `api/village.ts`, `api/economy.ts`, `api/items.ts`, `render/itemThumbs.ts`, `ui/{houseMenu,gameNav,areas,villageView,shopView,itemDetail,avatarBadge,frames,readOnlyScene}.ts` und deren Tests. Nur tatsächlich benötigte Stellen ändern; keine allgemeine Neuordnung dieser Module.

## Gemeinsamer Vertrag vor der Umsetzung

```ts
type AvatarSlot = 'headwear' | 'hair' | 'face' | 'necklace'
  | 'back' | 'bag' | 'wrist' | 'bottoms';
type ColorChannel = 'hair' | 'skin' | 'shoes' | 'bottoms' | 'top';
interface AvatarLook {
  items: string[]; // canonical items.id; stable sorted serialization
  colors: Partial<Record<ColorChannel, string>>;
}
interface WardrobeState {
  v: 1;
  revision: number;
  boy: AvatarLook;
  girl: AvatarLook;
}
interface WardrobeData {
  character: CharacterKind;
  wardrobe: WardrobeState;
  ownedIds: string[];
  allowedColors: Partial<Record<ColorChannel, readonly string[]>>;
}
interface WardrobeApi {
  load(): Promise<Outcome<WardrobeData>>;
  save(character: CharacterKind, look: AvatarLook, expectedRevision: number):
    Promise<Outcome<WardrobeData>>;
}
interface AvatarCustomizer {
  applyLook(look: AvatarLook): Promise<void>;
  equip(itemId: string): Promise<boolean>;
  unequip(slot: AvatarSlot): void;
  setColor(channel: ColorChannel, color: string | null): void;
  getLook(): AvatarLook;
  dispose(): void;
}
```

`CharacterKind` bleibt der bestehende Typ. `Outcome` bleibt der vorhandene Ergebnis-Typ aus `api/economy.ts`. `save` aktualisiert den lokalen Zustand aus der vollständigen bestätigten Antwort; auf Fehler bleibt der Entwurf erhalten. `applyLook` validiert erst den ganzen Look und verändert die sichtbare Figur erst nach erfolgreichem Laden. Prototyp-Feld `version` und Runtime-IDs werden am Adapter übersetzt, nicht ungeprüft als neues Datenformat gespeichert.

## AP A1 – Asset-Paket und Animationen belastbar vorbereiten

**Dateien:** Importmanifest, Export-/Auditskripte, neue Asset-Zielordner, `web/tests/render/characterAssets.test.ts`, `web/src/render/character.ts`, Quellenverzeichnis.

- [ ] Manifest mit allen 16 Teilen aus der Designtabelle anlegen. Kanonische IDs nach `avatar_<boy|girl>_<runtime-id mit Unterstrichen>` bilden. Ausdrückliche Figur-/Slot-/Konfliktzuordnung, keine Ableitung der Berechtigung allein aus dem Dateinamen.
- [ ] Einen Dateiprüfer schreiben: Quellen vorhanden, alle Katalogpfade relativ und innerhalb des jeweiligen Pakets, eindeutige IDs, vorhandene Thumbnails, gültige 4×4-Matrizen bei starren Teilen, keine solche Matrix bei `binding: skinned`.
- [ ] Asset-Tests zuerst gegen den aktuellen Stand ergänzen: neue Bases brauchen alle `CLIP_NAMES[kind]` und Farb-Metadaten; Boy braucht beide Kopfvarianten. Der bisherige Stand muss diese neuen Anforderungen noch verfehlen.
- [ ] Boy `standardboy-customizable.glb` und Girl `standardgirl-customizable-r10.glb` als modulare Ausgangsbases nehmen. Für Girl r10-Dateien aus `refinement/` zu konsistenten Zielpfaden kopieren und Katalog umschreiben; nicht versehentlich r08 über die Demo-Auswahl übernehmen.
- [ ] Bisherige animierte `boy.glb`/`girl.glb` als Clip-Spender verwenden. Je Gelenk Namen, Eltern, lokale/absolute Resttransformation und inverse Bind-Matrizen numerisch vergleichen (Toleranz 1e-4 in Quell-Einheiten); Quaternion-Vorzeichen äquivalent behandeln. Importer-Hilfsobjekte aus Bounds ausschließen. Keine Kompatibilität nur aus „65 Bones“ ableiten.
- [ ] Exportskript in leerer Blender-Arbeitsdatei ausführen. Nur bei kompatibler Bind-Pose Aktionen über benannte Pose-Bones auf die modulare Armature übertragen; Varianten, Material-Extras und Gewichte erhalten. Wenn die Prüfung scheitert, die Bindung im neuen Export korrigieren, keinen globalen Faktor 1,1585 einbauen. Keine vorhandene Prototyp-Blend-Datei überschreiben.
- [ ] Für jede Figur ein versioniertes `character.glb` mit Basis, Varianten und benötigten Clips exportieren; Zubehör separat. `character.ts` aus einem expliziten Asset-Manifest laden lassen. Sichtbarer Standardkopf bleibt ohne Kappe das lange Originalhaar. Figurhöhe anhand sichtbarer Standard-Basis **vor** Zubehör normalisieren; Varianten nicht doppelt in Bounds zählen.
- [ ] Über die reale lokale WebGL-Prüfseite laufen lassen: Höhe 1,64 m, Bodenposition, Laufgeschwindigkeit, Catwalk und Jubel; kein eingefrorener Avatar. GLB-Import- und Fehlermeldungen prüfen.
- [ ] r10-Jeans-Texturen/Geometrie gezielt verkleinern, falls nötig; Originale erhalten. Datei-/Dreiecks-/Materialkosten je Base und Teil protokollieren. Vorschaubilder aus den endgültigen Exporten rendern. Keine automatische Qualitätsfreigabe anhand von Polygonzahlen.
- [ ] Herkunft einschließlich der vom Nutzer gelieferten Denim-Fototexturen und abgeleiteten Exporte in `LICENSES.md` festhalten. Bestehenden unbestätigten Lizenzstatus nicht als geklärt umschreiben.

**Prüfung:** In `web/`: `node scripts/audit-wardrobe.mjs`, `npx vitest run tests/render/characterAssets.test.ts`, danach echte WebGL-Bilder. Erwartet: vollständige Clips/Farbkanäle/Pfade, keine Bindungsfehler, unveränderte Identität beider Figuren. Erst dann Integrationspaket lokal committen.

## AP A2 – Gemeinsame Look-Runtime statt zwei Demo-Sonderfälle

**Dateien:** `src/avatars/{look,catalog,customizer,materialColors,clothingBinding}.ts`; Tests unter `tests/avatar/`.

- [ ] Reine Tests für doppelte Slots, symmetrische Kopf-/Haar-Konflikte, fremde Figur, unbekannte IDs/Farben sowie stabile Serialisierung schreiben; fehlschlagenden Lauf beobachten.
- [ ] `normalizeLook`, `validateLook`, `equipInLook` und `unequipInLook` implementieren. `validateLook` erhält Katalog, Figur, Besitz und Paletten explizit; keine Netzwerkzugriffe. Leerer Look ist vollständig bekleidete Grundausstattung. Konflikte werden anhand des Katalogs als ungerichtete Beziehung ausgewertet.
- [ ] Gemeinsamen `AvatarCustomizer` implementieren. Bewährte Mathematik aus den Demos übernehmen; Boy-/Girl-Kanalnamen über Konfiguration übersetzen (`bottoms` → `pants`, Girl `top` → `tshirt`). Keine freie URL oder Shaderoption aus dem gespeicherten Look akzeptieren.
- [ ] Starre Teile am normalisierten Bone befestigen, `attachmentMatrix` vorher anwenden und Frustum-Culling für animierte Zubehörteile ausschalten. Verifizierte Transformationsreihenfolge nicht neu erraten.
- [ ] Geriggte Kleidung über benannte Bones an das **bereits vorhandene** Skelett binden. Exportierte inverse Bind-Matrizen und Bind-Matrix erhalten; nicht aus der gerade laufenden Pose neu berechnen. Importierte zusätzliche Knochen entfernen. Nach Ablegen Originalmeshes wiederherstellen.
- [ ] Materialinstanzen und Farbuniforms isolieren; Körper-/Augendetails erhalten. Variantensichtbarkeit als Ergebnis des gesamten gültigen Looks berechnen, damit mehrere hide/show-Regeln nicht beim Ablegen anderer Teile überschrieben werden.
- [ ] Lade-Rennen mit Generationstoken lösen: neueste Slot-Auswahl gewinnt; Konfliktwahl bricht auch noch ladende Gegen-Slots ab. Beispieltest: langsame Haarclips, danach schnelle Kopfhörer → am Ende nur Kopfhörer. Bei fehlendem Asset bisheriges Teil behalten.
- [ ] `applyLook` als validierten Lade-/Commit-Vorgang behandeln, damit ein Fehler nicht einen halben neuen Look hinterlässt. `dispose()` während des Ladens blockiert spätes Einsetzen und gibt nur eigene Ressourcen frei; gemeinsam gecachte Geometrien/Texturen bleiben nutzbar.

**Konkrete Testfälle:** Ein zweiter Avatar bleibt nach Umfärben unverändert; Kappe an/aus wechselt Kopfvariante; Jeans → Rock → Original stellt Cargo wieder her; bereits laufender Walk bewegt Kleidung weiter; Anwendung eines kaputten Looks erhält bisherigen Look; wiederholtes Dispose ist harmlos. `npx vitest run tests/avatar` muss grün sein. Lokaler Commit.

## AP A3 – Besitz, Paletten und atomare Persistenz

**Dateien:** Migration 0023, `tests/sql/wardrobe.test.ts`, `src/api/wardrobe.ts`, `tests/api/wardrobe.test.ts`; Anpassungen bestehender Legacy-/Kauftests.

- [ ] Vorher neueste lokale Migration prüfen; 0022 nicht überschreiben. PGlite-Testaufbau nach vorhandenem SQL-Testmuster mit vollständiger Migrationsreihenfolge verwenden.
- [ ] Rote SQL-Tests schreiben: ungekauftes Teil, fremde Figur, ungültiger Slot/Konflikt, falsche Palette, Lehrer/anon, Revisionskonflikt und Verlust von `avatar.character`. Positivfall gekauftes Teil sowie Starter ohne Inventarzeile.
- [ ] `avatar_parts(item_id text primary key references items(id), character text, runtime_id text, slot text, conflicts text[])` mit strikten Figur-/Slot-Checks und eindeutiger `(character,runtime_id)` anlegen. Katalogdaten aus A1-Manifest als migrationsfeste Werte seed-en. RLS: authentifiziert lesbar; keine direkten Client-Schreibrechte. Konflikt-IDs referenzieren kanonische Artikel-IDs.
- [ ] Neue Artikel unter `items.kind='avatar'`, passende Slots, Preise aus Design, `starter=false`, `active=true`, `shop_visible=true` anlegen. Unmodellierte alte Avatar-Artikel nicht löschen oder umetikettieren; für weitere Käufe `shop_visible=false` setzen. Vorhandene Inventarzeilen erhalten.
- [ ] `settings.avatar_skin_palette` mit natürlichen Hauttönen ergänzen (`#f2c9a5`, `#d9a477`, `#ba8055`, `#8a5738`, `#5c3826`). Vorhandene `avatar_palette` für andere unterstützte Kanäle verwenden; Originaltönung durch fehlenden Schlüssel darstellen. Boy-`top` auch serverseitig ablehnen.
- [ ] `save_avatar_look(p_character text, p_look jsonb, p_expected_revision integer)` als `security definer set search_path=public` bauen. Schülerprofil `for update` sperren; aktuellen Figurentyp/Revision prüfen; nur `items` und `colors` in der zulässigen Form erlauben; Obergrenze acht unterschiedliche Items; Item-/Farbwerte typisieren und vollständig prüfen. Nur aktiver kompatibler Starter oder eigener Besitz mit `qty>0` gilt.
- [ ] Nur `avatar.wardrobe[character]` ersetzen, Revision erhöhen und übriges Avatar-JSON unverändert erhalten. Bei Fehler keine Teiländerung. Rückgabe enthält Figur, beide Looks, neue Revision und keine fremden Besitzdaten. `api.save` ergänzt/erneuert eigenes Inventar und Paletten über dieselben Leser wie `load`.
- [ ] Altes `save_avatar` härten: erlaubte Legacy-Schlüssel und Rollenprüfung; neue reservierte Schlüssel ablehnen; gespeichertes `character`/`wardrobe` erhalten. Tests für das Zusammenspiel `save_avatar_look → save_avatar → set_character → save_avatar_look` ergänzen.
- [ ] `set_character` behält beide Looks. Speichern aus einer alten Editor-Sitzung nach zwischenzeitlichem Figurenwechsel wird abgelehnt. Ein fehlendes `wardrobe` wird nur beim Lesen als leer normalisiert; keine unnötige Massenumschreibung bestehender Profile.
- [ ] `buy_item` um einmaligen Avatar-Besitz erweitern. Profil vor Besitzprüfung/Abbuchung sperren; zweite gleichzeitige Anfrage darf nicht nochmals belasten. Klassenkatalog, Shop-Sperre, Starterregeln und Journal beibehalten. Bestehende Mengen >1 bleiben Besitz. Neue RPC-Ausführungsrechte nur für authenticated; public/anon widerrufen.
- [ ] API-Adapter mit kurzen deutschen Fehlern bauen: Laden, ungültiger/alter Entwurf, Speicherung fehlgeschlagen. Revisionskonflikt unterscheidbar zurückgeben. Keine Roh-SQL-Fehler im Schülertext.

**Prüfung:** `npx vitest run tests/sql/wardrobe.test.ts tests/sql/backend.test.ts tests/sql/character-choice.test.ts tests/sql/plot-slots.test.ts tests/sql/instance-rules.test.ts tests/api/wardrobe.test.ts`. Zusätzlich Konkurrenztest gegen eine isolierte lokale PostgreSQL/Supabase-Testinstanz, falls verfügbar; PGlite-Tests allein nicht als Nachweis paralleler Transaktionen ausgeben. Migration nur lokal committen, nicht live anwenden.

## AP A4 – Eigene Zimmer-Bühne mit direkter Drehung

**Dateien:** `render/wardrobeRoom.ts`, `wardrobeStage.ts`, entsprechende Tests und `dev/wardrobe.*`.

- [ ] Die neue Testseite zunächst mit realer Figur, Fake-Besitz und dem Adapter aus A2 aufbauen. Beide Figuren über `?character=boy|girl` erreichbar machen; keine Schüleranmeldung oder echten Supabase-Daten verwenden.
- [ ] Zimmer aus eigener Geometrie bauen. Offene Schranktüren, Fächer und Kleiderbügel müssen als Silhouette erkennbar bleiben. Keine austauschbare einfarbige Fläche als Zimmer-Ersatz.
- [ ] Einmaliges niedrig aufgelöstes Raum-Render-Target und Blur-Cache erstellen; nur bei Größen-/Qualitätswechsel erneuern. Die scharfe Figur mit sanftem Bodenschatten davor rendern. `configurePreviewRenderer` und bestehende Beleuchtungs-/Farbraumregeln wiederverwenden.
- [ ] `createWardrobeStage(host, {character, look, reducedMotion, quality})` mit `applyLook`, `rotateBy`, `resetView`, `resize` und `dispose` bereitstellen. Raum/Kamera bleiben statisch; Figurendrehung wird um ihre eigene Hochachse geführt.
- [ ] Pointer Capture, Bewegungsgrenze und `pointercancel` berücksichtigen. `touch-action: none` nur auf der Drehfläche; Inventar-Scrollen bleibt nativ. Auf UI-Klicks kein Rotationssprung. Linke/rechte Pfeiltaste beziehungsweise große Drehknöpfe rufen denselben Pfad auf.
- [ ] Nur bei Interaktion, laufendem Übergang oder veränderter Vorschau rendern. Kein automatischer Dauer-Catwalk im Editor. Verdeckte Seite und Reduced Motion berücksichtigen.
- [ ] Objekt-/Material-/Target-/Context-Besitz dokumentieren und Aufräumen testen. Hintergrund darf unabhängig von normalem Rendern nicht pro Frame erneut berechnet werden.

**Prüfung:** WebGL-Bilder beider Figuren vor erkennbar offenem unscharfem Schrank; scharfe Haare/Kleidung und lesbare UI. Test: horizontales Ziehen verändert Yaw, vertikales Listenziehen scrollt ohne Figurenbewegung. Speicher/Context-Zahl nach zehn Öffnen-/Schließen-Vorgängen stabil. Lokaler Commit.

## AP A5 – Tablet-Ansicht, Auswahl und Speichern

**Dateien:** `ui/wardrobeView.ts`, `wardrobe.css`, `tests/ui/wardrobeView.test.ts`, Dev-Harness.

- [ ] Mit Fake-API Tests für leeres Inventar, nur eigene passende Teile, Auswahl durch einen Tap, automatisch ersetzte Konflikte, Abwählen, Farben und Ladefehler schreiben.
- [ ] `openWardrobe(opts): AreaHandle` implementieren; Handle unmittelbar zurückgeben, Daten anschließend laden. So kann der Bereichswechsel das Dorf sofort pausieren und spätere Antworten beim Schließen ignorieren.
- [ ] Bühne und Inventarpanel entsprechend Design anordnen; Hauptreiter „Kopf“, „Kleidung“, „Extras“, „Farben“. Nur tatsächlich verfügbare Kategorien/Unterbereiche anzeigen. Produktbilder aus A1 verwenden; keine Renderer pro Karte.
- [ ] Originalausstattung und besessene Katalogteile aus `WardrobeData` ableiten. Fehlende neue Käufe nicht aus localStorage simulieren. Nach Shop-Rückkehr Besitz neu laden. Bei leerer Sammlung kostenlose Farben und „Original“ nutzbar lassen.
- [ ] Klar getrennte Zustände implementieren: `loading → ready → loadingItem → ready → saving → closed`, zusätzlich wiederholbare Lade-/Speicherfehler. Auswahl erst nach erfolgreichem Render-Update übernehmen; „Fertig“ bis dahin sperren.
- [ ] Farbfelder mindestens 48 px, `aria-label` und sichtbarer Auswahlzustand. Kanal „top“ nur bei Girl; menschliche Hautpalette getrennt von Kleidung/Haar. „Original“ entfernt Kanalwert.
- [ ] „Fertig“ speichert einmal mit erwarteter Revision. Erst nach Erfolg an `onSaved(data)` melden und schließen. Zweiter Tap während Speichern hat keine Wirkung. Speicherfehler hält Entwurf; Revisionskonflikt bietet „Gespeicherten Look laden“, ohne still zu überschreiben.
- [ ] Zurück-Navigation einschließlich Escape mit Dirty-Guard ergänzen; Fokus nach Rückkehr auf Hausmenü/Kleiderschrank. Beim erzwungenen `close()` durch Logout alle Anfragen logisch abbrechen und keine Guard-Schleife öffnen. Sichtbare Statusmeldung via `aria-live`, Tastaturfokus im aktiven Bildschirm halten.
- [ ] Responsive Maße aus Design mit echten Screenshots überprüfen. Große Figurenfläche auch im Hochformat erhalten; Kartenliste separat scrollbar, Kopfzeile/Abschlussaktion bleiben sichtbar. Keine Debug-Infos, Polygonzahlen oder Clip-Namen im UI.

**Prüfung:** `npx vitest run tests/ui/wardrobeView.test.ts`. Touch-Screenshots 1024×768, 768×1024, 820×1180, 390×844; keine abgeschnittenen Aktionen oder horizontalen Überläufe. Lokaler Commit.

## AP A6 – Hausmenü, Shop und Inventar anschließen

**Dateien:** `houseMenu.ts`, `gameNav.ts`, `areas.ts`, `villageView.ts`, `api/{economy,items}.ts`, `ui/{shopView,itemDetail}.ts`, `render/itemThumbs.ts` und vorhandene Tests.

- [ ] `HouseMenuOptions.onWardrobe` und große Schaltfläche „Kleiderschrank“ ergänzen. Keine dritte Hauptnavigation und kein Einstieg über die überfüllte Profilseite.
- [ ] `NavArea` um `kleiderschrank` erweitern und Hauszuordnung in `HOUSE_AREAS`/`navButtonFor` testen. Opener in `villageView.ts` anschließen. Während des Tutorials kein zusätzlicher Pflichtschritt; Zugang erst nach normalem Hausmenü.
- [ ] Bereich als pausierend behandeln; Dorf-Taps, Kamerasteuerung, Namens-/Sir-Byte-Overlays sowie Haupt-HUD während der Zimmeransicht deaktivieren. Globale Nav-/Accountklicks dürfen den Dirty-Guard nicht umgehen. Vorherige Hauskamera merken und nach Rückkehr wiederherstellen; verbrauchte Zeit nicht nachsimulieren.
- [ ] `close()` besitzt nur seine eigenen Listener/DOM/Ressourcen. Spätes Laden oder ein überholter `AreaController`-Opener darf keinen unsichtbaren Renderer starten oder eine neuere Ansicht entsperren.
- [ ] Shop-Katalog um `shopVisible` und passende Avatar-Metadaten ergänzen. Shop zeigt aktive sichtbare Avatar-Teile für die aktuelle Figur. Inventar erhält auch gekaufte Teile der jeweils anderen Figur und bestehende Legacy-Artikel; keine Besitzdaten verlieren.
- [ ] `purchaseState` für Avatar-Artikel als einmaligen Besitz spiegeln; Serverprüfung bleibt maßgeblich. Passende statische Thumbnails im Shop und in Details laden. Nicht darstellbare Legacy-Artikel nicht weiter als kaufbar zeigen.
- [ ] Für tragbare eigene Teile im Inventar „Anziehen“ ergänzen: Kleiderschrank öffnen und genau dieses Teil lokal vorwählen. Für andere Figuren „Für deine andere Figur“ anzeigen, ohne automatisch die Figur zu wechseln. Nach Kauf „Zum Kleiderschrank“ statt „Aufstellen“ anbieten; Bestätigung des Kaufs bleibt bestehen.
- [ ] Shop-Abstecher aus leerem Kleiderschrank nur nach erfolgreichem Speichern oder Verwerfen verlassen. Shop-Rückweg lädt Besitz neu und führt bei dieser Herkunft wieder in den Kleiderschrank, sonst wie bisher zum Haus.

**Prüfung:** Hausmenü-/Area-/Navigation-/Shop-Tests gezielt erweitern. Playwright: Haus → Kleiderschrank → Haus, schneller Wechsel während Laden, Shop geschlossen aber eigenes Teil weiterhin anziehbar, Kauf → Inventar → Anziehen. Lokaler Commit.

## AP A7 – Gespeicherten Look im Dorf und in Porträts zeigen

**Dateien:** `api/village.ts` einschließlich `loadMembersAsTeacher`, `render/{character,crowd,portrait}.ts`, `ui/{avatarBadge,frames,readOnlyScene}.ts`; zugehörige Tests.

- [ ] Profil- und Member-Adapter um normalisierten Look/Revision ergänzen. `village_members` liefert bereits Avatar-JSON; vorhandene Teacher-Member-RPC/Adapter ebenfalls auf dessen Weitergabe prüfen. Keine Inventare/Münzen in Klassenmember-Daten ergänzen.
- [ ] Crowd-Inputs um bestätigten Look erweitern; pro Modellinstanz A2-Customizer erzeugen. Abbau beim Figurenwechsel, Logout oder Scene-Dispose erweitern. Unveränderte Avatar-Daten nicht jedes Frame neu anwenden.
- [ ] Eigene Figur nach bestätigtem Speichern aktualisieren, erst dann Badge-/Profilporträt invalidieren. Avataränderungen anderer Klassenmitglieder beim nächsten bestehenden Datenladen übernehmen; keinen neuen Echtzeit-Multiplayer einführen.
- [ ] Porträt-Schnittstelle um Look und Revision ergänzen. Cache-Schlüssel enthält mindestens Figur, Asset-Revision und kanonisch serialisierten Look; Cache nur nach `boy|girl` wäre falsch. Profilbild darf keine andere Instanz umfärben.
- [ ] Head-Bounds nur aus Körper/Kopf bestimmen, nicht aus langen Accessoires. Kamera mit Sicherheitsrand für Hut/Haarschmuck erweitern; Hellebarde im Hintergrund darf nicht die Kopfgröße bestimmen. Tatsächliche Kappe und Ohren im Profilrahmen prüfen.
- [ ] Teacher-Read-only-Szene denselben Renderer-/Look-Pfad verwenden lassen; keine Editor-Aktionen oder Schüler-RPCs hinzufügen.
- [ ] Legacy-/leere Looks als Originalfigur anzeigen. Bei fehlerhaftem Render-Asset mit vorhandener Grundfigur und wiederholbarem Laden reagieren; keinen ungespeicherten Look in Supabase zurückschreiben.

**Prüfung:** Zwei gleichartige Figuren mit unterschiedlichen Farben/Teilen bleiben unabhängig; Outfit überlebt Figurenwechsel und erneutes Laden; Profilporträt wechselt nach Speicherung; Teacher-Ansicht zeigt denselben Look. Bestehende Tutorial-/Jubeltests bleiben grün. Lokaler Commit.

## AP A8 – Durchlauf, Leistung und Dokumentation abschließen

**Dateien:** `e2e/wardrobe.spec.ts`, `playwright.config.ts`, Dev-Harness, gezielte Testergänzungen, `docs/{SPEC,PLAN,ANLEITUNG_LEHRKRAFT}.md`, `docs/LOOK.md` und `LICENSES.md`.

- [ ] `wardrobe.spec.ts` explizit in das bestehende Projekt `harness` aufnehmen und beim Build-Smoke-Projekt ausschließen. Testseite bleibt außerhalb der Produktions-Einstiege.
- [ ] End-to-End für beide Figuren: Fake-Kauf mit Inventarzuwachs → Anziehen → Drehen → Speichern → bestätigter Dorflook/Porträt → erneut laden. Zusätzlich Konfliktwechsel, Ablegen, falsche Figur, geschlossener Shop, Laden fehlgeschlagen, Save fehlgeschlagen, Revisionskonflikt und Schließen während Laden.
- [ ] Beide Figuren mit allen 16 Artikeln und den konkreten Spielanimationen in WebGL prüfen. Einzelteile sowie zulässige Maximal-Kombinationen testen; Front/Rücken/Seite und kritische Kontakte ablegen. Jeans/Rock ausdrücklich über den ganzen Walk-/Catwalk-/Jubelzyklus, nicht nur in moderater Standpose kontrollieren.
- [ ] Zehn Öffnen-/Schließen-Zyklen, Tab-Wechsel und Figurwechsel messen. Kein stetig wachsender Speicher, keine übrig gebliebenen Listener/Mixer/Render-Targets, kein zusätzlicher Context pro Karte. Nach Schließen Dorf bedienbar und ohne großen Bewegungssprung.
- [ ] Asset-Audit, gezielte Tests und danach Gesamtprüfungen ausführen:

```powershell
# Arbeitsverzeichnis: Lerndorf/web
node scripts/audit-wardrobe.mjs
npm test
npm run build
node node_modules/eslint/bin/eslint.js src tests
npx playwright test e2e/wardrobe.spec.ts --project=harness
npx playwright test e2e/tutorial.spec.ts --project=harness
npm run galerie
```

- [ ] Alle 36 Galeriebilder selbst neben den vorhandenen Soll-Referenzen ansehen; zusätzlich Nahaufnahme der ausgerüsteten Figur. Bild-/Fehlerberichte unter `web/test-results/wardrobe/` sammeln. Tests dürfen nicht nur die eigenen Katalogkonstanten gegen sich selbst vergleichen.
- [ ] 32 ausgerüstete Figuren im Dorf, ungünstige Kamera und beide Qualitätseinstellungen messen. Alte Budgets mit tatsächlichen Werten vergleichen. Bei Verschlechterung gezielt Texturen/Materialprimitiven optimieren und entfernte Accessoires ausblenden, ohne das gespeicherte Outfit zu verändern; keine pauschale Qualitätsfreigabe behaupten. Tablet-Ziel 30 fps separat auf echter Hardware prüfen; falls Gerät nicht verfügbar, ausdrücklich als noch offene Hardware-Abnahme festhalten.
- [ ] SPEC §7 auf tatsächlich gelieferten Look-Vertrag bringen, §11/§13 und RPC-Tabelle ergänzen; alte nicht vorhandene Frisur-/Oberteilversprechen berichtigen. LOOK um Zimmer- und belegte Charakterbudgets erweitern, ohne das alte 3.000-Dreiecke-Ziel als erreicht darzustellen. Lehrer-Anleitung um Kauf → Kleiderschrank und Shop-Sperre ergänzen.
- [ ] Erledigte APs in `docs/PLAN.md` abhaken, Test-/Sichtprüfungsstand und noch nicht erfolgte Live-Migration/Veröffentlichung getrennt nennen. Dokumente dieses Plans nur im Rahmen tatsächlicher Befunde aktualisieren.
- [ ] `git diff --check` und abschließenden Diff prüfen; nur zugehörige Dateien lokal committen. Nicht die untracked Prototyp-Ordner versehentlich mit `git add .` aufnehmen. Danach Ergebnis mit Screenshots und noch offener Hardware-/Veröffentlichungsabnahme übergeben.

## Reihenfolge und Abnahmekriterien

`A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8`.

A1 ist die technische Schranke: Ohne funktionierende Animationen auf den modularen Bases keine sichtbare Umstellung im Spiel. A5 liefert den Editor gegen Testdaten; erst A6/A7 ergeben die echte Spielintegration. Eine fertige Demo allein erfüllt den Auftrag nicht.

| Nutzeranforderung | Verantwortliche APs |
| --- | --- |
| Beide vorhandenen Shop-Implementationen nutzen | A1, A2 |
| Zugang über Hausmenü, separate Zimmerinstanz | A4, A6 |
| Unscharfer Raum, offener Schrank, scharfer Avatar | A4, A8 |
| Drehen per Touch/Maus und zugänglicher Alternative | A4, A5 |
| Nur Besitz anziehen, direkte Auswahl, Farben | A2, A3, A5 |
| Kauf-/Inventarfluss und persistente Looks | A3, A6, A7 |
| Eigener Look für beide Figuren, Dorf und Porträt | A3, A7 |
| Intuitive Tablet-Oberfläche und Leistung | A4, A5, A8 |

Planungsannahmen sind bewusst festgelegt: explizites Speichern mit „Fertig“, kostenlose feste Farben, figurenspezifische Artikel, getrennte Looks, Käufe im bisherigen Shop, r10 als Girl-Integrationskandidat. Diese Entscheidungen sind im Plan überprüfbar und können vor der Umsetzung angepasst werden.
