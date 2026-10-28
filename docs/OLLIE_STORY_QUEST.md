# Ollies Reisegeschichte: Australien → New York

Produktionscode lokal eingebaut, 28.10.2026. Keine Live-Migration und kein Push.

Im bestehenden Shop bietet Ollie **„Ollie’s travel story“** an. Auch „What’s your
story?“ führt zur Quest. Neun englische Lücken bilden eine zusammenhängende
Erzählung: backpack → kangaroo → plane → Liberty → Empire → Park → Bridge → Square → backpack.
Die Erweiterung greift Central Park, Brooklyn Bridge und Times Square aus den
bereitgestellten NYC-Buchseiten auf, mit eigenen humorvollen Dialogtexten.
Nach jeder richtigen Antwort greift Ollie das Wort mit einem eigenen vertonten
Übergang auf („Ah yes, backpack! I’m getting old, mate…“).

Die Bedienelemente sind Englisch/Deutsch, der Lerninhalt bleibt Englisch.
Große Antwortkacheln, Anhören/Wiederholen, Audio überspringen, Hinweise nach
falschen Antworten und Fortschritt 1/9 bis 9/9 sind enthalten. Nach einem Fehler
bleiben der Originalsatz und seine Aufnahme erneut erreichbar. Beim Schließen
stoppt die Stimme; beim nächsten Öffnen setzt die Quest am gespeicherten Schritt fort.
Ollies Porträt verwendet dieselbe sprachabhängige Bewegung wie im Shop;
globales Mute, Musikabsenkung und reduzierte Bewegung bleiben wirksam.

## Belohnung

**Einmal je Schülerkonto nach der neunten Lücke:**

- 50 Münzen, über das bestehende Münz-Ledger.
- 80 XP, über `grant_xp`; diese zählen während einer laufenden Season auch zum
  LearnPass, gemäß den bestehenden Datumsregeln.
- `reward_ollie_nyc_postcard`: die stabile Inventar-ID bleibt erhalten; das
  Souvenir ist jetzt ein aufstellbares **Empire State Building**. Es gehört ins normale Inventar, bleibt nach der Season erhalten
  und wird im Shop nicht verkauft. Bestehender Kind `deco`, kein neuer Slot.

Aus der gelieferten `new_york_buildings.glb` wurde ausschließlich `emp_state._final_14`
mit `Object_28` isoliert, bei X/Z zentriert, auf Bodenhöhe Y=0 gestellt und auf
1,80 m Höhe skaliert (Breite/Tiefe etwa 0,276 m). 1.368 Dreiecke, ein Material,
eingebettete 512×512-Textur. Keine anderen Gebäude sind im Spieleexport enthalten.
Alle Originalgebäude bleiben ausgeblendet in der editierbaren Blender-Datei
`content/quests/empire-source/ollie-empire-state.blend` erhalten. Die ursprüngliche
eigene CC0-Postkarte und ihre Exportdateien bleiben als Archiv erhalten.

Modellquelle: **New York Buildings** von **sumitmangela**, **CC BY 4.0**, laut
Metadaten der gelieferten GLB. Urheber, Quelle, Lizenz und Bearbeitungen stehen
im öffentlichen `LICENSE-ollie-empire-state.txt`, im Modellmanifest und sichtbar
neben den großen Souvenir-Vorschauen. Das neue Gebäude ist keine eigene CC0-Arbeit.

## Server und Auslieferung

Migration [`0055_ollie_story.sql`](../supabase/migrations/0055_ollie_story.sql)
legt zwei RPC-private Tabellen für Fragen und Schülerfortschritt an. Öffentliche
RPCs: `my_ollie_story()` und `answer_ollie_story(p_question,p_answer)`.
Nur angemeldete Schüler dürfen sie verwenden. Fragen müssen in Reihenfolge
gelöst werden; sicherheitsrelevante Werte kommen niemals aus dem Client.

