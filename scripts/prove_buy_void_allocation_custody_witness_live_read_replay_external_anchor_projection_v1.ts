#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1,
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_anchor_projection_v1.js";

const HOST = "zoso-Precision-Tower-7810";
const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);
const requestId = (hex: string): string =>
  "voidwreq1_" + hex.repeat(64);

function highWater(journal: string) {
  const derived =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      journal,
    );
  assert.equal(derived.ok, true);
  if (!derived.ok) throw new Error("high-water derivation held");
  return derived;
}

const journal0 = "";
const high0 = highWater(journal0);

const projection0 =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1({
    replay_journal_jsonl: journal0,
    replay_high_water_json: high0.high_water_json,
    source_hostname: HOST,
  });
assert.equal(projection0.ok, true);
if (!projection0.ok) throw new Error("genesis projection held");
assert.equal(projection0.status, "canonical_projection_derived");
assert.equal(projection0.projection.replay_sequence, 0);
assert.equal(projection0.projection.replay_generation, 0);
assert.equal(projection0.projection.replay_event_count, 0);
assert.equal(projection0.projection.replay_pending, false);
assert.equal(projection0.projection.replay_ready_for_issue, true);
assert.equal(
  projection0.projection.replay_high_water_sha256,
  high0.high_water_sha256,
);
assert.equal(
  projection0.projection.replay_journal_sha256,
  high0.high_water.journal_sha256,
);
assert.equal(
  projection0.canonical_replay_projection_binding_proven,
  true,
);

const anchor0 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1({
    anchor_journal_jsonl: "",
    replay_journal_jsonl: journal0,
    replay_high_water_json: high0.high_water_json,
    source_hostname: HOST,
  });
assert.equal(anchor0.ok, true);
if (!anchor0.ok) throw new Error("genesis canonical anchor held");
assert.equal(anchor0.status, "canonical_anchor_append_planned");
assert.equal(anchor0.replay_sequence, 0);
assert.equal(anchor0.canonical_replay_projection_binding_proven, true);

const issue =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: sha("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issue.ok, true);
if (!issue.ok) throw new Error("issue fixture held");

const journal1 = issue.next_journal_jsonl;
const high1 = highWater(journal1);
const anchor1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1({
    anchor_journal_jsonl: anchor0.next_anchor_journal_jsonl,
    replay_journal_jsonl: journal1,
    replay_high_water_json: high1.high_water_json,
    source_hostname: HOST,
  });
assert.equal(anchor1.ok, true);
if (!anchor1.ok) throw new Error("issue canonical anchor held");
assert.equal(anchor1.status, "canonical_anchor_append_planned");
assert.equal(anchor1.replay_sequence, 1);
assert.equal(anchor1.projection.replay_pending, true);
assert.equal(
  anchor1.projection.replay_pending_challenge_sha256,
  issue.challenge_sha256,
);
assert.equal(
  anchor1.projection.replay_pending_challenge_id,
  issue.challenge_id,
);

const consume =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: journal1,
    outcome: "consumed",
    request_id: requestId("a"),
    response_sha256: sha("b"),
    terminal_at_ms: 2_000,
  });
assert.equal(consume.ok, true);
if (!consume.ok) throw new Error("consume fixture held");

const journal2 = consume.next_journal_jsonl;
const high2 = highWater(journal2);
const anchor2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1({
    anchor_journal_jsonl: anchor1.next_anchor_journal_jsonl,
    replay_journal_jsonl: journal2,
    replay_high_water_json: high2.high_water_json,
    source_hostname: HOST,
  });
assert.equal(anchor2.ok, true);
if (!anchor2.ok) throw new Error("consume canonical anchor held");
assert.equal(anchor2.replay_sequence, 2);
assert.equal(anchor2.projection.replay_pending, false);
assert.equal(anchor2.projection.replay_last_terminal_state, "consumed");
assert.equal(anchor2.projection.replay_generation, 1);

