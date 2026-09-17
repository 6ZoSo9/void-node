#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1,
  VOID_BUY_VOID_DUAL_RAIL_ENV_V1,
  VOID_BUY_VOID_DUAL_RAIL_ORDER_V1,
  VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_SINGLE_CHAIN_ENV_V1,
  assertBuyVoidDualRailIsolationV1,
  canonicalBuyVoidPaymentIdentityV1,
  evaluateBuyVoidDualRailPaymentFinalityV1,
  readBuyVoidDualRailServerPolicyContractV1,
  validateBuyVoidDualRailServerPolicyObjectV1,
} from "./lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_PATH = resolve(
  ROOT,
  "fixtures/economic/buy-void-dual-rail-server-policy-v1.example.json",
);
const SCHEMA_PATH = resolve(
  ROOT,
  "schemas/buy-void-dual-rail-server-policy-v1.schema.json",
);
const DOC_PATH = resolve(
  ROOT,
  "docs/architecture/buy-void-dual-rail-server-policy-v1.md",
);
const WORKFLOW_PATH = resolve(
  ROOT,
  ".github/workflows/void-buy-void-dual-rail-server-policy-v1.yml",
);
const MODULE_PATH = resolve(
  ROOT,
  "scripts/lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs",
);
const PROOF_PATH = resolve(
  ROOT,
  "scripts/prove_void_buy_void_dual_rail_server_policy_contract_v1.mjs",
);

const BASE_USDC = "0x1111111111111111111111111111111111111111";
const BASE_RECEIVE = "0x2222222222222222222222222222222222222222";
const ETH_USDC = "0x3333333333333333333333333333333333333333";
const ETH_RECEIVE = "0x4444444444444444444444444444444444444444";
const BASE_TX = `0x${"a".repeat(64)}`;
const ETH_TX = `0x${"b".repeat(64)}`;
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

function validEnv() {
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

function configured(env = validEnv()) {
  const decision = readBuyVoidDualRailServerPolicyContractV1(env);
  assert.equal(decision.ok, true, JSON.stringify(decision));
  return decision.policy;
}

function expectHold(env, reason) {
  const decision = readBuyVoidDualRailServerPolicyContractV1(env);
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "DUAL_RAIL_POLICY_HOLD");
  assert.equal(decision.reason, reason);
  return decision;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseObservation(overrides = {}) {
  return {
    source_chain: "base",
    evm_chain_id: "8453",
    transaction_hash: BASE_TX,
    log_index: "7",
    receipt_block_number: "989",
    observed_finalized_reference_block: "1000",
    confirmations_observed: "12",
    finality_adapter_id: "base-finality-adapter-v1",
    ...overrides,
  };
}

function ethereumObservation(overrides = {}) {
  return {
    source_chain: "ethereum",
    evm_chain_id: "1",
    transaction_hash: ETH_TX,
    log_index: "9",
    receipt_block_number: "1977",
    observed_finalized_reference_block: "2000",
    confirmations_observed: "24",
    finality_adapter_id: "ethereum-finality-adapter-v1",
    ...overrides,
  };
}

check("happy policy", () => {
  const policy = configured();
  assert.deepEqual(
    policy.rails.map((rail) => rail.source_chain),
    ["base", "ethereum"],
  );
  assert.deepEqual(
    policy.rails.map((rail) => rail.evm_chain_id),
    ["8453", "1"],
  );
  assert.deepEqual(
    policy.economics,
    VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1,
  );
  assert.deepEqual(
    policy.authority,
    VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_AUTHORITY_V1,
  );
  assert.match(policy.policy_id, /^void-buy-void-dual-rail-policy-v1-[0-9a-f]{64}$/);
});

check("canonical rail order", () => {
  assert.deepEqual(VOID_BUY_VOID_DUAL_RAIL_ORDER_V1, ["base", "ethereum"]);
});

check("environment insertion order irrelevant", () => {
  const entries = Object.entries(validEnv()).reverse();
  const reversed = Object.fromEntries(entries);
  const left = configured(validEnv());
  const right = configured(reversed);
  assert.equal(
    left.fingerprints.combined_stable_sha256,
    right.fingerprints.combined_stable_sha256,
  );
  assert.equal(
    left.fingerprints.observation_sha256,
    right.fingerprints.observation_sha256,
  );
});

for (const legacyName of VOID_BUY_VOID_LEGACY_SINGLE_CHAIN_ENV_V1) {
  check(`legacy env rejected ${legacyName}`, () => {
    const decision = expectHold(
      { ...validEnv(), [legacyName]: "legacy-value" },
      "legacy_single_chain_configuration_present",
    );
    assert.deepEqual(decision.detail.legacy_env_names, [legacyName]);
  });
}

for (const group of Object.values(VOID_BUY_VOID_DUAL_RAIL_ENV_V1)) {
  for (const name of Object.values(group)) {
    check(`missing env rejected ${name}`, () => {
      const env = validEnv();
      delete env[name];
      const decision = expectHold(env, "dual_rail_configuration_incomplete");
      assert.ok(decision.missing_envs.includes(name));
    });
  }
}

for (const [name, value, reason] of [
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.usdc_contract,
    "0x1234",
    "base_invalid_usdc_contract",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.receive_address,
    "not-an-address",
    "base_invalid_receive_address",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.usdc_contract,
    "0xgggggggggggggggggggggggggggggggggggggggg",
    "ethereum_invalid_usdc_contract",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.receive_address,
    "",
    "dual_rail_configuration_incomplete",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.rpc_identity,
    "x",
    "base_invalid_rpc_identity",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.finality_adapter_id,
    "contains space",
    "base_invalid_finality_adapter_id",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.rpc_identity,
    "https://user:secret@example",
    "ethereum_invalid_rpc_identity",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.finality_adapter_id,
    "bad/id",
    "ethereum_invalid_finality_adapter_id",
  ],
]) {
  check(`invalid configuration ${name}`, () => {
    const env = { ...validEnv(), [name]: value };
    expectHold(env, reason);
  });
}

