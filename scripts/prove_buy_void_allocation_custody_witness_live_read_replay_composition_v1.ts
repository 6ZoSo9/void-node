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
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";
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

function replayStorageEvidence() {
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
    journal_root: Object.freeze({ path: "/journal" }),
    high_water_root: Object.freeze({ path: "/high-water" }),
    journal_file: Object.freeze({ path: "/journal/live-read-replay-v1.jsonl" }),
    high_water_file: Object.freeze({
      path: "/high-water/live-read-replay-high-water-v1.json",
    }),
    high_water_sha256: sha("1"),
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
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
  });
}

const transportPolicy = Object.freeze({
  transport: "ssh",
  remote_host: "nimo",
  remote_port: 22,
  remote_user: "voidwitness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: sha("2"),
  known_hosts_sha256: sha("3"),
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: sha("4"),
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

function liveReadQualification({
  challengeSha256,
  requestId,
  responseObservedAtMs,
  witnessSha256,
  eventCount,
  tipEventSha256,
}: {
  challengeSha256: string;
  requestId: string;
  responseObservedAtMs: number;
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
    installation_collector_receipt_sha256: sha("5"),
    installation_qualification_id:
      "voidwiq2_" + "6".repeat(64),
    installation_normalized_qualification_sha256: sha("7"),
    runtime_bundle_collector_receipt_sha256: sha("8"),
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
    challenge_issued_at_ms: 1_000,
    response_observed_at_ms: responseObservedAtMs,
    challenge_age_ms: responseObservedAtMs - 1_000,
    prior_evidence_generation: 0,
    evidence_generation: 1,
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
    replay_storage_evidence: replayStorageEvidence(),
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
  assert.equal(green.storage_prestate_bound, true);
  assert.equal(green.issue_transition_bound, true);
  assert.equal(green.live_read_parent_bound, true);
  assert.equal(green.canonical_request_rebuilt, true);
  assert.equal(green.canonical_response_revalidated, true);
  assert.equal(green.consume_transition_bound, true);
  assert.equal(green.validated_packet_binding_proven, true);
  assert.equal(green.durable_consume_packet_binding_proven, true);
  assert.equal(green.external_transport_authenticated, false);
  assert.equal(green.live_remote_read_performed, false);
  assert.equal(green.production_gate_ready, false);
  assert.equal(green.funds_movement, false);

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
console.log("live_storage_prestate_bound=true");
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