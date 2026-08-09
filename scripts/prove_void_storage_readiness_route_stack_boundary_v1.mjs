// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";

const INDEX_PATH = "src/index.ts";
const SHIM_PATH = "src/diag/patch_latest_number2_shim_v3.cjs";
const MARKER = "VOID_STORAGE_READINESS_ROUTE_STACK_BOUNDARY_V1_GREEN";

const BAD_PATTERNS = [
  /number2\.json v5b stole route/i,
  /number2\.json v5c stole route/i,
  /steal:\s*move our newest GET handler for PATH to the front/i,
  /steal:\s*move newest handler for PATH to front/i,
  /function\s+moveLayerToFront\s*\(/,
  /moveLayerToFront\s*\(app\)/,
];

function assertBoundarySafe(source, label) {
  for (const pattern of BAD_PATTERNS) {
    assert.doesNotMatch(source, pattern, `${label}: forbidden number2 router-front promotion matched ${pattern}`);
  }
}

function proveDetectorSelfTests() {
  const badV5b = `
    const PATH = "/blocks/latest/number2.json";
    // steal: move our newest GET handler for PATH to the front
    const layer = stack.splice(idx, 1)[0];
    stack.unshift(layer);
    console.log("[compat] number2.json v5b stole route (moved to front)");
  `;
  const badV5c = `
    const PATH = "/blocks/latest/number2.json";
    // steal: move newest handler for PATH to front
    const layer = stack.splice(idx, 1)[0];
    stack.unshift(layer);
  `;
  const badShim = `
    function moveLayerToFront(app) {
      const picked = app._router.stack.splice(4, 1)[0];
      app._router.stack.unshift(picked);
    }
    moveLayerToFront(app);
  `;
  const good = `
    const PATH = "/blocks/latest/number2.json";
    app.get(PATH, handler);
    app.use(number2CompatibilityHandler);
  `;

  for (const [label, source] of [["v5b", badV5b], ["v5c", badV5c], ["shim", badShim]]) {
    assert.throws(() => assertBoundarySafe(source, `synthetic-${label}`), /forbidden number2 router-front promotion/);
  }
  assert.doesNotThrow(() => assertBoundarySafe(good, "synthetic-good"));
}

function proveRepositorySource() {
  const index = fs.readFileSync(INDEX_PATH, "utf8");
  const shim = fs.readFileSync(SHIM_PATH, "utf8");

  assert.match(index, /function\s+requireStorageRepairGreen\s*\(/, "storage readiness gate function must remain present");
  assert.match(index, /STORAGE_DERIVED_PREFIXES/, "storage-derived route matcher must remain present");
  assert.match(index, /storageRepairGateMatchesPath/, "storage readiness route matcher must remain present");
  assert.match(index, /\/blocks\/latest\/number2\.json/, "number2 compatibility surface must remain present");
  assert.match(shim, /__void_number2_shim_v3/, "number2 shim identity marker must remain present");
  assert.match(shim, /normal route order/, "number2 shim must document normal route ordering");

  assertBoundarySafe(index, INDEX_PATH);
  assertBoundarySafe(shim, SHIM_PATH);
}

proveDetectorSelfTests();
proveRepositorySource();

console.log("storage_readiness_gate_present=true");
console.log("number2_router_front_promotion=false");
console.log("number2_shim_normal_route_order=true");
console.log(MARKER);
