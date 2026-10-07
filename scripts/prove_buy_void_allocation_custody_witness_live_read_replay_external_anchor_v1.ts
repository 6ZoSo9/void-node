#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorV1,
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_external_anchor_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);
const challenge = (hex: string): string =>
  "voidwlrc1_" + hex.repeat(64);

function genesis() {
  return {
    source_hostname: "zoso-Precision-Tower-7810",
    replay_sequence: 0,
    replay_generation: 0,
    replay_event_count: 0,
    replay_tip_event_sha256: null,
    replay_high_water_sha256: sha("a"),
    replay_journal_sha256: sha("b"),
    replay_pending: false,
    replay_pending_challenge_sha256: null,
    replay_pending_challenge_id: null,
    replay_pending_expires_at_ms: null,
    replay_last_terminal_state: null,
    replay_ready_for_issue: true,
  };
}

function issue1() {
  return {
    source_hostname: "zoso-Precision-Tower-7810",
    replay_sequence: 1,
    replay_generation: 1,
    replay_event_count: 1,
    replay_tip_event_sha256: sha("c"),
    replay_high_water_sha256: sha("d"),
    replay_journal_sha256: sha("e"),
    replay_pending: true,
    replay_pending_challenge_sha256: sha("f"),
    replay_pending_challenge_id: challenge("1"),
    replay_pending_expires_at_ms: 39_000,
    replay_last_terminal_state: null,
    replay_ready_for_issue: false,
  };
}

function consumed1() {
  return {
    source_hostname: "zoso-Precision-Tower-7810",
    replay_sequence: 2,
    replay_generation: 1,
    replay_event_count: 2,
    replay_tip_event_sha256: sha("2"),
    replay_high_water_sha256: sha("3"),
    replay_journal_sha256: sha("4"),
    replay_pending: false,
    replay_pending_challenge_sha256: null,
    replay_pending_challenge_id: null,
    replay_pending_expires_at_ms: null,
    replay_last_terminal_state: "consumed",
    replay_ready_for_issue: true,
  };
}

function issue2() {
  return {
    source_hostname: "zoso-Precision-Tower-7810",
    replay_sequence: 3,
    replay_generation: 2,
    replay_event_count: 3,
    replay_tip_event_sha256: sha("5"),
    replay_high_water_sha256: sha("6"),
    replay_journal_sha256: sha("7"),
    replay_pending: true,
    replay_pending_challenge_sha256: sha("8"),
    replay_pending_challenge_id: challenge("9"),
    replay_pending_expires_at_ms: 79_000,
    replay_last_terminal_state: "consumed",
    replay_ready_for_issue: false,
  };
}

const empty =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorV1("");
assert.equal(empty.ok, true);
if (!empty.ok) throw new Error("empty anchor held");
assert.equal(empty.status, "empty");
assert.equal(empty.anchor_sequence, 0);
assert.equal(empty.event_count, 0);
assert.equal(empty.replay_sequence, null);

const g =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
    anchor_journal_jsonl: "",
    projection: genesis(),
  });
assert.equal(g.ok, true);
if (!g.ok) throw new Error("genesis anchor held");
assert.equal(g.status, "anchor_append_planned");
assert.equal(g.anchor_sequence, 1);
assert.equal(g.replay_sequence, 0);
assert.equal(g.event.anchor_sequence, 1);
assert.equal(g.event.previous_event_sha256, null);

const i1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
    anchor_journal_jsonl: g.next_anchor_journal_jsonl,
    projection: issue1(),
  });
assert.equal(i1.ok, true);
if (!i1.ok) throw new Error("issue anchor held");
assert.equal(i1.anchor_sequence, 2);
assert.equal(i1.replay_sequence, 1);
assert.equal(
  i1.event.previous_event_sha256,
  g.event.event_sha256,
);

const c1 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
    anchor_journal_jsonl: i1.next_anchor_journal_jsonl,
    projection: consumed1(),
  });
assert.equal(c1.ok, true);
if (!c1.ok) throw new Error("consume anchor held");
assert.equal(c1.anchor_sequence, 3);
assert.equal(c1.replay_sequence, 2);

const i2 =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
    anchor_journal_jsonl: c1.next_anchor_journal_jsonl,
    projection: issue2(),
  });
assert.equal(i2.ok, true);
if (!i2.ok) throw new Error("second issue anchor held");
assert.equal(i2.anchor_sequence, 4);
assert.equal(i2.replay_sequence, 3);

const state =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorV1(
    i2.next_anchor_journal_jsonl,
  );
assert.equal(state.ok, true);
if (!state.ok) throw new Error("anchored journal held");
assert.equal(state.status, "anchored");
assert.equal(state.anchor_sequence, 4);
assert.equal(state.event_count, 4);
assert.equal(state.replay_sequence, 3);
assert.deepEqual(state.projection, issue2());

const idem =
  planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
    anchor_journal_jsonl: i2.next_anchor_journal_jsonl,
    projection: issue2(),
  });
assert.equal(idem.ok, true);
if (!idem.ok) throw new Error("idempotence held");
assert.equal(idem.status, "already_anchored");
assert.equal(idem.operation_performed, false);
assert.equal(
  idem.next_anchor_journal_jsonl,
  i2.next_anchor_journal_jsonl,
);

