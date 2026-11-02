// Gemeinsame Bausteine der öffentlichen Apps von Michael Radeck:
// Sprachknopf mit Fahne, Interface-Knopf (automatisch/hell/dunkel),
// Kopfleisten-Menü „Über“ (Über mich, Copyright), Hilfe-Knopf „(i)“,
// zwei Fußleisten sowie die Dialoge „Über mich“, „Hilfe / Bugreport / Kontakt“
// und „Lizenzen / Copyright“. Vorbild: Geodata Inspector & Cleaner.
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Lang = "de" | "en";
export type ThemeMode = "auto" | "light" | "dark";

export const THEME_KEY = "dxf.theme";
export const LANG_KEY = "dxf.lang";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* nur Sitzung */
    }
  },
};

/** Startwert der Sprache: gespeicherte Wahl, sonst das vom Inline-Skript gesetzte `lang`. */
export function initialLang(): Lang {
  const saved = store.get(LANG_KEY);
  if (saved === "de" || saved === "en") return saved;
  return document.documentElement.lang === "en" ? "en" : "de";
}
export function initialTheme(): ThemeMode {
  const saved = store.get(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : "auto";
}
export function saveLang(lang: Lang) {
  store.set(LANG_KEY, lang);
}
export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  store.set(THEME_KEY, mode);
}
export const nextTheme = (mode: ThemeMode): ThemeMode =>
  mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";

export function FlagDE() {
  return (
    <svg className="flag" viewBox="0 0 30 20" aria-hidden="true">
      <path fill="#000" d="M0 0h30v7H0z" />
      <path fill="#d00" d="M0 7h30v6H0z" />
      <path fill="#ffce00" d="M0 13h30v7H0z" />
    </svg>
  );
}
export function FlagGB() {
  return (
    <svg className="flag" viewBox="0 0 60 40" aria-hidden="true">
      <defs>
        <clipPath id="gb-clip">
          <path d="M0 0h60v40H0z" />
        </clipPath>
      </defs>
      <g clipPath="url(#gb-clip)">
        <path fill="#012169" d="M0 0h60v40H0z" />
        <path stroke="#fff" strokeWidth="8" d="m0 0 60 40M0 40 60 0" />
        <path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40M0 40 60 0" />
        <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
        <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
      </g>
    </svg>
  );
}
export function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "auto")
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
      </svg>
    );
  if (mode === "light")
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" fill="currentColor" />
    </svg>
  );
}

