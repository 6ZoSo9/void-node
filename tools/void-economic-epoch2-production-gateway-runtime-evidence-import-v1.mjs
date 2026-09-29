#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1,
  voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1,
  voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1,
} from "./void-economic-epoch2-production-gateway-runtime-evidence-candidate-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1";

const IMPORT_PREFIX = "voide2gri1_";
const CONTRACT_ID = /^voide2grc1_[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2gre1_[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voide2grt1_[0-9a-f]{64}$/u;
const IMPORT_ID = /^voide2gri1_[0-9a-f]{64}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const UNIT = /^[A-Za-z0-9_.@:-]+\.service$/u;
const INVOCATION = /^[0-9a-f]{32}$/u;
const POSITIVE_UINT = /^[1-9][0-9]*$/u;
const UINT = /^(?:0|[1-9][0-9]*)$/u;
const MAX_SERVICE_PROCESSES = 64;

const CONTRACT_KEYS = Object.freeze([
  "marker",
  "version",
  "hostname",
  "service_unit",
  "unit_file_sha256",
  "runtime_source_sha256",
  "replay_root_path_sha256",
  "status_file_path_sha256",
  "max_evidence_age_seconds",
  "systemd_user_service_required",
  "current_operator_uid_required",
  "same_uid_process_model_accepted",
  "private_startup_receipt_required",
  "no_service_socket_fds_required",
  "runtime_route_active_required",
  "public_submission_open_required",
  "transaction_submission_required",
  "transaction_broadcast_required",
  "authoritative_chain2050_write_required",
  "contract_id",
]);

const EVIDENCE_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "service_contract_id",
  "hostname",
  "service_unit",
  "unit_file_sha256",
  "runtime_source_sha256",
  "startup_receipt_id",
  "startup_receipt_file_sha256",
  "startup_receipt_status_file_path_sha256",
  "replay_root_path_sha256",
  "replay_root_dev",
  "replay_root_ino",
  "replay_root_uid",
  "replay_root_gid",
  "replay_root_mode",
  "replay_root_identity_stable",
  "systemd_service_active",
  "systemd_service_running",
  "service_main_pid",
  "service_main_pid_start_time_ticks",
  "service_invocation_id",
  "service_control_group_path_sha256",
  "service_cgroup_member_count",
  "all_service_processes_current_uid",
  "same_uid_process_model_observed",
  "network_namespace_consistent",
  "service_socket_fd_count",
  "no_service_socket_fds_observed",
  "runtime_process_binding_constructed",
  "replay_root_binding_receipt_verified",
  "production_gateway_replay_store_binding_source_verified",
  "production_gateway_replay_store_binding_evidence_candidate",
  "upstream_live_evidence_semantically_verified",
  "runtime_service_identity_verified",
  "same_uid_process_model_verified",
  "production_gateway_replay_store_binding_verified",
  "runtime_route_active",
  "public_submission_open",
  "transaction_submission",
  "transaction_broadcast",
  "authoritative_chain2050_write",
  "cross_epoch_replay_protection_proven",
  "observed_at_utc",
  "evaluated_at_utc",
  "valid_until_utc",
  "migration_authorized",
  "public_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "evidence_id",
]);

function fail(reason) {
  throw new Error(reason);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, reason) {
  if (!plain(value)) fail(reason);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(reason);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(reason);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(reason);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

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
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("canonical_value_invalid");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(value) {
  return sha256Bytes(Buffer.from(value, "utf8"));
}

function bodyWithoutId(value, key) {
  const out = Object.create(null);
  for (const [name, item] of Object.entries(value)) {
    if (name !== key) out[name] = item;
  }
  return out;
}

function canonicalUtc(value, reason) {
  if (typeof value !== "string" || !UTC_SECONDS.test(value)) fail(reason);
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(reason);
  }
  return ms;
}

