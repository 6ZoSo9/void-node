#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1,
} from "../src/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1,
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1,
  executeBuyVoidAllocationCustodyWitnessLiveReadReplayExecutorV1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-executor-v1.mjs";

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical proof value");
}

const sha256Id = (value) =>
  "sha256:" + crypto.createHash("sha256").update(value).digest("hex");

function sshEd25519Blob(byte) {
  const alg = Buffer.from("ssh-ed25519", "utf8");
  const key = Buffer.alloc(32, byte);
  const blob = Buffer.alloc(4 + alg.length + 4 + key.length);
  let offset = 0;
  blob.writeUInt32BE(alg.length, offset);
  offset += 4;
  alg.copy(blob, offset);
  offset += alg.length;
  blob.writeUInt32BE(key.length, offset);
  offset += 4;
  key.copy(blob, offset);
  return blob;
}

const genesisBody = {
  allocation_tip_sha256: "sha256:" + "0".repeat(64),
  custody_uuid: "c61906ed-0b7e-441b-a44a-a97730198a18",
  deployment_head: "63082114b957e4b1ba58348b17e144e954452c1f",
  high_water_bytes: 430,
  high_water_sha256:
    "sha256:121741f865301c62cf2ecd967e286de4bd2e2bdc31404dfbdf11f97c26fca13d",
  ledger_bytes: 0,
  ledger_sha256:
    "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  marker: "VOID_BUY_ALLOCATION_CUSTODY_HIGH_WATER_WITNESS_EVENT_V1",
  pool_void_total: "10000000",
  previous_event_sha256: null,
  record_count: 0,
  remaining_void: "10000000",
  reserved_void_total: "0",
  sequence: 1,
  service_source_sha256:
    "sha256:bbc42447cc5b21f524cb7d1fb76a94c6322ffd36c901b5e5b2a8cbfe09918cd5",
  source_custody_disk_wwn: "eui.e8238fa6bf530001001b448b42e66c36",
  source_hostname: "zoso-Precision-Tower-7810",
  source_ledger_disk_wwn: "0x500a0751e9c796d8",
  source_machine_id_sha256:
    "sha256:11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2",
  version: 1,
  witness_hostname: "Nimo",
  witness_machine_id_sha256:
    "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da",
  witness_root_disk_serial: "50026B76873B25AB",
  witness_root_disk_wwn:
    "eui.00000000000000000026b76873b25ab5",
  writer_source_blob_sha1: "2db8493d1ee84878ef5fa2b0f655070622335d0d",
};
const genesisEvent = {
  ...genesisBody,
  event_sha256: sha256Id(
    Buffer.from(canonicalJson(genesisBody), "utf8"),
  ),
};
const witnessBytes = Buffer.from(
  canonicalJson(genesisEvent) + "\n",
  "utf8",
);

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-replay-executor-v1-"),
  );
  const journalRoot = path.join(root, "journal");
  const highRoot = path.join(root, "high");
  fs.mkdirSync(journalRoot, { mode: 0o700 });
  fs.mkdirSync(highRoot, { mode: 0o700 });
  fs.chmodSync(journalRoot, 0o700);
  fs.chmodSync(highRoot, 0o700);

  const genesis =
    buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1();
  fs.writeFileSync(
    path.join(journalRoot, "live-read-replay-v1.jsonl"),
    genesis.journal_bytes,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(highRoot, "live-read-replay-high-water-v1.json"),
    genesis.high_water_bytes,
    { mode: 0o600 },
  );

  const clientBlob = sshEd25519Blob(0x22);
  const clientPublicSha = sha256Id(clientBlob);
  const hostBlob = sshEd25519Blob(0x11);
  const hostSha = sha256Id(hostBlob);
  const knownHostsBytes = Buffer.from(
    "nimo.test ssh-ed25519 " +
      hostBlob.toString("base64") +
      "\n",
    "utf8",
  );
  const knownHostsSha = sha256Id(knownHostsBytes);

  const policy = {
    transport: "ssh",
    remote_host: "nimo.test",
    remote_port: 22,
    remote_user: "voidwitness",
    host_key_algorithm: "ssh-ed25519",
    host_key_sha256: hostSha,
    known_hosts_sha256: knownHostsSha,
    client_key_algorithm: "ssh-ed25519",
    client_public_key_sha256: clientPublicSha,
    endpoint_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
    batch_mode: true,
    strict_host_key_checking: true,
    identities_only: true,
    request_tty: false,
    clear_all_forwardings: true,
    permit_local_command: false,
    remote_forced_command_only: true,
    remote_shell_allowed: false,
    caller_selected_remote_command: false,
    caller_selected_remote_path: false,
    connect_timeout_ms: 8000,
    operation_timeout_ms: 30000,
    max_request_bytes: 256 * 1024,
    max_response_bytes: 24 * 1024 * 1024,
  };
  const policyDecision =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(policy);
  assert.equal(policyDecision.ok, true);
  if (!policyDecision.ok) throw new Error("policy fixture held");

  const policyPath = path.join(root, "policy.json");
  const keyPath = path.join(root, "id_ed25519");
  const knownHostsPath = path.join(root, "known_hosts");
  const packagePath = path.join(root, "installation-package.json");

  fs.writeFileSync(policyPath, JSON.stringify(policy) + "\n", { mode: 0o600 });
  fs.writeFileSync(keyPath, "synthetic-private-key\n", { mode: 0o600 });
  fs.writeFileSync(knownHostsPath, knownHostsBytes, { mode: 0o600 });

  const normalized = {
    schema:
      "void_buy_void_allocation_custody_witness_installation_qualification_v2",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2",
    version: 2,
  };
  const normalizedSha = sha256Id(
    Buffer.from(canonicalJson(normalized), "utf8"),
  );
  const installationId =
    "voidwiq2_" + normalizedSha.slice("sha256:".length);
  const packageBody = {
    schema:
      "void_buy_void_allocation_custody_witness_installation_evidence_package_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1",
    version: 1,
    installation_receipt: {
      normalized_qualification_sha256: normalizedSha,
      installation_qualification_id: installationId,
    },
    installation_normalized_qualification: normalized,
    installation_normalized_qualification_sha256: normalizedSha,
    installation_qualification_id: installationId,
    operation_performed: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
  };
  const installationPackage = {
    ...packageBody,
    package_sha256: sha256Id(
      Buffer.from(canonicalJson(packageBody), "utf8"),
    ),
  };
  fs.writeFileSync(
    packagePath,
    JSON.stringify(installationPackage, null, 2) + "\n",
    { mode: 0o600 },
  );

  const config = {
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_executor_config_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_CONFIG_V1",
    version: 1,
    replay_journal_root: journalRoot,
    replay_high_water_root: highRoot,
    expected_replay_hostname: "precision-test",
    witness_installation_package_path: packagePath,
    transport_policy_path: policyPath,
    client_private_key_path: keyPath,
    client_known_hosts_path: knownHostsPath,
  };

  return Object.freeze({
    root,
    journalRoot,
    highRoot,
    config,
    policy,
    policyDecision,
    clientBlob,
    witnessBytes,
  });
}