Der Server sperrt zuerst die Profilzeile und dann den Questfortschritt. Abschluss,
50 Münzen, 80 XP und Souvenir werden in derselben Transaktion verbucht.
Wiederholte Antworten, Doppeltippen und erneutes Öffnen zahlen nichts erneut aus.
Ein Fehler bei der Inventarbuchung rollt auch Münzen, XP und Abschluss zurück.
Nach einer verlorenen Antwort aktualisiert „Check saved progress“ den echten
Fortschritt, Guthaben, Katalog und das Fortschritts-UI.

Der Client erhält nur die aktuelle Frage mit neutralen IDs (`gap-1` … `gap-9`).
Hinweise folgen nach einem Fehler, Antworttext und Antwortaufnahme erst nach einer
richtigen Antwort. Die privaten Inhalts- und Audiomanifeste unter `content/quests/`
werden nicht in die Produktionsoberfläche importiert. Öffentliche Sprachdateien
haben undurchsichtige Dateinamen; es gibt kein öffentliches Lösungsmanifest.

Migration `0056_ollie_story_nyc_extension.sql` erweitert die Grundlage 0055 auf
neun Lücken und ersetzt die Souvenir-Metadaten bei gleichbleibender Item-ID.
Frühere vollständige Abschlüsse bleiben abgeschlossen und behalten ihre
Belohnungen; es gibt durch das Upgrade keine erneute Auszahlung. Ein Stand nach
den ersten fünf Lücken setzt bei Central Park fort.

**Für echte Konten muss Migration 0056 in der regulären Migrationsreihenfolge
zusammen mit dem aktualisierten Webstand ausgeliefert werden. Die neuen
Migrationen wurden ausschließlich lokal mit PGlite ausgeführt.**
Die Quest ist dauerhaft und unabhängig von Shop-Sperre/Halloween-Weltstimmung.

## Audio, Quellen und Prüfung

20 aktive englische ElevenLabs-Charlie-Aufnahmen: Einleitung, neun Fragen,
neun Übergänge und ein kurzer Fehlerhinweis. Für die Erweiterung wurden sieben
Clips mit 831 Zeichen erzeugt, einschließlich einer Einleitung für neun Lücken.
Die ursprünglichen 14 Dateien wurden nicht überschrieben; die alte Einleitung
bleibt archiviert. Insgesamt 21 ausgelieferte Dateien, 2.477 erzeugte Textzeichen.
Lokale MP3s unter `web/public/assets/shopkeeper/story-voice/`; im Spiel keine
TTS-Anfragen und kein API-Schlüssel. Modell/Stimme/Hash-/Dekodierungsprüfung im
privaten `content/quests/ollie-story-audio.json`. Kontingent geprüft, kein Zukauf,
keine automatischen Regenerierungen. Audio unter den ElevenLabs-Kontobedingungen,
keine CC0-Einstufung.

Erzeugung: `web/scripts/audio/generate-ollie-story.mjs` (standardmäßig nur Plan;
explizites `--generate` verwendet vorhandenes Kontingent, Erweiterung höchstens
1.500 zusätzliche Zeichen, insgesamt höchstens 4.000).
Empire-Extraktion: `web/scripts/assets/extract-ollie-empire.py` mit lokalem Blender.
Alter Postkarten-Archivexport: `web/scripts/assets/build-ollie-souvenir.mjs`.

Prüfungen: SQL zu Zugriff, Reihenfolge, Wiederholung, verstecktem Shopartikel und
Rollback; API-Validierung; UI-Lifecycle/Fehler-/Erholungsfälle; Integrität aller
21 Sprachdateien. Browserprüfungen spielen die neun Lücken inklusive falscher Antwort,
Schließen/Fortsetzen, reduzierter Bewegung, echtem Audio und Souvenir im Inventar
durch. Screenshots und Protokolle: `web/test-results/ollie-story*`.
Erweiterungsprüfung: 1.318 Tests und 17 Browserprüfungen erfolgreich,
Typecheck/Build und Migrationsprüfung grün; Screenshots unter `web/test-results/ollie-nine/`.

Die lokale Vorschau `/dev/ollie-shop.html` verwendet ausschließlich synthetische
Quest-/Guthaben-Daten. Das Demo speichert innerhalb der geöffneten Seite;
die Produktionsquest speichert serverseitig. Die Demo-Quellen unter `web/dev/`
gehören nicht zum Produktionsbuild.
