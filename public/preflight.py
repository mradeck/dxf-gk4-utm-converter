"""Read-only inventory and spatial review before reprojection.

Cluster policy follows mradeck/geodata-inspector-cleaner (e4a2721):
1 km connectivity, bounds-centre representatives, >=60% dominance.
Recommendations never remove anything without a user selection.
"""
import math
import re
from collections import Counter, defaultdict
from statistics import median
import numpy as np
import ezdxf
from ezdxf import bbox, recover
from ezdxf.lldxf.tagwriter import TagCollector
from ezdxf.math import Vec3


def issue(entity, message, kind=None):
    return {"type": kind or entity.dxftype(), "handle": entity.dxf.get("handle", "—"),
            "layer": entity.dxf.get("layer", "—"), "message": str(message)}


def read_document(filename):
    recovered = False
    try:
        source = ezdxf.readfile(filename)
        auditor = source.audit()
    except (ezdxf.DXFStructureError, UnicodeDecodeError):
        source, auditor = recover.readfile(filename)
        recovered = True
    findings = []
    for entry in [*auditor.errors, *auditor.fixes]:
        entity = entry.entity
        findings.append({"type": "AUDIT", "handle": getattr(getattr(entity, "dxf", None), "handle", None) or "—",
                         "layer": getattr(getattr(entity, "dxf", None), "layer", "—"),
                         "message": str(entry.message), "code": int(entry.code)})
    return source, {"recovered": recovered, "errors": len(auditor.errors), "repairs": len(auditor.fixes), "findings": findings}


# QGIS "Save as DXF" with feature/symbol-layer symbology writes point markers as
# blocks named symbolLayer<n>, sized in map units by the chosen symbology scale.
QGIS_SYMBOL = re.compile(r"symbolLayer\d+")


# Full-coordinate ranges (metres) of the two supported systems do not overlap:
# GK4 eastings carry the zone prefix 4 (x_0 = 4,500,000), UTM32 eastings here
# are given without zone prefix. Northings cover Germany in both systems.
EASTING = {"gk4": (4_000_000, 5_000_000), "utm": (100_000, 1_000_000)}
NORTHING = (5_000_000, 6_200_000)
DIRECTIONS = {"gk4": "gk4-utm", "utm": "utm-gk4"}
LABELS = {"gk4": "full GK4 metres (X=Rechtswert with prefix 4, Y=Hochwert)", "utm": "UTM32 metres without zone prefix (X=easting, Y=northing)"}


def coordinate_system(b):
    for name, (low, high) in EASTING.items():
        if low <= b[0] <= b[2] <= high and NORTHING[0] <= b[1] <= b[3] <= NORTHING[1]:
            return name
    return None


def detect_system(entries, direction="auto"):
    """Range heuristic as in geodata-inspector-cleaner: no CRS metadata in DXF,
    so the coordinate ranges decide; a forced direction overrides detection."""
    counts = Counter(coordinate_system(e["bounds"]) for e in entries if e["bounds"])
    known = {k: counts.get(k, 0) for k in EASTING}
    if direction in DIRECTIONS.values():
        source, mode = next(k for k, v in DIRECTIONS.items() if v == direction), "manual"
    elif any(known.values()):
        source, mode = max(known, key=known.get), "detected"
    else:
        source, mode = None, "unknown"
    return {"source": source, "direction": DIRECTIONS.get(source), "mode": mode,
            "counts": {**known, "other": sum(counts.values()) - sum(known.values())},
            "mixed": all(known.values())}


def symbol_size(source, name, cache):
    if name not in cache:
        extent = bbox.extents(source.blocks.get(name) or [], fast=True)
        cache[name] = max(extent.size.x, extent.size.y) if extent.has_data else 0.0
    return cache[name]


def signature(tags, ignore_layer):
    # Policy of geodata-inspector-cleaner (dxfDuplicates.ts): handles are identity,
    # not content; internal owner references are canonicalized; everything else,
    # including Z, properties and vertex order, must match exactly.
    local = {}
    for code, value in tags:
        if code == 5:
            local[str(value).upper()] = f"local-{len(local)}"
    return tuple((code, local.get(str(value).upper(), value) if code == 330 else value)
                 for code, value in tags if code != 5 and not (ignore_layer and code == 8))


