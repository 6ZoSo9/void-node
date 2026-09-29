#!/usr/bin/env node
import { createHash } from "node:crypto";
import { computeAddress } from "ethers";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_AUTHORITY_V1 =
  Object.freeze({
    source_verification_only: true,
    filesystem_read: false,
    filesystem_write: false,
    service_action: false,
    validator_mutation: false,
    rpc_call: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1 =
  Object.freeze({
    chain_id: 2050,
    execution_epoch: 2,
    besu_client: "Besu",
    besu_version: "26.8.1",
    besu_image:
      "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
    plugin_jar_sha256:
      "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518",
    plugin_name: "VoidEpoch2RawTransactionDomainPlugin",
    required_live_node_count: 4,
    peer_import_source_head:
      "ebf9751d1b8be14e407f0a941d4e0723965fb613",
    peer_import_workflow_run_id: "36514258320",
  });

const SHA256 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const NODE_ID = /^[0-9a-f]{32}$/u;
const PUBLIC_KEY = /^0x04[0-9a-f]{128}$/u;
const ROLE = /^[a-z0-9][a-z0-9-]{0,31}$/u;
const EVIDENCE_ID = /^voide2ve1_[0-9a-f]{64}$/u;
const MAX_EVIDENCE_AGE_SECONDS = 86_400n;

const INPUT_KEYS = Object.freeze([
  "binding_candidate",
  "raw_domain_policy",
  "plugin_artifact_manifest",
  "expected_evidence_ids",
  "evaluation_time_utc",
  "validator_evidence_rows",
]);

const EVIDENCE_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "machine_role",
  "void_node_id",
  "besu_validator_address",
  "besu_public_key",
  "node_identity_attestation_sha256",
  "chain_id",
  "execution_epoch",
  "besu_client",
  "besu_version",
  "besu_image",
  "plugin_name",
  "plugin_jar_sha256",
  "plugin_loaded",
  "transaction_validation_rule_registered",
  "local_unmarked_raw_transaction_rejected",
  "raw_public_rpc_disabled",
  "startup_fail_closed_on_plugin_mismatch",
  "peer_import_protocol_rejection_source_head",
  "peer_import_workflow_run_id",
  "observed_at_utc",
  "valid_until_utc",
  "market_activation_authorized",
  "migration_authorized",
  "public_activation_authorized",
  "funds_movement_authorized",
  "evidence_id",
]);

function fail(code) {
  throw new Error(code);
}

function hold(reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1,
    reason,
    ...extra,
    all_production_validators_epoch_domain_enforced: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_AUTHORITY_V1,
  });
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
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
  fail("INVALID_CANONICAL_VALUE");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bodyWithoutId(value, idKey) {
  const out = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (key !== idKey) out[key] = item;
  }
  return out;
}

export function voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(
  evidence,
) {
  return "voide2ve1_" +
    sha256(canonicalJson(bodyWithoutId(evidence, "evidence_id")));
}

function canonicalUtc(value, code) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)
  ) {
    fail(code);
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(code);
  }
  return BigInt(milliseconds);
}

function normalizeAddress(value, code) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (!ADDRESS.test(out)) fail(code);
  return out;
}

