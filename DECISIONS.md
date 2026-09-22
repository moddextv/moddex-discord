
**Der Bot ist für jeden Server installierbar, moddex-discord 0.8.0.** Die
vier Lese-Befehle sind seit dem 22.09. auf der Application registriert statt
in der Community-Guild, der Bot loggt beim Start seinen Install-Link mit
`permissions=0`. Was sonst an der Guild hängt — Ankündigungen, Booster-Sync,
Badge-Rollen — bleibt dort durch die Guards, die es schon gab. Der Preis:
eine geänderte Definition braucht bis zu einer Stunde statt Sekunden. Der
Besitzer: „auch wenn's niemand addet" — es kostet eine Zeile und ist der
einzige Weg in fremde Mod-Team-Discords, den roles.tv nicht hat.

**Ein Filtermenü für alle Listen, moddex-web 1.17.1.** Rangliste und Browse
trugen nach 1.17.0 noch den alten „Bots: shown"-Chip neben dem neuen Menü der
Rollenlisten. `components/UI/FilterMenu.tsx` ist jetzt die eine Komponente:
Chip mit fester Breite, Gruppen, Auswahlen als Knopf oder als Link (die
Rangliste ist eine Server-Komponente und wählt über die URL).
`tests/controls.test.ts` verlangt `<FilterMenu` und `controls.botModes` auf
allen drei Flächen; vier Schlüssel des alten Chips sind aus vier Sprachen
gelöscht.
