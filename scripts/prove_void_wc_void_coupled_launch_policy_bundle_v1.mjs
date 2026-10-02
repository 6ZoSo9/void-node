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
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1,
  compileVoidWcVoidCoupledLaunchPolicyBundleV1 as compileProductionBundle,
  testOnlyCompileVoidWcVoidCoupledLaunchPolicyBundleV1 as compileVoidWcVoidCoupledLaunchPolicyBundleV1,
  testOnlyVerifyVoidWcVoidCoupledLaunchPolicyPrivateExecutionBindingV1,
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
const CORE =
  "tools/void-wc-void-coupled-launch-policy-reviewed-core-v1.mjs";
const WORKFLOW =
  ".github/workflows/void-wc-void-coupled-launch-policy-bundle-v1.yml";
const POLICY_SOURCE =
  "tools/void-wc-void-opening-window-policy-v1.mjs";
const COUPLED_CANDIDATE =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const REVIEWED_COUPLED_CANDIDATE_BLOB =
  String(
    spawnSync(
      "git",
      ["rev-parse", "HEAD:" + COUPLED_CANDIDATE],
      { encoding: "utf8" },
    ).stdout || "",
  ).trim();
assert.match(REVIEWED_COUPLED_CANDIDATE_BLOB, /^[0-9a-f]{40}$/u);
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
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1,
);
assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
  "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1",
);
assert.equal(result.status, "TEST_ONLY_REVIEWED_SOURCE_COMPILATION_GREEN");
assert.equal(result.production_artifact_authorized, false);
assert.equal(result.production_bundle_id_emitted, false);
assert.equal("bundle_id" in result, false);
assert.equal(result.coupled_launch_id, LAUNCH);
assert.equal(result.canonical_launch_source.path, COUPLED_CANDIDATE);
assert.equal(
  result.canonical_launch_source.git_blob_sha1,
  REVIEWED_COUPLED_CANDIDATE_BLOB,
);
assert.equal(
  result.canonical_launch_source.file_sha256,
  crypto.createHash("sha256")
    .update(fs.readFileSync(COUPLED_CANDIDATE))
    .digest("hex"),
);
assert.equal(result.canonical_launch_source.coupled_launch_id, LAUNCH);
assert.equal(result.canonical_launch_source.canonical_main_verified, false);
assert.equal(result.canonical_launch_source.remote_main_sha, null);
assert.equal(result.canonical_launch_source.permission_fenced_execution, true);
assert.match(
  result.canonical_launch_source.repository_head_sha,
  /^[0-9a-f]{40}$/u,
);
assert.match(
  result.canonical_launch_source.repository_tree_sha,
  /^[0-9a-f]{40}$/u,
);
assert.equal(
  result.canonical_launch_source.reviewed_policy_module_git_blobs[CORE] !==
    undefined,
  true,
);
assert.equal(
  Object.keys(
    result.canonical_launch_source.reviewed_policy_module_git_blobs,
  ).length,
  11,
);

assert.throws(
  () => compileProductionBundle(fixture()),
  /COUPLED_LAUNCH_POLICY_CANONICAL_MAIN_BRANCH_REQUIRED/u,
);
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
    key === "reviewed_git_object_execution_required" ||
    key === "reviewed_policy_module_closure_required" ||
    key === "permission_fenced_execution_required" ||
    key === "worktree_policy_execution_forbidden" ||
    key === "canonical_main_artifact_required" ||
    key === "canonical_remote_main_read_required" ||
    key === "canonical_remote_main_external_network_read" ||
    key === "git_config_isolated" ||
    key === "descriptor_bound_private_input" ||
    key === "reviewed_private_input_sha256_required" ||
    key === "create_only_private_output" ||
    key === "durable_output_directory_entry_required" ||
    key === "output_parent_directory_identity_bound" ||
    key === "private_temporary_filesystem_write"
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
      /COUPLED_LAUNCH_POLICY_REPOSITORY_MUST_BE_CLEAN|COUPLED_LAUNCH_POLICY_CANONICAL_SOURCE_BLOB_MISMATCH/u,
    );
  } finally {
    fs.writeFileSync(COUPLED_CANDIDATE, original);
  }
}

