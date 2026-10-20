# Katzen-Schild als kaufbare Gartendeko

**Status:** Entwurf vom 20.10.2026, vom Auftraggeber in der Unterhaltung grundsätzlich freigegeben; schriftliche Prüfung dieses Dokuments steht noch aus.

## Ziel

Ein neues Deko-Asset soll im Lerndorf-Shop mit Spielmünzen kaufbar sein und auf einem der vier Deko-Sockel erscheinen. Vorlage ist `C:/Users/Thomas/Downloads/Blocky Schild 3D.html`. Die HTML-Datei ist eine Three.js-Demo, kein exportierbares Modell. Sie wird nicht als Laufzeitseite eingebunden.

## Gestaltung und Asset-Regeln

- Ein schlichtes Holzschild mit der gut lesbaren Aufschrift „Hallo Malik!“ und einer kleinen sitzenden Low-Poly-Katze daneben.
- Stil und Farben folgen `docs/LOOK.md` und den vorhandenen prozeduralen Deko-Modellen.
- Das Asset ist eine kompakte, statische Three.js-Geometrie. Der große Demo-Boden der HTML-Datei wird nicht übernommen.
- Kategorie `deco`; Maße höchstens 3 × 3 × 3 m; Pivot mittig auf Bodenhöhe; Vorderseite nach +Z; Drehung in 90°-Schritten.
- Zielbudget: höchstens 1.500 Dreiecke. Keine hochauflösenden Fototexturen.

## Katalog und Datenfluss

- Neue Item-ID: `deco_cat_sign`.
- Preisvorschlag: 120 Münzen; Seltenheit `common`; aktiv und im Shop sichtbar; Lootbox-Gewicht 0.
- Eine neue Supabase-Migration fügt den Katalogeintrag mit dem 3×3-Fußabdruck hinzu.
- `web/src/render/plotAssets.ts` erhält die Modellfunktion und die ID in `MODEL_IDS`. Der vorhandene Shop lädt aktive Katalogeinträge; Kauf und Platzierung laufen weiterhin über die bestehenden RPCs.
- Es wird keine neue GLB-Ladefunktion eingeführt, weil die vorhandenen Grundstücks-Assets prozedural erstellt werden und die geplante GLB-Pipeline noch nicht existiert.

## Abgrenzung

Keine veränderbare Schildbeschriftung, keine Bildersuche im Spiel, keine Lootbox-Änderung, kein Meshy-Auftrag und kein neues allgemeines GLB-System. Die Shop- und Platzierungslogik bleibt unverändert.

## Abnahmekriterien

1. Der aktive Katalog enthält `deco_cat_sign` als kaufbare Gartendeko zum vorgesehenen Preis.
2. Die ID zeigt auf dem Grundstück ein Holzschild mit gut lesbarer Aufschrift „Hallo Malik!“ und sitzender Katze, statt des neutralen Ersatzwürfels.
3. Maße, Ursprung, Ausrichtung und Dreiecksbudget erfüllen den Asset-Vertrag; alle vier Deko-Sockel können das Modell wie andere Deko drehen.
4. Der Shopkauf verwendet die bestehende `buy_item`-RPC; die Platzierung verwendet den bestehenden `place_in_slot`-Ablauf.

## Noch offen

Die Bezeichnung, der Münzpreis und die Gestaltung wurden in der Unterhaltung als Vorschlag bestätigt. Vor der Umsetzung kann der Auftraggeber im schriftlichen Entwurf noch Änderungen nennen.
