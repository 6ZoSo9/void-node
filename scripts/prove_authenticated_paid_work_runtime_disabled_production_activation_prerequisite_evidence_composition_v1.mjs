#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DECISION_MARKER,
  GATE_ID,
  OBSERVER_MARKER,
  PLAN_MARKER,
  PRODUCTION_EXPECTED,
  RESULT_MARKER,
  composeActivationPrerequisiteEvidenceV1,
} from "../tools/void-authenticated-paid-work-runtime-disabled-production-activation-prerequisite-evidence-composition-v1.mjs";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function sha256Canonical(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

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

const stable = PRODUCTION_EXPECTED.stable_plan_bindings;
const observedMain = "ed071cd8209cd64bdb61698868349fc2eaaa2aa2";
const operationId = "void-apw-prerequisite-evidence-composition-proof-v1";

const allTrue = (keys) => Object.fromEntries(keys.map((key) => [key, true]));
const boundary = (keys, trueKeys) => Object.fromEntries(keys.map((key) => [key, trueKeys.includes(key)]));

const plan = canonicalize({
  bindings: {
    execution_receipt_sha256: "297fbd91034587649478e6bc679b9729281edff5c8e23645acb46abaed5a848b",
    final_seal_receipt_sha256: "6f43401af8a751cdfb5bd941881c553ff27a2429c10c04922d6093e2453225b1",
    install_checkpoint_tag: stable.install_checkpoint_tag,
    install_checkpoint_target: stable.install_checkpoint_target,
    install_mechanism_checkpoint_tag: stable.install_mechanism_checkpoint_tag,
    install_mechanism_checkpoint_target: stable.install_mechanism_checkpoint_target,
    install_root: "/home/operator/.local/share/void-node/paid-work-runtime",
    installer_receipt_sha256: "f658e5db26a116c1c650e442dcf18cfba6671c28ebe38e0807caefa6e389d4b8",
    main_commit: stable.main_commit,
    packet_commit: stable.packet_commit,
    packet_id: "voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784",
    pr894_merge: stable.pr894_merge,
    release_id: "paid-work-runtime-disabled-v1-3b298bc1e313-64841279f90d",
    runtime_source_commit: stable.runtime_source_commit,
    runtime_source_sha256: "3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7",
  },
  execution_boundary: boundary([
    "activation_configuration_written",
    "activation_persistence_created",
    "authorization_header_materialized",
    "credential_or_token_read",
    "funds_moved",
    "live_ticket_issued",
    "payment_authorized",
    "payment_executed",
    "quote_accepted",
    "runtime_listener_created",
    "runtime_mounted",
    "separate_activation_execution_lane_required",
    "service_restarted",
    "service_unit_created",
    "transaction_broadcast",
    "trusted_context_provider_called",
    "void_settled",
    "wallet_or_signer_accessed",
    "work_credit_written",
    "work_dispatched",
  ], ["separate_activation_execution_lane_required"]),
  gate_id: GATE_ID,
  gates: allTrue([
    "activation_persistence_absent",
    "caller_asserted_install_checkpoint_matches_configured_expected",
    "caller_asserted_install_mechanism_checkpoint_matches_configured_expected",
    "caller_asserted_main_commit_matches_configured_expected",
    "credential_reference_not_supplied",
    "current_pointer_exact",
    "disabled_configuration_exact",
    "execution_receipt_exact",
    "final_seal_receipt_exact",
    "fund_movement_not_authorized",
    "install_root_owner_private",
    "installed_launcher_disabled",
    "installer_receipt_exact",
    "payment_execution_not_authorized",
    "receipt_chain_exact",
    "release_hashes_exact",
    "release_modes_exact",
    "release_tree_exact",
    "runtime_listener_absent",
    "service_unit_absent",
    "wallet_access_not_authorized",
    "work_credit_write_not_authorized",
  ]),
  generated_at_utc: "2026-08-01T17:00:00Z",
  marker: PLAN_MARKER,
  observation_provenance: { independently_observed: false, source: "caller_assertions" },
  operation_id: operationId,
  required_future_artifacts: allTrue([
    "activation_configuration_instance",
    "activation_configuration_schema",
    "activation_execution_confirmation",
    "bounded_replay_snapshot",
    "credential_reference_metadata",
    "live_canary_scope",
    "rollback_plan",
    "service_unit_design",
    "trusted_context_reference_metadata",
  ]),
  status: "prerequisites_satisfied_activation_forbidden_separate_execution_lane_required",
  version: 1,
});

const decisionAuthority = boundary([
  "activation_persistence_root_create",
  "authorization_header_materialized",
  "configuration_enable_write",
  "credential_or_token_read",
  "external_http_request",
  "fund_movement",
  "installation_mutation",
  "live_ticket_issuance",
  "local_private_decision_write",
  "local_private_plan_write",
  "network_listener_create",
  "payment_authorization",
  "payment_execution",
  "quote_acceptance",
  "runtime_mount",
  "service_restart",
  "service_unit_create",
  "signing",
  "transaction_broadcast",
  "transaction_construction",
  "trusted_context_provider_call",
  "void_settlement",
  "wallet_or_signer_access",
  "work_credit_write",
  "work_dispatch",
  "work_execution_authorization",
], ["local_private_decision_write", "local_private_plan_write"]);

const decision = canonicalize({
  authority: decisionAuthority,
  confirmation_verified: true,
  decision: "hold_activation_separate_execution_lane_required",
  gate_id: GATE_ID,
  marker: DECISION_MARKER,
  operation_id: operationId,
  plan_path: "/private/proof/plan.json",
  plan_sha256: sha256Canonical(plan),
  version: 1,
});

const repositoryRoot = "/tmp/void-apw-evidence-composition-proof-repository";
const command = (purpose, argv, stdout) => ({ argv, exit_code: 0, purpose, stderr: "", stdout });
const gitAt = (...rest) => ["git", "-C", repositoryRoot, ...rest];
const resolve = (purpose, expression, oid) => command(
  purpose,
  gitAt("rev-parse", "--verify", "--end-of-options", `${expression}^{commit}`),
  `${oid}\n`,
);
const catFile = (purpose, oid) => command(purpose, gitAt("cat-file", "-t", oid), "commit\n");

const resolved = canonicalize({
  install_checkpoint_target: stable.install_checkpoint_target,
  install_mechanism_checkpoint_target: stable.install_mechanism_checkpoint_target,
  packet_commit: stable.packet_commit,
  pr894_merge_commit: stable.pr894_merge,
  prerequisite_main_commit: stable.main_commit,
  prerequisite_merge_commit: PRODUCTION_EXPECTED.prerequisite_merge_commit,
  repair_checkpoint_target: PRODUCTION_EXPECTED.repair_merge_commit,
  repair_merge_commit: PRODUCTION_EXPECTED.repair_merge_commit,
  runtime_source_commit: stable.runtime_source_commit,
});

const lineage = [
  [stable.runtime_source_commit, stable.packet_commit],
  [stable.packet_commit, stable.pr894_merge],
  [stable.pr894_merge, stable.main_commit],
  [stable.main_commit, PRODUCTION_EXPECTED.prerequisite_merge_commit],
  [PRODUCTION_EXPECTED.prerequisite_merge_commit, PRODUCTION_EXPECTED.repair_merge_commit],
  [PRODUCTION_EXPECTED.repair_merge_commit, observedMain],
];

const commands = [
  command("identify Git implementation", ["git", "--version"], "git version 2.51.0\n"),
  command("resolve repository top level", gitAt("rev-parse", "--show-toplevel"), `${repositoryRoot}\n`),
  resolve("resolve HEAD", "HEAD", observedMain),
  resolve("resolve origin main", "refs/remotes/origin/main", observedMain),
  ...Object.entries(resolved).map(([key, oid]) => resolve(`resolve configured ${key}`, oid, oid)),
  resolve(`resolve tag ${stable.install_checkpoint_tag}`, `refs/tags/${stable.install_checkpoint_tag}`, stable.install_checkpoint_target),
  resolve(`resolve tag ${stable.install_mechanism_checkpoint_tag}`, `refs/tags/${stable.install_mechanism_checkpoint_tag}`, stable.install_mechanism_checkpoint_target),
  resolve(`resolve tag ${PRODUCTION_EXPECTED.repair_checkpoint_tag}`, `refs/tags/${PRODUCTION_EXPECTED.repair_checkpoint_tag}`, PRODUCTION_EXPECTED.repair_merge_commit),
  ...lineage.map(([ancestor, descendant], index) => command(
    `verify lineage ${index}`,
    gitAt("merge-base", "--is-ancestor", ancestor, descendant),
    "",
  )),
  ...Object.values(resolved).map((oid, index) => catFile(`confirm commit type ${index}`, oid)),
];

assert.ok(commands.length >= 30);

const observer = canonicalize({
  execution_boundary: boundary([
    "activation_configuration_written",
    "credential_or_token_read",
    "external_network_request",
    "fund_movement",
    "git_fetch",
    "git_ref_write",
    "payment_execution",
    "read_only",
    "runtime_listener_created",
    "separate_activation_execution_lane_required",
    "service_restart",
    "wallet_or_signer_access",
    "work_credit_write",
    "work_dispatch",
  ], ["read_only", "separate_activation_execution_lane_required"]),
  gates: allTrue([
    "all_configured_commits_observed_exact",
    "checkpoint_targets_observed_exact",
    "complete_lineage_observed_exact",
    "repair_merge_retained_by_observed_main",
    "repository_top_level_observed_exact",
  ]),
  marker: OBSERVER_MARKER,
  observation_provenance: {
    command_count: commands.length,
    commands,
    config_sha256: PRODUCTION_EXPECTED.observer_config_sha256,
    git_version: "git version 2.51.0",
    independently_observed: true,
    repository_root: repositoryRoot,
    source: "local_git_cli",
  },
  observations: {
    install_checkpoint: { name: stable.install_checkpoint_tag, target: stable.install_checkpoint_target },
    install_mechanism_checkpoint: { name: stable.install_mechanism_checkpoint_tag, target: stable.install_mechanism_checkpoint_target },
    lineage: lineage.map(([ancestor, descendant]) => ({ ancestor, descendant, verified: true })),
    observed_head_commit: observedMain,
    observed_main_commit: observedMain,
    repair_checkpoint: { name: PRODUCTION_EXPECTED.repair_checkpoint_tag, target: PRODUCTION_EXPECTED.repair_merge_commit },
    resolved_configured_commits: resolved,
  },
  observed_at_utc: "2026-08-01T17:01:00Z",
  status: "git_checkpoint_lineage_observed_exact_activation_forbidden",
  version: 1,
});

const result = composeActivationPrerequisiteEvidenceV1(plan, decision, observer, {
  now: () => new Date("2026-08-01T17:02:00.000Z"),
});

assert.equal(result.marker, RESULT_MARKER);
assert.equal(result.status, "independent_git_evidence_composed_activation_forbidden_separate_execution_lane_required");
assert.equal(result.composed_at_utc, "2026-08-01T17:02:00Z");
assert.equal(result.evidence_bindings.plan_sha256, decision.plan_sha256);
assert.equal(result.evidence_bindings.observed_main_commit, observedMain);
assert.equal(result.evidence_bindings.prerequisite_merge_commit, PRODUCTION_EXPECTED.prerequisite_merge_commit);
assert.equal(result.evidence_bindings.repair_merge_commit, PRODUCTION_EXPECTED.repair_merge_commit);
assert.equal(result.evidence_provenance.git_checkpoint_state_independently_observed, true);
assert.equal(result.evidence_provenance.prerequisite_plan_provenance_preserved_as_caller_assertions, true);
assert.ok(Object.values(result.gates).every((value) => value === true));
assert.equal(result.execution_boundary.read_only, true);
assert.equal(result.execution_boundary.separate_activation_execution_lane_required, true);
for (const [key, value] of Object.entries(result.execution_boundary)) {
  if (!['read_only', 'separate_activation_execution_lane_required'].includes(key)) {
    assert.equal(value, false, `forbidden output boundary enabled: ${key}`);
  }
}

const mutations = [
  ["decision hash", decision, (value) => { value.plan_sha256 = "0".repeat(64); }, /decision plan SHA-256 mismatch/],
  ["decision operation", decision, (value) => { value.operation_id = "wrong"; }, /decision operation ID does not bind plan/],
  ["plan provenance upgrade", plan, (value) => { value.observation_provenance.independently_observed = true; }, /plan provenance must remain caller-asserted/],
  ["observer provenance downgrade", observer, (value) => { value.observation_provenance.independently_observed = false; }, /observer must be independently observed/],
  ["observer config", observer, (value) => { value.observation_provenance.config_sha256 = "f".repeat(64); }, /observer config SHA-256 mismatch/],
  ["mutable Git command", observer, (value) => { value.observation_provenance.commands[1].argv = gitAt("fetch", "origin"); }, /outside the read-only allowlist/],
  ["binding drift", observer, (value) => { value.observations.resolved_configured_commits.packet_commit = stable.runtime_source_commit; }, /packet_commit does not cross-bind plan/],
  ["observer boundary", observer, (value) => { value.execution_boundary.git_ref_write = true; }, /observer execution boundary.git_ref_write must be false/],
  ["extra plan key", plan, (value) => { value.activation_authorized = true; }, /plan keys mismatch/],
];

for (const [label, base, mutate, pattern] of mutations) {
  const candidate = clone(base);
  mutate(candidate);
  const args = label.startsWith("decision")
    ? [plan, candidate, observer]
    : label.startsWith("plan") || label.startsWith("extra plan")
      ? [candidate, decision, observer]
      : [plan, decision, candidate];
  assert.throws(() => composeActivationPrerequisiteEvidenceV1(...args), pattern, label);
}

const root = mkdtempSync(path.join(tmpdir(), "void-apw-evidence-composition-v1-proof-"));
try {
  const planPath = path.join(root, "plan.json");
  const decisionPath = path.join(root, "decision.json");
  const observerPath = path.join(root, "observer.json");
  const before = [plan, decision, observer].map((value) => `${JSON.stringify(value, null, 2)}\n`);
  for (const [target, content] of [[planPath, before[0]], [decisionPath, before[1]], [observerPath, before[2]]]) {
    writeFileSync(target, content, { mode: 0o600 });
  }

  const toolPath = fileURLToPath(new URL(
    "../tools/void-authenticated-paid-work-runtime-disabled-production-activation-prerequisite-evidence-composition-v1.mjs",
    import.meta.url,
  ));
  const cli = run(process.execPath, [
    toolPath,
    "--plan", planPath,
    "--decision", decisionPath,
    "--git-observer", observerPath,
  ]);
  const cliResult = JSON.parse(cli.stdout);
  assert.equal(cliResult.marker, RESULT_MARKER);
  assert.equal(cliResult.gates.activation_remains_forbidden, true);
  assert.deepEqual([readFileSync(planPath, "utf8"), readFileSync(decisionPath, "utf8"), readFileSync(observerPath, "utf8")], before);

  chmodSync(observerPath, 0o644);
  const broadMode = run(process.execPath, [
    toolPath,
    "--plan", planPath,
    "--decision", decisionPath,
    "--git-observer", observerPath,
  ], { check: false });
  assert.equal(broadMode.status, 1);
  assert.match(broadMode.stderr, /Git observer receipt mode must be 0600/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_EVIDENCE_COMPOSITION_V1_PROOF_GREEN");
console.log("canonical_plan_decision_binding_exact=true");
console.log("caller_assertion_provenance_preserved=true");
console.log("independent_git_observer_provenance_exact=true");
console.log("production_observer_config_binding_exact=true");
console.log("checkpoint_and_commit_cross_binding_exact=true");
console.log("read_only_git_command_allowlist_exact=true");
console.log("mutable_git_command_rejected=true");
console.log("input_mode_0600_enforced=true");
console.log("input_files_unchanged=true");
console.log("git_command_executed=false");
console.log("git_ref_write=false");
console.log("external_network_request=false");
console.log("activation_configuration_written=false");
console.log("credential_or_token_read=false");
console.log("service_restart=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("fund_movement=false");
console.log("activation_forbidden_separate_execution_lane_required=true");
