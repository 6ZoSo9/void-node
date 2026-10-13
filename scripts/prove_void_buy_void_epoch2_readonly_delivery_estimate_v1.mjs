#!/usr/bin/env node
// Inert regression: uses reviewed E2 genesis bytecode and synthetic RPC values.
// No HTTP calls, wallet operations, signing or broadcasting.
import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Interface } from "ethers";
import {
  VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1,
  buildBuyVoidEpoch2ReadOnlyEstimateV1,
  classifyBuyVoidEpoch2ReadOnlyEstimateV1,
  rpcReadWithTransportV1,
} from "../tools/void-buy-void-epoch2-readonly-delivery-estimate-v1.mjs";
import {
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
  buyVoidPresaleRequiredAccessListV1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";

const source = JSON.parse(fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  "utf8",
));
const epoch2 = source.accounts.find(
  x => x.label === "VoidEpoch2PresaleFulfillmentV1",
);
const token = source.accounts.find(x => x.label === "VoidEpoch2TokenV1");
assert.ok(epoch2?.runtime_code_hex);
assert.ok(token?.runtime_code_hex);
const priceAtoms = 2n * 10n ** 18n;
const paymentId = "0x" + "e".repeat(64);
const probe = buildBuyVoidEpoch2ReadOnlyEstimateV1(paymentId);
assert.equal(VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1,
  "VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1");
assert.equal(probe.rpc_url, VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1);
assert.equal(probe.transaction.type, "0x2");
assert.equal(probe.transaction.chainId, "0x802");
assert.equal(probe.transaction.to, VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1);
assert.equal(probe.transaction.from, VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1);
assert.deepEqual(probe.transaction.accessList,
  buyVoidPresaleRequiredAccessListV1(VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1));
assert.equal(probe.transaction.maxFeePerGas, "0x0");
assert.equal(probe.transaction.maxPriorityFeePerGas, "0x0");
assert.equal(probe.transaction.value, "0x0");
const decoded = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]).decodeFunctionData("fulfill", probe.transaction.data);
assert.equal(decoded[0], paymentId);
assert.equal(decoded[1].toLowerCase(),
  "0x000000000000000000000000000000000000dead");
assert.equal(decoded[2], priceAtoms);
assert.equal(probe.signer_authorized_by_probe, false);
assert.equal(probe.transaction_broadcast, false);

assert.throws(() => buildBuyVoidEpoch2ReadOnlyEstimateV1("0x0"));
assert.throws(() => buildBuyVoidEpoch2ReadOnlyEstimateV1(
  "0x" + "0".repeat(64),
));

const word = v => "0x" + BigInt(v).toString(16).padStart(64, "0");
const valid = Object.freeze({
  chain: "0x802",
  genesis: { hash:
    "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d" },
  accepted_block: {
    number: "0xf0e",
    hash: "0x67e0ceaeee70c966271d37ebda1b07ee8d33c9b16bf4016a0d9eaefc3126c942",
  },
  block_before: "0x16f4e",
  block_after: "0x16f50",
  peers: "0x2",
  validators: [
    "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    "0x02f967953386188397b992c208239d3a25180db6",
    "0x461bf06270d9d28962f7570182c061b828799b66",
  ],
  validators_after: [
    "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    "0x02f967953386188397b992c208239d3a25180db6",
    "0x461bf06270d9d28962f7570182c061b828799b66",
  ],
  presale_code: epoch2.runtime_code_hex,
  token_code: token.runtime_code_hex,
  token_presale_balance: word(10_000_000n * 10n ** 18n),
  total_fulfilled: word(0),
  total_supply: word(333_333_333n * 10n ** 18n),
  estimate_gas: "0x249f0",
});
const green = classifyBuyVoidEpoch2ReadOnlyEstimateV1(valid);
assert.equal(green.ok, true, JSON.stringify(green));
assert.equal(green.gas_estimate, (0x249f0).toString());
assert.equal(green.gas_limit_multiplier_bps, "15000");
assert.equal(green.computed_gas_limit, "225000");
assert.equal(green.max_computed_gas_limit, "320000");
assert.equal(green.accepted_history_block, "3854");
assert.equal(green.accepted_history_hash,
  "0x67e0ceaeee70c966271d37ebda1b07ee8d33c9b16bf4016a0d9eaefc3126c942");
