#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1,
  parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1,
  type BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessIdentityV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);
const requestId = (hex: string): string =>
  "voidwreq1_" + hex.repeat(64);

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
  throw new Error("noncanonical_fixture_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function rehashWitnessJsonl(
  witness: Buffer,
  mutate: (events: Array<Record<string, unknown>>) => void,
): Buffer {
  const events = witness
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  mutate(events);
  let previous: string | null = null;
  for (const event of events) {
    event.previous_event_sha256 = previous;
    const body = { ...event };
    delete body.event_sha256;
    event.event_sha256 = sha256Id(canonicalJson(body));
    previous = String(event.event_sha256);
  }
  return Buffer.from(
    events.map((event) => canonicalJson(event)).join("\n") + "\n",
    "utf8",
  );
}

const identity = Object.freeze({
  source_hostname: "zoso-Precision-Tower-7810",
  source_journal_root:
    "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
  source_high_water_root:
    "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
  source_journal_disk_wwn: "0x500a0751e9c796d8",
  source_high_water_disk_wwn:
    "eui.e8238fa6bf530001001b448b42e66c36",
  witness_hostname: "Nimo",
  witness_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  witness_root_disk_serial: "50026B76873B25AB",
  witness_root_disk_wwn:
    "eui.00000000000000000026b76873b25ab5",
});

function replayHighWaterJsonFixture(value: {
  sequence: number;
  generation: number;
  event_count: number;
  tip_event_sha256: string | null;
  journal_sha256: string;
  journal_bytes: number;
  pending: boolean;
  pending_challenge_sha256: string | null;
  pending_challenge_id: string | null;
  pending_expires_at_ms: number | null;
  last_terminal_state: "consumed" | "abandoned" | null;
  ready_for_issue: boolean;
}): string {
  return (
    JSON.stringify({
      schema:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1,
      sequence: value.sequence,
      generation: value.generation,
      event_count: value.event_count,
      tip_event_sha256: value.tip_event_sha256,
      journal_sha256: value.journal_sha256,
      journal_bytes: value.journal_bytes,
      pending: value.pending,
      pending_challenge_sha256: value.pending_challenge_sha256,
      pending_challenge_id: value.pending_challenge_id,
      pending_expires_at_ms: value.pending_expires_at_ms,
      last_terminal_state: value.last_terminal_state,
      ready_for_issue: value.ready_for_issue,
    }) + "\n"
  );
}

