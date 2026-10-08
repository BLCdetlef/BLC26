# BLC26 – digitales BRUCHLASTchart

Digitale, interaktive Fassung des BRUCHLASTcharts.

Die ausgewählten freigegebenen Langzeitkurven werden in einer gemeinsamen Zeichenfläche auf
der Zeitachse 1700–2100 überlagert. Die vertikale Position jeder Kurve zeigt den
Verlauf innerhalb ihrer eigenen Datenspanne; eine gemeinsame Y-Skala wird nicht
angezeigt. Originalwerte und Einheiten bleiben in Tooltips und technischen Kurvendetails erhalten.
Je 20 Prozent vertikaler Darstellungsraum ober- und unterhalb der Daten beruhigen
das Kurvenbild, ohne die Messwerte zu verändern. Ausnahme: Die Waldflächen-Kernkurve
verwendet einen festen Darstellungsbereich von 0–100 % der potenziellen Waldfläche.
Damit wird der geringe Rückgang 1992–2022 nicht auf die volle Diagrammhöhe gestreckt.
100 % ist die Bezugsgröße, kein erfundener historischer Datenpunkt. Legende und
Kurvendetails erläutern diese eigene Skala; sie gilt nicht für die anderen Kurven.

Oberhalb der Zeichenfläche ordnet ein zurückhaltendes Ereignisband ausgewählte
historische Zeiträume ein. Dauerhafte Ereignisse erscheinen als helle graue
Flächen; bei Maus- oder Tastaturfokus werden Hilfslinie und Langtext zugänglich.
Die Ereignisse dienen nur der zeitlichen Orientierung und behaupten keine
Kausalität zwischen Ereignis und Kurvenverlauf.

Die Anwendung startet als ruhige Vollbild-Zeichenfläche. Ein seitlicher Griff
links öffnet bei Bedarf die Legende für Farben, Linienarten und Punktformen;
der Griff rechts öffnet die Tabelle „Kurven auswählen“. Jede Kurve hat eine eigene
Checkbox. Suche, Grundlage und Kurventyp filtern ausschließlich die Tabelle;
ausgewählte Kurven bleiben unabhängig davon im Diagramm. Ein separater Bereich
„Darstellung“ schaltet Hauptreihen, Rekonstruktionen und Szenarien. Ein Klick auf eine Kurve öffnet automatisch am unteren Bildrand ein eigenes
technisches Detailfenster mit Grenzwert, Datenherkunft und Aufbereitung. Auf Smartphones ist die Diagrammansicht
für das Querformat ausgelegt; im Hochformat fordert sie zum Drehen auf.
Drei runde Schalter oben in der Mitte verlinken auf die Projekt-Homepage,
das GWL-Panel und den Podcast ZUSTAND; ihre Kurzbezeichnungen erscheinen bei Maus- oder Tastaturfokus.
Der Tabellenfilter für Grundlagen folgt der Reihenfolge des GWL-Panels und zeigt sowohl alle
neun Planetaren Grenzen als auch dessen ergänzende Einflussbereiche. Grundlagen
ohne verfügbare BLC26-Kurve bleiben mit dem Zähler 0 sichtbar.

Ein Direktlink mit `?curve=<curveId>` öffnet ausschließlich die im GWL-Export
unverändert enthaltene Kurven-ID und zeigt die Kurveninformationen im technischen Detailfenster. Die ID muss URL-kodiert
übergeben werden;
bei unbekannten oder entfernten IDs bleibt die Standardansicht erhalten und es
erscheint eine verständliche Meldung. Weitere Kurvennamen oder interne
Metadaten werden nicht in die URL geschrieben.

## Kurvenauswahl und öffentliche Startansicht

Die Legende erklärt die eingeblendeten Kurven, Farben, Linienarten und Punkte.
Ein Klick auf einen Kurvennamen öffnet weiterhin die technischen Details.
Die frühere Einzelansicht in der Legende entfällt; beliebige Kombinationen
werden ausschließlich mit den Checkboxen in der Kurventabelle zusammengestellt.
„Tabellentreffer hinzufügen“ ergänzt die sichtbaren Treffer zur bestehenden Auswahl.
„Auswahl leeren“ entfernt alle Kurven. „Nur ausgewählte zeigen“ begrenzt die Tabelle.

Die veröffentlichte Datei `data/start-view.json` legt die öffentliche Startansicht
über stabile Kurven-IDs und drei Segment-Schalter fest. Die vorläufige Auswahl
enthält CO₂, Temperatur, Waldfläche, Phosphoreinsatz und Kunststoffproduktion;
Hauptreihen und Rekonstruktionen sind aktiviert, Szenarien ausgeschaltet.
Neue GWL-Importe erweitern die Tabelle, aber nicht automatisch diese Auswahl.

