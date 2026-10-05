#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1,
  buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1,
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1,
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1,
} from "../src/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  classifyBuyVoidAllocationCustodyExternalWitnessV1,
} from "../src/economic/buy_void_allocation_custody_external_witness_v1.js";
import {
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const sha256Id = (value: string | Buffer): string =>
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"))
    .digest("hex");

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
  throw new Error("noncanonical_test_value");
}

const canonicalLine = (value: unknown): string =>
  canonicalJson(value) + "\n";

function requireOk<T>(
  value: T,
): Extract<T, { ok: true }> {
  const runtime = value as T & { ok: boolean; reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_hold");
  }
  return value as Extract<T, { ok: true }>;
}

function requireStatus<
  T,
  S extends string,
>(
  value: T,
  status: S,
): Extract<T, { ok: true; status: S }> {
  const ok = requireOk(value) as Extract<T, { ok: true }> & {
    status?: string;
  };
  if (ok.status !== status) {
    throw new Error(
      "unexpected_status:" + String(ok.status ?? "missing"),
    );
  }
  return ok as Extract<T, { ok: true; status: S }>;
}

function requireHeld(
  value: { ok: boolean; reason?: string },
  reason: string,
): void {
  assert.equal(value.ok, false);
  assert.equal(value.reason, reason);
}

const policy = Object.freeze({
  transport: "ssh",
  remote_host: "nimo",
  remote_port: 22,
  remote_user: "void-witness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: sha("a"),
  known_hosts_sha256: sha("b"),
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: sha("c"),
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
  connect_timeout_ms: 8_000,
  operation_timeout_ms: 30_000,
  max_request_bytes: 256 * 1024,
  max_response_bytes: 24 * 1024 * 1024,
});

const classifiedPolicy = requireOk(
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
    policy,
  ),
);
assert.equal(classifiedPolicy.status, "source_policy_valid");
assert.match(classifiedPolicy.policy_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1
    .server_controlled_policy_origin_proven,
  false,
);

for (const mutation of [
  { strict_host_key_checking: false },
  { remote_forced_command_only: false },
  { remote_shell_allowed: true },
  { caller_selected_remote_command: true },
  { caller_selected_remote_path: true },
  { request_tty: true },
  { clear_all_forwardings: false },
] as const) {
  const held =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1({
      ...policy,
      ...mutation,
    });
  requireHeld(
    held,
    "allocation_custody_witness_transport_policy_invalid",
  );
}

requireHeld(
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1({
    ...policy,
    remote_host: "nimo;touch-pwned",
  }),
  "allocation_custody_witness_transport_remote_host_invalid",
);

const GENESIS_EVENT_SHA =
  "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654";

const genesisEvent = {
  allocation_tip_sha256:
    "sha256:" + "0".repeat(64),
  custody_uuid: "c61906ed-0b7e-441b-a44a-a97730198a18",
  deployment_head: "63082114b957e4b1ba58348b17e144e954452c1f",
  event_sha256: GENESIS_EVENT_SHA,
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
  witness_root_disk_wwn: "eui.00000000000000000026b76873b25ab5",
  writer_source_blob_sha1: "2db8493d1ee84878ef5fa2b0f655070622335d0d",
};

const genesis = Buffer.from(
  JSON.stringify(genesisEvent) + "\n",
  "utf8",
);

const genesisHighWater = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(""),
);
assert.equal(
  genesisEvent.high_water_bytes,
  Buffer.byteLength(genesisHighWater.high_water_json, "utf8"),
);
assert.equal(
  genesisEvent.high_water_sha256,
  sha256Id(genesisHighWater.high_water_json),
);

