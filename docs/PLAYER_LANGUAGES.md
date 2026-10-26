# Spielsprache Englisch / Deutsch

Stand 26.10.2026, Nutzerauftrag: Englisch als neuer Standard, Deutsch in Einstellungen wählbar.

- Ohne gespeicherte Wahl startet die Spieleroberfläche auf Englisch. Settings / Einstellungen bietet zwei große Schaltflächen: English und Deutsch.
- Die Auswahl liegt in `localStorage` unter `lerndorf.language`, gilt pro Browser und bleibt nach Abmeldung erhalten. Auf geteilten Tablets gilt damit die letzte Wahl. Es gibt keine neue Profileigenschaft in Supabase.
- Ein Wechsel setzt zusätzlich `?lang=en` bzw. `?lang=de` und lädt die Seite neu. Andere URL-Parameter und der Hash bleiben erhalten. Die URL-Wahl hat Vorrang vor der Browserwahl; bei gesperrtem Speicher funktioniert die Wahl für die aktuelle URL weiter. Eine gerade offene, ungespeicherte Bearbeitung sollte vorher abgeschlossen werden.
- Login, Navigation, Einstellungen, Tutorial, Quests, Haus, Shop, Inventar, Bauen, Profil, Sammlung, Kleiderschrank, Meldungen, zugängliche Beschriftungen und Schilder verwenden die Frontend-Übersetzungen in `web/src/i18n/`. Deutsche Ausgangstexte bleiben erhalten.
- Datenbanknamen werden erst bei der Anzeige übersetzt. IDs, RPCs, Tabellen, Feldnamen, Besitz, Münzen, XP und gespeicherte Looks bleiben unverändert. Keine Migration und keine Änderung an `supabase/` oder `content/`.
- Lerndorf, Spitznamen, freie Lehrkraft-Nachrichten, Aufgaben, Antwortwerte und Lösungen werden nicht automatisch übersetzt. Ein deutsches Vokabelwort innerhalb einer Englisch-Aufgabe bleibt erhalten. Sir Bytes bestehende englische Stimme bleibt bestehen.
- Lehrer-Routen bleiben Deutsch. Tagesgrenzen und Wochenwechsel bleiben in Europe/Berlin; nur Datumsanzeigen folgen der gewählten Sprache.

Die Übersetzungshelfer setzen dynamische Werte erst nach dem Übersetzen ein. HTML-Helfer übersetzen sichtbare Textteile und zugängliche Namen; Protokollattribute wie IDs, `data-*` und Klassen bleiben unverändert. Tests sichern Platzhalter und Katalognamen ab. Bestehende Regressionstests laufen ausdrücklich im deutschen Modus; eigene Browserprüfungen testen den englischen Standard und beide Wechselrichtungen einschließlich Outfit-Persistenz.