function validateContract(raw, expectedId) {
  const contract = exactObject(
    raw,
    CONTRACT_KEYS,
    "runtime_service_contract_shape_invalid",
  );

  if (
    contract.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1 ||
    contract.version !== 1 ||
    typeof contract.hostname !== "string" ||
    contract.hostname.length < 1 ||
    contract.hostname.length > 255 ||
    typeof contract.service_unit !== "string" ||
    !UNIT.test(contract.service_unit)
  ) {
    fail("runtime_service_contract_identity_invalid");
  }

  for (const key of [
    "unit_file_sha256",
    "runtime_source_sha256",
    "replay_root_path_sha256",
    "status_file_path_sha256",
  ]) {
    if (typeof contract[key] !== "string" || !SHA256.test(contract[key])) {
      fail("runtime_service_contract_sha256_invalid");
    }
  }

  if (
    !Number.isSafeInteger(contract.max_evidence_age_seconds) ||
    contract.max_evidence_age_seconds < 1 ||
    contract.max_evidence_age_seconds > 3600
  ) {
    fail("runtime_service_contract_max_age_invalid");
  }

  for (const key of [
    "systemd_user_service_required",
    "current_operator_uid_required",
    "same_uid_process_model_accepted",
    "private_startup_receipt_required",
    "no_service_socket_fds_required",
  ]) {
    if (contract[key] !== true) {
      fail("runtime_service_contract_required_true_flag_invalid");
    }
  }

  for (const key of [
    "runtime_route_active_required",
    "public_submission_open_required",
    "transaction_submission_required",
    "transaction_broadcast_required",
    "authoritative_chain2050_write_required",
  ]) {
    if (contract[key] !== false) {
      fail("runtime_service_contract_required_false_flag_invalid");
    }
  }

  const recomputed =
    voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1(contract);
  if (
    typeof expectedId !== "string" ||
    !CONTRACT_ID.test(expectedId) ||
    contract.contract_id !== expectedId ||
    contract.contract_id !== recomputed
  ) {
    fail("runtime_service_contract_id_mismatch");
  }

  return contract;
}

