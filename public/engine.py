"""Horizontal DXF transformation. Same engine runs in CPython tests and Pyodide.

Entity failures are omitted atomically and require explicit partial-export consent.
Export is a NEW model-space drawing, not a lossless CAD document migration.
"""
import io
import math
import json
import hashlib
import os
from collections import Counter
from itertools import islice
import ezdxf
from ezdxf import path, bbox
from ezdxf.math import Vec3, Matrix44
from ezdxf.addons import Importer
from ezdxf.explode import attrib_to_text
from ezdxf.layouts import VirtualLayout
from pyproj import Transformer, network
from preflight import read_document, inspect_document, issue

network.set_network_enabled(False)
VERSION = "26.09.2.0"
LIMIT = 1_000_000
SUPPORTED = {"POINT", "LINE", "LWPOLYLINE", "POLYLINE", "CIRCLE", "ARC", "ELLIPSE", "SPLINE", "3DFACE", "SOLID", "TRACE", "MESH", "TEXT", "MTEXT", "HATCH", "INSERT", "DIMENSION", "ARC_DIMENSION", "LARGE_RADIAL_DIMENSION", "MULTILEADER", "MLEADER"}


def make_transform(grid):
    # Explicit operation: NEVER fall back to a null grid or ballpark Helmert.
    grid = os.path.abspath(grid)
    return Transformer.from_pipeline(
        "+proj=pipeline +step +inv +proj=tmerc +lat_0=0 +lon_0=12 +k=1 "
        "+x_0=4500000 +y_0=0 +ellps=bessel +step +proj=hgridshift "
        f"+grids={grid} +step +proj=utm +zone=32 +ellps=GRS80"
    )


def inspect_grid(filename):
    """Validate NTv2 overview, ellipsoids and length before trusting a user grid."""
    import struct
    with open(filename, "rb") as f:
        data = f.read()
    if len(data) < 352 or data[:8].strip() != b"NUM_OREC":
        raise ValueError("Not a valid NTv2 .gsb grid.")
    endian = "<" if struct.unpack_from("<i", data, 8)[0] == 11 else ">"
    integer = lambda off: struct.unpack_from(endian + "i", data, off)[0]
    real = lambda off: struct.unpack_from(endian + "d", data, off)[0]
    if integer(8) != 11 or integer(24) != 11 or not 1 <= integer(40) <= 10000:
        raise ValueError("Unsupported NTv2 header.")
    if data[56:64].strip() != b"SECONDS":
        raise ValueError("NTv2 units must be SECONDS.")
    if abs(real(120)-6377397.155) > 0.1 or abs(real(136)-6356078.963) > 0.1 or abs(real(152)-6378137.0) > 0.1 or abs(real(168)-6356752.314) > 0.1:
        raise ValueError("Grid must transform Bessel / DHDN to GRS80 / ETRS89, in that direction.")
    pos = 176
    for _ in range(integer(40)):
        if pos + 176 > len(data):
            raise ValueError("Truncated NTv2 grid.")
        count = integer(pos + 168)
        if count < 4 or pos + 176 + count * 16 > len(data):
            raise ValueError("Invalid NTv2 node count.")
        pos += 176 + count * 16
    return {"from": data[88:96].decode("ascii", "replace").strip(), "to": data[104:112].decode("ascii", "replace").strip(), "subgrids": integer(40), "sha256": hashlib.sha256(data).hexdigest()}


