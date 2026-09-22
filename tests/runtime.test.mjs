import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadPyodide } from "pyodide";
import proj4 from "proj4";

test(
  "actual WebAssembly CAD and PROJ runtime",
  { timeout: 180000 },
  async () => {
    const py = await loadPyodide();
    await py.loadPackage([
      "numpy",
      "pyproj",
      "pyparsing",
      "fonttools",
      "typing-extensions",
    ]);
    py.unpackArchive(
      new Uint8Array(
        await readFile(
          new URL(
            "../public/vendor/ezdxf-1.4.4-py3-none-any.whl",
            import.meta.url,
          ),
        ),
      ),
      "zip",
      { extractDir: "/home/pyodide" },
    );
    py.FS.writeFile(
      "/BETA2007.gsb",
      await readFile(new URL("../public/grids/BETA2007.gsb", import.meta.url)),
    );
    py.FS.writeFile(
      "/home/pyodide/preflight.py",
      await readFile(new URL("../public/preflight.py", import.meta.url)),
    );
    py.runPython(
      await readFile(new URL("../public/engine.py", import.meta.url), "utf8"),
    );
    const report = JSON.parse(
      py.runPython(
        'demo_file("/demo.dxf")\nr, out = process_file("/demo.dxf", "/BETA2007.gsb")\njson.dumps(r)',
      ),
    );
    assert.deepEqual(report.blockers, []);
    assert.equal(report.outputEntities, 8);
    assert.equal(report.requiresConfirmation, false);
    const partial = JSON.parse(
      py.runPython(`
source, audit = read_document("/demo.dxf")
source.modelspace().add_point((0,0))
inventory = inspect_document(source, audit)
partial, partial_out = process_document(source, "/BETA2007.gsb", audit=audit)
json.dumps({"inventory": inventory, "report": partial, "valid": not ezdxf.read(io.StringIO(partial_out)).audit().errors})
`),
    );
    assert.equal(partial.inventory.clusters.length, 2);
    assert.equal(partial.report.omitted.length, 1);
    assert.equal(partial.report.requiresConfirmation, true);
    assert.equal(partial.report.outputEntities, 8);
    assert.ok(partial.valid);
    assert.ok(partial.report.geographicPreview.length);
    assert.ok(
      Math.abs(report.samples[0].target[0] - 691026.107722843) < 0.0001,
    );
    assert.ok(
      Math.abs(report.samples[0].target[1] - 5336409.329898657) < 0.0001,
    );
    assert.ok(py.runPython("len(out)") > 20000);
    assert.equal(
      py.runPython(
        'ezdxf.read(io.StringIO(out)).modelspace().query("POINT")[0].dxf.location.z',
      ),
      512.345,
    );
    const grid = new Uint8Array(
      await readFile(new URL("../public/grids/BETA2007.gsb", import.meta.url)),
    );
    proj4.nadgrid("beta-test", grid.buffer);
    const from =
      "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +nadgrids=beta-test +units=m";
    const to = "+proj=utm +zone=32 +ellps=GRS80 +units=m";
    for (const point of [
      [4468000, 5335000],
      [4500000, 5300000],
      [4450000, 5400000],
      [4400000, 5350000],
    ]) {
      py.globals.set("test_x", point[0]);
      py.globals.set("test_y", point[1]);
      const actual = JSON.parse(
        py.runPython(
          'json.dumps(make_transform("/BETA2007.gsb").transform(test_x,test_y))',
        ),
      );
      const independent = proj4(from, to, point);
      assert.ok(
        Math.hypot(actual[0] - independent[0], actual[1] - independent[1]) <
          0.001,
        "independent Proj4js agrees within 1 mm",
      );
    }
  },
);