assert.equal(green.exact_reviewed_validator_roster, true);
assert.equal(green.initial_and_final_pinned_roster_verified, true);
assert.equal(green.blocks_produced_in_window, "2");
assert.equal(green.observation_window_ms, "12000");
const reviewedProductionCandidate = JSON.parse(fs.readFileSync(
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
  "utf8",
));
assert.equal(
  reviewedProductionCandidate.candidate_configuration
    .VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS,
  green.gas_limit_multiplier_bps,
);
assert.equal(
  reviewedProductionCandidate.candidate_configuration
    .VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT,
  green.max_computed_gas_limit,
);
const rawBoundaryGreen = classifyBuyVoidEpoch2ReadOnlyEstimateV1({
  ...valid, estimate_gas: "0x" + (213333n).toString(16),
});
assert.equal(rawBoundaryGreen.ok, true, JSON.stringify(rawBoundaryGreen));
assert.equal(rawBoundaryGreen.computed_gas_limit, "320000");
assert.equal(green.presale_balance_atoms, "10000000000000000000000000");
assert.equal(green.presale_fulfilled_atoms, "0");
assert.equal(green.transaction_broadcast, false);
assert.equal(green.wallet_access, false);
assert.equal(green.credential_access, false);
assert.equal(green.signing_performed, false);
assert.equal(green.presale_activation, false);

function fails(name, patch, expected) {
  const result = classifyBuyVoidEpoch2ReadOnlyEstimateV1({
    ...valid, ...patch,
  });
  assert.equal(result.ok, false, name);
  assert.equal(result.status, "HOLD", name);
  assert.equal(result.reason, expected, name);
  assert.equal(result.transaction_broadcast, false, name);
  assert.equal(result.presale_activation, false, name);
}
fails("wrong_chain", { chain: "0x1" }, "epoch2_chain_identity_invalid");
fails("wrong_genesis", { genesis: {hash:"0x" + "0".repeat(64)} },
  "epoch2_chain_identity_invalid");
fails("missing_accepted_block", { accepted_block: undefined },
  "epoch2_accepted_history_mismatch");
fails("different_accepted_block_hash", {
  accepted_block: { number: "0xf0e", hash: "0x" + "0".repeat(64) },
}, "epoch2_accepted_history_mismatch");
fails("wrong_accepted_block_number", {
  accepted_block: {
    number: "0xf0f",
    hash: "0x67e0ceaeee70c966271d37ebda1b07ee8d33c9b16bf4016a0d9eaefc3126c942",
  },
}, "epoch2_accepted_history_mismatch");
fails("presale_code", { presale_code:"0x" },
  "epoch2_contract_code_mismatch");
fails("token_code", { token_code:"0x" },
  "epoch2_contract_code_mismatch");
fails("under_quorum", { peers:"0x1" },
  "epoch2_quorum_or_history_not_qualified");
fails("missing_validator_roster", { validators: undefined },
  "epoch2_validator_roster_mismatch");
fails("unknown_validator_in_three_member_roster", {
  validators: [
    ...valid.validators.slice(0, 2),
    "0x" + "d".repeat(40),
  ],
}, "epoch2_validator_roster_mismatch");
fails("duplicate_validator_in_three_member_roster", {
  validators: [
    ...valid.validators.slice(0, 2),
    valid.validators[0],
  ],
}, "epoch2_validator_roster_mismatch");
fails("short_validator_roster", {
  validators: valid.validators.slice(0, 2),
}, "epoch2_validator_roster_mismatch");
fails("missing_final_validator_roster", {
  validators_after: undefined,
}, "epoch2_validator_roster_mismatch");
fails("final_validator_roster_drift_despite_progress", {
  validators_after: [
    ...valid.validators_after.slice(0, 2),
    "0x" + "d".repeat(40),
  ],
}, "epoch2_validator_roster_mismatch");
fails("duplicate_final_validator_roster", {
  validators_after: [
    ...valid.validators_after.slice(0, 2),
    valid.validators_after[1],
  ],
}, "epoch2_validator_roster_mismatch");
fails("malformed_final_validator_roster", {
  validators_after: ["not-an-address"],
}, "epoch2_validator_roster_mismatch");
fails("history_rollback", { block_after:"0x16f4d" },
  "epoch2_quorum_or_history_not_qualified");
fails("stalled_two_peer_quorum", { block_after:valid.block_before },
  "epoch2_quorum_or_history_not_qualified");
fails("wrong_inventory", { token_presale_balance:word(0) },
  "epoch2_inventory_or_supply_invalid");
fails("mismatched_fulfilled_counter", { total_fulfilled:word(1) },
  "epoch2_inventory_or_supply_invalid");
fails("wrong_supply", { total_supply:word(666666666n * 10n**18n) },
  "epoch2_inventory_or_supply_invalid");
fails("malformed_storage", { token_presale_balance:"0x1" },
  "epoch2_rpc_evidence_malformed");
