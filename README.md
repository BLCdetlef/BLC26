# BLC26 – digitales BRUCHLASTchart

Digitale, interaktive Fassung des BRUCHLASTcharts.

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

## Aktualisierung

1. Im GWL-Panel Kurven redaktionell freigeben.
2. Dort Manifest prüfen und Export erzeugen.
3. Den verifizierten Export nach `data/gwl/blc-curve-export-v1.json` übernehmen.
4. Vor Commit und Push ausführen:

   ```powershell
   node scripts/verify-gwl-import.mjs
   ```

## Lokal testen

`start-server.cmd` doppelt anklicken und anschließend `http://localhost:3000` öffnen. Der Server wird mit `Strg+C` beendet.

Alternativ:

```powershell
python -m http.server 3000
```

## Veröffentlichung

GitHub Pages kann die Dateien direkt aus dem Hauptzweig und dem Repository-Stammverzeichnis bereitstellen.
