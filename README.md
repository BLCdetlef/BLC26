# BLC26 – digitales BRUCHLASTchart

Digitale, interaktive Fassung des BRUCHLASTcharts.

Alle freigegebenen Langzeitkurven werden in einer gemeinsamen Zeichenfläche auf
der Zeitachse 1700–2100 überlagert. Die vertikale Position jeder Kurve zeigt den
Verlauf innerhalb ihrer eigenen Datenspanne; eine gemeinsame Y-Skala wird nicht
angezeigt. Originalwerte und Einheiten bleiben in Tooltips und technischen Kurvendetails erhalten.
Je 20 Prozent vertikaler Darstellungsraum ober- und unterhalb der Daten beruhigen
das Kurvenbild, ohne die Messwerte zu verändern.

Oberhalb der Zeichenfläche ordnet ein zurückhaltendes Ereignisband ausgewählte
historische Zeiträume ein. Dauerhafte Ereignisse erscheinen als helle graue
Flächen; bei Maus- oder Tastaturfokus werden Hilfslinie und Langtext zugänglich.
Die Ereignisse dienen nur der zeitlichen Orientierung und behaupten keine
Kausalität zwischen Ereignis und Kurvenverlauf.

Die Anwendung startet als ruhige Vollbild-Zeichenfläche. Ein seitlicher Griff
links öffnet bei Bedarf die Legende für Farben, Linienarten und Punktformen;
der Griff rechts öffnet die Kurvenfilter nach Grundlage, Kurventyp und dargestelltem
Segment. Ein Klick auf eine Kurve öffnet automatisch am unteren Bildrand ein eigenes
technisches Detailfenster mit Grenzwert, Datenherkunft und Aufbereitung. Auf Smartphones ist die Diagrammansicht
für das Querformat ausgelegt; im Hochformat fordert sie zum Drehen auf.
Zwei runde Schalter oben in der Mitte verlinken auf die Projekt-Homepage und
das GWL-Panel; ihre Kurzbezeichnungen erscheinen bei Maus- oder Tastaturfokus.
Der Grundlagenfilter folgt der Reihenfolge des GWL-Panels und zeigt sowohl alle
neun Planetaren Grenzen als auch dessen ergänzende Einflussbereiche. Grundlagen
ohne verfügbare BLC26-Kurve bleiben mit dem Zähler 0 sichtbar.

Ein Direktlink mit `?curve=<curveId>` öffnet ausschließlich die im GWL-Export
unverändert enthaltene Kurven-ID, aktiviert ihre Grundlage und ihren Kurventyp
und zeigt die Kurveninformationen im technischen Detailfenster. Die ID muss URL-kodiert
übergeben werden;
bei unbekannten oder entfernten IDs bleibt die Standardansicht erhalten und es
erscheint eine verständliche Meldung. Weitere Kurvennamen oder interne
Metadaten werden nicht in die URL geschrieben.

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

Seit GWL-Exportversion 1.6 werden zusätzlich die abgeleiteten Grenzstatus für planetare Grenze und hohen Risikobereich übernommen. Die Status unterscheiden eine Überschreitung innerhalb der Reihe, eine bereits am Reihenanfang bestehende Überschreitung, keine Überschreitung, ein Reihenende vor einer separat belegten Überschreitung und einen nicht beurteilbaren Fall.

Seit Exportversion 1.7 bleibt die vollständige Beobachtungsreihe Grundlage des Linienverlaufs, während BLC26 sichtbare Datenpunkte ausschließlich aus `displayObservations` zeichnet. Diese vom GWL-Exporter erzeugte Reihe hält grundsätzlich mindestens fünf Jahre Abstand und bewahrt ersten, letzten sowie fachlich notwendige Überschreitungspunkte.

Exportversion 1.8 ergänzt entsprechende Darstellungsreihen für Rekonstruktionen und Projektionen. Deren sichtbare Punkte stammen ausschließlich aus vorhandenen Werten und halten je Segment grundsätzlich mindestens 20 Jahre Abstand. Eingangs- und Ausgangspunktzahlen, Auswahlregeln sowie der Verzicht auf Interpolation und Transformation werden getrennt mitgeführt. Tooltips nennen Jahr und Wert jeweils einmal sowie Herkunft, Datenart und den unveränderten Quellenstatus des Punkts.

Exportversion 1.9 überträgt zusätzlich die genaue Fundstelle innerhalb der Ursprungsquelle. Messung, Rekonstruktion und jedes einzelne Szenario sind getrennt anklickbar. Das technische Detailfenster zeigt danach ausschließlich das gewählte Segment mit Quelldatei, Tabelle oder Zeilenbereich, verwendeten Spalten, übernommenem Datenbereich und Verarbeitung. Alle Kernkurven müssen diese Provenienz vollständig mitführen; der Import verweigert unvollständige Kernsegmente. Die seitliche Legende bleibt eine reine Lesehilfe für Farben, Linienarten und Punktformen.

`dataNature` unterscheidet direkte Beobachtungen von veröffentlichten wissenschaftlichen Schätzreihen. Direkte Beobachtungsreihen erhalten grundsätzlich sichtbare Punkte im Abstand von mindestens fünf Jahren; Schätzreihen wie der anthropogene effektive Strahlungsantrieb im Abstand von mindestens 20 Jahren. In der Legende und Datendokumentation werden beide als unterschiedliche Arten der Hauptreihe bezeichnet.

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
