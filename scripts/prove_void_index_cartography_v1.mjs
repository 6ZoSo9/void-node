#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  CARTOGRAPHY_MARKER,
  buildCartography,
  renderMarkdown,
  validateRegistry,
} from "./generate_void_index_cartography_v1.mjs";

function registry(landmarks) {
  return {
    marker: CARTOGRAPHY_MARKER,
    version: 1,
    source_path: "src/index.ts",
    managed_landmark_prefix: "// VOID-INDEX-LANDMARK:",
    contract: {},
    landmarks,
  };
}

const baseRegistry = registry([
  {
    id: "runtime.main",
    area: "runtime",
    purpose: "main",
    anchor: "function mainAnchor() {",
    expected_occurrences: 1,
  },
  {
    id: "datanet.demo",
    area: "datanet",
    purpose: "demo",
    anchor: "// VOID-INDEX-LANDMARK: datanet.demo",
    expected_occurrences: 1,
  },
]);

const sourceA = [
  "const before = 1;",
  "function mainAnchor() {",
  "  return true;",
  "}",
  "// VOID-INDEX-LANDMARK: datanet.demo",
  "const after = 2;",
  "",
].join("\n");

const mapA = buildCartography({ registry: baseRegistry, source: sourceA });
assert.equal(mapA.marker, CARTOGRAPHY_MARKER);
assert.equal(mapA.landmark_count, 2);
assert.equal(mapA.source_mutation_performed, false);
assert.equal(mapA.landmarks.find((x) => x.id === "runtime.main").line, 2);
assert.equal(mapA.landmarks.find((x) => x.id === "datanet.demo").line, 5);

const sourceB = ["// inserted line", "// another inserted line", sourceA].join("\n");
const mapB = buildCartography({ registry: baseRegistry, source: sourceB });
assert.equal(mapB.landmarks.find((x) => x.id === "runtime.main").line, 4);
assert.equal(mapB.landmarks.find((x) => x.id === "datanet.demo").line, 7);
assert.deepEqual(
  mapB.landmarks.map((x) => x.id).sort(),
  mapA.landmarks.map((x) => x.id).sort(),
);

assert.throws(
  () => buildCartography({
    registry: baseRegistry,
    source: sourceA.replace("function mainAnchor() {", "function movedAnchor() {"),
  }),
  /occurrence mismatch/,
);

assert.throws(
  () => buildCartography({
    registry: baseRegistry,
    source: `${sourceA}\nfunction mainAnchor() {\n`,
  }),
  /occurrence mismatch/,
);

assert.throws(
  () => buildCartography({
    registry: baseRegistry,
    source: `${sourceA}\n// VOID-INDEX-LANDMARK: unknown.area\n`,
  }),
  /unregistered managed source marker/,
);

assert.throws(
  () => buildCartography({
    registry: baseRegistry,
    source: `${sourceA}\n// VOID-INDEX-LANDMARK: BAD_ID\n`,
  }),
  /malformed managed landmark/,
);

assert.throws(
  () => validateRegistry(registry([
    baseRegistry.landmarks[0],
    { ...baseRegistry.landmarks[0] },
  ])),
  /duplicate landmark id/,
);

assert.throws(
  () => validateRegistry(registry([
    baseRegistry.landmarks[0],
    {
      id: "runtime.other",
      area: "runtime",
      purpose: "other",
      anchor: baseRegistry.landmarks[0].anchor,
      expected_occurrences: 1,
    },
  ])),
  /duplicate landmark anchor/,
);

const markdown = renderMarkdown(mapA);
assert.match(markdown, /`runtime\.main`/);
assert.match(markdown, /\| 2 \|/);
assert.match(markdown, /SHA-256/);

console.log("stable_landmark_identity_green=true");
console.log("generated_line_shift_green=true");
console.log("missing_anchor_fails_closed_green=true");
console.log("duplicate_anchor_fails_closed_green=true");
console.log("unregistered_managed_marker_fails_closed_green=true");
console.log("registry_uniqueness_green=true");
console.log("source_mutation_performed=false");
console.log("VOID_INDEX_CARTOGRAPHY_V1_PROOF_GREEN");
