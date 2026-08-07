#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";
import { Interface, Wallet, parseEther } from "ethers";
import {
  CANDIDATE_PACKET_MARKER,
  CHAIN_ID,
  MARKER,
  MIN_VALIDATOR_STAKE_VOID,
  MIN_VALIDATOR_STAKE_WEI,
  REGISTRY_ABI,
  buildCandidatePacketBody,
  canonicalJson,
  inspectNode,
  verifySignedCandidateTransaction,
} from "../tools/void-public-earn-validator-onboarding-v1.mjs";

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const registryInterface = new Interface(REGISTRY_ABI);
const FIXED_TIME = "2026-08-05T05:00:00.000Z";
const TEST_PRIVATE_KEY = `0x${"11".repeat(32)}`;
const wallet = new Wallet(TEST_PRIVATE_KEY);
const registry = "0x2222222222222222222222222222222222222222";
const nodeId = "33".repeat(16);
const registryPolicy = {
  code_sha256: "44".repeat(32),
  min_validator_stake_wei: parseEther("10000").toString(),
  min_validator_stake_void: "10000",
  max_active_validators: "256",
  activation_churn_limit: "4",
  authority: "0x5555555555555555555555555555555555555555",
  candidate_count: "0",
  waiting_count: "0",
  active_count: "0",
};

assert.equal(MARKER, "VOID_PUBLIC_EARN_VALIDATOR_ONBOARDING_V1");
assert.equal(CHAIN_ID, 2050n);
assert.equal(MIN_VALIDATOR_STAKE_VOID, 10_000n);
assert.equal(MIN_VALIDATOR_STAKE_WEI, parseEther("10000"));
assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":2}');

const packetInput = {
  chainId: CHAIN_ID,
  rpc: "http://127.0.0.1:8545",
  registry,
  registryPolicy,
  owner: wallet.address,
  reward: wallet.address,
  nodeId,
  nodeBase: "http://127.0.0.1:4100",
  publicEndpoint: "https://validator.example",
  p2pMultiaddr: "/dns4/validator.example/tcp/4700",
  observedAt: FIXED_TIME,
  ownerBalanceWei: MIN_VALIDATOR_STAKE_WEI,
  alreadyRegistered: false,
};
const packet = buildCandidatePacketBody(packetInput);
assert.deepEqual(buildCandidatePacketBody(packetInput), packet);
assert.equal(packet.marker, CANDIDATE_PACKET_MARKER);
assert.match(packet.packet_id, /^voidvcp1_[0-9a-f]{64}$/);
assert.equal(packet.chain_id, 2050);
assert.equal(packet.minimum_stake_void, "10000");
assert.equal(packet.minimum_stake_wei, MIN_VALIDATOR_STAKE_WEI.toString());
assert.equal(packet.stake_funding_ready, true);
assert.equal(packet.decision, "READY_FOR_PARTICIPANT_WALLET_SIGNATURE");
assert.equal(packet.metadata.candidate_only, true);
assert.equal(packet.metadata.automatic_waiting_transition, false);
assert.equal(packet.metadata.automatic_active_transition, false);
for (const key of [
  "private_key_requested",
  "wallet_file_requested",
  "transaction_signed",
  "transaction_broadcast",
  "moved_to_waiting",
  "validator_marked_active",
  "runtime_consensus_activated",
  "automatic_promotion",
]) {
  assert.equal(packet.authority_boundary[key], false, key);
}

const decoded = registryInterface.decodeFunctionData("registerCandidate", packet.unsigned_transaction.data);
assert.equal(String(decoded[0]).toLowerCase(), wallet.address.toLowerCase());
assert.equal(String(decoded[1]).toLowerCase(), packet.consensus_key_hash.toLowerCase());
assert.equal(String(decoded[2]).toLowerCase(), packet.metadata_hash.toLowerCase());
assert.equal(packet.unsigned_transaction.value_wei, MIN_VALIDATOR_STAKE_WEI.toString());

