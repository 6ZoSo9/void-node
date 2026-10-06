#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
} from "./void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    pure_receipt_chain_classification: true,
    exact_source_generation_bound: true,
    source_binding_validation_required_for_plan: true,
    source_binding_id_committed_in_receipt: true,
    historical_source_binding_revalidation: false,
    exact_live_collector_decision_hash_bound: true,
    collector_decision_canonical_bytes_bounded: true,
    exact_qualification_receipt_bound: true,
    predecessor_receipt_binding_required: true,
    supplied_chain_generation_monotonicity_proven: true,
    collector_decision_replay_rejected: true,
    host_payer_machine_continuity_required: true,
    boot_identity_may_advance: true,
    collector_clock_used_as_authority: false,
    collector_evidence_generation_used_as_authority: false,
    deployed_artifact_generation_verified: false,
    trusted_collector_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    rollback_resistance_proven: false,
    live_host_qualification_performed: false,
    filesystem_read: false,
    filesystem_write: false,
    storage_bootstrap: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const SCHEMA =
  "void_coupled_native_gas_reconciliation_custody_receipt_continuity_v1";
const COLLECTOR_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1";
const QUALIFICATION_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1";
const QUALIFICATION_RECEIPT_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_V1";
const QUALIFICATION_RECEIPT_SCHEMA =
  "void_coupled_native_gas_reconciliation_custody_receipt_v1";
const QUALIFICATION_DOMAIN =
  "void-coupled-native-gas-reconciliation-custody-qualification-v1";
const SOURCE_GENERATION_ID =
  "voidngrcsg1_" +
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@+\/-]{1,256}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_COLLECTOR_DECISION_BYTES = 8 * 1024 * 1024;
const MAX_RECEIPTS = 8192;
const ZERO_SHA256 = "sha256:" + "0".repeat(64);

const RECEIPT_KEYS = Object.freeze([
  "boot_id_sha256",
  "collector_completed_at_ms",
  "collector_decision_sha256",
  "collector_evidence_generation",
  "collector_observed_at_ms",
  "generation",
  "host_id",
  "machine_id_sha256",
  "marker",
  "payer_address",
  "payer_domain_id",
  "payer_root_path",
  "previous_receipt_sha256",
  "qualification_id_sha256",
  "qualification_receipt_sha256",
  "receipt_sha256",
  "schema",
  "source_binding_id",
  "source_generation_id",
  "version",
]);

const QUALIFICATION_RECEIPT_KEYS = Object.freeze([
  "boot_id_sha256",
  "evidence_generation",
  "evidence_snapshot_fingerprint_sha256",
  "expires_at_ms",
  "host_id",
  "marker",
  "mount_instance_fingerprint_sha256",
  "observed_at_ms",
  "payer_address",
  "payer_domain_id",
  "payer_root_dev",
  "payer_root_ino",
  "payer_root_mount_id",
  "payer_root_path",
  "qualification_policy_fingerprint_sha256",
  "queue_ino",
  "receipt_sha256",
  "reconciliations_ino",
  "records_ino",
  "schema",
  "service_unit_sha256",
  "version",
]);

const SOURCE_BINDING_KEYS = Object.freeze([
  "authority",
  "bootstrap_receipt_external_trust_proven",
  "collector_generation_binding_proven",
  "collector_source_git_blob_sha1",
  "deployed_artifact_generation_verified",
  "evidence_generation_monotonicity_proven",
  "funds_movement",
  "live_host_qualification_performed",
  "marker",
  "ok",
  "production_gate_ready",
  "qualification_generation_binding_proven",
  "qualification_source_git_blob_sha1",
  "repository",
  "repository_head_sha",
  "repository_origin",
  "repository_tree_sha",
  "reviewed_base_commit_sha",
  "reviewed_source_count",
  "reviewed_source_manifest_sha256",
  "runtime_integration",
  "source_binding_id",
  "source_generation_id",
  "status",
  "storage_bootstrap",
  "trusted_collector_proven",
  "verification_clock_authority_proven",
  "version",
  "writer_generation_binding_proven",
  "writer_source_git_blob_sha1",
]);

const SOURCE_BINDING_ID = /^voidngrcsb1_[0-9a-f]{64}$/u;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const REVIEWED_BASE_COMMIT =
  "70faa71371eed9a8a0de4ffeb6c20e2c737cbc66";
