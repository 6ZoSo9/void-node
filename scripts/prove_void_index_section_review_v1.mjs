#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  MAX_TOTAL_LINES,
  REVIEW_MARKER,
  SOURCE_PATH,
  buildIndexSectionReview,
  parseViewerArgs,
  renderIndexSectionText,
} from "./review_void_index_section_v1.mjs";

function registry(sourcePath = SOURCE_PATH) {
  return {
    marker: "VOID_INDEX_CARTOGRAPHY_V1",
    version: 1,
    source_path: sourcePath,
    managed_landmark_prefix: "// VOID-INDEX-LANDMARK:",
    contract: {},
    landmarks: [
      {
        id: "runtime.main",
        area: "runtime",
        purpose: "main entry",
        anchor: "function mainAnchor() {",
        expected_occurrences: 1,
      },
      {
        id: "datanet.demo",
        area: "datanet",
        purpose: "demo entry",
        anchor: "// VOID-INDEX-LANDMARK: datanet.demo",
        expected_occurrences: 1,
      },
    ],
  };
}

const source = [
  "const beforeA = 1;",
  "const beforeB = 2;",
  "function mainAnchor() {",
  "  return true;",
  "}",
  "const between = 3;",
  "// VOID-INDEX-LANDMARK: datanet.demo",
  "const afterA = 4;",
  "const afterB = 5;",
  "",
].join("\n");

const review = buildIndexSectionReview({
  registry: registry(),
  source,
  landmarkId: "datanet.demo",
  before: 2,
  after: 1,
});
assert.equal(review.marker, REVIEW_MARKER);
assert.equal(review.source_path, SOURCE_PATH);
assert.equal(review.landmark.id, "datanet.demo");
assert.equal(review.landmark.line, 7);
assert.equal(review.window.start_line, 5);
assert.equal(review.window.end_line, 8);
assert.equal(review.window.line_count, 4);
assert.deepEqual(review.lines.map((item) => item.line), [5, 6, 7, 8]);
assert.match(review.lines.find((item) => item.line === 7).text, /VOID-INDEX-LANDMARK: datanet\.demo/);
assert.equal(review.exact_registered_landmark_required, true);
assert.equal(review.arbitrary_source_path_allowed, false);
assert.equal(review.source_mutation_performed, false);
assert.match(review.source_sha256, /^[0-9a-f]{64}$/);

const shifted = buildIndexSectionReview({
  registry: registry(),
  source: `// inserted\n${source}`,
  landmarkId: "datanet.demo",
  before: 0,
  after: 0,
});
assert.equal(shifted.landmark.line, 8);
assert.equal(shifted.lines.length, 1);
assert.equal(shifted.lines[0].line, 8);

const edge = buildIndexSectionReview({
  registry: registry(),
  source,
  landmarkId: "runtime.main",
  before: 120,
  after: 120,
});
assert.ok(edge.window.line_count <= MAX_TOTAL_LINES);
assert.equal(edge.window.truncated_at_start, true);
assert.equal(edge.window.truncated_at_end, true);

assert.throws(
  () => buildIndexSectionReview({ registry: registry(), source, landmarkId: "unknown.area" }),
  /unknown landmark id/,
);
assert.throws(
  () => buildIndexSectionReview({ registry: registry(), source, landmarkId: "BAD_ID" }),
  /invalid landmark id/,
);
assert.throws(
  () => buildIndexSectionReview({ registry: registry("docs/other.txt"), source, landmarkId: "runtime.main" }),
  /registry source_path must be exactly src\/index\.ts/,
);
assert.throws(
  () => buildIndexSectionReview({ registry: registry(), source, landmarkId: "runtime.main", before: 121 }),
  /before out of bounds/,
);
assert.throws(
  () => parseViewerArgs(["--landmark", "runtime.main", "--source", "README.md"]),
  /unknown argument: --source/,
);
assert.throws(
  () => parseViewerArgs(["--landmark", "runtime.main", "--registry", "other.json"]),
  /unknown argument: --registry/,
);
assert.throws(
  () => parseViewerArgs(["--landmark", "runtime.main", "--before", "121"]),
  /--before must be between 0 and 120/,
);

const parsed = parseViewerArgs([
  "--landmark", "runtime.main",
  "--before", "3",
  "--after", "4",
  "--format", "json",
]);
assert.equal(parsed.landmarkId, "runtime.main");
assert.equal(parsed.before, 3);
assert.equal(parsed.after, 4);
assert.equal(parsed.format, "json");

const text = renderIndexSectionText(review);
assert.match(text, /VOID_INDEX_SECTION_REVIEW_V1/);
assert.match(text, /landmark=datanet\.demo/);
assert.match(text, /\s+7 \| \/\/ VOID-INDEX-LANDMARK: datanet\.demo/);
assert.match(text, /source_mutation_performed=false/);

console.log("exact_registered_landmark_required_green=true");
console.log("bounded_window_green=true");
console.log("line_shift_resolution_green=true");
console.log("unknown_landmark_fails_closed_green=true");
console.log("arbitrary_source_override_rejected_green=true");
console.log("oversized_window_rejected_green=true");
console.log("source_path_binding_green=true");
console.log("source_mutation_performed=false");
console.log("VOID_INDEX_SECTION_REVIEW_V1_PROOF_GREEN");
