"""Generate synthetic, non-private browser QA fixtures in a chosen directory."""
import sys
from pathlib import Path
import ezdxf

directory = Path(sys.argv[1])
directory.mkdir(parents=True, exist_ok=True)
doc = ezdxf.new("R2018")
doc.units = 6
doc.layers.new("Survey")
doc.layers.new("Outline")
m = doc.modelspace()
x,y = 4468000,5335000
for i in range(20):
    m.add_point((x+(i%5)*20,y+(i//5)*20,512), dxfattribs={"layer":"Survey"})
m.add_lwpolyline([(x,y),(x+100,y),(x+100,y+80),(x,y+80)],close=True,dxfattribs={"layer":"Outline"})
m.add_polyline3d([(-.5,-.5,0),(.5,.5,0)])
m.add_polyline3d([(0,0,0),(0,1,0)])
m.add_polyline3d([(0,0,0),(1,0,0)])
doc.saveas(directory / "synthetic-outliers.dxf")
print(directory / "synthetic-outliers.dxf")
