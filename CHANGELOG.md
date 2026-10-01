# Changelog

## 26.09.15.0 — 2026-10-01

- Step 04: removed duplicates appear as a fourth, highlighted tile “Object duplicates removed”; the partial-export notice no longer counts them and only appears when objects are really missing.
- Preflight object list: duplicate findings read “Object duplicate of #… – removed/kept” (German UI in German) instead of the technical English reason.

## 26.09.14.0 — 2026-09-30

- Transparency slider for the OSM background next to “Show OSM background” (default 50 %); changes apply without rebuilding the map.

## 26.09.13.0 — 2026-09-30

- Map and drawing preview show the effective DXF colours (object true colour, ACI or layer colour) instead of fixed magenta/purple; light colours are outlined on the map.

## 26.09.12.0 — 2026-09-30

- Output format selectable in step 03: DXF R2018 (default) or R2000 (AutoCAD 2000). For R2000 true colours are mapped to the nearest AutoCAD colour index and reported; MESH entities are omitted with a note instead of being dropped silently.

## 26.09.11.0 — 2026-09-30

- Exact duplicates (same layer and across layers) are removed from the export by default; the first object found stays. One button keeps them after all; the wording states what is removed.
- OpenStreetMap background is shown immediately with the transformed preview (can be switched off; privacy note kept).
- “Select all” renamed to “Reset selection”, since the reset keeps duplicates removed.

## 26.09.10.0 — 2026-09-30

- UTM32 → GK4 as second direction (same BeTA2007/NTv2 grid applied inversely); GK4 → UTM → GK4 round trip below 1 µm.
- Source system detected from coordinate ranges as in Geodata Inspector (GK4 with zone prefix 4, UTM32 without zone prefix); manual override in the preflight; objects in the other system flagged. Header, preview, sample table and file name (`_EPSG25832` / `_EPSG31468`) follow the direction.
- Preflight starts immediately after loading a file; the “Inspect file” button is gone.
- No acknowledgement checkboxes before download: limitations and omissions stay visible in step 04 and in the report, blockers still prevent export.

## 26.09.9.0 — 2026-09-30

- Tests workflow uses `actions/checkout`, `setup-node` and `setup-python` v7 (Node.js 24 runtime); removes the Node.js 20 deprecation warning. App behaviour unchanged.

## 26.09.8.0 — 2026-09-30

- Project permission allowlist for Claude Code (`.claude/settings.json`): tests, typecheck and read-only GitHub PR queries run without confirmation prompts. App behaviour unchanged.
- `CLAUDE.md`: the trigger “push” covers the full flow (version, CHANGELOG/README, checks, PR, merge after green Tests).

## 26.09.7.0 — 2026-09-30

- GitHub Actions workflow: build (typecheck), Python engine tests and Node/WebAssembly runtime tests on every pull request and push to `main`; no artifacts uploaded.

## 26.09.6.0 — 2026-09-30

- Exact duplicate detection in the preflight following Geodata Inspector & Cleaner: same-layer and cross-layer categories, A/B semantics, no tolerance, handles ignored; per-category “exclude all B” and per-object findings.

## 26.09.5.0 — 2026-09-30

- Optional conversion of QGIS symbol blocks (`symbolLayer<n>`) to POINTs at their insertion point, keeping Z, layer and colour; reported as a transformation note.
- Engine report version aligned with the app version (was still 26.09.2.0).

## 26.09.4.0 — 2026-09-30

- Preflight detects QGIS symbol blocks (`symbolLayer<n>`) from DXF exports with symbology, reports count and marker size, flags each reference and offers one-click exclusion plus the QGIS re-export recommendation (“No symbology”).

## 26.09.3.0 — 2026-09-30

- Linear workflow: step bar (01–04) with current state and a “next step” hint naming the exact button to click.
- Transformation settings (step 03) moved directly below the preflight (step 02), so steps follow reading order instead of alternating between columns.
- Placeholders explain when steps 02–04 become available; automatic scrolling to the preflight after inspection and to the preview after transformation.
- Grid option states that BeTA2007 is bundled with the app.

## 26.09.2.0 — 2026-09-22

- Local preflight before transformation: counts, spatial groups, GK4 plausibility, extent inflation and per-object findings.
- Explicit selection by area, layer/type and individual object; optional POINT exclusion preserving line/mesh vertices.
- Partial exports with a complete omission ledger, separate confirmation and atomic per-source rollback.
- Source recovery/audit findings reported; invalid units/grids and empty/invalid outputs remain blocked.
- Actual transformed DXF lines and points on an opt-in OSM background; hover metadata and explicit preview limits.
- DE/EN interface, dark/light styling, native engine tests, WebAssembly tests and worker consent regression tests.

## 26.09.1.0

- Initial local-first GK4 → UTM32 DXF converter with BeTA2007/custom NTv2, bilingual interface, previews and inspection reports.
