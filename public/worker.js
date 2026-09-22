/* CAD files remain in this worker's in-memory filesystem. No upload endpoint. */
let runtime;
let result;
const status = (key) => postMessage({ type: "status", key });
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Download failed: ${url} (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}
async function init() {
  if (runtime) return runtime;
  status("runtime");
  importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");
  const py = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
  });
  status("libraries");
  await py.loadPackage([
    "micropip",
    "numpy",
    "pyproj",
    "pyparsing",
    "fonttools",
    "typing-extensions",
  ]);
  py.globals.set(
    "wheel_url",
    new URL("/vendor/ezdxf-1.4.4-py3-none-any.whl", self.location.href).href,
  );
  await py.runPythonAsync(
    "import micropip\nawait micropip.install(wheel_url, deps=False)",
  );
  py.FS.writeFile("/BETA2007.gsb", await fetchBytes("/grids/BETA2007.gsb"));
  const code = await fetch("/engine.py");
  if (!code.ok) throw new Error("Could not load CAD engine.");
  await py.runPythonAsync(await code.text());
  runtime = py;
  return py;
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "export") {
      if (!result?.output || result.report.blockers.length)
        throw new Error("No validated export.");
      postMessage({ type: "export", output: result.output });
      return;
    }
    result = undefined;
    const py = await init();
    status("processing");
    if (data.demo) py.runPython('demo_file("/input.dxf")');
    else {
      if (!data.file || data.file.byteLength > 25 * 1024 * 1024)
        throw new Error("DXF limit: 25 MB.");
      py.FS.writeFile("/input.dxf", new Uint8Array(data.file));
    }
    const grid = data.grid ? "/custom.gsb" : "/BETA2007.gsb";
    if (data.grid) {
      if (data.grid.byteLength > 256 * 1024 * 1024)
        throw new Error("Grid limit: 256 MB. Use a regional extract.");
      py.FS.writeFile(grid, new Uint8Array(data.grid));
    }
    py.globals.set("grid_path", grid);
    py.globals.set("curve_tolerance", data.tolerance);
    const json = py.runPython(
      'report, output = process_file("/input.dxf", grid_path, curve_tolerance)\njson.dumps(report, allow_nan=False)',
    );
    const report = JSON.parse(json);
    result = { report, output: py.globals.get("output") };
    py.FS.unlink("/input.dxf");
    if (data.grid) py.FS.unlink("/custom.gsb");
    py.runPython("report = None\noutput = None\nimport gc\ngc.collect()");
    postMessage({ type: "result", report });
  } catch (error) {
    result = undefined;
    postMessage({ type: "error", message: String(error?.message || error) });
  }
};