const WRITER_SOURCE_BLOB =
  "d8f17a770ea79c6abc868737fc1d7e4f1850d6dc";
const QUALIFICATION_SOURCE_BLOB =
  "5360a55bed6fccbe8d0dc242273264f2de94bea1";
const COLLECTOR_SOURCE_BLOB =
  "96700dfa3d4973e038aaafd91dbf3f6fa6667034";

function fail(code) {
  throw new Error(code);
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("receipt_continuity_noncanonical_number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  fail("receipt_continuity_noncanonical_value");
}

function sha256Id(value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(String(value), "utf8");
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256Hex(value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(String(value), "utf8");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = ownKeys.map(String).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
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

function snapshotPlain(
  value,
  depth = 0,
  budget = { count: 0, bytes: 0 },
  domain = "receipt_continuity_collector_decision",
) {
  if (depth > 32 || ++budget.count > 50_000) {
    fail(domain + "_too_complex");
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    budget.bytes += Buffer.byteLength(value, "utf8");
    if (budget.bytes > MAX_COLLECTOR_DECISION_BYTES) {
      fail(domain + "_too_large");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      fail(domain + "_noncanonical_number");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 8192) {
      fail(domain + "_too_complex");
    }
    return Object.freeze(value.map((entry) =>
      snapshotPlain(entry, depth + 1, budget, domain)));
  }
  if (!value || typeof value !== "object") {
    fail(domain + "_invalid");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(domain + "_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length > 4096 ||
    keys.some((key) => typeof key !== "string")
  ) {
    fail(domain + "_invalid");
  }
  const out = Object.create(null);
  for (const key of keys) {
    budget.bytes += Buffer.byteLength(key, "utf8");
    if (budget.bytes > MAX_COLLECTOR_DECISION_BYTES) {
      fail(domain + "_too_large");
    }
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(domain + "_invalid");
    }
    out[key] = snapshotPlain(
      descriptor.value,
      depth + 1,
      budget,
      domain,
    );
  }
  return Object.freeze(out);
}

function safeInt(value, min, max, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    fail(code);
  }
  return parsed;
}

function sha256(value, code) {
  const text = String(value ?? "").trim();
  if (!SHA256_ID.test(text)) fail(code);
  return text;
}

function safeId(value, code) {
  const text = String(value ?? "").trim();
  if (!SAFE_ID.test(text)) fail(code);
  return text;
}

function address(value, code) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!ADDRESS.test(text)) fail(code);
  return text;
}

function absolutePath(value, code) {
  const raw = String(value ?? "").trim();
  if (
    !raw ||
    !path.isAbsolute(raw) ||
    path.normalize(raw) !== raw ||
    raw.includes("\0")
  ) {
    fail(code);
  }
  return raw;
}

function receiptBody(record) {
  const body = Object.create(null);
  for (const key of RECEIPT_KEYS) {
    if (key !== "receipt_sha256") body[key] = record[key];
  }
  return Object.freeze(body);
}

function qualificationReceiptBody(record) {
  const body = Object.create(null);
  for (const key of QUALIFICATION_RECEIPT_KEYS) {
    if (key !== "receipt_sha256") body[key] = record[key];
  }
  return Object.freeze(body);
}