const current = {
  allocation_tip_sha256: genesisEvent.allocation_tip_sha256,
  custody_uuid: genesisEvent.custody_uuid,
  deployment_head: genesisEvent.deployment_head,
  high_water_bytes: genesisEvent.high_water_bytes,
  high_water_sha256: genesisEvent.high_water_sha256,
  ledger_bytes: genesisEvent.ledger_bytes,
  ledger_sha256: genesisEvent.ledger_sha256,
  pool_void_total: genesisEvent.pool_void_total,
  record_count: genesisEvent.record_count,
  remaining_void: genesisEvent.remaining_void,
  reserved_void_total: genesisEvent.reserved_void_total,
  service_source_sha256: genesisEvent.service_source_sha256,
  source_custody_disk_wwn: genesisEvent.source_custody_disk_wwn,
  source_hostname: genesisEvent.source_hostname,
  source_ledger_disk_wwn: genesisEvent.source_ledger_disk_wwn,
  source_machine_id_sha256: genesisEvent.source_machine_id_sha256,
  witness_hostname: genesisEvent.witness_hostname,
  witness_machine_id_sha256: genesisEvent.witness_machine_id_sha256,
  witness_root_disk_serial: genesisEvent.witness_root_disk_serial,
  witness_root_disk_wwn: genesisEvent.witness_root_disk_wwn,
  writer_source_blob_sha1: genesisEvent.writer_source_blob_sha1,
};

const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("1"),
    source_composition_id: sha("2"),
    activation_generation: "0x" + "3".repeat(64),
    generation_tip_sha256: sha("4"),
    activation_receipt_id: "voidbclive1_" + "5".repeat(64),
    activation_receipt_sha256: "6".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  },
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "0.000002",
  quote_usdc_amount: "0.000001",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("7"),
  payment_verified_event_sha256: sha("8"),
  duplicate_payment_guard_result: sha("9"),
  inventory_allocation_guard_result: sha("a"),
  operator_activation_record_ref: sha("b"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
} as const;

const first = requireOk(
  planBuyVoidAllocationReservationV1(baseInput),
);
const ledger1 = first.next_ledger_jsonl;
const high1 = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(ledger1),
);

function currentFrom(
  ledger: string,
  highWater: Extract<
    ReturnType<typeof deriveBuyVoidAllocationReservationHighWaterV1>,
    { ok: true }
  >,
) {
  return {
    ...current,
    allocation_tip_sha256: highWater.high_water.tip_hash,
    high_water_bytes: Buffer.byteLength(
      highWater.high_water_json,
      "utf8",
    ),
    high_water_sha256: sha256Id(
      highWater.high_water_json,
    ),
    ledger_bytes: Buffer.byteLength(ledger, "utf8"),
    ledger_sha256: sha256Id(ledger),
    pool_void_total: highWater.high_water.pool_void_total,
    record_count: highWater.high_water.record_count,
    remaining_void: highWater.high_water.remaining_void,
    reserved_void_total:
      highWater.high_water.reserved_void_total,
  };
}

const current1 = currentFrom(ledger1, high1);

const readRequest = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
    policy,
    challenge_sha256: sha("d"),
  }),
);
const readRequestAgain = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
    policy,
    challenge_sha256: sha("d"),
  }),
);
assert.equal(readRequest.request_json, readRequestAgain.request_json);
assert.equal(readRequest.request_id, readRequestAgain.request_id);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1
    .challenge_freshness_proven,
  false,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1
    .response_replay_resistance_proven,
  false,
);
const distinctChallengeRead = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
    policy,
    challenge_sha256: sha("e"),
  }),
);
assert.notEqual(
  readRequest.request_id,
  distinctChallengeRead.request_id,
);

const serverRead = requireOk(
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
    policy,
    request_json: readRequest.request_json,
    current_witness_jsonl: genesis,
  }),
);
assert.equal(serverRead.status, "read_ready");
assert.equal(serverRead.remote_filesystem_write_authorized, false);

const verifiedRead = requireOk(
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
    policy,
    request_json: readRequest.request_json,
    response_json: serverRead.response_json,
  }),
);
assert.equal(verifiedRead.status, "read_response_verified");
assert.equal(
  Buffer.from(verifiedRead.witness_jsonl).equals(genesis),
  true,
);
assert.equal(verifiedRead.external_transport_authenticated, false);
assert.equal(verifiedRead.external_witness_storage_proven, false);

