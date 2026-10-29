# FIX-01 – BUG-001: HUD überdeckt die Kopfzeile der Daily Quests und Profil/Settings

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-001](../BUGS.md#bug-001--smartphone-hud-überdeckt-die-kopfzeile-der-daily-quests)
**Schwere:** S2 · **Aufwand:** S (CSS) · **Status:** bestätigt, **nächster Fix**

## 1. Auftrag

Behebe **ausschließlich** diesen Layoutfehler: Auf dem Smartphone (Hochformat)
liegt die obere Leiste über der Kopfzeile der Daily Quests **und** der
Profil-/Settings-Ansicht, sodass Titel, Münzzahl, „Settings“ und der
„Schließen“-Knopf verdeckt sind. Danach müssen beide Kopfzeilen vollständig
sichtbar und die Knöpfe bedienbar sein.

**Keine** anderen Bugs, kein Redesign, keine Änderung am HUD-Aussehen oder an
der Quest-Logik.

## 2. Kontext

Die Ansicht „Aufgaben“ ist ein nicht-modales Overlay
(`web/src/ui/dailyQuestsView.ts`). Es wird über `.overlay:not(.modal)`
positioniert. Das HUD ist die feste Leiste oben rechts
(`web/src/ui/gameNav.ts`, `gameNav.css`): Statuskarte in Zeile 1,
Knopfreihe in Zeile 2.

Auf einem 382 × 845 px großen Viewport überdeckt das HUD die Kopfzeile um
ca. 37 px. „Close“ ist der einzige Schließen-Knopf; `areas.select('aufgaben')`
tut bei bereits offener Area nichts. Deshalb ist der Fehler für die Nutzung
relevant, nicht nur kosmetisch.

Screenshots: `bilder/BUG-001_01.png` (Daily Quests, 382 × 845 px) und
`bilder/BUG-001_02.png` (Profil/Settings, 352 × 284 px).

## 3. Nachstellen

1. `cd web && npm run dev` (Supabase-Zugang steht in `.env.local`).
2. Im Browser auf 382 × 845 px stellen (DevTools → Responsive).
3. Einloggen und ins Dorf gehen; das HUD oben rechts muss sichtbar sein.
4. „Aufgaben“ öffnen.
5. Prüfen: „Daily Ques…“ ist abgeschnitten, „27 coins“ und „Close“ liegen
   unter dem HUD; ein Tipp auf „Close“ trifft das HUD.
6. Profil/Settings öffnen (ca. 352 × 284 px): „Settings“ und „Close“
   liegen ebenfalls unter der zweiten HUD-Zeile.

## 4. Ursache (belegt)

- `.overlay:not(.modal)` reserviert oben nur
  `calc(max(12px, env(safe-area-inset-top)) + 92px)`
  → Panel beginnt bei ca. 104 px (`web/src/style.css:512-516`).
  Die Regel gilt für **alle** nicht-modalen Overlays, also auch für
  Profil/Settings – deshalb tritt die Überlappung dort genauso auf.
- Das HUD ist zweizeilig und **138 px** hoch (8 + 68 + 6 + 48 + 8)
  (`web/src/ui/gameNav.css:2-17`, `:22-35`, `:50-63`).
- Bei `--ui: 0.9` ist es ca. 124 px hoch und endet bei ca. 136 px
  (`web/src/style.css:1366-1386`).
- Die 92 px stammen aus der einzeiligen HUD-Version; die 54 px der zweiten
  Zeile (48 + 6) fehlen.
- Das HUD hat `z-index: 21`, das Overlay `20`
  (`web/src/style.css:518-522` gegen `:141-151`) → Tipps gehen an das HUD.
- „Schließen“ ist der einzige Ausweg (`dailyQuestsView.ts:80`, `:84-85`);
  dieselbe Area erneut zu wählen ist ein No-op (`areas.ts:56-60`);
  Escape schließt nur `haus` (`villageView.ts:198-201`).

## 5. Lösung

### Empfohlen: CSS-Abstand an HUD-Höhe koppeln (S)

In `web/src/style.css` bei `.overlay:not(.modal)`:

```css
padding-top: calc(max(12px, env(safe-area-inset-top)) + 146px * var(--ui));
```

- `146px` = 138 px HUD + 8 px Luft.
- `var(--ui)` ist der bestehende UI-Zoom (0.7 / 0.8 / 0.9 / 1.0);
  dadurch bleibt der Abstand bei allen vier Größen korrekt.
- Die Regel gilt für **alle** nicht-modalen Overlays (Shop, Profil,
  Aufgaben). Deshalb alle drei prüfen.

Falls `calc(… * var(--ui))` auf dem Ziel-Safari Probleme macht: entweder
`--hud-clearance` pro `data-ui`-Stufe setzen (101/111/131/146 px) oder
Variante B.

### Robuster, falls die HUD-Höhe variiert (M)

In `web/src/ui/gameNav.ts` nach dem Anhängen von `el` die Unterkante messen
und bei Resize aktualisieren:

```ts
const setHudBottom = (): void => {
  const bottom = el.getBoundingClientRect().bottom;
  document.documentElement.style.setProperty('--hud-bottom', `${bottom}px`);
};
setHudBottom();
new ResizeObserver(setHudBottom).observe(el);
```

Dann in `style.css`:

```css
.overlay:not(.modal) {
  padding-top: calc(var(--hud-bottom, 104px) + 8px);
}
```

Diese Variante ist sinnvoll, wenn lange Spitznamen oder ein Umbruch die
HUD-Höhe verändern. Sie braucht einen sauberen Fallback und darf das HUD
nicht dauerhaft beobachten, wenn es entfernt wird (Observer trennen).

### Nicht tun

- HUD `z-index` senken: Dann überdeckt das Panel die Leiste, das HUD wird
  unbedienbar.
- HUD ausblenden, sobald eine Area offen ist: inkonsistent und ein neues
  Verhalten.
- Die Kopfzeile der Daily Quests umbauen: behebt nur das Symptom.
- Quest-Logik, Münzen oder `areas.ts` ändern: nicht nötig.

## 6. Randbedingungen

- `CLAUDE.md`, `docs/SCOPE.md`, `docs/SPEC.md`, `docs/LOOK.md` lesen.
- Nur Layout ändern; keine echten Schülerdaten, keine Tracker.
- Münzen/Besitz/Platzierungen nur über RPCs – hier gar nicht anfassen.
- Kein Service-Key in Client/Repo/Log.
- Optik nicht schlechter als der Prototyp; HUD-Aussehen bleibt unverändert.
- Keine neuen Abhängigkeiten.
- Die Regel `.overlay:not(.modal)` wird von mehreren Ansichten genutzt:
  Shop, Profil, Aufgaben. Alle prüfen.
- Safe-Area (Notch) und Querformat nicht verschlechtern.

## 7. Test und Abnahme

Automatisch:

```bash
cd web
npm test
npm run build
```

Manuell (jeweils Screenshot):

| Breite × Höhe | UI-Größe | Prüfen |
|---|---|---|
| 382 × 845 | M (Standard) | Kopfzeile frei, „Close“ klickbar |
| 352 × 284 | M | Profil/Settings: „Settings“/„Close“ frei |
| 360 × 800 | S | dito |
| 390 × 844 | L | dito |
| 430 × 932 | M | dito |
| 1280 × 800 | S/M/L | Panel und HUD überlappen nicht |

Abnahmekriterien:

- [ ] Panel-Oberkante mindestens 4 px unter der HUD-Unterkante.
- [ ] „Daily Quests“, Münzzahl und „Close“ vollständig sichtbar.
- [ ] Profil/Settings: „Settings“ und „Close“ vollständig sichtbar und
      klickbar.
- [ ] „Close“ schließt die Ansicht und führt ins Dorf zurück.
- [ ] Kein horizontaler Scroll; Panel bleibt zentriert.
- [ ] Shop- und Profil-Overlay unverändert erreichbar.
- [ ] `npm test` und `npm run build` grün.
- [ ] Screenshot als `bilder/BUG-001_03.png` ablegen.

## 8. Abschluss

1. In `BUGS.md` den Status von BUG-001 auf **„Fix da“** setzen und unter
   dem Steckbrief eine kurze Änderungsnotiz ergänzen (Datei, Zeile, was
   geändert wurde, Testergebnis).
2. Screenshot `bilder/BUG-001_03.png` verlinken.
3. Nichts anderes committen; keine unrelated Formatierungen.
