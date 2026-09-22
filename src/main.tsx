import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  FileCode2,
  FileSearch,
  CodeXml as Github,
  Layers,
  Map as MapIcon,
  Moon,
  Sun,
  ShieldCheck,
  Upload,
  X,
  TriangleAlert,
  Coffee,
  ExternalLink,
  Crosshair,
  LoaderCircle,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

type Issue = { type: string; handle: string; layer: string; message: string };
type Report = {
  version: string;
  counts: Record<string, number>;
  layers: string[];
  dxfVersion: string;
  warnings: Record<string, number>;
  blockers: Issue[];
  outputEntities: number;
  evaluations: number;
  preview: number[][][];
  sourceBounds: number[] | null;
  targetBounds: number[] | null;
  geographicBounds?: [number[], number[]];
  grid: { from: string; to: string; subgrids: number; sha256: string };
  samples: { source: number[]; target: number[] }[];
};
const VERSION = "26.09.1.0";
const authority =
  "https://www.ldbv.bayern.de/vermessung/utm_umstellung/trans_geofach.html";
const dict = {
  de: {
    subtitle: "Das Koordinaten-Werkzeug für deine CAD-Pläne",
    eyebrow: "GK4 → UTM32 · LOKAL IM BROWSER",
    title: "Neue Koordinaten.",
    title2: "Dein Plan bleibt deiner.",
    intro:
      "DXF-Dateien analysieren und von Gauß-Krüger nach ETRS89 / UTM transformieren. Mit nachvollziehbarer Gittertransformation und Prüfprotokoll.",
    source: "Ausgangssystem",
    target: "Zielsystem",
    local: "Kein Datei-Upload",
    model: "Nur Modellbereich",
    height: "Z bleibt unverändert",
    file: "Deine DXF-Datei",
    step1: "Datei auswählen",
    drop: "DXF hier ablegen",
    browse: "oder Datei auswählen",
    fileHint: "ASCII & binäre DXF · bis 25 MB",
    demo: "Mit Beispielplan ausprobieren",
    step2: "Transformation festlegen",
    method: "Transformationsgitter",
    beta: "BeTA2007 · deutschlandweit",
    custom: "Eigenes NTv2-Gitter (.gsb)",
    grid: "Gitterdatei auswählen",
    gridHint: "Bessel/DHDN → GRS80/ETRS89 · bis 256 MB",
    tolerance: "Kurven-Segmentierung",
    analyze: "Analysieren & vorbereiten",
    cancel: "Abbrechen",
    runtime: "Browser-Rechenkern wird geladen …",
    libraries: "CAD- und Geodäsie-Bibliotheken werden geladen …",
    processing: "Geometrien prüfen und transformieren …",
    initialLoad:
      "Beim ersten Start werden Bibliotheken vom CDN geladen. Deine DXF- und Gitterdateien verlassen den Browser nicht.",
    preview: "Planvorschau",
    map: "Lagekarte",
    empty: "Hier bekommt dein Plan neue Koordinaten.",
    emptyHint: "Wähle eine DXF-Datei oder starte mit dem Beispielplan.",
    viewHint: "UTM32 · vereinfachte Vorschau · nicht maßstäblich",
    notice: "Das richtige Gitter entscheidet über die Genauigkeit.",
    betaNotice:
      "BeTA2007 ist für Geotopographie gedacht: Dezimeterbereich, keine zugesicherte Katastergenauigkeit.",
    customNotice:
      "Ein eigenes Gitter verbessert die Genauigkeit nur, wenn es fachlich zu deinen Ausgangsdaten passt. Die App prüft das Format, nicht die vermessungstechnische Qualität.",
    authority: "Hinweise des Landesamts",
    retired:
      "BY-KanU wird seit Ende 2024 vom LDBV nicht mehr bereitgestellt. Vorhandene Gitter nur mit geklärter Eignung und Nutzungsberechtigung einsetzen.",
    ready: "Prüfung abgeschlossen",
    blocked: "Export gesperrt",
    entities: "Quellobjekte",
    layers: "Layer",
    exportObjects: "Exportobjekte",
    report: "Prüfprotokoll",
    download: "UTM-DXF herunterladen",
    ack: "Ich habe die Hinweise geprüft: Export als neue Modellbereich-Zeichnung, mit zerlegten Blöcken/Bemaßungen und segmentierten Kurven. Eignung des Gitters und Ergebnis werde ich anhand bekannter Punkte kontrollieren.",
    summary: "Analyse & Export",
    changes: "Was sich beim Export ändert",
    technical: "Technische Prüfmeldungen",
    support: "Unterstützung & Grenzen",
    more: "Weitere Apps",
    contact: "Hilfe / Bugreport / Kontakt",
    imprint: "Impressum",
    made: "Ein Werkzeug von Michael Radeck",
    privacy: "Lokal verarbeitet. Keine Analyse-Tracker.",
    mapConsent: "Karte laden",
    mapPrivacy:
      "Erst beim Laden werden OpenStreetMap-Kacheln abgerufen. Dabei werden IP-Adresse und Kartenausschnitt an den Kartenanbieter übermittelt.",
    noMap: "Noch keine gültige Ausdehnung vorhanden.",
    methodHelp:
      "EPSG beschreibt das Koordinatensystem, nicht das konkrete Transformationsverfahren. NTv2 enthält ortsabhängige Verschiebungen zwischen DHDN und ETRS89. Ohne gültige Gitterabdeckung wird der Export abgebrochen – es gibt keinen stillen Ersatz durch eine ungenauere Methode.",
    toleranceHelp:
      "Bögen, Kreise, Splines und Polylinien werden als 3D-Polylinien exportiert. Die Einstellung steuert die Segmentierung (Standard 5 mm); sie ist keine Aussage zur absoluten Lagegenauigkeit. Geraden werden bei Bedarf zusätzlich unterteilt. Flächen und Netze behalten ihre Topologie; ihre Innenflächen werden nicht verdichtet.",
    fileHelp:
      "Erwartet werden vollständige GK4-Koordinaten in Metern: X = Rechtswert (etwa 4,5 Millionen), Y = Hochwert. Keine vertauschten Achsen, lokalen Baukoordinaten, Millimeter oder DWG. Das Quell-CRS wird nicht automatisch erkannt; die Zahlen werden nur plausibilisiert.",
    crsHelp:
      "GK4: DHDN / Bessel, Mittelmeridian 12°, 3°-Streifen. UTM32: ETRS89 / GRS80, Mittelmeridian 9°, 6°-Zone. Ausgabe ohne vorangestellte Zonenziffer 32. Z-Werte werden weder in der Höhe noch im Höhenbezug geändert.",
    limits:
      "Unterstützt: Punkte, Linien, 2D-/3D-Polylinien, Bögen, Kreise, Ellipsen, Splines, Texte, ebene Schraffuren, 3D-Flächen/Netze, einfache und verschachtelte gleichmäßig skalierte Blöcke sowie darstellbare Bemaßungen/Multileader. Sonderfälle sperren den gesamten Export: unter anderem XREF, Proxy-/ACIS-Objekte, breite Polylinien, XCLIP, gespiegelte/ungleichmäßig skalierte Blöcke und gekippte Texte. Keine DWG-Dateien.",
    modelHelp:
      "Es entsteht eine neue DXF R2018 mit Modellbereich, Layern, Linientypen und Textstilen. Papierlayouts, Viewports, Abhängigkeiten, benutzerdefinierte Metadaten und editierbare Block-/Bemaßungslogik werden nicht übernommen. Texte und Bemaßungszahlen werden nicht inhaltlich neu berechnet. CAD-Schriften müssen im Zielprogramm vorhanden sein.",
    newGrid: "Eigenes Gitter erstellen?",
    newGridText:
      "Ein belastbares lokales Gitter benötigt identische Punkte mit bekannten GK- und UTM-Koordinaten sowie unabhängige Kontrollpunkte. Eine feinere Rasterung von BeTA2007 erzeugt keine höhere Genauigkeit. Diese Version importiert Gitter; sie leitet keine neuen Gitter ab.",
    error: "Die Datei konnte nicht verarbeitet werden.",
    warningIntro:
      "Kein verlustfreier CAD-Roundtrip. Vor produktiver Verwendung in CAD öffnen und mit unabhängigen Kontrollpunkten prüfen.",
    app: "DXF Coordinate Forge",
    readyHint:
      "Die unterstützte Geometrie ist vorbereitet. Hinweise bestätigen, dann herunterladen.",
    invalidHint:
      "Mindestens ein Objekt kann nicht sicher übertragen werden. Bitte die aufgelisteten Objekte in CAD bereinigen. Kein Teil-Export.",
    noSource: "Bitte zuerst eine DXF-Datei auswählen.",
    missingGrid: "Bitte eine NTv2-Gitterdatei auswählen.",
    gridLarge:
      "Gitter größer als 256 MB. Bitte einen kleineren regionalen Ausschnitt verwenden.",
    fileLarge: "Die DXF-Datei darf maximal 25 MB groß sein.",
    reset: "Zurücksetzen",
    supportMail: "E-Mail öffnen",
    mailHint:
      "Öffnet dein E-Mail-Programm. Keine DXF-Datei wird automatisch angehängt.",
    reference: "Koordinaten-Stichprobe",
    noPreview: "Für diese Objekte ist keine Linienvorschau verfügbar.",
  },
  en: {
    subtitle: "The coordinate tool for your CAD drawings",
    eyebrow: "GK4 → UTM32 · IN YOUR BROWSER",
    title: "New coordinates.",
    title2: "Your drawing stays yours.",
    intro:
      "Analyze DXF files and transform Gauss–Krüger coordinates to ETRS89 / UTM. With an explicit grid transformation and an inspection report.",
    source: "Source system",
    target: "Target system",
    local: "No file upload",
    model: "Model space only",
    height: "Z stays unchanged",
    file: "Your DXF file",
    step1: "Choose a drawing",
    drop: "Drop your DXF here",
    browse: "or choose a file",
    fileHint: "ASCII & binary DXF · up to 25 MB",
    demo: "Try the sample drawing",
    step2: "Set the transformation",
    method: "Transformation grid",
    beta: "BeTA2007 · Germany",
    custom: "Custom NTv2 grid (.gsb)",
    grid: "Choose grid file",
    gridHint: "Bessel/DHDN → GRS80/ETRS89 · up to 256 MB",
    tolerance: "Curve segmentation",
    analyze: "Analyze & prepare",
    cancel: "Cancel",
    runtime: "Loading the browser runtime …",
    libraries: "Loading CAD and geodesy libraries …",
    processing: "Checking and transforming geometry …",
    initialLoad:
      "The first run loads libraries from a CDN. Your DXF and grid files never leave your browser.",
    preview: "Drawing preview",
    map: "Location map",
    empty: "A new coordinate system for your drawing.",
    emptyHint: "Choose a DXF file or try the sample drawing.",
    viewHint: "UTM32 · simplified preview · not to scale",
    notice: "The right grid determines accuracy.",
    betaNotice:
      "BeTA2007 targets geotopographic data: decimetre-level accuracy, not assured cadastral accuracy.",
    customNotice:
      "A custom grid only improves accuracy when it matches the source data. This app validates its format, not its surveying quality.",
    authority: "Surveying authority guidance",
    retired:
      "The LDBV stopped providing BY-KanU at the end of 2024. Only use existing grids if their suitability and usage rights are established.",
    ready: "Inspection complete",
    blocked: "Export blocked",
    entities: "Source entities",
    layers: "Layers",
    exportObjects: "Output entities",
    report: "Inspection report",
    download: "Download UTM DXF",
    ack: "I have reviewed the notes: export creates a new model-space drawing with decomposed blocks/dimensions and segmented curves. I will check grid suitability and results against known control points.",
    summary: "Analysis & export",
    changes: "What changes during export",
    technical: "Technical inspection messages",
    support: "Support & limitations",
    more: "More apps",
    contact: "Help / bug report / contact",
    imprint: "Legal notice",
    made: "A tool by Michael Radeck",
    privacy: "Locally processed. No analytics trackers.",
    mapConsent: "Load map",
    mapPrivacy:
      "OpenStreetMap tiles are only requested when enabled. This sends your IP address and the map area to the tile provider.",
    noMap: "No valid extent available yet.",
    methodHelp:
      "EPSG identifies a coordinate system, not the specific transformation operation. NTv2 stores location-dependent shifts between DHDN and ETRS89. Export stops outside grid coverage; there is no silent fallback to a less accurate method.",
    toleranceHelp:
      "Arcs, circles, splines and polylines are exported as 3D polylines. This setting controls segmentation (default 5 mm), not absolute positional accuracy. Lines are subdivided where needed. Faces and meshes retain their topology; their interiors are not densified.",
    fileHelp:
      "Full GK4 coordinates in metres are required: X = easting (about 4.5 million), Y = northing. No swapped axes, local site coordinates, millimetres or DWG. The source CRS is not automatically detected; coordinates are only checked for plausibility.",
    crsHelp:
      "GK4: DHDN / Bessel, central meridian 12°, 3° strip. UTM32: ETRS89 / GRS80, central meridian 9°, 6° zone. Output has no leading zone number 32. Z values and the vertical datum are unchanged.",
    limits:
      "Supported: points, lines, 2D/3D polylines, arcs, circles, ellipses, splines, text, horizontal hatches, 3D faces/meshes, simple and nested uniformly scaled blocks, and renderable dimensions/multileaders. Special cases block the entire export, including XREF, proxy/ACIS objects, wide polylines, XCLIP, mirrored/non-uniform blocks and tilted text. No DWG files.",
    modelHelp:
      "Creates a new R2018 DXF containing model space, layers, line types and text styles. Paper layouts, viewports, dependencies, custom metadata and editable block/dimension logic are not retained. Text content and dimension labels are not recalculated. CAD fonts must be available in the target program.",
    newGrid: "Create a custom grid?",
    newGridText:
      "A reliable local grid requires common points with known GK and UTM coordinates, plus independent check points. Resampling BeTA2007 more finely does not improve accuracy. This version imports grids; it does not derive new grids.",
    error: "The file could not be processed.",
    warningIntro:
      "Not a lossless CAD round trip. Open the result in CAD and check independent control points before production use.",
    app: "DXF Coordinate Forge",
    readyHint:
      "Supported geometry is ready. Acknowledge the notes to download.",
    invalidHint:
      "At least one object cannot be safely converted. Resolve the listed objects in CAD first. No partial export.",
    noSource: "Please select a DXF file first.",
    missingGrid: "Please select an NTv2 grid file.",
    gridLarge: "Grid exceeds 256 MB. Please use a smaller regional extract.",
    fileLarge: "DXF files must not exceed 25 MB.",
    reset: "Reset",
    supportMail: "Open email",
    mailHint:
      "Opens your email application. No drawing is automatically attached.",
    reference: "Coordinate sample",
    noPreview: "No line preview available for these entities.",
  },
};
const warnings: Record<string, [string, string]> = {
  curves: [
    "Kurven/Polylinien → segmentierte 3D-Polylinien",
    "Curves/polylines → segmented 3D polylines",
  ],
  blocks: [
    "Blöcke aufgelöst; Attribute als Text",
    "Blocks decomposed; attributes converted to text",
  ],
  dimensions: [
    "Bemaßungen/Multileader als Darstellung; Zahlen nicht neu berechnet",
    "Dimensions/multileaders as display geometry; labels not recalculated",
  ],
  text: [
    "Textpositionen transformiert; Orientierung und Größe lokal angenähert",
    "Text anchors transformed; orientation and size approximated locally",
  ],
  hatches: [
    "Schraffurgrenzen segmentiert; Assoziativität entfernt",
    "Hatch boundaries segmented; associativity removed",
  ],
  faces: [
    "Flächen/Netze: nur Stützpunkte transformiert, keine Innenverdichtung",
    "Faces/meshes: vertices transformed; interiors not densified",
  ],
  units: [
    "Keine Einheit gespeichert: Meter werden angenommen",
    "No stored drawing units: metres assumed",
  ],
  paperspace: [
    "Papierbereich-Objekte nicht übernommen",
    "Paper-space entities not included",
  ],
  metadata: [
    "Objekt-Zusatzdaten werden entfernt",
    "Custom entity data removed",
  ],
};
function Info({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="info">
      <summary aria-label={title} title={title}>
        i
      </summary>
      <div className="info-pop">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </details>
  );
}
function save(contents: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function MapView({ bounds }: { bounds: [number[], number[]] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current).fitBounds(
      bounds.map((p) => [p[1], p[0]]) as L.LatLngBoundsExpression,
      { maxZoom: 17, padding: [35, 35] },
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.rectangle(bounds.map((p) => [p[1], p[0]]) as L.LatLngBoundsExpression, {
      color: "#228068",
      weight: 2,
      fillOpacity: 0.12,
    }).addTo(map);
    return () => {
      map.remove();
    };
  }, [bounds]);
  return <div className="map" ref={ref} />;
}
function Drawing({ report }: { report: Report }) {
  const b = report.targetBounds!;
  const width = Math.max(b[2] - b[0], 1),
    height = Math.max(b[3] - b[1], 1),
    pad = Math.max(width, height) * 0.09;
  return (
    <svg
      className="drawing"
      role="img"
      aria-label="UTM32 DXF preview"
      viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`}
    >
      <g transform={`translate(0,${height}) scale(1,-1)`}>
        {report.preview.map((pts, i) =>
          pts.length === 1 ? (
            <circle
              key={i}
              cx={pts[0][0] - b[0]}
              cy={pts[0][1] - b[1]}
              r={Math.max(width, height) * 0.005}
              fill="var(--accent)"
            />
          ) : (
            <polyline
              key={i}
              points={pts.map((p) => `${p[0] - b[0]},${p[1] - b[1]}`).join(" ")}
              fill="none"
              stroke={["var(--accent)", "#b8b57a", "#729caa"][i % 3]}
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
      </g>
    </svg>
  );
}
function App() {
  const [lang, setLang] = useState<"de" | "en">(() =>
    localStorage.getItem("dxf-language") === "en" ? "en" : "de",
  );
  const [dark, setDark] = useState(
    () => localStorage.getItem("dxf-theme") === "dark",
  );
  const t = dict[lang];
  const [file, setFile] = useState<File | null>(null);
  const [grid, setGrid] = useState<File | null>(null);
  const [method, setMethod] = useState("beta");
  const [tol, setTol] = useState("0.005");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("runtime");
  const [error, setError] = useState("");
  const [ack, setAck] = useState(false);
  const [tab, setTab] = useState("drawing");
  const [mapConsent, setMapConsent] = useState(false);
  const [demo, setDemo] = useState(false);
  const [drag, setDrag] = useState(false);
  const worker = useRef<Worker | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const gridInput = useRef<HTMLInputElement>(null);
  const nameRef = useRef("drawing");
  const taskRef = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("dxf-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("dxf-language", lang);
  }, [lang]);
  useEffect(() => () => worker.current?.terminate(), []);
  const invalidate = () => {
    setReport(null);
    setAck(false);
    setError("");
  };
  const choose = (f: File | undefined) => {
    if (!f) return;
    invalidate();
    setDemo(false);
    if (!/\.dxf$/i.test(f.name)) {
      setError("DXF only / Nur DXF");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError(t.fileLarge);
      return;
    }
    setFile(f);
  };
  const cancel = () => {
    taskRef.current++;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    invalidate();
  };
  async function run(useDemo = false) {
    invalidate();
    if (!file && !useDemo) {
      setError(t.noSource);
      return;
    }
    if (method === "custom" && !grid) {
      setError(t.missingGrid);
      return;
    }
    setBusy(true);
    setDemo(useDemo);
    setStage("runtime");
    nameRef.current = useDemo ? "demo-gk4" : file!.name.replace(/\.dxf$/i, "");
    const task = ++taskRef.current;
    try {
      if (!worker.current) {
        const w = new Worker("/worker.js");
        worker.current = w;
        w.onmessage = ({ data }) => {
          if (data.type === "status") setStage(data.key);
          if (data.type === "result") {
            setReport(data.report);
            setBusy(false);
          }
          if (data.type === "error") {
            setError(data.message);
            setBusy(false);
          }
          if (data.type === "export")
            save(
              data.output,
              `${nameRef.current}_EPSG25832.dxf`,
              "application/dxf",
            );
        };
        w.onerror = (e) => {
          setError(e.message);
          setBusy(false);
          w.terminate();
          worker.current = null;
        };
      }
      const data = useDemo ? null : await file!.arrayBuffer();
      const gridData = method === "custom" ? await grid!.arrayBuffer() : null;
      if (task !== taskRef.current) return;
      worker.current!.postMessage(
        {
          type: "process",
          demo: useDemo,
          file: data,
          grid: gridData,
          tolerance: Number(tol),
        },
        [data, gridData].filter(Boolean) as ArrayBuffer[],
      );
    } catch (e) {
      if (task === taskRef.current) {
        setError(String(e));
        setBusy(false);
      }
    }
  }
  const blocked = !!report?.blockers.length;
  const count = report
    ? Object.values(report.counts).reduce((a, b) => a + b, 0)
    : 0;
  return (
    <>
      <header className="header">
        <a className="brand" href="/" aria-label="DXF Coordinate Forge">
          <img src="/favicon.svg" alt="" />
          <span>
            DXF <b>Coordinate Forge</b>
            <small>{t.subtitle}</small>
          </span>
        </a>
        <nav>
          <span className="version">v{VERSION}</span>
          <button
            className="icon-button"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Light mode" : "Dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            className="language"
            onClick={() => setLang(lang === "de" ? "en" : "de")}
            aria-label="Deutsch / English"
          >
            {lang === "de" ? "🇩🇪 DE" : "🇬🇧 EN"}
          </button>
          <a
            className="icon-button"
            href="https://github.com/mradeck/dxf-gk4-utm-converter"
            aria-label="GitHub"
          >
            <Github size={19} />
          </a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">
              <span />
              {t.eyebrow}
            </p>
            <h1>
              {t.title}
              <br />
              <em>{t.title2}</em>
            </h1>
            <p className="intro">{t.intro}</p>
            <div className="badges">
              <span>
                <ShieldCheck size={15} />
                {t.local}
              </span>
              <span>
                <Layers size={15} />
                {t.model}
              </span>
              <span>
                <Check size={15} />
                {t.height}
              </span>
            </div>
          </div>
          <div className="crs-card">
            <div className="crs-row">
              <span className="crs-dot" />
              <div>
                <small>{t.source}</small>
                <strong>DHDN / GK Zone 4</strong>
                <code>EPSG:31468</code>
              </div>
            </div>
            <div className="crs-link">
              <ArrowDownToLine size={18} />
              <span>NTv2 · PROJ</span>
              <Info title={t.method}>{t.crsHelp}</Info>
            </div>
            <div className="crs-row">
              <span className="crs-dot target" />
              <div>
                <small>{t.target}</small>
                <strong>ETRS89 / UTM Zone 32N</strong>
                <code>EPSG:25832</code>
              </div>
            </div>
          </div>
        </section>
        <div className="workspace">
          <aside className="controls">
            <section className="panel">
              <h2>
                <span className="step">01</span>
                {t.step1}
                <Info title={t.file}>{t.fileHelp}</Info>
              </h2>
              <button
                disabled={busy}
                className={`dropzone ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (!busy) choose(e.dataTransfer.files[0]);
                }}
              >
                <span className="upload-icon">
                  {file ? <FileCode2 size={26} /> : <Upload size={26} />}
                </span>
                <strong>{file ? file.name : t.drop}</strong>
                <span>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : t.browse}
                </span>
                <small>{t.fileHint}</small>
              </button>
              <input
                hidden
                ref={fileInput}
                type="file"
                accept=".dxf"
                onChange={(e) => choose(e.target.files?.[0])}
              />
              <button
                disabled={busy}
                className="demo-button"
                onClick={() => run(true)}
              >
                {t.demo}
                <ArrowRight size={15} />
              </button>
            </section>
            <section className="panel">
              <h2>
                <span className="step">02</span>
                {t.step2}
              </h2>
              <label htmlFor="method">
                {t.method}
                <Info title={t.method}>{t.methodHelp}</Info>
              </label>
              <select
                id="method"
                disabled={busy}
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  invalidate();
                }}
              >
                <option value="beta">{t.beta}</option>
                <option value="custom">{t.custom}</option>
              </select>
              {method === "custom" && (
                <div className="custom-grid">
                  <button
                    disabled={busy}
                    className="secondary"
                    onClick={() => gridInput.current?.click()}
                  >
                    <Upload size={16} />
                    {grid?.name || t.grid}
                  </button>
                  <small>{t.gridHint}</small>
                  <input
                    hidden
                    ref={gridInput}
                    type="file"
                    accept=".gsb"
                    onChange={(e) => {
                      const g = e.target.files?.[0];
                      invalidate();
                      if (g && g.size > 256 * 1024 * 1024) {
                        setGrid(null);
                        setError(t.gridLarge);
                      } else setGrid(g || null);
                    }}
                  />
                </div>
              )}
              <label htmlFor="tol">
                {t.tolerance}
                <Info title={t.tolerance}>{t.toleranceHelp}</Info>
              </label>
              <select
                id="tol"
                disabled={busy}
                value={tol}
                onChange={(e) => {
                  setTol(e.target.value);
                  invalidate();
                }}
              >
                <option value="0.001">1 mm</option>
                <option value="0.005">5 mm · Standard</option>
                <option value="0.01">1 cm</option>
                <option value="0.05">5 cm</option>
              </select>
              <button
                className="primary analyze"
                disabled={busy || !file}
                onClick={() => run(false)}
              >
                {busy ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <FileSearch size={18} />
                )}{" "}
                {t.analyze}
                <ArrowRight size={17} />
              </button>
              {busy && (
                <div className="progress" role="status">
                  <div className="progress-track" />
                  <p>{t[stage as "runtime" | "libraries" | "processing"]}</p>
                  <button className="text-button" onClick={cancel}>
                    <X size={14} />
                    {t.cancel}
                  </button>
                </div>
              )}
              <p className="fine">{t.initialLoad}</p>
            </section>
            <div className="notice">
              <TriangleAlert size={20} />
              <div>
                <strong>{t.notice}</strong>
                <p>{method === "beta" ? t.betaNotice : t.customNotice}</p>
                <a href={authority} target="_blank" rel="noreferrer">
                  {t.authority}
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </aside>
          <div className="results">
            <section className="preview-panel">
              <div className="preview-toolbar">
                <div className="tabs">
                  <button
                    className={tab === "drawing" ? "active" : ""}
                    onClick={() => setTab("drawing")}
                  >
                    <Layers size={15} />
                    {t.preview}
                  </button>
                  <button
                    className={tab === "map" ? "active" : ""}
                    onClick={() => setTab("map")}
                  >
                    <MapIcon size={15} />
                    {t.map}
                  </button>
                </div>
                <span className="chip">{demo ? "DEMO" : "EPSG:25832"}</span>
              </div>
              <div className="viewport">
                {report?.targetBounds ? (
                  tab === "drawing" ? (
                    report.preview.length ? (
                      <Drawing report={report} />
                    ) : (
                      <div className="empty">
                        <Layers size={36} />
                        <p>{t.noPreview}</p>
                      </div>
                    )
                  ) : report.geographicBounds ? (
                    mapConsent ? (
                      <MapView bounds={report.geographicBounds} />
                    ) : (
                      <div className="empty">
                        <MapIcon size={38} />
                        <p>{t.mapPrivacy}</p>
                        <button
                          className="secondary"
                          onClick={() => setMapConsent(true)}
                        >
                          {t.mapConsent}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="empty">{t.noMap}</div>
                  )
                ) : (
                  <div className="empty">
                    <div className="empty-symbol">
                      <Crosshair size={45} strokeWidth={1} />
                    </div>
                    <h3>{t.empty}</h3>
                    <p>{t.emptyHint}</p>
                  </div>
                )}
                <span className="north">N ↑</span>
              </div>
              <div className="preview-bottom">
                <span>
                  <span className="dot" />
                  {t.viewHint}
                </span>
                <span>X / Y · m</span>
              </div>
            </section>
            {error && (
              <div className="error-box" role="alert">
                <TriangleAlert size={22} />
                <div>
                  <strong>{t.error}</strong>
                  <pre>{error}</pre>
                </div>
              </div>
            )}
            <section className="panel analysis">
              <h2>
                <span className="step">03</span>
                {t.summary}
                <Info title={t.model}>{t.modelHelp}</Info>
              </h2>
              {!report ? (
                <p className="muted">{t.warningIntro}</p>
              ) : (
                <>
                  <div className={`status-title ${blocked ? "blocked" : ""}`}>
                    {blocked ? (
                      <TriangleAlert size={20} />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                    <strong>{blocked ? t.blocked : t.ready}</strong>
                    <span>{report.dxfVersion}</span>
                  </div>
                  <p className="muted">
                    {blocked ? t.invalidHint : t.readyHint}
                  </p>
                  <div className="stats">
                    <div>
                      <strong>{count.toLocaleString(lang)}</strong>
                      <span>{t.entities}</span>
                    </div>
                    <div>
                      <strong>{report.layers.length}</strong>
                      <span>{t.layers}</span>
                    </div>
                    <div>
                      <strong>
                        {blocked
                          ? "—"
                          : report.outputEntities.toLocaleString(lang)}
                      </strong>
                      <span>{t.exportObjects}</span>
                    </div>
                  </div>
                  <div className="entity-tags">
                    {Object.entries(report.counts).map(([name, n]) => (
                      <span key={name}>
                        {name} <b>{n}</b>
                      </span>
                    ))}
                  </div>
                  {blocked && (
                    <div className="issues">
                      <h3>{t.technical}</h3>
                      {report.blockers.map((issue, i) => (
                        <div key={i}>
                          <strong>
                            {issue.type} · #{issue.handle} · {issue.layer}
                          </strong>
                          <p>{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <details className="disclosure" open>
                    <summary>{t.changes}</summary>
                    <p>{t.modelHelp}</p>
                    <ul>
                      {Object.entries(report.warnings).map(([key, n]) => (
                        <li key={key}>
                          {warnings[key]?.[lang === "de" ? 0 : 1] || key}{" "}
                          <b>({n})</b>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <details className="disclosure">
                    <summary>{t.reference}</summary>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>GK4 X / Y</th>
                            <th>UTM32 E / N</th>
                            <th>Z</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.samples.slice(0, 3).map((s, i) => (
                            <tr key={i}>
                              <td>
                                {s.source
                                  .slice(0, 2)
                                  .map((n) => n.toFixed(3))
                                  .join(" / ")}
                              </td>
                              <td>
                                {s.target
                                  .slice(0, 2)
                                  .map((n) => n.toFixed(3))
                                  .join(" / ")}
                              </td>
                              <td>{s.target[2].toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                  {!blocked && (
                    <label className="ack">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                      />
                      <span>{t.ack}</span>
                    </label>
                  )}
                  <div className="download-row">
                    <button
                      className="primary"
                      disabled={blocked || !ack || busy}
                      onClick={() =>
                        worker.current?.postMessage({ type: "export" })
                      }
                    >
                      <ArrowDownToLine size={18} />
                      {t.download}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        const { preview, ...r } = report;
                        void preview;
                        save(
                          JSON.stringify(
                            {
                              ...r,
                              file: nameRef.current,
                              gridName:
                                method === "beta" ? "BETA2007.gsb" : grid?.name,
                              createdAt: new Date().toISOString(),
                              scope: t.modelHelp,
                              warning: t.warningIntro,
                            },
                            null,
                            2,
                          ),
                          `${nameRef.current}_report.json`,
                          "application/json",
                        );
                      }}
                    >
                      {t.report}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
        <section className="knowledge">
          <div>
            <p className="eyebrow">GOOD TO KNOW</p>
            <h2>{t.support}</h2>
            <p>{t.limits}</p>
            <p>
              {t.retired} <a href={authority}>{t.authority} ↗</a>
            </p>
          </div>
          <div>
            <h3>{t.newGrid}</h3>
            <p>{t.newGridText}</p>
            <details className="disclosure">
              <summary>{t.contact}</summary>
              <p>{t.mailHint}</p>
              <a
                href={`mailto:michael.radeck@email.de?subject=${encodeURIComponent(`DXF Coordinate Forge v${VERSION} – ${lang === "de" ? "Hilfe / Bugreport" : "Help / bug report"}`)}`}
              >
                {t.supportMail} ↗
              </a>
            </details>
          </div>
        </section>
        <section className="other-apps">
          <span>{t.more}</span>
          {[
            ["Geoid Forge", "https://geoid-forge.netlify.app/"],
            ["PointCloud Manager", "https://www.pointcloud-manager.com"],
            [
              "GPS / UTM Converter",
              "https://mradeck.github.io/gps-utm-coordinate-converter/",
            ],
            [
              "Geodata Inspector",
              "https://geodata-inspector-cleaner.netlify.app/",
            ],
          ].map(([label, url]) => (
            <a href={url} key={url} target="_blank" rel="noreferrer">
              {label}
              <ChevronRight size={14} />
            </a>
          ))}
        </section>
      </main>
      <footer>
        <div>
          <strong>{t.made}</strong>
          <span>
            © {new Date().getFullYear()} · v{VERSION} · {t.privacy}
          </span>
        </div>
        <div>
          <a href="/THIRD-PARTY-NOTICES.txt">Lizenzen / Licenses</a>
          <a href="https://www.multikopterschule.de/Kontakt-Impressum/IMPRESSUM/">
            {t.imprint}
          </a>
          <a href="https://ko-fi.com/mradeck/tip">
            <Coffee size={15} />
            Ko-fi
          </a>
        </div>
      </footer>
    </>
  );
}
const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