{
  const tampered = JSON.parse(serverRead.response_json);
  tampered.challenge_sha256 = sha("e");
  requireHeld(
    validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
      policy,
      request_json: readRequest.request_json,
      response_json: canonicalLine(tampered),
    }),
    "allocation_custody_witness_transport_response_binding_invalid",
  );
}

{
  const tampered = JSON.parse(serverRead.response_json);
  const tamperedEvent = {
    ...genesisEvent,
    remaining_void: "9999999",
  };
  tampered.witness_jsonl_base64 = Buffer.from(
    JSON.stringify(tamperedEvent) + "\n",
    "utf8",
  ).toString("base64");
  requireHeld(
    validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
      policy,
      request_json: readRequest.request_json,
      response_json: canonicalLine(tampered),
    }),
    "allocation_custody_witness_event_hash_mismatch",
  );
}

{
  requireHeld(
    validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
      policy: {
        ...policy,
        host_key_sha256: sha("f"),
      },
      request_json: readRequest.request_json,
      response_json: serverRead.response_json,
    }),
    "allocation_custody_witness_transport_request_identity_invalid",
  );
}

const appendRequest = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1({
    policy,
    challenge_sha256: sha("f"),
    witness_jsonl: genesis,
    current_state: current1,
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
  }),
);
assert.equal(appendRequest.operation, "append");
assert.equal(
  appendRequest.request.prior_witness_sha256,
  sha256Id(genesis),
);
assert.equal(appendRequest.request.prior_event_count, 1);
assert.equal(appendRequest.request.next_event_count, 2);

const serverAppend = requireOk(
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
    policy,
    request_json: appendRequest.request_json,
    current_witness_jsonl: genesis,
  }),
);
assert.equal(serverAppend.status, "append_ready");
assert.equal(serverAppend.remote_filesystem_write_authorized, false);
assert.equal(
  Buffer.from(serverAppend.next_witness_jsonl).equals(
    appendRequest.expected_next_witness_jsonl,
  ),
  true,
);

const appendResponse = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1({
    policy,
    request_json: appendRequest.request_json,
    observed_witness_jsonl: serverAppend.next_witness_jsonl,
    operation_performed: true,
  }),
);
assert.equal(appendResponse.response.status, "appended");
assert.equal(
  appendResponse.response.round_trip_read_required,
  true,
);

const verifiedAppend = requireOk(
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
    policy,
    request_json: appendRequest.request_json,
    response_json: appendResponse.response_json,
  }),
);
assert.equal(verifiedAppend.status, "append_ack_verified");
assert.equal(verifiedAppend.round_trip_read_required, true);
assert.equal(verifiedAppend.external_transport_authenticated, false);
assert.equal(verifiedAppend.external_witness_storage_proven, false);

const idempotentServer = requireOk(
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
    policy,
    request_json: appendRequest.request_json,
    current_witness_jsonl:
      appendRequest.expected_next_witness_jsonl,
  }),
);
assert.equal(idempotentServer.status, "idempotent");

const idempotentResponse = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1({
    policy,
    request_json: appendRequest.request_json,
    observed_witness_jsonl:
      appendRequest.expected_next_witness_jsonl,
    operation_performed: false,
  }),
);
assert.equal(idempotentResponse.response.status, "idempotent");

const readAfterAppend = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
    policy,
    challenge_sha256: sha("0"),
  }),
);
const readAfterAppendServer = requireStatus(
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
    policy,
    request_json: readAfterAppend.request_json,
    current_witness_jsonl:
      appendRequest.expected_next_witness_jsonl,
  }),
  "read_ready",
);
const readAfterAppendVerified = requireStatus(
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
    policy,
    request_json: readAfterAppend.request_json,
    response_json: readAfterAppendServer.response_json,
  }),
  "read_response_verified",
);
const finalParentMatch = requireOk(
  classifyBuyVoidAllocationCustodyExternalWitnessV1({
    witness_jsonl: readAfterAppendVerified.witness_jsonl,
    current_state: current1,
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
  }),
);
assert.equal(finalParentMatch.status, "matched");