for (const [chain, name] of [
  ["base", VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.min_confirmations],
  ["ethereum", VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.min_confirmations],
]) {
  for (const bad of ["0", "01", "-1", "1.5", "1000001", "NaN"]) {
    check(`${chain} invalid minimum ${bad}`, () => {
      expectHold(
        { ...validEnv(), [name]: bad },
        `${chain}_invalid_min_confirmations`,
      );
    });
  }
}

for (const [chain, name] of [
  ["base", VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.finalized_reference_block],
  [
    "ethereum",
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.finalized_reference_block,
  ],
]) {
  for (const bad of ["00", "-1", "1.5", "not-a-block"]) {
    check(`${chain} invalid finalized reference ${bad}`, () => {
      expectHold(
        { ...validEnv(), [name]: bad },
        `${chain}_invalid_finalized_reference_block`,
      );
    });
  }
}

const stableChanges = [
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.usdc_contract, "0x5555555555555555555555555555555555555555"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.receive_address, "0x6666666666666666666666666666666666666666"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.rpc_identity, "base-mainnet-rpc-policy-v2"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.finality_adapter_id, "base-finality-adapter-v2"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.min_confirmations, "13"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.usdc_contract, "0x7777777777777777777777777777777777777777"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.receive_address, "0x8888888888888888888888888888888888888888"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.rpc_identity, "ethereum-mainnet-rpc-policy-v2"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.finality_adapter_id, "ethereum-finality-adapter-v2"],
  [VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.min_confirmations, "25"],
];

for (const [name, value] of stableChanges) {
  check(`stable fingerprint binds ${name}`, () => {
    const original = configured();
    const changed = configured({ ...validEnv(), [name]: value });
    assert.notEqual(
      changed.fingerprints.combined_stable_sha256,
      original.fingerprints.combined_stable_sha256,
    );
  });
}

for (const [name, value] of [
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.base.finalized_reference_block,
    "1001",
  ],
  [
    VOID_BUY_VOID_DUAL_RAIL_ENV_V1.ethereum.finalized_reference_block,
    "2001",
  ],
]) {
  check(`dynamic observation separated ${name}`, () => {
    const original = configured();
    const changed = configured({ ...validEnv(), [name]: value });
    assert.equal(
      changed.fingerprints.combined_stable_sha256,
      original.fingerprints.combined_stable_sha256,
    );
    assert.notEqual(
      changed.fingerprints.observation_sha256,
      original.fingerprints.observation_sha256,
    );
  });
}

check("public summary redacts authority values", () => {
  const policy = configured();
  const publicText = JSON.stringify(policy.public_summary);
  for (const secretLike of [
    BASE_USDC,
    BASE_RECEIVE,
    ETH_USDC,
    ETH_RECEIVE,
    "base-mainnet-rpc-policy-v1",
    "ethereum-mainnet-rpc-policy-v1",
  ]) {
    assert.equal(publicText.includes(secretLike), false);
  }
});

