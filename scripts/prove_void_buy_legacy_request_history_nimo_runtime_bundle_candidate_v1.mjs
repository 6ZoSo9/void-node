#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V1,
  buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1,
  canonicalLegacyHistoryNimoRuntimeBundleJsonV1,
  parseLegacyHistoryNimoRuntimeImportsV1,
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1,
} from "../tools/void-buy-legacy-request-history-nimo-runtime-bundle-candidate-v1.mjs";

const candidate =
  buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1();

assert.equal(
  candidate.marker,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V1,
);
assert.match(candidate.candidate_id, /^voidblrhnrb1_[0-9a-f]{64}$/u);
assert.equal(
  candidate.parent_plan.exact_parent_head,
  "03f460aa5d98784839c7a31e72b12f81d12e5f72",
);
assert.equal(
  candidate.parent_plan.git_blob_sha1,
  "3d41834140eaaca46fb9f5a771278bed49384c65",
);
assert.match(candidate.parent_plan.plan_id, /^voidblrhnip1_[0-9a-f]{64}$/u);
assert.equal(
  candidate.entrypoint,
  "tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
);
assert.equal(
  candidate.planned_handler_root,
  "/usr/local/libexec/void-legacy-history-witness-v1/void",
);
assert.equal(
  candidate.planned_handler_path,
  "/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
);
assert.deepEqual(
  candidate.runtime_files.map((record) => record.path).sort(),
  [...VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V1].sort(),
);
assert.equal(candidate.runtime_files.length, 14);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "compiled_typescript",
  ).length,
  9,
);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "tracked_source",
  ).length,
  5,
);
assert.equal(candidate.parent_source_inputs.length, 19);
assert.deepEqual(candidate.third_party_runtime_packages, []);
assert.deepEqual(candidate.node_modules_runtime_files, []);
assert.ok(
  candidate.external_node_builtins.length > 0 &&
    candidate.external_node_builtins.every((value) => value.startsWith("node:")),
);
assert.equal(candidate.compiler.typescript_version, "5.9.3");
assert.equal(
  candidate.build_recipe.dependency_install,
  "npm ci --ignore-scripts --no-audit --no-fund",
);
assert.equal(
  candidate.build_recipe.compile,
  "node node_modules/typescript/bin/tsc -p tsconfig.build.json",
);
assert.equal(candidate.build_recipe.source_maps_expected, false);
assert.deepEqual(candidate.build_recipe.supported_node_majors, [22, 24, 26]);
assert.equal(candidate.build_recipe.three_node_byte_equality_required, true);
assert.equal(candidate.runtime_bundle_candidate_accepted, false);
assert.equal(candidate.runtime_bundle_lock_created, false);
assert.equal(candidate.protected_runtime_install_authorized, false);
assert.equal(candidate.live_nimo_installed, false);
assert.equal(candidate.authorized_keys_mutation_authorized, false);
assert.equal(candidate.public_key_selected, false);
assert.equal(candidate.external_transport_authenticated, false);
assert.equal(candidate.witness_read_performed, false);
assert.equal(candidate.witness_append_performed, false);
assert.equal(candidate.sovereign_signing, false);
assert.equal(candidate.payment_acceptance, false);
assert.equal(candidate.public_presale_activation, false);
assert.equal(candidate.wc_void_market_activation, false);
assert.equal(candidate.funds_movement, false);
assert.equal(
  candidate.next_gate,
  "void_buy_void_legacy_history_nimo_runtime_bundle_lock_v1",
);
assert.equal(
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1(candidate),
  true,
);

assert.deepEqual(
  parseLegacyHistoryNimoRuntimeImportsV1(
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
  () =>
    parseLegacyHistoryNimoRuntimeImportsV1(
      'const value = import("./dynamic.js");',
    ),
  /legacy_history_nimo_bundle_dynamic_loader_forbidden/u,
);
assert.throws(
  () =>
    parseLegacyHistoryNimoRuntimeImportsV1(
      'const value = require("./dynamic.cjs");',
    ),
  /legacy_history_nimo_bundle_dynamic_loader_forbidden/u,
);

{
  const tampered = structuredClone(candidate);
  tampered.runtime_files[0].sha256 = "0".repeat(64);
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1(tampered),
    /legacy_history_nimo_bundle_candidate_id_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.authority.live_nimo_installed = true;
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1(tampered),
    /legacy_history_nimo_bundle_candidate_id_invalid/u,
  );
}

for (const [key, expected] of Object.entries({
  source_candidate_only: true,
  exact_parent_plan_bound: true,
  parent_reviewed_source_generation_bound: true,
  runtime_entrypoint_bound: true,
  package_free_runtime_required: true,
  complete_transitive_runtime_closure_bound: true,
  compiled_runtime_closure_bound: true,
  compiler_identity_bound: true,
  three_node_byte_equality_required: true,
  candidate_report_filesystem_write: true,
  runtime_bundle_candidate_accepted: false,
  runtime_bundle_lock_created: false,
  protected_runtime_install_authorized: false,
  live_nimo_installed: false,
  authorized_keys_mutation_authorized: false,
  public_key_selected: false,
  private_key_access: false,
  witness_read_performed: false,
  witness_append_performed: false,
  sovereign_signing: false,
  payment_acceptance: false,
  transaction: false,
  public_presale_activation: false,
  wc_void_market_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const canonical = canonicalLegacyHistoryNimoRuntimeBundleJsonV1(candidate);
assert.equal(
  canonical,
  canonicalLegacyHistoryNimoRuntimeBundleJsonV1(JSON.parse(canonical)),
);

console.log(
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V1_PROOF_GREEN",
);
console.log("runtime_file_count=14");
console.log("compiled_runtime_file_count=9");
console.log("tracked_runtime_source_file_count=5");
console.log("parent_source_input_count=19");
console.log("typescript_version=5.9.3");
console.log("third_party_runtime_packages=0");
console.log("node_modules_runtime_files=0");
console.log("runtime_bundle_candidate_accepted=false");
console.log("runtime_bundle_lock_created=false");
console.log("protected_runtime_install_authorized=false");
console.log("live_nimo_installed=false");
console.log("authorized_keys_mutation_authorized=false");
console.log("external_transport_authenticated=false");
console.log("witness_read_performed=false");
console.log("witness_append_performed=false");
console.log("sovereign_signing=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
