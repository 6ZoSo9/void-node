#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
  compileVoidWcVoidCoupledLaunchPolicyBundleV1,
} from "../tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs";
import {
  VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  wcVoidOpeningWindowIdV1,
} from "../tools/void-wc-void-opening-window-policy-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
  wcVoidOpeningConcentrationSybilPolicyIdV1,
} from "../tools/void-wc-void-opening-concentration-sybil-policy-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT,
} from "../tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs";
import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1,
  wcVoidOpeningMinimumRealWcDepthPolicyIdV1,
} from "../tools/void-wc-void-opening-minimum-real-wc-depth-policy-v1.mjs";
import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT,
} from "../tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs";
import {
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
  economicIntentTtlCapsPolicyIdV1,
} from "../tools/void-economic-intent-ttl-caps-policy-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT,
} from "../tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs";

const TOOL =
  "tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs";
const COUPLED_CANDIDATE =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const REVIEWED_COUPLED_CANDIDATE_BLOB =
  "d78bc88dd26c47921a54c081a79ceefc0d5abcee";
const LAUNCH = VOID_WC_VOID_COUPLED_LAUNCH_ID_V1;
const SPONSORED_POLICY_SCHEMA =
  "void.economic-system-sponsored-anti-grief-policy.v1";

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
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys.map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function sponsoredPolicyId(value) {
  const payload = {
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    intent_ttl_caps_policy_id: value.intent_ttl_caps_policy_id,
    policy_generation: value.policy_generation,
    policy_committed_at_ms: value.policy_committed_at_ms,
    per_intent_sponsored_gas_limit: value.per_intent_sponsored_gas_limit,
    per_identity_sponsored_gas_budget:
      value.per_identity_sponsored_gas_budget,
    global_sponsored_gas_budget: value.global_sponsored_gas_budget,
    budget_exhaustion_action: value.budget_exhaustion_action,
  };
  return "sha256:" +
    crypto.createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fixture() {
  const window = {
    schema: VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
    window_id: "sha256:" + "0".repeat(64),
    coupled_launch_id: LAUNCH,
    policy_committed_at_ms: 1000,
    opens_at_ms: 10000,
    closes_at_ms: 20000,
  };
  window.window_id = wcVoidOpeningWindowIdV1(window);

  const concentration = {
    schema: VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
    policy_id: "sha256:" + "0".repeat(64),
    coupled_launch_id: LAUNCH,
    policy_generation: "1",
    policy_committed_at_ms: 2000,
    opening_window_id: window.window_id,
    max_participant_share_bps: "4000",
    max_related_identity_share_bps: "6000",
    failure_action:
      VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
        .failure_action,
  };
  concentration.policy_id =
    wcVoidOpeningConcentrationSybilPolicyIdV1(concentration);

  const depth = {
    schema: VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1,
    policy_id: "sha256:" + "0".repeat(64),
    coupled_launch_id: LAUNCH,
    policy_generation: "1",
    policy_committed_at_ms: 3000,
    opening_window_id: window.window_id,
    minimum_real_wc_units: "1000",
    minimum_depth_failure_action:
      VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
        .minimum_depth_exhaustion_action,
  };
  depth.policy_id =
    wcVoidOpeningMinimumRealWcDepthPolicyIdV1(depth);

  const ttl = {
    schema: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
    policy_id: "sha256:" + "0".repeat(64),
    coupled_launch_id: LAUNCH,
    policy_generation: "1",
    policy_committed_at_ms: 4000,
    intent_ttl_seconds: 120,
    per_identity_max_outstanding: 2,
    global_max_outstanding: 10,
    late_payment_action:
      VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1
        .late_payment_action,
  };
  ttl.policy_id = economicIntentTtlCapsPolicyIdV1(ttl);

  const sponsor = {
    schema: SPONSORED_POLICY_SCHEMA,
    policy_id: "sha256:" + "0".repeat(64),
    coupled_launch_id: LAUNCH,
    intent_ttl_caps_policy_id: ttl.policy_id,
    policy_generation: "1",
    policy_committed_at_ms: 5000,
    per_intent_sponsored_gas_limit: "100000",
    per_identity_sponsored_gas_budget: "200000",
    global_sponsored_gas_budget: "1000000",
    budget_exhaustion_action:
      VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
        .budget_exhaustion_action,
  };
  sponsor.policy_id =
    sponsoredPolicyId(sponsor);

  return {
    coupled_launch_id: LAUNCH,
    bundle_generation: "1",
    bundle_committed_at_ms: 6000,
    opening_window: window,
    concentration_policy: concentration,
    minimum_depth_policy: depth,
    intent_ttl_caps_policy: ttl,
    sponsored_execution_policy: sponsor,
  };
}

function recomputeConcentration(value) {
  value.policy_id = wcVoidOpeningConcentrationSybilPolicyIdV1(value);
  return value;
}

function recomputeDepth(value) {
  value.policy_id = wcVoidOpeningMinimumRealWcDepthPolicyIdV1(value);
  return value;
}

function recomputeTtl(value) {
  value.policy_id = economicIntentTtlCapsPolicyIdV1(value);
  return value;
}

function recomputeSponsor(value) {
  value.policy_id = sponsoredPolicyId(value);
  return value;
}

const result = compileVoidWcVoidCoupledLaunchPolicyBundleV1(fixture());

assert.equal(
  result.marker,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
);
assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
  "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1",
);
assert.equal(
  result.schema,
  "void.wc-void-coupled-launch-policy-bundle.v1",
);
assert.match(result.bundle_id, /^sha256:[0-9a-f]{64}$/u);
assert.equal(result.coupled_launch_id, LAUNCH);
assert.deepEqual(result.canonical_launch_source, {
  path: COUPLED_CANDIDATE,
  git_blob_sha1: REVIEWED_COUPLED_CANDIDATE_BLOB,
  file_sha256:
    crypto.createHash("sha256")
      .update(fs.readFileSync(COUPLED_CANDIDATE))
      .digest("hex"),
  coupled_launch_id: LAUNCH,
});
assert.equal(result.opening_window.opens_at_ms, 10000);
assert.equal(result.opening_window.closes_at_ms, 20000);
assert.equal(
  result.concentration_policy.max_participant_share_bps,
  "4000",
);
assert.equal(result.minimum_depth_policy.minimum_real_wc_units, "1000");
assert.equal(result.intent_ttl_caps_policy.intent_ttl_seconds, 120);
assert.equal(
  result.sponsored_execution_policy.per_intent_sponsored_gas_limit,
  "100000",
);
assert.equal(result.exact_values_supplied_explicitly, true);
assert.equal(result.values_selected_by_source, false);
assert.equal(result.runtime_enforcement_verified, false);
assert.equal(result.launch_authority, false);
assert.equal(result.market_activation_authorized, false);
assert.equal(result.public_presale_activation_authorized, false);
assert.equal(result.funds_movement_authorized, false);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
)) {
  if (
    key === "source_policy_compilation_only" ||
    key === "explicit_reviewed_values_required" ||
    key === "canonical_launch_source_binding_required" ||
    key === "descriptor_bound_private_input" ||
    key === "create_only_private_output" ||
    key === "durable_output_directory_entry_required"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

{
  const bad = fixture();
  bad.bundle_committed_at_ms = bad.opening_window.opens_at_ms;
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_POLICY_BUNDLE_COMMIT_ORDER_INVALID/u,
  );
}

{
  const bad = fixture();
  bad.concentration_policy.max_participant_share_bps = "10000";
  recomputeConcentration(bad.concentration_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_PARTICIPANT_CAP_INVALID/u,
  );
}

{
  const bad = fixture();
  bad.concentration_policy.max_related_identity_share_bps = "3000";
  recomputeConcentration(bad.concentration_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_CLUSTER_CAP_BELOW_PARTICIPANT_CAP/u,
  );
}

{
  const bad = fixture();
  bad.minimum_depth_policy.minimum_real_wc_units = "0";
  recomputeDepth(bad.minimum_depth_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_MINIMUM_DEPTH_INVALID/u,
  );
}

{
  const bad = fixture();
  bad.intent_ttl_caps_policy.intent_ttl_seconds = 301;
  recomputeTtl(bad.intent_ttl_caps_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_TTL_ABOVE_MAXIMUM/u,
  );
}

{
  const bad = fixture();
  bad.intent_ttl_caps_policy.global_max_outstanding = 1;
  recomputeTtl(bad.intent_ttl_caps_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_TTL_CAP_RELATION_INVALID/u,
  );
}

{
  const bad = fixture();
  bad.sponsored_execution_policy.per_intent_sponsored_gas_limit =
    "3000001";
  recomputeSponsor(bad.sponsored_execution_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_SPONSOR_BUDGET_RELATION_INVALID/u,
  );
}

{
  const bad = fixture();
  bad.sponsored_execution_policy.global_sponsored_gas_budget =
    "100000";
  recomputeSponsor(bad.sponsored_execution_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_SPONSOR_BUDGET_RELATION_INVALID/u,
  );
}

{
  const bad = fixture();
  bad.coupled_launch_id = "sha256:" + "b".repeat(64);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_POLICY_BUNDLE_CANONICAL_LAUNCH_ID_MISMATCH/u,
  );
}

