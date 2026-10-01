import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { PreflightPanel } from "./PreflightPanel";
import {
  initialSelection,
  selectedEntries,
  type Inventory,
  type Selection,
  type Audit,
} from "./selection";

type Issue = { type: string; handle: string; layer: string; message: string };
type Report = {
  version: string;
  direction: Direction;
  counts: Record<string, number>;
  layers: string[];
  dxfVersion: string;
  warnings: Record<string, number>;
  blockers: Issue[];
  omitted: (Issue & { id: string; category: string })[];
  audit: Audit;
  requiresConfirmation: boolean;
  successfulSources: number;
  failedSources: number;
  selectedOmissions: number;
  outputEntities: number;
  evaluations: number;
  preview: number[][][];
  geographicPreview: number[][][];
  previewMeta: (Issue & { color: string | null })[];
  previewLimited: boolean;
  sourceBounds: number[] | null;
  targetBounds: number[] | null;
  geographicBounds?: [number[], number[]];
  grid: { from: string; to: string; subgrids: number; sha256: string };
  samples: { source: number[]; target: number[] }[];
};
type Direction = "gk4-utm" | "utm-gk4";
const SYSTEMS = {
  gk4: { name: "DHDN / GK Zone 4", epsg: "EPSG:31468", axes: "GK4 X / Y" },
  utm: {
    name: "ETRS89 / UTM Zone 32N",
    epsg: "EPSG:25832",
    axes: "UTM32 E / N",
  },
};
const VERSION = "26.09.15.0";
const authority =
  "https://www.ldbv.bayern.de/vermessung/utm_umstellung/trans_geofach.html";
