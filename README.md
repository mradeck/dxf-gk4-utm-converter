# DXF Coordinate Forge

[Open app](https://dxf-coordinate-forge.netlify.app/) · [Public source](https://github.com/mradeck/dxf-gk4-utm-converter)

Local-first browser SPA: DXF model space from **DHDN / GK4 (EPSG:31468)** to **ETRS89 / UTM32N (EPSG:25832)**. Fixed X=easting, Y=northing in metres; Z unchanged. German/English UI, dark/light theme, preflight selection, partial exports with consent and actual DXF geometry over an opt-in OpenStreetMap background.

## Run

```sh
npm ci
npm run dev
npm run build
```

Static Netlify deployment uses `dist/`. No server-side CAD processing, API keys or uploads. Pyodide 0.27.7 and its compiled scientific packages are downloaded from jsDelivr on first conversion; ezdxf 1.4.4 and BeTA2007 are shipped with the app. Internet is required for initial runtime loading. A worker keeps heavy operations off the UI thread; Cancel terminates it.

## Geodesy

Explicit PROJ pipeline: inverse GK4/Bessel projection → NTv2 horizontal shift → UTM32/GRS80. Never use an optional grid, null grid, automatic operation selection or silent Helmert fallback. Objects outside grid coverage are reported and omitted with explicit partial-export consent. All source inputs must be full GK4 metres; header units other than metre/unspecified block export. Unspecified units require acknowledgement. Output is metre-based DXF R2018 without leading zone number.

BeTA2007 is a **decimetre-level geotopographic transformation**, not an assured cadastral transformation. BY-KanU was withdrawn at the end of 2024; LDBV's public explanation is only “aus fachlichen Gründen”. BY-SAPOS has different geodetic foundations and cannot automatically replace a cadastral grid. A new empirical grid needs suitable common points and independent validation; this app does not manufacture accuracy by resampling.

Sources (checked 2026-09-22):

- https://www.ldbv.bayern.de/vermessung/utm_umstellung/trans_geofach.html
- https://www.ldbv.bayern.de/produkte/dienste/transformationen.html
- https://proj.org/en/stable/operations/transformations/hgridshift.html
- https://ezdxf.readthedocs.io/en/stable/
- https://pyodide.org/en/stable/usage/packages-in-pyodide.html

## Deliberate CAD scope

The output is a **new model-space drawing**, not a full document migration. Layer, line-type and text-style tables are imported. Simple and nested positive uniformly scaled INSERTs are expanded, attributes become text; renderable DIMENSION/MULTILEADER entities become their display primitives with unchanged label content. Curves and polylines become 3D polylines, with configurable flattening tolerance and subdivision of long edges (maximum 20 m). This tolerance is not a certified global error bound or absolute geodetic accuracy.

POINT, LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE, TEXT, MTEXT, 3DFACE, SOLID, TRACE, MESH and horizontal non-gradient HATCH are handled with entity-specific logic. Text uses an exact anchor and local rotation/scale approximation; large text is checked against its bounding box. Hatch boundaries are transformed and pattern rotation/scale approximated locally; associativity is removed. Mesh/face vertices are transformed without tessellating face interiors. Paper layouts, viewports, extended metadata, dependencies, source block structure and editable dimension semantics are not retained. External fonts are not bundled.

Unsupported or ambiguous geometry is **omitted per top-level source object**, including XREF/proxies/ACIS solids, recursive/dynamic/XCLIP/nonuniform/mirrored blocks, tilted text/hatches, gradient hatches, physical polyline widths and nonzero thickness. Per-object staging rolls back partial block/hatch geometry and preview bounds on failure. The full report lists omitted source handles, layers and reasons. Two separate acknowledgements are required for a partial export: normal CAD/geodetic limitations and missing contents. Worker-side validation enforces omission consent. No original is overwritten.

Fatal errors still prevent export: unreadable files, invalid grids, incompatible drawing units, no remaining geometry and a failing output structural audit. Source DXF recovery/audit repairs are reported and require partial-export consent because they may remove content before inventory.

## Preflight and cleanup

1. Read the DXF locally and inspect model-space objects **before transformation**.
2. Review counts, spatial groups and implausible coordinates. Keep all by default; optionally exclude standalone POINTs, groups, layer/type combinations or individual objects. POINT filtering also applies inside decomposed blocks, without removing polyline/mesh vertices.
3. Transform the selection. Review omissions and download a new DXF plus a complete JSON inspection report.

Spatial policy is based on [Geodata Inspector & Cleaner](https://github.com/mradeck/geodata-inspector-cleaner/tree/e4a2721de903b5aedca6be469d8d51ff4a51621e): transitive object-centre clustering (default 1,000 m), a 60% main-area threshold, extent-inflation hints and no automatic deletion. The single GK4-plausible cluster is preferred as a main-area candidate; otherwise the largest cluster is used. Equally weighted groups remain ambiguous. Blocks/text use approximate anchors; this is a review aid, not proof of validity. Z=0 is only flagged alongside materially elevated geometry. Spatial hashing avoids quadratic work for dense point sets; exhausting the cross-cell comparison budget conservatively merges neighbours and disables outlier recommendations.

The schematic preflight view shows up to 1,000 bounds/anchors for the focused group. The transformed DXF map shows up to 1,500 sampled geometries with handles/layers on hover; lines are magenta, points purple. Preview simplification **does not remove export objects**. OSM tiles load only with consent and disclose the visible map area/IP to the provider. Text glyphs, hatch fills and exact CAD symbology are not rendered.

Limits: 25 MB DXF, 256 MB NTv2, 200,000 expanded entities, 1,000,000 coordinate evaluations. Full multi-GB BY-KanU files need a smaller regional extract and professional validation. Custom NTv2 headers/ellipsoids/direction are checked, but this does not certify their datum realization, licensing or quality.

## Tests

```sh
python3 -m venv .venv
.venv/bin/pip install ezdxf==1.4.4 pyproj==3.7.2 pytest
.venv/bin/pytest tests -q
npm test
```

Runtime tests exercise the same engine in actual Pyodide/WebAssembly. Native tests inspect exported DXF structures, coordinates, height preservation and safety failures. User-specific AutoCAD Map 3D comparison still requires an original/transformed sample pair. Always check independent known control points before production use.

## Versioning

Display: `YY.MM.feature.fix` → `26.09.2.0`. npm: `26.9.2`.

## License

MIT for original app code. Third-party licenses and grid provenance: `public/THIRD-PARTY-NOTICES.txt`.
