import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_FILE_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_SHA256_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_custody_qualification_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.js";
import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

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
  throw new Error("proof_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

const entropySha256 =
  "sha256:86c139ebf3a626da6a8be4a18f97eb02c3ed298fa5ac59bcff00fba7eb0cff75";
const issuedAtMs = 1791390137302;
const expiresAtMs = 1791390175302;
const terminalAtMs = 1791390138847;
const liveReadStartedAtMs = 1791390138227;
const liveReadObservedAtMs = 1791390138670;
const requestId =
  "voidwreq1_d29cd2e756331666da62512a1ecf74ea225517b66d8809d6a81439ceab65f0aa";
const responseSha256 =
  "sha256:d5531b9fa5614c8f08fd0983878511ca7a8626c0ffd78fe922dc9f72ba4f2eca";

const journal0 = "";
const high0 =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    journal0,
  );
assert.equal(high0.ok, true);
if (!high0.ok) throw new Error("genesis high-water held");

const issue =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: entropySha256,
    issued_at_ms: issuedAtMs,
    expires_at_ms: expiresAtMs,
  });
assert.equal(issue.ok, true);
if (!issue.ok) throw new Error("reviewed issue plan held");
const issueJournal = issue.next_journal_jsonl;
const issueHigh =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    issueJournal,
  );
assert.equal(issueHigh.ok, true);
if (!issueHigh.ok) throw new Error("issue high-water held");
assert.equal(
  sha256Id(Buffer.from(issueJournal, "utf8")),
  "sha256:5165f6d11fb7b3e47c57f7750aa7674d85e96d51138dafb91a9663176c8972f3",
);
assert.equal(
  issueHigh.high_water_sha256,
  "sha256:e190bd5d7d20da1a28d3fbd6039456534be95275fbee63487246c5f34f01d3ac",
);

const consume =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: issueJournal,
    outcome: "consumed",
    request_id: requestId,
    response_sha256: responseSha256,
    terminal_at_ms: terminalAtMs,
  });
assert.equal(consume.ok, true);
if (!consume.ok) throw new Error("reviewed consume plan held");
const finalJournal = consume.next_journal_jsonl;
const finalHigh =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    finalJournal,
  );
assert.equal(finalHigh.ok, true);
if (!finalHigh.ok) throw new Error("final high-water held");
assert.equal(
  sha256Id(Buffer.from(finalJournal, "utf8")),
  "sha256:d95fd6a5cec55513a4b6271ee5ad87a97d723f77bbd67ffaacd194fc36780989",
);
assert.equal(
  finalHigh.high_water_sha256,
  "sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9",
);

const external0 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1(
    {
      witness_jsonl: "",
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1,
    },
  );
assert.equal(external0.ok, true);
if (!external0.ok) throw new Error("reviewed external genesis held");
assert.equal(external0.status, "planned_genesis");

const external1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1(
    {
      witness_jsonl: external0.next_witness_jsonl,
      current_journal_jsonl: issueJournal,
      current_high_water_json: issueHigh.high_water_json,
      identity:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1,
    },
  );
assert.equal(external1.ok, true);
if (!external1.ok) throw new Error("reviewed external issue held");
assert.equal(external1.status, "planned");

const external2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1(
    {
      witness_jsonl: external1.next_witness_jsonl,
      current_journal_jsonl: finalJournal,
      current_high_water_json: finalHigh.high_water_json,
      identity:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_EXTERNAL_IDENTITY_V1,
    },
  );
assert.equal(external2.ok, true);
if (!external2.ok) throw new Error("reviewed external consume held");
assert.equal(external2.status, "planned");

const finalExternalWitness = external2.next_witness_jsonl;
assert.equal(
  sha256Id(Buffer.from(finalExternalWitness, "utf8")),
  "sha256:b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e",
);
assert.equal(
  external2.next_event?.event_sha256,
  "sha256:e72160233cf64b43d9d95ee0e208acf5a49cf8fe0da67ce01aa8cdd05b9680ea",
);

const receiptBody = Object.freeze({
  consume: Object.freeze({
    event_count: 2,
    generation: 1,
    high_water_sha256: finalHigh.high_water_sha256,
    journal_sha256: sha256Id(Buffer.from(finalJournal, "utf8")),
    sequence: 2,
    terminal_request_id: requestId,
    terminal_response_sha256: responseSha256,
  }),
  external_replay_witness: Object.freeze({
    event_count: 3,
    tip_event_sha256: external2.next_event?.event_sha256,
    witness_sha256: sha256Id(
      Buffer.from(finalExternalWitness, "utf8"),
    ),
    witnessed_replay_sequence: 2,
  }),
  funds_moved: false,
  independent_custody_proven: false,
  issue: Object.freeze({
    challenge_id: issue.challenge_id,
    challenge_sha256: issue.challenge_sha256,
    event_count: 1,
    expires_at_ms: expiresAtMs,
    generation: 1,
    high_water_sha256: issueHigh.high_water_sha256,
    issued_at_ms: issuedAtMs,
    journal_sha256: sha256Id(Buffer.from(issueJournal, "utf8")),
    sequence: 1,
  }),
  live_read: Object.freeze({
    event_count: 1,
    observed_at_ms: liveReadObservedAtMs,
    request_id: requestId,
    response_sha256: responseSha256,
    started_at_ms: liveReadStartedAtMs,
    tip_event_sha256:
      "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654",
    witness_sha256:
      "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a",
  }),
  marker: "VOID_REPLAY_LIVE_CYCLE_V1",
  observed_authenticated_generic_ssh_read: true,
  observed_replay_external_sequential_custody: true,
  production_gate_ready: false,
  protected_high_water_custody_proven: false,
  rollback_resistance_proven: false,
  schema: "void_replay_live_cycle_operator_receipt_v1",
  source_commit: "f4c0905b3888bd1db72af455e980a6df22380fac",
  transaction: false,
  version: 1,
  wallet_or_signer: false,
});
const receiptSha256 = sha256Id(
  Buffer.from(canonicalJson(receiptBody), "utf8"),
);
assert.equal(
  receiptSha256,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_SHA256_V1,
);
const receipt = Buffer.from(
  canonicalJson({
    ...receiptBody,
    receipt_sha256: receiptSha256,
  }) + "\n",
  "utf8",
);
assert.equal(
  sha256Id(receipt),
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_OPERATOR_RECEIPT_FILE_SHA256_V1,
);

