# Lerndorf – Scope

Stand: 17.10.2026 · Auftraggeber: Lehrkraft Englisch 8a/8b (Mittelschule, Bayern)

## Ziel

Schüler der Klassen 8a und 8b sollen motivierter Englisch üben. Dafür bekommt jede Klasse ein eigenes 3D-Dorf im Browser. Jeder Schüler hat dort einen Avatar und ein eigenes Haus mit Grundstück. Münzen verdienen die Schüler durch Englisch-Aufgaben am Marktplatz und durch Stempel für vollständig abgegebene Wochenpläne. Mit den Münzen gestalten sie Avatar und Grundstück.

## Nutzer

| Rolle | Wer | Anzahl | Gerät |
| --- | --- | --- | --- |
| Schüler | 8a und 8b, je bis zu 32 | ca. 40 gesamt | geteilte Schul-Tablets (Browser), auch Handy/PC zu Hause |
| Lehrkraft | eine Person (später evtl. Kollegen) | 1–3 | PC, Tablet, digitale Tafel |

Schüler sind 13–14 Jahre alt; teils schwächere Lesekompetenz. Oberfläche auf Deutsch, Aufgaben auf Englisch.

## Im Umfang (MVP = Stufen 1–4)

1. **Login** mit Spitzname + Passwort, beides von der Lehrkraft vergeben. Automatisches Abmelden.
2. **Klassendorf** pro Klasse: organisches Gelände (Hügel, Fluss, Brücken, geschwungene Wege), Marktplatz in der Mitte, ein Grundstück mit Haus pro Schüler, verstreut und unterschiedlich weit auseinander. Layout pro Klasse fest (alle sehen dasselbe Dorf).
3. **Avatare** aller Klassenmitglieder laufen selbständig und nicht steuerbar durchs Dorf (gehen, stehen, sitzen, winken, grüßen sich). Antippen lässt eine Figur winken.
4. **Avatar-Editor**: Frisur, Farben, Kleidung, Accessoires. Grundausstattung gratis, weitere Teile im Shop.
5. **Aufgabentafel** am Marktplatz: kurze Englisch-Aufgaben zum Stoff der Woche (Vokabeln, Irregular verbs, Grammatik). Richtige Antworten bringen Münzen. Prüfung nur auf dem Server, Tageslimit.
6. **Münzkonto** mit nachvollziehbarem Kontoauszug.
7. **Shop + Inventar**: Deko für das Grundstück, Teile für den Avatar.
8. **Baumodus**: gekaufte Deko auf dem eigenen Grundstück auf ein Raster setzen, drehen, wieder entfernen.
9. **Lehrer-Bereich**: Konten anlegen/zurücksetzen, Stempel buchen, Münzen korrigieren, Shop/Baumodus sperren, Übersicht pro Klasse.
10. **Aufgaben-Pflege**: Aufgaben der Woche als JSON-Datei im Repository, automatisch in die Datenbank eingespielt.

## Ausdrücklich NICHT im Umfang

- Steuerbare Avatare, Chat oder Nachrichten zwischen Schülern
- Echtzeit-Multiplayer (jedes Gerät simuliert die Figuren selbst)
- Ranglisten mit Münzständen einzelner Schüler (kein öffentlicher Vergleich)
- Echte Namen, E-Mail-Adressen, Noten oder andere personenbezogene Daten
- Eigene Server; kostenpflichtige Dienste
- Änderungen an der bestehenden Website **English Club 8** (Repo `Thomsen92/English-Club-8`) und am Ordner `Referenz`
- Offline-Betrieb ohne Internet
- Native Apps

## Später (nach dem MVP, nicht jetzt bauen)

- Gemeinschaftsprojekt am Marktplatz (Klasse spart gemeinsam, z. B. Riesenrad)
- Kleine Englisch-Minispiele zum Freischalten
- Haus-Upgrades (Farbe, Dach, Größe)
- Weitere Klassen / Kollegen

## Randbedingungen

- **Kosten:** 0 € (Supabase Free, GitHub Pages, Open Source, CC0-Modelle).
- **Datenschutz:** nur Spitznamen; Zuordnung zu echten Namen nur auf Papier bei der Lehrkraft. Daten in der EU (Supabase Frankfurt). Kein Tracking, keine Werbung.
- **Geräte:** muss auf dem ältesten Schul-Tablet flüssig laufen (Ziel 30 Bilder/s). Der Prototyp lief dort gut.
- **Betrieb:** Lehrkraft ist kein Entwickler. Laufender Aufwand max. ca. 10 Min./Woche (Stempel eintragen). Kein Eingreifen nach Ferien nötig.
- **Lizenzen:** nur CC0-Modelle oder eigene; Quellen dokumentiert.

## Erfolgskriterien

- Jeder Schüler kann sich in unter 30 Sekunden anmelden und sieht sein Dorf.
- Start bis zum ersten Bild unter 8 Sekunden im Schul-WLAN.
- Münzen lassen sich nicht im Browser manipulieren; Lösungen sind im Browser nicht auslesbar.
- Lehrkraft bucht die Stempel einer Klasse in unter 3 Minuten.
- Nach 6 Wochen Sommerferien läuft die Seite ohne Zutun weiter.

## Stufen

| Stufe | Inhalt | Ergebnis |
| --- | --- | --- |
| 0 | Prototyp (erledigt) | `Prototyp/index.html` |
| 1 | Fundament: Projekt-Setup, Supabase-Schema, Login, Lehrer-Bereich (Konten, Stempel), Deploy, Weck-Auftrag | Lehrkraft kann Konten anlegen, Schüler können sich anmelden und sehen ihr Dorf mit Platzhaltern |
| 2 | Dorf + Avatare: Stil-Test mit CC0-Modellen, Blender-Pipeline, Avatar-Baukasten mit Animationen, Avatar-Editor | Dorf im Comic-Look, eigene Avatare |
| 3 | Aufgaben: Aufgabentafel, Prüfung auf dem Server, Tageslimit, Aufgaben-JSON + Import | Münzen durch Aufgaben |
| 4 | Bauen: Shop, Inventar, Baumodus | Grundstücke werden gestaltet |
| 5 | Abschluss: Tests auf Tablets, Feinschliff, Lehrer-Anleitung | Einsatz im Unterricht |

Jede Stufe endet mit einer lauffähigen, deployten Version.