export const CHROME_TEXT = {
  de: {
    aboutMenu: "Über",
    aboutItem: "Über mich",
    copyrightItem: "Copyright",
    help: "Hilfe",
    ok: "OK",
    supportEyebrow: "DXF Coordinate Forge",
    licEyebrow: "Projektinformationen",
    licSubtitle: "Bibliotheken, Daten und externe Dienste.",
    aboutEyebrow: "Über den Entwickler",
    aboutTitle: "Über Michael Radeck",
    aboutSubtitle:
      "DroneMediaMunich, Multikopterschule XMS, Pointcloud Manager und DXF Coordinate Forge.",
    aboutP1:
      "Michael Radeck arbeitet seit vielen Jahren an der Schnittstelle von Medienproduktion, Drohnentechnik, Vermessung und Ausbildung. Als Inhaber von DroneMediaMunich, eXpert Media Solutions und der Multikopterschule XMS verbindet er praktische Flugerfahrung mit Postproduktion, Colorgrading, Photogrammetrie, GNSS-/Vermessungsworkflows und technischer Schulung.",
    aboutP2:
      "Mit DroneMediaMunich realisiert er Luftaufnahmen, Drohnenvideos, Inspektions- und Vermessungsflüge sowie photogrammetrische Auswertungen bis hin zu 3D-Modellen und CAD-nahen Aufmaßen. Die Multikopterschule XMS bietet Schulungen und Fachkunde für private und gewerbliche Drohnenpiloten, unter anderem zu Luftrecht, sicherem Flugbetrieb, Praxisnachweisen, BOS-Anwendungen, Photogrammetrie und professionellen Film-/TV-Einsätzen.",
    aboutP3:
      "Der Pointcloud Manager entsteht aus diesem praktischen Arbeitsumfeld: als lokales Werkzeug für Punktwolken, Drohnenvermessung, Photogrammetrie, LiDAR-Daten, Shape-Analyse und dokumentierbare Auswertungen, ohne Cloud-Zwang und mit Fokus auf nachvollziehbare Workflows.",
    aboutDemoIntro:
      "Eine reduzierte Online-Version mit Funktionslimits und Upgrade-/Upsell-Hinweisen ist hier verfügbar:",
    aboutDemoLink: "Pointcloud Manager – reduzierte Online-Version",
    aboutP4:
      "DXF Coordinate Forge überträgt diesen Ansatz auf CAD-Pläne: DXF-Zeichnungen werden lokal im Browser vorab geprüft, von Gauß-Krüger nach ETRS89/UTM umgerechnet und auf der Karte kontrolliert.",
    aboutLinksAria: "Profile und Projekte",
    aboutXing: "XING-Profil",
    langToggle: "Sprache: Deutsch — zu Englisch wechseln",
    themeAuto: "Interface: automatisch (Systemeinstellung) — klicken für hell",
    themeLight: "Interface: hell — klicken für dunkel",
    themeDark: "Interface: dunkel — klicken für automatisch",
    apps: "Weitere Apps",
    author: "Ein Werkzeug von Michael Radeck",
    linksAria: "Hilfe und rechtliche Hinweise",
    support: "Hilfe / Bugreport / Kontakt",
    licenses: "Lizenzen / Copyright",
    imprint: "Impressum",
    kofiAria: "Michael Radeck auf Ko-fi unterstützen",
    source: "Quellcode",
    version: "Version",
    gridSource: "BeTA2007 (LDBV)",
    close: "Schließen",
    supportIntro:
      "Fragen zur Bedienung, einen Fehler gefunden oder eine Idee für die App?",
    supportHelp: "Anleitung (README) öffnen",
    supportBug: "Bugreport per E-Mail",
    supportContact: "Kontakt per E-Mail",
    bugHint:
      "Für einen Bugreport helfen die Schritte zum Fehler, die erwartete und tatsächliche Reaktion sowie Browser und Betriebssystem. Die App-Version steht bereits im E-Mail-Betreff.",
    supportPrivacy:
      "Öffnet dein E-Mail-Programm. Die App versendet nichts selbst und hängt keine DXF-Dateien oder Koordinaten an. Bitte sensible Projektdaten vor dem freiwilligen Teilen entfernen.",
    bugSubject: "Bugreport",
    contactSubject: "Kontakt / Hilfe",
    bugBody:
      "Schritte zum Fehler:\n\nErwartetes Ergebnis:\n\nTatsächliches Ergebnis / Fehlermeldung:\n\nBrowser und Betriebssystem:\n\nBitte keine vertraulichen Projektdaten anhängen.",
    licIntro:
      "DXF Coordinate Forge steht unter der MIT-Lizenz. Verwendete Bibliotheken, Daten und externe Dienste:",
    licComponent: "Komponente",
    licLicense: "Lizenz",
    licUse: "Verwendung",
    licApp: "diese App",
    licGrid: "Transformationsgitter DHDN → ETRS89 (mitgeliefert)",
    licEzdxf: "DXF lesen und schreiben (mitgeliefert)",
    licPyodide: "Python-Laufzeit im Browser (bei der ersten Transformation von jsDelivr geladen)",
    licProj: "Koordinatentransformation",
    licReact: "Oberfläche",
    licLeaflet: "Kartenanzeige",
    licLucide: "Symbole",
    licFonts: "Schrift (selbst gehostet, mitgeliefert)",
    licOsm: "Hintergrundkarte (online geladen, abschaltbar)",
    licFull: "Vollständige Lizenztexte und Herkunft (THIRD-PARTY-NOTICES.txt)",
  },
  en: {
    aboutMenu: "About",
    aboutItem: "About me",
    copyrightItem: "Copyright",
    help: "Help",
    ok: "OK",
    supportEyebrow: "DXF Coordinate Forge",
    licEyebrow: "Project information",
    licSubtitle: "Libraries, data and external services.",
    aboutEyebrow: "About the developer",
    aboutTitle: "About Michael Radeck",
    aboutSubtitle:
      "DroneMediaMunich, Multikopterschule XMS, Pointcloud Manager and DXF Coordinate Forge.",
    aboutP1:
      "Michael Radeck has been working at the intersection of media production, drone technology, surveying and training for many years. As the owner of DroneMediaMunich, eXpert Media Solutions and the Multikopterschule XMS, he combines practical flight experience with post-production, colour grading, photogrammetry, GNSS/survey workflows and technical training.",
    aboutP2:
      "With DroneMediaMunich he carries out aerial photography, drone videos, inspection and survey flights as well as photogrammetric processing up to 3D models and CAD-quality dimensioning. The Multikopterschule XMS offers training and proficiency for private and commercial drone pilots — among other topics aviation law, safe flight operations, practical proof of competence, BOS applications, photogrammetry and professional film/TV operations.",
    aboutP3:
      "Pointcloud Manager grew out of this practical work: a local tool for point clouds, drone surveying, photogrammetry, LiDAR data, shape analysis and documentable processing — without forced cloud use and with a focus on traceable workflows.",
    aboutDemoIntro:
      "A reduced online version with feature limits and upgrade/upsell information is available here:",
    aboutDemoLink: "Pointcloud Manager – reduced online version",
    aboutP4:
      "DXF Coordinate Forge applies the same approach to CAD drawings: DXF files are checked locally in the browser, converted from Gauss-Krüger to ETRS89/UTM and verified on the map.",
    aboutLinksAria: "Profiles and projects",
    aboutXing: "XING profile",
    langToggle: "Language: English — switch to German",
    themeAuto: "Interface: automatic (system setting) — click for light",
    themeLight: "Interface: light — click for dark",
    themeDark: "Interface: dark — click for automatic",
    apps: "More apps",
    author: "A tool by Michael Radeck",
    linksAria: "Help and legal information",
    support: "Help / bug report / contact",
    licenses: "Licenses / copyright",
    imprint: "Imprint",
    kofiAria: "Support Michael Radeck on Ko-fi",
    source: "Source code",
    version: "Version",
    gridSource: "BeTA2007 (LDBV)",
    close: "Close",
    supportIntro: "Questions about the app, found a bug or have an idea?",
    supportHelp: "Open guide (README)",
    supportBug: "Report a bug by email",
    supportContact: "Contact by email",
    bugHint:
      "For bug reports, include steps to reproduce, expected and actual behaviour, plus your browser and operating system. The app version is already in the email subject.",
    supportPrivacy:
      "Opens your email application. The app does not send anything itself and attaches no DXF files or coordinates. Please remove sensitive project data before sharing it voluntarily.",
    bugSubject: "Bug report",
    contactSubject: "Contact / help",
    bugBody:
      "Steps to reproduce:\n\nExpected result:\n\nActual result / error message:\n\nBrowser and operating system:\n\nPlease do not attach confidential project data.",
    licIntro:
      "DXF Coordinate Forge is licensed under the MIT license. Libraries, data and external services used:",
    licComponent: "Component",
    licLicense: "License",
    licUse: "Used for",
    licApp: "this app",
    licGrid: "transformation grid DHDN → ETRS89 (bundled)",
    licEzdxf: "reading and writing DXF (bundled)",
    licPyodide: "Python runtime in the browser (loaded from jsDelivr on first transformation)",
    licProj: "coordinate transformation",
    licReact: "user interface",
    licLeaflet: "map display",
    licLucide: "icons",
    licFonts: "font (self-hosted, bundled)",
    licOsm: "background map (loaded online, can be switched off)",
    licFull: "Full license texts and provenance (THIRD-PARTY-NOTICES.txt)",
  },
} as const;

