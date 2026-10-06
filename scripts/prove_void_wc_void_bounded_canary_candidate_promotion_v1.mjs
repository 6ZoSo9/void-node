#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
} from "../tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs";
import {
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
  promoteWcVoidBoundedCanaryCandidatesV1,
} from "../tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs";

const PRODUCTION =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const REVIEWED_SOURCE_COMMIT =
  "c3ff2ce141fa88a53eafe7a28c3f6614cadaaa71";
const EXPECTED_BLOBS = Object.freeze({
  semantic_promotion_tool: "38fc89f07b1e328504aff60dc2d357cb1072cdb3",
  semantic_promotion_proof: "55cb03312c2242d57e5a3db4a1d36a12f513f588",
  production_candidate: "43467c6cf03723ab8eb8e688d7b24c10bd681bad",
  coupled_candidate: "fbbc3174406f76077c8cb2fc11df9545938c0c8f",
  successor_candidate: "1457b8a0b060c4c515bf2232320af19f4e70dd35",
  production_classifier: "34e84c1f16452361e0e8d2c867e3bd4d63047061",
  coupled_classifier: "b565f3d8174d20e5e15c18085b97bc776e645efa",
  successor_classifier: "9f51b193da687669700c898ed587edf9040f6264",
  package_json: "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  package_lock: "b2671f0149f522b2489247016df0a5ec4bb72b8b",
});

const LAUNCH =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  throw new Error("invalid_canonical_value");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function gitValue(args) {
  const result = spawnSync(
    "git",
    ["--no-replace-objects", ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", LANG: "C", LC_ALL: "C" },
    },
  );
  assert.equal(result.status, 0, result.stderr || String(result.error || ""));
  return String(result.stdout || "").trim();
}

const REPOSITORY_HEAD_SHA = gitValue(["rev-parse", "HEAD"]);
const REPOSITORY_TREE_SHA = gitValue(["rev-parse", "HEAD^{tree}"]);
assert.match(REPOSITORY_HEAD_SHA, /^[0-9a-f]{40}$/u);
assert.match(REPOSITORY_TREE_SHA, /^[0-9a-f]{40}$/u);
assert.equal(
  gitValue(["status", "--porcelain=v1", "--untracked-files=all"]),
  "",
);

function semanticPromotionFixture(overrides = {}) {
  const material = {
    marker: VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
    version: 1,
    status: "BOUNDED_CANARY_SEMANTICALLY_VERIFIED_PROMOTION_READY",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: LAUNCH,
    reviewed_policy_id: "voidwcbcp1_" + "1".repeat(64),
    canary_evidence_id: "voidwcbce1_" + "2".repeat(64),
    evaluation_time_utc: "2030-01-01T00:03:00Z",
    observed_at_utc: "2030-01-01T00:02:00Z",
    valid_until_utc: "2030-01-01T00:05:00Z",
    participant_count: "1",
    settled_wc_units: "25",
    delivered_void_atoms: "100000000000000000000",
    observed_finality_confirmations: "11",
    market_vault_address:
      "0x1111111111111111111111111111111111111111",
    market_vault_runtime_code_sha256: "3".repeat(64),
    market_vault_runtime_verification_evidence_id:
      "sha256:" + "4".repeat(64),
    inventory_lock_evidence_id: "sha256:" + "5".repeat(64),
    wc_ledger_custody_evidence_id: "sha256:" + "6".repeat(64),
    opening_claim_binding_id: "sha256:" + "7".repeat(64),
    opening_claim_binding_persistence_evidence_id:
      "sha256:" + "8".repeat(64),
    replay_capsule_id: "voidwcrp1_" + "9".repeat(64),
    replay_terminal_capsule_sha256: "a".repeat(64),
    participant_control_evidence_id: "sha256:" + "b".repeat(64),
    bounded_canary_input_file_sha256: "c".repeat(64),
    market_vault_at_use_file_sha256: "d".repeat(64),
    ledger_persistence_import_input_file_sha256: "e".repeat(64),
    opening_request_file_sha256: "f".repeat(64),
    opening_claim_binding_file_sha256: "0".repeat(64),
    opening_claim_persistence_receipt_file_sha256: "1".repeat(64),
    opening_replay_capsule_file_sha256: "2".repeat(64),
    opening_replay_inspection_receipt_file_sha256: "3".repeat(64),
    participant_at_use_file_sha256: "4".repeat(64),
    durable_claim_binding_verified: true,
    durable_replay_terminal_verified: true,
    upstream_evidence_semantically_verified: true,
    live_canary_evidence_verified: true,
    bounded_canary_green: true,
    production_candidate_binding_allowed: true,
    production_candidate_updated: false,
    coupled_candidate_updated: false,
    candidate_promotion_required: true,
    coupled_activation_ready: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: structuredClone(
      VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
    ),
    ...overrides,
  };
  const digest = sha256(Buffer.from(canonicalJson(material), "utf8"));
  return {
    ...material,
    semantic_evidence_id: "sha256:" + digest,
    promotion_id: "voidwcbcsp1_" + digest,
  };
}

