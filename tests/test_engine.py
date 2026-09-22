import io
import sys
from pathlib import Path
import math
import pytest
import ezdxf
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "public"))
from engine import process_file, demo_file, inspect_grid, make_transform

GRID = str(ROOT / "public/grids/BETA2007.gsb")
X, Y = 4468000, 5335000


def convert(tmp_path, draw, units=6):
    doc = ezdxf.new("R2018")
    doc.units = units
    draw(doc, doc.modelspace())
    filename = tmp_path / "input.dxf"
    doc.saveas(filename)
    r, out = process_file(str(filename), GRID)
    return r, ezdxf.read(io.StringIO(out)) if out else None


def test_demo(tmp_path):
    file = tmp_path / "demo.dxf"
    demo_file(file)
    r, out = process_file(str(file), GRID)
    assert r["blockers"] == []
    result = ezdxf.read(io.StringIO(out))
    assert result.units == 6
    assert not result.audit().errors
    assert not list(result.modelspace().query("INSERT CIRCLE ARC"))
    point = list(result.modelspace().query("POINT"))[0]
    assert point.dxf.location.z == 512.345
    assert point.dxf.location.x == pytest.approx(691026.107722843, abs=.0001)
    assert point.dxf.location.y == pytest.approx(5336409.329898657, abs=.0001)


@pytest.mark.parametrize("x,y", [(X,Y), (4500000,5300000), (4450000,5400000), (4400000,5350000)])
def test_independent_crs_construction(x, y):
    # Separate CRS API with explicit bound-source grid instead of the engine pipeline.
    source = f"+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +nadgrids={GRID} +units=m +type=crs"
    other = Transformer.from_crs(source, "EPSG:25832", always_xy=True)
    assert make_transform(GRID).transform(x,y) == pytest.approx(other.transform(x,y), abs=.0001)


def test_broad_geometry(tmp_path):
    def draw(doc,m):
        m.add_line((X,Y,12),(X+12,Y+25,13))
        m.add_lwpolyline([(X,Y,0,0,.5),(X+10,Y+10,0,0,0)],format="xyseb")
        m.add_polyline3d([(X,Y,10),(X+5,Y+8,20)])
        m.add_ellipse((X+30,Y+30), major_axis=(15,5), ratio=.5)
        m.add_spline([(X,Y,2),(X+5,Y+20,3),(X+40,Y+40,2)])
        m.add_3dface([(X,Y,5),(X+2,Y,5),(X+2,Y+2,6),(X,Y+2,5)])
        m.add_solid([(X,Y),(X+10,Y),(X,Y+10)])
        m.add_mtext("Text\\PZeile 2",dxfattribs={"insert":(X+50,Y+50),"char_height":2})
        h=m.add_hatch()
        h.paths.add_polyline_path([(X,Y),(X+10,Y),(X+10,Y+10),(X,Y+10)],is_closed=True)
        m.add_text("Test",dxfattribs={"insert":(X,Y),"height":2,"rotation":45})
        mesh=m.add_mesh()
        with mesh.edit_data() as data:
            data.vertices=[(X,Y,1),(X+5,Y,2),(X,Y+5,3)]
            data.faces=[(0,1,2)]
    r,out=convert(tmp_path,draw)
    assert not r["blockers"], r["blockers"]
    assert out is not None
    assert not out.audit().errors
    assert len(out.modelspace()) == 11
    assert len(list(out.modelspace().query("HATCH"))) == 1


def test_nested_block_and_attribute(tmp_path):
    def draw(doc,m):
        doc.layers.new("Survey",dxfattribs={"color":1})
        a=doc.blocks.new("A")
        a.add_point((2,3,4),dxfattribs={"color":0})
        b=doc.blocks.new("B")
        b.add_blockref("A",(10,20),dxfattribs={"color":0})
        insert=m.add_blockref("B",(X,Y),dxfattribs={"layer":"Survey","color":3,"rotation":90})
        insert.add_attrib("P","1",(X,Y),dxfattribs={"height":2})
    r,out=convert(tmp_path,draw)
    assert not r["blockers"],r["blockers"]
    point=list(out.modelspace().query("POINT"))[0]
    target=make_transform(GRID).transform(X-23,Y+12)
    assert tuple(point.dxf.location)[:2] == pytest.approx(target,abs=.00001)
    assert point.dxf.location.z == 4
    assert point.dxf.layer == "Survey"
    assert point.dxf.color == 3
    assert len(list(out.modelspace().query("TEXT")))==1


def test_dimension(tmp_path):
    def draw(doc,m):
        d=m.add_linear_dim(base=(X,Y+10),p1=(X,Y),p2=(X+20,Y))
        d.render()
    r,out=convert(tmp_path,draw)
    assert not r["blockers"],r["blockers"]
    assert r["warnings"]["dimensions"] == 1
    assert not list(out.modelspace().query("DIMENSION INSERT"))


