#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
} from "./void-economic-epoch2-production-gateway-replay-binding-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
} from "./void-economic-epoch2-durable-replay-store-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1";

export const VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1 =
  "VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1";

const SOURCE_BINDING_PATH =
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json";
const RAW_DOMAIN_PATH =
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";
const SERVICE_IDENTITY =
  "void-economic-epoch2-public-submission-gateway-v1.service";
const HOSTNAME = "zoso-Precision-Tower-7810";
const DIGEST = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;

function fail(reason) {
  throw new Error(reason);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function evidenceId(value) {
  const body = structuredClone(value);
  delete body.evidence_id;
  return (
    "voide2gre1_" +
    crypto.createHash("sha256").update(canonical(body), "utf8").digest("hex")
  );
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

export function buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
  facts,
  observedAtUtc,
  validUntilUtc,
  hostName = os.hostname(),
  homeDir = os.homedir(),
}) {
  const sourceBinding = readJson(SOURCE_BINDING_PATH);
  const rawDomain = readJson(RAW_DOMAIN_PATH);

  if (
    sourceBinding?.marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 ||
    sourceBinding?.version !== 1 ||
    sourceBinding?.gates?.durable_replay_store_implemented !== true ||
    sourceBinding?.gates?.durable_replay_store_verified !== true ||
    sourceBinding?.gates
      ?.production_gateway_replay_store_binding_source_verified !== true ||
    sourceBinding?.gates?.production_gateway_replay_store_binding_verified !==
      false ||
    sourceBinding?.gates?.runtime_route_active !== false ||
    sourceBinding?.gates?.public_submission_open !== false
  ) {
    fail("source_gateway_replay_binding_invalid");
  }

  if (
    rawDomain?.gates?.all_production_validators_epoch_domain_enforced !== true ||
    rawDomain?.gates?.cross_epoch_replay_protection_proven !== false ||
    rawDomain?.gates?.migration_authorized !== false ||
    rawDomain?.gates?.public_activation_authorized !== false
  ) {
    fail("canonical_raw_domain_gate_state_invalid");
  }

  exactObject(
    facts,
    [
      "marker",
      "version",
      "hostname",
      "service_identity",
      "service_active",
      "service_main_pid",
      "service_uid",
      "operator_uid",
      "node_exec_path",
      "unit_file_path",
      "unit_file_sha256",
      "status_file_path",
      "status_file_sha256",
      "runtime_marker",
      "gateway_binding_marker",
      "durable_replay_store_marker",
      "replay_root",
      "replay_root_realpath",
      "replay_root_dev",
      "replay_root_ino",
      "replay_root_uid",
      "replay_root_gid",
      "replay_root_mode",
      "same_uid_production_trust_proven",
      "production_replay_root_selected",
      "production_service_identity_bound",
      "unit_af_unix_only",
      "unit_no_new_privileges",
      "unit_protect_system_strict",
      "unit_protect_home_read_only",
      "unit_umask_0077",
      "runtime_route_active",
      "public_submission_open",
      "canary_digest",
      "canary_fresh_consumed",
      "canary_replay_rejected_after_reopen",
      "bounded_canary_replay_store_mutation",
      "production_store_mutation_scope",
      "ephemeral_test_signer_used",
      "ephemeral_signer_private_key_persisted",
      "operator_wallet_access",
      "rpc_call",
      "transaction_construction",
      "transaction_signing",
      "transaction_submission",
      "transaction_broadcast",
      "authoritative_chain2050_write",
      "credential_content_access",
      "validator_mutation",
      "token_movement",
      "funds_movement",
      "migration_authorized",
      "public_activation_authorized",
    ],
    "runtime_facts_shape_invalid",
  );

  const expectedState =
    path.join(
      homeDir,
      ".local",
      "state",
      "void-economic-epoch2-public-submission-gateway-v1",
    );
  const expectedRoot = path.join(expectedState, "replay-v1");
  const expectedStatus = path.join(expectedState, "status-v1.json");
  const expectedUnit =
    path.join(
      homeDir,
      ".config",
      "systemd",
      "user",
      SERVICE_IDENTITY,
    );

  if (
    hostName !== HOSTNAME ||
    facts.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_FACTS_V1" ||
    facts.version !== 1 ||
    facts.hostname !== HOSTNAME ||
    facts.service_identity !== SERVICE_IDENTITY ||
    facts.service_active !== true ||
    !Number.isSafeInteger(facts.service_main_pid) ||
    facts.service_main_pid <= 1 ||
    !Number.isSafeInteger(facts.service_uid) ||
    !Number.isSafeInteger(facts.operator_uid) ||
    facts.service_uid !== facts.operator_uid ||
    facts.replay_root_uid !== facts.operator_uid ||
    facts.same_uid_production_trust_proven !== true ||
    facts.production_replay_root_selected !== true ||
    facts.production_service_identity_bound !== true ||
    typeof facts.node_exec_path !== "string" ||
    !path.isAbsolute(facts.node_exec_path) ||
    facts.unit_file_path !== expectedUnit ||
    facts.status_file_path !== expectedStatus ||
    facts.replay_root !== expectedRoot ||
    facts.replay_root_realpath !== expectedRoot ||
    !/^[0-9]+$/.test(String(facts.replay_root_dev)) ||
    !/^[0-9]+$/.test(String(facts.replay_root_ino)) ||
    facts.replay_root_mode !== "700" ||
    facts.runtime_marker !==
      VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1 ||
    facts.gateway_binding_marker !==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 ||
    facts.durable_replay_store_marker !==
      VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1 ||
    facts.unit_af_unix_only !== true ||
    facts.unit_no_new_privileges !== true ||
    facts.unit_protect_system_strict !== true ||
    facts.unit_protect_home_read_only !== true ||
    facts.unit_umask_0077 !== true ||
    facts.runtime_route_active !== false ||
    facts.public_submission_open !== false ||
    !DIGEST.test(String(facts.canary_digest || "")) ||
    facts.canary_fresh_consumed !== true ||
    facts.canary_replay_rejected_after_reopen !== true ||
    facts.bounded_canary_replay_store_mutation !== true ||
    facts.production_store_mutation_scope !== "single_synthetic_digest_marker" ||
    facts.ephemeral_test_signer_used !== true ||
    facts.ephemeral_signer_private_key_persisted !== false ||
    facts.operator_wallet_access !== false ||
    facts.rpc_call !== false ||
    facts.transaction_construction !== false ||
    facts.transaction_signing !== false ||
    facts.transaction_submission !== false ||
    facts.transaction_broadcast !== false ||
    facts.authoritative_chain2050_write !== false ||
    facts.credential_content_access !== false ||
    facts.validator_mutation !== false ||
    facts.token_movement !== false ||
    facts.funds_movement !== false ||
    facts.migration_authorized !== false ||
    facts.public_activation_authorized !== false
  ) {
    fail("runtime_facts_binding_invalid");
  }

  for (const value of [facts.unit_file_sha256, facts.status_file_sha256]) {
    if (!SHA256.test(String(value || ""))) fail("runtime_facts_sha256_invalid");
  }

  const canonicalUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!canonicalUtc.test(observedAtUtc) || !canonicalUtc.test(validUntilUtc)) {
    fail("runtime_evidence_time_format_invalid");
  }
  const observedMs = Date.parse(observedAtUtc);
  const validUntilMs = Date.parse(validUntilUtc);
  if (
    !Number.isFinite(observedMs) ||
    !Number.isFinite(validUntilMs) ||
    validUntilMs <= observedMs ||
    validUntilMs - observedMs > 3_600_000
  ) {
    fail("runtime_evidence_time_window_invalid");
  }

  const evidence = {
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1,
    version: 1,
    status:
      "INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_CANDIDATE",
    hostname: HOSTNAME,
    service_identity: SERVICE_IDENTITY,
    service_active: true,
    chain_id: 2050,
    execution_epoch: 2,
    runtime_marker: facts.runtime_marker,
    gateway_binding_marker: facts.gateway_binding_marker,
    durable_replay_store_marker: facts.durable_replay_store_marker,
    replay_root: facts.replay_root,
    replay_root_realpath: facts.replay_root_realpath,
    replay_root_dev: String(facts.replay_root_dev),
    replay_root_ino: String(facts.replay_root_ino),
    replay_root_uid: facts.replay_root_uid,
    replay_root_gid: facts.replay_root_gid,
    replay_root_mode: facts.replay_root_mode,
    service_main_pid: facts.service_main_pid,
    service_uid: facts.service_uid,
    operator_uid: facts.operator_uid,
    node_exec_path: facts.node_exec_path,
    unit_file_path: facts.unit_file_path,
    unit_file_sha256: facts.unit_file_sha256,
    status_file_path: facts.status_file_path,
    status_file_sha256: facts.status_file_sha256,
    same_uid_production_trust_proven: true,
    production_replay_root_selected: true,
    production_service_identity_bound: true,
    unit_af_unix_only: true,
    unit_no_new_privileges: true,
    unit_protect_system_strict: true,
    unit_protect_home_read_only: true,
    unit_umask_0077: true,
    canary_digest: facts.canary_digest,
    canary_fresh_consumed: true,
    canary_replay_rejected_after_reopen: true,
    bounded_canary_replay_store_mutation: true,
    production_store_mutation_scope: "single_synthetic_digest_marker",
    ephemeral_test_signer_used: true,
    ephemeral_signer_private_key_persisted: false,
    operator_wallet_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    runtime_route_active: false,
    public_submission_open: false,
    production_gateway_replay_store_binding_verified: false,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    authoritative_chain2050_write: false,
    funds_movement: false,
    observed_at_utc: observedAtUtc,
    valid_until_utc: validUntilUtc,
    evidence_id: "voide2gre1_" + "0".repeat(64),
  };
  evidence.evidence_id = evidenceId(evidence);
  return Object.freeze(evidence);
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const factsPath = path.resolve(String(arg("--facts") || ""));
  const outputPath = path.resolve(String(arg("--output") || ""));
  const observedAtUtc = String(arg("--observed-at-utc") || "");
  const validUntilUtc = String(arg("--valid-until-utc") || "");

  if (!factsPath || factsPath === path.parse(factsPath).root) {
    fail("facts_path_required");
  }
  if (!outputPath || outputPath === path.parse(outputPath).root) {
    fail("output_path_required");
  }
  if (fs.existsSync(outputPath)) fail("output_already_exists");

  const evidence =
    buildVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
      facts: readJson(factsPath),
      observedAtUtc,
      validUntilUtc,
    });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(evidence, null, 2) + "\n",
    { encoding: "utf8", mode: 0o644, flag: "wx" },
  );

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1,
  );
  console.log("hostname=" + evidence.hostname);
  console.log("service_identity=" + evidence.service_identity);
  console.log("evidence_id=" + evidence.evidence_id);
  console.log("same_uid_production_trust_proven=true");
  console.log("production_replay_root_selected=true");
  console.log("production_service_identity_bound=true");
  console.log("canary_fresh_consumed=true");
  console.log("canary_replay_rejected_after_reopen=true");
  console.log("bounded_canary_replay_store_mutation=true");
  console.log("production_store_mutation_scope=single_synthetic_digest_marker");
  console.log("runtime_route_active=false");
  console.log("public_submission_open=false");
  console.log("production_gateway_replay_store_binding_verified=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
  console.log("output=" + outputPath);
}
