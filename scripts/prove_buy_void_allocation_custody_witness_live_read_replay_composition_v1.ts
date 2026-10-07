#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_qualification_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_composition_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
  buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
} from "../src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1,
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1,
} from "../src/economic/buy_void_allocation_custody_witness_transport_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("proof_noncanonical");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function contentId(prefix: string, value: unknown): string {
  return (
    prefix +
    crypto
      .createHash("sha256")
      .update(canonicalJson(value), "utf8")
      .digest("hex")
  );
}

function mutableClone<T>(value: T): any {
  return structuredClone(value) as any;
}

function sourceSlice(
  source: string,
  start: string,
  end: string,
): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, "source slice anchors must exist");
  return source.slice(from + start.length, to);
}

const replayInstallationEvidenceSource = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs",
  "utf8",
);
const replayInstallationAuthorityBlock = sourceSlice(
  replayInstallationEvidenceSource,
  "export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1 =\n  Object.freeze({",
  "  });\n\nconst JOURNAL_NAME",
);
const replayInstallationAuthority = Object.freeze(
  Object.fromEntries(
    [...replayInstallationAuthorityBlock.matchAll(
      /^\s{4}([A-Za-z0-9_]+): (true|false),$/gmu,
    )].map((match) => [match[1], match[2] === "true"]),
  ),
);
assert.ok(
  Object.keys(replayInstallationAuthority).length > 20,
  "replay installation authority source parse must be nontrivial",
);

const installationEvidenceSource = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-installation-evidence-v2.mjs",
  "utf8",
);
const installationAuthorityBlock = sourceSlice(
  installationEvidenceSource,
  "export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V2 =\n  Object.freeze({",
  "  });\n\nconst CONFIG_SCHEMA",
);
const installationAuthority = Object.freeze(
  Object.fromEntries(
    [...installationAuthorityBlock.matchAll(
      /^\s{4}([A-Za-z0-9_]+): (true|false),$/gmu,
    )].map((match) => [match[1], match[2] === "true"]),
  ),
);
assert.ok(
  Object.keys(installationAuthority).length > 20,
  "installation evidence authority source parse must be nontrivial",
);

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-replay-composition-v1-"),
  );
  const journalRoot = path.join(root, "journal");
  const highWaterRoot = path.join(root, "high-water");
  fs.mkdirSync(journalRoot, { mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { mode: 0o700 });
  const genesis =
    buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1();
  fs.writeFileSync(
    path.join(journalRoot, "live-read-replay-v1.jsonl"),
    genesis.journal_bytes,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(highWaterRoot, "live-read-replay-high-water-v1.json"),
    genesis.high_water_bytes,
    { mode: 0o600 },
  );
  return Object.freeze({ root, journalRoot, highWaterRoot, genesis });
}

function storageFileSnapshot(
  filePath: string,
  fileSha256: string,
  bytes: number,
  dev: string,
  ino: number,
) {
  return Object.freeze({
    path: filePath,
    dev,
    ino: String(ino),
    mtime_ns: "1",
    ctime_ns: "1",
    sha256: fileSha256,
    bytes,
    uid: 1000,
    gid: 1000,
    mode: 0o600,
    nlink: 1,
    regular_file: true,
    symlink: false,
  });
}

