#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BLOCKING_REQUIREMENTS,
  COMPOSITION_MARKER,
  GATE_ID,
  RESULT_MARKER,
  decideActivationReadinessV1,
} from "../tools/void-authenticated-paid-work-runtime-disabled-production-activation-readiness-decision-v1.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
  });
  if (result.error) throw result.error;
  if (options.check !== false && result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

const allTrue = (keys) => Object.fromEntries(keys.map((key) => [key, true]));
const boundary = (keys, trueKeys) =>
  Object.fromEntries(keys.map((key) => [key, trueKeys.includes(key)]));

const compositionGateKeys = [
  "activation_remains_forbidden",
  "decision_binds_canonical_plan",
  "git_checkpoint_evidence_independently_observed",
  "git_command_transcript_read_only_exact",
  "observer_binds_production_configuration",
  "observer_cross_binds_prerequisite_plan",
  "prerequisite_plan_and_hold_decision_exact",
  "separate_activation_execution_lane_required",
];

const compositionBoundaryKeys = [
  "activation_configuration_written",
  "credential_or_token_read",
  "external_network_request",
  "fund_movement",
  "git_command_executed",
  "git_ref_write",
  "input_file_write",
  "payment_execution",
  "read_only",
  "runtime_listener_created",
  "separate_activation_execution_lane_required",
  "service_restart",
  "wallet_or_signer_access",
  "work_credit_write",
  "work_dispatch",
];

const composition = {
  composed_at_utc: "2026-08-01T17:02:00Z",
  evidence_bindings: {
    decision_sha256: "1".repeat(64),
    git_observer_command_transcript_sha256: "2".repeat(64),
    git_observer_config_sha256:
      "0e42f5872ed119e67cd3ce7a3afca4442c52f15ca09bbd7229867a5ba14050dc",
    git_observer_receipt_sha256: "3".repeat(64),
    install_checkpoint_tag:
      "ckpt-authenticated-paid-work-runtime-disabled-production-install-v1-exact-green-20260731T190348Z",
    install_checkpoint_target: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
    install_mechanism_checkpoint_tag:
      "ckpt-authenticated-paid-work-runtime-disabled-production-install-mechanism-v1-postmerge-exact-green-20260731T184300Z",
    install_mechanism_checkpoint_target:
      "3074bd4f253082841630312a8353946321b5a97e",
    observed_main_commit: "ed071cd8209cd64bdb61698868349fc2eaaa2aa2",
    packet_commit: "eaa41fdf76044c88eb9c078046bd370acb3ee457",
    plan_sha256: "4".repeat(64),
    pr894_merge_commit: "3074bd4f253082841630312a8353946321b5a97e",
    prerequisite_main_commit: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
    prerequisite_merge_commit: "25db3a0b0ff802914ef40bacabcbbda3779866cd",
    repair_checkpoint_tag:
      "ckpt-authenticated-paid-work-runtime-disabled-production-activation-prerequisites-v1-postmerge-ci-repair-chain-exact-green-20260801T152006Z",
    repair_merge_commit: "e46619b4eba306dd0727e93ef87f52b68f724852",
    runtime_source_commit: "3b298bc1e31365aec7a20d03c3f425e22fd2f949",
  },
  evidence_provenance: {
    git_checkpoint_state_independently_observed: true,
    prerequisite_plan_provenance_preserved_as_caller_assertions: true,
    source: "prerequisite_plan_hold_decision_plus_independent_local_git_observer",
  },
  execution_boundary: boundary(
    compositionBoundaryKeys,
    ["read_only", "separate_activation_execution_lane_required"],
  ),
  gates: allTrue(compositionGateKeys),
  git_observer_marker:
    "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_GIT_OBSERVER_RESULT_V1",
  marker: COMPOSITION_MARKER,
  operation_id: "void-apw-readiness-decision-proof-v1",
  prerequisite_gate_id: GATE_ID,
  status:
    "independent_git_evidence_composed_activation_forbidden_separate_execution_lane_required",
  version: 1,
};

const result = decideActivationReadinessV1(composition, {
  now: () => new Date("2026-08-01T17:05:00.000Z"),
});
assert.equal(result.marker, RESULT_MARKER);
assert.equal(result.decision, "HOLD");
assert.equal(result.ready, false);
assert.equal(result.status, "required_future_artifacts_unvalidated_activation_hold");
assert.equal(result.evaluated_at_utc, "2026-08-01T17:05:00Z");
assert.deepEqual(result.blocking_requirements, BLOCKING_REQUIREMENTS);
assert.equal(result.blocking_requirements.length, 9);
assert.match(result.composition_evidence.composition_sha256, /^[0-9a-f]{64}$/u);
assert.equal(
  result.composition_evidence.observed_main_commit,
  composition.evidence_bindings.observed_main_commit,
);
assert.equal(result.execution_boundary.read_only, true);
assert.equal(result.execution_boundary.separate_activation_execution_lane_required, true);
for (const [key, value] of Object.entries(result.execution_boundary)) {
  if (!["read_only", "separate_activation_execution_lane_required"].includes(key)) {
    assert.equal(value, false, `forbidden output boundary enabled: ${key}`);
  }
}

const mutations = [
  ["composition marker", (value) => { value.marker = "wrong"; }, /composition marker mismatch/],
  ["extra composition key", (value) => { value.activation_authorized = true; }, /composition keys mismatch/],
  ["production binding", (value) => { value.evidence_bindings.prerequisite_merge_commit = "f".repeat(40); }, /production binding drift/],
  ["observer provenance", (value) => { value.evidence_provenance.git_checkpoint_state_independently_observed = false; }, /independently observed/],
  ["composition gate", (value) => { value.gates.activation_remains_forbidden = false; }, /must be true/],
  ["composition boundary", (value) => { value.execution_boundary.payment_execution = true; }, /must be false/],
];

for (const [label, mutate, pattern] of mutations) {
  const candidate = clone(composition);
  mutate(candidate);
  assert.throws(
    () => decideActivationReadinessV1(candidate, {
      now: () => new Date("2026-08-01T17:05:00.000Z"),
    }),
    pattern,
    label,
  );
}

const root = mkdtempSync(path.join(tmpdir(), "void-apw-readiness-decision-v1-proof-"));
try {
  const inputPath = path.join(root, "composition.json");
  const before = `${JSON.stringify(composition, null, 2)}\n`;
  writeFileSync(inputPath, before, { mode: 0o600 });
  const toolPath = fileURLToPath(new URL(
    "../tools/void-authenticated-paid-work-runtime-disabled-production-activation-readiness-decision-v1.mjs",
    import.meta.url,
  ));
  const cli = run(process.execPath, [
    toolPath,
    "--evidence-composition", inputPath,
    "--evaluated-at-utc", "2026-08-01T17:05:00Z",
  ]);
  const cliResult = JSON.parse(cli.stdout);
  assert.equal(cliResult.marker, RESULT_MARKER);
  assert.equal(cliResult.decision, "HOLD");
  assert.equal(readFileSync(inputPath, "utf8"), before);

  chmodSync(inputPath, 0o644);
  const broadMode = run(process.execPath, [
    toolPath,
    "--evidence-composition", inputPath,
  ], { check: false });
  assert.equal(broadMode.status, 1);
  assert.match(broadMode.stderr, /mode must be 0600/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_READINESS_DECISION_V1_PROOF_GREEN");
console.log("composition_contract_exact=true");
console.log("production_bindings_exact=true");
console.log("independent_observer_provenance_required=true");
console.log("blocking_requirement_count=9");
console.log("decision=HOLD");
console.log("ready=false");
console.log("input_mode_0600_enforced=true");
console.log("input_file_unchanged=true");
console.log("external_network_request=false");
console.log("git_command_executed=false");
console.log("deployment=false");
console.log("activation_authorized=false");
console.log("activation_configuration_written=false");
console.log("credential_or_token_read=false");
console.log("service_restart=false");
console.log("runtime_listener_created=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log("separate_activation_execution_lane_required=true");