function buildStressReplayAndWitness(
  eventCount: number,
  witnessIdentity:
    BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessIdentityV1 =
      identity,
) {
  const replayLines: string[] = [];
  const witnessLines: string[] = [];
  const replayHash = crypto.createHash("sha256");
  let replayBytes = 0;
  let previousReplaySha: string | null = null;
  let previousWitnessSha: string | null = null;
  let lastTerminalState: "consumed" | "abandoned" | null = null;
  let pending:
    | {
        generation: number;
        entropy_sha256: string;
        challenge_sha256: string;
        challenge_id: string;
        issued_at_ms: number;
        expires_at_ms: number;
      }
    | null = null;

  const appendWitness = (
    replaySequence: number,
    generation: number,
    tipEventSha256: string | null,
    journalSha256: string,
    journalBytes: number,
    pendingState: boolean,
    pendingChallengeSha256: string | null,
    pendingChallengeId: string | null,
    pendingExpiresAtMs: number | null,
    lastTerminal: "consumed" | "abandoned" | null,
  ) => {
    const highWater = {
      sequence: replaySequence,
      generation,
      event_count: replaySequence,
      tip_event_sha256: tipEventSha256,
      journal_sha256: journalSha256,
      journal_bytes: journalBytes,
      pending: pendingState,
      pending_challenge_sha256: pendingChallengeSha256,
      pending_challenge_id: pendingChallengeId,
      pending_expires_at_ms: pendingExpiresAtMs,
      last_terminal_state: lastTerminal,
      ready_for_issue: !pendingState,
    };
    const body = {
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1,
      version: 1,
      sequence: replaySequence + 1,
      previous_event_sha256: previousWitnessSha,
      replay_sequence: replaySequence,
      generation,
      event_count: replaySequence,
      tip_event_sha256: tipEventSha256,
      journal_sha256: journalSha256,
      journal_bytes: journalBytes,
      high_water_sha256: sha256Id(
        Buffer.from(replayHighWaterJsonFixture(highWater), "utf8"),
      ),
      pending: pendingState,
      pending_challenge_sha256: pendingChallengeSha256,
      pending_challenge_id: pendingChallengeId,
      pending_expires_at_ms: pendingExpiresAtMs,
      last_terminal_state: lastTerminal,
      ready_for_issue: !pendingState,
      ...witnessIdentity,
    };
    const event = {
      ...body,
      event_sha256: sha256Id(canonicalJson(body)),
    };
    const line = canonicalJson(event) + "\n";
    witnessLines.push(line);
    previousWitnessSha = event.event_sha256;
  };

  appendWitness(
    0,
    0,
    null,
    sha256Id(Buffer.alloc(0)),
    0,
    false,
    null,
    null,
    null,
    null,
  );

  for (let sequence = 1; sequence <= eventCount; sequence += 1) {
    const issued = sequence % 2 === 1;
    let body: Record<string, unknown>;
    if (issued) {
      const generation = (sequence + 1) / 2;
      const issuedAt = 1_800_000_000_000 + generation * 100;
      const expiresAt = issuedAt + 30_000;
      const entropySha = sha256Id("stress-entropy-" + String(generation));
      const challengeDigest = sha256Id(
        canonicalJson({
          domain:
            "void:mainnet-0:buy-void-allocation-custody-witness-live-read-challenge-v1",
          generation,
          previous_event_sha256: previousReplaySha,
          entropy_sha256: entropySha,
          issued_at_ms: issuedAt,
          expires_at_ms: expiresAt,
        }),
      ).slice("sha256:".length);
      pending = {
        generation,
        entropy_sha256: entropySha,
        challenge_sha256: "sha256:" + challengeDigest,
        challenge_id: "voidwlrc1_" + challengeDigest,
        issued_at_ms: issuedAt,
        expires_at_ms: expiresAt,
      };
      body = {
        marker:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1,
        version: 1,
        sequence,
        previous_event_sha256: previousReplaySha,
        generation,
        state: "issued",
        entropy_sha256: pending.entropy_sha256,
        challenge_sha256: pending.challenge_sha256,
        challenge_id: pending.challenge_id,
        issued_at_ms: pending.issued_at_ms,
        expires_at_ms: pending.expires_at_ms,
        request_id: null,
        response_sha256: null,
        terminal_at_ms: null,
      };
    } else {
      if (!pending) throw new Error("stress pending state missing");
      body = {
        marker:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1,
        version: 1,
        sequence,
        previous_event_sha256: previousReplaySha,
        generation: pending.generation,
        state: "abandoned",
        entropy_sha256: pending.entropy_sha256,
        challenge_sha256: pending.challenge_sha256,
        challenge_id: pending.challenge_id,
        issued_at_ms: pending.issued_at_ms,
        expires_at_ms: pending.expires_at_ms,
        request_id: null,
        response_sha256: null,
        terminal_at_ms: pending.issued_at_ms + 1,
      };
      lastTerminalState = "abandoned";
    }

    const replayEvent = {
      ...body,
      event_sha256: sha256Id(canonicalJson(body)),
    };
    const replayLine = canonicalJson(replayEvent) + "\n";
    replayLines.push(replayLine);
    replayHash.update(replayLine, "utf8");
    replayBytes += Buffer.byteLength(replayLine, "utf8");
    previousReplaySha = replayEvent.event_sha256;

    const pendingState = issued;
    appendWitness(
      sequence,
      Number(body.generation),
      replayEvent.event_sha256,
      "sha256:" + replayHash.copy().digest("hex"),
      replayBytes,
      pendingState,
      pendingState ? pending!.challenge_sha256 : null,
      pendingState ? pending!.challenge_id : null,
      pendingState ? pending!.expires_at_ms : null,
      lastTerminalState,
    );
    if (!issued) pending = null;
  }

  return Object.freeze({
    replay_journal: replayLines.join(""),
    witness_jsonl: witnessLines.join(""),
    witness_without_tip: witnessLines.slice(0, -1).join(""),
  });
}

function highWater(journal: string) {
  const result =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      journal,
    );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("high-water fixture held");
  return result;
}