function replayStorageEvidence(
  genesis: ReturnType<
    typeof buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1
  >,
) {
  const normalized = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
    version: 1,
    parent_writer_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
    high_water_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
    hostname: "precision",
    journal_root: Object.freeze({
      path: "/journal",
      dev: "2049",
      ino: "10",
      uid: 1000,
      gid: 1000,
      mode: 0o700,
      mount_id: 36,
      major_minor: "8:1",
      fs_type: "ext4",
      mount_source: "/dev/sda1",
      mount_source_resolved: "/dev/sda1",
      mount_point: "/journal",
      parent_device: "/dev/sda",
      disk_serial: "DISK-A-001",
      disk_wwn: "wwn-disk-a-001",
    }),
    high_water_root: Object.freeze({
      path: "/high-water",
      dev: "2065",
      ino: "20",
      uid: 1000,
      gid: 1000,
      mode: 0o700,
      mount_id: 37,
      major_minor: "8:17",
      fs_type: "xfs",
      mount_source: "/dev/sdb1",
      mount_source_resolved: "/dev/sdb1",
      mount_point: "/high-water",
      parent_device: "/dev/sdb",
      disk_serial: "DISK-B-002",
      disk_wwn: "wwn-disk-b-002",
    }),
    journal_file: storageFileSnapshot(
      "/journal/live-read-replay-v1.jsonl",
      sha256Id(genesis.journal_bytes),
      genesis.journal_bytes.length,
      "2049",
      11,
    ),
    high_water_file: storageFileSnapshot(
      "/high-water/live-read-replay-high-water-v1.json",
      genesis.high_water_sha256,
      genesis.high_water_bytes.length,
      "2065",
      12,
    ),
    high_water_sha256: genesis.high_water_sha256,
    generation: 0,
    sequence: 0,
    event_count: 0,
    pending: false,
    pending_challenge_sha256: null,
    pending_challenge_id: null,
    pending_expires_at_ms: null,
    last_terminal_state: null,
    ready_for_issue: true,
  });
  return Object.freeze({
    ok: true,
    status: "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
    version: 1,
    qualification_id: contentId("voidwlrie1_", normalized),
    normalized,
    operation_performed: false,
    storage_domain_classification_green: true,
    live_storage_observation_proven: true,
    distinct_local_storage_domains_proven: true,
    distinct_parent_block_devices_proven: true,
    canonical_journal_high_water_binding_proven: true,
    no_pending_publication_intent_observed: true,
    double_census_stability_proven: true,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      replayInstallationAuthority,
  });
}

function sshEd25519Blob(byte: number): Buffer {
  const algorithm = Buffer.from("ssh-ed25519", "utf8");
  const key = Buffer.alloc(32, byte);
  const blob = Buffer.alloc(4 + algorithm.length + 4 + key.length);
  let offset = 0;
  blob.writeUInt32BE(algorithm.length, offset);
  offset += 4;
  algorithm.copy(blob, offset);
  offset += algorithm.length;
  blob.writeUInt32BE(key.length, offset);
  offset += 4;
  key.copy(blob, offset);
  return blob;
}

const hostKeyBlob = sshEd25519Blob(0x11);
const clientKeyBlob = sshEd25519Blob(0x22);
const knownHostsBytes = Buffer.from(
  "nimo ssh-ed25519 " + hostKeyBlob.toString("base64") + "\n",
  "utf8",
);

function replayStorageEvidenceForState(
  baseEvidence: ReturnType<typeof replayStorageEvidence>,
  journalBytes: Buffer,
  highWaterBytes: Buffer,
) {
  const next = mutableClone(baseEvidence);
  const highWater = JSON.parse(highWaterBytes.toString("utf8"));
  next.normalized.journal_file.sha256 = sha256Id(journalBytes);
  next.normalized.journal_file.bytes = journalBytes.length;
  next.normalized.high_water_file.sha256 = sha256Id(highWaterBytes);
  next.normalized.high_water_file.bytes = highWaterBytes.length;
  next.normalized.high_water_sha256 = sha256Id(highWaterBytes);
  next.normalized.generation = highWater.generation;
  next.normalized.sequence = highWater.sequence;
  next.normalized.event_count = highWater.event_count;
  next.normalized.pending = highWater.pending;
  next.normalized.pending_challenge_sha256 =
    highWater.pending_challenge_sha256;
  next.normalized.pending_challenge_id =
    highWater.pending_challenge_id;
  next.normalized.pending_expires_at_ms =
    highWater.pending_expires_at_ms;
  next.normalized.last_terminal_state =
    highWater.last_terminal_state;
  next.normalized.ready_for_issue = highWater.ready_for_issue;
  next.qualification_id =
    contentId("voidwlrie1_", next.normalized);
  return Object.freeze(next);
}

const transportPolicy = Object.freeze({
  transport: "ssh",
  remote_host: "nimo",
  remote_port: 22,
  remote_user: "voidwitness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: sha256Id(hostKeyBlob),
  known_hosts_sha256: sha256Id(knownHostsBytes),
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: sha256Id(clientKeyBlob),
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
});

const policyDecision =
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
    transportPolicy,
  );
assert.equal(policyDecision.ok, true);
if (!policyDecision.ok) throw new Error("policy fixture held");
const qualifiedPolicyDecision = policyDecision;

