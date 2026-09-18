#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
  createDatanetChainCommitmentV1 as rawCreate,
  planDatanetChainPeerReconstructionV1 as rawEvaluate,
} from "./lib/void_datanet_chain_peer_reconstruction_v1.mjs";


// Serialize only proof-owned fixtures. Untrusted objects go directly to raw APIs.
function fixtureJson(value) {
  if (Buffer.isBuffer(value)) return JSON.stringify(value.toString("base64"));
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(fixtureJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${fixtureJson(value[k])}`).join(",")}}`;
}
const wire = value => Buffer.from(fixtureJson(value), "utf8");
const createDatanetChainCommitmentV1 = value => rawCreate(wire(value));
const planDatanetChainPeerReconstructionV1 = value => rawEvaluate(wire(value));

const PAYLOAD = Buffer.from(
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_CONTROL\n",
  "utf8",
);
const CONTENT_SHA256 = createHash("sha256").update(PAYLOAD).digest("hex");
let cases = 0;
const caseNames = [];
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === "--case-manifest"));

function check(name, fn) {
  try {
    fn();
    cases += 1;
    caseNames.push(name);
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
  assert.equal(decision.ok, false, JSON.stringify(decision));
  assert.equal(decision.status, "DATANET_RECONSTRUCTION_HOLD");
  assert.equal(decision.repair_execution_authority_granted, false);
  assert.equal(decision.verified_independent_replica_count, 0);
  assert.equal(decision.reference_plan.evaluated, true);
  return decision.reference_plan;
}

check("reconstructed local copy counts before remote repair", () => {
  const decision = plan([
    exactPeer("peer-source"),
    emptyRepairPeer("peer-repair"),
  ]);
  assert.equal(decision.reference_copy_count, 1);
  assert.equal(decision.missing_reference_copies, 2);
  assert.equal(decision.hypothetical_local_copy_count, 1);
  assert.equal(decision.projected_reference_copies_after_local, 2);
  assert.equal(decision.remote_reference_copies_requested, 1);
  assert.deepEqual(decision.candidate_repair_recipients, ["peer-repair"]);
  assert.equal(decision.projected_reference_copies_after_plan, 3);
  assert.equal(decision.reference_repair_shortfall, 0);
});

check("local reconstruction prevents false double repair", () => {
  const decision = plan([
    exactPeer("peer-source"),
    emptyRepairPeer("peer-repair-b"),
    emptyRepairPeer("peer-repair-a"),
  ]);
  assert.equal(decision.remote_reference_copies_requested, 1);
  assert.deepEqual(decision.candidate_repair_recipients, ["peer-repair-a"]);
  assert.equal(decision.projected_reference_copies_after_plan, 3);
  assert.equal(decision.reference_repair_shortfall, 0);
});

check("one exact source leaves one real capacity shortfall", () => {
  const decision = plan([exactPeer("peer-source")]);
  assert.equal(decision.reference_copy_count, 1);
  assert.equal(decision.hypothetical_local_copy_count, 1);
  assert.equal(decision.remote_reference_copies_requested, 1);
  assert.deepEqual(decision.candidate_repair_recipients, []);
  assert.equal(decision.projected_reference_copies_after_plan, 2);
  assert.equal(decision.reference_repair_shortfall, 1);
});

check("two exact peers plus reconstructed local copy meet target", () => {
  const decision = plan([
    exactPeer("peer-alpha"),
    exactPeer("peer-bravo"),
  ]);
  assert.equal(decision.reference_copy_count, 2);
  assert.equal(decision.hypothetical_local_copy_count, 1);
  assert.equal(decision.projected_reference_copies_after_local, 3);
  assert.equal(decision.remote_reference_copies_requested, 0);
  assert.deepEqual(decision.candidate_repair_recipients, []);
  assert.equal(decision.projected_reference_copies_after_plan, 3);
  assert.equal(decision.reference_repair_shortfall, 0);
});

assert.equal(cases, 4);
console.log(
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_REPLICA_ACCOUNTING_V1_GREEN",
);
console.log("local_reconstruction_counted_before_remote_repair=true");
console.log("false_double_repair_prevented=true");
console.log("reference_repair_shortfall_exact=true");
console.log("repair_execution_authority=false");
console.log(`cases=${cases}`);
if (process.argv[2] === "--case-manifest") {
  console.log("case_manifest_json=" + JSON.stringify({
    schema: "VOID_DATANET_CASE_MANIFEST_V1", suite: "accounting", case_names: caseNames,
  }));
}