const productionBytes = fs.readFileSync(PRODUCTION);
const coupledBytes = fs.readFileSync(COUPLED);
const successorBytes = fs.readFileSync(SUCCESSOR);
const production = JSON.parse(productionBytes.toString("utf8"));
const coupled = JSON.parse(coupledBytes.toString("utf8"));
assert.equal(production.status, "hold");
assert.equal(production.bounded_canary_green, false);
assert.equal(production.coupled_activation_ready, false);
assert.equal(coupled.status, "HOLD");
assert.equal(coupled.gates.bounded_canary_green, false);
assert.equal(coupled.gates.coupled_activation_ready, false);
assert.equal(
  coupled.shared_post_discovery_reconciliation.coupled_launch_id,
  LAUNCH,
);

function requestWith(semantic) {
  const semanticBytes = prettyBytes(semantic);
  return {
    repository_head_sha: REPOSITORY_HEAD_SHA,
    repository_tree_sha: REPOSITORY_TREE_SHA,
    semantic_promotion_bytes: semanticBytes,
    semantic_promotion_file_sha256: sha256(semanticBytes),
    production_candidate_bytes: productionBytes,
    production_candidate_file_sha256: sha256(productionBytes),
    coupled_candidate_bytes: coupledBytes,
    coupled_candidate_file_sha256: sha256(coupledBytes),
    successor_candidate_bytes: successorBytes,
    successor_candidate_file_sha256: sha256(successorBytes),
  };
}

const semantic = semanticPromotionFixture();
const result = promoteWcVoidBoundedCanaryCandidatesV1(
  requestWith(semantic),
);

