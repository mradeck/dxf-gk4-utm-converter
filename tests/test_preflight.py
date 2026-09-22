import io
import sys
from pathlib import Path
import time
import ezdxf
import pytest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "public"))
from preflight import inspect_document, cluster_entries
from engine import process_document, Conversion

GRID = str(ROOT / "public/grids/BETA2007.gsb")
X, Y = 4468000, 5335000

def drawing():
    doc = ezdxf.new("R2018")
    doc.units = 6
    return doc, doc.modelspace()

def test_far_origin_objects_and_point_inventory():
    doc, m = drawing()
    for i in range(20): m.add_point((X+i,Y+i,500))
    m.add_polyline3d([(-.5,-.5,0),(.5,.5,0)])
    r = inspect_document(doc)
    assert r["total"] == 21 and r["pointCount"] == 20
    assert r["dominant"] and len(r["clusters"]) == 2
    assert r["clusters"][1]["suggestedOmit"]
    assert r["clusters"][1]["distance"] > 6e6
    assert r["inflation"] > 10000
    assert not r["entries"][-1]["plausible"]

def test_equal_clusters_do_not_recommend_removal():
    doc, m = drawing()
    for x in [X,X+5000]:
        for i in range(5): m.add_point((x+i,Y+i))
    r=inspect_document(doc)
    assert not r["dominant"]
    assert all(not c["suggestedOmit"] for c in r["clusters"])
    assert r["zeroZCount"] == 0

def test_transitive_connectivity_not_distance_to_first_point():
    doc,m=drawing()
    for i in range(10): m.add_point((X+900*i,Y))
    assert len(inspect_document(doc)["clusters"]) == 1

def test_dense_20000_points_not_quadratic():
    entries=[{"bounds":[X+i*.0001,Y,X+i*.0001,Y],"vertices":1,"type":"POINT","plausible":True} for i in range(20000)]
    start=time.monotonic()
    clusters,conservative=cluster_entries(entries,1000)
    assert time.monotonic()-start < 5
    assert len(clusters)==1 and not conservative

def test_filters_keep_line_vertices_and_source_unchanged():
    doc,m=drawing()
    m.add_point((X,Y,10))
    m.add_lwpolyline([(X,Y),(X+10,Y+20)])
    block=doc.blocks.new("MIXED")
    block.add_point((0,0))
    block.add_line((0,0),(5,10))
    m.add_blockref("MIXED",(X,Y))
    r,out=process_document(doc,GRID,options={"selectedIds":["e1","e2"],"excludePoints":True})
    result=ezdxf.read(io.StringIO(out))
    assert not result.modelspace().query("POINT")
    assert len(result.modelspace()) == 2
    assert r["selectedOmissions"] == 1
    assert r["warnings"]["nestedPoints"]==1
    assert r["requiresConfirmation"]
    assert len(m)==3 and len(block)==2
    all_r,all_out=process_document(doc,GRID)
    assert not all_r["requiresConfirmation"]
    assert len(ezdxf.read(io.StringIO(all_out)).modelspace())==4

def test_failed_block_is_atomic():
    doc,m=drawing()
    m.add_point((X,Y))
    block=doc.blocks.new("PARTIAL")
    block.add_line((0,0),(50,10))
    block.add_ray((0,0),(1,0))
    ref=m.add_blockref("PARTIAL",(X+100,Y+100))
    r,out=process_document(doc,GRID)
    assert len(ezdxf.read(io.StringIO(out)).modelspace())==1
    assert r["failedSources"]==1 and r["omitted"][0]["handle"]==ref.dxf.handle
    assert len(r["preview"])==1 and len(r["previewMeta"])==1
    assert r["sourceBounds"] == [X,Y,X,Y]

def test_move_failure_rolls_back_appended_entities(monkeypatch):
    from ezdxf.layouts import VirtualLayout
    doc,m=drawing()
    m.add_point((X,Y))
    m.add_line((X+100,Y),(X+200,Y))
    original=VirtualLayout.move_all_to_layout
    calls=0
    def fail_second(stage,target):
        nonlocal calls
        calls+=1
        original(stage,target)
        if calls==2: raise ValueError("Injected bind error")
    monkeypatch.setattr(VirtualLayout,"move_all_to_layout",fail_second)
    r,out=process_document(doc,GRID)
    assert len(ezdxf.read(io.StringIO(out)).modelspace())==1
    assert r["failedSources"]==1

def test_more_than_100_failures_do_not_hide_valid_tail():
    doc,m=drawing()
    for i in range(120): m.add_point((0,0))
    m.add_point((X,Y))
    r,out=process_document(doc,GRID)
    assert len(r["omitted"])==120 and r["successfulSources"]==1
    assert out and not r["blockers"]

@pytest.mark.parametrize("options",[{}, {"selectedIds":[]}])
def test_no_valid_geometry_still_blocks(options):
    doc,m=drawing()
    m.add_point((0,0))
    r,out=process_document(doc,GRID,options=options)
    assert out is None and r["blockers"]
    assert r["targetBounds"] is None

def test_audit_loss_requires_consent():
    doc,m=drawing()
    m.add_point((X,Y))
    r,out=process_document(doc,GRID,audit={"errors":0,"repairs":1,"recovered":False,"findings":[]})
    assert out and r["requiresConfirmation"]

def test_geographic_geometry_covers_preview_and_has_handles():
    doc,m=drawing()
    m.add_line((X,Y),(X+10,Y+20))
    r,_=process_document(doc,GRID)
    assert len(r["geographicPreview"])==len(r["preview"])
    assert r["previewMeta"][0]["handle"]
    for line in r["geographicPreview"]:
        for lon,lat in line:
            assert 10 < lon < 13 and 47 < lat < 50

@pytest.mark.parametrize("distance",[0,float("nan"),100001])
def test_bad_cluster_distance_rejected(distance):
    doc,_=drawing()
    with pytest.raises(ValueError): inspect_document(doc,distance=distance)
