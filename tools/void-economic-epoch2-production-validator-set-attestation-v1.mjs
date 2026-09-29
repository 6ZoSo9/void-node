#!/usr/bin/env node
import { createHash } from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1";
export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_EVIDENCE_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_AUTHORITY_V1 =
  Object.freeze({
    source_verification_only: true,
    injected_read_transport_required: true,
    bounded_read_only_rpc_methods: true,
    filesystem_read: false,
    filesystem_write: false,
    service_action: false,
    validator_mutation: false,
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

const ROLES = Object.freeze(["precision", "nimo", "xiphos"]);
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2vs1_[0-9a-f]{64}$/u;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const QUANTITY = /^(?:0x0|0x[1-9a-f][0-9a-f]*)$/u;
const MAX_EVIDENCE_AGE_MS = 3_600_000n;
const EXPECTED_CHAIN_ID = 2050n;

const COLLECT_KEYS = Object.freeze([
  "binding_candidate",
  "machine_role",
  "target_block_number",
  "observed_at_utc",
  "valid_until_utc",
  "transport",
]);

const VERIFY_KEYS = Object.freeze([
  "binding_candidate",
  "expected_evidence_ids",
  "evaluation_time_utc",
  "evidence_rows",
]);

const EVIDENCE_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "machine_role",
  "void_node_id",
  "besu_validator_address",
  "target_block_number",
  "target_block_hash",
  "validator_addresses",
  "validator_set_sha256",
  "observed_at_utc",
  "valid_until_utc",
  "rpc_methods_used",
  "read_only_rpc_observation",
  "validator_set_matches_canonical_binding",
  "production_validator_set_bound",
  "authoritative_chain2050_write",
  "migration_authorized",
  "public_activation_authorized",
  "funds_movement_authorized",
  "evidence_id",
]);

function fail(code) {
  throw new Error(code);
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

function ownDataField(value, key, code) {
  if (!value || typeof value !== "object") fail(code);
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    !descriptor ||
    descriptor.enumerable !== true ||
    !Object.hasOwn(descriptor, "value")
  ) {
    fail(code);
  }
  return descriptor.value;
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

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bodyWithoutId(value) {
  const out = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (key !== "evidence_id") out[key] = item;
  }
  return out;
}

export function voidEconomicEpoch2ProductionValidatorSetEvidenceIdV1(
  evidence,
) {
  return "voide2vs1_" +
    sha256Text(canonicalJson(bodyWithoutId(evidence)));
}

function normalizeAddress(value, code) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (
    !ADDRESS.test(out) ||
    out === "0x0000000000000000000000000000000000000000"
  ) {
    fail(code);
  }
  return out;
}

function canonicalHash(value, code) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (
    !HASH.test(out) ||
    out === "0x" + "0".repeat(64)
  ) {
    fail(code);
  }
  return out;
}

function canonicalQuantity(value, code, { positive = false } = {}) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (!QUANTITY.test(out)) fail(code);
  const parsed = BigInt(out);
  if (positive && parsed <= 0n) fail(code);
  return Object.freeze({ text: out, value: parsed });
}

function canonicalUtc(value, code) {
  if (typeof value !== "string" || !UTC_SECONDS.test(value)) fail(code);
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(code);
  }
  return BigInt(milliseconds);
}

function exactAddressArray(value, code) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(code);
  }
  const length = value.length;
  if (length !== 3) fail(code);
  const out = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out.push(normalizeAddress(descriptor.value, code));
  }
  if (new Set(out).size !== out.length) fail(code);
  return Object.freeze([...out].sort());
}

