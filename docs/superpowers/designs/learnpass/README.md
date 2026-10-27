# LearnPass – Design und Umsetzung

Dieser Ordner enthält die freigegebenen Entwürfe (`learnpass-tablet.png`, `learnpass-phone.png`,
`page-*.png`, `track-*.png`, `inside-*.png`) und die Umsetzung im Spiel.

## Wo die Umsetzung liegt

| Entwurf | Umsetzung |
| --- | --- |
| Seite, Karten, Statusleiste, Kacheln | `web/src/ui/learnpass/learnpassView.ts`, `learnpass.css` |
| Belohnungsbilder | `web/src/ui/learnpass/rewardArt.ts` |
| „What's inside?“ | `web/src/ui/learnpass/insideModal.ts`, `insideModal.css` |
| Truhen im Inventar | `web/src/ui/seasonChests.ts`, `seasonChests.css` |
| Shop-Truhe | `web/src/ui/seasonShop.ts`, `seasonShop.css` |
| Profilkarte | `web/src/ui/seasonCard.ts`, `seasonCard.css` |
| Daten und Regeln | `supabase/migrations/0028`–`0032` |
| Lehrkraft-Steuerung | `web/src/teacher/pages/season.ts` |

## Abweichungen vom Entwurf

- Die Seite ist eine Vollbild-Ebene wie das Profil, kein zentriertes Panel; auf dem Handy stapeln
  sich Kopf und Kacheln, die Karten bleiben waagerecht wischbar.
- Die Belohnungsbilder sind SVG statt gerenderter 3D-Modelle (die 3D-Modelle selbst zeigt die
  Dorf-Ansicht über den GLB-Loader).
- Markt-Stand und Saison-Stimmung im Dorf sind gestrichen (Lehrkraft 27.10.2026); der LearnPass öffnet nur über die Profilkarte.

## Prüfen

- Dev-Seiten: `web/dev/learnpass-ui.html`, `web/dev/season-chests.html`, `web/dev/season-shop.html`,
  `web/dev/profile-season.html`, `web/dev/teacher-season.html`.
- Screenshots aus der Abnahme liegen unter `web/test-results/`.