const green =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
    {
      operator_receipt_json: receipt,
      current_journal_jsonl: finalJournal,
      current_high_water_json: finalHigh.high_water_json,
      external_witness_jsonl: finalExternalWitness,
    },
  );

assert.equal(green.ok, true);
if (!green.ok) throw new Error("reviewed live external custody held");
assert.equal(green.status, "reviewed_live_external_custody_qualified");
assert.match(green.qualification_id, /^voidwlrlecq1_[0-9a-f]{64}$/u);
assert.equal(green.reviewed_operator_receipt_bound, true);
assert.equal(green.reviewed_live_evidence_origin_proven, true);
assert.equal(green.canonical_current_replay_binding_proven, true);
assert.equal(green.canonical_external_witness_history_proven, true);
assert.equal(green.terminal_packet_binding_proven, true);
assert.equal(green.sequential_external_custody_proven, true);
assert.equal(green.external_transport_authenticated, true);
assert.equal(green.external_witness_storage_proven, true);
assert.equal(green.live_remote_read_performed, true);
assert.equal(green.live_remote_append_performed, true);
assert.equal(green.external_second_control_domain_qualified, true);
assert.equal(green.normalized.replay_generation, 1);
assert.equal(green.normalized.replay_sequence, 2);
assert.equal(green.normalized.replay_event_count, 2);
assert.equal(green.normalized.external_witness_event_count, 3);
assert.equal(green.normalized.external_witnessed_replay_sequence, 2);

for (const key of [
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "trusted_verification_clock_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "runtime_integration",
  "production_gate_ready",
  "funds_movement",
] as const) {
  assert.equal(green[key], false, key);
}

for (const key of [
  "reviewed_live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "live_remote_append_performed",
  "external_second_control_domain_qualified",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

{
  const parsed = JSON.parse(receipt.toString("utf8"));
  parsed.observed_authenticated_generic_ssh_read = false;
  const body = { ...parsed };
  delete body.receipt_sha256;
  parsed.receipt_sha256 = sha256Id(
    Buffer.from(canonicalJson(body), "utf8"),
  );
  const tampered = Buffer.from(
    canonicalJson(parsed) + "\n",
    "utf8",
  );
  const result =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
      {
        operator_receipt_json: tampered,
        current_journal_jsonl: finalJournal,
        current_high_water_json: finalHigh.high_water_json,
        external_witness_jsonl: finalExternalWitness,
      },
    );
  assert.equal(result.ok, false);
}

{
  const tamperedJournal = Buffer.from(finalJournal, "utf8");
  tamperedJournal[20] ^= 1;
  const result =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
      {
        operator_receipt_json: receipt,
        current_journal_jsonl: tamperedJournal,
        current_high_water_json: finalHigh.high_water_json,
        external_witness_jsonl: finalExternalWitness,
      },
    );
  assert.equal(result.ok, false);
}

{
  const tamperedWitness = Buffer.from(finalExternalWitness, "utf8");
  tamperedWitness[tamperedWitness.length - 3] ^= 1;
  const result =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
      {
        operator_receipt_json: receipt,
        current_journal_jsonl: finalJournal,
        current_high_water_json: finalHigh.high_water_json,
        external_witness_jsonl: tamperedWitness,
      },
    );
  assert.equal(result.ok, false);
}

{
  const truncatedWitness = Buffer.from(
    finalExternalWitness,
    "utf8",
  ).subarray(0, Buffer.byteLength(finalExternalWitness, "utf8") - 1);
  const result =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalCustodyQualificationV1(
      {
        operator_receipt_json: receipt,
        current_journal_jsonl: finalJournal,
        current_high_water_json: finalHigh.high_water_json,
        external_witness_jsonl: truncatedWitness,
      },
    );
  assert.equal(result.ok, false);
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1_GREEN",
);
console.log("reviewed_operator_receipt_bound=true");
console.log("reviewed_live_evidence_origin_proven=true");
console.log("canonical_current_replay_binding_proven=true");
console.log("canonical_external_witness_history_proven=true");
console.log("terminal_packet_binding_proven=true");
console.log("sequential_external_custody_proven=true");
console.log("external_transport_authenticated=true");
console.log("external_witness_storage_proven=true");
console.log("live_remote_read_performed=true");
console.log("live_remote_append_performed=true");
console.log("external_second_control_domain_qualified=true");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
