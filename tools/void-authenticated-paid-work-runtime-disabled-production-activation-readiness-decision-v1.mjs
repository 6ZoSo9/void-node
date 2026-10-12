#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COMPOSITION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_EVIDENCE_COMPOSITION_RESULT_V1";
export const RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_READINESS_DECISION_RESULT_V1";
export const GATE_ID =
  "void.authenticated-paid-work.disabled-runtime.activation-prerequisites.v1";
export const VERSION = 1;

export const BLOCKING_REQUIREMENTS = Object.freeze([
  "activation_configuration_schema",
  "activation_configuration_instance",
  "trusted_context_reference_metadata",
  "credential_reference_metadata",
  "bounded_replay_snapshot",
  "service_unit_design",
  "rollback_plan",
  "activation_execution_confirmation",
  "live_canary_scope",
]);

const COMPOSITION_KEYS = [
  "composed_at_utc",
  "evidence_bindings",
  "evidence_provenance",
  "execution_boundary",
  "gates",
  "git_observer_marker",
  "marker",
  "operation_id",
  "prerequisite_gate_id",
  "status",
  "version",
];

const BINDING_KEYS = [
  "decision_sha256",
  "git_observer_command_transcript_sha256",
  "git_observer_config_sha256",
  "git_observer_receipt_sha256",
  "install_checkpoint_tag",
  "install_checkpoint_target",
  "install_mechanism_checkpoint_tag",
  "install_mechanism_checkpoint_target",
  "observed_main_commit",
  "packet_commit",
  "plan_sha256",
  "pr894_merge_commit",
  "prerequisite_main_commit",
  "prerequisite_merge_commit",
  "repair_checkpoint_tag",
  "repair_merge_commit",
  "runtime_source_commit",
];

const PROVENANCE_KEYS = [
  "git_checkpoint_state_independently_observed",
  "prerequisite_plan_provenance_preserved_as_caller_assertions",
  "source",
];

const COMPOSITION_BOUNDARY_KEYS = [
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

const COMPOSITION_GATE_KEYS = [
  "activation_remains_forbidden",
  "decision_binds_canonical_plan",
  "git_checkpoint_evidence_independently_observed",
  "git_command_transcript_read_only_exact",
  "observer_binds_production_configuration",
  "observer_cross_binds_prerequisite_plan",
  "prerequisite_plan_and_hold_decision_exact",
  "separate_activation_execution_lane_required",
];

const OUTPUT_BOUNDARY_KEYS = [
  "activation_authorized",
  "activation_configuration_written",
  "credential_or_token_read",
  "deployment",
  "fund_movement",
  "payment_execution",
  "read_only",
  "ready_for_activation",
  "runtime_listener_created",
  "separate_activation_execution_lane_required",
  "service_restart",
  "wallet_or_signer_access",
  "work_credit_write",
  "work_dispatch",
];

const EXPECTED = Object.freeze({
  git_observer_config_sha256:
    "0e42f5872ed119e67cd3ce7a3afca4442c52f15ca09bbd7229867a5ba14050dc",
  install_checkpoint_tag:
    "ckpt-authenticated-paid-work-runtime-disabled-production-install-v1-exact-green-20260731T190348Z",
  install_checkpoint_target: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
  install_mechanism_checkpoint_tag:
    "ckpt-authenticated-paid-work-runtime-disabled-production-install-mechanism-v1-postmerge-exact-green-20260731T184300Z",
  install_mechanism_checkpoint_target:
    "3074bd4f253082841630312a8353946321b5a97e",
  packet_commit: "eaa41fdf76044c88eb9c078046bd370acb3ee457",
  pr894_merge_commit: "3074bd4f253082841630312a8353946321b5a97e",
  prerequisite_main_commit: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
  prerequisite_merge_commit: "25db3a0b0ff802914ef40bacabcbbda3779866cd",
  repair_checkpoint_tag:
    "ckpt-authenticated-paid-work-runtime-disabled-production-activation-prerequisites-v1-postmerge-ci-repair-chain-exact-green-20260801T152006Z",
  repair_merge_commit: "e46619b4eba306dd0727e93ef87f52b68f724852",
  runtime_source_commit: "3b298bc1e31365aec7a20d03c3f425e22fd2f949",
});

const OID = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

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
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
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
  requireCondition(UTC_SECONDS.test(value) && !Number.isNaN(Date.parse(value)), `${label} must be UTC seconds`);
}

function requireExactMap(value, keys, trueKeys, label) {
  exactKeys(value, keys, label);
  for (const key of keys) {
    const expected = trueKeys.includes(key);
    requireCondition(value[key] === expected, `${label}.${key} must be ${expected}`);
  }
}

