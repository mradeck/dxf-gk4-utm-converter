# Changelog

## 26.09.8.0 — 2026-09-30

- Project permission allowlist for Claude Code (`.claude/settings.json`): tests, typecheck and read-only GitHub PR queries run without confirmation prompts. App behaviour unchanged.

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