function bindingRows(binding) {
  if (
    !plain(binding) ||
    binding.marker !==
      "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1" ||
    binding.version !== 1 ||
    binding.qbft?.client !== "Besu" ||
    binding.qbft?.client_version !== "26.8.1" ||
    binding.qbft?.consensus !== "QBFT" ||
    binding.qbft?.selected_validator_management_method !== "blockheader" ||
    binding.qbft?.production_validator_count !== 3 ||
    binding.qbft?.required_live_node_count !== 3 ||
    binding.qbft?.attested_live_node_count !== 3 ||
    binding.qbft?.attested_identity_slots_remaining !== 0 ||
    binding.gates?.production_validator_set_bound !== false ||
    !Array.isArray(binding.qbft?.production_binding_entries) ||
    binding.qbft.production_binding_entries.length !== 3
  ) {
    fail("production_validator_set_binding_candidate_invalid");
  }

  const rows = binding.qbft.production_binding_entries.map((row) => {
    if (
      !plain(row) ||
      !ROLES.includes(row.machine_role) ||
      typeof row.void_node_id !== "string" ||
      !/^[0-9a-f]{32}$/u.test(row.void_node_id) ||
      row.public_key_address_derivation_verified !== true
    ) {
      fail("production_validator_set_binding_entry_invalid");
    }
    return Object.freeze({
      machine_role: row.machine_role,
      void_node_id: row.void_node_id,
      besu_validator_address: normalizeAddress(
        row.besu_validator_address,
        "production_validator_set_binding_address_invalid",
      ),
    });
  });
  if (
    rows.map((row) => row.machine_role).join(",") !==
      "precision,nimo,xiphos" ||
    new Set(rows.map((row) => row.void_node_id)).size !== 3 ||
    new Set(rows.map((row) => row.besu_validator_address)).size !== 3
  ) {
    fail("production_validator_set_binding_identity_set_invalid");
  }
  return Object.freeze(rows);
}

function expectedValidatorSet(rows) {
  return Object.freeze(
    rows.map((row) => row.besu_validator_address).sort(),
  );
}

function validatorSetSha(addresses) {
  return sha256Text(canonicalJson(addresses));
}

function evidenceBody(value) {
  const body = Object.create(null);
  for (const key of EVIDENCE_KEYS) {
    if (key !== "evidence_id") body[key] = value[key];
  }
  return body;
}

function validateEvidenceRow(raw, binding, expectedId, evaluationMs) {
  const evidence = exactObject(
    raw,
    EVIDENCE_KEYS,
    "production_validator_set_evidence_shape_invalid",
  );
  if (
    evidence.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_EVIDENCE_V1 ||
    evidence.version !== 1 ||
    evidence.status !== "RUNTIME_VALIDATOR_SET_EVIDENCE_CANDIDATE" ||
    evidence.chain_id !== 2050 ||
    evidence.execution_epoch !== 2 ||
    evidence.machine_role !== binding.machine_role ||
    evidence.void_node_id !== binding.void_node_id ||
    normalizeAddress(
      evidence.besu_validator_address,
      "production_validator_set_evidence_local_address_invalid",
    ) !== binding.besu_validator_address ||
    evidence.read_only_rpc_observation !== true ||
    evidence.validator_set_matches_canonical_binding !== true ||
    evidence.production_validator_set_bound !== false ||
    evidence.authoritative_chain2050_write !== false ||
    evidence.migration_authorized !== false ||
    evidence.public_activation_authorized !== false ||
    evidence.funds_movement_authorized !== false
  ) {
    fail("production_validator_set_evidence_contract_mismatch");
  }

  const target = canonicalQuantity(
    evidence.target_block_number,
    "production_validator_set_evidence_block_number_invalid",
    { positive: true },
  );
  const hash = canonicalHash(
    evidence.target_block_hash,
    "production_validator_set_evidence_block_hash_invalid",
  );
  const validators = exactAddressArray(
    evidence.validator_addresses,
    "production_validator_set_evidence_validator_array_invalid",
  );
  if (
    evidence.validator_set_sha256 !== validatorSetSha(validators) ||
    typeof evidence.validator_set_sha256 !== "string"
  ) {
    fail("production_validator_set_evidence_set_hash_mismatch");
  }

  if (
    !Array.isArray(evidence.rpc_methods_used) ||
    evidence.rpc_methods_used.join(",") !==
      "eth_chainId,eth_getBlockByNumber,qbft_getValidatorsByBlockNumber"
  ) {
    fail("production_validator_set_evidence_rpc_method_contract_mismatch");
  }

  const observedMs = canonicalUtc(
    evidence.observed_at_utc,
    "production_validator_set_evidence_observed_time_invalid",
  );
  const validUntilMs = canonicalUtc(
    evidence.valid_until_utc,
    "production_validator_set_evidence_valid_until_invalid",
  );
  if (
    validUntilMs <= observedMs ||
    validUntilMs - observedMs > MAX_EVIDENCE_AGE_MS ||
    evaluationMs < observedMs ||
    evaluationMs > validUntilMs
  ) {
    fail("production_validator_set_evidence_not_current");
  }

  if (
    typeof evidence.evidence_id !== "string" ||
    !EVIDENCE_ID.test(evidence.evidence_id) ||
    evidence.evidence_id !==
      voidEconomicEpoch2ProductionValidatorSetEvidenceIdV1(evidence) ||
    evidence.evidence_id !== expectedId
  ) {
    fail("production_validator_set_evidence_id_mismatch");
  }

  return Object.freeze({
    evidence,
    target_block_number: target,
    target_block_hash: hash,
    validator_addresses: validators,
  });
}