{
  const original = fs.readFileSync(POLICY_SOURCE);
  const sentinel = path.join(
    os.tmpdir(),
    "void-coupled-launch-policy-unreviewed-executed-" + String(process.pid),
  );
  try {
    fs.rmSync(sentinel, { force: true });
    spawnSync(
      "/usr/bin/git",
      ["-C", process.cwd(), "update-index", "--assume-unchanged", POLICY_SOURCE],
      { encoding: "utf8" },
    );
    const malicious = Buffer.concat([
      Buffer.from(
        'import { writeFileSync as __voidSentinelWrite } from "node:fs";\n' +
          "__voidSentinelWrite(" +
          JSON.stringify(sentinel) +
          ', "executed\\n");\n',
        "utf8",
      ),
      original,
    ]);
    fs.writeFileSync(POLICY_SOURCE, malicious);
    const hidden = compileVoidWcVoidCoupledLaunchPolicyBundleV1(fixture());
    assert.deepEqual(hidden.opening_window, result.opening_window);
    assert.deepEqual(hidden.concentration_policy, result.concentration_policy);
    assert.deepEqual(hidden.minimum_depth_policy, result.minimum_depth_policy);
    assert.deepEqual(hidden.intent_ttl_caps_policy, result.intent_ttl_caps_policy);
    assert.deepEqual(
      hidden.sponsored_execution_policy,
      result.sponsored_execution_policy,
    );
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "hidden unreviewed policy worktree source executed",
    );
  } finally {
    fs.writeFileSync(POLICY_SOURCE, original);
    spawnSync(
      "/usr/bin/git",
      ["-C", process.cwd(), "update-index", "--no-assume-unchanged", POLICY_SOURCE],
      { encoding: "utf8" },
    );
    fs.rmSync(sentinel, { force: true });
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
    const inputBytes = Buffer.from(
      JSON.stringify(fixture(), null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(
      input,
      inputBytes,
      { mode: 0o600 },
    );
    const inputSha256 =
      crypto.createHash("sha256").update(inputBytes).digest("hex");

    const wrongDigest = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        input,
        "--expected-input-sha256",
        "0".repeat(64),
        "--output",
        path.join(tmp, "wrong-digest-output.json"),
      ],
      { encoding: "utf8" },
    );
    assert.equal(wrongDigest.status, 2);
    assert.match(
      wrongDigest.stderr,
      /COUPLED_LAUNCH_POLICY_INPUT_SHA256_MISMATCH/u,
    );

    const first = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        input,
        "--expected-input-sha256",
        inputSha256,
        "--output",
        output,
        "--test-only",
      ],
      { encoding: "utf8" },
    );
    assert.equal(first.status, 0, first.stderr);
    assert.match(
      first.stdout,
      /VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_TEST_ONLY_GREEN/u,
    );
    assert.match(first.stdout, /production_artifact_authorized=false/u);
    assert.match(first.stdout, /values_selected_by_source=false/u);
    assert.match(first.stdout, /runtime_enforcement_verified=false/u);
    assert.match(
      first.stdout,
      new RegExp("reviewed_input_sha256=" + inputSha256, "u"),
    );
    assert.equal(fs.statSync(output).mode & 0o777, 0o600);
    const persisted = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(
      persisted.marker,
      VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1,
    );
    assert.equal(persisted.production_artifact_authorized, false);
    assert.equal("bundle_id" in persisted, false);

    const productionOutput = path.join(tmp, "production-output.json");
    const productionRun = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        input,
        "--expected-input-sha256",
        inputSha256,
        "--output",
        productionOutput,
      ],
      { encoding: "utf8" },
    );
    assert.equal(productionRun.status, 2);
    assert.match(
      productionRun.stderr,
      /COUPLED_LAUNCH_POLICY_CANONICAL_MAIN_BRANCH_REQUIRED/u,
    );
    assert.equal(fs.existsSync(productionOutput), false);

    const alias = path.join(tmp, "input-alias.json");
    fs.symlinkSync(input, alias);
    const aliasRun = spawnSync(
      process.execPath,
      [
        TOOL,
        "--input",
        alias,
        "--expected-input-sha256",
        inputSha256,
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
        "--expected-input-sha256",
        inputSha256,
        "--output",
        output,
        "--test-only",
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
const coreSource = fs.readFileSync(CORE, "utf8");
const workflowSource = fs.readFileSync(WORKFLOW, "utf8");

assert.equal(
  source.includes("function canonicalLaunchSourceBinding()"),
  false,
  "stale worktree candidate-binding helper must not remain",
);
assert.equal(
  source.includes("headBlobSha1("),
  false,
  "stale branch-local HEAD helper must not remain",
);

const testOnlyStart = source.indexOf(
  "export function testOnlyCompileVoidWcVoidCoupledLaunchPolicyBundleV1",
);
const testOnlyEnd = source.indexOf("function outsideRepository(", testOnlyStart);
assert(testOnlyStart >= 0 && testOnlyEnd > testOnlyStart);
const testOnlyBlock = source.slice(testOnlyStart, testOnlyEnd);
assert.equal(
  testOnlyBlock.includes("bundle_id:digest"),
  false,
  "test-only wrapper must never mint a production bundle id",
);
assert.equal(
  testOnlyBlock.includes(
    "authority:VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1",
  ),
  false,
  "test-only wrapper must never attach production authority",
);

const reviewedTriggerPaths = Object.keys(
  result.canonical_launch_source.reviewed_policy_module_git_blobs,
).sort();
assert.equal(reviewedTriggerPaths.length, 11);
for (const relativePath of reviewedTriggerPaths) {
  const token = '      - "' + relativePath + '"';
  const occurrences = workflowSource.split(token).length - 1;
  assert.equal(
    occurrences,
    2,
    "reviewed module must appear in both PR and main-push triggers: " +
      relativePath,
  );
}
for (const forbiddenAuthoritySurface of [
  '"VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1"',
  "bundle_id",
  "canonical_launch_source",
]) {
  assert.equal(
    coreSource.includes(forbiddenAuthoritySurface),
    false,
    "reviewed semantic core must not mint production authority: " +
      forbiddenAuthoritySurface,
  );
}
assert.equal(
  /(^|[^A-Za-z0-9_])["']?authority["']?\s*:/mu.test(coreSource),
  false,
  "reviewed semantic core must not define a standalone authority property",
);
assert.match(
  coreSource,
  /VOID_WC_VOID_COUPLED_LAUNCH_POLICY_SEMANTIC_CORE_V1/u,
);

{
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-coupled-launch-private-binding-proof-"),
  );
  const sourceRoot = path.join(temp, "source");
  const runnerFile = path.join(temp, "runner.mjs");
  const moduleRel = "tools/reviewed-fixture-v1.mjs";
  const moduleFile = path.join(sourceRoot, moduleRel);
  fs.mkdirSync(path.dirname(moduleFile), { recursive: true, mode: 0o700 });
  const moduleBytes = Buffer.from("export const reviewedFixtureV1=true;\n", "utf8");
  const runnerBytes = Buffer.from("process.stdout.write('green');\n", "utf8");
  fs.writeFileSync(moduleFile, moduleBytes, { mode: 0o400 });
  fs.writeFileSync(runnerFile, runnerBytes, { mode: 0o400 });
  const parentStat = fs.lstatSync(temp);
  const blobHeader = Buffer.from(
    "blob " + String(moduleBytes.length) + "\0",
    "utf8",
  );
  const binding = {
    parent: temp,
    parent_identity: { dev: parentStat.dev, ino: parentStat.ino },
    source_root: sourceRoot,
    runner_file: runnerFile,
    runner_sha256:
      crypto.createHash("sha256").update(runnerBytes).digest("hex"),
    module_git_blobs: {
      [moduleRel]:
        crypto.createHash("sha1").update(blobHeader).update(moduleBytes).digest("hex"),
    },
  };
  try {
    assert.equal(
      testOnlyVerifyVoidWcVoidCoupledLaunchPolicyPrivateExecutionBindingV1(
        binding,
      ),
      true,
    );

    fs.chmodSync(runnerFile, 0o600);
    fs.appendFileSync(runnerFile, "// tampered\n");
    assert.throws(
      () =>
        testOnlyVerifyVoidWcVoidCoupledLaunchPolicyPrivateExecutionBindingV1(
          binding,
        ),
      /COUPLED_LAUNCH_POLICY_PRIVATE_RUNNER_SHA256_MISMATCH/u,
    );
    fs.writeFileSync(runnerFile, runnerBytes, { mode: 0o400 });

    fs.chmodSync(moduleFile, 0o600);
    fs.appendFileSync(moduleFile, "// tampered\n");
    assert.throws(
      () =>
        testOnlyVerifyVoidWcVoidCoupledLaunchPolicyPrivateExecutionBindingV1(
          binding,
        ),
      /COUPLED_LAUNCH_POLICY_PRIVATE_MODULE_.*_GIT_BLOB_MISMATCH/u,
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
for (const forbiddenImport of [
  "./void-wc-void-opening-window-policy-v1.mjs",
  "./void-wc-void-opening-concentration-sybil-policy-v1.mjs",
  "./void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
  "./void-wc-void-opening-minimum-real-wc-depth-policy-v1.mjs",
  "./void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
  "./void-economic-intent-ttl-caps-policy-v1.mjs",
  "./void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
]) {
  assert.equal(
    source.includes('from "' + forbiddenImport + '"'),
    false,
    "parent compiler must not load mutable worktree policy module: " +
      forbiddenImport,
  );
  assert.equal(
    coreSource.includes('from "' + forbiddenImport + '"'),
    true,
    "reviewed core must carry policy import: " + forbiddenImport,
  );
}
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
assert.match(source, /GIT_CONFIG_NOSYSTEM/u);
assert.match(source, /GIT_CONFIG_GLOBAL\s*:\s*"\\/dev\\/null"/u);
assert.match(source, /core\.fsmonitor=false/u);
assert.match(source, /expected-input-sha256/u);
assert.match(source, /parentFd/u);
assert.match(source, /assertPrivateReviewedCompilerBinding/u);
assert.match(source, /COUPLED_LAUNCH_POLICY_PRIVATE_RUNNER/u);
assert.match(source, /fsyncSync\(parentFd\)/u);
assert.match(source, /\/proc\/self\/fd\//u);
assert.match(source, /boundCreatePath/u);
assert.match(source, /fs\.openSync\(\s*boundCreatePath,/u);
assert.match(source, /COUPLED_LAUNCH_POLICY_OUTPUT_DIRFD_IDENTITY_INVALID/u);
assert.match(source, /parentBeforeCreatePath\.ino/u);
assert.match(source, /parentAfterPath\.ino/u);
assert.equal(source.includes("...process.env"), false);
assert.match(source, /reviewedModuleClosure/u);
assert.match(source, /--permission/u);
assert.match(source, /canonicalRemoteMainHead/u);
assert.match(source, /http\.sslVerify=true/u);
assert.match(source, /COUPLED_LAUNCH_POLICY_TOOL_WORKTREE_DRIFT/u);
assert.match(source, /testOnlyCompileVoidWcVoidCoupledLaunchPolicyBundleV1/u);
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
console.log("reviewed_git_object_policy_execution=true");
console.log("reviewed_semantic_core_production_authority=false");
console.log("reviewed_policy_module_count=11");
console.log("reviewed_policy_trigger_closure_complete=true");
console.log("test_only_production_shape_constructed=false");
console.log("canonical_remote_main_external_network_read=true");
console.log("permission_fenced_execution=true");
console.log("hidden_worktree_policy_execution=false");
console.log("production_artifact_from_feature_branch=false");
console.log("private_input_descriptor_bound=true");
console.log("reviewed_private_input_sha256_required=true");
console.log("git_config_isolated=true");
console.log("private_output_parent_identity_bound=true");
console.log("private_output_create_bound_to_parent_fd=true");
console.log("private_output_directory_fsync_green=true");
console.log("all_policy_commitments_precede_open=true");
console.log("hidden_minimum_trade_amount_applied=false");
console.log("production_values_selected_by_source=false");
console.log("runtime_enforcement_verified=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement_authorized=false");
console.log("VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_GREEN");
