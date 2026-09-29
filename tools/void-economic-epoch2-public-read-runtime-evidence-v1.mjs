#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_EVIDENCE_V1";

const HOSTNAME = "zoso-Precision-Tower-7810";
const SUCCESSOR_EVIDENCE_PATH =
  "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json";
const SUCCESSOR_EVIDENCE_SHA256 =
  "5006aa32a298c0fbcea6395e75201af66fedacde5b664ac953699dfb2f0c061b";
const EXPECTED_GENESIS_SHA256 =
  "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941";
const EXPECTED_BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const EXPECTED_STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const ABSENT_TX =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const RPC_ENDPOINT = "http://127.0.0.1:18552/";
const READ_BASE = "http://127.0.0.1:4124";
const COMPOSITION_BASE = "http://127.0.0.1:8082";
const PUBLIC_BASE = "https://seed.nullfeed.org";
const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fileSha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
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
}

export function buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1({
  facts,
  observedAtUtc,
  validUntilUtc,
  hostName = os.hostname(),
}) {
  const runtimeContract = readJson(
    "ops/mainnet0/economic-epoch2-public-read-runtime-contract-v1.json",
  );
  const loopback = readJson(
    "ops/mainnet0/economic-epoch2-public-read-loopback-transport-v1.json",
  );
  const migration = readJson(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
  );
  const successor = readJson(SUCCESSOR_EVIDENCE_PATH);
  const publicState = readJson(
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  );

  if (fileSha256(SUCCESSOR_EVIDENCE_PATH) !== SUCCESSOR_EVIDENCE_SHA256) {
    fail("production_successor_evidence_sha256_mismatch");
  }
  if (
    successor?.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1" ||
    successor?.gates?.production_validator_set_bound !== true ||
    successor?.gates?.offline_successor_equivalence_proven !== true ||
    successor?.gates?.cross_epoch_replay_protection_proven !== true ||
    successor?.runtime_artifacts?.genesis_file_sha256 !==
      EXPECTED_GENESIS_SHA256 ||
    successor?.runtime_artifacts?.block_hash !== EXPECTED_BLOCK_HASH ||
    successor?.runtime_artifacts?.state_root !== EXPECTED_STATE_ROOT
  ) {
    fail("production_successor_evidence_invalid");
  }
  if (
    runtimeContract?.marker !==
      "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_CONTRACT_V1" ||
    runtimeContract?.status !==
      "SOURCE_RUNTIME_CONTRACT_GREEN_LIVE_ACTIVATION_HOLD" ||
    runtimeContract?.successor_read_replica?.rpc_endpoint !== RPC_ENDPOINT ||
    runtimeContract?.successor_read_replica?.genesis_file_sha256 !==
      EXPECTED_GENESIS_SHA256 ||
    runtimeContract?.successor_read_replica?.block_hash !==
      EXPECTED_BLOCK_HASH ||
    runtimeContract?.successor_read_replica?.state_root !==
      EXPECTED_STATE_ROOT ||
    runtimeContract?.bounded_read_runtime?.origin !== READ_BASE ||
    runtimeContract?.public_edge?.composition_origin !== COMPOSITION_BASE ||
    runtimeContract?.public_edge?.public_origin !== PUBLIC_BASE ||
    runtimeContract?.public_edge?.generic_rpc_proxy !== false ||
    runtimeContract?.evidence_requirements
      ?.positive_live_receipt_required_pre_activation !== false ||
    runtimeContract?.gates?.public_economic_read_runtime_source_ready !== true ||
    runtimeContract?.gates?.production_successor_rpc_endpoint_selected !== false ||
    runtimeContract?.gates?.public_balance_receipt_code_verification_ready !==
      false ||
    runtimeContract?.authority?.source_only !== true
  ) {
    fail("public_read_runtime_contract_invalid");
  }

  if (
    loopback?.marker !==
      "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1" ||
    loopback?.gates?.public_economic_read_gateway_source_ready !== true ||
    loopback?.gates?.server_controlled_loopback_read_transport_source_ready !==
      true ||
    loopback?.gates?.production_successor_rpc_endpoint_selected !== false ||
    loopback?.gates?.live_balance_receipt_code_gateway_ready !== false ||
    loopback?.gates?.public_balance_receipt_code_verification_ready !== false ||
    loopback?.gates?.runtime_route_active !== false ||
    loopback?.gates?.public_gateway_active !== false
  ) {
    fail("public_read_transport_start_state_invalid");
  }
  if (
    migration?.successor_execution_layer?.production_validator_set_bound !==
      true ||
    migration?.funds_safety?.offline_successor_equivalence_proven !== true ||
    migration?.replay_and_epoch_safety?.cross_epoch_replay_protection_proven !==
      true ||
    migration?.public_verification?.successor_state_root_public_void_anchor_ready !==
      false ||
    migration?.public_verification?.public_balance_receipt_code_verification_ready !==
      false ||
    migration?.launch_authority?.source_only !== true
  ) {
    fail("migration_public_read_start_state_invalid");
  }
  for (const [key, value] of Object.entries(migration.launch_authority)) {
    if (key === "source_only") continue;
    if (value !== false) fail("migration_authority_must_remain_closed:" + key);
  }

  const token = publicState?.accounts?.find(
    (row) => String(row?.address || "").toLowerCase() === TOKEN,
  );
  if (!token || typeof token.runtime_code_hex !== "string") {
    fail("public_state_token_runtime_missing");
  }
  const expectedCodeSha256 = crypto
    .createHash("sha256")
    .update(Buffer.from(token.runtime_code_hex.slice(2), "hex"))
    .digest("hex");

  exactObject(
    facts,
    [
      "marker",
      "version",
      "hostname",
      "source_commit",
      "replica_service_identity",
      "replica_service_active",
      "replica_main_pid",
      "read_service_identity",
      "read_service_active",
      "read_main_pid",
      "composition_service_identity",
      "composition_service_active",
      "composition_main_pid",
      "replica_unit_sha256",
      "read_unit_sha256",
      "composition_dropin_sha256",
      "genesis_file_sha256",
      "rpc_endpoint",
      "read_base",
      "composition_base",
      "public_base",
      "block_number",
      "block_hash",
      "state_root",
      "token_address",
      "live_balance_result",
      "live_balance_read_verified",
      "live_code_sha256",
      "live_code_nonempty",
      "live_code_read_verified",
      "absent_receipt_transaction_hash",
      "live_receipt_lookup_transport_verified",
      "live_receipt_found",
      "successful_receipt_semantics_source_proven",
      "local_status_route_accepted",
      "local_balance_route_accepted",
      "local_code_route_accepted",
      "local_receipt_route_accepted",
      "composition_status_route_accepted",
      "composition_balance_route_accepted",
      "composition_code_route_accepted",
      "composition_receipt_route_accepted",
      "external_status_route_accepted",
      "external_balance_route_accepted",
      "external_code_route_accepted",
      "external_receipt_route_accepted",
      "external_receipt_http_status",
      "voidchain_org_cors_verified",
      "raw_public_rpc_allowed",
      "production_successor_rpc_endpoint_selected",
      "live_balance_receipt_code_gateway_ready",
      "runtime_route_active",
      "public_gateway_active",
      "transaction_construction",
      "transaction_signing",
      "transaction_submission",
      "transaction_broadcast",
      "authoritative_chain2050_write",
      "wallet_access",
      "private_key_access",
      "credential_content_access",
      "validator_mutation",
      "token_movement",
      "funds_movement",
      "migration_authorized",
      "public_activation_authorized",
    ],
    "public_read_runtime_facts_shape_invalid",
  );

  if (
    hostName !== HOSTNAME ||
    facts.marker !== "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_FACTS_V1" ||
    facts.version !== 1 ||
    facts.hostname !== HOSTNAME ||
    !COMMIT.test(String(facts.source_commit || "")) ||
    facts.replica_service_identity !==
      "void-economic-epoch2-successor-read-replica-v1.service" ||
    facts.replica_service_active !== true ||
    !Number.isSafeInteger(facts.replica_main_pid) ||
    facts.replica_main_pid <= 1 ||
    facts.read_service_identity !==
      "void-economic-epoch2-public-read-runtime-v1.service" ||
    facts.read_service_active !== true ||
    !Number.isSafeInteger(facts.read_main_pid) ||
    facts.read_main_pid <= 1 ||
    facts.composition_service_identity !==
      "void-public-app-composition-gateway-v1.service" ||
    facts.composition_service_active !== true ||
    !Number.isSafeInteger(facts.composition_main_pid) ||
    facts.composition_main_pid <= 1 ||
    !SHA256.test(String(facts.replica_unit_sha256 || "")) ||
    !SHA256.test(String(facts.read_unit_sha256 || "")) ||
    !SHA256.test(String(facts.composition_dropin_sha256 || "")) ||
    facts.genesis_file_sha256 !== EXPECTED_GENESIS_SHA256 ||
    facts.rpc_endpoint !== RPC_ENDPOINT ||
    facts.read_base !== READ_BASE ||
    facts.composition_base !== COMPOSITION_BASE ||
    facts.public_base !== PUBLIC_BASE ||
    facts.block_number !== "0x0" ||
    facts.block_hash !== EXPECTED_BLOCK_HASH ||
    facts.state_root !== EXPECTED_STATE_ROOT ||
    facts.token_address !== TOKEN ||
    facts.live_balance_result !== "0x0" ||
    facts.live_balance_read_verified !== true ||
    facts.live_code_sha256 !== expectedCodeSha256 ||
    facts.live_code_nonempty !== true ||
    facts.live_code_read_verified !== true ||
    facts.absent_receipt_transaction_hash !== ABSENT_TX ||
    facts.live_receipt_lookup_transport_verified !== true ||
    facts.live_receipt_found !== false ||
    facts.successful_receipt_semantics_source_proven !== true ||
    facts.local_status_route_accepted !== true ||
    facts.local_balance_route_accepted !== true ||
    facts.local_code_route_accepted !== true ||
    facts.local_receipt_route_accepted !== true ||
    facts.composition_status_route_accepted !== true ||
    facts.composition_balance_route_accepted !== true ||
    facts.composition_code_route_accepted !== true ||
    facts.composition_receipt_route_accepted !== true ||
    facts.external_status_route_accepted !== true ||
    facts.external_balance_route_accepted !== true ||
    facts.external_code_route_accepted !== true ||
    facts.external_receipt_route_accepted !== true ||
    facts.external_receipt_http_status !== 404 ||
    facts.voidchain_org_cors_verified !== true ||
    facts.raw_public_rpc_allowed !== false ||
    facts.production_successor_rpc_endpoint_selected !== true ||
    facts.live_balance_receipt_code_gateway_ready !== true ||
    facts.runtime_route_active !== true ||
    facts.public_gateway_active !== true ||
    facts.transaction_construction !== false ||
    facts.transaction_signing !== false ||
    facts.transaction_submission !== false ||
    facts.transaction_broadcast !== false ||
    facts.authoritative_chain2050_write !== false ||
    facts.wallet_access !== false ||
    facts.private_key_access !== false ||
    facts.credential_content_access !== false ||
    facts.validator_mutation !== false ||
    facts.token_movement !== false ||
    facts.funds_movement !== false ||
    facts.migration_authorized !== false ||
    facts.public_activation_authorized !== false
  ) {
    fail("public_read_runtime_facts_invalid");
  }

  if (
    !UTC.test(String(observedAtUtc || "")) ||
    !UTC.test(String(validUntilUtc || ""))
  ) {
    fail("public_read_runtime_time_format_invalid");
  }
  const observedMs = Date.parse(observedAtUtc);
  const validUntilMs = Date.parse(validUntilUtc);
  if (
    !Number.isFinite(observedMs) ||
    !Number.isFinite(validUntilMs) ||
    validUntilMs <= observedMs ||
    validUntilMs - observedMs > 3_600_000
  ) {
    fail("public_read_runtime_time_window_invalid");
  }

  const evidence = {
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_EVIDENCE_V1,
    version: 1,
    status:
      "PRODUCTION_SUCCESSOR_PUBLIC_ECONOMIC_READ_RUNTIME_EVIDENCE_GREEN",
    chain_id: 2050,
    execution_epoch: 2,
    hostname: HOSTNAME,
    source_commit: facts.source_commit,
    services: {
      replica_service_identity: facts.replica_service_identity,
      replica_main_pid: facts.replica_main_pid,
      read_service_identity: facts.read_service_identity,
      read_main_pid: facts.read_main_pid,
      composition_service_identity: facts.composition_service_identity,
      composition_main_pid: facts.composition_main_pid,
      replica_unit_sha256: facts.replica_unit_sha256,
      read_unit_sha256: facts.read_unit_sha256,
      composition_dropin_sha256: facts.composition_dropin_sha256,
    },
    successor_endpoint: {
      rpc_endpoint: RPC_ENDPOINT,
      endpoint_class: "inactive_exact_production_genesis_loopback_read_replica",
      genesis_file_sha256: EXPECTED_GENESIS_SHA256,
      block_number: "0x0",
      block_hash: EXPECTED_BLOCK_HASH,
      state_root: EXPECTED_STATE_ROOT,
      p2p_enabled: false,
      discovery_enabled: false,
      validator_key_loaded: false,
      raw_public_rpc_allowed: false,
    },
    live_reads: {
      token_address: TOKEN,
      balance_result: "0x0",
      balance_read_verified: true,
      code_sha256: expectedCodeSha256,
      code_nonempty: true,
      code_read_verified: true,
      absent_receipt_transaction_hash: ABSENT_TX,
      receipt_lookup_transport_verified: true,
      receipt_found: false,
      successful_receipt_semantics_source_proven: true,
    },
    route_acceptance: {
      local_status_route_accepted: true,
      local_balance_route_accepted: true,
      local_code_route_accepted: true,
      local_receipt_route_accepted: true,
      composition_status_route_accepted: true,
      composition_balance_route_accepted: true,
      composition_code_route_accepted: true,
      composition_receipt_route_accepted: true,
      external_status_route_accepted: true,
      external_balance_route_accepted: true,
      external_code_route_accepted: true,
      external_receipt_route_accepted: true,
      external_receipt_http_status: 404,
      voidchain_org_cors_verified: true,
    },
    gates: {
      production_successor_rpc_endpoint_selected: true,
      live_balance_receipt_code_gateway_ready: true,
      public_balance_receipt_code_verification_ready: true,
      runtime_route_active: true,
      public_gateway_active: true,
      successor_state_root_public_void_anchor_ready: false,
      migration_authorized: false,
      public_activation_authorized: false,
    },
    authority: {
      read_only_runtime_evidence: true,
      production_rpc_contact: false,
      raw_public_rpc_allowed: false,
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
    },
    observed_at_utc: observedAtUtc,
    valid_until_utc: validUntilUtc,
    evidence_id: "voide2pre1_" + "0".repeat(64),
  };
  evidence.evidence_id = evidenceId(evidence);
  return Object.freeze(evidence);
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
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

  const evidence = buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1({
    facts: readJson(factsPath),
    observedAtUtc,
    validUntilUtc,
  });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(evidence, null, 2) + "\n",
    { encoding: "utf8", mode: 0o644, flag: "wx" },
  );

  console.log(VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_EVIDENCE_V1);
  console.log("evidence_id=" + evidence.evidence_id);
  console.log("production_successor_rpc_endpoint_selected=true");
  console.log("live_balance_receipt_code_gateway_ready=true");
  console.log("public_balance_receipt_code_verification_ready=true");
  console.log("runtime_route_active=true");
  console.log("public_gateway_active=true");
  console.log("successor_state_root_public_void_anchor_ready=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement=false");
  console.log("output=" + outputPath);
}