function injectedIo(f, options = {}) {
  let nowIndex = 0;
  const times = options.times || [1_000_000, 1_000_500, 1_000_600];
  return {
    nowMs() {
      const value = times[Math.min(nowIndex, times.length - 1)];
      nowIndex += 1;
      return value;
    },
    randomBytes(count) {
      assert.equal(count, 32);
      return Buffer.alloc(32, 0x77);
    },
    run(command, args) {
      assert.equal(command, "/usr/bin/ssh-keygen");
      assert.deepEqual(args, ["-y", "-f", f.config.client_private_key_path]);
      return {
        status: 0,
        signal: null,
        error: null,
        stdout:
          "ssh-ed25519 " + f.clientBlob.toString("base64") + "\n",
        stderr: "",
      };
    },
    resolveNetworkContext(remoteHost) {
      assert.equal(remoteHost, "nimo.test");
      return {
        client_address: "100.64.0.10",
        remote_address: "100.64.0.20",
      };
    },
    collectReplayStorageEvidence() {
      return {
        ok: true,
        status: "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED",
        qualification_id:
          "voidwlrie1_" + "1".repeat(64),
        normalized: {
          generation: 0,
        },
      };
    },
    runSsh({ policy, requestJson }) {
      if (options.sshFailure === true) {
        return {
          status: 255,
          signal: null,
          error: null,
          stdout: "",
          stderr: "synthetic transport failure\n",
        };
      }
      const server =
        classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
          policy,
          request_json: requestJson,
          current_witness_jsonl: f.witnessBytes,
        });
      assert.equal(server.ok, true);
      if (!server.ok || server.status !== "read_ready") {
        throw new Error("synthetic server held");
      }
      return {
        status: 0,
        signal: null,
        error: null,
        stdout: server.response_json,
        stderr: "",
      };
    },
    qualifyLiveRead(input) {
      return {
        ok: true,
        status: "live_read_packet_qualified",
        qualification_id:
          "voidwlrq1_" + "2".repeat(64),
        observed: input,
      };
    },
    compose(input) {
      assert.equal(input.issue_result.ok, true);
      assert.equal(input.consume_result.ok, true);
      assert.equal(input.live_read_qualification.ok, true);
      return {
        ok: true,
        status: "replay_live_read_composed",
        qualification_id:
          "voidwlrcmp1_" + "3".repeat(64),
      };
    },
  };
}

