import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialSelection,
  selectedEntries,
  groupKey,
} from "../src/selection.ts";

const inventory = {
  clusters: [{ id: "main" }, { id: "remote" }],
  entries: [
    { id: "e0", cluster: "main", type: "POINT", layer: "survey" },
    { id: "e1", cluster: "main", type: "POLYLINE", layer: "survey" },
    { id: "e2", cluster: "remote", type: "LINE", layer: "other" },
    { id: "e3", cluster: null, type: "CUSTOM", layer: "unknown" },
  ],
};
test("initial selection never silently removes suspicious or unlocated objects", () => {
  assert.equal(
    selectedEntries(inventory, initialSelection(inventory)).length,
    4,
  );
});
test("POINT filter preserves polyline vertices by selecting whole objects", () => {
  assert.deepEqual(
    selectedEntries(inventory, {
      ...initialSelection(inventory),
      excludePoints: true,
    }).map((e) => e.id),
    ["e1", "e2", "e3"],
  );
});
test("cluster, group and object filters compose as an intersection", () => {
  const selection = {
    ...initialSelection(inventory),
    clusters: ["main"],
    excludedIds: ["e1"],
  };
  assert.deepEqual(
    selectedEntries(inventory, selection).map((e) => e.id),
    ["e0"],
  );
  selection.excludedGroups = [groupKey("survey", "POINT")];
  assert.equal(selectedEntries(inventory, selection).length, 0);
});
test("group identifiers cannot collide with layer delimiters", () => {
  assert.notEqual(groupKey("a|b", "c"), groupKey("a", "b|c"));
});
