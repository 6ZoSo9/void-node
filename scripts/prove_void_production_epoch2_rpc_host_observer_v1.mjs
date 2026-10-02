#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  EXPECTED_VALIDATORS_V1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1,
  buildVoidProductionEpoch2RpcHostObservationV1,
  testOnlyExerciseVoidProductionEpoch2RpcOutputParentReplacementV1,
} from "../tools/void-production-epoch2-rpc-host-observer-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedCandidateFixtureV1,
} from "./fixtures/void-datanet-registry-unsigned-candidate-fixture-v1.mjs";

function bytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}
function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const fixture = await buildVoidDatanetRegistryUnsignedCandidateFixtureV1();
const planBytes = bytes(fixture.activationPlan);
const receiptBytes = bytes(fixture.activationReceipt);
const precision = fixture.activationPlan.install_receipts.find(
  (row) => row.role === "precision",
);
assert.ok(precision);

function validInput() {
  return {
    activation_plan_bytes: Buffer.from(planBytes),
    activation_plan_file_sha256: sha(planBytes),
    activation_receipt_bytes: Buffer.from(receiptBytes),
    activation_receipt_file_sha256: sha(receiptBytes),
    source_binding: {
      branch: "main",
      head: "a".repeat(40),
      tree: "b".repeat(40),
      canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
      remote_main_sha: "a".repeat(40),
      canonical_main_live_match: true,
    },
    host_observation: {
      hostname: "zoso-Precision-Tower-7810",
      service_unit: "void-economic-epoch2-qbft-validator-v1.service",
      fragment_path: precision.unit_install_path,
      fragment_file_sha256: precision.systemd_unit_sha256,
      active_state: "active",
      sub_state: "running",
      main_pid: "4242",
      invocation_id: "1".repeat(32),
      drop_in_paths: "",
      listener_address: "127.0.0.1",
      listener_port: 18553,
      listener_present: true,
      canonical_main_stable_during_observation: true,
      service_invocation_stable_during_observation: true,
      listener_stable_during_observation: true,
      activation_source_lineage_ancestor_current_main: true,
      rpc: {
        url: "http://127.0.0.1:18553/",
        chain_id_hex: "0x802",
        chain_id: 2050,
        execution_epoch: 2,
        genesis_block_number: "0",
        genesis_block_hash:
          "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d",
        genesis_state_root:
          "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
        head_block_number: "50",
        head_block_hash: "0x" + "2".repeat(64),
        head_state_root: "0x" + "3".repeat(64),
        peer_count: 2,
        validators: [...EXPECTED_VALIDATORS_V1],
      },
      observed_at_utc: "2030-01-01T00:06:00.000Z",
    },
  };
}

const observation =
  buildVoidProductionEpoch2RpcHostObservationV1(validInput());
assert.equal(observation.marker, VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1);
assert.equal(
  observation.status,
  "PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_ACCEPTED",
);
assert.match(observation.observation_id, /^voidpe2rpcobs1_[0-9a-f]{64}$/u);
assert.equal(observation.rpc.url, "http://127.0.0.1:18553/");
assert.equal(observation.rpc.peer_count, 2);
assert.deepEqual(observation.rpc.validators, [...EXPECTED_VALIDATORS_V1].sort());
assert.equal(
  observation.write_capability_classification,
  "write_capable_not_authorized",
);
assert.equal(observation.independent_host_acceptance, true);
assert.equal(observation.target_descriptor_promotion_authorized, false);
assert.equal(observation.canonical_main_stable_during_observation, true);
assert.equal(observation.service.invocation_stable_during_observation, true);
assert.equal(observation.service.listener_stable_during_observation, true);
assert.equal(
  observation.activation_lineage.source_lineage_ancestor_current_main,
  true,
);
assert.equal(observation.authority.activation_source_ancestry_required, true);
assert.equal(observation.authority.private_output_parent_fd_bound, true);
assert.equal(observation.authority.private_output_redirect_forbidden, true);
assert.deepEqual(
  observation.authority,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1,
);

