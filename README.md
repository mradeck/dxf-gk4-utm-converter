# DXF Coordinate Forge

[Open app](https://dxf-coordinate-forge.netlify.app/) · [Public source](https://github.com/mradeck/dxf-gk4-utm-converter)

Local-first browser SPA: DXF model space between **DHDN / GK4 (EPSG:31468)** and **ETRS89 / UTM32N (EPSG:25832)**, in both directions; the direction is detected from the coordinates. Fixed X=easting, Y=northing in metres; Z unchanged. German/English UI, dark/light theme, automatic preflight on loading, selection, reported partial exports and actual DXF geometry over an OpenStreetMap background.

## Run

```sh
npm ci
npm run dev
npm run build
```

Static Netlify deployment uses `dist/`. No server-side CAD processing, API keys or uploads. Pyodide 0.27.7 and its compiled scientific packages are downloaded from jsDelivr on first conversion; ezdxf 1.4.4 and BeTA2007 are shipped with the app. Internet is required for initial runtime loading. A worker keeps heavy operations off the UI thread; Cancel terminates it.

## Geodesy

Explicit PROJ pipelines: GK4 → UTM is inverse GK4/Bessel projection → NTv2 horizontal shift → UTM32/GRS80; UTM → GK4 runs the same steps in reverse, applying the NTv2 grid inversely (PROJ iterates the inverse shift). A GK4 → UTM → GK4 round trip reproduces the input below 1 µm. Never use an optional grid, null grid, automatic operation selection or silent Helmert fallback. Objects outside grid coverage are omitted and listed in the report. Source inputs must be full metres: GK4 with zone prefix 4 (easting 4.0–5.0 million) or UTM32 without zone prefix (easting 0.1–1.0 million), northing 5.0–6.2 million. As in Geodata Inspector, DXF carries no CRS metadata, so the direction follows the coordinate range of the majority of objects; it can be overridden in the preflight, and objects in the other system are flagged. Header units other than metre/unspecified block export; unspecified units are reported. Output is metre-based DXF R2018 or, on request, R2000 (AutoCAD 2000) for older software; for R2000, true colours are mapped to the nearest AutoCAD colour index, transparency is dropped and MESH entities are omitted with a note because R2000 cannot store them. UTM output has no leading zone number, GK4 output keeps prefix 4.

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

Unsupported or ambiguous geometry is **omitted per top-level source object**, including XREF/proxies/ACIS solids, recursive/dynamic/XCLIP/nonuniform/mirrored blocks, tilted text/hatches, gradient hatches, physical polyline widths and nonzero thickness. Per-object staging rolls back partial block/hatch geometry and preview bounds on failure. The full report lists omitted source handles, layers and reasons; limitations and omissions are shown before download, without extra confirmation clicks, because the export is always a new file. No original is overwritten.

Fatal errors still prevent export: unreadable files, invalid grids, incompatible drawing units, no remaining geometry and a failing output structural audit. Source DXF recovery/audit repairs are reported because they may remove content before inventory.

## Workflow

The interface guides four numbered steps in reading order; a step bar with a “next step” hint shows the current state and links to each panel:

1. **Choose & inspect a drawing** – drop a DXF (or use the sample); the preflight starts immediately.
2. **Preflight & selection** – review the preselection (everything is selected by default).
3. **Set the transformation** – BeTA2007 is bundled; optionally choose a custom NTv2 `.gsb`, then click *Transform selection*.
4. **Check result & download** – inspect the map/drawing preview and download the DXF and report.

## Preflight and cleanup

1. Read the DXF locally, detect GK4 or UTM32 and inspect model-space objects **before transformation**.
2. Review counts, spatial groups and implausible coordinates. Keep all by default; optionally exclude standalone POINTs, groups, layer/type combinations or individual objects. POINT filtering also applies inside decomposed blocks, without removing polyline/mesh vertices.
3. Transform the selection. Review omissions and download a new DXF plus a complete JSON inspection report.

Spatial policy is based on [Geodata Inspector & Cleaner](https://github.com/mradeck/geodata-inspector-cleaner/tree/e4a2721de903b5aedca6be469d8d51ff4a51621e): transitive object-centre clustering (default 1,000 m), a 60% main-area threshold, extent-inflation hints and no automatic deletion. The single cluster plausible in the source system is preferred as a main-area candidate; otherwise the largest cluster is used. Equally weighted groups remain ambiguous. Blocks/text use approximate anchors; this is a review aid, not proof of validity. Z=0 is only flagged alongside materially elevated geometry. INSERTs of QGIS symbol blocks (`symbolLayer<n>`, written by a QGIS DXF export with symbology) are flagged with their marker size; their size follows the symbology scale, not the drawing. They can be converted to POINTs at their insertion point (Z, layer and colour kept; circle/fill dropped; the POINT filter applies) or excluded in one click; re-exporting from QGIS with “No symbology” keeps points as POINT objects. Exact duplicates follow the Geodata Inspector policy (`src/duplicates/dxfDuplicates.ts`): numerically exact comparison of the entity’s DXF tags including Z, properties and all vertices, ignoring only handles (owner references canonicalized); groups are split into same-layer and cross-layer matches, A is the first object found and B a further copy. Every copy B is left out of the export by default (A stays; the loaded file is never changed); one button keeps the duplicates after all, and the individual object list shows each finding. Spatial hashing avoids quadratic work for dense point sets; exhausting the cross-cell comparison budget conservatively merges neighbours and disables outlier recommendations.

The schematic preflight view shows up to 1,000 bounds/anchors for the focused group. The transformed DXF map shows up to 1,500 sampled geometries with handles/layers on hover, drawn in their effective DXF colour (object true colour, else ACI, else layer colour; ACI 7/white as foreground). Light colours get a dark outline on the map. Preview simplification **does not remove export objects**. OSM tiles load by default together with the transformed preview and disclose the visible map area/IP to the provider; the DXF itself stays local, and the background can be switched off. Text glyphs, hatch fills and exact CAD symbology are not rendered.

Limits: 25 MB DXF, 256 MB NTv2, 200,000 expanded entities, 1,000,000 coordinate evaluations. Full multi-GB BY-KanU files need a smaller regional extract and professional validation. Custom NTv2 headers/ellipsoids/direction are checked, but this does not certify their datum realization, licensing or quality.

## Tests

```sh
python3 -m venv .venv
.venv/bin/pip install ezdxf==1.4.4 pyproj==3.7.2 pytest
.venv/bin/pytest tests -q
npm test
```

GitHub Actions (`.github/workflows/tests.yml`) runs the build, the Python tests and the Node/WebAssembly tests on every pull request and on pushes to `main`; it uploads no artifacts. Runtime tests exercise the same engine in actual Pyodide/WebAssembly. Native tests inspect exported DXF structures, coordinates, height preservation and safety failures. User-specific AutoCAD Map 3D comparison still requires an original/transformed sample pair. Always check independent known control points before production use.

## Versioning

Display: `YY.MM.feature.fix` → `26.09.13.0`. npm: `26.9.13`.

## License

MIT for original app code. Third-party licenses and grid provenance: `public/THIRD-PARTY-NOTICES.txt`.
