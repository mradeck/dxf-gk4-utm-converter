import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("worker requires explicit partial-export confirmation, retains result after refusal", async () => {
  const messages = [];
  const context = vm.createContext({
    self: {},
    postMessage: (m) => messages.push(m),
  });
  vm.runInContext(
    await readFile(new URL("../public/worker.js", import.meta.url), "utf8"),
    context,
  );
  vm.runInContext(
    'result = {output:"DXF",report:{blockers:[],requiresConfirmation:true}}',
    context,
  );
  await context.self.onmessage({ data: { type: "export" } });
  assert.equal(messages.at(-1).type, "error");
  await context.self.onmessage({
    data: { type: "export", confirmOmissions: true },
  });
  assert.equal(messages.at(-1).type, "export");
  assert.equal(messages.at(-1).output, "DXF");
});
test("fatal blocker cannot be overridden by partial-export confirmation", async () => {
  const messages = [];
  const context = vm.createContext({
    self: {},
    postMessage: (m) => messages.push(m),
  });
  vm.runInContext(
    await readFile(new URL("../public/worker.js", import.meta.url), "utf8"),
    context,
  );
  vm.runInContext(
    'result = {output:"DXF",report:{blockers:[{type:"UNITS"}],requiresConfirmation:true}}',
    context,
  );
  await context.self.onmessage({
    data: { type: "export", confirmOmissions: true },
  });
  assert.equal(messages.at(-1).type, "error");
});
