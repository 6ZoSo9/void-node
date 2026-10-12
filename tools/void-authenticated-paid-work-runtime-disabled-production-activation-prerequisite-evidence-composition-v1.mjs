#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_EVIDENCE_COMPOSITION_RESULT_V1";
export const PLAN_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_PLAN_V1";
export const DECISION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_DECISION_V1";
export const OBSERVER_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_GIT_OBSERVER_RESULT_V1";
export const GATE_ID =
  "void.authenticated-paid-work.disabled-runtime.activation-prerequisites.v1";
export const VERSION = 1;

const OID = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

const PLAN_GATE_KEYS = [
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
];

const FUTURE_ARTIFACT_KEYS = [
  "activation_configuration_instance",
  "activation_configuration_schema",
  "activation_execution_confirmation",
  "bounded_replay_snapshot",
  "credential_reference_metadata",
  "live_canary_scope",
  "rollback_plan",
  "service_unit_design",
  "trusted_context_reference_metadata",
];

const PLAN_BOUNDARY_KEYS = [
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
];

const DECISION_AUTHORITY_KEYS = [
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
];

const OBSERVER_BOUNDARY_KEYS = [
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
];

const OBSERVER_GATE_KEYS = [
  "all_configured_commits_observed_exact",
  "checkpoint_targets_observed_exact",
  "complete_lineage_observed_exact",
  "repair_merge_retained_by_observed_main",
  "repository_top_level_observed_exact",
];

const RESOLVED_COMMIT_KEYS = [
  "install_checkpoint_target",
  "install_mechanism_checkpoint_target",
  "packet_commit",
  "pr894_merge_commit",
  "prerequisite_main_commit",
  "prerequisite_merge_commit",
  "repair_checkpoint_target",
  "repair_merge_commit",
  "runtime_source_commit",
];