const installationNormalizedQualification = Object.freeze({
  schema:
    "void_buy_void_allocation_custody_witness_installation_qualification_v2",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2",
  version: 2,
  transport_policy_sha256:
    qualifiedPolicyDecision.policy_sha256,
  remote_user: transportPolicy.remote_user,
  host_key_sha256: transportPolicy.host_key_sha256,
  known_hosts_sha256: transportPolicy.known_hosts_sha256,
  client_public_key_sha256:
    transportPolicy.client_public_key_sha256,
});
const installationNormalizedSha256 = sha256Id(
  Buffer.from(canonicalJson(installationNormalizedQualification), "utf8"),
);
const installationQualificationId =
  "voidwiq2_" +
  installationNormalizedSha256.slice("sha256:".length);

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
const witnessEvent = Object.freeze({
  ...genesisBody,
  event_sha256: sha256Id(
    Buffer.from(canonicalJson(genesisBody), "utf8"),
  ),
});
const witnessBytes = Buffer.from(
  canonicalJson(witnessEvent) + "\n",
  "utf8",
);

function installationReceipt() {
  const witnessStorage = Object.freeze({
    authority_root:
      "/var/lib/void-allocation-custody-witness-v1",
    root_dev: "8",
    root_ino: "42",
    root_uid: 1201,
    root_gid: 1201,
    root_mode: 0o700,
    witness_path:
      "/var/lib/void-allocation-custody-witness-v1/" +
      "buy-void-allocation-custody-high-water-witness-v1.jsonl",
    witness_sha256: sha256Id(witnessBytes),
    witness_bytes: witnessBytes.length,
    event_count: 1,
    tip_event_sha256: witnessEvent.event_sha256,
    witness_hostname: "Nimo",
    witness_machine_id_sha256: sha("a"),
    witness_root_disk_serial: "50026B76873B25AB",
    witness_root_disk_wwn:
      "eui.00000000000000000026b76873b25ab5",
    intent_present: false,
  });
  const body = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_installation_evidence_receipt_v2",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2",
    version: 2,
    installation_qualification_id:
      installationQualificationId,
    installation_evidence_sha256: sha("2"),
    normalized_qualification_sha256:
      installationNormalizedSha256,
    runtime_bundle_manifest_id:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
    runtime_bundle_manifest_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
    runtime_bundle_qualification_id:
      "voidwfbq1_" + "6".repeat(64),
    runtime_bundle_evidence_sha256: sha("7"),
    runtime_bundle_normalized_qualification_sha256: sha("8"),
    runtime_bundle_collector_receipt_sha256: sha("9"),
    runtime_bundle_qualification_observed: true,
    runtime_bundle_evidence_collector_observed: true,
    host_identity: Object.freeze({
      hostname: "Nimo",
      machine_id_sha256: sha("9"),
    }),
    witness_storage: witnessStorage,
    witness_identity_path: "reviewed_machine_id_continuity",
    continuity_attestation_consumed: true,
    host_key_observed: true,
    authorized_client_key_observed: true,
    effective_sshd_policy_observed: true,
    sshd_connection_context: Object.freeze({
      source_address: "100.64.0.10",
      source_host: "precision.tailnet.example",
      local_address: "100.64.0.20",
      local_port: 22,
    }),
    sshd_connection_context_bound: true,
    live_sshd_connection_context_proven: false,
    continuity_attestation_observed: true,
    client_known_hosts_content_observed: false,
    preexec_runtime_execution_observed: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    filesystem_write_performed: false,
    ssh_execution_performed: false,
    witness_mutation_performed: false,
    host_mutation_performed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority: installationAuthority,
  });
  return Object.freeze({
    ...body,
    collector_receipt_sha256:
      sha256Id(Buffer.from(canonicalJson(body), "utf8")),
  });
}

function installationEvidencePackage() {
  const receipt = installationReceipt();
  const body = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_installation_evidence_package_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1",
    version: 1,
    installation_receipt: receipt,
    installation_normalized_qualification:
      installationNormalizedQualification,
    installation_normalized_qualification_sha256:
      installationNormalizedSha256,
    installation_qualification_id:
      installationQualificationId,
    operation_performed: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
  });
  return Object.freeze({
    ...body,
    package_sha256:
      sha256Id(Buffer.from(canonicalJson(body), "utf8")),
  });
}

const installationPackage = installationEvidencePackage();