{
  const f = fixture();
  try {
    const result =
      executeBuyVoidAllocationCustodyWitnessLiveReadReplayExecutorV1(
        f.config,
        injectedIo(f),
      );
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("executor success fixture held");
    assert.equal(result.status, "test_replay_read_executed");
    assert.equal(result.issue_persisted, true);
    assert.equal(result.consume_persisted, true);
    assert.equal(result.abandonment_persisted, false);
    assert.equal(result.ssh_execution_performed, false);
    assert.equal(result.live_remote_read_performed, false);
    assert.equal(result.live_evidence_origin_proven, false);
    assert.equal(result.external_transport_authenticated, false);
    assert.equal(result.external_witness_storage_proven, false);
    assert.equal(result.rollback_resistance_proven, false);
    assert.equal(result.protected_high_water_custody_proven, false);
    assert.equal(result.production_gate_ready, false);
    assert.equal(result.funds_movement, false);
    assert.match(
      result.receipt.receipt_sha256,
      /^sha256:[0-9a-f]{64}$/u,
    );
    assert.match(
      result.receipt.receipt_id,
      /^voidwlrex1_[0-9a-f]{64}$/u,
    );
    assert.equal(result.receipt.live_execution_performed, false);
    assert.equal(result.receipt.external_transport_authenticated, false);

    const state =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highRoot,
      });
    assert.equal(state.ok, true);
    if (!state.ok) throw new Error("writer inspect held");
    assert.equal(state.generation, 1);
    assert.equal(state.sequence, 2);
    assert.equal(state.event_count, 2);
    assert.equal(state.pending, false);
    assert.equal(state.last_terminal_state, "consumed");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const result =
      executeBuyVoidAllocationCustodyWitnessLiveReadReplayExecutorV1(
        f.config,
        injectedIo(f, {
          sshFailure: true,
          times: [2_000_000, 2_000_500, 2_000_600],
        }),
      );
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("transport failure unexpectedly green");
    assert.equal(result.issue_persisted, true);
    assert.equal(result.consume_persisted, false);
    assert.equal(result.abandonment_persisted, true);
    assert.equal(result.ssh_execution_performed, false);
    assert.equal(result.live_remote_read_performed, false);

    const state =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highRoot,
      });
    assert.equal(state.ok, true);
    if (!state.ok) throw new Error("abandon inspect held");
    assert.equal(state.generation, 1);
    assert.equal(state.sequence, 2);
    assert.equal(state.event_count, 2);
    assert.equal(state.pending, false);
    assert.equal(state.last_terminal_state, "abandoned");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

for (const key of [
  "source_executor",
  "replay_storage_live_observation_required",
  "witness_installation_package_required",
  "local_csprng_entropy_generation",
  "durable_issue_required",
  "pinned_ssh_transport_required",
  "canonical_transport_request_required",
  "canonical_transport_response_validation_required",
  "canonical_live_read_qualification_required",
  "durable_consume_required",
  "failure_abandonment_required",
  "canonical_composition_required",
  "content_addressed_ceremony_receipt",
  "filesystem_read",
  "filesystem_write",
  "network_access",
  "ssh_execution",
  "credential_read",
  "replay_journal_write",
  "replay_high_water_write",
  "replay_intent_write",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

for (const key of [
  "credential_write",
  "witness_mutation",
  "remote_filesystem_write",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_export",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "inventory_mutation",
  "treasury_or_liquidity_movement",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-executor-v1.mjs",
  "utf8",
);
for (const token of [
  '"/usr/bin/ssh"',
  '"/usr/bin/ssh-keygen"',
  "crypto.randomBytes",
  "persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1",
  "persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1",
  "validateBuyVoidAllocationCustodyWitnessTransportResponseV1",
  "classifyBuyVoidAllocationCustodyWitnessLiveReadQualificationV1",
  "classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1",
  'outcome: "abandoned"',
  "external_transport_authenticated: liveExecution",
]) {
  assert.equal(source.includes(token), true, token);
}
assert.doesNotMatch(
  source,
  /buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1/u,
);
assert.doesNotMatch(
  source,
  /transaction_broadcast:\s*true/u,
);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1_GREEN",
);
console.log("test_network_access=false");
console.log("real_replay_writer_used=true");
console.log("durable_issue_then_consume=true");
console.log("transport_failure_durable_abandon=true");
console.log("pending_challenge_after_success=false");
console.log("pending_challenge_after_transport_failure=false");
console.log("witness_mutation=false");
console.log("remote_filesystem_write=false");
console.log("test_external_transport_authenticated=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