assert.equal(
  result.marker,
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
);
assert.equal(
  result.status,
  "BOUNDED_CANARY_CANDIDATE_PROMOTION_READY_FINAL_ACTIVATION_HOLD",
);
assert.equal(result.coupled_launch_id, LAUNCH);
assert.equal(result.repository_head_sha, REPOSITORY_HEAD_SHA);
assert.equal(result.repository_tree_sha, REPOSITORY_TREE_SHA);
assert.equal(result.reviewed_source_commit_sha, REVIEWED_SOURCE_COMMIT);
assert.equal(
  result.semantic_promotion_tool_git_blob_sha1,
  EXPECTED_BLOBS.semantic_promotion_tool,
);
assert.equal(
  result.semantic_promotion_proof_git_blob_sha1,
  EXPECTED_BLOBS.semantic_promotion_proof,
);
assert.equal(
  result.production_candidate_git_blob_sha1,
  EXPECTED_BLOBS.production_candidate,
);
assert.equal(
  result.coupled_candidate_git_blob_sha1,
  EXPECTED_BLOBS.coupled_candidate,
);
assert.equal(
  result.successor_candidate_git_blob_sha1,
  EXPECTED_BLOBS.successor_candidate,
);
assert.equal(
  result.production_classifier_git_blob_sha1,
  EXPECTED_BLOBS.production_classifier,
);
assert.equal(
  result.coupled_classifier_git_blob_sha1,
  EXPECTED_BLOBS.coupled_classifier,
);
assert.equal(
  result.successor_classifier_git_blob_sha1,
  EXPECTED_BLOBS.successor_classifier,
);
assert.equal(result.package_json_git_blob_sha1, EXPECTED_BLOBS.package_json);
assert.equal(result.package_lock_git_blob_sha1, EXPECTED_BLOBS.package_lock);
assert.equal(result.reviewed_binding_count, 38);
assert.equal(
  result.reviewed_binding_manifest_sha256,
  "20842e9bbe2daef3ae764ce1c763dce7c0b27f53f3580d2a09865a4bd2c546d8",
);
assert.match(result.candidate_promotion_tool_git_blob_sha1, /^[0-9a-f]{40}$/u);
assert.equal(result.canonical_candidate_bytes_bound_to_reviewed_head_blobs, true);
assert.equal(result.semantic_source_contract_generation_bound, true);
assert.equal(result.reviewed_dependency_closure_bound, true);
assert.equal(result.package_dependency_state_bound, true);
assert.equal(result.semantic_promotion_id, semantic.promotion_id);
assert.equal(result.semantic_evidence_id, semantic.semantic_evidence_id);
assert.equal(result.semantic_canary_fresh_at_reviewed_evaluation, true);
assert.equal(result.application_time_authority, false);
assert.deepEqual(result.promoted_production_fields, ["bounded_canary_green"]);
assert.deepEqual(result.promoted_coupled_gates, ["bounded_canary_green"]);
assert.equal(result.promoted_production_candidate.bounded_canary_green, true);
assert.equal(
  result.promoted_coupled_candidate.gates.bounded_canary_green,
  true,
);
assert.equal(result.promoted_production_candidate.status, "hold");
assert.equal(result.promoted_coupled_candidate.status, "HOLD");
assert.equal(
  result.promoted_production_candidate.coupled_activation_ready,
  false,
);
assert.equal(
  result.promoted_coupled_candidate.gates.coupled_activation_ready,
  false,
);
assert.equal(result.production_status_remains_hold, true);
assert.equal(result.coupled_status_remains_hold, true);
assert.equal(result.bounded_canary_green, true);
assert.equal(result.coupled_activation_ready, false);
assert.equal(result.canonical_production_candidate_updated, false);
assert.equal(result.canonical_coupled_candidate_updated, false);
assert.equal(result.candidate_promotion_application_required, true);
assert.equal(result.market_activation_authorized, false);
assert.equal(result.public_presale_activation_authorized, false);
assert.equal(result.funds_movement_authorized, false);
assert.match(result.promotion_id, /^voidwcbccp1_[0-9a-f]{64}$/u);

assert.equal(
  result.production_before.missing_gates.includes("bounded_canary_required"),
  true,
);
assert.equal(
  result.production_after.missing_gates.includes("bounded_canary_required"),
  false,
);
assert.equal(
  result.production_after.missing_gates.includes(
    "coupled_activation_ready_required",
  ),
  true,
);
assert.equal(
  result.coupled_before.missing_gates.includes("bounded_canary_required"),
  true,
);
assert.equal(
  result.coupled_after.missing_gates.includes("bounded_canary_required"),
  false,
);
assert.equal(
  result.coupled_after.missing_gates.includes(
    "coupled_activation_ready_required",
  ),
  true,
);
assert.equal(
  result.production_before.missing_gates.length -
    result.production_after.missing_gates.length,
  1,
);
assert.equal(
  result.coupled_before.missing_gates.length -
    result.coupled_after.missing_gates.length,
  1,
);

