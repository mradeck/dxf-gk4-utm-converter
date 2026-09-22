import { useMemo, useState } from "react";
import { ExternalLink, Filter, Search } from "lucide-react";
import {
  groupKey,
  initialSelection,
  selectedEntries,
  type Inventory,
  type Selection,
} from "./selection";

export function PreflightPanel({
  inventory,
  selection,
  onChange,
  busy,
  onReinspect,
  lang,
}: {
  inventory: Inventory;
  selection: Selection;
  onChange: (v: Selection) => void;
  busy: boolean;
  onReinspect: (distance: number) => void;
  lang: "de" | "en";
}) {
  const de = lang === "de",
    txt = (a: string, b: string) => (de ? a : b);
  const [distance, setDistance] = useState(String(inventory.distance));
  const [focus, setFocus] = useState(inventory.primary ?? "");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [page, setPage] = useState(0);
  const selected = useMemo(
    () => selectedEntries(inventory, selection),
    [inventory, selection],
  );
  const selectedSet = useMemo(
    () => new Set(selected.map((e) => e.id)),
    [selected],
  );
  const toggle = (
    key: "clusters" | "excludedGroups" | "excludedIds",
    value: string,
  ) => {
    const set = new Set(selection[key]);
    set.has(value) ? set.delete(value) : set.add(value);
    onChange({ ...selection, [key]: [...set] });
  };
  const suspectClusters = useMemo(
    () =>
      new Set(
        inventory.clusters.filter((c) => c.suggestedOmit).map((c) => c.id),
      ),
    [inventory],
  );
  const rows = useMemo(
    () =>
      inventory.entries.filter(
        (e) =>
          (!flaggedOnly ||
            !e.plausible ||
            e.reason ||
            suspectClusters.has(e.cluster ?? "")) &&
          (e.layer + " " + e.type + " " + e.handle)
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [inventory, flaggedOnly, search, suspectClusters],
  );
  const maxPage = Math.max(0, Math.ceil(rows.length / 50) - 1),
    currentPage = Math.min(page, maxPage);
  const target = inventory.clusters.find((c) => c.id === focus);
  const plot = inventory.entries
    .filter((e) => e.cluster === focus && e.bounds)
    .slice(0, 1000);
  const b = target?.bounds,
    w = b ? Math.max(b[2] - b[0], 1) : 1,
    h = b ? Math.max(b[3] - b[1], 1) : 1,
    pad = Math.max(w, h) * 0.08;
  return (
    <section className="panel preflight">
      <h2>
        <span className="step">02</span>
        {txt("Vorprüfung & Importauswahl", "Preflight & import selection")}
        <Filter size={17} />
      </h2>
      <p className="muted">
        {txt(
          "Die Datei wird zunächst nur lokal eingelesen und geprüft. Erst deine Auswahl wird transformiert. Auffällig bedeutet nicht automatisch falsch – nichts wird ungefragt gelöscht.",
          "The file is initially read and checked locally. Only your selection is transformed. Suspicious does not mean invalid — nothing is removed without your choice.",
        )}
      </p>
      <div className="stats">
        <div>
          <strong>{inventory.total.toLocaleString(lang)}</strong>
          <span>{txt("Objekte gefunden", "Objects found")}</span>
        </div>
        <div>
          <strong>{inventory.pointCount.toLocaleString(lang)}</strong>
          <span>POINT</span>
        </div>
        <div>
          <strong>{selected.length.toLocaleString(lang)}</strong>
          <span>{txt("zur Übernahme", "selected")}</span>
        </div>
      </div>
      <label className="selection-check">
        <input
          type="checkbox"
          checked={!selection.excludePoints}
          disabled={busy}
          onChange={(e) =>
            onChange({ ...selection, excludePoints: !e.target.checked })
          }
        />
        <span>
          <strong>
            {txt(
              "Einzelne POINT-Objekte mitnehmen",
              "Include standalone POINT objects",
            )}
          </strong>
          <small>
            {txt(
              "Gilt auch für POINTs in aufgelösten Blöcken. Stützpunkte von Linien, Flächen und Polylinien bleiben erhalten.",
              "Also applies to POINTs inside decomposed blocks. Vertices of lines, faces and polylines are retained.",
            )}
          </small>
        </span>
      </label>
      <div className="preflight-actions">
        <button
          disabled={busy}
          className="secondary"
          onClick={() => onChange(initialSelection(inventory))}
        >
          {txt("Alles auswählen", "Select all")}
        </button>
        <span>
          {inventory.total - selected.length}{" "}
          {txt("bewusst abgewählt", "intentionally excluded")}
        </span>
      </div>
      <details className="disclosure" open>
        <summary>
          {txt("Räumliche Gruppen & Ausreißer", "Spatial groups & outliers")} (
          {inventory.clusters.length})
        </summary>
        <p>
          {txt(
            "Wie im Geodata Inspector: Nähe der Objektmittelpunkte, Standard 1.000 m. Ab 60 % Anteil gilt ein Hauptbereich als dominant. Getrennte Projektteile können trotzdem korrekt sein. Block- und Textlagen werden über Ankerpunkte angenähert. Neu prüfen setzt die Auswahl zurück.",
            "Like Geodata Inspector: object-centre proximity, default 1,000 m. A main area is dominant at a 60% share. Separate project areas may still be valid. Block and text positions use approximate anchor points. Rechecking resets the selection.",
          )}
        </p>
        <div className="cluster-distance">
          <label>
            {txt("Clusterabstand (m)", "Cluster distance (m)")}
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={distance}
              disabled={busy}
              onChange={(e) => setDistance(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            disabled={
              busy ||
              !Number.isFinite(Number(distance)) ||
              Number(distance) < 1 ||
              Number(distance) > 100000
            }
            onClick={() => onReinspect(Number(distance))}
          >
            {txt("Neu prüfen", "Recheck")}
          </button>
        </div>
        {!inventory.dominant && inventory.clusters.length > 1 && (
          <p className="review-warning">
            {txt(
              "Kein eindeutiger Hauptbereich. Bitte Gruppen prüfen und selbst wählen.",
              "No unambiguous main area. Review and choose groups yourself.",
            )}
          </p>
        )}
        {inventory.conservative && (
          <p className="review-warning">
            {txt(
              "Sehr dichter Datensatz: Einige Nachbargruppen wurden konservativ zusammengefasst. Keine automatische Ausreißerempfehlung.",
              "Very dense dataset: some neighbouring groups were merged conservatively. No automatic outlier recommendation.",
            )}
          </p>
        )}
        <div className="table-scroll cluster-table">
          <table>
            <thead>
              <tr>
                <th>{txt("Mitnehmen", "Include")}</th>
                <th>{txt("Objekte / Punkte", "Objects / points")}</th>
                <th>{txt("Abstand zum Vorschlag", "Distance to candidate")}</th>
                <th>{txt("Bewertung", "Assessment")}</th>
                <th>{txt("Fokus", "Focus")}</th>
              </tr>
            </thead>
            <tbody>
              {inventory.clusters.map((c) => (
                <tr key={c.id} className={!c.plausible ? "suspect" : ""}>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        checked={selection.clusters.includes(c.id)}
                        disabled={busy}
                        onChange={() => toggle("clusters", c.id)}
                      />
                      {c.id}
                    </label>
                  </td>
                  <td>
                    {c.count.toLocaleString(lang)} /{" "}
                    {c.points.toLocaleString(lang)}
                  </td>
                  <td>
                    {(c.distance / 1000).toLocaleString(lang, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    km
                  </td>
                  <td>
                    {!c.plausible
                      ? txt("GK4-unplausibel", "GK4 implausible")
                      : c.id === inventory.primary
                        ? txt("Hauptbereich-Kandidat", "Main-area candidate")
                        : txt(
                            "Entfernter Bereich · prüfen",
                            "Remote area · review",
                          )}
                  </td>
                  <td>
                    <button
                      className={
                        focus === c.id ? "focus-button active" : "focus-button"
                      }
                      onClick={() => setFocus(c.id)}
                    >
                      {txt("Anzeigen", "Show")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {inventory.entries.some((e) => e.cluster === null) && (
          <label className="selection-check">
            <input
              disabled={busy}
              type="checkbox"
              checked={selection.clusters.includes("unlocated")}
              onChange={() => toggle("clusters", "unlocated")}
            />
            {txt(
              "Objekte ohne bestimmbare Lage versuchen",
              "Attempt objects without a measurable location",
            )}
          </label>
        )}
        {target && (
          <>
            <div className="cluster-plot">
              <svg
                role="img"
                aria-label={txt("Fokusbereich in GK4", "Focus area in GK4")}
                viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`}
              >
                <g transform={`translate(0,${h}) scale(1,-1)`}>
                  {plot.map((e) => {
                    const q = e.bounds!;
                    return (
                      <rect
                        key={e.id}
                        x={q[0] - b![0]}
                        y={q[1] - b![1]}
                        width={Math.max(q[2] - q[0], w * 0.006)}
                        height={Math.max(q[3] - q[1], h * 0.006)}
                        fill="none"
                        stroke={selectedSet.has(e.id) ? "#35876a" : "#bd7354"}
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </g>
              </svg>
              <small>
                {focus} ·{" "}
                {txt(
                  "schematische Bounds/Anker · max. 1.000 Objekte",
                  "schematic bounds/anchors · max. 1,000 objects",
                )}
              </small>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => onChange({ ...selection, clusters: [focus] })}
            >
              {txt(
                "Nur diesen räumlichen Bereich übernehmen",
                "Keep only this spatial area",
              )}
            </button>
          </>
        )}
        {inventory.inflation !== null && inventory.inflation >= 10 && (
          <p className="review-warning">
            {txt(
              "Gesamtausdehnung aufgebläht um Faktor",
              "Overall extent inflated by factor",
            )}{" "}
            {inventory.inflation.toLocaleString(lang, {
              maximumFractionDigits: 1,
            })}
            .
          </p>
        )}
        {inventory.zeroZCount > 0 && (
          <p>
            {inventory.zeroZCount}{" "}
            {txt(
              "Objekte auf Z=0 neben deutlich höheren Objekten – nur Prüfhilfe, keine automatische Löschung.",
              "objects at Z=0 alongside elevated objects — review hint only, never automatic removal.",
            )}
          </p>
        )}
      </details>
      <details className="disclosure">
        <summary>
          {txt("Layer & Objekttypen auswählen", "Choose layers & entity types")}{" "}
          ({inventory.groups.length})
        </summary>
        <p>
          {txt(
            "Filter beziehen sich auf Modellbereich-Objekte. Ein Block bleibt eine gemeinsame Auswahl.",
            "Filters apply to model-space objects. A block remains one selection unit.",
          )}
        </p>
        <div className="group-list">
          {inventory.groups.map((g) => (
            <label key={groupKey(g.layer, g.type)}>
              <input
                type="checkbox"
                disabled={busy}
                checked={
                  !selection.excludedGroups.includes(groupKey(g.layer, g.type))
                }
                onChange={() =>
                  toggle("excludedGroups", groupKey(g.layer, g.type))
                }
              />
              <span>{g.layer}</span>
              <code>{g.type}</code>
              <b>{g.count.toLocaleString(lang)}</b>
            </label>
          ))}
        </div>
      </details>
      <details className="disclosure">
        <summary>
          {txt(
            "Einzelobjekte prüfen / abwählen",
            "Review / exclude individual objects",
          )}
        </summary>
        <div className="inspection-search">
          <Search size={15} />
          <input
            aria-label={txt("Objekte suchen", "Search objects")}
            placeholder={txt("Layer, Typ oder Handle", "Layer, type or handle")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <label>
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => {
                setFlaggedOnly(e.target.checked);
                setPage(0);
              }}
            />
            {txt("Nur auffällige", "Suspicious only")}
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{txt("Mitnehmen", "Include")}</th>
                <th>Handle / Layer</th>
                <th>{txt("Befund", "Finding")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(currentPage * 50, currentPage * 50 + 50).map((e) => {
                const filtered =
                  !selection.clusters.includes(e.cluster ?? "unlocated") ||
                  selection.excludedGroups.includes(
                    groupKey(e.layer, e.type),
                  ) ||
                  (selection.excludePoints && e.type === "POINT");
                return (
                  <tr key={e.id}>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSet.has(e.id)}
                          disabled={busy || filtered}
                          onChange={() => toggle("excludedIds", e.id)}
                        />
                        {e.type}
                      </label>
                    </td>
                    <td>
                      #{e.handle} · {e.layer}
                    </td>
                    <td>
                      {e.reason ||
                        (suspectClusters.has(e.cluster ?? "")
                          ? txt(
                              "Entfernter Bereich / manuell prüfen",
                              "Remote area / manual review",
                            )
                          : txt(
                              "Keine räumliche Auffälligkeit erkannt",
                              "No spatial anomaly detected",
                            ))}
                      {filtered &&
                        ` · ${txt("bereits gefiltert", "already filtered")}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="preflight-actions">
          <button
            className="secondary"
            disabled={currentPage === 0}
            aria-label={txt("Vorherige Seite", "Previous page")}
            onClick={() => setPage(currentPage - 1)}
          >
            ←
          </button>
          <span>
            {rows.length} {txt("Treffer", "matches")} · {currentPage + 1}/
            {maxPage + 1}
          </span>
          <button
            className="secondary"
            disabled={currentPage === maxPage}
            aria-label={txt("Nächste Seite", "Next page")}
            onClick={() => setPage(currentPage + 1)}
          >
            →
          </button>
        </div>
      </details>
      {(inventory.audit.repairs > 0 ||
        inventory.audit.errors > 0 ||
        inventory.audit.recovered) && (
        <p className="review-warning">
          {txt("DXF-Recovery / Audit:", "DXF recovery / audit:")}{" "}
          {inventory.audit.repairs} {txt("Reparaturen", "repairs")},{" "}
          {inventory.audit.errors}{" "}
          {txt(
            "Befunde. Details stehen im Exportprotokoll.",
            "findings. Details are included in the export report.",
          )}
        </p>
      )}
      <a
        className="cleaner-link"
        href="https://geodata-inspector-cleaner.netlify.app/"
        target="_blank"
        rel="noreferrer"
      >
        {txt(
          "Für weitergehendes Cleanup: Geodata Inspector & Cleaner",
          "For advanced cleanup: Geodata Inspector & Cleaner",
        )}
        <ExternalLink size={13} />
      </a>
    </section>
  );
}