export async function collectVoidEconomicEpoch2ProductionValidatorSetEvidenceV1(
  input,
) {
  const request = exactObject(
    input,
    COLLECT_KEYS,
    "production_validator_set_collect_input_shape_invalid",
  );
  const rows = bindingRows(request.binding_candidate);
  const binding = rows.find(
    (row) => row.machine_role === request.machine_role,
  );
  if (!binding) fail("production_validator_set_machine_role_not_canonical");
  const target = canonicalQuantity(
    request.target_block_number,
    "production_validator_set_target_block_invalid",
    { positive: true },
  );
  const observedMs = canonicalUtc(
    request.observed_at_utc,
    "production_validator_set_observed_time_invalid",
  );
  const validUntilMs = canonicalUtc(
    request.valid_until_utc,
    "production_validator_set_valid_until_invalid",
  );
  if (
    validUntilMs <= observedMs ||
    validUntilMs - observedMs > MAX_EVIDENCE_AGE_MS
  ) {
    fail("production_validator_set_evidence_window_invalid");
  }
  if (typeof request.transport !== "function") {
    fail("production_validator_set_injected_transport_required");
  }

  const methods = [];
  const call = async (method, params) => {
    if (![
      "eth_chainId",
      "eth_getBlockByNumber",
      "qbft_getValidatorsByBlockNumber",
    ].includes(method)) {
      fail("production_validator_set_rpc_method_forbidden");
    }
    methods.push(method);
    return await request.transport(
      Object.freeze({ method, params: Object.freeze(params) }),
    );
  };

  const chain = canonicalQuantity(
    await call("eth_chainId", []),
    "production_validator_set_chain_id_invalid",
  );
  if (chain.value !== EXPECTED_CHAIN_ID) {
    fail("production_validator_set_chain_id_mismatch");
  }

  const blockRaw = await call(
    "eth_getBlockByNumber",
    [target.text, false],
  );
  if (blockRaw === null) fail("production_validator_set_block_not_found");
  const blockNumber = canonicalQuantity(
    ownDataField(
      blockRaw,
      "number",
      "production_validator_set_block_number_missing",
    ),
    "production_validator_set_block_number_invalid",
    { positive: true },
  );
  if (blockNumber.value !== target.value) {
    fail("production_validator_set_block_number_mismatch");
  }
  const blockHash = canonicalHash(
    ownDataField(
      blockRaw,
      "hash",
      "production_validator_set_block_hash_missing",
    ),
    "production_validator_set_block_hash_invalid",
  );

  const validators = exactAddressArray(
    await call("qbft_getValidatorsByBlockNumber", [target.text]),
    "production_validator_set_rpc_validator_array_invalid",
  );
  const expected = expectedValidatorSet(rows);
  if (
    validators.length !== expected.length ||
    validators.some((value, index) => value !== expected[index])
  ) {
    fail("production_validator_set_rpc_binding_mismatch");
  }
  if (!validators.includes(binding.besu_validator_address)) {
    fail("production_validator_set_local_address_absent");
  }

  const body = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_EVIDENCE_V1,
    version: 1,
    status: "RUNTIME_VALIDATOR_SET_EVIDENCE_CANDIDATE",
    chain_id: 2050,
    execution_epoch: 2,
    machine_role: binding.machine_role,
    void_node_id: binding.void_node_id,
    besu_validator_address: binding.besu_validator_address,
    target_block_number: target.text,
    target_block_hash: blockHash,
    validator_addresses: validators,
    validator_set_sha256: validatorSetSha(validators),
    observed_at_utc: request.observed_at_utc,
    valid_until_utc: request.valid_until_utc,
    rpc_methods_used: Object.freeze([...methods]),
    read_only_rpc_observation: true,
    validator_set_matches_canonical_binding: true,
    production_validator_set_bound: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
  });
  return Object.freeze({
    ...body,
    evidence_id:
      "voide2vs1_" + sha256Text(canonicalJson(body)),
  });
}