const RELATED_APPS: [string, string][] = [
  ["Geodata Inspector & Cleaner", "https://geodata-inspector-cleaner.netlify.app/"],
  ["GeoTIFF Inspector", "https://mradeck.github.io/geotiff-inspector/"],
  ["MeasureMap", "https://measuremap-viewer-editor.netlify.app/"],
  ["Geoid-TIFF 2 PGM Converter", "https://geoid-tiff2pgm-converter.netlify.app/"],
  // Die eigene App (DXF Coordinate Forge, https://dxf-coordinate-forge.netlify.app/)
  // wird bewusst nicht verlinkt.
  ["PointCloud Manager", "https://www.pointcloud-manager.com"],
  ["GPS / UTM Converter", "https://mradeck.github.io/gps-utm-coordinate-converter/"],
  ["SkyCheck", "https://skycheck-de.netlify.app/"],
  ["michael-radeck.de", "https://www.michael-radeck.de"],
];
const MAIL = "michael.radeck@email.de";
const REPO = "https://github.com/mradeck/dxf-gk4-utm-converter";
const GRID_AUTHORITY =
  "https://www.ldbv.bayern.de/vermessung/utm_umstellung/trans_geofach.html";
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export type ChromeDialog = "" | "about" | "support" | "licenses";

function Dialog({
  open,
  eyebrow,
  title,
  subtitle,
  closeLabel,
  okLabel,
  onClose,
  children,
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  closeLabel: string;
  okLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header className="dlg-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle ? <p className="dlg-subtitle">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          className="button dlg-close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="dlg-body">{children}</div>
      <footer className="dlg-foot">
        <button type="button" className="button button-accent" onClick={onClose}>
          {okLabel}
        </button>
      </footer>
    </dialog>
  );
}

