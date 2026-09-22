# DXF Coordinate Forge

Local-first browser SPA: DXF model space from **DHDN / GK4 (EPSG:31468)** to **ETRS89 / UTM32N (EPSG:25832)**. Fixed X=easting, Y=northing in metres; Z unchanged. German/English UI, dark/light theme, inspection report, drawing preview and opt-in OpenStreetMap extent.

## Run

```sh
npm ci
npm run dev
npm run build
```

Static Netlify deployment uses `dist/`. No server-side CAD processing, API keys or uploads. Pyodide 0.27.7 and its compiled scientific packages are downloaded from jsDelivr on first conversion; ezdxf 1.4.4 and BeTA2007 are shipped with the app. Internet is required for initial runtime loading. A worker keeps heavy operations off the UI thread; Cancel terminates it.

## Geodesy

Explicit PROJ pipeline: inverse GK4/Bessel projection → NTv2 horizontal shift → UTM32/GRS80. Never use an optional grid, null grid, automatic operation selection or silent Helmert fallback. Export is blocked outside grid coverage. All source inputs must be full GK4 metres; header units other than metre/unspecified block export. Unspecified units require acknowledgement. Output is metre-based DXF R2018 without leading zone number.

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

Unsupported or ambiguous geometry blocks the **entire DXF export**, including XREF/proxies/ACIS solids, recursive/dynamic/XCLIP/nonuniform/mirrored blocks, tilted text/hatches, gradient hatches, physical polyline widths, nonzero thickness and malformed input. Blocker reports contain source handles/layers. No partial-export switch exists. Export requires an explicit acknowledgement of these limitations and suitability checks.

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

Display: `YY.MM.feature.fix` → `26.09.1.0`. npm: `26.9.1`.

## License

MIT for original app code. Third-party licenses and grid provenance: `public/THIRD-PARTY-NOTICES.txt`.
