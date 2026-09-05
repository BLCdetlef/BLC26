# Verbindliche Repository-Sicherheit

Dieses Repository ist die einzige maßgebliche lokale Arbeitskopie von BLC26:

`C:\Users\haud\Documents\GitHub\BLC26`

Vor jeder Analyse, Änderung, Ausführung von Tests, jedem Commit und jedem Push:

1. Mit `git rev-parse --show-toplevel` prüfen, dass exakt der oben genannte Ordner geöffnet ist.
2. Mit `git branch --show-current` den aktuellen Branch prüfen.
3. Mit `git remote get-url origin` prüfen, dass `https://github.com/BLCdetlef/BLC26.git` konfiguriert ist.
4. Mit `git status --short --branch` vorhandene lokale Änderungen prüfen und bewahren.

Bei einem abweichenden Projektpfad oder Remote nichts verändern. Insbesondere nicht in früheren Arbeitskopien unter `C:\Users\haud\Documents\ChatGPT` arbeiten. Stattdessen den Benutzer auf die falsche Projektzuordnung hinweisen und stoppen.

Vor einem Commit müssen die projektspezifischen Prüfungen und `git diff --check` erfolgreich sein. Ein Push erfolgt nur nach ausdrücklicher Freigabe des Benutzers.