class Conversion:
    def __init__(self, source, grid, tolerance=0.005, options=None, audit=None):
        if not math.isfinite(tolerance) or not 0.001 <= tolerance <= 0.1:
            raise ValueError("Tolerance must be 0.001–0.1 m.")
        self.source = source
        self.options = options or {}
        self.audit = audit or {"errors": 0, "repairs": 0, "recovered": False, "findings": []}
        self.tol = tolerance
        self.tr = make_transform(grid)
        self.geo = Transformer.from_crs(25832, 4326, always_xy=True)
        self.output = ezdxf.new("R2018")
        importer = Importer(source, self.output)
        importer.import_tables(["layers", "linetypes", "styles"])
        importer.finalize()
        self.msp = self.output.modelspace()
        self.warnings = Counter()
        self.blockers = []
        self.omitted = []
        self.preview_meta = []
        self.current_meta = {}
        self.successful_sources = 0
        self.failed_sources = 0
        self.selected_omissions = 0
        self.converted = Counter()
        self.preview = []
        self.samples = []
        self.count = 0
        self.entities = 0
        self.input_bounds = [math.inf, math.inf, -math.inf, -math.inf]
        self.output_bounds = [math.inf, math.inf, -math.inf, -math.inf]

    def point(self, point):
        p = Vec3(point)
        if not all(math.isfinite(v) for v in p):
            raise ValueError("Non-finite coordinate.")
        # Full GK4 easting required. Prevent swapped axes, local drawings, and UTM input.
        if not (4_000_000 <= p.x <= 5_000_000 and 5_000_000 <= p.y <= 6_200_000):
            raise ValueError("Coordinates do not look like full GK4 metres (X=Rechtswert, Y=Hochwert).")
        x, y = self.tr.transform(p.x, p.y, errcheck=True)
        if not math.isfinite(x + y):
            raise ValueError("Point outside transformation grid.")
        self.count += 1
        if self.count > LIMIT:
            raise ValueError("Limit of 1,000,000 coordinate evaluations exceeded; split the drawing.")
        for b, xx, yy in [(self.input_bounds, p.x, p.y), (self.output_bounds, x, y)]:
            b[0], b[1], b[2], b[3] = min(b[0], xx), min(b[1], yy), max(b[2], xx), max(b[3], yy)
        if len(self.samples) < 5:
            self.samples.append({"source": list(p), "target": [x, y, p.z]})
        return Vec3(x, y, p.z)

    def line_points(self, points):
        points = iter(points)
        first = next(points, None)
        if first is None:
            raise ValueError("Empty geometry.")
        a = Vec3(first)
        ta = self.point(a)
        result = [ta]

        def segment(a, b, ta, tb, depth=0):
            mid = a.lerp(b)
            tm = self.point(mid)
            deviation = (tm - ta.lerp(tb)).magnitude
            # Hard maximum segment also samples grid transitions, not just midpoints.
            if (b-a).magnitude > 20 or deviation > self.tol / 2:
                if depth >= 24:
                    raise ValueError("Subdivision limit reached.")
                segment(a, mid, ta, tm, depth+1)
                segment(mid, b, tm, tb, depth+1)
            else:
                result.append(tb)
        for point in points:
            b = Vec3(point)
            tb = self.point(b)
            segment(a, b, ta, tb)
            a, ta = b, tb
        return result

    def local_matrix(self, anchor):
        p = Vec3(anchor)
        q = self.point(p)
        # Symmetric numerical derivative avoids cancellation of million-metre coordinates.
        xp = self.point(p + Vec3(1, 0, 0))
        xm = self.point(p - Vec3(1, 0, 0))
        dx = (xp - xm) / 2
        scale = math.hypot(dx.x, dx.y)
        angle = math.atan2(dx.y, dx.x)
        return Matrix44.chain(Matrix44.translate(-p.x, -p.y, -p.z), Matrix44.scale(scale, scale, 1), Matrix44.z_rotate(angle), Matrix44.translate(q.x, q.y, p.z))

    def style(self, e):
        return {key: value for key, value in e.graphic_properties().items() if key in {"layer", "color", "true_color", "linetype", "lineweight", "ltscale", "invisible", "transparency"}}

    def clean(self, e):
        e.xdata = None
        e.appdata = None
        e.reactors = None
        e.extension_dict = None
        return e

    def display(self, points):
        # Bounded preview: never affects exported coordinates.
        if len(self.preview) < 1500:
            step = max(1, math.ceil(len(points) / 200))
            sampled = list(points[::step])
            if points and sampled[-1] != points[-1]:
                sampled.append(points[-1])
            self.preview.append([[p.x, p.y] for p in sampled])
            self.preview_meta.append(self.current_meta.copy())

    def poly(self, points, attrs, close=False):
        pts = self.line_points(points)
        self.msp.add_polyline3d(pts, close=close, dxfattribs=attrs)
        self.display(pts)

    def curve_points(self, p):
        points = list(islice(p.flattening(self.tol / 2, segments=8), LIMIT + 1))
        if len(points) > LIMIT:
            raise ValueError("Curve exceeds vertex budget.")
        return points

    def entity(self, entity, stack=(), inherited=None):
        self.entities += 1
        if self.entities > 200000:
            raise ValueError("Drawing exceeds entity budget.")
        e = entity.copy()
        typ = e.dxftype()
        if typ == "POINT" and self.options.get("excludePoints", False):
            self.warnings["nestedPoints"] += 1
            return
        if typ not in SUPPORTED:
            raise ValueError(f"Unsupported object: {typ}")
        if inherited:
            if e.dxf.layer == "0":
                e.dxf.layer = inherited.dxf.layer
            if e.dxf.get("color", 256) == 0:
                e.dxf.color = inherited.dxf.get("color", 256)
                if inherited.dxf.hasattr("true_color"):
                    e.dxf.true_color = inherited.dxf.true_color
            if e.dxf.get("linetype", "BYLAYER").upper() == "BYBLOCK":
                e.dxf.linetype = inherited.dxf.get("linetype", "BYLAYER")
        attrs = self.style(e)
        self.converted[typ] += 1
        if typ == "INSERT":
            name = e.dxf.name
            if name in stack or len(stack) >= 32:
                raise ValueError("Recursive block reference.")
            block = self.source.blocks.get(name)
            if block is None or block.block.is_xref or block.block.is_xref_overlay:
                raise ValueError("Unresolved block / external reference (XREF).")
            if e.has_extension_dict:
                raise ValueError("Block with extension dictionary (possibly XCLIP or dynamic block): flatten in CAD first.")
            scales = [e.dxf.get(k, 1) for k in ("xscale", "yscale", "zscale")]
            if min(scales) <= 0 or abs(scales[0]-scales[1]) > 1e-9 or not Vec3(e.dxf.extrusion).isclose(Vec3(0, 0, 1)):
                raise ValueError("Mirrored / non-uniformly scaled block: flatten in CAD first.")
            self.warnings["blocks"] += 1
            def skipped(child, reason):
                raise ValueError(f"Block child {child.dxftype()}: {reason}")
            inserts = e.multi_insert() if e.mcount > 1 else [e]
            for insert in inserts:
                for child in insert.virtual_entities(skipped_entity_callback=skipped):
                    self.entity(child, (*stack, name), e)
                for att in insert.attribs:
                    self.entity(attrib_to_text(att), stack, e)
            return
        if typ in {"DIMENSION", "ARC_DIMENSION", "LARGE_RADIAL_DIMENSION", "MULTILEADER", "MLEADER"}:
            self.warnings["dimensions"] += 1
            children = list(e.virtual_entities())
            if not children:
                raise ValueError("Annotation has no supported display geometry.")
            for child in children:
                self.entity(child, stack, e)
            return
        if e.xdata or e.has_extension_dict:
            self.warnings["metadata"] += 1
        if e.dxf.is_supported("thickness") and e.dxf.get("thickness", 0):
            raise ValueError("Extruded thickness: convert to explicit 3D faces first.")
        if typ == "POINT":
            q = self.point(e.dxf.location)
            e.dxf.location = q
            self.msp.add_entity(self.clean(e))
            self.display([q])
        elif typ == "LINE":
            pts = self.line_points([e.dxf.start, e.dxf.end])
            if len(pts) == 2:
                self.msp.add_line(*pts, dxfattribs=attrs)
            else:
                self.msp.add_polyline3d(pts, dxfattribs=attrs)
            self.display(pts)
        elif typ == "POLYLINE" and (e.is_poly_face_mesh or e.is_polygon_mesh):
            for v in e.vertices:
                if not v.is_face_record:
                    v.dxf.location = self.point(v.dxf.location)
            self.msp.add_entity(self.clean(e))
            self.warnings["faces"] += 1
        elif typ == "POLYLINE" and e.is_3d_polyline:
            if e.dxf.flags & 6:
                raise ValueError("Curve-fit 3D polyline requires CAD flattening.")
            pts = list(e.points())
            if e.is_closed and pts:
                pts.append(pts[0])
            self.poly(pts, attrs, e.is_closed)
        elif typ in {"LWPOLYLINE", "POLYLINE", "CIRCLE", "ARC", "ELLIPSE", "SPLINE"}:
            if typ == "LWPOLYLINE" and (e.dxf.get("const_width", 0) or any(p[2] or p[3] for p in e.get_points())):
                raise ValueError("Polyline with physical width: convert to outlines in CAD first.")
            if typ == "POLYLINE" and (e.dxf.flags & 6 or e.dxf.get("default_start_width", 0) or e.dxf.get("default_end_width", 0) or any(v.dxf.get("start_width", 0) or v.dxf.get("end_width", 0) for v in e.vertices)):
                raise ValueError("Curve-fit / wide polyline requires CAD flattening.")
            p = path.make_path(e)
            self.poly(self.curve_points(p), attrs, p.is_closed)
            self.warnings["curves"] += 1
        elif typ in {"TEXT", "MTEXT"}:
            if not Vec3(e.dxf.get("extrusion", (0, 0, 1))).isclose(Vec3(0, 0, 1)):
                raise ValueError("Tilted text: flatten in CAD first.")
            matrix = self.local_matrix(e.dxf.insert)
            extent = bbox.extents([e])
            if extent.has_data:
                for p in extent.rect_vertices():
                    if (self.point(p) - matrix.transform(p)).magnitude > self.tol:
                        raise ValueError("Text too large for local conformal approximation.")
            e.transform(matrix)
            self.msp.add_entity(self.clean(e))
            self.display([e.dxf.insert])
            self.warnings["text"] += 1
        elif typ == "3DFACE":
            pts = [self.point(e.dxf.get(f"vtx{i}")) for i in range(4)]
            for i, p in enumerate(pts):
                e.dxf.set(f"vtx{i}", p)
            self.msp.add_entity(self.clean(e))
            self.display(pts + pts[:1])
            self.warnings["faces"] += 1
        elif typ in {"SOLID", "TRACE"}:
            pts = [self.point(p) for p in e.wcs_vertices()]
            self.msp.add_3dface(pts, dxfattribs=attrs)
            self.display(pts + pts[:1])
            self.warnings["faces"] += 1
        elif typ == "MESH":
            e.vertices = [self.point(p) for p in e.vertices]
            self.msp.add_entity(self.clean(e))
            self.warnings["faces"] += 1
        elif typ == "HATCH":
            if not Vec3(e.dxf.extrusion).isclose(Vec3(0, 0, 1)):
                raise ValueError("Tilted hatch: flatten in CAD first.")
            if e.gradient is not None:
                raise ValueError("Gradient hatch: convert to solid hatch first.")
            boundaries = []
            for boundary in e.paths:
                p = path.from_hatch_boundary_path(boundary, e.ocs(), e.dxf.elevation.z)
                pts = self.line_points(self.curve_points(p))
                boundaries.append((pts, boundary.path_type_flags))
            if not boundaries:
                raise ValueError("Empty hatch boundary.")
            anchor = e.ocs().to_wcs(Vec3(e.paths[0].vertices[0][:2])) if hasattr(e.paths[0], "vertices") else path.from_hatch_boundary_path(e.paths[0], e.ocs(), e.dxf.elevation.z).start
            e.transform(self.local_matrix(anchor))
            e.paths.clear()
            e.dxf.associative = 0
            e.seeds = []
            for pts, flags in boundaries:
                e.paths.add_polyline_path([(p.x, p.y) for p in pts], is_closed=True, flags=flags)
                self.display(pts)
            self.msp.add_entity(self.clean(e))
            self.warnings["hatches"] += 1

    def run(self):
        if self.source.units not in (0, 6):
            self.blockers.append({"type": "UNITS", "handle": "HEADER", "layer": "—", "message": "$INSUNITS is not metres or unspecified. Rescale the source drawing first."})
        if self.source.units == 0:
            self.warnings["units"] += 1
        paper_count = sum(len(layout) for layout in self.source.layouts if layout.name != "Model")
        if paper_count:
            self.warnings["paperspace"] = paper_count
        selected = self.options.get("selectedIds")
        selected = set(selected) if selected is not None else None
        target = self.msp
        for index, e in enumerate(self.source.modelspace()):
            ident = f"e{index}"
            reason = None
            if selected is not None and ident not in selected:
                reason = "Deselected in preflight (group / layer / object selection)."
            elif self.options.get("excludePoints", False) and e.dxftype() == "POINT":
                reason = "POINT objects deselected before transformation."
            if reason:
                self.selected_omissions += 1
                self.omitted.append({**issue(e, reason), "id": ident, "category": "selection"})
                continue
            # Per-source staging prevents half-converted blocks, hatches or polylines.
            stage = VirtualLayout()
            self.msp = stage
            self.current_meta = {"id": ident, "handle": e.dxf.get("handle", "—"), "layer": e.dxf.layer, "type": e.dxftype()}
            preview_len, sample_len = len(self.preview), len(self.samples)
            saved_bounds = (self.input_bounds[:], self.output_bounds[:])
            saved_warnings, saved_counts = self.warnings.copy(), self.converted.copy()
            target_count, moving = len(target), False
            try:
                self.entity(e)
                moving = True
                stage.move_all_to_layout(target)
                self.successful_sources += 1
            except Exception as error:
                if moving:
                    for partial in list(islice(target, target_count, None)):
                        target.delete_entity(partial)
                self.failed_sources += 1
                self.omitted.append({**issue(e, error), "id": ident, "category": "conversion"})
                del self.preview[preview_len:]
                del self.preview_meta[preview_len:]
                del self.samples[sample_len:]
                self.input_bounds, self.output_bounds = saved_bounds
                self.warnings, self.converted = saved_warnings, saved_counts
            finally:
                self.msp = target
        if not len(self.msp):
            self.blockers.append({"type": "EMPTY", "handle": "—", "layer": "—", "message": "No exportable model-space geometry."})
        self.output.units = 6
        self.output.header["$MEASUREMENT"] = 1
        self.output.header["$INSBASE"] = (0, 0, 0)
        b = self.output_bounds
        if all(math.isfinite(v) for v in b):
            self.output.set_modelspace_vport(height=max(20, b[3]-b[1])*1.2, center=((b[0]+b[2])/2, (b[1]+b[3])/2))
        valid_bounds = all(math.isfinite(v) for v in b)
        requires_confirmation = bool(self.omitted or self.audit["errors"] or self.audit["repairs"] or self.audit["recovered"] or self.warnings.get("nestedPoints"))
        report = {"version": VERSION, "sourceCRS": "EPSG:31468", "targetCRS": "EPSG:25832", "axisOrder": "X=easting, Y=northing", "height": "Z unchanged; no vertical datum conversion", "toleranceMetres": self.tol, "counts": dict(Counter(e.dxftype() for e in self.source.modelspace())), "layers": [layer.dxf.name for layer in self.source.layers], "dxfVersion": self.source.dxfversion, "units": self.source.units, "blockers": self.blockers, "warnings": dict(self.warnings), "evaluations": self.count, "outputEntities": len(self.msp), "samples": self.samples, "sourceBounds": self.input_bounds if valid_bounds else None, "targetBounds": self.output_bounds if valid_bounds else None, "preview": self.preview, "supported": sorted(SUPPORTED),
                  "omitted": self.omitted, "audit": self.audit, "requiresConfirmation": requires_confirmation, "successfulSources": self.successful_sources, "failedSources": self.failed_sources, "selectedOmissions": self.selected_omissions, "previewMeta": self.preview_meta, "previewLimited": len(self.preview) >= 1500, "geographicPreview": []}
        if valid_bounds:
            corners = [self.geo.transform(x,y) for x in [b[0],b[2]] for y in [b[1],b[3]]]
            report["geographicBounds"] = [[min(p[0] for p in corners),min(p[1] for p in corners)], [max(p[0] for p in corners),max(p[1] for p in corners)]]
            report["geographicPreview"] = [[list(self.geo.transform(*p)) for p in line] for line in self.preview]
        return report


