# BLC26 – digitales BRUCHLASTchart

Digitale, interaktive Fassung des BRUCHLASTcharts.

Alle freigegebenen Langzeitkurven werden in einer gemeinsamen Zeichenfläche auf
der Zeitachse 1700–2100 überlagert. Die vertikale Position jeder Kurve zeigt den
Verlauf innerhalb ihrer eigenen Datenspanne; eine gemeinsame Y-Skala wird nicht
angezeigt. Originalwerte und Einheiten bleiben in Legende und Tooltips erhalten.
Je 20 Prozent vertikaler Darstellungsraum ober- und unterhalb der Daten beruhigen
das Kurvenbild, ohne die Messwerte zu verändern.

Oberhalb der Zeichenfläche ordnet ein zurückhaltendes Ereignisband ausgewählte
historische Zeiträume ein. Dauerhafte Ereignisse erscheinen als helle graue
Flächen; bei Maus- oder Tastaturfokus werden Hilfslinie und Langtext zugänglich.
Die Ereignisse dienen nur der zeitlichen Orientierung und behaupten keine
Kausalität zwischen Ereignis und Kurvenverlauf.

## Sichere GWL-Übergabe

BLC26 ruft keine Kurvendaten von einer öffentlichen Laufzeit-API ab. Es liest ausschließlich die gemeinsam mit BLC26 versionierte Datei `data/gwl/blc-curve-export-v1.json`.

Vor der Darstellung prüft der Browser:

- gleiche Herkunft der lokalen Datei,
- Exportformat und Version,
- SHA-256-Integrität,
- eindeutige Kurven-IDs,
- erlaubte Knowledge-Quellpfade,
- mindestens zwei Beobachtungspunkte,
- ausschließlich qualifizierte Projektionen.

Bei einem Fehler wird der gesamte Import gesperrt. Quelldaten werden nur über DOM- und SVG-Methoden als Text und Grafik dargestellt; sie werden nicht als HTML ausgeführt.

Nach Auswahl einer Kurve zeigt BLC26 ergänzende Referenzinformationen als Text. Der Status verwendet ausschließlich den zeitlich letzten gültigen Beobachtungspunkt; historische Rekonstruktionen und Szenarien werden dafür nicht ausgewertet. Eine fehlende oder nicht vergleichbare Referenz wird ausdrücklich als solche bezeichnet und niemals als Unterschreitung gewertet.

## Aktualisierung

1. Im GWL-Panel Kurven redaktionell freigeben.
2. Dort Manifest prüfen und Export erzeugen.
3. Den verifizierten Export nach `data/gwl/blc-curve-export-v1.json` übernehmen.
4. Vor Commit und Push ausführen:

   ```powershell
   node scripts/verify-gwl-import.mjs
   ```

## Lokal testen

`start-server.cmd` doppelt anklicken und anschließend `http://localhost:3000` öffnen. Der lokale Server benötigt nur Node.js, lädt keine Pakete nach und wird mit `Strg+C` beendet.

Alternativ:

```powershell
python -m http.server 3000
```

## Veröffentlichung

GitHub Pages kann die Dateien direkt aus dem Hauptzweig und dem Repository-Stammverzeichnis bereitstellen.
