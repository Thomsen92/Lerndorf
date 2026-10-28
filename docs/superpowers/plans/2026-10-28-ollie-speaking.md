# Ollie: Stimme und Bobbing

Auftrag: Shop-Porträt beim Sprechen deutlich lebendiger bewegen und feste
Dialoge mit der vorhandenen ElevenLabs-API vertonen. Nutzerfreigabe vom
28.10.2026 ersetzt für diesen begrenzten Audioauftrag die frühere Zurückstellung.
Kein Commit/Push, keine Modelländerung, keine API-Schlüssel im Client.

1. Vorhandenen VoicePlayer um ein optionales lokales Clip-Verzeichnis erweitern.
   Sir Byte unverändert; gegenseitige Stummschaltung weiterhin zentral.
2. Ollie-Sprachsteuerung: feste IDs und Sprachwahl, Audioanalyse für Bobbing,
   geringer CSS-Transform-Aufwand auf dem vorhandenen Porträt. Stopp bei Ende,
   neuem Satz, Mute, verborgenem Tab und Schließen. Weniger Bewegung deaktiviert Bobbing.
   Musik während echter Sprachausgabe absenken; Text bleibt bei Audioproblemen verfügbar.
3. Zwölf MP3s (6 IDs × en/de) einmalig mit Charlie (australisch, männlich)
   erzeugen. Lokale geheime `.env.local`; Kontingent vorab geprüft. Kein Zukauf,
   keine automatischen Wiederholungen, maximal 2.500 Zeichen je Generierungslauf.
   Vorhandene Dateien bei passendem Text/Parametern überspringen.
4. Tests zuerst: Voice-Pfad, Satzwechsel/verspätete Antworten/Schließen,
   Ende/Mute/Tabwechsel und reduzierte Bewegung; bestehende Shop-Tests erhalten.
5. Browser: echte lokale MP3 startet nach Tap, Porträt bewegt sich und steht nach
   Ende still. Tablet-Screenshot, reduzierte Bewegung und keine externen TTS-Aufrufe.
   Dokumentation/Lizenzen ergänzen, Typecheck, Tests und Build.

Abschluss: umgesetzt. 12 MP3s erzeugt, 989 Zeichen; erneuter Generierungslauf
überspringt alle zwölf Dateien ohne Anfrage. Isolierter Shop-Commit 1.261 Tests (voller Arbeitsstand: 1.267), 15 Shop-E2E,
Typecheck und Produktionsbuild erfolgreich. Audiodekodierung/Länge/Pegel für alle
Clips geprüft; hörbare Wiedergabe, Mute und reduzierte Bewegung im Browser getestet.
Keine neue Dorfgeometrie, kein zusätzlicher WebGL-Renderer, kein Commit/Push.