const underfunded = buildCandidatePacketBody({
  ...packetInput,
  ownerBalanceWei: parseEther("9999"),
});
assert.equal(underfunded.stake_funding_ready, false);
assert.equal(underfunded.decision, "HOLD_INSUFFICIENT_STAKE_BALANCE");
assert.throws(
  () => buildCandidatePacketBody({ ...packetInput, chainId: 1n }),
  /expected chain ID 2050/,
);
assert.throws(
  () => buildCandidatePacketBody({
    ...packetInput,
    registryPolicy: {
      ...registryPolicy,
      min_validator_stake_wei: parseEther("1000").toString(),
    },
  }),
  /candidate_registry_minimum_mismatch/,
);

const signed = await wallet.signTransaction({
  type: 2,
  chainId: CHAIN_ID,
  to: registry,
  value: MIN_VALIDATOR_STAKE_WEI,
  data: packet.unsigned_transaction.data,
  nonce: 0,
  gasLimit: 300000n,
  maxFeePerGas: 2n,
  maxPriorityFeePerGas: 1n,
});
const verified = verifySignedCandidateTransaction(signed, packet);
assert.equal(verified.sender.toLowerCase(), wallet.address.toLowerCase());
assert.equal(verified.registry.toLowerCase(), registry.toLowerCase());
assert.equal(verified.value_wei, MIN_VALIDATOR_STAKE_WEI.toString());
assert.equal(verified.register_candidate_call_verified, true);
assert.equal(verified.waiting_transition_included, false);
assert.equal(verified.active_transition_included, false);

const wrongValueSigned = await wallet.signTransaction({
  type: 2,
  chainId: CHAIN_ID,
  to: registry,
  value: parseEther("9999"),
  data: packet.unsigned_transaction.data,
  nonce: 1,
  gasLimit: 300000n,
  maxFeePerGas: 2n,
  maxPriorityFeePerGas: 1n,
});
assert.throws(
  () => verifySignedCandidateTransaction(wrongValueSigned, packet),
  /signed_transaction_value_mismatch/,
);