function validateQualificationReceipt(input) {
  const receipt = exactObject(
    input,
    QUALIFICATION_RECEIPT_KEYS,
    "receipt_continuity_qualification_receipt_shape_invalid",
  );
  if (
    receipt.schema !== QUALIFICATION_RECEIPT_SCHEMA ||
    receipt.marker !== QUALIFICATION_RECEIPT_MARKER ||
    receipt.version !== 1
  ) {
    fail("receipt_continuity_qualification_receipt_identity_invalid");
  }
  const hostId = safeId(
    receipt.host_id,
    "receipt_continuity_qualification_receipt_host_invalid",
  );
  const payerAddress = address(
    receipt.payer_address,
    "receipt_continuity_qualification_receipt_payer_invalid",
  );
  const payerDomainId = safeId(
    receipt.payer_domain_id,
    "receipt_continuity_qualification_receipt_domain_invalid",
  );
  const payerRootPath = absolutePath(
    receipt.payer_root_path,
    "receipt_continuity_qualification_receipt_root_invalid",
  );
  const observedAt = safeInt(
    receipt.observed_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "receipt_continuity_qualification_receipt_time_invalid",
  );
  const expiresAt = safeInt(
    receipt.expires_at_ms,
    observedAt + 1,
    Number.MAX_SAFE_INTEGER,
    "receipt_continuity_qualification_receipt_time_invalid",
  );
  const evidenceGeneration = String(receipt.evidence_generation ?? "").trim();
  if (!DECIMAL.test(evidenceGeneration)) {
    fail("receipt_continuity_qualification_receipt_generation_invalid");
  }
  const bootId = sha256(
    receipt.boot_id_sha256,
    "receipt_continuity_qualification_receipt_boot_invalid",
  );
  const receiptSha = sha256(
    receipt.receipt_sha256,
    "receipt_continuity_qualification_receipt_hash_invalid",
  );
  if (sha256Id(canonical(qualificationReceiptBody(receipt))) !== receiptSha) {
    fail("receipt_continuity_qualification_receipt_hash_mismatch");
  }
  return Object.freeze({
    receipt,
    receipt_sha256: receiptSha,
    host_id: hostId,
    payer_address: payerAddress,
    payer_domain_id: payerDomainId,
    payer_root_path: payerRootPath,
    evidence_generation: evidenceGeneration,
    observed_at_ms: observedAt,
    expires_at_ms: expiresAt,
    boot_id_sha256: bootId,
  });
}

function normalizeSourceBinding(input) {
  const binding = exactObject(
    snapshotPlain(
      input,
      0,
      { count: 0, bytes: 0 },
      "receipt_continuity_source_binding_shape",
    ),
    SOURCE_BINDING_KEYS,
    "receipt_continuity_source_binding_shape_invalid",
  );
  if (
    binding.ok !== true ||
    binding.status !== "SOURCE_GENERATION_BOUND_NOT_TRUSTED" ||
    binding.marker !==
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1 ||
    binding.version !== 1 ||
    binding.repository !== "6ZoSo9/void-node" ||
    binding.repository_origin !==
      "https://github.com/6ZoSo9/void-node.git" ||
    binding.reviewed_base_commit_sha !== REVIEWED_BASE_COMMIT ||
    binding.reviewed_source_count !== 21 ||
    binding.reviewed_source_manifest_sha256 !==
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1 ||
    binding.source_generation_id !== SOURCE_GENERATION_ID ||
    binding.writer_source_git_blob_sha1 !== WRITER_SOURCE_BLOB ||
    binding.qualification_source_git_blob_sha1 !==
      QUALIFICATION_SOURCE_BLOB ||
    binding.collector_source_git_blob_sha1 !== COLLECTOR_SOURCE_BLOB ||
    binding.writer_generation_binding_proven !== true ||
    binding.qualification_generation_binding_proven !== true ||
    binding.collector_generation_binding_proven !== true ||
    canonical(binding.authority) !==
      canonical(
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
      ) ||
    binding.deployed_artifact_generation_verified !== false ||
    binding.trusted_collector_proven !== false ||
    binding.bootstrap_receipt_external_trust_proven !== false ||
    binding.evidence_generation_monotonicity_proven !== false ||
    binding.verification_clock_authority_proven !== false ||
    binding.live_host_qualification_performed !== false ||
    binding.storage_bootstrap !== false ||
    binding.runtime_integration !== false ||
    binding.production_gate_ready !== false ||
    binding.funds_movement !== false ||
    !HEX40.test(String(binding.repository_head_sha ?? "")) ||
    !HEX40.test(String(binding.repository_tree_sha ?? "")) ||
    !HEX64.test(String(binding.reviewed_source_manifest_sha256 ?? ""))
  ) {
    fail("receipt_continuity_source_binding_invalid");
  }
  const sourceBindingId = String(binding.source_binding_id ?? "").trim();
  if (!SOURCE_BINDING_ID.test(sourceBindingId)) {
    fail("receipt_continuity_source_binding_id_invalid");
  }
  const material = Object.create(null);
  for (const key of SOURCE_BINDING_KEYS) {
    if (key !== "ok" && key !== "source_binding_id") {
      material[key] = binding[key];
    }
  }
  const expectedId =
    "voidngrcsb1_" + sha256Hex(canonical(material));
  if (sourceBindingId !== expectedId) {
    fail("receipt_continuity_source_binding_id_mismatch");
  }
  return Object.freeze({
    source_binding_id: sourceBindingId,
    source_generation_id: SOURCE_GENERATION_ID,
    repository_head_sha: binding.repository_head_sha,
    repository_tree_sha: binding.repository_tree_sha,
  });
}