{
  const bad = fixture();
  bad.minimum_depth_policy.coupled_launch_id =
    "sha256:" + "b".repeat(64);
  recomputeDepth(bad.minimum_depth_policy);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_DEPTH_BINDING_MISMATCH/u,
  );
}

{
  const bad = fixture();
  bad.opening_window.window_id = "sha256:" + "f".repeat(64);
  assert.throws(
    () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(bad),
    /COUPLED_LAUNCH_WINDOW_ID_MISMATCH/u,
  );
}

{
  const original = fs.readFileSync(COUPLED_CANDIDATE);
  const candidate = JSON.parse(original.toString("utf8"));
  candidate.shared_post_discovery_reconciliation.coupled_launch_id =
    "sha256:" + "b".repeat(64);
  try {
    fs.writeFileSync(
      COUPLED_CANDIDATE,
      JSON.stringify(candidate, null, 2) + "\n",
    );
    assert.throws(
      () => compileVoidWcVoidCoupledLaunchPolicyBundleV1(fixture()),
      /COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_BLOB_MISMATCH/u,
    );
  } finally {
    fs.writeFileSync(COUPLED_CANDIDATE, original);
  }
}

{
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-coupled-launch-policy-bundle-"),
  );
  try {
    fs.chmodSync(tmp, 0o700);
    const input = path.join(tmp, "input.json");
    const output = path.join(tmp, "bundle.json");
    fs.writeFileSync(
      input,
      JSON.stringify(fixture(), null, 2) + "\n",
      { mode: 0o600 },
    );
    const first = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        input,
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    assert.equal(first.status, 0, first.stderr);
    assert.match(
      first.stdout,
      /VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_GREEN_NOT_ACTIVATED/u,
    );
    assert.match(first.stdout, /values_selected_by_source=false/u);
    assert.match(first.stdout, /runtime_enforcement_verified=false/u);
    assert.equal(fs.statSync(output).mode & 0o777, 0o600);
    const persisted = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(persisted.bundle_id, result.bundle_id);

    const alias = path.join(tmp, "input-alias.json");
    fs.symlinkSync(input, alias);
    const aliasRun = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        alias,
        "--output",
        path.join(tmp, "alias-output.json"),
      ],
      { encoding: "utf8" },
    );
    assert.equal(aliasRun.status, 2);
    assert.match(aliasRun.stderr, /PATH_ALIAS_FORBIDDEN/u);

    const second = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        input,
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    assert.equal(second.status, 2);
    assert.match(
      second.stderr,
      /COUPLED_LAUNCH_POLICY_OUTPUT_ALREADY_EXISTS|EEXIST/u,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "systemctl",
  "eth_sendRawTransaction",
  "new Wallet(",
  "signTransaction(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.match(source, /O_NOFOLLOW/u);
assert.match(source, /fstatSync/u);
assert.match(source, /fsyncDirectory\(parent\)/u);
assert.match(source, /REVIEWED_COUPLED_CANDIDATE_GIT_BLOB_SHA1/u);
assert.equal(
  source.includes("const bytes = fs.readFileSync(file);"),
  false,
  "private input must not reopen a validated pathname",
);

console.log("VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_PROOF");
console.log("explicit_opening_window_required=true");
console.log("explicit_concentration_caps_required=true");
console.log("explicit_minimum_real_wc_depth_required=true");
console.log("explicit_ttl_and_outstanding_caps_required=true");
console.log("explicit_sponsored_gas_budgets_required=true");
console.log("all_policy_ids_content_addressed=true");
console.log("canonical_coupled_launch_source_bound=true");
console.log("private_input_descriptor_bound=true");
console.log("private_output_directory_fsync_green=true");
console.log("all_policy_commitments_precede_open=true");
console.log("hidden_minimum_trade_amount_applied=false");
console.log("production_values_selected_by_source=false");
console.log("runtime_enforcement_verified=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement_authorized=false");
console.log("VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_GREEN");