async function withNodeFixture({ gap = 0, txrootLive = 1, peerCount = 1 }, callback) {
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/health") {
      response.end(JSON.stringify({ ok: true, nodeId, http: 4100, p2p: 4700 }));
    } else if (request.url === "/__void/ready.json") {
      response.end(JSON.stringify({
        ready: gap === 0 && txrootLive === 1,
        head: 42,
        lastmile_seen: 42,
        gap,
        txroot_live: txrootLive,
        reasons: gap === 0 && txrootLive === 1 ? [] : ["fixture_not_ready"],
      }));
    } else if (request.url === "/p2p/peers") {
      response.end(JSON.stringify({
        connected: Array.from({ length: peerCount }, (_, index) => ({ id: `peer-${index}` })),
      }));
    } else if (request.url === "/blocks/latest/number2.json") {
      response.end(JSON.stringify({ number: 42 }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: "not_found" }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

await withNodeFixture({ peerCount: 2 }, async (base) => {
  const snapshot = await inspectNode(base, { expectedPeerCount: 1 });
  assert.equal(snapshot.health_contract_valid, true);
  assert.equal(snapshot.readiness_contract_valid, true);
  assert.equal(snapshot.latest_block_aligned, true);
  assert.equal(snapshot.peer_count, 2);
  assert.equal(snapshot.peer_visibility_valid, true);
  assert.equal(snapshot.observer_validation_ready, true);
  assert.equal(snapshot.consensus_validator_active, false);
  assert.equal(snapshot.consensus_validator_activation_attempted, false);
});
await withNodeFixture({ gap: 1 }, async (base) => {
  const snapshot = await inspectNode(base);
  assert.equal(snapshot.readiness_contract_valid, false);
  assert.equal(snapshot.observer_validation_ready, false);
});

const tool = read("tools/void-public-earn-validator-onboarding-v1.mjs");
for (const forbiddenOption of ["--private-key", "--mnemonic", "--seed-phrase", "--wallet-file"]) {
  assert.equal(tool.includes(forbiddenOption), false, `tool exposes forbidden option ${forbiddenOption}`);
}
for (const required of [
  "void_public_earn_no_node_client_v1.mjs",
  "wc-public-earning-participant-v1.sh",
  "candidate-submit-signed",
  "SUBMIT VOID VALIDATOR CANDIDATE",
  "automatic_waiting_transition: false",
  "automatic_active_transition: false",
]) {
  assert.ok(tool.includes(required), `tool missing ${required}`);
}

const participantWrapperPath = path.join(ROOT, "void-participant.sh");
const participantWrapper = read("void-participant.sh");
for (const required of [
  "run-void-node.sh\" prepare",
  "node-v24.18.0-linux-x64/bin/node",
  "22|24|26",
  "tools/void-public-earn-validator-onboarding-v1.mjs",
]) {
  assert.ok(participantWrapper.includes(required), `participant wrapper missing ${required}`);
}
assert.equal(participantWrapper.includes("node-v22.23.2"), false);
assert.notEqual(fs.statSync(participantWrapperPath).mode & 0o111, 0, "participant wrapper must be executable");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["participant:onboard"], "node tools/void-public-earn-validator-onboarding-v1.mjs");
assert.equal(packageJson.scripts["participant:onboard:proof"], "node scripts/prove_public_earn_validator_onboarding_v1.mjs");
assert.equal(packageJson.engines.node, "^22.0.0 || ^24.0.0 || ^26.0.0");

const envExample = read(".env.example");
for (const name of [
  "VOID_PARTICIPANT_ACCOUNT=",
  "VOID_PUBLIC_EARN_COORDINATOR_BASE=",
  "VOID_PUBLIC_EARN_COORDINATOR_NODE_ID=",
  "VOID_CHAIN_RPC=",
  "VOID_VALIDATOR_CANDIDATE_REGISTRY=",
  "VOID_VALIDATOR_OWNER=",
]) {
  assert.ok(envExample.includes(name), `.env.example missing ${name}`);
}

const mainnetPolicy = read("docs/mainnet0/VALIDATOR_POLICY.md");
assert.ok(mainnetPolicy.includes("Minimum validator self-stake: **10,000 VOID**"));
assert.ok(mainnetPolicy.includes("Candidate registration does not automatically move a candidate to Waiting or Active"));
const candidateContract = read("contracts/mainnet0/VoidValidatorCandidateRegistry.sol");
for (const required of [
  "if (msg.value < minValidatorStake) revert StakeTooLow();",
  "state: ValidatorState.Candidate",
  "function moveToWaiting(address candidateOwner) external onlyOwner",
]) {
  assert.ok(candidateContract.includes(required), `candidate contract missing ${required}`);
}
assert.match(
  candidateContract,
  /function\s+markActiveBatch\s*\(\s*address\[\]\s+calldata\s+owners\s*\)\s+external\s+onlyOwner/,
  "candidate contract missing markActiveBatch(address[] calldata owners) external onlyOwner",
);

const workflow = read(".github/workflows/public-earn-validator-onboarding-v1.yml");
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "node: [22, 24, 26]",
  "node-version: ${{ matrix.node }}",
  "npm run participant:onboard:proof",
  "npm run typecheck",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);

console.log(JSON.stringify({
  marker: MARKER,
  chain_id: Number(CHAIN_ID),
  supported_node_majors: [22, 24, 26],
  default_node_major: 24,
  minimum_validator_stake_void: MIN_VALIDATOR_STAKE_VOID.toString(),
  strict_observer_contract_verified: true,
  unsigned_candidate_packet_verified: true,
  participant_signed_transaction_verification: true,
  earning_clients_reused: true,
  automatic_waiting_transition: false,
  automatic_active_transition: false,
  private_key_input_supported: false,
  live_transaction_broadcast: false,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