check("policy object validates", () => {
  assert.equal(validateBuyVoidDualRailServerPolicyObjectV1(configured()).version, 1);
});

for (const [name, mutate] of [
  ["policy unknown field", (p) => { p.extra = true; }],
  ["policy marker", (p) => { p.marker = "wrong"; }],
  ["policy version", (p) => { p.version = 2; }],
  ["policy id", (p) => { p.policy_id = "wrong"; }],
  ["swapped rails", (p) => { p.rails.reverse(); }],
  ["one rail", (p) => { p.rails.pop(); }],
  ["rail chain id", (p) => { p.rails[0].evm_chain_id = "1"; }],
  ["rail unknown field", (p) => { p.rails[0].extra = true; }],
  ["finality unknown field", (p) => { p.rails[0].finality.extra = true; }],
  ["economics changed", (p) => { p.economics.canonical_presale_max_void = "9999999"; }],
  ["authority elevated", (p) => { p.authority.wallet_access = true; }],
  ["stable fingerprint tampered", (p) => { p.fingerprints.combined_stable_sha256 = "0".repeat(64); }],
  ["observation fingerprint tampered", (p) => { p.fingerprints.observation_sha256 = "0".repeat(64); }],
  ["summary tampered", (p) => { p.public_summary.rate_void_per_usdc = "3"; }],
]) {
  check(name, () => {
    const policy = clone(configured());
    mutate(policy);
    assert.throws(() => validateBuyVoidDualRailServerPolicyObjectV1(policy));
  });
}

check("base finality admitted", () => {
  const decision = evaluateBuyVoidDualRailPaymentFinalityV1(
    configured(),
    baseObservation(),
  );
  assert.equal(decision.ok, true);
  assert.equal(
    decision.payment_identity,
    `voidpay1:base:${BASE_TX}:7`,
  );
  assert.equal(decision.fulfillment_authority_granted, false);
});

check("ethereum finality admitted", () => {
  const decision = evaluateBuyVoidDualRailPaymentFinalityV1(
    configured(),
    ethereumObservation(),
  );
  assert.equal(decision.ok, true);
  assert.equal(
    decision.payment_identity,
    `voidpay1:ethereum:${ETH_TX}:9`,
  );
});

check("eth alias canonicalized", () => {
  const decision = evaluateBuyVoidDualRailPaymentFinalityV1(
    configured(),
    ethereumObservation({ source_chain: "eth" }),
  );
  assert.equal(decision.ok, true);
  assert.match(decision.payment_identity, /^voidpay1:ethereum:/);
});

for (const [name, observation, reason] of [
  [
    "base wrong chain id",
    baseObservation({ evm_chain_id: "1" }),
    "payment_evm_chain_id_mismatch",
  ],
  [
    "ethereum wrong chain id",
    ethereumObservation({ evm_chain_id: "8453" }),
    "payment_evm_chain_id_mismatch",
  ],
  [
    "base wrong adapter",
    baseObservation({ finality_adapter_id: "ethereum-finality-adapter-v1" }),
    "payment_finality_adapter_mismatch",
  ],
  [
    "mixed observation generation",
    baseObservation({ observed_finalized_reference_block: "1001", confirmations_observed: "13" }),
    "payment_mixed_policy_observation_generation",
  ],
  [
    "receipt above final reference",
    baseObservation({ receipt_block_number: "1001", confirmations_observed: "0" }),
    "payment_receipt_not_within_finalized_reference",
  ],
  [
    "confirmation count mismatch",
    baseObservation({ confirmations_observed: "13" }),
    "payment_confirmation_count_mismatch",
  ],
  [
    "threshold not met",
    baseObservation({ receipt_block_number: "990", confirmations_observed: "11" }),
    "payment_finality_threshold_not_met",
  ],
  [
    "invalid transaction hash",
    baseObservation({ transaction_hash: "0x1234" }),
    "invalid_transaction_hash",
  ],
  [
    "invalid log index",
    baseObservation({ log_index: "4294967296" }),
    "invalid_log_index",
  ],
  [
    "invalid receipt block",
    baseObservation({ receipt_block_number: "01" }),
    "invalid_receipt_block_number",
  ],
  [
    "invalid confirmations",
    baseObservation({ confirmations_observed: "01" }),
    "invalid_confirmations_observed",
  ],
]) {
  check(name, () => {
    const decision = evaluateBuyVoidDualRailPaymentFinalityV1(
      configured(),
      observation,
    );
    assert.equal(decision.ok, false);
    assert.equal(decision.reason, reason);
  });
}