/** Info-Symbol („i“ im Kreis), wie Lucide `Info`. */
function InfoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/** Kopfleisten-Menü „Über“ (Position 1) und Hilfe-Knopf „(i)“ (Position 2). */
export function HeaderInfoActions({
  lang,
  onOpen,
}: {
  lang: Lang;
  onOpen: (d: ChromeDialog) => void;
}) {
  const c = CHROME_TEXT[lang];
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const m = menu.current;
      if (!m?.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") m.open = false;
        return;
      }
      if (!m.contains(e.target as Node)) m.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const pick = (d: ChromeDialog) => {
    if (menu.current) menu.current.open = false;
    onOpen(d);
  };
  return (
    <>
      <details className="header-menu" ref={menu}>
        <summary className="button button-quiet">{c.aboutMenu}</summary>
        <div className="header-menu-panel">
          <button type="button" onClick={() => pick("about")}>
            {c.aboutItem}
          </button>
          <button type="button" onClick={() => pick("licenses")}>
            {c.copyrightItem}
          </button>
        </div>
      </details>
      <button
        type="button"
        className="button button-quiet icon-only"
        aria-label={c.help}
        title={c.help}
        onClick={() => onOpen("support")}
      >
        <InfoIcon />
      </button>
    </>
  );
}

export function AppFooter({
  lang,
  version,
  note,
  onOpen,
}: {
  lang: Lang;
  version: string;
  note?: string;
  onOpen: (d: ChromeDialog) => void;
}) {
  const c = CHROME_TEXT[lang];
  return (
    <footer className="app-footer">
      <nav className="related-apps" aria-label={c.apps}>
        <strong>{c.apps}</strong>
        {RELATED_APPS.map(([label, url]) => (
          <a href={url} key={url} {...ext}>
            {label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </nav>
      <div className="footer-meta">
        <span>
          {c.author} · © {new Date().getFullYear()} · {c.version} {version}
          {note ? ` · ${note}` : ""}
        </span>
        <nav className="footer-links" aria-label={c.linksAria}>
          <a href="https://www.openstreetmap.org/copyright" {...ext}>
            OpenStreetMap ↗
          </a>
          <a href={GRID_AUTHORITY} {...ext}>
            {c.gridSource} ↗
          </a>
          <a href={REPO} {...ext}>
            {c.source} ↗
          </a>
          <button type="button" onClick={() => onOpen("support")}>
            {c.support}
          </button>
          <button type="button" onClick={() => onOpen("licenses")}>
            {c.licenses}
          </button>
          <a
            href="https://www.multikopterschule.de/Kontakt-Impressum/IMPRESSUM/"
            {...ext}
          >
            {c.imprint} ↗
          </a>
          <a href="https://ko-fi.com/mradeck/tip" {...ext} aria-label={c.kofiAria}>
            <span aria-hidden="true">☕</span> Ko-fi
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function ChromeDialogs({
  lang,
  version,
  dialog,
  onClose,
}: {
  lang: Lang;
  version: string;
  dialog: ChromeDialog;
  onClose: () => void;
}) {
  const c = CHROME_TEXT[lang];
  const subject = (kind: string) => `DXF Coordinate Forge v${version} – ${kind}`;
  const bugHref = `mailto:${MAIL}?subject=${encodeURIComponent(subject(c.bugSubject))}&body=${encodeURIComponent(c.bugBody)}`;
  const contactHref = `mailto:${MAIL}?subject=${encodeURIComponent(subject(c.contactSubject))}`;
  const common = { closeLabel: c.close, okLabel: c.ok, onClose };
  return (
    <>
      <Dialog
        open={dialog === "about"}
        eyebrow={c.aboutEyebrow}
        title={c.aboutTitle}
        subtitle={c.aboutSubtitle}
        {...common}
      >
        <p>{c.aboutP1}</p>
        <p>{c.aboutP2}</p>
        <p>
          {c.aboutP3} {c.aboutDemoIntro}{" "}
          <a href="https://stable-v53--pointcloud-manager.netlify.app/" {...ext}>
            {c.aboutDemoLink}
          </a>
          .
        </p>
        <p>{c.aboutP4}</p>
        <nav className="about-links" aria-label={c.aboutLinksAria}>
          <a href="https://multikopterschule.de/" {...ext}>
            multikopterschule.de
          </a>
          <a href="https://www.dronemedia-munich.de/" {...ext}>
            dronemedia-munich.de
          </a>
          <a href="https://www.xing.com/profile/Michael_Radeck" {...ext}>
            {c.aboutXing}
          </a>
          <a href="https://www.crew-united.com/de/Michael-Radeck_71557.html" {...ext}>
            Crew United
          </a>
        </nav>
      </Dialog>
      <Dialog
        open={dialog === "support"}
        eyebrow={c.supportEyebrow}
        title={c.support}
        {...common}
      >
        <p>{c.supportIntro}</p>
        <div className="actions">
          <a className="button" href={`${REPO}#readme`} {...ext}>
            {c.supportHelp}
          </a>
          <a className="button" href={bugHref}>
            {c.supportBug}
          </a>
          <a className="button" href={contactHref}>
            {c.supportContact}
          </a>
        </div>
        <p className="addr">{MAIL}</p>
        <p>{c.bugHint}</p>
        <p className="dlg-muted">{c.supportPrivacy}</p>
      </Dialog>
      <Dialog
        open={dialog === "licenses"}
        eyebrow={c.licEyebrow}
        title={c.licenses}
        subtitle={c.licSubtitle}
        {...common}
      >
        <p>{c.licIntro}</p>
        <table className="lic-table">
          <tbody>
            <tr>
              <th>{c.licComponent}</th>
              <td>
                <b>{c.licLicense}</b> · {c.licUse}
              </td>
            </tr>
            <tr>
              <th>DXF Coordinate Forge</th>
              <td>MIT © Michael Radeck · {c.licApp}</td>
            </tr>
            <tr>
              <th>BeTA2007 (AdV / LDBV)</th>
              <td>{lang === "de" ? "freie Weitergabe" : "free redistribution"} · {c.licGrid}</td>
            </tr>
            <tr>
              <th>ezdxf 1.4.4</th>
              <td>MIT · {c.licEzdxf}</td>
            </tr>
            <tr>
              <th>Pyodide 0.27.7</th>
              <td>MPL-2.0 · {c.licPyodide}</td>
            </tr>
            <tr>
              <th>pyproj / PROJ</th>
              <td>MIT · {c.licProj}</td>
            </tr>
            <tr>
              <th>React</th>
              <td>MIT · {c.licReact}</td>
            </tr>
            <tr>
              <th>Leaflet</th>
              <td>BSD-2-Clause · {c.licLeaflet}</td>
            </tr>
            <tr>
              <th>Lucide</th>
              <td>ISC · {c.licLucide}</td>
            </tr>
            <tr>
              <th>Inter</th>
              <td>SIL OFL 1.1 · © The Inter Project Authors · {c.licFonts}</td>
            </tr>
            <tr>
              <th>OpenStreetMap</th>
              <td>
                ODbL ·{" "}
                {lang === "de"
                  ? "© OpenStreetMap-Mitwirkende"
                  : "© OpenStreetMap contributors"}{" "}
                · {c.licOsm}
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          <a href="/THIRD-PARTY-NOTICES.txt" {...ext}>
            {c.licFull} ↗
          </a>
        </p>
      </Dialog>
    </>
  );
}