def find_duplicates(source, entries):
    """Exact duplicates among model-space objects; B is flagged, A is kept."""
    groups = defaultdict(list)
    for row, e in zip(entries, source.modelspace()):
        collector = TagCollector(dxfversion=source.dxfversion)
        e.export_dxf(collector)
        tags = [(t.code, t.value) for t in collector.tags]
        groups[signature(tags, True)].append((row, signature(tags, False)))
    counts = Counter()
    for members in groups.values():
        if len(members) < 2:
            continue
        exact, first = {}, None
        for row, key in members:
            keeper = exact.get(key)
            if keeper is None:
                exact[key] = row
                if first is None:
                    first = row
                    continue
                keeper, kind = first, "cross-layer"
            else:
                kind = "same-layer"
            row["duplicateOf"], row["duplicateKind"] = keeper["id"], kind
            counts[kind] += 1
            where = "same layer" if kind == "same-layer" else f"layer {keeper['layer']}"
            row["reason"] = row["reason"] or f"Exact duplicate of #{keeper['handle']} ({where})."
    return {"sameLayer": counts["same-layer"], "crossLayer": counts["cross-layer"]}


def spatial_stats(e):
    typ = e.dxftype()
    approximate = False
    if typ == "POINT":
        points = [Vec3(e.dxf.location)]
    elif typ == "LINE":
        points = [Vec3(e.dxf.start), Vec3(e.dxf.end)]
    elif typ == "LWPOLYLINE":
        points = list(e.vertices_in_wcs())
        approximate = e.has_arc
    elif typ == "POLYLINE":
        points = [Vec3(v.dxf.location) for v in e.vertices if not v.is_face_record]
        approximate = True
    elif typ in {"INSERT", "TEXT", "MTEXT", "ATTRIB", "ATTDEF"}:
        # Do not recursively explode blocks just to build an inventory.
        points = [Vec3(e.dxf.insert)]
        approximate = True
    elif typ in {"3DFACE", "SOLID", "TRACE"}:
        points = [Vec3(e.dxf.get(f"vtx{i}")) for i in range(4)]
    elif typ == "MESH":
        points = [Vec3(p) for p in e.vertices]
    else:
        bounds = bbox.extents([e], fast=True)
        if not bounds.has_data:
            raise ValueError("No spatial extent available; object needs review.")
        points = [bounds.extmin, bounds.extmax]
        approximate = True
    if not points or not all(math.isfinite(v) for p in points for v in p):
        raise ValueError("Empty or non-finite geometry.")
    b = [min(p.x for p in points), min(p.y for p in points), max(p.x for p in points), max(p.y for p in points)]
    return {"bounds": b, "vertices": len(points), "approximate": approximate,
            "zeroZ": all(abs(p.z) <= .001 for p in points), "medianZ": median(p.z for p in points)}


def merge_bounds(bounds):
    if not bounds:
        return None
    return [min(b[0] for b in bounds), min(b[1] for b in bounds), max(b[2] for b in bounds), max(b[3] for b in bounds)]


def cluster_entries(entries, distance):
    """Exact connectivity with cell cliques; bounded conservative fallback.

    Cell diagonal equals threshold: even 100k colocated points form one clique
    without pairwise comparisons. If the cross-cell comparison budget is
    exhausted, merge uncertain neighbours (false negatives, no false outliers).
    """
    size = distance / math.sqrt(2)
    cells = defaultdict(list)
    for e in entries:
        b = e["bounds"]
        if b:
            e["center"] = [(b[0]+b[2])/2, (b[1]+b[3])/2]
            cells[(math.floor(e["center"][0]/size), math.floor(e["center"][1]/size))].append(e)
    keys = sorted(cells)
    parent = {key: key for key in keys}
    def root(key):
        while parent[key] != key:
            parent[key] = parent[parent[key]]
            key = parent[key]
        return key
    def union(a, b):
        parent[root(a)] = root(b)
    arrays = {key: np.array([e["center"] for e in cells[key]]) for key in keys}
    budget = 10_000_000
    conservative = False
    for key in keys:
        a = arrays[key]
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                other = (key[0]+dx, key[1]+dy)
                if other <= key or other not in cells or root(key) == root(other):
                    continue
                b = arrays[other]
                gap = np.maximum(np.maximum(a.min(axis=0)-b.max(axis=0), b.min(axis=0)-a.max(axis=0)), 0)
                if np.dot(gap, gap) > distance**2:
                    continue
                linked = False
                short, long = (a, b) if len(a) <= len(b) else (b, a)
                for p in short:
                    if budget < len(long):
                        conservative = True
                        linked = True
                        break
                    budget -= len(long)
                    delta = long - p
                    if np.any(np.einsum('ij,ij->i', delta, delta) <= distance**2):
                        linked = True
                        break
                if linked:
                    union(key, other)
    groups = defaultdict(list)
    for key in keys:
        groups[root(key)].extend(cells[key])
    groups = sorted(groups.values(), key=lambda es: (-len(es), -sum(e["vertices"] for e in es)))
    clusters = []
    for i, members in enumerate(groups):
        ident = f"cluster-{i+1}"
        for e in members:
            e["cluster"] = ident
        clusters.append({"id": ident, "count": len(members), "points": sum(e["type"] == "POINT" for e in members),
                         "bounds": merge_bounds([e["bounds"] for e in members]), "distance": 0,
                         "plausible": all(e["plausible"] for e in members)})
    return clusters, conservative