const journal0 = "";
const high0 = highWater(journal0);

const genesisPlan =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: "",
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(genesisPlan.ok, true);
if (!genesisPlan.ok) throw new Error("external witness genesis held");
assert.equal(genesisPlan.status, "planned_genesis");
assert.equal(genesisPlan.next_event?.sequence, 1);
assert.equal(genesisPlan.next_event?.replay_sequence, 0);
assert.equal(genesisPlan.next_event?.generation, 0);
assert.equal(genesisPlan.next_event?.event_count, 0);
assert.equal(genesisPlan.next_event?.pending, false);
assert.equal(genesisPlan.next_event?.ready_for_issue, true);

const witness0 = Buffer.from(genesisPlan.next_witness_jsonl, "utf8");
const parsed0 =
  parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
    witness0,
  );
assert.equal(parsed0.event_count, 1);
assert.equal(parsed0.tip.replay_sequence, 0);

const matched0 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(matched0.ok, true);
if (!matched0.ok) throw new Error("genesis match held");
assert.equal(matched0.status, "matched");
assert.equal(matched0.exact_live_match, true);

{
  const numericIdentity =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: witness0,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity: {
        ...identity,
        source_hostname: 123,
      },
    });
  assert.equal(numericIdentity.ok, false);
  if (numericIdentity.ok) {
    throw new Error("numeric identity field unexpectedly green");
  }
  assert.equal(
    numericIdentity.reason,
    "witness_replay_external_witness_source_identity_invalid",
  );
}

{
  let coercionCalls = 0;
  const hostileIdentity = {
    toString() {
      coercionCalls += 1;
      return identity.source_hostname;
    },
  };
  const objectIdentity =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: "",
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity: {
        ...identity,
        source_hostname: hostileIdentity,
      },
    });
  assert.equal(objectIdentity.ok, false);
  if (objectIdentity.ok) {
    throw new Error("object identity field unexpectedly green");
  }
  assert.equal(
    objectIdentity.reason,
    "witness_replay_external_witness_source_identity_invalid",
  );
  assert.equal(
    coercionCalls,
    0,
    "identity validation must not invoke caller-controlled toString",
  );
}

const issueA =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issueA.ok, true);
if (!issueA.ok) throw new Error("issue A held");
const journalA1 = issueA.next_journal_jsonl;
const highA1 = highWater(journalA1);

const updateRequiredA1 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journalA1,
    current_high_water_json: highA1.high_water_json,
    identity,
  });
assert.equal(updateRequiredA1.ok, true);
if (!updateRequiredA1.ok) throw new Error("update-required A1 held");
assert.equal(
  updateRequiredA1.status,
  "external_witness_update_required",
);
assert.equal(updateRequiredA1.witnessed_replay_sequence, 0);
assert.equal(updateRequiredA1.local_replay_sequence, 1);

const planA1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journalA1,
    current_high_water_json: highA1.high_water_json,
    identity,
  });
assert.equal(planA1.ok, true);
if (!planA1.ok) throw new Error("witness A1 plan held");
assert.equal(planA1.status, "planned");
assert.equal(planA1.next_event?.sequence, 2);
assert.equal(planA1.next_event?.replay_sequence, 1);
assert.equal(
  planA1.next_event?.high_water_sha256,
  highA1.high_water_sha256,
);
const witnessA1 = Buffer.from(planA1.next_witness_jsonl, "utf8");

const matchedA1 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA1,
    current_journal_jsonl: journalA1,
    current_high_water_json: highA1.high_water_json,
    identity,
  });
assert.equal(matchedA1.ok, true);
if (!matchedA1.ok) throw new Error("A1 match held");
assert.equal(matchedA1.status, "matched");

const consumeA =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: journalA1,
    outcome: "consumed",
    request_id: requestId("a"),
    response_sha256: sha("b"),
    terminal_at_ms: 2_000,
  });
assert.equal(consumeA.ok, true);
if (!consumeA.ok) throw new Error("consume A held");
const journalA2 = consumeA.next_journal_jsonl;
const highA2 = highWater(journalA2);

