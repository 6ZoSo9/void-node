#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V1,
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V1,
  VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V1,
  buildVoidBuyVoidCustodyRuntimeBundleCandidateV1,
  canonicalJsonV1,
  parseRuntimeImportsV1,
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1,
} from "../tools/void-buy-allocation-custody-runtime-bundle-candidate-v1.mjs";

const candidate = buildVoidBuyVoidCustodyRuntimeBundleCandidateV1();

assert.equal(candidate.marker, VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V1);
assert.match(candidate.candidate_id, /^voidbuycustodybundle1_[0-9a-f]{64}$/u);
assert.equal(candidate.entrypoint, "tools/void-buy-allocation-custody-service-v2.mjs");
assert.equal(candidate.compiler.typescript_version, "5.9.3");
assert.deepEqual(
  candidate.runtime_files.map((record) => record.path).sort(),
  [...VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V1].sort(),
);
assert.equal(candidate.runtime_files.length, 10);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "compiled_typescript",
  ).length,
  6,
);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "tracked_source",
  ).length,
  4,
);
assert.deepEqual(candidate.third_party_runtime_packages, []);
assert.deepEqual(candidate.node_modules_runtime_files, []);
assert.ok(
  candidate.external_node_builtins.length > 0 &&
    candidate.external_node_builtins.every((value) => value.startsWith("node:")),
);
assert.equal(
  candidate.source_inputs.length,
  Object.keys(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V1).length,
);
assert.equal(
  candidate.build_recipe.compile,
  "node node_modules/typescript/bin/tsc -p tsconfig.build.json",
);
assert.deepEqual(candidate.build_recipe.supported_node_majors, [22, 24, 26]);
assert.equal(candidate.build_recipe.three_node_byte_equality_required, true);
assert.equal(candidate.candidate_accepted, false);
assert.equal(candidate.install_target_selected, false);
assert.equal(candidate.request_root_selected, false);
assert.equal(candidate.shared_directory_selected, false);
assert.equal(candidate.node_binary_identity_verified, false);
assert.equal(candidate.runtime_integration, false);
assert.equal(candidate.production_gate_ready, false);
assert.equal(candidate.public_presale_activation, false);
assert.equal(candidate.funds_movement, false);
assert.equal(verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1(candidate), true);

assert.deepEqual(
  parseRuntimeImportsV1(
    [
      'import crypto from "node:crypto";',
      'import { x } from "./a.js";',
      'import "./b.mjs";',
      'export { y } from "./c.js";',
    ].join("\n"),
  ),
  ["./a.js", "./b.mjs", "./c.js", "node:crypto"],
);
assert.throws(
  () => parseRuntimeImportsV1('const x = import("./dynamic.js");'),
  /custody_bundle_dynamic_loader_forbidden/u,
);
assert.throws(
  () => parseRuntimeImportsV1('const x = require("./dynamic.cjs");'),
  /custody_bundle_dynamic_loader_forbidden/u,
);

{
  const tampered = structuredClone(candidate);
  tampered.runtime_files[0].sha256 = "0".repeat(64);
  assert.throws(
    () => verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1(tampered),
    /custody_bundle_candidate_id_invalid/u,
  );
}

for (const [key, expected] of Object.entries({
  source_candidate_only: true,
  runtime_entrypoint_bound: true,
  package_free_runtime_required: true,
  compiled_runtime_closure_bound: true,
  build_source_closure_bound: true,
  compiler_identity_bound: true,
  three_node_byte_equality_required: true,
  candidate_accepted: false,
  immutable_root_install: false,
  node_binary_identity_verified: false,
  request_root_selected: false,
  shared_directory_selected: false,
  service_unit_installed: false,
  service_started: false,
  service_restarted: false,
  systemd_mutation: false,
  runtime_integration: false,
  reserve_method_enabled: false,
  recover_method_enabled: false,
  payment_acceptance: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V1[key], expected);
}

const canonical = canonicalJsonV1(candidate);
assert.equal(canonical, canonicalJsonV1(JSON.parse(canonical)));

console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V1_PROOF_GREEN");
console.log("runtime_file_count=10");
console.log("compiled_runtime_file_count=6");
console.log("tracked_runtime_source_file_count=4");
console.log("typescript_build_source_pin_count=12");
console.log("third_party_runtime_packages=0");
console.log("node_modules_runtime_files=0");
console.log("candidate_accepted=false");
console.log("immutable_root_install=false");
console.log("node_binary_identity_verified=false");
console.log("request_root_selected=false");
console.log("shared_directory_selected=false");
console.log("service_install=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