function validateEvidence({
  raw,
  contract,
  expectedEvidenceId,
  importEvaluationTimeUtc,
}) {
  const evidence = exactObject(
    raw,
    EVIDENCE_KEYS,
    "runtime_evidence_shape_invalid",
  );

  if (
    evidence.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1 ||
    evidence.version !== 1 ||
    evidence.status !==
      "RUNTIME_BINDING_EVIDENCE_CANDIDATE_REVIEW_REQUIRED" ||
    evidence.chain_id !== 2050 ||
    evidence.execution_epoch !== 2 ||
    evidence.service_contract_id !== contract.contract_id ||
    evidence.hostname !== contract.hostname ||
    evidence.service_unit !== contract.service_unit ||
    evidence.unit_file_sha256 !== contract.unit_file_sha256 ||
    evidence.runtime_source_sha256 !== contract.runtime_source_sha256 ||
    evidence.startup_receipt_status_file_path_sha256 !==
      contract.status_file_path_sha256 ||
    evidence.replay_root_path_sha256 !== contract.replay_root_path_sha256
  ) {
    fail("runtime_evidence_contract_binding_mismatch");
  }

  if (
    typeof evidence.startup_receipt_id !== "string" ||
    !RECEIPT_ID.test(evidence.startup_receipt_id) ||
    typeof evidence.startup_receipt_file_sha256 !== "string" ||
    !SHA256.test(evidence.startup_receipt_file_sha256) ||
    typeof evidence.replay_root_dev !== "string" ||
    !POSITIVE_UINT.test(evidence.replay_root_dev) ||
    typeof evidence.replay_root_ino !== "string" ||
    !POSITIVE_UINT.test(evidence.replay_root_ino) ||
    typeof evidence.replay_root_uid !== "string" ||
    !UINT.test(evidence.replay_root_uid) ||
    typeof evidence.replay_root_gid !== "string" ||
    !UINT.test(evidence.replay_root_gid) ||
    evidence.replay_root_mode !== "0700" ||
    evidence.replay_root_identity_stable !== true
  ) {
    fail("runtime_evidence_replay_root_identity_invalid");
  }

  if (
    evidence.systemd_service_active !== true ||
    evidence.systemd_service_running !== true ||
    !Number.isSafeInteger(evidence.service_main_pid) ||
    evidence.service_main_pid < 2 ||
    typeof evidence.service_main_pid_start_time_ticks !== "string" ||
    !POSITIVE_UINT.test(evidence.service_main_pid_start_time_ticks) ||
    typeof evidence.service_invocation_id !== "string" ||
    !INVOCATION.test(evidence.service_invocation_id) ||
    typeof evidence.service_control_group_path_sha256 !== "string" ||
    !SHA256.test(evidence.service_control_group_path_sha256) ||
    !Number.isSafeInteger(evidence.service_cgroup_member_count) ||
    evidence.service_cgroup_member_count < 1 ||
    evidence.service_cgroup_member_count > MAX_SERVICE_PROCESSES ||
    evidence.all_service_processes_current_uid !== true ||
    evidence.same_uid_process_model_observed !== true ||
    evidence.network_namespace_consistent !== true ||
    evidence.service_socket_fd_count !== 0 ||
    evidence.no_service_socket_fds_observed !== true
  ) {
    fail("runtime_evidence_service_identity_invalid");
  }

  for (const key of [
    "runtime_process_binding_constructed",
    "replay_root_binding_receipt_verified",
    "production_gateway_replay_store_binding_source_verified",
    "production_gateway_replay_store_binding_evidence_candidate",
  ]) {
    if (evidence[key] !== true) {
      fail("runtime_evidence_required_true_flag_invalid");
    }
  }

  for (const key of [
    "upstream_live_evidence_semantically_verified",
    "runtime_service_identity_verified",
    "same_uid_process_model_verified",
    "production_gateway_replay_store_binding_verified",
    "runtime_route_active",
    "public_submission_open",
    "transaction_submission",
    "transaction_broadcast",
    "authoritative_chain2050_write",
    "cross_epoch_replay_protection_proven",
    "migration_authorized",
    "public_activation_authorized",
    "funds_movement_authorized",
  ]) {
    if (evidence[key] !== false) {
      fail("runtime_evidence_required_false_flag_invalid");
    }
  }

  if (
    canonicalJson(evidence.authority) !==
      canonicalJson(
        VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
      )
  ) {
    fail("runtime_evidence_authority_mismatch");
  }

  if (
    typeof expectedEvidenceId !== "string" ||
    !EVIDENCE_ID.test(expectedEvidenceId) ||
    evidence.evidence_id !== expectedEvidenceId ||
    evidence.evidence_id !==
      voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(evidence)
  ) {
    fail("runtime_evidence_id_mismatch");
  }

  const observedAtMs = canonicalUtc(
    evidence.observed_at_utc,
    "runtime_evidence_observed_at_invalid",
  );
  const evaluatedAtMs = canonicalUtc(
    evidence.evaluated_at_utc,
    "runtime_evidence_evaluated_at_invalid",
  );
  const validUntilMs = canonicalUtc(
    evidence.valid_until_utc,
    "runtime_evidence_valid_until_invalid",
  );
  const importAtMs = canonicalUtc(
    importEvaluationTimeUtc,
    "runtime_evidence_import_time_invalid",
  );

  if (
    observedAtMs > evaluatedAtMs ||
    evaluatedAtMs > validUntilMs ||
    validUntilMs - observedAtMs >
      contract.max_evidence_age_seconds * 1000
  ) {
    fail("runtime_evidence_time_window_invalid");
  }
  if (importAtMs < evaluatedAtMs || importAtMs > validUntilMs) {
    fail("runtime_evidence_not_current_at_import");
  }

  return evidence;
}