const planA2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witnessA1,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(planA2.ok, true);
if (!planA2.ok) throw new Error("witness A2 plan held");
assert.equal(planA2.status, "planned");
assert.equal(planA2.next_event?.sequence, 3);
assert.equal(planA2.next_event?.replay_sequence, 2);
const witnessA2 = Buffer.from(planA2.next_witness_jsonl, "utf8");

const matchedA2 =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(matchedA2.ok, true);
if (!matchedA2.ok) throw new Error("A2 match held");
assert.equal(matchedA2.status, "matched");

const aheadWithoutTrustedProvenance =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(aheadWithoutTrustedProvenance.ok, false);
if (aheadWithoutTrustedProvenance.ok) {
  throw new Error("unauthenticated ahead witness unexpectedly green");
}
assert.equal(
  aheadWithoutTrustedProvenance.reason,
  "witness_replay_external_witness_ahead_unverified",
);
assert.equal(
  aheadWithoutTrustedProvenance.rollback_regression_detected,
  false,
  "source-only witness must not claim rollback from unauthenticated ahead state",
);

const aheadPlanWithoutTrustedProvenance =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journal0,
    current_high_water_json: high0.high_water_json,
    identity,
  });
assert.equal(aheadPlanWithoutTrustedProvenance.ok, false);
if (aheadPlanWithoutTrustedProvenance.ok) {
  throw new Error("unauthenticated ahead witness plan unexpectedly green");
}
assert.equal(
  aheadPlanWithoutTrustedProvenance.reason,
  "witness_replay_external_witness_ahead_unverified",
);
assert.equal(
  aheadPlanWithoutTrustedProvenance.rollback_regression_detected,
  false,
);

{
  const validPrefixForgedTail = rehashWitnessJsonl(
    witnessA2,
    (events) => {
      events[1].journal_sha256 = sha("c");
      events[1].high_water_sha256 = sha("d");
      events[1].tip_event_sha256 = sha("e");
    },
  );
  const forgedTailClassification =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: validPrefixForgedTail,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity,
    });
  assert.equal(forgedTailClassification.ok, false);
  if (forgedTailClassification.ok) {
    throw new Error("valid-prefix forged tail unexpectedly green");
  }
  assert.equal(
    forgedTailClassification.reason,
    "witness_replay_external_witness_ahead_unverified",
  );
  assert.equal(
    forgedTailClassification.rollback_regression_detected,
    false,
    "unavailable future tail has no authenticated rollback provenance",
  );

  const forgedTailPlan =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: validPrefixForgedTail,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity,
    });
  assert.equal(forgedTailPlan.ok, false);
  if (forgedTailPlan.ok) {
    throw new Error("valid-prefix forged tail plan unexpectedly green");
  }
  assert.equal(
    forgedTailPlan.reason,
    "witness_replay_external_witness_ahead_unverified",
  );
  assert.equal(forgedTailPlan.rollback_regression_detected, false);
}

{
  const forgedAhead = rehashWitnessJsonl(witnessA2, (events) => {
    events[0].journal_sha256 = sha("d");
    events[0].high_water_sha256 = sha("e");
  });
  const forgedClassification =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: forgedAhead,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity,
    });
  assert.equal(forgedClassification.ok, false);
  if (forgedClassification.ok) {
    throw new Error("forged ahead witness unexpectedly green");
  }
  assert.equal(
    forgedClassification.reason,
    "witness_replay_external_witness_local_history_conflict",
  );
  assert.equal(
    forgedClassification.rollback_regression_detected,
    false,
    "rollback evidence requires a canonical common witness prefix",
  );

  const forgedPlan =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: forgedAhead,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity,
    });
  assert.equal(forgedPlan.ok, false);
  if (forgedPlan.ok) {
    throw new Error("forged ahead witness plan unexpectedly green");
  }
  assert.equal(
    forgedPlan.reason,
    "witness_replay_external_witness_local_history_conflict",
  );
  assert.equal(forgedPlan.rollback_regression_detected, false);
}