Für die Waldflächen-Kernkurve wird die historische Pongratz-Rekonstruktion in
BLC26 nicht mehr dargestellt und nicht für die vertikale Skalierung verwendet.
Ihre Walddefinition und Bezugsfläche erlauben keinen unmittelbaren Anschluss
an die Hauptreihe 1992–2022. Diese Ausnahme gilt auch bei eingeschaltetem
Rekonstruktions-Schalter; andere Kurven behalten ihre Rekonstruktionen.
Der verifizierte GWL-Export bleibt unverändert. Der Methodenhinweis im
Detailfenster erläutert die tatsächlich gezeigte Hauptreihe. Eine Projektion
wird erst nach Prüfung ihrer Vergleichbarkeit über den GWL-Export übernommen.

Prüfstand Waldprojektion (4. Oktober 2026):

- [Chen et al. 2022, Tabelle 1](https://www.nature.com/articles/s41597-022-01208-6):
  Die Modellklasse „Forest“ schließt auch Buschland und bestimmte Mosaikflächen ein.
  Der ESA-CCI-Bezug allein belegt daher keine Vergleichbarkeit mit der PHC-Kernkurve.
  Die veröffentlichte Gesamtklasse wird nicht direkt angefügt.
- [Beier et al., MAgPIE-Forschungsdaten v2](https://zenodo.org/records/14870633):
  `Data_plots_v2.zip` wurde geprüft, insbesondere `scenario_data/PBindicators_full.csv`,
  `paper_plots/pbTable_2100.csv` und `output_scripts/PBpaperPlots.R`.
  Die Datei enthält den Indikator `Planetary Boundary|Land|Forest cover (Mha)`.
  Die Übersicht nennt 3877,16 Mio. ha als aktuellen Wert 2020 und 4790 Mio. ha
  als Grenzwert. Bei der im zugehörigen Artikel verwendeten 75-%-Grenze entspricht
  dies rechnerisch 60,71 % (Nenner: 4790 / 0,75). Unsere PHC-Hauptreihe enthält
  für 2020 näherungsweise 58,9 %. Diese unterschiedlichen Ausgangswerte und die
  Vergleichbarkeit der Walddefinitionen sind vor einer Verbindung zu klären.
  Das Archiv stammt aus der Wiedereinreichung des Manuskripts; die endgültige
  Publikationsfassung ist bei einer Übernahme zusätzlich abzugleichen.

Ergebnis: Noch keine Projektion für den direkten Anschluss freigegeben.
Keine Verschiebung oder Skalierung von Szenariowerten auf den letzten BLC-Wert;
keine Interpolation auf 2022 zur Erzeugung eines optisch nahtlosen Anschlusses.

Zum Ändern BLC26 mit `start-server.cmd` öffnen, Kurven und Darstellung auswählen
und „Startansicht veröffentlichen“ anklicken. Diese Funktion erscheint
nur auf localhost und speichert `data/start-view.json`, führt die Projektprüfungen
aus und erstellt automatisch einen Commit ausschließlich für diese Datei.
Anschließend wird nach `origin/main` gepusht; der GitHub-Pages-Workflow aktualisiert
die öffentliche Seite. Die Anzahl neben dem Button bestätigt die auf GitHub
übernommenen Kurven, noch nicht den Abschluss des anschließenden Pages-Deployments.
Mindestens eine Kurve und eine Darstellungsart sind erforderlich. Git-Zugang und
Netzwerkverbindung müssen verfügbar sein. Andere lokale Änderungen oder
unveröffentlichte Commits stoppen die Veröffentlichung. Bei einem Push-Fehler bleibt
die Auswahl lokal erhalten; ein erneuter Klick kann den Startansicht-Commit übertragen.
Der Ablauf ist vom Benutzer dauerhaft autorisiert (siehe `AGENTS.md`).
„Startansicht wiederherstellen“ setzt Auswahl, Darstellung und Tabellenfilter zurück.
Die Auswahl wird nicht automatisch im Browser gespeichert.

„Auswahl als Link kopieren“ erzeugt einen Link mit wiederholten `curves`-Parametern
und `segments`. Die Kurven-IDs werden URL-kodiert; weitere Metadaten fehlen.
Eine ausdrücklich leere Auswahl lässt sich ebenfalls teilen.
Ein gültiger `?curve=…`-Einzelkurvenlink hat Vorrang, danach eine benannte Ansicht,
eine geteilte Auswahl und schließlich die öffentliche Startansicht. Ungültige Auswahllinks zeigen eine Meldung
und behalten die Startansicht bei. Fehlende IDs in einer älteren Startkonfiguration
werden mit Hinweis ausgelassen; eine defekte oder fehlende Konfiguration fordert
zur manuellen Auswahl auf, statt ungefragt alle Kurven einzublenden.

Eine Verlinkung oder Einbettung auf th-luebeck.de/zustand sollte die öffentliche
BLC26-URL ohne Auswahlparameter verwenden, um dieser Startkonfiguration zu folgen.
Ein Link mit Auswahlparametern zeigt dagegen bewusst eine bestimmte Zusammenstellung.
Die konkrete Einbindung im TH-CMS wird separat gepflegt.

Die kurze Adresse `?view=zustand` lädt eine eigene, nicht interaktive
Einbettungsansicht für die ZUSTAND-Homepage. Sie zeigt fünf kuratierte Leitkurven
mit Beobachtungswerten und vorhandenen historischen Rekonstruktionen. Einzelne
Zukunftsszenarien, Seitenleisten, technische Statusanzeigen und die allgemeine
Navigation bleiben in dieser kompakten Ansicht ausgeblendet. Ein Link rechts
unten öffnet die vollständige BLC26-Anwendung in einem neuen Tab.

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
   node scripts/test-curve-selection.mjs
   node scripts/test-curve-links.cjs
   node scripts/test-reference-status.cjs
   node scripts/test-certificates.mjs
   node scripts/test-start-view-publication.mjs
   git diff --check
   ```

## Lokal testen

`start-server.cmd` doppelt anklicken und anschließend `http://localhost:3000` öffnen. Der lokale Server benötigt nur Node.js, lädt keine Pakete nach und wird mit `Strg+C` beendet.

Zur reinen Ansicht (der Veröffentlichungsbutton benötigt den Node-Server):

```powershell
python -m http.server 3000
```

## Prüfberichte und Zertifikate

Im technischen Detailbereich zeigt jede Kurve höchstens einen veröffentlichten
Prüfbericht oder ein Zertifikat als PDF. Die Zuordnung steht in
`data/certificates.json`; die Dateien liegen im Ordner `certificates`.

Der Upload ist ausschließlich unter `localhost`, `127.0.0.1` oder `::1` sichtbar.
Dazu BLC26 mit `start-server.cmd` beziehungsweise `node scripts/serve-local.mjs`
starten, eine Kurve öffnen und im Abschnitt „Prüfbericht und Zertifikat“ eine PDF
auswählen. Der lokale Server prüft Kurvenkennung, Dateityp, PDF-Dateikopf und die
Größenbegrenzung von 20 MB. Eine neue Datei ersetzt die bisherige PDF derselben
Kurve und aktualisiert das Manifest. Für die öffentliche Bereitstellung müssen
PDF und Manifest anschließend gemeinsam geprüft, committed und gepusht werden.

Ein gewöhnlicher statischer Server wie `python -m http.server` kann die PDFs
anzeigen, unterstützt aber keinen Upload.

## Veröffentlichung

GitHub Pages kann die Dateien direkt aus dem Hauptzweig und dem Repository-Stammverzeichnis bereitstellen.

## Statistikabschnitte der Hauptreihe

Der reguläre GWL-Import enthält optional `observationSegments` mit Originalwerten, Gebietsbezug, Methoden und Herkunft je Abschnitt. BLC zeichnet jeden Abschnitt mit der bestehenden Hauptlinien-Darstellung; über Gebiets- oder Zensuswechsel wird keine Linie gezogen. Auswahl über Linie, Punkt, Tastatur oder Berührung öffnet die Herkunft dieses Abschnitts im vorhandenen Detailfenster. Dauerhafte Jahresbeschriftungen oder neue Markertypen werden nicht eingeführt. Ein Abschnitt mit genau einem Originalwert erhält einen regulären Punkt, falls er im exportierten Punktraster nicht enthalten ist; es werden keine Werte erzeugt. Die übrige Fünfjahresauswahl bleibt erhalten.

Wohnfläche je Einwohner: 45 Originalwerte 1950–2025; bis 1989 früheres Bundesgebiet, ab 1990 Gesamtdeutschland. Sechs Statistikabschnitte, keine Rekonstruktion oder Zukunftsprojektion. GWL-Beitrag und Export sind die Datenquelle; keine separate lokale Kurvendatei.
