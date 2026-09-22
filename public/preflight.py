"""Read-only inventory and spatial review before reprojection.

Cluster policy follows mradeck/geodata-inspector-cleaner (e4a2721):
1 km connectivity, bounds-centre representatives, >=60% dominance.
Recommendations never remove anything without a user selection.
"""
import math
from collections import Counter, defaultdict
from statistics import median
import numpy as np
import ezdxf
from ezdxf import bbox, recover
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


def inspect_document(source, audit=None, distance=1000):
    if not math.isfinite(distance) or not 1 <= distance <= 100000:
        raise ValueError("Cluster distance must be between 1 and 100,000 metres.")
    entries = []
    for i, e in enumerate(source.modelspace()):
        if i >= 200000:
            raise ValueError("Preflight limit: 200,000 model-space objects. Split the drawing first.")
        row = {"id": f"e{i}", "handle": e.dxf.get("handle", "—"), "type": e.dxftype(), "layer": e.dxf.get("layer", "0"),
               "bounds": None, "vertices": 0, "cluster": None, "plausible": False, "reason": "", "approximate": False,
               "zeroZ": False, "medianZ": None}
        try:
            row.update(spatial_stats(e))
            b = row["bounds"]
            row["plausible"] = 4_000_000 <= b[0] <= b[2] <= 5_000_000 and 5_000_000 <= b[1] <= b[3] <= 6_200_000
            if not row["plausible"]:
                row["reason"] = "Outside plausible full GK4 metre range; review CRS / location."
        except Exception as error:
            row["reason"] = str(error)
        entries.append(row)
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
            "audit": audit or {"recovered": False, "errors": 0, "repairs": 0, "findings": []}}
