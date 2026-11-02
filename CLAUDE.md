# Arbeitsweise in diesem Repository

## Trigger „push“

„push“ (oder sinnverwandt, z. B. „git push“) bezeichnet den vollständigen Ablauf bis `main`:

1. Version fortschreiben nach dem Schema `Jahr.Push.Iteration` (zweistellige Jahreszahl · laufende Nummer des GitHub-Pushes auf `main` im Jahr · Iteration; npm identisch, z. B. `26.17.1`): je Push auf `main` den Push-Zähler um 1 erhöhen und die Iteration auf 1 setzen; bei lokalen Runden ohne Push nur die Iteration um 1 erhöhen; zum Jahreswechsel beginnt der Push-Zähler wieder bei 1. Die Version steht in `package.json`, `package-lock.json`, `src/main.tsx` (`VERSION`), `public/engine.py` (`VERSION`), `public/THIRD-PARTY-NOTICES.txt`, `index.html` (`<title>`) und README (Abschnitt Versioning); Kopf-/Fußleiste, Fenstertitel und Mail-Betreff lesen `VERSION` aus `src/main.tsx`.
2. CHANGELOG um eine neue Sektion ergänzen, README (Funktionsbeschreibung) konsolidieren.
3. Lokal prüfen: `npx tsc -b`, `.venv/bin/pytest tests -q`, `npm test` (der Pyodide-Laufzeittest braucht das jsDelivr-CDN).
4. Commit, Push des Arbeitsbranches, Pull Request anlegen.
5. Auf den GitHub-Actions-Lauf „Tests“ warten; ist er grün und der PR konfliktfrei, den PR ohne weitere Rückfrage nach `main` mergen. Ist er rot, zuerst die Ursache beheben.

Eine separate Anweisung „PR mergen“ ist nicht nötig.
