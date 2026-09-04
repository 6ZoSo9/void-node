#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_DUAL_RAIL_ENV_V1,
  readBuyVoidDualRailServerPolicyContractV1,
} from "./lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs";
import {
  VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_BOUNDARY_V1,
  VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1,
  readBuyVoidDualRailAuthorityIsolatedPolicyV1,
  validateBuyVoidDualRailAuthorityIsolatedPolicyV1,
} from "./lib/void_buy_void_dual_rail_authority_isolation_v1.mjs";

const BASE_USDC = "0x1111111111111111111111111111111111111111";
const BASE_RECEIVE = "0x2222222222222222222222222222222222222222";
const ETH_USDC = "0x3333333333333333333333333333333333333333";
const ETH_RECEIVE = "0x4444444444444444444444444444444444444444";
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

function environment() {
  const base = VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base;
  const ethereum = VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum;
  return {
    [base.usdc_contract]: BASE_USDC,
    [base.receive_address]: BASE_RECEIVE,
    [base.rpc_identity]: "base-mainnet-rpc-policy-v1",
    [base.finality_adapter_id]: "base-finality-adapter-v1",
    [base.min_confirmations]: "12",
    [base.finalized_reference_block]: "1000",
    [ethereum.usdc_contract]: ETH_USDC,
    [ethereum.receive_address]: ETH_RECEIVE,
    [ethereum.rpc_identity]: "ethereum-mainnet-rpc-policy-v1",
    [ethereum.finality_adapter_id]: "ethereum-finality-adapter-v1",
    [ethereum.min_confirmations]: "24",
    [ethereum.finalized_reference_block]: "2000",
  };
}

function isolated(env = environment()) {
  const decision = readBuyVoidDualRailAuthorityIsolatedPolicyV1(env);
  assert.equal(decision.ok, true, JSON.stringify(decision));
  return decision;
}

function expectHold(env, reason) {
  const decision = readBuyVoidDualRailAuthorityIsolatedPolicyV1(env);
  assert.equal(decision.ok, false, JSON.stringify(decision));
  assert.equal(decision.status, "DUAL_RAIL_POLICY_HOLD");
  assert.equal(decision.reason, reason);
}

check("distinct rail authorities remain valid", () => {
  const decision = isolated();
  assert.equal(
    decision.isolation.marker,
    VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1,
  );
  assert.deepEqual(
    decision.isolation.boundary,
    VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_BOUNDARY_V1,
  );
  validateBuyVoidDualRailAuthorityIsolatedPolicyV1(decision.policy);
});

check("shared RPC identity fails closed", () => {
  const env = environment();
  env[VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.rpc_identity] =
    env[VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.rpc_identity];
  const lowerLevel = readBuyVoidDualRailServerPolicyContractV1(env);
  assert.equal(lowerLevel.ok, true);
  expectHold(env, "dual_rail_rpc_identity_collision");
});

check("shared finality-adapter identity fails closed", () => {
  const env = environment();
  env[VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.finality_adapter_id] =
    env[VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.finality_adapter_id];
  const lowerLevel = readBuyVoidDualRailServerPolicyContractV1(env);
  assert.equal(lowerLevel.ok, true);
  expectHold(env, "dual_rail_finality_adapter_collision");
});

check("supplied policy cannot collapse authority domains", () => {
  const policy = structuredClone(isolated().policy);
  policy.rails[1].rpc_identity = policy.rails[0].rpc_identity;
  policy.rails[1].finality.adapter_id =
    policy.rails[0].finality.adapter_id;
  assert.throws(
    () => validateBuyVoidDualRailAuthorityIsolatedPolicyV1(policy),
    /dual_rail_(rpc_identity|finality_adapter)_collision|policy_derived_fields_mismatch/,
  );
});

check("same receive address remains permitted", () => {
  const env = environment();
  env[VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.receive_address] =
    env[VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.receive_address];
  assert.equal(isolated(env).ok, true);
});

assert.equal(cases, 5);
console.log("VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1_GREEN");
console.log("base_ethereum_rpc_identity_distinct=true");
console.log("base_ethereum_finality_adapter_distinct=true");
console.log("collapsed_authority_domain_rejected=true");
console.log("same_receive_address_allowed=true");
console.log("runtime_rpc_signing_broadcast_money=false");
console.log(`cases=${cases}`);