@pytest.mark.parametrize("case",["wrong_coords","swapped","utm","wide","nonuniform","unsupported","xref","thickness"])
def test_fail_closed(tmp_path,case):
    def draw(doc,m):
        m.add_point((X,Y,7))
        if case=="wrong_coords":m.add_point((10,20))
        if case=="swapped":m.add_point((Y,X))
        if case=="utm":m.add_point((691026,5336409))
        if case=="wide":m.add_lwpolyline([(X,Y),(X+10,Y)],dxfattribs={"const_width":2})
        if case=="nonuniform":
            doc.blocks.new("BAD").add_point((0,0))
            m.add_blockref("BAD",(X,Y),dxfattribs={"xscale":2})
        if case=="unsupported":m.add_ray((X,Y),(1,0))
        if case=="xref":
            doc.add_xref_def("absent.dxf","XREF")
            m.add_blockref("XREF",(X,Y))
        if case=="thickness":m.add_circle((X,Y),10,dxfattribs={"thickness":2})
    r,out=convert(tmp_path,draw)
    assert r["blockers"]
    assert out is None


def test_units_reject_and_unknown(tmp_path):
    r,out=convert(tmp_path,lambda d,m:m.add_point((X,Y)),units=4)
    assert out is None and any(i["type"]=="UNITS" for i in r["blockers"])
    r,out=convert(tmp_path,lambda d,m:m.add_point((X,Y)),units=0)
    assert out is not None and r["warnings"]["units"]==1


def test_invalid_grid(tmp_path):
    p=tmp_path/"invalid.gsb"
    p.write_bytes(b"not a grid")
    with pytest.raises(ValueError):inspect_grid(str(p))
    data=bytearray(Path(GRID).read_bytes())
    data[120:128]=b"\0"*8
    p.write_bytes(data)
    with pytest.raises(ValueError):inspect_grid(str(p))


def test_no_outside_fallback():
    with pytest.raises(Exception):make_transform(GRID).transform(4500000,8000000,errcheck=True)


def test_paper_space_omitted(tmp_path):
    def draw(doc,m):
        m.add_point((X,Y))
        doc.layout().add_line((0,0),(1,1))
    r,out=convert(tmp_path,draw)
    assert r["warnings"]["paperspace"]==1
    assert len(out.modelspace())==1
    assert len(out.layout())==0


def test_closed_bulge_z(tmp_path):
    def draw(doc,m):
        m.add_lwpolyline([(X,Y,1),(X+10,Y,0),(X+10,Y+10,0)],format="xyb",close=True,dxfattribs={"elevation":32.5})
    r,out=convert(tmp_path,draw)
    assert not r["blockers"]
    poly=list(out.modelspace())[0]
    assert poly.is_closed
    assert all(v.dxf.location.z == 32.5 for v in poly.vertices)


def test_text_rotation(tmp_path):
    r,out=convert(tmp_path,lambda d,m:m.add_text("A",dxfattribs={"insert":(X,Y,2),"height":3,"rotation":0}))
    assert not r["blockers"]
    text=list(out.modelspace())[0]
    assert 1 < text.dxf.rotation < 4
    assert text.dxf.insert.z==2
    assert text.dxf.height==pytest.approx(3,abs=.01)


def test_block_attribute_definitions(tmp_path):
    def draw(doc,m):
        b=doc.blocks.new("Symbol")
        b.add_circle((0,0),1)
        b.add_attdef("ID",(2,0),height=1)
        m.add_blockref("Symbol",(X,Y)).add_auto_attribs({"ID":"P123"})
    r,out=convert(tmp_path,draw)
    assert not r["blockers"],r["blockers"]
    assert list(out.modelspace().query("TEXT"))[0].dxf.text=="P123"


def test_pattern_hatch_hole_and_edges(tmp_path):
    def draw(doc,m):
        h=m.add_hatch()
        h.set_pattern_fill("ANSI31",scale=2,angle=25)
        h.paths.add_polyline_path([(X,Y),(X+30,Y),(X+30,Y+30),(X,Y+30)],is_closed=True,flags=1)
        edge=h.paths.add_edge_path(flags=0)
        edge.add_arc((X+15,Y+15),5,0,360)
        h.dxf.elevation=(0,0,7)
    r,out=convert(tmp_path,draw)
    assert not r["blockers"],r["blockers"]
    h=list(out.modelspace().query("HATCH"))[0]
    assert len(h.paths)==2 and h.dxf.elevation.z==7
    assert h.dxf.pattern_name=="ANSI31"
    assert h.paths[0].path_type_flags & 1
    assert not h.paths[1].path_type_flags & 1


def test_polyface_and_polymesh(tmp_path):
    def draw(doc,m):
        face=m.add_polyface()
        face.append_face([(X,Y,2),(X+2,Y,3),(X,Y+2,4)])
        mesh=m.add_polymesh((2,2))
        for i in range(2):
            for j in range(2):mesh.set_mesh_vertex((i,j),(X+i,Y+j,i+j))
    r,out=convert(tmp_path,draw)
    assert not r["blockers"],r["blockers"]
    assert len(out.modelspace())==2


@pytest.mark.parametrize("fmt",["asc","bin"])
def test_r12_encoding(tmp_path,fmt):
    doc=ezdxf.new("R12")
    doc.modelspace().add_point((X,Y,8))
    doc.modelspace().add_text("München",dxfattribs={"insert":(X,Y),"height":3})
    file=tmp_path/"input.dxf"
    doc.saveas(file,fmt=fmt)
    r,output=process_file(str(file),GRID)
    assert not r["blockers"],r["blockers"]
    assert "München" in output