function liveReadQualification({
  challengeSha256,
  requestId,
  challengeIssuedAtMs = 1_000,
  responseObservedAtMs,
  priorEvidenceGeneration = 0,
  evidenceGeneration = 1,
  witnessSha256,
  eventCount,
  tipEventSha256,
}: {
  challengeSha256: string;
  requestId: string;
  challengeIssuedAtMs?: number;
  responseObservedAtMs: number;
  priorEvidenceGeneration?: number;
  evidenceGeneration?: number;
  witnessSha256: string;
  eventCount: number;
  tipEventSha256: string;
}) {
  const normalized = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_qualification_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
    version: 1,
    installation_collector_receipt_sha256:
      installationPackage.installation_receipt.collector_receipt_sha256,
    installation_qualification_id:
      installationPackage.installation_qualification_id,
    installation_normalized_qualification_sha256:
      installationPackage.installation_normalized_qualification_sha256,
    runtime_bundle_collector_receipt_sha256:
      installationPackage.installation_receipt
        .runtime_bundle_collector_receipt_sha256,
    transport_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
    transport_policy_sha256: qualifiedPolicyDecision.policy_sha256,
    remote_host: "nimo",
    installation_hostname: "Nimo",
    installation_machine_id_sha256: sha("9"),
    witness_hostname: "Nimo",
    witness_machine_id_sha256: sha("a"),
    witness_identity_path: "reviewed_machine_id_continuity",
    continuity_attestation_consumed: true,
    remote_port: 22,
    remote_user: "voidwitness",
    known_hosts_sha256: transportPolicy.known_hosts_sha256,
    host_key_sha256: transportPolicy.host_key_sha256,
    client_public_key_sha256:
      transportPolicy.client_public_key_sha256,
    challenge_sha256: challengeSha256,
    request_id: requestId,
    challenge_issued_at_ms: challengeIssuedAtMs,
    response_observed_at_ms: responseObservedAtMs,
    challenge_age_ms:
      responseObservedAtMs - challengeIssuedAtMs,
    prior_evidence_generation: priorEvidenceGeneration,
    evidence_generation: evidenceGeneration,
    observed_client_address: "100.64.0.10",
    observed_remote_address: "100.64.0.20",
    witness_sha256: witnessSha256,
    event_count: eventCount,
    tip_event_sha256: tipEventSha256,
  });
  return Object.freeze({
    ok: true,
    status: "live_read_packet_qualified",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
    version: 1,
    qualification_id: contentId("voidwlrq1_", normalized),
    normalized,
    operation_performed: false,
    known_hosts_content_qualified: true,
    transport_read_packet_qualified: true,
    bounded_time_order_qualified: true,
    monotonic_generation_order_qualified: true,
    installation_network_context_qualified: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    live_sshd_connection_context_proven: false,
    challenge_freshness_proven: false,
    response_replay_resistance_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1,
  });
}