function rejected(mutator, pattern) {
  const input = validInput();
  mutator(input);
  assert.throws(
    () => buildVoidProductionEpoch2RpcHostObservationV1(input),
    pattern,
  );
}

rejected(
  (v) => { v.host_observation.fragment_file_sha256 = "0".repeat(64); },
  /UNIT_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.drop_in_paths = "/tmp/override.conf"; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.listener_port = 18552; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.rpc.chain_id_hex = "0x801"; },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.rpc.peer_count = 1; },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.rpc.validators[0] = "0x" + "f".repeat(40); },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => {
    v.host_observation.rpc.genesis_block_hash = "0x" + "0".repeat(64);
  },
  /RPC_IDENTITY_MISMATCH/u,
);
rejected(
  (v) => { v.host_observation.rpc.head_block_number = "0"; },
  /HEAD_BELOW_ACTIVATION_FLOOR/u,
);
rejected(
  (v) => { v.source_binding.remote_main_sha = "c".repeat(40); },
  /SOURCE_OR_HOST_INVALID/u,
);
rejected(
  (v) => { v.host_observation.service_invocation_stable_during_observation = false; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.activation_source_lineage_ancestor_current_main = false; },
  /SERVICE_OR_LISTENER_INVALID/u,
);
rejected(
  (v) => { v.host_observation.observed_at_utc = "2029-12-31T23:59:59.000Z"; },
  /TIME_INVALID/u,
);

{
  const input = validInput();
  const receipt = JSON.parse(input.activation_receipt_bytes.toString("utf8"));
  receipt.observations.after_xiphos_peer_count += 1;
  input.activation_receipt_bytes = bytes(receipt);
  input.activation_receipt_file_sha256 = sha(input.activation_receipt_bytes);
  assert.throws(
    () => buildVoidProductionEpoch2RpcHostObservationV1(input),
    /ACTIVATION_RECEIPT_REBUILD_MISMATCH/u,
  );
}

const parentRace =
  testOnlyExerciseVoidProductionEpoch2RpcOutputParentReplacementV1();
assert.match(
  String(parentRace.reason || ""),
  /OUTPUT_PARENT_CHANGED_DURING_WRITE/u,
);
assert.equal(parentRace.replacement_output_exists, false);
assert.equal(parentRace.original_output_exists, false);

const source = fs.readFileSync(
  "tools/void-production-epoch2-rpc-host-observer-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_sendTransaction",
  '"--user", "start"',
  '"--user", "restart"',
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  '"eth_chainId"',
  '"eth_blockNumber"',
  '"eth_getBlockByNumber"',
  '"net_peerCount"',
  '"qbft_getValidatorsByBlockNumber"',
  '"--user", "show"',
  '"sport = :18553"',
  '"merge-base", "--is-ancestor"',
  '"/proc/self/fd/"',
  '"O_DIRECTORY"',
]) {
  assert.ok(source.includes(required), required);
}

console.log("VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1_PROOF_GREEN");
console.log("activation_receipt_rederived=true");
console.log("canonical_main_live_match_required=true");
console.log("exact_installed_unit_sha_required=true");
console.log("dropins_forbidden=true");
console.log("precision_18553_listener_required=true");
console.log("chain2050_exact=true");
console.log("genesis_identity_exact=true");
console.log("validator_set_exact=true");
console.log("peer_count_minimum_two=true");
console.log("head_at_or_above_activation_floor=true");
console.log("canonical_main_stable_during_observation=true");
console.log("service_invocation_stable_during_observation=true");
console.log("listener_stable_during_observation=true");
console.log("activation_source_lineage_ancestor_current_main=true");
console.log("activation_lineage_git_ancestry_execution_present=true");
console.log("private_output_parent_fd_bound=true");
console.log("private_output_redirect_forbidden=true");
console.log("write_capability_classification=write_capable_not_authorized");
console.log("independent_host_acceptance=true");
console.log("target_descriptor_promotion_authorized=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