{
  const impossiblePendingAhead = rehashWitnessJsonl(
    witnessA2,
    (events) => {
      events[1].pending_challenge_id =
        "voidwlrc1_" + "f".repeat(64);
    },
  );
  const impossibleClassification =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: impossiblePendingAhead,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity,
    });
  assert.equal(impossibleClassification.ok, false);
  if (impossibleClassification.ok) {
    throw new Error("impossible pending witness unexpectedly green");
  }
  assert.equal(
    impossibleClassification.reason,
    "witness_replay_external_witness_state_invalid",
  );
  assert.equal(
    impossibleClassification.rollback_regression_detected,
    false,
  );

  const impossiblePlan =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: impossiblePendingAhead,
      current_journal_jsonl: journal0,
      current_high_water_json: high0.high_water_json,
      identity,
    });
  assert.equal(impossiblePlan.ok, false);
  if (impossiblePlan.ok) {
    throw new Error("impossible pending witness plan unexpectedly green");
  }
  assert.equal(
    impossiblePlan.reason,
    "witness_replay_external_witness_state_invalid",
  );
  assert.equal(impossiblePlan.rollback_regression_detected, false);
}

const idempotent =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witnessA2,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(idempotent.ok, true);
if (!idempotent.ok) throw new Error("idempotent plan held");
assert.equal(idempotent.status, "idempotent");
assert.equal(idempotent.next_event, null);
assert.equal(
  idempotent.next_witness_jsonl,
  witnessA2.toString("utf8"),
);

const issueB =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("2"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issueB.ok, true);
if (!issueB.ok) throw new Error("issue B held");
const journalB1 = issueB.next_journal_jsonl;
const consumeB =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: journalB1,
    outcome: "consumed",
    request_id: requestId("c"),
    response_sha256: sha("d"),
    terminal_at_ms: 2_000,
  });
assert.equal(consumeB.ok, true);
if (!consumeB.ok) throw new Error("consume B held");
const journalB2 = consumeB.next_journal_jsonl;
const highB2 = highWater(journalB2);

const mixed =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
    witness_jsonl: witnessA1,
    current_journal_jsonl: journalB2,
    current_high_water_json: highB2.high_water_json,
    identity,
  });
assert.equal(mixed.ok, false);
if (mixed.ok) throw new Error("mixed history unexpectedly green");
assert.equal(
  mixed.reason,
  "witness_replay_external_witness_local_history_conflict",
);

const catchup1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: witness0,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(catchup1.ok, true);
if (!catchup1.ok) throw new Error("catchup1 held");
assert.equal(catchup1.status, "planned");
assert.equal(catchup1.next_event?.replay_sequence, 1);

const catchup2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
    witness_jsonl: catchup1.next_witness_jsonl,
    current_journal_jsonl: journalA2,
    current_high_water_json: highA2.high_water_json,
    identity,
  });
assert.equal(catchup2.ok, true);
if (!catchup2.ok) throw new Error("catchup2 held");
assert.equal(catchup2.status, "planned");
assert.equal(catchup2.next_event?.replay_sequence, 2);
assert.equal(
  Buffer.from(catchup2.next_witness_jsonl, "utf8").equals(witnessA2),
  true,
);

{
  const badIdentity = {
    ...identity,
    witness_root_disk_serial: "DIFFERENT-DISK",
  };
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: witnessA2,
      current_journal_jsonl: journalA2,
      current_high_water_json: highA2.high_water_json,
      identity: badIdentity,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("identity drift unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_external_witness_identity_mismatch",
  );
}

{
  const parsed =
    parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
      witnessA1,
    );
  const lines = witnessA1.toString("utf8").trimEnd().split("\n");
  const tampered = JSON.parse(lines[1]);
  tampered.journal_sha256 = sha("f");
  lines[1] = JSON.stringify(tampered);
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: lines.join("\n") + "\n",
      current_journal_jsonl: journalA1,
      current_high_water_json: highA1.high_water_json,
      identity,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("tampered witness unexpectedly green");
  assert.match(
    held.reason,
    /witness_replay_external_witness_event_hash_mismatch|witness_replay_external_witness_line_noncanonical/u,
  );
  assert.equal(parsed.event_count, 2);
}

{
  const truncated = witnessA2.subarray(0, witnessA2.length - 1);
  assert.throws(
    () =>
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        truncated,
      ),
    /witness_replay_external_witness_bytes_invalid/u,
  );
}