function normalizeCollectorDecision(input) {
  const decision = snapshotPlain(input);
  if (
    decision.ok !== true ||
    decision.status !== "HOST_EVIDENCE_OBSERVED_SOURCE_QUALIFIED_NOT_AUTHORIZED" ||
    decision.marker !== COLLECTOR_MARKER ||
    decision.version !== 1 ||
    decision.live_observation_backed !== true ||
    decision.synthetic_snapshot_authority !== false ||
    decision.trusted_collector_proven !== false ||
    decision.writer_generation_binding_proven !== false ||
    decision.bootstrap_receipt_external_trust_proven !== false ||
    decision.evidence_generation_monotonicity_proven !== false ||
    decision.verification_clock_authority_proven !== false ||
    decision.live_host_qualification_performed !== false ||
    decision.storage_bootstrap !== false ||
    decision.runtime_integration !== false ||
    decision.production_gate_ready !== false ||
    decision.funds_movement !== false
  ) {
    fail("receipt_continuity_collector_decision_not_live_source_qualified");
  }

  const qualification = decision.qualification;
  if (
    !qualification ||
    typeof qualification !== "object" ||
    qualification.ok !== true ||
    qualification.status !== "source_qualified" ||
    qualification.marker !== QUALIFICATION_MARKER ||
    qualification.version !== 1 ||
    qualification.writer_generation_binding_proven !== false ||
    qualification.bootstrap_receipt_external_trust_proven !== false ||
    qualification.evidence_generation_monotonicity_proven !== false ||
    qualification.verification_clock_authority_proven !== false ||
    qualification.live_host_qualification_performed !== false ||
    qualification.storage_bootstrap !== false ||
    qualification.runtime_integration !== false ||
    qualification.production_gate_ready !== false
  ) {
    fail("receipt_continuity_qualification_decision_invalid");
  }

  const qualificationId = sha256(
    qualification.qualification_id_sha256,
    "receipt_continuity_qualification_id_invalid",
  );
  const qualified = validateQualificationReceipt(
    qualification.receipt,
  );
  const policyFingerprint = sha256(
    qualification.qualification_policy_fingerprint_sha256,
    "receipt_continuity_qualification_policy_fingerprint_invalid",
  );
  const evidenceFingerprint = sha256(
    qualification.evidence_snapshot_fingerprint_sha256,
    "receipt_continuity_qualification_evidence_fingerprint_invalid",
  );
  const mountFingerprint = sha256(
    qualification.mount_instance_fingerprint_sha256,
    "receipt_continuity_qualification_mount_fingerprint_invalid",
  );
  if (
    String(qualification.host_id ?? "") !== qualified.host_id ||
    String(qualification.payer_address ?? "").toLowerCase() !==
      qualified.payer_address ||
    String(qualification.payer_domain_id ?? "") !==
      qualified.payer_domain_id ||
    String(qualification.payer_root_path ?? "") !==
      qualified.payer_root_path ||
    policyFingerprint !==
      qualified.receipt.qualification_policy_fingerprint_sha256 ||
    evidenceFingerprint !==
      qualified.receipt.evidence_snapshot_fingerprint_sha256 ||
    mountFingerprint !==
      qualified.receipt.mount_instance_fingerprint_sha256
  ) {
    fail("receipt_continuity_qualification_decision_receipt_mismatch");
  }
  const expectedQualificationId = sha256Id(
    canonical({
      domain: QUALIFICATION_DOMAIN,
      qualification_policy_fingerprint_sha256: policyFingerprint,
      evidence_snapshot_fingerprint_sha256: evidenceFingerprint,
      receipt_sha256: qualified.receipt_sha256,
    }),
  );
  if (qualificationId !== expectedQualificationId) {
    fail("receipt_continuity_qualification_id_mismatch");
  }

  const collectorEvidence = decision.collector_evidence;
  if (!collectorEvidence || typeof collectorEvidence !== "object") {
    fail("receipt_continuity_collector_evidence_invalid");
  }
  const observedAt = safeInt(
    collectorEvidence.observed_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "receipt_continuity_collector_evidence_time_invalid",
  );
  const completedAt = safeInt(
    collectorEvidence.completed_at_ms,
    observedAt,
    Number.MAX_SAFE_INTEGER,
    "receipt_continuity_collector_evidence_time_invalid",
  );
  const bootId = sha256(
    collectorEvidence.boot_id_sha256,
    "receipt_continuity_collector_evidence_boot_invalid",
  );
  const machineId = sha256(
    collectorEvidence.machine_id_sha256,
    "receipt_continuity_collector_evidence_machine_invalid",
  );
  if (
    observedAt !== qualified.observed_at_ms ||
    bootId !== qualified.boot_id_sha256
  ) {
    fail("receipt_continuity_collector_qualification_evidence_mismatch");
  }

  const suppliedGeneration = String(
    decision.classifier_input?.host_evidence?.evidence_snapshot
      ?.evidence_generation ?? "",
  ).trim();
  if (
    suppliedGeneration !== qualified.evidence_generation
  ) {
    fail("receipt_continuity_collector_generation_binding_mismatch");
  }

  return Object.freeze({
    collector_decision_sha256: sha256Id(canonical(decision)),
    qualification_id_sha256: qualificationId,
    qualification_receipt_sha256: qualified.receipt_sha256,
    host_id: qualified.host_id,
    payer_address: qualified.payer_address,
    payer_domain_id: qualified.payer_domain_id,
    payer_root_path: qualified.payer_root_path,
    machine_id_sha256: machineId,
    boot_id_sha256: bootId,
    collector_observed_at_ms: observedAt,
    collector_completed_at_ms: completedAt,
    collector_evidence_generation: qualified.evidence_generation,
  });
}