const idem =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1({
    anchor_journal_jsonl: anchor2.next_anchor_journal_jsonl,
    replay_journal_jsonl: journal2,
    replay_high_water_json: high2.high_water_json,
    source_hostname: HOST,
  });
assert.equal(idem.ok, true);
if (!idem.ok) throw new Error("canonical idempotence held");
assert.equal(idem.status, "canonical_projection_already_anchored");
assert.equal(idem.operation_performed, false);

{
  const stale =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1({
      replay_journal_jsonl: journal1,
      replay_high_water_json: high0.high_water_json,
      source_hostname: HOST,
    });
  assert.equal(stale.ok, false);
  if (stale.ok) throw new Error("stale high-water green");
  assert.match(
    stale.reason,
    /witness_replay_external_anchor_projection_high_water_/u,
  );
}

{
  const tampered = JSON.parse(high1.high_water_json);
  tampered.journal_sha256 = sha("f");
  const invalid =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1({
      replay_journal_jsonl: journal1,
      replay_high_water_json: JSON.stringify(tampered) + "\n",
      source_hostname: HOST,
    });
  assert.equal(invalid.ok, false);
  if (invalid.ok) throw new Error("tampered high-water green");
  assert.match(
    invalid.reason,
    /witness_replay_external_anchor_projection_high_water_/u,
  );
}

{
  const invalid =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1({
      replay_journal_jsonl: journal0,
      replay_high_water_json: high0.high_water_json,
      source_hostname: "bad host name",
    });
  assert.equal(invalid.ok, false);
  if (invalid.ok) throw new Error("invalid hostname green");
  assert.equal(
    invalid.reason,
    "witness_replay_external_anchor_projection_hostname_invalid",
  );
}

{
  const skipped =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1({
      anchor_journal_jsonl: anchor0.next_anchor_journal_jsonl,
      replay_journal_jsonl: journal2,
      replay_high_water_json: high2.high_water_json,
      source_hostname: HOST,
    });
  assert.equal(skipped.ok, false);
  if (skipped.ok) throw new Error("skipped replay anchor green");
  assert.equal(
    skipped.reason,
    "witness_replay_external_anchor_projection_plan_witness_replay_external_anchor_replay_gap",
  );
}

{
  const rewind =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayCanonicalExternalAnchorAppendV1({
      anchor_journal_jsonl: anchor2.next_anchor_journal_jsonl,
      replay_journal_jsonl: journal1,
      replay_high_water_json: high1.high_water_json,
      source_hostname: HOST,
    });
  assert.equal(rewind.ok, false);
  if (rewind.ok) throw new Error("canonical rewind green");
  assert.equal(
    rewind.reason,
    "witness_replay_external_anchor_projection_plan_witness_replay_external_anchor_replay_rewind",
  );
}

for (const key of [
  "source_contract",
  "canonical_replay_high_water_required",
  "exact_replay_journal_binding_required",
  "canonical_replay_projection_binding_proven",
  "canonical_anchor_planner_composed",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1
    .caller_selected_projection,
  false,
);

for (const key of [
  "live_anchor_storage_proven",
  "external_anchor_transport_authenticated",
  "external_anchor_append_performed",
  "external_anchor_read_performed",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "filesystem_read",
  "filesystem_write",
  "network_access",
  "credential_access",
  "wallet_or_signer_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_PROJECTION_V1_GREEN",
);
console.log("canonical_replay_high_water_required=true");
console.log("exact_replay_journal_binding_required=true");
console.log("caller_selected_projection=false");
console.log("canonical_replay_projection_binding_proven=true");
console.log("canonical_anchor_planner_composed=true");
console.log("genesis_projection_green=true");
console.log("issue_projection_green=true");
console.log("consume_projection_green=true");
console.log("stale_high_water_rejected=true");
console.log("tampered_high_water_rejected=true");
console.log("anchor_gap_rejected=true");
console.log("anchor_rewind_rejected=true");
console.log("live_anchor_storage_proven=false");
console.log("external_anchor_transport_authenticated=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