function validateBindingCandidate(binding) {
  if (!plain(binding)) fail("validator_binding_candidate_required");
  if (
    binding.marker !==
      "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1" ||
    binding.version !== 1 ||
    binding.qbft?.client !== "Besu" ||
    binding.qbft?.client_version !== "26.8.1" ||
    binding.qbft?.consensus !== "QBFT" ||
    binding.qbft?.selected_validator_management_method !== "blockheader" ||
    binding.qbft?.required_live_node_count !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .required_live_node_count ||
    binding.qbft?.minimum_byzantine_fault_tolerant_validator_count !== 4 ||
    !Array.isArray(binding.qbft?.production_binding_entries)
  ) {
    fail("validator_binding_contract_mismatch");
  }

  const entries = binding.qbft.production_binding_entries;
  if (
    binding.qbft.attested_live_node_count !== entries.length ||
    binding.qbft.attested_identity_slots_remaining !==
      binding.qbft.required_live_node_count - entries.length
  ) {
    fail("validator_binding_count_mismatch");
  }

  const roles = new Set();
  const nodeIds = new Set();
  const addresses = new Set();
  const publicKeys = new Set();
  const attestationShas = new Set();

  const normalized = entries.map((entry) => {
    if (
      !plain(entry) ||
      typeof entry.machine_role !== "string" ||
      !ROLE.test(entry.machine_role) ||
      typeof entry.void_node_id !== "string" ||
      !NODE_ID.test(entry.void_node_id) ||
      typeof entry.besu_public_key !== "string" ||
      !PUBLIC_KEY.test(entry.besu_public_key.toLowerCase()) ||
      entry.public_key_address_derivation_verified !== true ||
      typeof entry.node_identity_attestation_sha256 !== "string" ||
      !SHA256.test(entry.node_identity_attestation_sha256)
    ) {
      fail("validator_binding_entry_invalid");
    }
    const address = normalizeAddress(
      entry.besu_validator_address,
      "validator_binding_address_invalid",
    );
    const publicKey = entry.besu_public_key.toLowerCase();
    if (computeAddress(publicKey).toLowerCase() !== address) {
      fail("validator_binding_public_key_address_mismatch");
    }
    for (const [set, value, code] of [
      [roles, entry.machine_role, "validator_binding_role_duplicate"],
      [nodeIds, entry.void_node_id, "validator_binding_node_id_duplicate"],
      [addresses, address, "validator_binding_address_duplicate"],
      [publicKeys, publicKey, "validator_binding_public_key_duplicate"],
      [
        attestationShas,
        entry.node_identity_attestation_sha256,
        "validator_binding_attestation_duplicate",
      ],
    ]) {
      if (set.has(value)) fail(code);
      set.add(value);
    }
    return Object.freeze({
      machine_role: entry.machine_role,
      void_node_id: entry.void_node_id,
      besu_validator_address: address,
      besu_public_key: publicKey,
      node_identity_attestation_sha256:
        entry.node_identity_attestation_sha256,
    });
  });

  return Object.freeze(normalized);
}

function validateSourcePrerequisites(rawDomain, artifact) {
  const expected =
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1;
  if (
    rawDomain?.marker !== "VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1" ||
    rawDomain?.version !== 1 ||
    rawDomain?.chain_id !== 2050 ||
    rawDomain?.execution_epoch !== 2 ||
    rawDomain?.gates?.besu_transaction_validation_rule_implemented !== true ||
    rawDomain?.gates?.plugin_artifact_content_addressed !== true ||
    rawDomain?.gates?.plugin_artifact_runtime_identity_verified !== true ||
    rawDomain?.gates?.besu_transaction_validation_rule_runtime_proven !== true ||
    rawDomain?.gates?.all_production_validators_epoch_domain_enforced !== false ||
    rawDomain?.gates?.cross_epoch_replay_protection_proven !== false ||
    rawDomain?.besu_validation_boundary?.selected_client !== expected.besu_client ||
    rawDomain?.besu_validation_boundary?.selected_client_version !==
      expected.besu_version ||
    rawDomain?.besu_validation_boundary?.plugin_artifact_sha256 !==
      expected.plugin_jar_sha256
  ) {
    fail("raw_domain_source_prerequisite_mismatch");
  }

  if (
    artifact?.marker !==
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_ARTIFACT_V1" ||
    artifact?.version !== 1 ||
    artifact?.jar_sha256 !== expected.plugin_jar_sha256 ||
    artifact?.build?.besu_version !== expected.besu_version ||
    artifact?.gates?.plugin_artifact_content_addressed !== true
  ) {
    fail("plugin_artifact_source_prerequisite_mismatch");
  }
}