assert.equal(Object.isFrozen(result.promoted_production_candidate), true);
assert.equal(Object.isFrozen(result.promoted_coupled_candidate), true);
assert.equal(Object.isFrozen(result.promoted_coupled_candidate.gates), true);
assert.throws(
  () => {
    result.promoted_production_candidate.coupled_activation_ready = true;
  },
  TypeError,
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "source_only_promotion",
    "exact_semantic_promotion_bytes_required",
    "exact_candidate_bytes_required",
    "semantic_canary_fresh_at_reviewed_evaluation_required",
    "canonical_classifier_reexecution",
    "exact_two_gate_candidate_delta",
    "git_repository_identity_read",
    "clean_worktree_required",
    "reviewed_source_generation_required",
    "canonical_head_candidate_bytes_required",
    "semantic_source_contract_generation_required",
    "reviewed_dependency_closure_required",
    "package_lock_generation_required",
    "reviewed_git_executable_required",
    "ambient_git_overrides_ignored",
    "filesystem_read",
  ]);
  assert.equal(value, allowed.has(key), key);
}

{
  const badWindow = semanticPromotionFixture({
    evaluation_time_utc: "2030-01-01T00:06:00Z",
  });
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1(requestWith(badWindow)),
    /BOUNDED_CANARY_SEMANTIC_PROMOTION_TIME_WINDOW_INVALID/u,
  );
}

{
  const bad = semanticPromotionFixture({ settled_wc_units: "0" });
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1(requestWith(bad)),
    /BOUNDED_CANARY_SEMANTIC_PROMOTION_AMOUNT_INVALID:settled_wc_units/u,
  );
}

{
  const bad = semanticPromotionFixture();
  bad.semantic_evidence_id = "sha256:" + "f".repeat(64);
  const bytes = prettyBytes(bad);
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1({
      ...requestWith(semantic),
      semantic_promotion_bytes: bytes,
      semantic_promotion_file_sha256: sha256(bytes),
    }),
    /BOUNDED_CANARY_SEMANTIC_PROMOTION_CONTENT_ID_MISMATCH/u,
  );
}

{
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1({
      ...requestWith(semantic),
      repository_head_sha: "f".repeat(40),
    }),
    /BOUNDED_CANARY_REPOSITORY_HEAD_MISMATCH/u,
  );
}

{
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1({
      ...requestWith(semantic),
      repository_tree_sha: "e".repeat(40),
    }),
    /BOUNDED_CANARY_REPOSITORY_TREE_MISMATCH/u,
  );
}

{
  const badProduction = structuredClone(production);
  badProduction.inventory_funded = true;
  const bytes = prettyBytes(badProduction);
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1({
      ...requestWith(semantic),
      production_candidate_bytes: bytes,
      production_candidate_file_sha256: sha256(bytes),
    }),
    /BOUNDED_CANARY_PRODUCTION_CANDIDATE_NOT_CANONICAL_REVIEWED_HEAD_BYTES/u,
  );
}

{
  const badCoupled = structuredClone(coupled);
  badCoupled.gates.wc_ledger_persistence_verified = true;
  const bytes = prettyBytes(badCoupled);
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1({
      ...requestWith(semantic),
      coupled_candidate_bytes: bytes,
      coupled_candidate_file_sha256: sha256(bytes),
    }),
    /BOUNDED_CANARY_COUPLED_CANDIDATE_NOT_CANONICAL_REVIEWED_HEAD_BYTES/u,
  );
}

{
  const badSuccessor = JSON.parse(successorBytes.toString("utf8"));
  badSuccessor.status = "READY";
  const bytes = prettyBytes(badSuccessor);
  assert.throws(
    () => promoteWcVoidBoundedCanaryCandidatesV1({
      ...requestWith(semantic),
      successor_candidate_bytes: bytes,
      successor_candidate_file_sha256: sha256(bytes),
    }),
    /BOUNDED_CANARY_SUCCESSOR_CANDIDATE_NOT_CANONICAL_REVIEWED_HEAD_BYTES/u,
  );
}

const repeat = promoteWcVoidBoundedCanaryCandidatesV1(requestWith(semantic));
assert.equal(repeat.promotion_id, result.promotion_id);