function normalizeJournalBytes(input) {
  if (Buffer.isBuffer(input)) {
    if (input.length > MAX_JOURNAL_BYTES) {
      fail("receipt_continuity_journal_too_large");
    }
    return Buffer.from(input);
  }
  if (typeof input === "string") {
    const bytes = Buffer.from(input, "utf8");
    if (bytes.length > MAX_JOURNAL_BYTES) {
      fail("receipt_continuity_journal_too_large");
    }
    return bytes;
  }
  fail("receipt_continuity_journal_input_invalid");
}

function parseReceiptLine(line, expectedGeneration, expectedPrevious) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    fail("receipt_continuity_journal_json_invalid");
  }
  const receipt = exactObject(
    parsed,
    RECEIPT_KEYS,
    "receipt_continuity_receipt_shape_invalid",
  );
  if (line !== canonical(receipt)) {
    fail("receipt_continuity_receipt_serialization_noncanonical");
  }
  if (
    receipt.schema !== SCHEMA ||
    receipt.marker !==
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1 ||
    receipt.version !== 1
  ) {
    fail("receipt_continuity_receipt_identity_invalid");
  }
  const generation = safeInt(
    receipt.generation,
    1,
    MAX_RECEIPTS,
    "receipt_continuity_generation_invalid",
  );
  if (generation !== expectedGeneration) {
    fail("receipt_continuity_generation_not_monotonic");
  }
  const previous = sha256(
    receipt.previous_receipt_sha256,
    "receipt_continuity_previous_receipt_invalid",
  );
  if (previous !== expectedPrevious) {
    fail("receipt_continuity_previous_receipt_mismatch");
  }
  if (receipt.source_generation_id !== SOURCE_GENERATION_ID) {
    fail("receipt_continuity_source_generation_mismatch");
  }
  const normalized = Object.freeze({
    generation,
    previous_receipt_sha256: previous,
    collector_decision_sha256: sha256(
      receipt.collector_decision_sha256,
      "receipt_continuity_collector_hash_invalid",
    ),
    qualification_id_sha256: sha256(
      receipt.qualification_id_sha256,
      "receipt_continuity_qualification_id_invalid",
    ),
    qualification_receipt_sha256: sha256(
      receipt.qualification_receipt_sha256,
      "receipt_continuity_qualification_receipt_hash_invalid",
    ),
    host_id: safeId(
      receipt.host_id,
      "receipt_continuity_host_invalid",
    ),
    payer_address: address(
      receipt.payer_address,
      "receipt_continuity_payer_invalid",
    ),
    payer_domain_id: safeId(
      receipt.payer_domain_id,
      "receipt_continuity_payer_domain_invalid",
    ),
    payer_root_path: absolutePath(
      receipt.payer_root_path,
      "receipt_continuity_payer_root_invalid",
    ),
    machine_id_sha256: sha256(
      receipt.machine_id_sha256,
      "receipt_continuity_machine_invalid",
    ),
    boot_id_sha256: sha256(
      receipt.boot_id_sha256,
      "receipt_continuity_boot_invalid",
    ),
    collector_observed_at_ms: safeInt(
      receipt.collector_observed_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "receipt_continuity_collector_time_invalid",
    ),
    collector_completed_at_ms: safeInt(
      receipt.collector_completed_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "receipt_continuity_collector_time_invalid",
    ),
    collector_evidence_generation: String(
      receipt.collector_evidence_generation ?? "",
    ).trim(),
  });
  if (
    normalized.collector_completed_at_ms <
      normalized.collector_observed_at_ms ||
    !DECIMAL.test(normalized.collector_evidence_generation)
  ) {
    fail("receipt_continuity_collector_time_invalid");
  }
  const receiptSha = sha256(
    receipt.receipt_sha256,
    "receipt_continuity_receipt_hash_invalid",
  );
  if (sha256Id(canonical(receiptBody(receipt))) !== receiptSha) {
    fail("receipt_continuity_receipt_hash_mismatch");
  }
  return Object.freeze({
    ...normalized,
    source_binding_id: (() => {
      const value = String(receipt.source_binding_id ?? "").trim();
      if (!SOURCE_BINDING_ID.test(value)) {
        fail("receipt_continuity_source_binding_id_invalid");
      }
      return value;
    })(),
    source_generation_id: SOURCE_GENERATION_ID,
    receipt_sha256: receiptSha,
    record: receipt,
  });
}

