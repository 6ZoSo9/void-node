#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
  createDatanetChainCommitmentV1,
  planDatanetChainPeerReconstructionV1,
} from "./lib/void_datanet_chain_peer_reconstruction_v1.mjs";

const PAYLOAD = Buffer.from(
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_CONTROL\n",
  "utf8",
);
const CONTENT_SHA256 = createHash("sha256").update(PAYLOAD).digest("hex");
let cases = 0;

function check(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function commitment() {
  return createDatanetChainCommitmentV1({
    chain_id: "2050",
    object_id: "datanet-object-control-v1",
    content_sha256: CONTENT_SHA256,
    byte_length: String(PAYLOAD.length),
    checkpoint_height: "1951058",
    checkpoint_block_hash: `0x${"a".repeat(64)}`,
    accepted_checkpoint_id: "mainnet0-accepted-checkpoint-v1",
    commitment_transaction_hash: `0x${"b".repeat(64)}`,
    commitment_log_index: "7",
  });
}

function absentLocal() {
  return {
    present: false,
    object_id: null,
    commitment_id: null,
    payload: null,
  };
}

function exactPeer(peerId) {
  const current = commitment();
  return {
    peer_id: peerId,
    authenticated: true,
    accepts_repair: false,
    object_id: current.object_id,
    commitment_id: current.commitment_id,
    retrieval_generation: `${peerId}-retrieval-v1`,
    payload: PAYLOAD,
  };
}

function emptyRepairPeer(peerId) {
  return {
    peer_id: peerId,
    authenticated: true,
    accepts_repair: true,
    object_id: null,
    commitment_id: null,
    retrieval_generation: `${peerId}-retrieval-v1`,
    payload: null,
  };
}

function plan(peers) {
  const decision = planDatanetChainPeerReconstructionV1({
    commitment: commitment(),
    local: absentLocal(),
    peers,
    policy: { ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1 },
  });
  assert.equal(decision.ok, true, JSON.stringify(decision));
  return decision;
}

check("reconstructed local copy counts before remote repair", () => {
  const decision = plan([
    exactPeer("peer-source"),
    emptyRepairPeer("peer-repair"),
  ]);
  assert.equal(decision.valid_replica_count, 1);
  assert.equal(decision.missing_replica_count, 2);
  assert.equal(decision.planned_local_reconstruction_replica_count, 1);
  assert.equal(decision.projected_replica_count_after_local_reconstruction, 2);
  assert.equal(decision.remote_repair_replica_count_required, 1);
  assert.deepEqual(decision.repair_recipients, ["peer-repair"]);
  assert.equal(decision.projected_replica_count_after_plan, 3);
  assert.equal(decision.repair_capacity_shortfall, 0);
});

check("local reconstruction prevents false double repair", () => {
  const decision = plan([
    exactPeer("peer-source"),
    emptyRepairPeer("peer-repair-b"),
    emptyRepairPeer("peer-repair-a"),
  ]);
  assert.equal(decision.remote_repair_replica_count_required, 1);
  assert.deepEqual(decision.repair_recipients, ["peer-repair-a"]);
  assert.equal(decision.projected_replica_count_after_plan, 3);
  assert.equal(decision.repair_capacity_shortfall, 0);
});

check("one exact source leaves one real capacity shortfall", () => {
  const decision = plan([exactPeer("peer-source")]);
  assert.equal(decision.valid_replica_count, 1);
  assert.equal(decision.planned_local_reconstruction_replica_count, 1);
  assert.equal(decision.remote_repair_replica_count_required, 1);
  assert.deepEqual(decision.repair_recipients, []);
  assert.equal(decision.projected_replica_count_after_plan, 2);
  assert.equal(decision.repair_capacity_shortfall, 1);
});

check("two exact peers plus reconstructed local copy meet target", () => {
  const decision = plan([
    exactPeer("peer-alpha"),
    exactPeer("peer-bravo"),
  ]);
  assert.equal(decision.valid_replica_count, 2);
  assert.equal(decision.planned_local_reconstruction_replica_count, 1);
  assert.equal(decision.projected_replica_count_after_local_reconstruction, 3);
  assert.equal(decision.remote_repair_replica_count_required, 0);
  assert.deepEqual(decision.repair_recipients, []);
  assert.equal(decision.projected_replica_count_after_plan, 3);
  assert.equal(decision.repair_capacity_shortfall, 0);
});

assert.equal(cases, 4);
console.log(
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_REPLICA_ACCOUNTING_V1_GREEN",
);
console.log("local_reconstruction_counted_before_remote_repair=true");
console.log("false_double_repair_prevented=true");
console.log("repair_capacity_shortfall_exact=true");
console.log("repair_execution_authority=false");
console.log(`cases=${cases}`);