{
  const divergent = {
    ...issue2(),
    replay_high_water_sha256: sha("0"),
  };
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: i2.next_anchor_journal_jsonl,
      projection: divergent,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("same-sequence divergence green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_same_sequence_divergence",
  );
}

{
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: i2.next_anchor_journal_jsonl,
      projection: consumed1(),
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("rewind green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_replay_rewind",
  );
}

{
  const gap = {
    ...issue2(),
    replay_sequence: 5,
    replay_event_count: 5,
    replay_generation: 3,
    replay_tip_event_sha256: sha("a"),
    replay_high_water_sha256: sha("b"),
    replay_journal_sha256: sha("c"),
    replay_pending_challenge_sha256: sha("d"),
    replay_pending_challenge_id: challenge("e"),
  };
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: i2.next_anchor_journal_jsonl,
      projection: gap,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("gap green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_replay_gap",
  );
}

{
  const hostDrift = {
    ...issue2(),
    source_hostname: "other-host",
    replay_sequence: 4,
    replay_event_count: 4,
    replay_generation: 2,
    replay_pending: false,
    replay_pending_challenge_sha256: null,
    replay_pending_challenge_id: null,
    replay_pending_expires_at_ms: null,
    replay_last_terminal_state: "abandoned",
    replay_ready_for_issue: true,
    replay_tip_event_sha256: sha("a"),
    replay_high_water_sha256: sha("b"),
    replay_journal_sha256: sha("c"),
  };
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: i2.next_anchor_journal_jsonl,
      projection: hostDrift,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("host drift green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_source_host_drift",
  );
}

{
  const invalidIssue = {
    ...consumed1(),
    replay_sequence: 3,
    replay_event_count: 3,
    replay_generation: 2,
    replay_pending: false,
    replay_ready_for_issue: true,
    replay_tip_event_sha256: sha("5"),
    replay_high_water_sha256: sha("6"),
    replay_journal_sha256: sha("7"),
  };
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: c1.next_anchor_journal_jsonl,
      projection: invalidIssue,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("invalid issue transition green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_issue_transition_invalid",
  );
}

{
  const invalidTerminal = {
    ...issue1(),
    replay_sequence: 2,
    replay_event_count: 2,
    replay_generation: 2,
    replay_tip_event_sha256: sha("2"),
    replay_high_water_sha256: sha("3"),
    replay_journal_sha256: sha("4"),
  };
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: i1.next_anchor_journal_jsonl,
      projection: invalidTerminal,
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("invalid terminal transition green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_terminal_transition_invalid",
  );
}

{
  const noGenesis =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: "",
      projection: issue1(),
    });
  assert.equal(noGenesis.ok, false);
  if (noGenesis.ok) throw new Error("non-genesis first anchor green");
  assert.equal(
    noGenesis.reason,
    "witness_replay_external_anchor_genesis_required",
  );
}

{
  const parsed = JSON.parse(g.event_jsonl_line);
  parsed.event_sha256 = sha("f");
  const tampered = JSON.stringify(parsed) + "\n";
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorV1(
      tampered,
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("tampered digest green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_event_digest_invalid",
  );
}

{
  const parsed = JSON.parse(g.event_jsonl_line);
  const noncanonical = " " + JSON.stringify(parsed) + "\n";
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorV1(
      noncanonical,
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("noncanonical event green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_event_serialization_invalid",
  );
}

{
  const projection = genesis();
  let reads = 0;
  Object.defineProperty(projection, "replay_high_water_sha256", {
    enumerable: true,
    get() {
      reads += 1;
      return sha("a");
    },
  });
  const held =
    planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1({
      anchor_journal_jsonl: "",
      projection,
    });
  assert.equal(held.ok, false);
  assert.equal(reads, 0);
  if (held.ok) throw new Error("getter projection green");
  assert.equal(
    held.reason,
    "witness_replay_external_anchor_projection_shape_invalid",
  );
}

for (const key of [
  "canonical_replay_projection_binding_proven",
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
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "source_contract",
  "pure_anchor_state_machine",
  "append_only_hash_chain_semantics",
  "exact_replay_sequence_increment_required",
  "exact_issue_terminal_alternation_required",
  "source_hostname_stability_required",
  "replay_rewind_rejected",
  "replay_gap_rejected",
  "same_sequence_divergence_rejected",
  "canonical_event_serialization_required",
  "content_addressed_events",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1_GREEN",
);
console.log("explicit_genesis_anchor_required=true");
console.log("exact_replay_sequence_increment=true");
console.log("issue_terminal_alternation=true");
console.log("same_sequence_idempotence=true");
console.log("same_sequence_divergence_rejected=true");
console.log("replay_rewind_rejected=true");
console.log("replay_gap_rejected=true");
console.log("source_hostname_drift_rejected=true");
console.log("tampered_event_rejected=true");
console.log("canonical_event_serialization_required=true");
console.log("projection_getter_rejected_without_execution=true");
console.log("canonical_replay_projection_binding_proven=false");
console.log("live_anchor_storage_proven=false");
console.log("external_anchor_transport_authenticated=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