fails("nonpositive_gas", { estimate_gas:"0x0" },
  "epoch2_computed_gas_limit_outside_reviewed_ceiling");
fails("raw_boundary_one_over", {
  estimate_gas: "0x" + (213334n).toString(16),
}, "epoch2_computed_gas_limit_outside_reviewed_ceiling");
fails("raw_300000_under_320000_but_multiplier_450000", {
  estimate_gas: "0x" + (300000n).toString(16),
}, "epoch2_computed_gas_limit_outside_reviewed_ceiling");
fails("gas_over_ceiling", { estimate_gas:"0x4e201" },
  "epoch2_computed_gas_limit_outside_reviewed_ceiling");
fails("malformed_gas", { estimate_gas:"0x0002" },
  "epoch2_rpc_evidence_malformed");

// Request factory mocks the Node HTTP transport using inert EventEmitters.
// No listener, external network, wallet or signer is exercised. The synthetic
// stream delivers short data chunks below the socket-inactivity limit but
// never finishes: only a total-operation deadline is able to abort it.
function inertRpcFactory({ trickle = false } = {}) {
  let active = 0;
  let destroyed = 0;
  let intervals = 0;
  const factory = (options, onResponse) => {
    assert.equal(options.hostname, "127.0.0.1");
    assert.equal(options.port, 18553);
    assert.equal(options.method, "POST");
    assert.equal(options.timeout, 6000);
    const req = new EventEmitter();
    let interval = null;
    let closed = false;
    req.destroy = () => {
      if (closed) return;
      closed = true;
      destroyed += 1;
      if (interval !== null) {
        clearInterval(interval);
        intervals -= 1;
      }
      active -= 1;
      req.emit("error", new Error("synthetic_request_destroyed"));
    };
    req.end = body => {
      const parsed = JSON.parse(body.toString("utf8"));
      assert.equal(parsed.method, "eth_chainId");
      active += 1;
      const response = new EventEmitter();
      response.statusCode = 200;
      response.headers = { "content-type": "application/json" };
      response.resume = () => {};
      response.destroy = () => req.destroy();
      queueMicrotask(() => {
        if (closed) return;
        onResponse(response);
        if (trickle) {
          intervals += 1;
          interval = setInterval(() => {
            if (!closed) response.emit("data", Buffer.from(" "));
          }, 15);
        } else {
          response.emit("data", Buffer.from(JSON.stringify({
            jsonrpc: "2.0", id: parsed.id, result: "0x802",
          })));
          response.emit("end");
          active -= 1;
          closed = true;
        }
      });
    };
    return req;
  };
  return { factory, counts: () => ({ active, destroyed, intervals }) };
}

const quick = inertRpcFactory();
assert.equal(
  await rpcReadWithTransportV1("eth_chainId", [], quick.factory, 120),
  "0x802",
);
assert.equal(quick.counts().active, 0);
const slow = inertRpcFactory({ trickle: true });
await assert.rejects(
  rpcReadWithTransportV1("eth_chainId", [], slow.factory, 95),
  /rpc_total_deadline_exceeded/u,
  "slow data trickle cannot extend the absolute read-only RPC deadline",
);
assert.deepEqual(slow.counts(), {
  active: 0, destroyed: 1, intervals: 0,
});
await assert.rejects(
  rpcReadWithTransportV1(
    "eth_sendRawTransaction", ["0xdead"], slow.factory, 95,
  ),
  /rpc_method_not_read_only/u,
);
assert.deepEqual(slow.counts(), {
  active: 0, destroyed: 1, intervals: 0,
});

console.log("VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1_PROOF_GREEN");
console.log("canonical_rpc_genesis_and_accepted_block_3854_bound=true");
console.log("synthetic_two_void_fulfill_calldata_proven=true");
console.log("epoch2_marker_included_and_zero_fee=true");
console.log("real_epoch2_contract_bytecode_fixture_proven=true");
console.log("wrong_chain_inventory_contract_gas_and_quorum_hold=true");
console.log("unknown_or_duplicate_epoch2_validator_roster_holds=true");
console.log("initial_and_final_epoch2_rosters_bound_to_pinned_heads=true");
console.log("slow_trickle_absolute_rpc_deadline_holds=true");
console.log("absolute_timeout_clears_transport_and_interval=true");
console.log("gas_limit_multiplier_bps=15000");
console.log("raw_estimate_213333_computed_320000_green=true");
console.log("raw_estimate_213334_computed_320001_hold=true");
console.log("connected_stalled_quorum_not_reported_green=true");
console.log("http_rpc_called=false");
console.log("signer_or_credential_access=false");
console.log("transaction_sign_or_broadcast=false");
console.log("presale_activation=false");