check("unknown observation field rejected", () => {
  assert.throws(() =>
    evaluateBuyVoidDualRailPaymentFinalityV1(
      configured(),
      { ...baseObservation(), extra: true },
    ),
  );
});

check("unadvertised chain rejected", () => {
  assert.throws(() =>
    evaluateBuyVoidDualRailPaymentFinalityV1(
      configured(),
      { ...baseObservation(), source_chain: "arbitrum" },
    ),
  );
});

check("payment identity base", () => {
  assert.equal(
    canonicalBuyVoidPaymentIdentityV1("base", BASE_TX, "0"),
    `voidpay1:base:${BASE_TX}:0`,
  );
});

check("payment identity eth alias", () => {
  assert.equal(
    canonicalBuyVoidPaymentIdentityV1("eth", ETH_TX, "1"),
    `voidpay1:ethereum:${ETH_TX}:1`,
  );
});

check("payment identity rejects unsupported rail", () => {
  assert.throws(() =>
    canonicalBuyVoidPaymentIdentityV1("polygon", BASE_TX, "0"),
  );
});

check("dual rail isolation accepted", () => {
  assert.equal(
    assertBuyVoidDualRailIsolationV1(
      baseObservation(),
      ethereumObservation(),
    ),
    true,
  );
});

check("dual rail isolation rejects same chain id", () => {
  assert.throws(() =>
    assertBuyVoidDualRailIsolationV1(
      baseObservation(),
      ethereumObservation({ evm_chain_id: "8453" }),
    ),
  );
});

check("dual rail isolation rejects shared adapter", () => {
  assert.throws(() =>
    assertBuyVoidDualRailIsolationV1(
      baseObservation(),
      ethereumObservation({ finality_adapter_id: "base-finality-adapter-v1" }),
    ),
  );
});

check("fixture exact policy validates", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  assert.equal(fixture.schema, "void_buy_void_dual_rail_server_policy_fixture_v1");
  validateBuyVoidDualRailServerPolicyObjectV1(fixture.policy);
  assert.deepEqual(fixture.policy, configured());
});

check("schema is closed draft 2020-12", () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, "https://voidchain.org/schemas/buy-void-dual-rail-server-policy-v1.schema.json");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required.sort(), ["policy", "schema"].sort());
  assert.equal(schema.properties.policy.additionalProperties, false);
  assert.equal(schema.properties.policy.properties.rails.minItems, 2);
  assert.equal(schema.properties.policy.properties.rails.maxItems, 2);
});

check("documentation binds critical doctrine", () => {
  const doc = readFileSync(DOC_PATH, "utf8");
  for (const marker of [
    "Base mainnet",
    "Ethereum mainnet",
    "DUAL_RAIL_POLICY_HOLD",
    "10,000,000 VOID",
    "2 VOID per 1 USDC",
    "legacy single-chain",
    "no source-chain RPC",
    "no signer",
    "Chain-2050",
  ]) {
    assert.match(doc, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

check("workflow exact topology", () => {
  const workflow = readFileSync(WORKFLOW_PATH, "utf8");
  for (const marker of [
    "runs-on: ubuntu-24.04",
    "node: [22, 24, 26]",
    "permissions:",
    "contents: read",
    "persist-credentials: false",
    "node --check scripts/lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs",
    "node scripts/prove_void_buy_void_dual_rail_server_policy_contract_v1.mjs",
    "git diff --check",
  ]) {
    assert.ok(workflow.includes(marker), marker);
  }
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
});

check("source provenance paths present", () => {
  for (const path of [
    MODULE_PATH,
    PROOF_PATH,
    SCHEMA_PATH,
    FIXTURE_PATH,
    DOC_PATH,
    WORKFLOW_PATH,
  ]) {
    assert.ok(readFileSync(path).length > 0, path);
  }
});

assert.ok(cases >= 100, `expected at least 100 cases, observed ${cases}`);
console.log("VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1_GREEN");
console.log("base_mainnet_usdc=true");
console.log("ethereum_mainnet_usdc=true");
console.log("complete_set_admission=true");
console.log("legacy_single_chain_migration_fail_closed=true");
console.log("cross_rail_substitution_rejected=true");
console.log("stable_and_observation_fingerprints_separated=true");
console.log("canonical_presale_max_void=10000000");
console.log("rate_void_per_usdc=2");
console.log("runtime_rpc_signing_broadcast_money=false");
console.log(`cases=${cases}`);