{
  const sourceText = await import("node:fs").then((fs) =>
    fs.readFileSync(
      new URL(
        "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    sourceText.includes("function splitJournalPrefixes("),
    false,
    "cumulative replay-prefix retention must stay retired",
  );
  assert.equal(
    sourceText.includes("const prefixes: Buffer[]"),
    false,
    "near-capacity replay verification must not retain cumulative buffers",
  );
  assert.match(sourceText, /journalHash\.copy\(\)\.digest/u);

  const maximalIdentity = Object.freeze({
    source_hostname: "a".repeat(300),
    source_journal_root: "b".repeat(300),
    source_high_water_root: "c".repeat(300),
    source_journal_disk_wwn: "d".repeat(300),
    source_high_water_disk_wwn: "e".repeat(300),
    witness_hostname: "f".repeat(300),
    witness_machine_id_sha256: sha("a"),
    witness_root_disk_serial: "g".repeat(300),
    witness_root_disk_wwn: "h".repeat(300),
  });
  const stress = buildStressReplayAndWitness(
    8192,
    maximalIdentity,
  );
  assert.ok(
    Buffer.byteLength(stress.replay_journal, "utf8") <= 8 * 1024 * 1024,
  );
  assert.ok(
    Buffer.byteLength(stress.witness_jsonl, "utf8") <=
      8193 * 4 * 1024,
    "full witness history must fit derived 4 KiB/event capacity",
  );
  for (const line of stress.witness_jsonl.trimEnd().split("\n")) {
    assert.ok(
      Buffer.byteLength(line, "utf8") + 1 <= 4 * 1024,
      "maximal valid identity witness event must fit 4 KiB",
    );
  }
  const stressHighWater =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      stress.replay_journal,
    );
  assert.equal(stressHighWater.ok, true);
  if (!stressHighWater.ok) {
    throw new Error("near-capacity replay high-water held");
  }

  const stressMatched =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1({
      witness_jsonl: stress.witness_jsonl,
      current_journal_jsonl: stress.replay_journal,
      current_high_water_json: stressHighWater.high_water_json,
      identity: maximalIdentity,
    });
  assert.equal(stressMatched.ok, true);
  if (!stressMatched.ok) {
    throw new Error("near-capacity witness match held");
  }
  assert.equal(stressMatched.status, "matched");
  assert.equal(stressMatched.witness_event_count, 8193);

  const stressPlan =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1({
      witness_jsonl: stress.witness_without_tip,
      current_journal_jsonl: stress.replay_journal,
      current_high_water_json: stressHighWater.high_water_json,
      identity: maximalIdentity,
    });
  assert.equal(stressPlan.ok, true);
  if (!stressPlan.ok) {
    throw new Error("near-capacity witness catch-up held");
  }
  assert.equal(stressPlan.status, "planned");
  assert.equal(stressPlan.next_event?.replay_sequence, 8192);
}

for (const key of [
  "rollback_regression_detection",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "live_remote_append_performed",
  "runtime_integration",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "filesystem_read",
  "filesystem_write",
  "network_access",
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
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "source_contract",
  "pure_validation_and_planning",
  "canonical_replay_high_water_required",
  "exact_historical_journal_prefix_rebinding",
  "append_only_hash_chain",
  "one_witness_event_per_replay_sequence",
  "exact_next_sequence_planning",
  "mixed_history_conflict_rejection",
  "source_storage_identity_invariant",
  "witness_host_identity_invariant",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1_GREEN",
);
console.log("canonical_replay_high_water_required=true");
console.log("exact_historical_prefix_rebinding=true");
console.log("genesis_planning=true");
console.log("one_event_per_replay_sequence=true");
console.log("sequential_catchup=true");
console.log("mixed_history_conflict_rejected=true");
console.log("unauthenticated_ahead_witness_held=true");
console.log("rollback_claim_requires_authenticated_external_provenance=true");
console.log("valid_prefix_forged_tail_not_labeled_rollback=true");
console.log("forged_shared_prefix_not_labeled_rollback=true");
console.log("pending_challenge_id_digest_binding=true");
console.log("impossible_pending_witness_not_labeled_rollback=true");
console.log("identity_drift_rejected=true");
console.log("near_capacity_prefix_scan_linear_memory=true");
console.log("cumulative_prefix_buffers_retired=true");
console.log("witness_event_max_bytes=4096");
console.log("witness_max_events=8193");
console.log("maximal_identity_full_history_fits=true");
console.log("tampered_witness_rejected=true");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