def process_document(source, grid, tolerance=0.005, options=None, audit=None):
    metadata = inspect_grid(grid)
    conversion = Conversion(source, grid, tolerance, options, audit)
    report = conversion.run()
    report["grid"] = metadata
    output = None
    if not report["blockers"]:
        audit = conversion.output.audit()
        if audit.errors or audit.fixes:
            report["blockers"].append({"type": "EXPORT_AUDIT", "handle": "—", "layer": "—", "message": "Export failed structural audit."})
        else:
            stream = io.StringIO()
            conversion.output.write(stream)
            output = stream.getvalue()
    return report, output


def process_file(filename, grid, tolerance=0.005, options=None):
    source, audit = read_document(filename)
    return process_document(source, grid, tolerance, options, audit)


def demo_file(filename):
    doc = ezdxf.new("R2018")
    doc.units = 6
    doc.layers.new("Grundstueck", dxfattribs={"color": 3})
    doc.layers.new("Gebaeude", dxfattribs={"color": 7})
    doc.layers.new("Vermessung", dxfattribs={"color": 1})
    m = doc.modelspace()
    x, y = 4468000, 5335000
    m.add_lwpolyline([(x, y), (x+160, y+15), (x+145, y+125), (x-20, y+100)], close=True, dxfattribs={"layer": "Grundstueck"})
    m.add_lwpolyline([(x+25, y+25), (x+100, y+25), (x+100, y+80), (x+25, y+80)], close=True, dxfattribs={"layer": "Gebaeude"})
    m.add_circle((x+120, y+90, 516.25), 8, dxfattribs={"layer": "Vermessung"})
    m.add_arc((x+45, y+85), 20, 0, 160)
    m.add_text("Demo · GK4", dxfattribs={"insert": (x+25, y+50), "height": 5})
    m.add_point((x, y, 512.345), dxfattribs={"layer": "Vermessung"})
    block = doc.blocks.new("Messpunkt")
    block.add_line((-2, 0), (2, 0))
    block.add_line((0, -2), (0, 2))
    m.add_blockref("Messpunkt", (x+145, y+125))
    doc.saveas(filename)