const dict = {
  de: {
    subtitle: "Das Koordinaten-Werkzeug für deine CAD-Pläne",
    eyebrow: "GK4 ⇄ UTM32 · LOKAL IM BROWSER",
    title: "Neue Koordinaten.",
    title2: "Dein Plan bleibt deiner.",
    intro:
      "DXF-Dateien analysieren und zwischen Gauß-Krüger (GK4) und ETRS89 / UTM32 transformieren – die Richtung wird aus den Koordinaten erkannt. Mit nachvollziehbarer Gittertransformation und Prüfprotokoll.",
    source: "Ausgangssystem",
    target: "Zielsystem",
    local: "Kein Datei-Upload",
    model: "Nur Modellbereich",
    height: "Z bleibt unverändert",
    file: "Deine DXF-Datei",
    step1: "Datei auswählen & prüfen",
    drop: "DXF hier ablegen",
    browse: "oder Datei auswählen",
    fileHint: "ASCII & binäre DXF · bis 25 MB",
    demo: "Mit Beispielplan ausprobieren",
    step2: "Transformation festlegen",
    stepPreflight: "Vorprüfung & Auswahl",
    flow: "Ablauf",
    nextLabel: "Nächster Schritt",
    next1a:
      "DXF-Datei in Schritt 01 ablegen oder auswählen – oder den Beispielplan ausprobieren.",
    next23:
      "Schritt 02: Vorauswahl kontrollieren (standardmäßig ist alles ausgewählt). Danach in Schritt 03 auf „Auswahl transformieren“ klicken.",
    next4:
      "Schritt 04: Ergebnis in der Vorschau kontrollieren und „DXF herunterladen“ klicken.",
    nextBlocked:
      "Export gesperrt: Prüfmeldungen in Schritt 04 beachten, Eingaben korrigieren und erneut prüfen.",
    lockedPreflight:
      "Erscheint, sobald die Datei in Schritt 01 mit „Datei prüfen“ eingelesen wurde.",
    lockedTransform:
      "Verfügbar nach der Vorprüfung. Das Gitter kann bereits jetzt gewählt werden.",
    lockedResult: "Erscheint nach „Auswahl transformieren“ in Schritt 03.",
    method: "Transformationsgitter",
    beta: "BeTA2007 · deutschlandweit · in der App enthalten",
    custom: "Eigenes NTv2-Gitter (.gsb)",
    grid: "Gitterdatei auswählen",
    gridHint: "Bessel/DHDN → GRS80/ETRS89 · bis 256 MB",
    tolerance: "Kurven-Segmentierung",
    format: "DXF-Format der Ausgabe",
    formatHelp:
      "R2018 ist der Standard. R2000 (AutoCAD 2000) für ältere CAD-, GIS- oder Vermessungsprogramme: True-Color-Farben werden dort auf die nächstliegende der 255 AutoCAD-Farben abgebildet, Transparenz entfällt, MESH-Netze sind nicht darstellbar und werden mit Hinweis ausgelassen.",
    analyze: "Auswahl transformieren",
    inspecting: "Objekte zählen und räumliche Gruppen prüfen …",
    cancel: "Abbrechen",
    runtime: "Browser-Rechenkern wird geladen …",
    libraries: "CAD- und Geodäsie-Bibliotheken werden geladen …",
    processing: "Geometrien prüfen und transformieren …",
    initialLoad:
      "Beim ersten Start werden Bibliotheken vom CDN geladen. Deine DXF- und Gitterdateien verlassen den Browser nicht.",
    preview: "Planvorschau",
    map: "DXF auf Karte",
    empty: "Hier bekommt dein Plan neue Koordinaten.",
    emptyHint: "Wähle eine DXF-Datei oder starte mit dem Beispielplan.",
    viewHint: "Zielsystem · vereinfachte Vorschau · nicht maßstäblich",
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
    duplicatesRemoved: "Objekt-Duplikate entfernt",
    report: "Prüfprotokoll",
    download: "DXF herunterladen",
    noCrs:
      "Weder GK4- noch UTM32-Koordinaten erkannt. Bitte in Schritt 02 die Richtung wählen oder die Datei prüfen.",
    summary: "Ergebnis prüfen & herunterladen",
    changes: "Was sich beim Export ändert",
    technical: "Technische Prüfmeldungen",
    support: "Unterstützung & Grenzen",
    more: "Weitere Apps",
    contact: "Hilfe / Bugreport / Kontakt",
    imprint: "Impressum",
    made: "Ein Werkzeug von Michael Radeck",
    privacy: "Lokal verarbeitet. Keine Analyse-Tracker.",
    mapConsent: "OSM-Hintergrund anzeigen",
    transparency: "Transparenz",
    mapPrivacy:
      "Die Hintergrundkarte lädt OpenStreetMap-Kacheln aus dem Internet. Dabei werden IP-Adresse und Kartenausschnitt, also die ungefähre Lage des Plans, an den Kartenanbieter übermittelt. Die DXF selbst verlässt den Browser nicht. Ausschalten verhindert weitere Abrufe.",
    noMap: "Noch keine gültige Ausdehnung vorhanden.",
    methodHelp:
      "EPSG beschreibt das Koordinatensystem, nicht das konkrete Transformationsverfahren. NTv2 enthält ortsabhängige Verschiebungen zwischen DHDN und ETRS89. Objekte außerhalb der Gitterabdeckung werden ausgelassen und im Protokoll aufgeführt. UTM → GK4 nutzt dasselbe Gitter in Gegenrichtung. Es gibt keinen stillen Ersatz durch eine ungenauere Methode.",
    toleranceHelp:
      "Bögen, Kreise, Splines und Polylinien werden als 3D-Polylinien exportiert. Die Einstellung steuert die Segmentierung (Standard 5 mm); sie ist keine Aussage zur absoluten Lagegenauigkeit. Geraden werden bei Bedarf zusätzlich unterteilt. Flächen und Netze behalten ihre Topologie; ihre Innenflächen werden nicht verdichtet.",
    fileHelp:
      "Erwartet werden vollständige Koordinaten in Metern: GK4 mit X = Rechtswert (etwa 4,5 Millionen, führende Zonenziffer 4) oder UTM32 ohne Zonenziffer (X = Ostwert etwa 0,2–1 Million), jeweils Y = Hochwert. Die Richtung wird wie im Geodata Inspector aus den Wertebereichen erkannt, DXF enthält meist keine CRS-Angabe. Keine vertauschten Achsen, lokalen Baukoordinaten, Millimeter oder DWG. Die Analyse startet direkt nach dem Laden.",
    crsHelp:
      "GK4: DHDN / Bessel, Mittelmeridian 12°, 3°-Streifen. UTM32: ETRS89 / GRS80, Mittelmeridian 9°, 6°-Zone. UTM-Ausgabe ohne vorangestellte Zonenziffer 32, GK4-Ausgabe mit Zonenziffer 4. Z-Werte werden weder in der Höhe noch im Höhenbezug geändert.",
    limits:
      "Unterstützt: Punkte, Linien, 2D-/3D-Polylinien, Bögen, Kreise, Ellipsen, Splines, Texte, ebene Schraffuren, 3D-Flächen/Netze, gleichmäßig skalierte Blöcke sowie darstellbare Bemaßungen/Multileader. Nicht sicher übertragbare Objekte werden protokolliert und nach Bestätigung ausgelassen, etwa XREF, Proxy-/ACIS-Objekte, breite Polylinien, XCLIP und gespiegelte/ungleichmäßig skalierte Blöcke. Ein betroffener Block wird vollständig ausgelassen. Falsche Einheiten, ungültige Gitter, unlesbare Dateien oder fehlerhafte/leere Ausgaben bleiben gesperrt. Keine DWG-Dateien.",
    modelHelp:
      "Es entsteht eine neue DXF (R2018 oder wahlweise R2000) mit Modellbereich, Layern, Linientypen und Textstilen. Papierlayouts, Viewports, Abhängigkeiten, benutzerdefinierte Metadaten und editierbare Block-/Bemaßungslogik werden nicht übernommen. Texte und Bemaßungszahlen werden nicht inhaltlich neu berechnet. CAD-Schriften müssen im Zielprogramm vorhanden sein.",
    newGrid: "Eigenes Gitter erstellen?",
    newGridText:
      "Ein belastbares lokales Gitter benötigt identische Punkte mit bekannten GK- und UTM-Koordinaten sowie unabhängige Kontrollpunkte. Eine feinere Rasterung von BeTA2007 erzeugt keine höhere Genauigkeit. Diese Version importiert Gitter; sie leitet keine neuen Gitter ab.",
    error: "Die Datei konnte nicht verarbeitet werden.",
    warningIntro:
      "Kein verlustfreier CAD-Roundtrip. Vor produktiver Verwendung in CAD öffnen und mit unabhängigen Kontrollpunkten prüfen.",
    app: "DXF Coordinate Forge",
    readyHint:
      "Die unterstützte Geometrie ist als neue DXF zum Herunterladen bereit.",
    invalidHint:
      "Ein grundlegender Fehler verhindert eine sichere Ausgabe. Bitte die aufgelisteten Prüfmeldungen beachten. Einzelne Objektfehler allein sperren den übrigen Export nicht.",
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
    eyebrow: "GK4 ⇄ UTM32 · IN YOUR BROWSER",
    title: "New coordinates.",
    title2: "Your drawing stays yours.",
    intro:
      "Analyze DXF files and transform between Gauss–Krüger (GK4) and ETRS89 / UTM32 – the direction is detected from the coordinates. With an explicit grid transformation and an inspection report.",
    source: "Source system",
    target: "Target system",
    local: "No file upload",
    model: "Model space only",
    height: "Z stays unchanged",
    file: "Your DXF file",
    step1: "Choose & inspect a drawing",
    drop: "Drop your DXF here",
    browse: "or choose a file",
    fileHint: "ASCII & binary DXF · up to 25 MB",
    demo: "Try the sample drawing",
    step2: "Set the transformation",
    stepPreflight: "Preflight & selection",
    flow: "Workflow",
    nextLabel: "Next step",
    next1a: "Drop or choose a DXF file in step 01 – or try the sample drawing.",
    next23:
      "Step 02: review the preselection (everything is selected by default). Then click “Transform selection” in step 03.",
    next4: "Step 04: check the result in the preview and click “Download DXF”.",
    nextBlocked:
      "Export blocked: review the messages in step 04, fix the input and inspect again.",
    lockedPreflight:
      "Appears once the file has been read with “Inspect file” in step 01.",
    lockedTransform:
      "Available after the preflight. You can already choose the grid now.",
    lockedResult: "Appears after “Transform selection” in step 03.",
    method: "Transformation grid",
    beta: "BeTA2007 · Germany · bundled with the app",
    custom: "Custom NTv2 grid (.gsb)",
    grid: "Choose grid file",
    gridHint: "Bessel/DHDN → GRS80/ETRS89 · up to 256 MB",
    tolerance: "Curve segmentation",
    format: "Output DXF format",
    formatHelp:
      "R2018 is the default. R2000 (AutoCAD 2000) for older CAD, GIS or surveying software: true colours are mapped to the nearest of the 255 AutoCAD colours, transparency is dropped, and MESH entities cannot be stored and are omitted with a note.",
    analyze: "Transform selection",
    inspecting: "Counting objects and checking spatial groups …",
    cancel: "Cancel",
    runtime: "Loading the browser runtime …",
    libraries: "Loading CAD and geodesy libraries …",
    processing: "Checking and transforming geometry …",
    initialLoad:
      "The first run loads libraries from a CDN. Your DXF and grid files never leave your browser.",
    preview: "Drawing preview",
    map: "DXF on map",
    empty: "A new coordinate system for your drawing.",
    emptyHint: "Choose a DXF file or try the sample drawing.",
    viewHint: "Target system · simplified preview · not to scale",
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
    duplicatesRemoved: "Object duplicates removed",
    report: "Inspection report",
    download: "Download DXF",
    noCrs:
      "Neither GK4 nor UTM32 coordinates detected. Choose the direction in step 02 or check the file.",
    summary: "Check result & download",
    changes: "What changes during export",
    technical: "Technical inspection messages",
    support: "Support & limitations",
    more: "More apps",
    contact: "Help / bug report / contact",
    imprint: "Legal notice",
    made: "A tool by Michael Radeck",
    privacy: "Locally processed. No analytics trackers.",
    mapConsent: "Show OSM background",
    transparency: "Transparency",
    mapPrivacy:
      "The background map loads OpenStreetMap tiles from the internet, which sends your IP address and the map area, i.e. the approximate location of the drawing, to the tile provider. The DXF itself never leaves the browser. Switching it off stops further requests.",
    noMap: "No valid extent available yet.",
    methodHelp:
      "EPSG identifies a coordinate system, not the specific transformation operation. NTv2 stores location-dependent shifts between DHDN and ETRS89. Objects outside grid coverage are omitted and listed in the report. UTM → GK4 applies the same grid in reverse. There is no silent fallback to a less accurate method.",
    toleranceHelp:
      "Arcs, circles, splines and polylines are exported as 3D polylines. This setting controls segmentation (default 5 mm), not absolute positional accuracy. Lines are subdivided where needed. Faces and meshes retain their topology; their interiors are not densified.",
    fileHelp:
      "Full coordinates in metres are required: GK4 with X = easting (about 4.5 million, zone prefix 4) or UTM32 without zone prefix (X = easting about 0.2–1 million), Y = northing in both. As in Geodata Inspector, the direction is detected from the coordinate ranges; DXF rarely stores a CRS. No swapped axes, local site coordinates, millimetres or DWG. Analysis starts right after loading.",
    crsHelp:
      "GK4: DHDN / Bessel, central meridian 12°, 3° strip. UTM32: ETRS89 / GRS80, central meridian 9°, 6° zone. UTM output has no leading zone number 32, GK4 output keeps zone prefix 4. Z values and the vertical datum are unchanged.",
    limits:
      "Supported: points, lines, 2D/3D polylines, arcs, circles, ellipses, splines, text, horizontal hatches, 3D faces/meshes, uniformly scaled blocks and renderable dimensions/multileaders. Objects that cannot be safely converted are reported and omitted after confirmation, including XREF, proxy/ACIS objects, wide polylines, XCLIP and mirrored/non-uniform blocks. An affected block is omitted entirely. Wrong units, invalid grids, unreadable files and invalid/empty outputs still block export. No DWG files.",
    modelHelp:
      "Creates a new DXF (R2018 or optionally R2000) containing model space, layers, line types and text styles. Paper layouts, viewports, dependencies, custom metadata and editable block/dimension logic are not retained. Text content and dimension labels are not recalculated. CAD fonts must be available in the target program.",
    newGrid: "Create a custom grid?",
    newGridText:
      "A reliable local grid requires common points with known GK and UTM coordinates, plus independent check points. Resampling BeTA2007 more finely does not improve accuracy. This version imports grids; it does not derive new grids.",
    error: "The file could not be processed.",
    warningIntro:
      "Not a lossless CAD round trip. Open the result in CAD and check independent control points before production use.",
    app: "DXF Coordinate Forge",
    readyHint: "Supported geometry is ready to download as a new DXF.",
    invalidHint:
      "A fundamental error prevents safe output. Review the listed messages. Individual object failures alone do not block the remaining export.",
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
  qgisSymbols: [
    "QGIS-Symbolblöcke als Punkte am Einfügepunkt übernommen",
    "QGIS symbol blocks converted to points at their insertion point",
  ],
  r2000Colors: [
    "True-Color-Farben für R2000 auf nächstliegende AutoCAD-Farbe abgebildet",
    "True colours mapped to the nearest AutoCAD colour for R2000",
  ],
  nestedPoints: [
    "POINTs innerhalb von Blöcken bewusst ausgelassen",
    "POINTs inside blocks intentionally omitted",
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
function scrollToStep(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}
function save(contents: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// DXF colour as drawn in CAD; null = foreground colour (ACI 7 / white).
const isLight = (hex: string) =>
  [1, 3, 5].reduce(
    (s, i, k) =>
      s + parseInt(hex.slice(i, i + 2), 16) * [0.299, 0.587, 0.114][k],
    0,
  ) > 190;
function MapView({
  report,
  basemap,
  transparency,
}: {
  report: Report;
  basemap: boolean;
  transparency: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const opacity = 1 - transparency / 100;
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { preferCanvas: true }).fitBounds(
      report.geographicBounds!.map((p) => [
        p[1],
        p[0],
      ]) as L.LatLngBoundsExpression,
      { maxZoom: 17, padding: [35, 35] },
    );
    tiles.current = basemap
      ? L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          opacity,
        }).addTo(map)
      : null;
    report.geographicPreview.forEach((points, i) => {
      const latlngs = points.map((p) => [p[1], p[0]] as L.LatLngTuple);
      if (!latlngs.length) return;
      const meta = report.previewMeta[i];
      const color = meta?.color ?? "#222222";
      const light = isLight(color);
      // Light CAD colours get a dark outline so they stay visible on OSM.
      if (light && latlngs.length > 1)
        L.polyline(latlngs, {
          color: "#333333",
          weight: 4.5,
          opacity: 0.55,
          interactive: false,
        }).addTo(map);
      const layer =
        latlngs.length === 1
          ? L.circleMarker(latlngs[0], {
              radius: 3,
              color: light ? "#333333" : color,
              fillColor: color,
              weight: 1,
              fillOpacity: 0.9,
            })
          : L.polyline(latlngs, {
              color,
              weight: 2.5,
              opacity: 0.95,
            });
      if (meta) {
        const label = document.createElement("span");
        label.textContent = `${meta.type} · ${meta.layer} · #${meta.handle}`;
        layer.bindTooltip(label);
      }
      layer.addTo(map);
    });
    L.control.scale({ imperial: false }).addTo(map);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
    // Opacity changes are applied below without rebuilding the map.
  }, [report, basemap]);
  useEffect(() => {
    tiles.current?.setOpacity(opacity);
  }, [opacity]);
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
      aria-label="DXF preview"
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
              fill={report.previewMeta[i]?.color ?? "var(--ink)"}
            />
          ) : (
            <polyline
              key={i}
              points={pts.map((p) => `${p[0] - b[0]},${p[1] - b[1]}`).join(" ")}
              fill="none"
              stroke={report.previewMeta[i]?.color ?? "var(--ink)"}
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
  const [dxfVersion, setDxfVersion] = useState("R2018");
  const [report, setReport] = useState<Report | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [inventoryKey, setInventoryKey] = useState(0);
  const selected = useMemo(
    () => (inventory && selection ? selectedEntries(inventory, selection) : []),
    [inventory, selection],
  );
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("runtime");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("map");
  const [mapConsent, setMapConsent] = useState(true);
  const [transparency, setTransparency] = useState(50);
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
  useEffect(() => {
    if (inventoryKey) scrollToStep("step-2");
  }, [inventoryKey]);
  useEffect(() => {
    if (report) scrollToStep("preview");
  }, [report]);
  const invalidate = () => {
    setReport(null);
    setError("");
  };
  const choose = (f: File | undefined) => {
    if (!f) return;
    invalidate();
    setDemo(false);
    setInventory(null);
    setSelection(null);
    setFile(null);
    if (!/\.dxf$/i.test(f.name)) {
      setError("DXF only / Nur DXF");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError(t.fileLarge);
      return;
    }
    setFile(f);
    void inspect(false, f);
  };
  const cancel = () => {
    taskRef.current++;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setInventory(null);
    setSelection(null);
    invalidate();
  };
  function getWorker() {
    if (!worker.current) {
      const w = new Worker("/worker.js");
      worker.current = w;
      w.onmessage = ({ data }) => {
        if (worker.current !== w) return;
        if (data.type === "status") setStage(data.key);
        if (data.type === "inventory") {
          setInventory(data.inventory);
          setSelection(initialSelection(data.inventory));
          setInventoryKey((k) => k + 1);
          setBusy(false);
        }
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
            `${nameRef.current}_${String(data.target).replace(":", "")}.dxf`,
            "application/dxf",
          );
      };
      w.onerror = (e) => {
        setError(e.message);
        setBusy(false);
        w.terminate();
        worker.current = null;
        setInventory(null);
        setSelection(null);
      };
    }
    return worker.current;
  }
  async function inspect(useDemo = false, chosen: File | null = file) {
    invalidate();
    setInventory(null);
    setSelection(null);
    if (!chosen && !useDemo) {
      setError(t.noSource);
      return;
    }
    setBusy(true);
    setDemo(useDemo);
    if (useDemo) setFile(null);
    setStage("runtime");
    nameRef.current = useDemo
      ? "demo-gk4"
      : chosen!.name.replace(/\.dxf$/i, "");
    const task = ++taskRef.current;
    try {
      const data = useDemo ? null : await chosen!.arrayBuffer();
      if (task !== taskRef.current) return;
      getWorker().postMessage(
        { type: "inspect", demo: useDemo, file: data },
        data ? [data] : [],
      );
    } catch (e) {
      if (task === taskRef.current) {
        setError(String(e));
        setBusy(false);
      }
    }
  }
  function reinspect(distance: number, direction: string) {
    invalidate();
    setBusy(true);
    setStage("inspecting");
    getWorker().postMessage({ type: "reinspect", distance, direction });
  }
  async function run() {
    invalidate();
    if (!inventory || !selection || !selected.length) return;
    if (!inventory.crs.direction) {
      setError(t.noCrs);
      return;
    }
    if (method === "custom" && !grid) {
      setError(t.missingGrid);
      return;
    }
    setBusy(true);
    setStage("processing");
    const task = ++taskRef.current;
    try {
      const gridData = method === "custom" ? await grid!.arrayBuffer() : null;
      if (task !== taskRef.current) return;
      worker.current!.postMessage(
        {
          type: "process",
          grid: gridData,
          tolerance: Number(tol),
          selection: {
            selectedIds: selected.map((e) => e.id),
            excludePoints: selection.excludePoints,
            symbolsAsPoints: selection.symbolsAsPoints,
            direction: inventory.crs.direction,
            dxfVersion,
          },
        },
        gridData ? [gridData] : [],
      );
    } catch (e) {
      if (task === taskRef.current) {
        setError(String(e));
        setBusy(false);
      }
    }
  }
  const blocked = !!report?.blockers.length;
  // Removed duplicate copies are reported in their own tile, not as missing objects.
  const duplicateIds = new Set(
    inventory?.entries.filter((e) => e.duplicateOf).map((e) => e.id),
  );
  const isDuplicate = (o: { id: string; category: string }) =>
    o.category === "selection" && duplicateIds.has(o.id);
  const removedDuplicates = report?.omitted.filter(isDuplicate).length ?? 0;
  const missing = report?.omitted.filter((o) => !isDuplicate(o)) ?? [];
  const partial =
    !!report &&
    (missing.length > 0 ||
      report.audit.errors > 0 ||
      report.audit.repairs > 0 ||
      report.audit.recovered ||
      !!report.warnings.nestedPoints);
  const count = report
    ? Object.values(report.counts).reduce((a, b) => a + b, 0)
    : 0;
  const active = report ? [4] : inventory ? [2, 3] : [1];
  const next = busy
    ? t[stage as "runtime" | "libraries" | "processing" | "inspecting"]
    : !inventory
      ? t.next1a
      : !report
        ? t.next23
        : blocked
          ? t.nextBlocked
          : t.next4;
  const direction: Direction =
    report?.direction ?? inventory?.crs.direction ?? "gk4-utm";
  const [from, to] =
    direction === "utm-gk4"
      ? [SYSTEMS.utm, SYSTEMS.gk4]
      : [SYSTEMS.gk4, SYSTEMS.utm];
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
                <strong>{from.name}</strong>
                <code>{from.epsg}</code>
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
                <strong>{to.name}</strong>
                <code>{to.epsg}</code>
              </div>
            </div>
          </div>
        </section>
        <nav className="stepper" aria-label={t.flow}>
          <ol>
            {[t.step1, t.stepPreflight, t.step2, t.summary].map((label, i) => (
              <li
                key={i}
                className={
                  active.includes(i + 1)
                    ? "active"
                    : i + 1 < active[0]
                      ? "done"
                      : ""
                }
              >
                <a href={`#step-${i + 1}`}>
                  <span className="step">
                    {i + 1 < active[0] ? <Check size={11} /> : `0${i + 1}`}
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
          <p className="next-step" aria-live="polite">
            <strong>{t.nextLabel}:</strong> {next}
          </p>
        </nav>
        <div className="workspace">
          <aside className="controls">
            <section className="panel" id="step-1">
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
                onClick={() => inspect(true)}
              >
                {t.demo}
                <ArrowRight size={15} />
              </button>
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
            {inventory && selection ? (
              <PreflightPanel
                key={inventoryKey}
                inventory={inventory}
                selection={selection}
                busy={busy}
                lang={lang}
                onReinspect={reinspect}
                onChange={(v) => {
                  setSelection(v);
                  invalidate();
                }}
              />
            ) : (
              <section className="panel preflight" id="step-2">
                <h2>
                  <span className="step">02</span>
                  {t.stepPreflight}
                </h2>
                <p className="muted">{t.lockedPreflight}</p>
              </section>
            )}
            <section className="panel transform" id="step-3">
              <h2>
                <span className="step">03</span>
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
              <label htmlFor="dxf-version">
                {t.format}
                <Info title={t.format}>{t.formatHelp}</Info>
              </label>
              <select
                id="dxf-version"
                disabled={busy}
                value={dxfVersion}
                onChange={(e) => {
                  setDxfVersion(e.target.value);
                  invalidate();
                }}
              >
                <option value="R2018">DXF R2018 · Standard</option>
                <option value="R2000">DXF R2000 · AutoCAD 2000</option>
              </select>
              {!inventory && <p className="fine">{t.lockedTransform}</p>}
              <button
                className="primary analyze"
                disabled={busy || !inventory || !selected.length}
                onClick={() => run()}
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
                  <p>
                    {
                      t[
                        stage as
                          | "runtime"
                          | "libraries"
                          | "processing"
                          | "inspecting"
                      ]
                    }
                  </p>
                  <button className="text-button" onClick={cancel}>
                    <X size={14} />
                    {t.cancel}
                  </button>
                </div>
              )}
              <p className="fine">{t.initialLoad}</p>
            </section>
            <section className="preview-panel" id="preview">
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
                <span className="chip">{demo ? "DEMO" : to.epsg}</span>
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
                    <MapView
                      report={report}
                      basemap={mapConsent}
                      transparency={transparency}
                    />
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
              {tab === "map" && report?.geographicBounds && (
                <div className="map-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={mapConsent}
                      onChange={(e) => setMapConsent(e.target.checked)}
                    />
                    {t.mapConsent}
                  </label>
                  <label className="opacity-control">
                    {t.transparency}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={transparency}
                      disabled={!mapConsent}
                      onChange={(e) => setTransparency(Number(e.target.value))}
                    />
                    <output>{transparency} %</output>
                  </label>
                  <Info title="OpenStreetMap">{t.mapPrivacy}</Info>
                  <small>
                    {lang === "de"
                      ? "Farben wie in der DXF (Objekt- bzw. Layerfarbe; helle Farben dunkel umrandet) · Details per Mauszeiger"
                      : "Colours as in the DXF (object or layer colour; light colours outlined) · Hover for details"}
                  </small>
                </div>
              )}
              <div className="preview-bottom">
                <span>
                  <span className="dot" />
                  {t.viewHint}
                </span>
                <span>X / Y · m</span>
              </div>
              {report?.previewLimited && (
                <p className="preview-limit">
                  {lang === "de"
                    ? "Vorschau gekürzt (max. 1.500 Geometrien). Die Exportauswahl wird dadurch nicht gekürzt."
                    : "Preview limited (max. 1,500 geometries). This does not limit the export selection."}
                </p>
              )}
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
            <section className="panel analysis" id="step-4">
              <h2>
                <span className="step">04</span>
                {t.summary}
                <Info title={t.model}>{t.modelHelp}</Info>
              </h2>
              {!report ? (
                <p className="muted">
                  {t.lockedResult} {t.warningIntro}
                </p>
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
                    {removedDuplicates > 0 && (
                      <div className="stat-duplicates">
                        <strong>
                          {removedDuplicates.toLocaleString(lang)}
                        </strong>
                        <span>{t.duplicatesRemoved}</span>
                      </div>
                    )}
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
                  {partial && (
                    <div className="omission-box">
                      <h3>
                        <TriangleAlert size={18} />
                        {lang === "de"
                          ? "Teil-Export: Objekte fehlen"
                          : "Partial export: objects omitted"}
                      </h3>
                      <p>
                        {lang === "de"
                          ? `${report.selectedOmissions - removedDuplicates} Quellobjekte abgewählt · ${report.failedSources} nicht sicher transformierbar · ${report.successfulSources} Quellobjekte verarbeitet.`
                          : `${report.selectedOmissions - removedDuplicates} source objects excluded · ${report.failedSources} could not be safely transformed · ${report.successfulSources} source objects processed.`}
                      </p>
                      {(report.audit.errors > 0 ||
                        report.audit.repairs > 0 ||
                        report.audit.recovered) && (
                        <p>
                          {lang === "de"
                            ? "Die Datei wurde mit Recovery/Audit eingelesen. Dabei können weitere Inhalte repariert oder entfernt worden sein."
                            : "The file was loaded using recovery/audit. Additional content may have been repaired or removed."}{" "}
                          {report.audit.repairs} / {report.audit.errors}.
                        </p>
                      )}
                      <details className="disclosure">
                        <summary>
                          {lang === "de"
                            ? "Ausgelassene Objekte & Audit anzeigen"
                            : "Show omitted objects & audit"}{" "}
                          ({missing.length})
                        </summary>
                        <p>
                          {lang === "de"
                            ? "Hier max. 50 Einträge; vollständige Objektliste im Prüfprotokoll."
                            : "Up to 50 entries here; full object list in the inspection report."}
                        </p>
                        <div className="omission-list">
                          {missing.slice(0, 50).map((o, i) => (
                            <p key={i}>
                              <strong>
                                {o.type} · #{o.handle} · {o.layer}
                              </strong>
                              <br />
                              {o.category === "selection"
                                ? lang === "de"
                                  ? "Bewusst abgewählt"
                                  : "Intentionally excluded"
                                : o.message}
                            </p>
                          ))}
                          {report.audit.findings.slice(0, 50).map((o, i) => (
                            <p key={`audit${i}`}>{o.message}</p>
                          ))}
                        </div>
                      </details>
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
                            <th>{from.axes}</th>
                            <th>{to.axes}</th>
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
                  <div className="download-row">
                    <button
                      className="primary"
                      disabled={blocked || busy}
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
                        const {
                          preview,
                          geographicPreview,
                          previewMeta,
                          ...r
                        } = report;
                        void preview;
                        void geographicPreview;
                        void previewMeta;
                        save(
                          JSON.stringify(
                            {
                              ...r,
                              preflight: {
                                distance: inventory?.distance,
                                total: inventory?.total,
                                selected: selected.length,
                                selection,
                              },
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
