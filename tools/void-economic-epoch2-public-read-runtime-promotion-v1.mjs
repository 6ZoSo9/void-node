#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_PROMOTION_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_PROMOTION_V1";

const EVIDENCE_MARKER =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_EVIDENCE_V1";
const EVIDENCE_STATUS =
  "PRODUCTION_SUCCESSOR_PUBLIC_ECONOMIC_READ_RUNTIME_EVIDENCE_GREEN";
const EVIDENCE_PATH =
  "ops/mainnet0/economic-epoch2-public-read-runtime-evidence-v1.json";
const PROMOTION_PATH =
  "ops/mainnet0/economic-epoch2-public-read-runtime-promotion-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2pre1_[0-9a-f]{64}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function fail(reason) {
  throw new Error(reason);
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
    "voide2pre1_" +
    crypto.createHash("sha256").update(canonical(body), "utf8").digest("hex")
  );
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function verifyEvidence({
  evidenceBytes,
  expectedFileSha256,
  expectedEvidenceId,
  evaluationTimeUtc,
}) {
  if (!Buffer.isBuffer(evidenceBytes)) fail("evidence_bytes_required");
  if (!SHA256.test(String(expectedFileSha256 || ""))) {
    fail("expected_file_sha256_invalid");
  }
  if (!EVIDENCE_ID.test(String(expectedEvidenceId || ""))) {
    fail("expected_evidence_id_invalid");
  }
  if (sha256(evidenceBytes) !== expectedFileSha256) {
    fail("evidence_file_sha256_mismatch");
  }

  let evidence;
  try {
    evidence = JSON.parse(evidenceBytes.toString("utf8"));
  } catch {
    fail("evidence_json_invalid");
  }

  if (
    evidence?.marker !== EVIDENCE_MARKER ||
    evidence?.version !== 1 ||
    evidence?.status !== EVIDENCE_STATUS ||
    evidence?.chain_id !== 2050 ||
    evidence?.execution_epoch !== 2 ||
    evidence?.evidence_id !== expectedEvidenceId ||
    evidenceId(evidence) !== evidence.evidence_id ||
    evidence?.successor_endpoint?.rpc_endpoint !==
      "http://127.0.0.1:18552/" ||
    evidence?.successor_endpoint?.endpoint_class !==
      "inactive_exact_production_genesis_loopback_read_replica" ||
    evidence?.successor_endpoint?.genesis_file_sha256 !==
      "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941" ||
    evidence?.successor_endpoint?.block_hash !==
      "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d" ||
    evidence?.successor_endpoint?.state_root !==
      "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2" ||
    evidence?.successor_endpoint?.p2p_enabled !== false ||
    evidence?.successor_endpoint?.discovery_enabled !== false ||
    evidence?.successor_endpoint?.validator_key_loaded !== false ||
    evidence?.successor_endpoint?.raw_public_rpc_allowed !== false ||
    evidence?.live_reads?.balance_read_verified !== true ||
    evidence?.live_reads?.code_nonempty !== true ||
    evidence?.live_reads?.code_read_verified !== true ||
    evidence?.live_reads?.receipt_lookup_transport_verified !== true ||
    evidence?.live_reads?.receipt_found !== false ||
    evidence?.live_reads?.successful_receipt_semantics_source_proven !== true ||
    evidence?.route_acceptance?.local_status_route_accepted !== true ||
    evidence?.route_acceptance?.local_balance_route_accepted !== true ||
    evidence?.route_acceptance?.local_code_route_accepted !== true ||
    evidence?.route_acceptance?.local_receipt_route_accepted !== true ||
    evidence?.route_acceptance?.composition_status_route_accepted !== true ||
    evidence?.route_acceptance?.composition_balance_route_accepted !== true ||
    evidence?.route_acceptance?.composition_code_route_accepted !== true ||
    evidence?.route_acceptance?.composition_receipt_route_accepted !== true ||
    evidence?.route_acceptance?.external_status_route_accepted !== true ||
    evidence?.route_acceptance?.external_balance_route_accepted !== true ||
    evidence?.route_acceptance?.external_code_route_accepted !== true ||
    evidence?.route_acceptance?.external_receipt_route_accepted !== true ||
    evidence?.route_acceptance?.external_receipt_http_status !== 404 ||
    evidence?.route_acceptance?.voidchain_org_cors_verified !== true ||
    evidence?.gates?.production_successor_rpc_endpoint_selected !== true ||
    evidence?.gates?.live_balance_receipt_code_gateway_ready !== true ||
    evidence?.gates?.public_balance_receipt_code_verification_ready !== true ||
    evidence?.gates?.runtime_route_active !== true ||
    evidence?.gates?.public_gateway_active !== true ||
    evidence?.gates?.successor_state_root_public_void_anchor_ready !== false ||
    evidence?.gates?.migration_authorized !== false ||
    evidence?.gates?.public_activation_authorized !== false ||
    evidence?.authority?.read_only_runtime_evidence !== true
  ) {
    fail("public_read_runtime_evidence_invalid");
  }

  for (const [key, value] of Object.entries(evidence.authority || {})) {
    if (key === "read_only_runtime_evidence") {
      if (value !== true) fail("public_read_runtime_authority_invalid:" + key);
      continue;
    }
    if (value !== false) {
      fail("public_read_runtime_authority_invalid:" + key);
    }
  }

  if (
    !UTC.test(String(evidence.observed_at_utc || "")) ||
    !UTC.test(String(evidence.valid_until_utc || "")) ||
    !UTC.test(String(evaluationTimeUtc || ""))
  ) {
    fail("public_read_runtime_time_format_invalid");
  }
  const observedMs = Date.parse(evidence.observed_at_utc);
  const validUntilMs = Date.parse(evidence.valid_until_utc);
  const evaluationMs = Date.parse(evaluationTimeUtc);
  if (
    !Number.isFinite(observedMs) ||
    !Number.isFinite(validUntilMs) ||
    !Number.isFinite(evaluationMs) ||
    validUntilMs <= observedMs ||
    validUntilMs - observedMs > 3_600_000 ||
    evaluationMs < observedMs ||
    evaluationMs > validUntilMs
  ) {
    fail("public_read_runtime_evidence_not_current");
  }

  return evidence;
}