{
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-bounded-canary-git-boundary-"));
  const fakeDir = path.join(temp, "fake-bin");
  const sentinel = path.join(temp, "fake-git-invoked");
  fs.mkdirSync(fakeDir);
  const fakeGit = path.join(fakeDir, "git");
  fs.writeFileSync(
    fakeGit,
    "#!/bin/sh\nprintf 'invoked\\n' >> " + JSON.stringify(sentinel) + "\nexit 91\n",
    { mode: 0o755 },
  );
  const saved = new Map();
  for (const key of [
    "PATH",
    "GIT_DIR",
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_KEY_0",
    "GIT_CONFIG_VALUE_0",
    "GIT_EXEC_PATH",
  ]) {
    saved.set(key, Object.prototype.hasOwnProperty.call(process.env, key)
      ? process.env[key]
      : undefined);
  }
  try {
    process.env.PATH = fakeDir;
    process.env.GIT_DIR = path.join(temp, "forged.git");
    process.env.GIT_CONFIG_COUNT = "1";
    process.env.GIT_CONFIG_KEY_0 = "core.abbrev";
    process.env.GIT_CONFIG_VALUE_0 = "1";
    process.env.GIT_EXEC_PATH = fakeDir;
    const hostile = promoteWcVoidBoundedCanaryCandidatesV1(requestWith(semantic));
    assert.equal(hostile.promotion_id, result.promotion_id);
    assert.equal(fs.existsSync(sentinel), false);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "https.request(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "classifyVoidWcVoidProductionReadinessV1",
  "classifyVoidCoupledEconomicSuccessorGateV1",
  "BOUNDED_CANARY_SEMANTIC_PROMOTION_TIME_WINDOW_INVALID",
  "BOUNDED_CANARY_PRODUCTION_CANDIDATE_CHANGE_SCOPE_INVALID",
  "BOUNDED_CANARY_COUPLED_CANDIDATE_CHANGE_SCOPE_INVALID",
  "BOUNDED_CANARY_REVIEWED_SOURCE_DRIFT",
  "NOT_CANONICAL_REVIEWED_HEAD_BYTES",
  "name.toUpperCase()",
  "REVIEWED_SOURCE_COMMIT",
  "reviewed_binding_manifest_sha256",
  "semantic_market_vault_runtime_attestation",
  "participant_production_runtime_binding",
  "contracts/mainnet/WCVoidMarketVaultV2.sol",
  "package-lock.json",
  'const GIT_EXECUTABLE = "/usr/bin/git"',
  "GIT_NAMESPACE",
  "GIT_CONFIG_COUNT",
  "GIT_EXEC_PATH",
  "BOUNDED_CANARY_GIT_EXECUTABLE_CHANGED_DURING_READ",
  'promotedProduction.bounded_canary_green = true',
  'promotedCoupled.gates.bounded_canary_green = true',
  "coupled_activation_ready: false",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log("VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1_PROOF_GREEN");
console.log("exact_semantic_promotion_receipt_bound=true");
console.log("clean_repository_generation_bound=true");
console.log("canonical_candidate_bytes_bound_to_reviewed_head_blobs=true");
console.log("semantic_source_contract_generation_bound=true");
console.log("reviewed_source_generation_blob_pins_required=true");
console.log("reviewed_dependency_closure_count=38");
console.log("reviewed_dependency_closure_bound=true");
console.log("package_dependency_state_bound=true");
console.log("reviewed_git_executable_required=true");
console.log("ambient_path_git_substitution_rejected=true");
console.log("ambient_git_repository_and_config_overrides_ignored=true");
console.log("semantic_canary_fresh_at_reviewed_evaluation=true");
console.log("application_time_authority=false");
console.log("exact_two_gate_candidate_delta=true");
console.log("production_bounded_canary_green=true");
console.log("coupled_bounded_canary_green=true");
console.log("production_status_remains_hold=true");
console.log("coupled_status_remains_hold=true");
console.log("coupled_activation_ready=false");
console.log("canonical_candidate_files_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
