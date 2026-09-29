#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1,
  voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1,
} from "./void-economic-epoch2-production-validator-domain-enforcement-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1";

const BINDING_PATH =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const ARTIFACT_PATH =
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json";
const RUNTIME_MARKER =
  "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1";
const FACTS_MARKER =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_LOCAL_RUNTIME_FACTS_V1";
const ROLES = new Set(["precision", "nimo", "xiphos"]);
const SHA256 = /^[0-9a-f]{64}$/;

function fail(reason) {
  throw new Error(reason);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sha256File(filename) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filename))
    .digest("hex");
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function exactObject(value, keys, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(reason);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return value;
}

function identityPath(role) {
  return `ops/mainnet0/economic-epoch2-qbft-node-identity-${role}-v1.json`;
}

export function buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
  machineRole,
  runtimeResult,
  runtimeResultSha256,
  facts,
  factsSha256,
  pluginJarSha256,
  besuLogSha256,
  observedAtUtc,
  validUntilUtc,
}) {
  const role = String(machineRole || "").toLowerCase();
  if (!ROLES.has(role)) fail("machine_role_not_canonical");

  const binding = readJson(BINDING_PATH);
  const identity = readJson(identityPath(role));
  const artifact = readJson(ARTIFACT_PATH);
  const expected =
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_EXPECTED_V1;

  const entry = binding.qbft?.production_binding_entries?.find(
    (row) => row.machine_role === role,
  );
  if (!entry) fail("canonical_binding_entry_missing");

  if (
    binding.qbft?.required_live_node_count !== 3 ||
    binding.qbft?.attested_live_node_count !== 3 ||
    binding.qbft?.attested_identity_slots_remaining !== 0 ||
    binding.qbft?.production_validator_count !== 3 ||
    binding.qbft?.required_validator_quorum !== 2 ||
    binding.qbft?.byzantine_fault_tolerance !== 0 ||
    binding.qbft?.fourth_validator_required_for_launch !== false
  ) {
    fail("canonical_three_validator_binding_invalid");
  }

  if (
    identity?.marker !==
      "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1" ||
    identity?.machine_role !== role ||
    identity?.void_node_id !== entry.void_node_id ||
    String(identity?.besu?.public_key || "").toLowerCase() !==
      String(entry.besu_public_key).toLowerCase() ||
    String(identity?.besu?.validator_address || "").toLowerCase() !==
      String(entry.besu_validator_address).toLowerCase() ||
    identity?.local_private_attestation?.file_sha256 !==
      entry.node_identity_attestation_sha256
  ) {
    fail("canonical_public_identity_binding_mismatch");
  }

  if (
    artifact?.marker !==
      "VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_ARTIFACT_V1" ||
    artifact?.jar_sha256 !== expected.plugin_jar_sha256 ||
    pluginJarSha256 !== expected.plugin_jar_sha256
  ) {
    fail("canonical_plugin_artifact_mismatch");
  }

  if (
    runtimeResult?.marker !== RUNTIME_MARKER ||
    runtimeResult?.status !==
      "BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN" ||
    runtimeResult?.client?.name !== "Besu" ||
    runtimeResult?.client?.version !== "26.8.1" ||
    runtimeResult?.client?.chain_id !== 2050 ||
    runtimeResult?.client?.network_id !== "2050" ||
    runtimeResult?.client?.consensus !== "QBFT" ||
    runtimeResult?.client?.validator_count !== 1 ||
    runtimeResult?.negative_cases?.legacy_type0?.rejected !== true ||
    runtimeResult?.negative_cases?.missing_marker?.rejected !== true ||
    runtimeResult?.negative_cases?.wrong_marker?.rejected !== true ||
    runtimeResult?.negative_cases?.duplicate_marker?.rejected !== true ||
    runtimeResult?.negative_cases?.rejected_transaction_nonce_unchanged !==
      true ||
    runtimeResult?.positive_case?.accepted_and_mined !== true ||
    runtimeResult?.gates?.plugin_loaded_and_rule_registered !== true ||
    runtimeResult?.gates?.plugin_runtime_negative_cases_proven !== true ||
    runtimeResult?.gates?.besu_transaction_validation_rule_runtime_proven !==
      true ||
    runtimeResult?.authority?.production_rpc_contact !== false ||
    runtimeResult?.authority?.authoritative_chain2050_write !== false ||
    runtimeResult?.authority?.funds_movement !== false
  ) {
    fail("local_disposable_runtime_result_invalid");
  }

  exactObject(
    facts,
    [
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
    ],
    "local_runtime_facts_shape_invalid",
  );

  if (
    facts.marker !== FACTS_MARKER ||
    facts.version !== 1 ||
    facts.machine_role !== role ||
    facts.hostname !== os.hostname() ||
    facts.void_node_id !== entry.void_node_id ||
    String(facts.besu_validator_address).toLowerCase() !==
      String(entry.besu_validator_address).toLowerCase() ||
    String(facts.besu_public_key).toLowerCase() !==
      String(entry.besu_public_key).toLowerCase() ||
    !["400", "600"].includes(facts.node_private_key_mode) ||
    facts.node_private_key_matches_canonical_identity !== true ||
    facts.node_private_key_content_exported !== false ||
    facts.node_private_key_stdout !== false ||
    facts.void_health_loopback_verified !== true ||
    facts.besu_image !== expected.besu_image ||
    facts.plugin_name !== expected.plugin_name ||
    facts.plugin_jar_sha256 !== expected.plugin_jar_sha256 ||
    facts.plugin_loaded !== true ||
    facts.transaction_validation_rule_registered !== true ||
    facts.local_unmarked_raw_transaction_rejected !== true ||
    facts.raw_public_rpc_disabled !== true ||
    facts.rpc_host_binding !== "127.0.0.1" ||
    facts.external_p2p_exposure !== false ||
    facts.startup_fail_closed_on_plugin_mismatch !== true ||
    facts.production_rpc_contact !== false ||
    facts.authoritative_chain2050_write !== false ||
    facts.validator_mutation !== false ||
    facts.funds_movement !== false ||
    facts.runtime_result_sha256 !== runtimeResultSha256 ||
    facts.besu_log_sha256 !== besuLogSha256
  ) {
    fail("local_runtime_facts_binding_mismatch");
  }

  for (const value of [
    runtimeResultSha256,
    factsSha256,
    pluginJarSha256,
    besuLogSha256,
  ]) {
    if (!SHA256.test(String(value || ""))) fail("sha256_invalid");
  }

  const evidence = {
    marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1,
    version: 1,
    status: "RUNTIME_ENFORCEMENT_EVIDENCE_CANDIDATE",
    machine_role: role,
    void_node_id: entry.void_node_id,
    besu_validator_address: String(entry.besu_validator_address).toLowerCase(),
    besu_public_key: String(entry.besu_public_key).toLowerCase(),
    node_identity_attestation_sha256:
      entry.node_identity_attestation_sha256,
    chain_id: 2050,
    execution_epoch: 2,
    besu_client: expected.besu_client,
    besu_version: expected.besu_version,
    besu_image: expected.besu_image,
    plugin_name: expected.plugin_name,
    plugin_jar_sha256: expected.plugin_jar_sha256,
    plugin_loaded: true,
    transaction_validation_rule_registered: true,
    local_unmarked_raw_transaction_rejected: true,
    raw_public_rpc_disabled: true,
    startup_fail_closed_on_plugin_mismatch: true,
    peer_import_protocol_rejection_source_head:
      expected.peer_import_source_head,
    peer_import_workflow_run_id: expected.peer_import_workflow_run_id,
    observed_at_utc: observedAtUtc,
    valid_until_utc: validUntilUtc,
    market_activation_authorized: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    evidence_id: "voide2ve1_" + "0".repeat(64),
  };
  evidence.evidence_id =
    voidEconomicEpoch2ProductionValidatorDomainEvidenceIdV1(evidence);
  return Object.freeze(evidence);
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const role = String(arg("--machine-role") || "").toLowerCase();
  const runtimeResultPath = path.resolve(String(arg("--runtime-result") || ""));
  const factsPath = path.resolve(String(arg("--facts") || ""));
  const pluginJarPath = path.resolve(String(arg("--plugin-jar") || ""));
  const besuLogPath = path.resolve(String(arg("--besu-log") || ""));
  const outputPath = path.resolve(String(arg("--output") || ""));
  const observedAtUtc = String(arg("--observed-at-utc") || "");
  const validUntilUtc = String(arg("--valid-until-utc") || "");

  for (const [value, reason] of [
    [runtimeResultPath, "runtime_result_path_required"],
    [factsPath, "facts_path_required"],
    [pluginJarPath, "plugin_jar_path_required"],
    [besuLogPath, "besu_log_path_required"],
    [outputPath, "output_path_required"],
  ]) {
    if (!value || value === path.parse(value).root) fail(reason);
  }
  if (fs.existsSync(outputPath)) fail("output_already_exists");

  const runtimeResult = readJson(runtimeResultPath);
  const facts = readJson(factsPath);

  const evidence =
    buildVoidEconomicEpoch2ProductionValidatorRuntimeEvidenceCandidateV1({
      machineRole: role,
      runtimeResult,
      runtimeResultSha256: sha256File(runtimeResultPath),
      facts,
      factsSha256: sha256File(factsPath),
      pluginJarSha256: sha256File(pluginJarPath),
      besuLogSha256: sha256File(besuLogPath),
      observedAtUtc,
      validUntilUtc,
    });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(evidence, null, 2) + "\n",
    { encoding: "utf8", mode: 0o644, flag: "wx" },
  );

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1,
  );
  console.log("machine_role=" + evidence.machine_role);
  console.log("hostname=" + os.hostname());
  console.log("evidence_id=" + evidence.evidence_id);
  console.log("plugin_loaded=true");
  console.log("transaction_validation_rule_registered=true");
  console.log("local_unmarked_raw_transaction_rejected=true");
  console.log("raw_public_rpc_disabled=true");
  console.log("startup_fail_closed_on_plugin_mismatch=true");
  console.log("production_rpc_contact=false");
  console.log("authoritative_chain2050_write=false");
  console.log("validator_mutation=false");
  console.log("funds_movement=false");
  console.log("output=" + outputPath);
}
