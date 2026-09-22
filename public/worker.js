/* CAD files remain in this worker's in-memory filesystem. No upload endpoint. */
let runtime;
let result;
let loaded = false;
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
  py.FS.writeFile(
    "/home/pyodide/preflight.py",
    await fetchBytes("/preflight.py"),
  );
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
      if (result.report.requiresConfirmation && data.confirmOmissions !== true)
        throw new Error("Confirm the omitted objects before exporting.");
      postMessage({ type: "export", output: result.output });
      return;
    }
    result = undefined;
    const py = await init();
    if (data.type === "inspect" || data.type === "reinspect") {
      status("inspecting");
      if (data.type === "inspect") {
        loaded = false;
        py.runPython("_source = None\n_audit = None\nimport gc\ngc.collect()");
        if (data.demo) py.runPython('demo_file("/input.dxf")');
        else {
          if (!data.file || data.file.byteLength > 25 * 1024 * 1024)
            throw new Error("DXF limit: 25 MB.");
          py.FS.writeFile("/input.dxf", new Uint8Array(data.file));
        }
        py.runPython('_source, _audit = read_document("/input.dxf")');
        py.FS.unlink("/input.dxf");
      } else if (!loaded) throw new Error("Select and inspect a DXF first.");
      py.globals.set("cluster_distance", data.distance ?? 1000);
      const inventory = JSON.parse(
        py.runPython(
          "json.dumps(inspect_document(_source, _audit, cluster_distance), allow_nan=False)",
        ),
      );
      loaded = true;
      postMessage({ type: "inventory", inventory });
      return;
    }
    if (!loaded) throw new Error("Select and inspect a DXF first.");
    status("processing");
    const grid = data.grid ? "/custom.gsb" : "/BETA2007.gsb";
    if (data.grid) {
      if (data.grid.byteLength > 256 * 1024 * 1024)
        throw new Error("Grid limit: 256 MB. Use a regional extract.");
      py.FS.writeFile(grid, new Uint8Array(data.grid));
    }
    py.globals.set("grid_path", grid);
    py.globals.set("curve_tolerance", data.tolerance);
    py.globals.set("selection_json", JSON.stringify(data.selection ?? {}));
    const json = py.runPython(
      "report, output = process_document(_source, grid_path, curve_tolerance, json.loads(selection_json), _audit)\njson.dumps(report, allow_nan=False)",
    );
    const report = JSON.parse(json);
    result = { report, output: py.globals.get("output") };
    if (data.grid) py.FS.unlink("/custom.gsb");
    py.runPython("report = None\noutput = None\nimport gc\ngc.collect()");
    postMessage({ type: "result", report });
  } catch (error) {
    if (data.type !== "export") result = undefined;
    postMessage({ type: "error", message: String(error?.message || error) });
  }
};