function classifyInternal(journalInput) {
  const bytes = normalizeJournalBytes(journalInput);
  if (bytes.length === 0) {
    return Object.freeze({
      records: Object.freeze([]),
      record_count: 0,
      generation: 0,
      tip_receipt_sha256: ZERO_SHA256,
      host_id: null,
      payer_address: null,
      payer_domain_id: null,
      payer_root_path: null,
      machine_id_sha256: null,
    });
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("receipt_continuity_journal_utf8_invalid");
  }
  if (!text.endsWith("\n")) {
    fail("receipt_continuity_journal_missing_final_newline");
  }
  const lines = text.slice(0, -1).split("\n");
  if (
    lines.length > MAX_RECEIPTS ||
    lines.some((line) => line.length === 0)
  ) {
    fail("receipt_continuity_journal_record_count_invalid");
  }

  const records = [];
  const collectorHashes = new Set();
  let previous = ZERO_SHA256;
  let identity = null;
  for (let index = 0; index < lines.length; index += 1) {
    const record = parseReceiptLine(lines[index], index + 1, previous);
    if (collectorHashes.has(record.collector_decision_sha256)) {
      fail("receipt_continuity_collector_decision_replayed");
    }
    collectorHashes.add(record.collector_decision_sha256);
    const currentIdentity = [
      record.host_id,
      record.payer_address,
      record.payer_domain_id,
      record.payer_root_path,
      record.machine_id_sha256,
    ].join("\n");
    if (identity === null) identity = currentIdentity;
    else if (currentIdentity !== identity) {
      fail("receipt_continuity_custody_identity_changed");
    }
    records.push(record);
    previous = record.receipt_sha256;
  }
  const tip = records[records.length - 1];
  return Object.freeze({
    records: Object.freeze(records),
    record_count: records.length,
    generation: tip.generation,
    tip_receipt_sha256: tip.receipt_sha256,
    host_id: tip.host_id,
    payer_address: tip.payer_address,
    payer_domain_id: tip.payer_domain_id,
    payer_root_path: tip.payer_root_path,
    machine_id_sha256: tip.machine_id_sha256,
  });
}

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1,
    version: 1,
    reason,
    supplied_chain_generation_monotonicity_proven: false,
    trusted_collector_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    rollback_resistance_proven: false,
    live_host_qualification_performed: false,
    storage_bootstrap: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_AUTHORITY_V1,
  });
}