const f = fixture();
try {
  const issue =
    persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1({
      journal_root: f.journalRoot,
      high_water_root: f.highWaterRoot,
      entropy_sha256: sha("b"),
      issued_at_ms: 1_000,
      expires_at_ms: 39_000,
    });
  assert.equal(issue.ok, true);
  if (!issue.ok) throw new Error("issue fixture held");

  const built =
    buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
      policy: transportPolicy,
      challenge_sha256: issue.transition_challenge_sha256,
    });
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error("read request fixture held");

  const server =
    classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
      policy: transportPolicy,
      request_json: built.request_json,
      current_witness_jsonl: witnessBytes,
    });
  assert.equal(server.ok, true);
  if (!server.ok || server.operation !== "read") {
    throw new Error("read server fixture held");
  }
  const responseBytes = Buffer.from(server.response_json, "utf8");
  const validated =
    validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
      policy: transportPolicy,
      request_json: built.request_json,
      response_json: responseBytes,
    });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error("response fixture held");
  if (validated.status !== "read_response_verified") {
    throw new Error("response fixture was not a read response");
  }

  const liveRead = liveReadQualification({
    challengeSha256: issue.transition_challenge_sha256,
    requestId: built.request_id,
    responseObservedAtMs: 2_000,
    witnessSha256: validated.witness_sha256,
    eventCount: validated.event_count,
    tipEventSha256: validated.tip_event_sha256,
  });

  const responseSha256 = sha256Id(responseBytes);
  const consume =
    persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1({
      journal_root: f.journalRoot,
      high_water_root: f.highWaterRoot,
      outcome: "consumed",
      request_id: built.request_id,
      response_sha256: responseSha256,
      terminal_at_ms: 2_000,
    });
  assert.equal(consume.ok, true);
  if (!consume.ok) throw new Error("consume fixture held");

  const baseInput = {
    installation_evidence_package: installationPackage,
    client_known_hosts_base64:
      knownHostsBytes.toString("base64"),
    replay_storage_evidence: replayStorageEvidence(f.genesis),
    issue_result: issue,
    live_read_qualification: liveRead,
    consume_result: consume,
    transport_policy: transportPolicy,
    read_request_json: built.request_json,
    read_response_json: responseBytes,
  };

  const green =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1(
      baseInput,
    );
  assert.equal(green.ok, true);
  if (!green.ok) throw new Error("composition baseline held");
  assert.equal(green.status, "replay_live_read_composed");
  assert.match(green.qualification_id, /^voidwlrcmp1_[0-9a-f]{64}$/u);
  assert.equal(green.installation_artifacts_bound, true);
  assert.equal(green.canonical_live_read_reclassified, true);
  assert.equal(
    green.normalized.installation_package_sha256,
    installationPackage.package_sha256,
  );
  assert.equal(green.storage_prestate_bound, true);
  assert.equal(green.storage_issue_digest_lineage_bound, true);
  assert.equal(green.issue_consume_digest_lineage_bound, true);
  assert.equal(green.issue_transition_bound, true);
  assert.equal(green.live_read_parent_bound, true);
  assert.equal(green.canonical_request_rebuilt, true);
  assert.equal(green.canonical_response_revalidated, true);
  assert.equal(green.consume_transition_bound, true);
  assert.equal(green.validated_packet_binding_proven, true);
  assert.equal(green.durable_consume_packet_binding_proven, true);
  assert.match(green.normalized.consume_journal_sha256, /^sha256:[0-9a-f]{64}$/u);
  assert.match(green.normalized.consume_high_water_sha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(
    green.normalized.consume_journal_sha256,
    consume.journal_sha256,
  );
  assert.equal(
    green.normalized.consume_high_water_sha256,
    consume.high_water_sha256,
  );
  assert.equal(green.external_transport_authenticated, false);
  assert.equal(green.live_remote_read_performed, false);
  assert.equal(green.production_gate_ready, false);
  assert.equal(green.funds_movement, false);

  {
    const laterJournalBytes = fs.readFileSync(
      path.join(f.journalRoot, "live-read-replay-v1.jsonl"),
    );
    const laterHighWaterBytes = fs.readFileSync(
      path.join(
        f.highWaterRoot,
        "live-read-replay-high-water-v1.json",
      ),
    );
    const laterStorage = replayStorageEvidenceForState(
      baseInput.replay_storage_evidence,
      laterJournalBytes,
      laterHighWaterBytes,
    );
    assert.equal(
      laterStorage.normalized.last_terminal_state,
      "consumed",
    );
    assert.equal(laterStorage.normalized.generation, 1);
    assert.equal(laterStorage.normalized.sequence, 2);

    const issue2 =
      persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
        entropy_sha256: sha("c"),
        issued_at_ms: 3_000,
        expires_at_ms: 41_000,
      });
    assert.equal(issue2.ok, true);
    if (!issue2.ok) throw new Error("second issue fixture held");
    assert.equal(issue2.last_terminal_state, "consumed");

    const built2 =
      buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
        policy: transportPolicy,
        challenge_sha256: issue2.transition_challenge_sha256,
      });
    assert.equal(built2.ok, true);
    if (!built2.ok) throw new Error("second read request fixture held");

    const server2 =
      classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
        policy: transportPolicy,
        request_json: built2.request_json,
        current_witness_jsonl: witnessBytes,
      });
    assert.equal(server2.ok, true);
    if (!server2.ok || server2.operation !== "read") {
      throw new Error("second read server fixture held");
    }
    const responseBytes2 = Buffer.from(
      server2.response_json,
      "utf8",
    );
    const validated2 =
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy: transportPolicy,
        request_json: built2.request_json,
        response_json: responseBytes2,
      });
    assert.equal(validated2.ok, true);
    if (!validated2.ok) {
      throw new Error("second response fixture held");
    }

    const liveRead2 = liveReadQualification({
      challengeSha256: issue2.transition_challenge_sha256,
      requestId: built2.request_id,
      challengeIssuedAtMs: 3_000,
      responseObservedAtMs: 4_000,
      priorEvidenceGeneration: 1,
      evidenceGeneration: 2,
      witnessSha256: validated2.witness_sha256,
      eventCount: validated2.event_count,
      tipEventSha256: validated2.tip_event_sha256,
    });
    const responseSha2562 = sha256Id(responseBytes2);
    const consume2 =
      persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
        outcome: "consumed",
        request_id: built2.request_id,
        response_sha256: responseSha2562,
        terminal_at_ms: 4_000,
      });
    assert.equal(consume2.ok, true);
    if (!consume2.ok) {
      throw new Error("second consume fixture held");
    }

    const secondCycle =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: laterStorage,
        issue_result: issue2,
        live_read_qualification: liveRead2,
        consume_result: consume2,
        read_request_json: built2.request_json,
        read_response_json: responseBytes2,
      });
    assert.equal(secondCycle.ok, true);
    if (!secondCycle.ok) {
      throw new Error("second-cycle composition held");
    }
    assert.equal(secondCycle.normalized.prior_generation, 1);
    assert.equal(secondCycle.normalized.issue_generation, 2);

    const mismatchedIssue = mutableClone(issue2);
    mismatchedIssue.last_terminal_state = "abandoned";
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: laterStorage,
        issue_result: mismatchedIssue,
        live_read_qualification: liveRead2,
        consume_result: consume2,
        read_request_json: built2.request_json,
        read_response_json: responseBytes2,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error(
        "retained terminal state mismatch unexpectedly green",
      );
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_issue_terminal_state_mismatch",
    );
  }

  {
    const badId =
      "voidwlrc1_" + "f".repeat(64);
    const badIssue = mutableClone(issue);
    badIssue.transition_challenge_id = badId;
    badIssue.pending_challenge_id = badId;
    const badConsume = mutableClone(consume);
    badConsume.transition_challenge_id = badId;
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        issue_result: badIssue,
        consume_result: badConsume,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("challenge id/digest mismatch unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_writer_transition_invalid",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.installation_machine_id_sha256 = sha("c");
    badLive.normalized.witness_machine_id_sha256 = sha("d");
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("installation identity substitution unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_installation_binding_invalid",
    );
  }

  {
    const badPackage = mutableClone(installationPackage);
    badPackage.installation_normalized_qualification.remote_user =
      "other-witness";
    badPackage.installation_normalized_qualification_sha256 =
      sha256Id(
        Buffer.from(
          canonicalJson(
            badPackage.installation_normalized_qualification,
          ),
          "utf8",
        ),
      );
    badPackage.installation_qualification_id =
      "voidwiq2_" +
      badPackage.installation_normalized_qualification_sha256.slice(
        "sha256:".length,
      );
    badPackage.package_sha256 = sha256Id(
      Buffer.from(
        canonicalJson((() => {
          const body = { ...badPackage };
          delete body.package_sha256;
          return body;
        })()),
        "utf8",
      ),
    );
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        installation_evidence_package: badPackage,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("package commitment fork unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_installation_package_commitment_mismatch",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.challenge_issued_at_ms = 1_001;
    badLive.normalized.challenge_age_ms =
      badLive.normalized.response_observed_at_ms - 1_001;
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("time mismatch unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_live_read_binding_invalid",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.installation_machine_id_sha256 = "not-a-sha";
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("invalid machine digest unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_live_read_invalid",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.observed_client_address = "not-an-ip";
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("invalid client address unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_live_read_invalid",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.witness_identity_path = "historical_exact";
    badLive.normalized.continuity_attestation_consumed = true;
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("invalid identity path unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_live_read_invalid",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.remote_port = 2222;
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("transport port drift unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_installation_binding_invalid",
    );
  }

  {
    const badLive = mutableClone(liveRead);
    badLive.normalized.remote_host = "other-host";
    badLive.normalized.installation_hostname = "other-host";
    badLive.normalized.witness_hostname = "other-host";
    badLive.qualification_id =
      contentId("voidwlrq1_", badLive.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        live_read_qualification: badLive,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("transport host drift unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_installation_binding_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.high_water_root.disk_serial =
      badStorage.normalized.journal_root.disk_serial;
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("shared parent disk unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_parent_disks_not_distinct",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.journal_file.path =
      "/forged/live-read-replay-v1.jsonl";
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("forged journal path unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_journal_file_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.journal_file.dev =
      badStorage.normalized.high_water_root.dev;
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("journal device mismatch unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_journal_file_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.high_water_root.mode = 0o755;
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("public root mode unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_high_water_root_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.high_water_file.bytes = 16 * 1024 + 1;
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("oversized high-water unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_high_water_file_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.authority.synthetic_storage_authority = true;
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("storage authority downgrade green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.generation = 1;
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("storage generation mismatch green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_issue_progression_invalid",
    );
  }

  {
    const badStorage = mutableClone(baseInput.replay_storage_evidence);
    badStorage.normalized.journal_file.sha256 = sha("e");
    badStorage.qualification_id =
      contentId("voidwlrie1_", badStorage.normalized);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        replay_storage_evidence: badStorage,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("same-counter different storage prestate unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_storage_prestate_digest_mismatch",
    );
  }

  {
    const badConsumePrestate = mutableClone(consume);
    badConsumePrestate.transition_before_high_water_sha256 = sha("e");
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        consume_result: badConsumePrestate,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("wrong consume transition prestate unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_consume_prestate_digest_mismatch",
    );
  }

  for (const patch of [
    { journal_sha256: "not-a-sha" },
    { high_water_sha256: "also-not-a-sha" },
    { tip_event_sha256: null },
    { journal_bytes: consume.transition_before_journal_bytes },
  ]) {
    const badConsume = mutableClone(consume);
    Object.assign(badConsume, patch);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        consume_result: badConsume,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("invalid consume poststate unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_writer_poststate_invalid",
    );
  }

  {
    const badIssue = mutableClone(issue);
    badIssue.last_terminal_state = "consumed";
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        issue_result: badIssue,
      });
    assert.equal(held.ok, false);
    if (held.ok) {
      throw new Error("terminal issue state unexpectedly green");
    }
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_issue_invalid",
    );
  }

  {
    const badConsume = mutableClone(consume);
    badConsume.terminal_request_id =
      "voidwreq1_" + "f".repeat(64);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        consume_result: badConsume,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("wrong terminal request unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_request_binding_invalid",
    );
  }

  {
    const badConsume = mutableClone(consume);
    badConsume.terminal_response_sha256 = sha("f");
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        consume_result: badConsume,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("wrong response digest unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_terminal_response_digest_mismatch",
    );
  }

  {
    const tamperedResponse = Buffer.concat([
      responseBytes,
      Buffer.from("x", "utf8"),
    ]);
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        read_response_json: tamperedResponse,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("tampered response unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_response_binding_invalid",
    );
  }

  {
    const badConsume = mutableClone(consume);
    badConsume.sequence += 1;
    badConsume.event_count += 1;
    const held =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1({
        ...baseInput,
        consume_result: badConsume,
      });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("sequence jump unexpectedly green");
    assert.equal(
      held.reason,
      "witness_live_read_replay_composition_consume_progression_invalid",
    );
  }
} finally {
  fs.rmSync(f.root, { recursive: true, force: true });
}

for (const key of [
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "trusted_verification_clock_proven",
  "evidence_generation_monotonicity_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "challenge_freshness_proven",
  "response_replay_resistance_proven",
  "live_evidence_origin_proven",
  "live_sshd_connection_context_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1
    .exact_storage_issue_prestate_digest_binding,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1
    .exact_issue_consume_prestate_digest_binding,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1
    .validated_packet_binding_proven,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1
    .durable_consume_packet_binding_proven,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1_GREEN",
);
console.log("installation_evidence_package_bound=true");
console.log("canonical_live_read_reclassified=true");
console.log("challenge_id_derived_from_digest=true");
console.log("later_cycle_retained_terminal_state_bound=true");
console.log("installation_machine_identity_substitution_rejected=true");
console.log("live_storage_prestate_bound=true");
console.log("exact_storage_issue_prestate_digest_binding=true");
console.log("exact_issue_consume_prestate_digest_binding=true");
console.log("same_counter_different_storage_prestate_rejected=true");
console.log("wrong_consume_prestate_digest_rejected=true");
console.log("exact_replay_storage_authority_bound=true");
console.log("exact_issue_generation_bound=true");
console.log("exact_challenge_timing_bound=true");
console.log("canonical_transport_request_rebuilt=true");
console.log("canonical_transport_response_revalidated=true");
console.log("exact_consume_request_binding=true");
console.log("exact_consume_response_sha256_binding=true");
console.log("validated_packet_binding_proven=true");
console.log("durable_consume_packet_binding_proven=true");
console.log("external_transport_authenticated=false");
console.log("live_remote_read_performed=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");