const alternate = requireOk(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    request_id: "buyvoid_b_bbbbbbbb",
    payment_transaction_hash: "0x" + "b".repeat(64),
    payment_log_index: 8,
    buyer_delivery_wallet: "0x" + "2".repeat(40),
    verified_payment_receipt_ref: sha("c"),
    payment_verified_event_sha256: sha("d"),
    duplicate_payment_guard_result: sha("e"),
    inventory_allocation_guard_result: sha("f"),
    operator_activation_record_ref: sha("0"),
    created_at_ms: baseInput.created_at_ms + 1,
  }),
);
const alternateHigh = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(
    alternate.next_ledger_jsonl,
  ),
);
const alternateRequest = requireOk(
  buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1({
    policy,
    challenge_sha256: sha("1"),
    witness_jsonl: genesis,
    current_state: currentFrom(
      alternate.next_ledger_jsonl,
      alternateHigh,
    ),
    current_ledger_jsonl: alternate.next_ledger_jsonl,
    current_high_water_json: alternateHigh.high_water_json,
  }),
);

requireHeld(
  classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
    policy,
    request_json: appendRequest.request_json,
    current_witness_jsonl:
      alternateRequest.expected_next_witness_jsonl,
  }),
  "allocation_custody_witness_transport_compare_and_swap_conflict",
);

{
  const request = JSON.parse(appendRequest.request_json);
  request.next_tip_event_sha256 = sha("2");
  requireHeld(
    classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1({
      policy,
      request_json: canonicalLine(request),
      current_witness_jsonl: genesis,
    }),
    "allocation_custody_witness_transport_request_id_mismatch",
  );
}

{
  const response = JSON.parse(appendResponse.response_json);
  response.operation_performed = false;
  requireHeld(
    validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
      policy,
      request_json: appendRequest.request_json,
      response_json: canonicalLine(response),
    }),
    "allocation_custody_witness_transport_append_response_invalid",
  );
}

{
  const noAppend =
    buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1({
      policy,
      challenge_sha256: sha("3"),
      witness_jsonl:
        appendRequest.expected_next_witness_jsonl,
      current_state: current1,
      current_ledger_jsonl: ledger1,
      current_high_water_json: high1.high_water_json,
    });
  requireHeld(
    noAppend,
    "allocation_custody_witness_transport_append_not_required",
  );
}

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
  ),
  "utf8",
);
assert.doesNotMatch(
  source,
  /node:(?:fs|net|tls|http|https|child_process|worker_threads)/u,
);
assert.doesNotMatch(source, /process\.env/u);
assert.doesNotMatch(source, /spawnSync|execFileSync|execSync|fork\(/u);
assert.match(source, /canonical_parent_witness_planner_required: true/u);
assert.match(source, /caller_selected_remote_command: false/u);
assert.match(source, /caller_selected_remote_path: false/u);
assert.match(source, /remote_forced_command_only !== true/u);
assert.match(source, /strict_host_key_checking !== true/u);
assert.match(source, /round_trip_read_required: true/u);
assert.match(source, /append_compare_and_swap: true/u);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_contract",
    "pure_policy_validation",
    "pure_request_construction",
    "pure_server_classification",
    "pure_response_validation",
    "canonical_request_response_bytes",
    "pinned_remote_identity_policy",
    "forced_command_only_required",
    "single_event_append_only",
    "append_compare_and_swap",
    "append_idempotence",
    "canonical_parent_witness_planner_required",
    "round_trip_read_required_after_append",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1_PROOF_GREEN",
);
console.log("pinned_remote_identity_policy=true");
console.log("server_controlled_policy_origin_proven=false");
console.log("forced_command_only_required=true");
console.log("caller_selected_remote_command=false");
console.log("caller_selected_remote_path=false");
console.log("canonical_parent_witness_planner_required=true");
console.log("single_event_append_only=true");
console.log("append_compare_and_swap=true");
console.log("append_idempotence=true");
console.log("round_trip_read_required_after_append=true");
console.log("challenge_freshness_proven=false");
console.log("response_replay_resistance_proven=false");
console.log("network_access=false");
console.log("ssh_execution=false");
console.log("credential_read=false");
console.log("remote_filesystem_write=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