def inspect_document(source, audit=None, distance=1000, direction="auto"):
    if not math.isfinite(distance) or not 1 <= distance <= 100000:
        raise ValueError("Cluster distance must be between 1 and 100,000 metres.")
    entries = []
    symbol_sizes, symbols = {}, Counter()
    for i, e in enumerate(source.modelspace()):
        if i >= 200000:
            raise ValueError("Preflight limit: 200,000 model-space objects. Split the drawing first.")
        row = {"id": f"e{i}", "handle": e.dxf.get("handle", "—"), "type": e.dxftype(), "layer": e.dxf.get("layer", "0"),
               "bounds": None, "vertices": 0, "cluster": None, "plausible": False, "reason": "", "approximate": False,
               "zeroZ": False, "medianZ": None}
        try:
            row.update(spatial_stats(e))
        except Exception as error:
            row["reason"] = str(error)
        if e.dxftype() == "INSERT" and QGIS_SYMBOL.fullmatch(e.dxf.name):
            size = symbol_size(source, e.dxf.name, symbol_sizes) * abs(e.dxf.get("xscale", 1))
            row["qgisSymbol"] = True
            symbols[e.dxf.name] += 1
            row["reason"] = row["reason"] or f"QGIS symbol block {e.dxf.name} (about {size:,.1f} m): marker from a symbology export, not drawing geometry."
        entries.append(row)
    crs = detect_system(entries, direction)
    for row in entries:
        if row["bounds"]:
            row["plausible"] = crs["source"] is not None and coordinate_system(row["bounds"]) == crs["source"]
            if not row["plausible"] and not row["reason"]:
                row["reason"] = f"Outside the {LABELS[crs['source']]} range; review CRS / location." if crs["source"] else "Neither GK4 nor UTM32 coordinate range; review CRS / location."
    duplicates = find_duplicates(source, entries)
    clusters, conservative = cluster_entries(entries, distance)
    plausible = [c for c in clusters if c["plausible"]]
    primary = plausible[0] if len(plausible) == 1 else (clusters[0] if clusters else None)
    ratio = primary["count"] / max(1, sum(c["count"] for c in clusters)) if primary else 0
    dominant = ratio >= .6 and not conservative
    full = merge_bounds([e["bounds"] for e in entries if e["bounds"]])
    focus = primary["bounds"] if primary else full
    extent = lambda b: max(b[2]-b[0], b[3]-b[1]) if b else 0
    for c in clusters:
        if primary:
            a, b = c["bounds"], primary["bounds"]
            c["distance"] = math.hypot(max(a[0]-b[2], b[0]-a[2], 0), max(a[1]-b[3], b[1]-a[3], 0))
        c["suggestedOmit"] = bool(dominant and c is not primary)
    heights = [e["medianZ"] for e in entries if not e["zeroZ"] and e["medianZ"] is not None and e["cluster"] == (primary or {}).get("id")]
    zero_warning = bool(heights and abs(median(heights)) >= 20)
    groups = Counter((e["layer"], e["type"]) for e in entries)
    return {"entries": entries, "clusters": clusters, "groups": [{"layer": layer, "type": typ, "count": count} for (layer, typ), count in sorted(groups.items())],
            "total": len(entries), "pointCount": sum(e["type"] == "POINT" for e in entries), "primary": primary["id"] if primary else None,
            "dominant": dominant, "ratio": ratio, "conservative": conservative, "distance": distance,
            "fullBounds": full, "focusBounds": focus, "inflation": extent(full)/extent(focus) if extent(focus) > 0 else None,
            "zeroZCount": sum(e["zeroZ"] and e["cluster"] == (primary or {}).get("id") for e in entries) if zero_warning else 0,
            "crs": crs,
            "duplicates": duplicates,
            "qgisSymbols": [{"block": name, "count": count, "size": symbol_sizes[name]} for name, count in sorted(symbols.items())],
            "audit": audit or {"recovered": False, "errors": 0, "repairs": 0, "findings": []}}
