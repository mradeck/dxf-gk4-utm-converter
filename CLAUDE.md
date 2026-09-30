# Arbeitsweise in diesem Repository

## Trigger „push“

„push“ (oder sinnverwandt, z. B. „git push“) bezeichnet den vollständigen Ablauf bis `main`:

1. Version fortschreiben (`YY.MM.feature.fix`, npm `YY.M.feature`) in `package.json`, `package-lock.json`, `src/main.tsx` (`VERSION`), `public/engine.py` (`VERSION`), `public/THIRD-PARTY-NOTICES.txt` und README (Abschnitt Versioning).
2. CHANGELOG um eine neue Sektion ergänzen, README (Funktionsbeschreibung) konsolidieren.
3. Lokal prüfen: `npx tsc -b`, `.venv/bin/pytest tests -q`, `npm test` (der Pyodide-Laufzeittest braucht das jsDelivr-CDN).
4. Commit, Push des Arbeitsbranches, Pull Request anlegen.
5. Auf den GitHub-Actions-Lauf „Tests“ warten; ist er grün und der PR konfliktfrei, den PR ohne weitere Rückfrage nach `main` mergen. Ist er rot, zuerst die Ursache beheben.

Eine separate Anweisung „PR mergen“ ist nicht nötig.