const OUTPUT_BOUNDARY_KEYS = [
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

export const PRODUCTION_EXPECTED = Object.freeze({
  observer_config_sha256: "0e42f5872ed119e67cd3ce7a3afca4442c52f15ca09bbd7229867a5ba14050dc",
  prerequisite_merge_commit: "25db3a0b0ff802914ef40bacabcbbda3779866cd",
  repair_checkpoint_tag:
    "ckpt-authenticated-paid-work-runtime-disabled-production-activation-prerequisites-v1-postmerge-ci-repair-chain-exact-green-20260801T152006Z",
  repair_merge_commit: "e46619b4eba306dd0727e93ef87f52b68f724852",
  stable_plan_bindings: Object.freeze({
    install_checkpoint_tag:
      "ckpt-authenticated-paid-work-runtime-disabled-production-install-v1-exact-green-20260731T190348Z",
    install_checkpoint_target: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
    install_mechanism_checkpoint_tag:
      "ckpt-authenticated-paid-work-runtime-disabled-production-install-mechanism-v1-postmerge-exact-green-20260731T184300Z",
    install_mechanism_checkpoint_target: "3074bd4f253082841630312a8353946321b5a97e",
    main_commit: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
    packet_commit: "eaa41fdf76044c88eb9c078046bd370acb3ee457",
    pr894_merge: "3074bd4f253082841630312a8353946321b5a97e",
    runtime_source_commit: "3b298bc1e31365aec7a20d03c3f425e22fd2f949",
  }),
});

function fail(message) {
  throw new Error(`${RESULT_MARKER}: ${message}`);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

function exactKeys(value, keys, label) {
  requireCondition(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  requireCondition(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label} keys mismatch`,
  );
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireString(value, label) {
  requireCondition(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
}

function requireOid(value, label) {
  requireCondition(OID.test(value), `${label} must be a lowercase Git object ID`);
}

function requireSha256(value, label) {
  requireCondition(SHA256.test(value), `${label} must be a lowercase SHA-256 digest`);
}

function requireUtcSeconds(value, label) {
  requireCondition(UTC_SECONDS.test(value), `${label} must be UTC seconds`);
}

function requireAllTrue(value, keys, label) {
  exactKeys(value, keys, label);
  for (const key of keys) requireCondition(value[key] === true, `${label}.${key} must be true`);
}

function requireBoundary(value, keys, trueKeys, label) {
  exactKeys(value, keys, label);
  for (const key of keys) {
    const expected = trueKeys.includes(key);
    requireCondition(value[key] === expected, `${label}.${key} must be ${expected}`);
  }
}

function validateExpected(expected) {
  exactKeys(
    expected,
    [
      "observer_config_sha256",
      "prerequisite_merge_commit",
      "repair_checkpoint_tag",
      "repair_merge_commit",
      "stable_plan_bindings",
    ],
    "expected production bindings",
  );
  requireSha256(expected.observer_config_sha256, "expected observer config SHA-256");
  requireOid(expected.prerequisite_merge_commit, "expected prerequisite merge commit");
  requireOid(expected.repair_merge_commit, "expected repair merge commit");
  requireString(expected.repair_checkpoint_tag, "expected repair checkpoint tag");
  exactKeys(
    expected.stable_plan_bindings,
    [
      "install_checkpoint_tag",
      "install_checkpoint_target",
      "install_mechanism_checkpoint_tag",
      "install_mechanism_checkpoint_target",
      "main_commit",
      "packet_commit",
      "pr894_merge",
      "runtime_source_commit",
    ],
    "expected stable plan bindings",
  );
  for (const [key, value] of Object.entries(expected.stable_plan_bindings)) {
    if (key.endsWith("_tag")) requireString(value, `expected stable plan bindings.${key}`);
    else requireOid(value, `expected stable plan bindings.${key}`);
  }
  return expected;
}

function validatePlan(plan, expected) {
  exactKeys(
    plan,
    [
      "bindings",
      "execution_boundary",
      "gate_id",
      "gates",
      "generated_at_utc",
      "marker",
      "observation_provenance",
      "operation_id",
      "required_future_artifacts",
      "status",
      "version",
    ],
    "plan",
  );
  requireCondition(plan.marker === PLAN_MARKER, "plan marker mismatch");
  requireCondition(plan.version === VERSION, "plan version mismatch");
  requireCondition(plan.gate_id === GATE_ID, "plan gate ID mismatch");
  requireString(plan.operation_id, "plan operation ID");
  requireUtcSeconds(plan.generated_at_utc, "plan generated_at_utc");
  requireCondition(
    plan.status === "prerequisites_satisfied_activation_forbidden_separate_execution_lane_required",
    "plan status mismatch",
  );
  exactKeys(plan.observation_provenance, ["independently_observed", "source"], "plan observation provenance");
  requireCondition(plan.observation_provenance.source === "caller_assertions", "plan provenance source mismatch");
  requireCondition(plan.observation_provenance.independently_observed === false, "plan provenance must remain caller-asserted");
  requireAllTrue(plan.gates, PLAN_GATE_KEYS, "plan gates");
  requireAllTrue(plan.required_future_artifacts, FUTURE_ARTIFACT_KEYS, "plan required future artifacts");
  requireBoundary(
    plan.execution_boundary,
    PLAN_BOUNDARY_KEYS,
    ["separate_activation_execution_lane_required"],
    "plan execution boundary",
  );

  const bindingKeys = [
    "execution_receipt_sha256",
    "final_seal_receipt_sha256",
    "install_checkpoint_tag",
    "install_checkpoint_target",
    "install_mechanism_checkpoint_tag",
    "install_mechanism_checkpoint_target",
    "install_root",
    "installer_receipt_sha256",
    "main_commit",
    "packet_commit",
    "packet_id",
    "pr894_merge",
    "release_id",
    "runtime_source_commit",
    "runtime_source_sha256",
  ];
  exactKeys(plan.bindings, bindingKeys, "plan bindings");
  for (const key of bindingKeys.filter((item) => item.endsWith("_sha256"))) {
    requireSha256(plan.bindings[key], `plan bindings.${key}`);
  }
  for (const key of [
    "install_checkpoint_target",
    "install_mechanism_checkpoint_target",
    "main_commit",
    "packet_commit",
    "pr894_merge",
    "runtime_source_commit",
  ]) requireOid(plan.bindings[key], `plan bindings.${key}`);
  for (const key of ["install_checkpoint_tag", "install_mechanism_checkpoint_tag", "install_root", "packet_id", "release_id"]) {
    requireString(plan.bindings[key], `plan bindings.${key}`);
  }
  for (const [key, value] of Object.entries(expected.stable_plan_bindings)) {
    requireCondition(plan.bindings[key] === value, `plan bindings.${key} production binding mismatch`);
  }
  return plan;
}

function validateDecision(decision, plan) {
  exactKeys(
    decision,
    ["authority", "confirmation_verified", "decision", "gate_id", "marker", "operation_id", "plan_path", "plan_sha256", "version"],
    "decision",
  );
  requireCondition(decision.marker === DECISION_MARKER, "decision marker mismatch");
  requireCondition(decision.version === VERSION, "decision version mismatch");
  requireCondition(decision.gate_id === GATE_ID, "decision gate ID mismatch");
  requireCondition(decision.operation_id === plan.operation_id, "decision operation ID does not bind plan");
  requireCondition(decision.confirmation_verified === true, "decision confirmation not verified");
  requireCondition(
    decision.decision === "hold_activation_separate_execution_lane_required",
    "decision must continue to hold activation",
  );
  requireString(decision.plan_path, "decision plan path");
  requireSha256(decision.plan_sha256, "decision plan SHA-256");
  requireCondition(decision.plan_sha256 === sha256(canonicalJson(plan)), "decision plan SHA-256 mismatch");
  exactKeys(decision.authority, DECISION_AUTHORITY_KEYS, "decision authority");
  for (const key of DECISION_AUTHORITY_KEYS) {
    const expected = key === "local_private_plan_write" || key === "local_private_decision_write";
    requireCondition(decision.authority[key] === expected, `decision authority.${key} must be ${expected}`);
  }
  return decision;
}

function validateCommandTranscript(observer) {
  const provenance = observer.observation_provenance;
  requireCondition(Array.isArray(provenance.commands), "observer commands must be an array");
  requireCondition(provenance.commands.length >= 30, "observer command transcript is incomplete");
  requireCondition(provenance.command_count === provenance.commands.length, "observer command count mismatch");
  const repositoryRoot = provenance.repository_root;
  const commands = provenance.commands;

  for (const [index, command] of commands.entries()) {
    exactKeys(command, ["argv", "exit_code", "purpose", "stderr", "stdout"], `observer command ${index}`);
    requireCondition(Array.isArray(command.argv) && command.argv.every((item) => typeof item === "string"), `observer command ${index} argv invalid`);
    requireCondition(command.exit_code === 0, `observer command ${index} did not succeed`);
    requireString(command.purpose, `observer command ${index} purpose`);
    requireCondition(typeof command.stderr === "string" && typeof command.stdout === "string", `observer command ${index} output invalid`);
    requireCondition(command.argv[0] === "git", `observer command ${index} did not invoke git`);

    if (JSON.stringify(command.argv) === JSON.stringify(["git", "--version"])) continue;
    requireCondition(
      command.argv.length >= 5 && command.argv[1] === "-C" && command.argv[2] === repositoryRoot,
      `observer command ${index} repository binding mismatch`,
    );
    const rest = command.argv.slice(3);
    const allowed =
      JSON.stringify(rest) === JSON.stringify(["rev-parse", "--show-toplevel"]) ||
      (rest.length === 4 && rest[0] === "rev-parse" && rest[1] === "--verify" && rest[2] === "--end-of-options") ||
      (rest.length === 3 && rest[0] === "cat-file" && rest[1] === "-t" && OID.test(rest[2])) ||
      (rest.length === 4 && rest[0] === "merge-base" && rest[1] === "--is-ancestor" && OID.test(rest[2]) && OID.test(rest[3]));
    requireCondition(allowed, `observer command ${index} is outside the read-only allowlist`);
  }

  const findResolution = (expression, expectedValue, label) => {
    const match = commands.find((command) => {
      const argv = command.argv;
      return argv.length === 7 && argv[3] === "rev-parse" && argv[4] === "--verify" && argv[5] === "--end-of-options" && argv[6] === expression;
    });
    requireCondition(match, `${label} resolution missing from observer transcript`);
    requireCondition(match.stdout.trim() === expectedValue, `${label} transcript output mismatch`);
  };
  return { commands, findResolution };
}

function validateObserver(observer, plan, expected) {
  exactKeys(
    observer,
    ["execution_boundary", "gates", "marker", "observation_provenance", "observations", "observed_at_utc", "status", "version"],
    "observer result",
  );
  requireCondition(observer.marker === OBSERVER_MARKER, "observer marker mismatch");
  requireCondition(observer.version === VERSION, "observer version mismatch");
  requireUtcSeconds(observer.observed_at_utc, "observer observed_at_utc");
  requireCondition(observer.status === "git_checkpoint_lineage_observed_exact_activation_forbidden", "observer status mismatch");
  requireAllTrue(observer.gates, OBSERVER_GATE_KEYS, "observer gates");
  requireBoundary(
    observer.execution_boundary,
    OBSERVER_BOUNDARY_KEYS,
    ["read_only", "separate_activation_execution_lane_required"],
    "observer execution boundary",
  );

  exactKeys(
    observer.observation_provenance,
    ["command_count", "commands", "config_sha256", "git_version", "independently_observed", "repository_root", "source"],
    "observer provenance",
  );
  requireCondition(observer.observation_provenance.source === "local_git_cli", "observer provenance source mismatch");
  requireCondition(observer.observation_provenance.independently_observed === true, "observer must be independently observed");
  requireCondition(observer.observation_provenance.config_sha256 === expected.observer_config_sha256, "observer config SHA-256 mismatch");
  requireString(observer.observation_provenance.git_version, "observer git version");
  requireString(observer.observation_provenance.repository_root, "observer repository root");

  exactKeys(
    observer.observations,
    ["install_checkpoint", "install_mechanism_checkpoint", "lineage", "observed_head_commit", "observed_main_commit", "repair_checkpoint", "resolved_configured_commits"],
    "observer observations",
  );
  requireOid(observer.observations.observed_head_commit, "observer observed HEAD");
  requireOid(observer.observations.observed_main_commit, "observer observed main");
  exactKeys(observer.observations.resolved_configured_commits, RESOLVED_COMMIT_KEYS, "observer resolved configured commits");
  for (const key of RESOLVED_COMMIT_KEYS) requireOid(observer.observations.resolved_configured_commits[key], `observer resolved configured commits.${key}`);

  const expectedResolved = {
    install_checkpoint_target: plan.bindings.install_checkpoint_target,
    install_mechanism_checkpoint_target: plan.bindings.install_mechanism_checkpoint_target,
    packet_commit: plan.bindings.packet_commit,
    pr894_merge_commit: plan.bindings.pr894_merge,
    prerequisite_main_commit: plan.bindings.main_commit,
    prerequisite_merge_commit: expected.prerequisite_merge_commit,
    repair_checkpoint_target: expected.repair_merge_commit,
    repair_merge_commit: expected.repair_merge_commit,
    runtime_source_commit: plan.bindings.runtime_source_commit,
  };
  for (const [key, value] of Object.entries(expectedResolved)) {
    requireCondition(observer.observations.resolved_configured_commits[key] === value, `observer ${key} does not cross-bind plan`);
  }

  const checkpointExpectations = [
    ["install_checkpoint", plan.bindings.install_checkpoint_tag, plan.bindings.install_checkpoint_target],
    ["install_mechanism_checkpoint", plan.bindings.install_mechanism_checkpoint_tag, plan.bindings.install_mechanism_checkpoint_target],
    ["repair_checkpoint", expected.repair_checkpoint_tag, expected.repair_merge_commit],
  ];
  for (const [key, name, target] of checkpointExpectations) {
    exactKeys(observer.observations[key], ["name", "target"], `observer observations.${key}`);
    requireCondition(observer.observations[key].name === name, `observer ${key} name mismatch`);
    requireCondition(observer.observations[key].target === target, `observer ${key} target mismatch`);
  }

  requireCondition(Array.isArray(observer.observations.lineage) && observer.observations.lineage.length === 6, "observer lineage must contain six edges");
  const expectedLineage = [
    [plan.bindings.runtime_source_commit, plan.bindings.packet_commit],
    [plan.bindings.packet_commit, plan.bindings.pr894_merge],
    [plan.bindings.pr894_merge, plan.bindings.main_commit],
    [plan.bindings.main_commit, expected.prerequisite_merge_commit],
    [expected.prerequisite_merge_commit, expected.repair_merge_commit],
    [expected.repair_merge_commit, observer.observations.observed_main_commit],
  ];
  for (const [index, edge] of observer.observations.lineage.entries()) {
    exactKeys(edge, ["ancestor", "descendant", "verified"], `observer lineage edge ${index}`);
    requireCondition(edge.ancestor === expectedLineage[index][0], `observer lineage edge ${index} ancestor mismatch`);
    requireCondition(edge.descendant === expectedLineage[index][1], `observer lineage edge ${index} descendant mismatch`);
    requireCondition(edge.verified === true, `observer lineage edge ${index} is not verified`);
  }

  const transcript = validateCommandTranscript(observer);
  transcript.findResolution("refs/remotes/origin/main^{commit}", observer.observations.observed_main_commit, "origin main");
  for (const [key, value] of Object.entries(expectedResolved)) transcript.findResolution(`${value}^{commit}`, value, `configured ${key}`);
  for (const [, name, target] of checkpointExpectations) transcript.findResolution(`refs/tags/${name}^{commit}`, target, `checkpoint ${name}`);
  for (const [ancestor, descendant] of expectedLineage) {
    const match = transcript.commands.find((command) => JSON.stringify(command.argv.slice(3)) === JSON.stringify(["merge-base", "--is-ancestor", ancestor, descendant]));
    requireCondition(match, `observer lineage transcript missing ${ancestor}..${descendant}`);
  }
  return observer;
}

function secondsUtc(now) {
  const value = now().toISOString().replace(/\.\d{3}Z$/u, "Z");
  requireUtcSeconds(value, "composition clock");
  return value;
}

export function composeActivationPrerequisiteEvidenceV1(planValue, decisionValue, observerValue, options = {}) {
  const expected = validateExpected(options.expected ?? PRODUCTION_EXPECTED);
  const plan = validatePlan(planValue, expected);
  const decision = validateDecision(decisionValue, plan);
  const observer = validateObserver(observerValue, plan, expected);
  const commandsSha256 = sha256(canonicalJson(observer.observation_provenance.commands));

  return canonicalize({
    composed_at_utc: secondsUtc(options.now ?? (() => new Date())),
    evidence_bindings: {
      decision_sha256: sha256(canonicalJson(decision)),
      git_observer_command_transcript_sha256: commandsSha256,
      git_observer_config_sha256: observer.observation_provenance.config_sha256,
      git_observer_receipt_sha256: sha256(canonicalJson(observer)),
      install_checkpoint_tag: plan.bindings.install_checkpoint_tag,
      install_checkpoint_target: plan.bindings.install_checkpoint_target,
      install_mechanism_checkpoint_tag: plan.bindings.install_mechanism_checkpoint_tag,
      install_mechanism_checkpoint_target: plan.bindings.install_mechanism_checkpoint_target,
      observed_main_commit: observer.observations.observed_main_commit,
      packet_commit: plan.bindings.packet_commit,
      plan_sha256: sha256(canonicalJson(plan)),
      pr894_merge_commit: plan.bindings.pr894_merge,
      prerequisite_main_commit: plan.bindings.main_commit,
      prerequisite_merge_commit: expected.prerequisite_merge_commit,
      repair_checkpoint_tag: expected.repair_checkpoint_tag,
      repair_merge_commit: expected.repair_merge_commit,
      runtime_source_commit: plan.bindings.runtime_source_commit,
    },
    evidence_provenance: {
      git_checkpoint_state_independently_observed: true,
      prerequisite_plan_provenance_preserved_as_caller_assertions: true,
      source: "prerequisite_plan_hold_decision_plus_independent_local_git_observer",
    },
    execution_boundary: Object.fromEntries(OUTPUT_BOUNDARY_KEYS.map((key) => [
      key,
      key === "read_only" || key === "separate_activation_execution_lane_required",
    ])),
    gates: {
      activation_remains_forbidden: true,
      decision_binds_canonical_plan: true,
      git_checkpoint_evidence_independently_observed: true,
      git_command_transcript_read_only_exact: true,
      observer_binds_production_configuration: true,
      observer_cross_binds_prerequisite_plan: true,
      prerequisite_plan_and_hold_decision_exact: true,
      separate_activation_execution_lane_required: true,
    },
    git_observer_marker: OBSERVER_MARKER,
    marker: RESULT_MARKER,
    operation_id: plan.operation_id,
    prerequisite_gate_id: GATE_ID,
    status: "independent_git_evidence_composed_activation_forbidden_separate_execution_lane_required",
    version: VERSION,
  });
}

function parseArgs(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (["--plan", "--decision", "--git-observer"].includes(token)) {
      const value = argv[index + 1];
      requireCondition(value && !value.startsWith("--"), `${token} requires a value`);
      output[token.slice(2)] = value;
      index += 1;
    } else fail(`unexpected argument: ${token}`);
  }
  for (const key of ["plan", "decision", "git-observer"]) requireString(output[key], `--${key}`);
  return output;
}

function readPrivateJson(inputPath, label) {
  const unresolved = path.resolve(inputPath);
  const unresolvedStat = lstatSync(unresolved);
  requireCondition(!unresolvedStat.isSymbolicLink(), `${label} path must not be a symbolic link`);
  const resolved = realpathSync(unresolved);
  const stat = lstatSync(resolved);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular file`);
  requireCondition((stat.mode & 0o777) === 0o600, `${label} mode must be 0600`);
  if (typeof process.getuid === "function") requireCondition(stat.uid === process.getuid(), `${label} must be owned by the executing user`);
  requireCondition(stat.size > 0 && stat.size <= 16 * 1024 * 1024, `${label} size is outside the allowed range`);
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = composeActivationPrerequisiteEvidenceV1(
    readPrivateJson(args.plan, "plan"),
    readPrivateJson(args.decision, "decision"),
    readPrivateJson(args["git-observer"], "Git observer receipt"),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`HOLD: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
