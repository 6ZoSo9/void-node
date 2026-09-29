#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1,
  verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1,
  voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1,
} from "./void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_AUTHORITY_V1 =
  Object.freeze({
    source_verification_only: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
  });

const ROLES = Object.freeze(["precision", "nimo", "xiphos"]);
const ROLE_SET = new Set(ROLES);
const IDENTITY_GIT_BLOBS = Object.freeze({
  precision: "5e3f3873d78f99682ee66f5b67df302699a3145c",
  nimo: "449e693bb8e3cca2335b966a1c432b729cd76ac3",
  xiphos: "413bb16bd6805d95055f49da510c45d67ce1a769",
});
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2ve1_[0-9a-f]{64}$/u;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const FACTS_KEYS = Object.freeze([
  "marker",
  "version",
  "machine_role",
  "hostname",
  "void_node_id",
  "besu_validator_address",
  "besu_public_key",
  "node_private_key_path",
  "node_private_key_mode",
  "node_private_key_matches_canonical_identity",
  "node_private_key_content_exported",
  "node_private_key_stdout",
  "void_health_loopback_verified",
  "besu_image",
  "plugin_name",
  "plugin_jar_sha256",
  "plugin_loaded",
  "transaction_validation_rule_registered",
  "local_unmarked_raw_transaction_rejected",
  "raw_public_rpc_disabled",
  "rpc_host_binding",
  "external_p2p_exposure",
  "startup_fail_closed_on_plugin_mismatch",
  "production_rpc_contact",
  "authoritative_chain2050_write",
  "validator_mutation",
  "funds_movement",
  "runtime_result_sha256",
  "besu_log_sha256",
]);
const INPUT_KEYS = Object.freeze([
  "binding_candidate",
  "raw_domain_policy",
  "plugin_artifact_manifest",
  "evaluation_time_utc",
  "bundles",
]);
const BUNDLE_KEYS = Object.freeze([
  "machine_role",
  "runtime_result_json",
  "facts_json",
  "identity_attestation_json",
  "besu_log_text",
  "plugin_jar_sha256",
  "candidate",
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

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function gitBlobSha(value) {
  const bytes = Buffer.from(value, "utf8");
  return createHash("sha1")
    .update("blob " + String(bytes.length) + "\0", "utf8")
    .update(bytes)
    .digest("hex");
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
  fail("runtime_import_canonical_value_invalid");
}

function parseJsonText(value, code) {
  if (typeof value !== "string" || value.length < 2 || value.length > 8_000_000) {
    fail(code);
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    fail(code);
  }
  if (!plain(parsed)) fail(code);
  return parsed;
}

function canonicalUtc(value, code) {
  if (typeof value !== "string" || !CANONICAL_UTC.test(value)) fail(code);
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(code);
  }
  return ms;
}

function canonicalRole(value) {
  const role = String(value || "").toLowerCase();
  if (!ROLE_SET.has(role)) fail("runtime_import_machine_role_invalid");
  return role;
}

function bindingEntry(binding, role) {
  const entries = binding?.qbft?.production_binding_entries;
  if (!Array.isArray(entries)) fail("runtime_import_binding_entries_invalid");
  const entry = entries.find((row) => row?.machine_role === role);
  if (!entry) fail("runtime_import_binding_entry_missing");
  return entry;
}

function canonicalIdentity(binding, role) {
  const identity = bindingEntry(binding, role);
  return Object.freeze({
    machine_role: role,
    void_node_id: String(identity.void_node_id),
    besu_validator_address: String(identity.besu_validator_address).toLowerCase(),
    besu_public_key: String(identity.besu_public_key).toLowerCase(),
    node_identity_attestation_sha256:
      String(identity.node_identity_attestation_sha256),
  });
}

function validateIdentityAttestation(identity, identityText, role, binding) {
  if (
    identity?.marker !==
      "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1" ||
    identity?.machine_role !== role ||
    typeof identity?.hostname !== "string" ||
    identity.hostname.length < 1 ||
    identity?.void_node_id !== binding.void_node_id ||
    String(identity?.besu?.public_key || "").toLowerCase() !==
      binding.besu_public_key ||
    String(identity?.besu?.validator_address || "").toLowerCase() !==
      binding.besu_validator_address ||
    identity?.local_private_attestation?.file_sha256 !==
      binding.node_identity_attestation_sha256 ||
    gitBlobSha(identityText) !== IDENTITY_GIT_BLOBS[role]
  ) {
    fail("runtime_import_identity_attestation_mismatch");
  }
  return identity;
}

function validateRuntimeResult(runtime) {
  if (
    runtime?.marker !==
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1" ||
    runtime?.status !== "BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN" ||
    runtime?.client?.name !== "Besu" ||
    runtime?.client?.version !== "26.8.1" ||
    runtime?.client?.chain_id !== 2050 ||
    runtime?.client?.network_id !== "2050" ||
    runtime?.client?.consensus !== "QBFT" ||
    runtime?.client?.validator_count !== 1 ||
    runtime?.negative_cases?.legacy_type0?.rejected !== true ||
    runtime?.negative_cases?.missing_marker?.rejected !== true ||
    runtime?.negative_cases?.wrong_marker?.rejected !== true ||
    runtime?.negative_cases?.duplicate_marker?.rejected !== true ||
    runtime?.negative_cases?.rejected_transaction_nonce_unchanged !== true ||
    runtime?.positive_case?.accepted_and_mined !== true ||
    runtime?.gates?.plugin_loaded_and_rule_registered !== true ||
    runtime?.gates?.plugin_runtime_negative_cases_proven !== true ||
    runtime?.gates?.besu_transaction_validation_rule_runtime_proven !== true ||
    runtime?.authority?.production_rpc_contact !== false ||
    runtime?.authority?.authoritative_chain2050_write !== false ||
    runtime?.authority?.funds_movement !== false
  ) {
    fail("runtime_import_runtime_result_invalid");
  }
}

function validateFacts(
  facts,
  role,
  identity,
  canonicalAttestation,
  runtimeSha,
  logSha,
  pluginSha,
) {
  const value = exactObject(
    facts,
    FACTS_KEYS,
    "runtime_import_facts_shape_invalid",
  );
  const suffix =
    "/.local/share/void/epoch2-qbft-validator-identity-v1/" +
    role +
    "/nodekey";
  if (
    value.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_LOCAL_RUNTIME_FACTS_V1" ||
    value.version !== 1 ||
    value.machine_role !== role ||
    value.hostname !== canonicalAttestation.hostname ||
    value.void_node_id !== identity.void_node_id ||
    String(value.besu_validator_address).toLowerCase() !==
      identity.besu_validator_address ||
    String(value.besu_public_key).toLowerCase() !== identity.besu_public_key ||
    typeof value.node_private_key_path !== "string" ||
    !value.node_private_key_path.endsWith(suffix) ||
    !["400", "600"].includes(value.node_private_key_mode) ||
    value.node_private_key_matches_canonical_identity !== true ||
    value.node_private_key_content_exported !== false ||
    value.node_private_key_stdout !== false ||
    value.void_health_loopback_verified !== true ||
    value.besu_image !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .besu_image ||
    value.plugin_name !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
        .plugin_name ||
    value.plugin_jar_sha256 !== pluginSha ||
    value.plugin_loaded !== true ||
    value.transaction_validation_rule_registered !== true ||
    value.local_unmarked_raw_transaction_rejected !== true ||
    value.raw_public_rpc_disabled !== true ||
    value.rpc_host_binding !== "127.0.0.1" ||
    value.external_p2p_exposure !== false ||
    value.startup_fail_closed_on_plugin_mismatch !== true ||
    value.production_rpc_contact !== false ||
    value.authoritative_chain2050_write !== false ||
    value.validator_mutation !== false ||
    value.funds_movement !== false ||
    value.runtime_result_sha256 !== runtimeSha ||
    value.besu_log_sha256 !== logSha
  ) {
    fail("runtime_import_facts_binding_mismatch");
  }
  return value;
}

function validateLog(text) {
  if (typeof text !== "string" || text.length < 1 || text.length > 16_000_000) {
    fail("runtime_import_besu_log_invalid");
  }
  for (const required of [
    "Registered plugin of type org.voidnetwork.besu.epoch2.VoidEpoch2RawTransactionDomainPlugin",
    "Registered new transaction validator rule",
  ]) {
    if (!text.includes(required)) fail("runtime_import_besu_log_semantics_missing");
  }
}

function candidateFor({
  role,
  identity,
  facts,
  candidate,
  pluginSha,
}) {
  const expected =
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1;
  const row = {
    marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
    version: 1,
    status: "RUNTIME_ENFORCEMENT_EVIDENCE_CANDIDATE",
    machine_role: role,
    void_node_id: identity.void_node_id,
    besu_validator_address: identity.besu_validator_address,
    besu_public_key: identity.besu_public_key,
    node_identity_attestation_sha256:
      identity.node_identity_attestation_sha256,
    chain_id: 2050,
    execution_epoch: 2,
    besu_client: expected.besu_client,
    besu_version: expected.besu_version,
    besu_image: expected.besu_image,
    plugin_name: expected.plugin_name,
    plugin_jar_sha256: pluginSha,
    plugin_loaded: true,
    transaction_validation_rule_registered: true,
    local_unmarked_raw_transaction_rejected: true,
    raw_public_rpc_disabled: true,
    startup_fail_closed_on_plugin_mismatch: true,
    peer_import_protocol_rejection_source_head:
      expected.peer_import_source_head,
    peer_import_workflow_run_id: expected.peer_import_workflow_run_id,
    observed_at_utc: candidate.observed_at_utc,
    valid_until_utc: candidate.valid_until_utc,
    market_activation_authorized: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    evidence_id: "voide2ve1_" + "0".repeat(64),
  };
  row.evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(row);
  if (
    facts.machine_role !== row.machine_role ||
    facts.void_node_id !== row.void_node_id
  ) {
    fail("runtime_import_candidate_facts_identity_mismatch");
  }
  return Object.freeze(row);
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function importBundle(bundleRaw, binding) {
  const bundle = exactObject(
    bundleRaw,
    BUNDLE_KEYS,
    "runtime_import_bundle_shape_invalid",
  );
  const role = canonicalRole(bundle.machine_role);
  const identity = canonicalIdentity(binding, role);
  const runtimeText = bundle.runtime_result_json;
  const factsText = bundle.facts_json;
  const identityText = bundle.identity_attestation_json;
  const logText = bundle.besu_log_text;
  const runtime = parseJsonText(runtimeText, "runtime_import_runtime_json_invalid");
  const facts = parseJsonText(factsText, "runtime_import_facts_json_invalid");
  const identityAttestation = parseJsonText(
    identityText,
    "runtime_import_identity_attestation_json_invalid",
  );
  const runtimeSha = sha256Text(runtimeText);
  const factsSha = sha256Text(factsText);
  const logSha = sha256Text(logText);
  const pluginSha = String(bundle.plugin_jar_sha256 || "");

  if (!SHA256.test(pluginSha)) fail("runtime_import_plugin_sha256_invalid");
  if (
    pluginSha !==
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1
      .plugin_jar_sha256
  ) {
    fail("runtime_import_plugin_sha256_mismatch");
  }

  const canonicalAttestation = validateIdentityAttestation(
    identityAttestation,
    identityText,
    role,
    identity,
  );
  validateRuntimeResult(runtime);
  validateLog(logText);
  const checkedFacts =
    validateFacts(
      facts,
      role,
      identity,
      canonicalAttestation,
      runtimeSha,
      logSha,
      pluginSha,
    );

  const candidate = bundle.candidate;
  if (!plain(candidate)) fail("runtime_import_candidate_invalid");
  canonicalUtc(candidate.observed_at_utc, "runtime_import_observed_time_invalid");
  canonicalUtc(candidate.valid_until_utc, "runtime_import_valid_until_invalid");
  if (
    typeof candidate.evidence_id !== "string" ||
    !EVIDENCE_ID.test(candidate.evidence_id)
  ) {
    fail("runtime_import_candidate_evidence_id_invalid");
  }

  const reconstructed = candidateFor({
    role,
    identity,
    facts: checkedFacts,
    candidate,
    pluginSha,
  });
  if (!sameJson(candidate, reconstructed)) {
    fail("runtime_import_candidate_reconstruction_mismatch");
  }

  return Object.freeze({
    role,
    evidence: reconstructed,
    evidence_id: reconstructed.evidence_id,
    runtime_result_sha256: runtimeSha,
    facts_sha256: factsSha,
    identity_attestation_git_blob_sha: gitBlobSha(identityText),
    private_attestation_sha256:
      identityAttestation.local_private_attestation.file_sha256,
    besu_log_sha256: logSha,
    plugin_jar_sha256: pluginSha,
    raw_bundle_semantically_verified: true,
  });
}

export function verifyVoidEconomicEpoch2ProductionValidatorRuntimeImportV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "runtime_import_input_shape_invalid",
  );
  if (!Array.isArray(request.bundles) || request.bundles.length !== ROLES.length) {
    fail("runtime_import_bundle_set_incomplete");
  }

  const imported = request.bundles.map((bundle) =>
    importBundle(bundle, request.binding_candidate),
  );
  const observedRoles = imported.map((row) => row.role);
  if (
    observedRoles.length !== ROLES.length ||
    observedRoles.some((role, index) => role !== ROLES[index])
  ) {
    fail("runtime_import_role_order_or_set_mismatch");
  }

  const fleet = verifyVoidEconomicEpoch2ProductionValidatorDomainEnforcementV1({
    binding_candidate: request.binding_candidate,
    raw_domain_policy: request.raw_domain_policy,
    plugin_artifact_manifest: request.plugin_artifact_manifest,
    expected_evidence_ids: imported.map((row) => row.evidence_id),
    evaluation_time_utc: request.evaluation_time_utc,
    validator_evidence_rows: imported.map((row) => row.evidence),
  });
  if (
    fleet?.ok !== true ||
    fleet.status !==
      "ENFORCEMENT_EVIDENCE_CANDIDATE_VALID_UPSTREAM_RUNTIME_UNVERIFIED" ||
    fleet.validator_evidence_candidate_count !== 3 ||
    fleet.all_production_validators_epoch_domain_enforced !== false
  ) {
    fail("runtime_import_fleet_contract_mismatch");
  }

  return Object.freeze({
    ok: true,
    status:
      "THREE_HOST_RUNTIME_BUNDLES_SEMANTICALLY_VERIFIED_PRODUCTION_SERVICE_HOLD",
    marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_V1,
    chain_id: 2050,
    execution_epoch: 2,
    imported_role_count: 3,
    imported_roles: Object.freeze([...ROLES]),
    evidence_ids: Object.freeze(imported.map((row) => row.evidence_id)),
    source_bundle_digests: Object.freeze(
      imported.map((row) =>
        Object.freeze({
          machine_role: row.role,
          runtime_result_sha256: row.runtime_result_sha256,
          facts_sha256: row.facts_sha256,
          identity_attestation_git_blob_sha:
            row.identity_attestation_git_blob_sha,
          private_attestation_sha256:
            row.private_attestation_sha256,
          besu_log_sha256: row.besu_log_sha256,
          plugin_jar_sha256: row.plugin_jar_sha256,
        }),
      ),
    ),
    upstream_runtime_evidence_semantically_verified: true,
    disposable_runtime_identity_bound: true,
    production_service_configuration_verified: false,
    production_service_runtime_plugin_enforcement_verified: false,
    all_production_validators_epoch_domain_enforced: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_IMPORT_AUTHORITY_V1,
  });
}