function validateEvidenceRow(
  raw,
  binding,
  expectedEvidenceId,
  evaluationMs,
) {
  const expected =
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1;
  const evidence = exactObject(
    raw,
    EVIDENCE_KEYS,
    "validator_enforcement_evidence_shape_invalid",
  );
  if (
    evidence.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1 ||
    evidence.version !== 1 ||
    evidence.status !== "RUNTIME_ENFORCEMENT_EVIDENCE_CANDIDATE" ||
    evidence.machine_role !== binding.machine_role ||
    evidence.void_node_id !== binding.void_node_id ||
    normalizeAddress(
      evidence.besu_validator_address,
      "validator_evidence_address_invalid",
    ) !== binding.besu_validator_address ||
    String(evidence.besu_public_key).toLowerCase() !== binding.besu_public_key ||
    evidence.node_identity_attestation_sha256 !==
      binding.node_identity_attestation_sha256 ||
    evidence.chain_id !== expected.chain_id ||
    evidence.execution_epoch !== expected.execution_epoch ||
    evidence.besu_client !== expected.besu_client ||
    evidence.besu_version !== expected.besu_version ||
    evidence.besu_image !== expected.besu_image ||
    evidence.plugin_name !== expected.plugin_name ||
    evidence.plugin_jar_sha256 !== expected.plugin_jar_sha256 ||
    evidence.plugin_loaded !== true ||
    evidence.transaction_validation_rule_registered !== true ||
    evidence.local_unmarked_raw_transaction_rejected !== true ||
    evidence.raw_public_rpc_disabled !== true ||
    evidence.startup_fail_closed_on_plugin_mismatch !== true ||
    evidence.peer_import_protocol_rejection_source_head !==
      expected.peer_import_source_head ||
    String(evidence.peer_import_workflow_run_id) !==
      expected.peer_import_workflow_run_id
  ) {
    fail("validator_enforcement_evidence_binding_mismatch");
  }

  for (const key of [
    "market_activation_authorized",
    "migration_authorized",
    "public_activation_authorized",
    "funds_movement_authorized",
  ]) {
    if (evidence[key] !== false) {
      fail("validator_enforcement_evidence_authority_must_remain_false");
    }
  }

  const observedMs = canonicalUtc(
    evidence.observed_at_utc,
    "validator_enforcement_evidence_observed_time_invalid",
  );
  const validUntilMs = canonicalUtc(
    evidence.valid_until_utc,
    "validator_enforcement_evidence_valid_until_invalid",
  );
  if (
    validUntilMs <= observedMs ||
    validUntilMs - observedMs > MAX_EVIDENCE_AGE_SECONDS * 1000n ||
    evaluationMs < observedMs ||
    evaluationMs > validUntilMs
  ) {
    fail("validator_enforcement_evidence_not_current");
  }

  if (
    typeof evidence.evidence_id !== "string" ||
    !EVIDENCE_ID.test(evidence.evidence_id) ||
    evidence.evidence_id !==
      voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(evidence) ||
    evidence.evidence_id !== expectedEvidenceId
  ) {
    fail("validator_enforcement_evidence_id_mismatch");
  }

  return Object.freeze({
    machine_role: binding.machine_role,
    void_node_id: binding.void_node_id,
    besu_validator_address: binding.besu_validator_address,
    evidence_id: evidence.evidence_id,
  });
}

export function verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1(
  input,
) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "production_validator_domain_enforcement_input_shape_invalid",
  );
  validateSourcePrerequisites(
    request.raw_domain_policy,
    request.plugin_artifact_manifest,
  );
  const bindings = validateBindingCandidate(request.binding_candidate);

  if (
    bindings.length !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .required_live_node_count
  ) {
    return hold("production_validator_identity_set_incomplete", {
      attested_live_node_count: bindings.length,
      required_live_node_count:
        VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
          .required_live_node_count,
      attested_identity_slots_remaining:
        VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
          .required_live_node_count - bindings.length,
      evidence_contract_source_ready: true,
    });
  }

  if (
    !Array.isArray(request.validator_evidence_rows) ||
    request.validator_evidence_rows.length !== bindings.length ||
    !Array.isArray(request.expected_evidence_ids) ||
    request.expected_evidence_ids.length !== bindings.length
  ) {
    return hold("production_validator_enforcement_evidence_set_incomplete", {
      attested_live_node_count: bindings.length,
      evidence_row_count: Array.isArray(request.validator_evidence_rows)
        ? request.validator_evidence_rows.length
        : 0,
      expected_evidence_id_count: Array.isArray(request.expected_evidence_ids)
        ? request.expected_evidence_ids.length
        : 0,
      evidence_contract_source_ready: true,
    });
  }

  const evaluationMs = canonicalUtc(
    request.evaluation_time_utc,
    "production_validator_enforcement_evaluation_time_invalid",
  );
  const expectedIds = request.expected_evidence_ids.map((value) => {
    if (typeof value !== "string" || !EVIDENCE_ID.test(value)) {
      fail("production_validator_expected_evidence_id_invalid");
    }
    return value;
  });
  if (new Set(expectedIds).size !== expectedIds.length) {
    fail("production_validator_expected_evidence_id_duplicate");
  }

  const rows = bindings.map((binding, index) =>
    validateEvidenceRow(
      request.validator_evidence_rows[index],
      binding,
      expectedIds[index],
      evaluationMs,
    ),
  );

  return Object.freeze({
    ok: true,
    status: "ENFORCEMENT_EVIDENCE_CANDIDATE_VALID_UPSTREAM_RUNTIME_UNVERIFIED",
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1,
    chain_id: 2050,
    execution_epoch: 2,
    required_live_node_count: 4,
    validator_evidence_candidate_count: rows.length,
    validator_evidence_candidates: Object.freeze(rows),
    plugin_jar_sha256:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .plugin_jar_sha256,
    peer_import_protocol_rejection_source_proven: true,
    upstream_runtime_evidence_semantically_verified: false,
    production_validator_enforcement_evidence_candidate_valid: true,
    all_production_validators_epoch_domain_enforced: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_AUTHORITY_V1,
  });
}