export function promoteVoidEconomicEpoch2PublicReadRuntimeV1({
  evidenceBytes,
  expectedFileSha256,
  expectedEvidenceId,
  evaluationTimeUtc,
  loopbackPolicy,
  migrationCandidate,
}) {
  const evidence = verifyEvidence({
    evidenceBytes,
    expectedFileSha256,
    expectedEvidenceId,
    evaluationTimeUtc,
  });

  if (
    loopbackPolicy?.marker !==
      "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1" ||
    loopbackPolicy?.version !== 1 ||
    loopbackPolicy?.gates?.public_economic_read_gateway_source_ready !== true ||
    loopbackPolicy?.gates
      ?.server_controlled_loopback_read_transport_source_ready !== true ||
    loopbackPolicy?.gates?.production_successor_rpc_endpoint_selected !== false ||
    loopbackPolicy?.gates?.live_balance_receipt_code_gateway_ready !== false ||
    loopbackPolicy?.gates?.public_balance_receipt_code_verification_ready !==
      false ||
    loopbackPolicy?.gates?.runtime_route_active !== false ||
    loopbackPolicy?.gates?.public_gateway_active !== false
  ) {
    fail("public_read_loopback_promotion_start_state_invalid");
  }

  if (
    migrationCandidate?.successor_execution_layer
      ?.production_validator_set_bound !== true ||
    migrationCandidate?.funds_safety?.offline_successor_equivalence_proven !==
      true ||
    migrationCandidate?.replay_and_epoch_safety
      ?.cross_epoch_replay_protection_proven !== true ||
    migrationCandidate?.public_verification
      ?.successor_state_root_public_void_anchor_ready !== false ||
    migrationCandidate?.public_verification
      ?.public_balance_receipt_code_verification_ready !== false ||
    migrationCandidate?.launch_authority?.source_only !== true
  ) {
    fail("migration_public_read_promotion_start_state_invalid");
  }
  for (const [key, value] of Object.entries(migrationCandidate.launch_authority)) {
    if (key === "source_only") continue;
    if (value !== false) fail("migration_authority_must_remain_closed:" + key);
  }

  const updatedLoopback = structuredClone(loopbackPolicy);
  updatedLoopback.status =
    "PRODUCTION_SUCCESSOR_PUBLIC_READ_RUNTIME_GREEN_STATE_ROOT_ANCHOR_HOLD";
  updatedLoopback.gates.production_successor_rpc_endpoint_selected = true;
  updatedLoopback.gates.live_balance_receipt_code_gateway_ready = true;
  updatedLoopback.gates.public_balance_receipt_code_verification_ready = true;
  updatedLoopback.gates.runtime_route_active = true;
  updatedLoopback.gates.public_gateway_active = true;
  updatedLoopback.gates.migration_authorized = false;
  updatedLoopback.gates.public_activation_authorized = false;
  updatedLoopback.runtime_evidence = {
    evidence_file: EVIDENCE_PATH,
    promotion_file: PROMOTION_PATH,
    evidence_file_sha256: expectedFileSha256,
    evidence_id: expectedEvidenceId,
    evaluation_time_utc: evaluationTimeUtc,
    endpoint_class:
      evidence.successor_endpoint.endpoint_class,
    block_hash: evidence.successor_endpoint.block_hash,
    state_root: evidence.successor_endpoint.state_root,
    receipt_lookup_transport_verified: true,
    receipt_found_in_preactivation_replica: false,
    external_public_route_accepted: true,
  };

  const updatedMigration = structuredClone(migrationCandidate);
  updatedMigration.public_verification
    .public_balance_receipt_code_verification_ready = true;
  updatedMigration.public_verification
    .public_balance_receipt_code_verification_evidence = EVIDENCE_PATH;
  updatedMigration.public_verification
    .public_balance_receipt_code_verification_promotion = PROMOTION_PATH;
  updatedMigration.launch_authority.public_activation = false;
  updatedMigration.launch_authority.money_movement = false;
  updatedMigration.launch_authority.chain2050_write = false;
  updatedMigration.launch_authority.transaction_broadcast = false;

  const promotion = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_PROMOTION_V1,
    version: 1,
    status:
      "PUBLIC_ECONOMIC_READ_PATH_PROMOTED_STATE_ROOT_ANCHOR_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    evidence: Object.freeze({
      evidence_file: EVIDENCE_PATH,
      evidence_file_sha256: expectedFileSha256,
      evidence_id: expectedEvidenceId,
      evaluation_time_utc: evaluationTimeUtc,
    }),
    verification: Object.freeze({
      evidence_file_sha256_verified: true,
      evidence_id_verified: true,
      evidence_id_material_verified: true,
      evidence_fresh_at_promotion: true,
      exact_production_genesis_read_replica_verified: true,
      production_successor_rpc_endpoint_selected: true,
      live_balance_read_verified: true,
      live_code_read_verified: true,
      live_receipt_lookup_transport_verified: true,
      successful_receipt_semantics_source_proven: true,
      public_https_status_route_accepted: true,
      public_https_balance_route_accepted: true,
      public_https_code_route_accepted: true,
      public_https_receipt_route_accepted: true,
      raw_public_rpc_allowed: false,
    }),
    gates: Object.freeze({
      production_successor_rpc_endpoint_selected: true,
      live_balance_receipt_code_gateway_ready: true,
      public_balance_receipt_code_verification_ready: true,
      runtime_route_active: true,
      public_gateway_active: true,
      successor_state_root_public_void_anchor_ready: false,
      authoritative_chain2050_write: false,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement_authorized: false,
    }),
    authority: Object.freeze({
      source_promotion_only: true,
      service_action: false,
      production_rpc_contact: false,
      wallet_access: false,
      private_key_access: false,
      credential_content_access: false,
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

  return Object.freeze({
    promotion,
    updated_loopback_policy: updatedLoopback,
    updated_migration_candidate: updatedMigration,
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  const evidencePath = path.resolve(String(arg("--evidence") || ""));
  const expectedFileSha256 = String(arg("--expected-file-sha256") || "");
  const expectedEvidenceId = String(arg("--expected-evidence-id") || "");
  const evaluationTimeUtc = String(arg("--evaluation-time-utc") || "");
  const outputDir = path.resolve(String(arg("--output-dir") || ""));

  if (!evidencePath || evidencePath === path.parse(evidencePath).root) {
    fail("evidence_path_required");
  }
  if (!outputDir || outputDir === path.parse(outputDir).root) {
    fail("output_dir_required");
  }
  if (!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if (fs.existsSync(outputDir)) fail("output_dir_already_exists");

  const result = promoteVoidEconomicEpoch2PublicReadRuntimeV1({
    evidenceBytes: fs.readFileSync(evidencePath),
    expectedFileSha256,
    expectedEvidenceId,
    evaluationTimeUtc,
    loopbackPolicy: readJson(
      "ops/mainnet0/economic-epoch2-public-read-loopback-transport-v1.json",
    ),
    migrationCandidate: readJson(
      "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    ),
  });

  fs.mkdirSync(outputDir, { recursive: false });
  for (const [name, value] of [
    [
      "economic-epoch2-public-read-runtime-promotion-v1.json",
      result.promotion,
    ],
    [
      "economic-epoch2-public-read-loopback-transport-v1.json",
      result.updated_loopback_policy,
    ],
    [
      "economic-evm-successor-migration-candidate-v1.json",
      result.updated_migration_candidate,
    ],
  ]) {
    fs.writeFileSync(
      path.join(outputDir, name),
      JSON.stringify(value, null, 2) + "\n",
      { encoding: "utf8", mode: 0o644, flag: "wx" },
    );
  }

  console.log(VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_PROMOTION_V1);
  console.log("status=" + result.promotion.status);
  console.log("production_successor_rpc_endpoint_selected=true");
  console.log("live_balance_receipt_code_gateway_ready=true");
  console.log("public_balance_receipt_code_verification_ready=true");
  console.log("runtime_route_active=true");
  console.log("public_gateway_active=true");
  console.log("successor_state_root_public_void_anchor_ready=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output_dir=" + outputDir);
}