export function classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
  journalInput,
) {
  try {
    const classified = classifyInternal(journalInput);
    return Object.freeze({
      ok: true,
      status: classified.record_count === 0 ? "empty" : "classified",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1,
      version: 1,
      source_generation_id: SOURCE_GENERATION_ID,
      record_count: classified.record_count,
      generation: classified.generation,
      tip_receipt_sha256: classified.tip_receipt_sha256,
      host_id: classified.host_id,
      payer_address: classified.payer_address,
      payer_domain_id: classified.payer_domain_id,
      payer_root_path: classified.payer_root_path,
      machine_id_sha256: classified.machine_id_sha256,
      supplied_chain_generation_monotonicity_proven: true,
      trusted_collector_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      rollback_resistance_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}

export function planCoupledNativeGasReconciliationCustodyReceiptV1({
  journal_jsonl,
  collector_decision,
  source_binding,
} = {}) {
  try {
    const journalBytes = normalizeJournalBytes(journal_jsonl);
    const current = classifyInternal(journalBytes);
    if (current.record_count >= MAX_RECEIPTS) {
      fail("receipt_continuity_journal_record_count_invalid");
    }
    const collector = normalizeCollectorDecision(collector_decision);
    const sourceBinding = normalizeSourceBinding(source_binding);
    if (
      current.records.some(
        (record) =>
          record.collector_decision_sha256 ===
          collector.collector_decision_sha256,
      )
    ) {
      fail("receipt_continuity_collector_decision_replayed");
    }
    if (current.record_count > 0) {
      if (
        collector.host_id !== current.host_id ||
        collector.payer_address !== current.payer_address ||
        collector.payer_domain_id !== current.payer_domain_id ||
        collector.payer_root_path !== current.payer_root_path ||
        collector.machine_id_sha256 !== current.machine_id_sha256
      ) {
        fail("receipt_continuity_custody_identity_changed");
      }
    }

    const body = Object.freeze({
      schema: SCHEMA,
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1,
      version: 1,
      generation: current.generation + 1,
      previous_receipt_sha256: current.tip_receipt_sha256,
      source_binding_id: sourceBinding.source_binding_id,
      source_generation_id: SOURCE_GENERATION_ID,
      collector_decision_sha256:
        collector.collector_decision_sha256,
      qualification_id_sha256:
        collector.qualification_id_sha256,
      qualification_receipt_sha256:
        collector.qualification_receipt_sha256,
      host_id: collector.host_id,
      payer_address: collector.payer_address,
      payer_domain_id: collector.payer_domain_id,
      payer_root_path: collector.payer_root_path,
      machine_id_sha256: collector.machine_id_sha256,
      boot_id_sha256: collector.boot_id_sha256,
      collector_observed_at_ms:
        collector.collector_observed_at_ms,
      collector_completed_at_ms:
        collector.collector_completed_at_ms,
      collector_evidence_generation:
        collector.collector_evidence_generation,
    });
    const record = Object.freeze({
      ...body,
      receipt_sha256: sha256Id(canonical(body)),
    });
    const append = canonical(record) + "\n";
    if (journalBytes.length + Buffer.byteLength(append, "utf8") >
        MAX_JOURNAL_BYTES) {
      fail("receipt_continuity_journal_too_large");
    }
    const nextBytes = Buffer.concat([
      journalBytes,
      Buffer.from(append, "utf8"),
    ]);
    const post = classifyInternal(nextBytes);
    if (
      post.record_count !== current.record_count + 1 ||
      post.tip_receipt_sha256 !== record.receipt_sha256
    ) {
      fail("receipt_continuity_postplan_reclassification_failed");
    }
    return Object.freeze({
      ok: true,
      status: "planned",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1,
      version: 1,
      operation_performed: false,
      source_binding_id: sourceBinding.source_binding_id,
      source_generation_id: SOURCE_GENERATION_ID,
      generation: record.generation,
      previous_receipt_sha256: record.previous_receipt_sha256,
      receipt_sha256: record.receipt_sha256,
      collector_decision_sha256: record.collector_decision_sha256,
      append_jsonl: append,
      record,
      supplied_chain_generation_monotonicity_proven: true,
      trusted_collector_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      rollback_resistance_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1 =
  SOURCE_GENERATION_ID;