export function validateEvidenceCompositionV1(value) {
  exactKeys(value, COMPOSITION_KEYS, "evidence composition");
  requireCondition(value.marker === COMPOSITION_MARKER, "composition marker mismatch");
  requireCondition(value.version === VERSION, "composition version mismatch");
  requireCondition(value.prerequisite_gate_id === GATE_ID, "composition prerequisite gate ID mismatch");
  requireCondition(
    value.git_observer_marker ===
      "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_GIT_OBSERVER_RESULT_V1",
    "composition Git observer marker mismatch",
  );
  requireCondition(
    value.status ===
      "independent_git_evidence_composed_activation_forbidden_separate_execution_lane_required",
    "composition status mismatch",
  );
  requireString(value.operation_id, "composition operation ID");
  requireUtcSeconds(value.composed_at_utc, "composition composed_at_utc");

  exactKeys(value.evidence_bindings, BINDING_KEYS, "composition evidence bindings");
  for (const key of [
    "decision_sha256",
    "git_observer_command_transcript_sha256",
    "git_observer_receipt_sha256",
    "plan_sha256",
  ]) {
    requireSha256(value.evidence_bindings[key], `composition evidence bindings.${key}`);
  }
  for (const key of [
    "install_checkpoint_target",
    "install_mechanism_checkpoint_target",
    "observed_main_commit",
    "packet_commit",
    "pr894_merge_commit",
    "prerequisite_main_commit",
    "prerequisite_merge_commit",
    "repair_merge_commit",
    "runtime_source_commit",
  ]) {
    requireOid(value.evidence_bindings[key], `composition evidence bindings.${key}`);
  }
  for (const [key, expected] of Object.entries(EXPECTED)) {
    requireCondition(value.evidence_bindings[key] === expected, `composition production binding drift: ${key}`);
  }

  exactKeys(value.evidence_provenance, PROVENANCE_KEYS, "composition evidence provenance");
  requireCondition(
    value.evidence_provenance.git_checkpoint_state_independently_observed === true,
    "Git checkpoint evidence must be independently observed",
  );
  requireCondition(
    value.evidence_provenance.prerequisite_plan_provenance_preserved_as_caller_assertions === true,
    "prerequisite plan caller-assertion provenance was not preserved",
  );
  requireCondition(
    value.evidence_provenance.source ===
      "prerequisite_plan_hold_decision_plus_independent_local_git_observer",
    "composition evidence source mismatch",
  );

  requireExactMap(
    value.gates,
    COMPOSITION_GATE_KEYS,
    COMPOSITION_GATE_KEYS,
    "composition gates",
  );
  requireExactMap(
    value.execution_boundary,
    COMPOSITION_BOUNDARY_KEYS,
    ["read_only", "separate_activation_execution_lane_required"],
    "composition execution boundary",
  );
  return value;
}

export function decideActivationReadinessV1(composition, options = {}) {
  const validated = validateEvidenceCompositionV1(composition);
  const now = options.now ?? (() => new Date());
  const evaluatedAt = now().toISOString().replace(/\.\d{3}Z$/u, "Z");
  requireUtcSeconds(evaluatedAt, "evaluated_at_utc");
  const boundary = Object.fromEntries(
    OUTPUT_BOUNDARY_KEYS.map((key) => [
      key,
      ["read_only", "separate_activation_execution_lane_required"].includes(key),
    ]),
  );
  return canonicalize({
    blocking_requirements: [...BLOCKING_REQUIREMENTS],
    composition_evidence: {
      composition_sha256: sha256(canonicalJson(validated)),
      observed_main_commit: validated.evidence_bindings.observed_main_commit,
      operation_id: validated.operation_id,
      prerequisite_merge_commit: validated.evidence_bindings.prerequisite_merge_commit,
      repair_merge_commit: validated.evidence_bindings.repair_merge_commit,
    },
    decision: "HOLD",
    evaluated_at_utc: evaluatedAt,
    execution_boundary: boundary,
    marker: RESULT_MARKER,
    prerequisite_gate_id: GATE_ID,
    ready: false,
    status: "required_future_artifacts_unvalidated_activation_hold",
    version: VERSION,
  });
}

function parseArgs(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (["--evidence-composition", "--evaluated-at-utc"].includes(token)) {
      const value = argv[index + 1];
      requireCondition(value && !value.startsWith("--"), `${token} requires a value`);
      output[token.slice(2)] = value;
      index += 1;
    } else fail(`unexpected argument: ${token}`);
  }
  requireString(output["evidence-composition"], "--evidence-composition");
  if (output["evaluated-at-utc"] !== undefined) {
    requireUtcSeconds(output["evaluated-at-utc"], "--evaluated-at-utc");
  }
  return output;
}

function readPrivateJson(inputPath) {
  const unresolved = path.resolve(inputPath);
  const unresolvedStat = lstatSync(unresolved);
  requireCondition(!unresolvedStat.isSymbolicLink(), "evidence composition path must not be a symbolic link");
  const resolved = realpathSync(unresolved);
  const stat = lstatSync(resolved);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), "evidence composition must be a regular file");
  requireCondition((stat.mode & 0o777) === 0o600, "evidence composition mode must be 0600");
  if (typeof process.getuid === "function") {
    requireCondition(stat.uid === process.getuid(), "evidence composition must be owned by the executing user");
  }
  requireCondition(stat.size > 0 && stat.size <= 16 * 1024 * 1024, "evidence composition size is outside the allowed range");
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const options = args["evaluated-at-utc"]
    ? { now: () => new Date(args["evaluated-at-utc"]) }
    : {};
  const result = decideActivationReadinessV1(
    readPrivateJson(args["evidence-composition"]),
    options,
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