export function importVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceV1({
  serviceContract,
  expectedServiceContractId,
  evidenceBytes,
  expectedFileSha256,
  expectedEvidenceId,
  evaluationTimeUtc,
}) {
  const contract = validateContract(
    serviceContract,
    expectedServiceContractId,
  );

  if (!Buffer.isBuffer(evidenceBytes)) {
    fail("evidence_bytes_required");
  }
  if (
    typeof expectedFileSha256 !== "string" ||
    !SHA256.test(expectedFileSha256)
  ) {
    fail("expected_file_sha256_invalid");
  }

  const observedFileSha256 = sha256Bytes(evidenceBytes);
  if (observedFileSha256 !== expectedFileSha256) {
    fail("evidence_file_sha256_mismatch");
  }

  let evidence;
  try {
    evidence = JSON.parse(evidenceBytes.toString("utf8"));
  } catch {
    fail("evidence_json_invalid");
  }

  const verified = validateEvidence({
    raw: evidence,
    contract,
    expectedEvidenceId,
    importEvaluationTimeUtc: evaluationTimeUtc,
  });

  const body = Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1,
    version: 1,
    status:
      "PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORTED_CROSS_EPOCH_REPLAY_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    service_contract_id: contract.contract_id,
    evidence_file_sha256: observedFileSha256,
    evidence_id: verified.evidence_id,
    hostname: verified.hostname,
    service_unit: verified.service_unit,
    startup_receipt_id: verified.startup_receipt_id,
    startup_receipt_file_sha256:
      verified.startup_receipt_file_sha256,
    replay_root_path_sha256: verified.replay_root_path_sha256,
    service_main_pid: verified.service_main_pid,
    service_main_pid_start_time_ticks:
      verified.service_main_pid_start_time_ticks,
    service_invocation_id: verified.service_invocation_id,
    service_control_group_path_sha256:
      verified.service_control_group_path_sha256,
    observed_at_utc: verified.observed_at_utc,
    evidence_evaluated_at_utc: verified.evaluated_at_utc,
    valid_until_utc: verified.valid_until_utc,
    import_evaluated_at_utc: evaluationTimeUtc,
    verification: Object.freeze({
      service_contract_content_addressed: true,
      evidence_file_sha256_verified: true,
      evidence_id_verified: true,
      evidence_fresh_at_import: true,
      runtime_service_identity_verified: true,
      same_uid_process_model_verified: true,
      no_service_socket_fds_verified: true,
      replay_root_identity_verified: true,
      startup_receipt_binding_verified: true,
      production_gateway_replay_store_binding_verified: true,
    }),
    gates: Object.freeze({
      production_gateway_replay_store_binding_verified: true,
      cross_epoch_replay_protection_proven: false,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement_authorized: false,
    }),
    authority: Object.freeze({
      source_import_only: true,
      service_action: false,
      network_request: false,
      credential_access: false,
      wallet_access: false,
      private_key_access: false,
      transaction_construction: false,
      transaction_signing: false,
      transaction_submission: false,
      transaction_broadcast: false,
      authoritative_chain2050_write: false,
      validator_mutation: false,
      token_movement: false,
      funds_movement: false,
      migration_authorized: false,
      public_activation_authorized: false,
    }),
  });

  const importId =
    IMPORT_PREFIX +
    sha256Text(canonicalJson(bodyWithoutId(body, "import_id")));

  return Object.freeze({
    ...body,
    import_id: importId,
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const contractPath = path.resolve(String(arg("--service-contract") || ""));
  const evidencePath = path.resolve(String(arg("--evidence") || ""));
  const outputPath = path.resolve(String(arg("--output") || ""));
  const expectedServiceContractId =
    String(arg("--expected-service-contract-id") || "");
  const expectedFileSha256 =
    String(arg("--expected-file-sha256") || "");
  const expectedEvidenceId =
    String(arg("--expected-evidence-id") || "");
  const evaluationTimeUtc =
    String(arg("--evaluation-time-utc") || "");

  for (const [value, reason] of [
    [contractPath, "service_contract_path_required"],
    [evidencePath, "evidence_path_required"],
    [outputPath, "output_path_required"],
  ]) {
    if (!value || value === path.parse(value).root) fail(reason);
  }

  if (!fs.existsSync(contractPath)) fail("service_contract_file_missing");
  if (!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if (fs.existsSync(outputPath)) fail("output_already_exists");

  const receipt =
    importVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceV1({
      serviceContract: readJson(contractPath),
      expectedServiceContractId,
      evidenceBytes: fs.readFileSync(evidencePath),
      expectedFileSha256,
      expectedEvidenceId,
      evaluationTimeUtc,
    });

  if (
    typeof receipt.import_id !== "string" ||
    !IMPORT_ID.test(receipt.import_id)
  ) {
    fail("import_id_invalid");
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(receipt, null, 2) + "\n",
    { encoding: "utf8", mode: 0o644, flag: "wx" },
  );

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1,
  );
  console.log("status=" + receipt.status);
  console.log("service_contract_id=" + receipt.service_contract_id);
  console.log("evidence_file_sha256=" + receipt.evidence_file_sha256);
  console.log("evidence_id=" + receipt.evidence_id);
  console.log("import_id=" + receipt.import_id);
  console.log("runtime_service_identity_verified=true");
  console.log("same_uid_process_model_verified=true");
  console.log("production_gateway_replay_store_binding_verified=true");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output=" + outputPath);
}