export function verifyVoidEconomicEpoch2ProductionValidatorSetAttestationV1(
  input,
) {
  const request = exactObject(
    input,
    VERIFY_KEYS,
    "production_validator_set_verify_input_shape_invalid",
  );
  const rows = bindingRows(request.binding_candidate);
  if (
    !Array.isArray(request.evidence_rows) ||
    request.evidence_rows.length !== 3 ||
    !Array.isArray(request.expected_evidence_ids) ||
    request.expected_evidence_ids.length !== 3
  ) {
    fail("production_validator_set_evidence_set_incomplete");
  }
  const evaluationMs = canonicalUtc(
    request.evaluation_time_utc,
    "production_validator_set_evaluation_time_invalid",
  );

  const normalized = rows.map((binding, index) => {
    const expectedId = request.expected_evidence_ids[index];
    if (typeof expectedId !== "string" || !EVIDENCE_ID.test(expectedId)) {
      fail("production_validator_set_expected_evidence_id_invalid");
    }
    return validateEvidenceRow(
      request.evidence_rows[index],
      binding,
      expectedId,
      evaluationMs,
    );
  });

  if (
    new Set(normalized.map((row) => row.evidence.evidence_id)).size !== 3
  ) {
    fail("production_validator_set_evidence_id_duplicate");
  }

  const first = normalized[0];
  for (const row of normalized.slice(1)) {
    if (
      row.target_block_number.value !== first.target_block_number.value ||
      row.target_block_hash !== first.target_block_hash ||
      row.evidence.validator_set_sha256 !==
        first.evidence.validator_set_sha256 ||
      canonicalJson(row.validator_addresses) !==
        canonicalJson(first.validator_addresses)
    ) {
      fail("production_validator_set_common_block_or_set_mismatch");
    }
  }

  const canonicalValidators = expectedValidatorSet(rows);
  if (
    canonicalJson(first.validator_addresses) !==
    canonicalJson(canonicalValidators)
  ) {
    fail("production_validator_set_canonical_binding_mismatch");
  }

  const composition = Object.freeze({
    chain_id: 2050,
    execution_epoch: 2,
    target_block_number: first.target_block_number.text,
    target_block_hash: first.target_block_hash,
    validator_addresses: first.validator_addresses,
    validator_set_sha256: first.evidence.validator_set_sha256,
    machine_roles: Object.freeze([...ROLES]),
    evidence_ids: Object.freeze(
      normalized.map((row) => row.evidence.evidence_id),
    ),
  });

  return Object.freeze({
    ok: true,
    status:
      "PRODUCTION_VALIDATOR_SET_RUNTIME_EVIDENCE_VERIFIED_PROMOTION_HOLD",
    marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1,
    attestation_id:
      "sha256:" + sha256Text(canonicalJson(composition)),
    ...composition,
    production_validator_set_runtime_evidence_semantically_verified: true,
    common_block_identity_verified: true,
    exact_canonical_validator_set_verified: true,
    all_three_hosts_agree: true,
    production_validator_set_bound: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_AUTHORITY_V1,
  });
}
