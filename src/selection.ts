export type Entry = {
  id: string;
  handle: string;
  type: string;
  layer: string;
  bounds: number[] | null;
  vertices: number;
  cluster: string | null;
  plausible: boolean;
  reason: string;
  approximate: boolean;
  zeroZ: boolean;
  qgisSymbol?: boolean;
  duplicateOf?: string;
  duplicateKind?: "same-layer" | "cross-layer";
};
export type Audit = {
  errors: number;
  repairs: number;
  recovered: boolean;
  findings: { message: string; handle: string; type: string; layer: string }[];
};
export type Cluster = {
  id: string;
  count: number;
  points: number;
  bounds: number[];
  distance: number;
  plausible: boolean;
  suggestedOmit: boolean;
};
export type Inventory = {
  entries: Entry[];
  clusters: Cluster[];
  groups: { layer: string; type: string; count: number }[];
  total: number;
  pointCount: number;
  primary: string | null;
  dominant: boolean;
  ratio: number;
  conservative: boolean;
  distance: number;
  inflation: number | null;
  zeroZCount: number;
  qgisSymbols: { block: string; count: number; size: number }[];
  duplicates: { sameLayer: number; crossLayer: number };
  crs: {
    source: "gk4" | "utm" | null;
    direction: "gk4-utm" | "utm-gk4" | null;
    mode: "detected" | "manual" | "unknown";
    counts: { gk4: number; utm: number; other: number };
    mixed: boolean;
  };
  audit: Audit;
};
export type Selection = {
  clusters: string[];
  excludedGroups: string[];
  excludedIds: string[];
  excludePoints: boolean;
  symbolsAsPoints: boolean;
};
export const groupKey = (layer: string, type: string) =>
  JSON.stringify([layer, type]);
export const initialSelection = (inventory: Inventory): Selection => ({
  clusters: [...inventory.clusters.map((c) => c.id), "unlocated"],
  excludedGroups: [],
  // Exact duplicates (copy B) are removed by default; A stays in the export.
  excludedIds: inventory.entries.filter((e) => e.duplicateOf).map((e) => e.id),
  excludePoints: false,
  symbolsAsPoints: false,
});
export function selectedEntries(
  inventory: Inventory,
  selection: Selection,
): Entry[] {
  const clusters = new Set(selection.clusters),
    groups = new Set(selection.excludedGroups),
    ids = new Set(selection.excludedIds);
  return inventory.entries.filter(
    (e) =>
      clusters.has(e.cluster ?? "unlocated") &&
      !groups.has(groupKey(e.layer, e.type)) &&
      !ids.has(e.id) &&
      !(selection.excludePoints && e.type === "POINT"),
  );
}
