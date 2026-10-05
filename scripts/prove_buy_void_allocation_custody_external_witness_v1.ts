import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1,
  classifyBuyVoidAllocationCustodyExternalWitnessV1,
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1,
  planBuyVoidAllocationCustodyExternalWitnessAdvanceV1,
} from "../src/economic/buy_void_allocation_custody_external_witness_v1.js";

const GENESIS_EVENT_SHA =
  "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654";
const GENESIS_WITNESS_SHA =
  "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a";

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
assert.equal(
  "sha256:" +
    crypto.createHash("sha256").update(genesis).digest("hex"),
  GENESIS_WITNESS_SHA,
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

{
  const parsed =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      genesis,
    );
  assert.equal(parsed.event_count, 1);
  assert.equal(parsed.tip.event_sha256, GENESIS_EVENT_SHA);
  assert.equal(parsed.witness_sha256, GENESIS_WITNESS_SHA);
}

{
  const matched =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: genesis,
      current_state: current,
    });
  assert.equal(matched.ok, true);
  assert.equal(matched.status, "matched");
  assert.equal(matched.exact_live_match, true);
  assert.equal(matched.production_gate_ready, false);
  assert.equal(matched.independent_custody_proven, false);
}

{
  const conflict =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: genesis,
      current_state: {
        ...current,
        high_water_sha256: "sha256:" + "f".repeat(64),
      },
    });
  assert.equal(conflict.ok, false);
  assert.equal(
    conflict.reason,
    "allocation_custody_witness_same_epoch_conflict",
  );
}

const advancedCurrent = {
  ...current,
  allocation_tip_sha256: "sha256:" + "3".repeat(64),
  high_water_bytes: 430,
  high_water_sha256: "sha256:" + "2".repeat(64),
  ledger_bytes: 300,
  ledger_sha256: "sha256:" + "1".repeat(64),
  record_count: 1,
  remaining_void: "9999999",
  reserved_void_total: "1",
};

{
  const ahead =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: genesis,
      current_state: advancedCurrent,
    });
  assert.equal(ahead.ok, false);
  assert.equal(
    ahead.reason,
    "allocation_custody_witness_update_required",
  );
}

let advancedJournal: Buffer;
{
  const planned =
    planBuyVoidAllocationCustodyExternalWitnessAdvanceV1({
      witness_jsonl: genesis,
      current_state: advancedCurrent,
    });
  assert.equal(planned.ok, true);
  assert.equal(planned.status, "planned");
  assert.equal(planned.operation_performed, false);
  assert.equal(planned.next_event?.sequence, 2);
  assert.equal(
    planned.next_event?.previous_event_sha256,
    GENESIS_EVENT_SHA,
  );
  advancedJournal = Buffer.from(planned.next_witness_jsonl);
  const parsed =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
      advancedJournal,
    );
  assert.equal(parsed.event_count, 2);
  assert.equal(parsed.tip.record_count, 1);
}

{
  const rolledBack =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: advancedJournal!,
      current_state: current,
    });
  assert.equal(rolledBack.ok, false);
  assert.equal(
    rolledBack.reason,
    "allocation_custody_witness_local_rollback_detected",
  );
  assert.equal(rolledBack.rollback_regression_detected, true);
}

{
  const exactAdvanced =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: advancedJournal!,
      current_state: advancedCurrent,
    });
  assert.equal(exactAdvanced.ok, true);
  assert.equal(exactAdvanced.status, "matched");
}

{
  const idempotent =
    planBuyVoidAllocationCustodyExternalWitnessAdvanceV1({
      witness_jsonl: genesis,
      current_state: current,
    });
  assert.equal(idempotent.ok, true);
  assert.equal(idempotent.status, "idempotent");
  assert.equal(idempotent.next_event, null);
}

{
  const jump =
    planBuyVoidAllocationCustodyExternalWitnessAdvanceV1({
      witness_jsonl: genesis,
      current_state: {
        ...advancedCurrent,
        record_count: 2,
      },
    });
  assert.equal(jump.ok, false);
  assert.equal(
    jump.reason,
    "allocation_custody_witness_advance_invalid",
  );
}

{
  const truncated =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: genesis.subarray(0, genesis.length - 1),
      current_state: current,
    });
  assert.equal(truncated.ok, false);
  assert.equal(
    truncated.reason,
    "allocation_custody_witness_bytes_invalid",
  );
}

{
  const tampered = Buffer.from(genesis);
  const needle = Buffer.from('"remaining_void":"10000000"', "utf8");
  const at = tampered.indexOf(needle);
  assert.ok(at >= 0);
  tampered[at + Buffer.from('"remaining_void":"', "utf8").length] =
    "9".charCodeAt(0);
  const bad =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: tampered,
      current_state: current,
    });
  assert.equal(bad.ok, false);
  assert.equal(
    bad.reason,
    "allocation_custody_witness_event_hash_mismatch",
  );
}

{
  const planned =
    planBuyVoidAllocationCustodyExternalWitnessAdvanceV1({
      witness_jsonl: genesis,
      current_state: advancedCurrent,
    });
  assert.equal(planned.ok, true);
  if (planned.ok !== true || planned.next_event === null) {
    throw new Error("planned_event_missing");
  }
  const drifted = {
    ...planned.next_event,
    witness_root_disk_serial: "different-disk",
  };
  const driftedBytes = Buffer.concat([
    genesis,
    Buffer.from(JSON.stringify(drifted) + "\n", "utf8"),
  ]);
  const held =
    classifyBuyVoidAllocationCustodyExternalWitnessV1({
      witness_jsonl: driftedBytes,
      current_state: advancedCurrent,
    });
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "allocation_custody_witness_event_hash_mismatch",
  );
}

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_contract",
    "pure_validation",
    "exact_event_shape",
    "canonical_event_hash",
    "append_only_hash_chain",
    "exact_single_record_advance",
    "same_epoch_conflict_rejection",
    "rollback_regression_detection",
    "unanchored_local_advance_hold",
    "source_host_invariant_binding",
    "witness_host_invariant_binding",
    "inventory_monotonicity",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1_PROOF_GREEN",
);
console.log("live_genesis_fixture_bound=true");
console.log("genesis_event_sha256=" + GENESIS_EVENT_SHA);
console.log("genesis_witness_sha256=" + GENESIS_WITNESS_SHA);
console.log("exact_live_match=true");
console.log("same_epoch_conflict_rejected=true");
console.log("unanchored_local_advance_hold=true");
console.log("rollback_regression_detected=true");
console.log("truncated_witness_rejected=true");
console.log("tampered_witness_rejected=true");
console.log("exact_single_record_advance=true");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
