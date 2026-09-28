#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  OPENING_COMMITMENT_ASSERTION_SCHEMA,
  VOID_MARKET_ALLOCATION_ATOMS as LEGACY_V1_VOID_MARKET_ALLOCATION_ATOMS,
} from "../tools/void-shared-market-post-discovery-state-v1.mjs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_SHARED_MARKET_EXECUTION_BINDING_V2,
  VOID_SHARED_MARKET_POST_DISCOVERY_AUTHORITY_V2,
  VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2,
  reconcileSharedMarketPostDiscoveryStateV2,
} from "../tools/void-shared-market-post-discovery-state-v2.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("a");

function commitment(participantDigit, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: hash("0"),
    coupled_launch_id: launchId,
    participant_id: hash(participantDigit),
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function debit(commitmentValue, amount, tsMs) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitmentValue.account,
    amount,
    delta: -amount,
    ts_ms: tsMs,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: hash("0"),
    commitment_id: commitmentValue.commitment_id,
    coupled_launch_id: launchId,
    pair: "WC_VOID",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    market_meta: {
      adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only: true,
      fixed_price: false,
      protocol_wc_seed_units: "0",
    },
  };
  value.settlement_id = wcVoidOpeningSettlementIdV1(value);
  return value;
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const first = commitment("1", "wc-opening-alpha", "250");
const second = commitment("2", "wc-opening-beta", "750");
const firstDebit = debit(first, 250, 1790344000001);
const secondDebit = debit(second, 750, 1790344000002);

const state = reconcileSharedMarketPostDiscoveryStateV2({
  coupled_launch_id: launchId,
  commitments: [first, second],
  ledger_debits: [secondDebit, firstDebit],
});

assert.equal(
  state.marker,
  VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2,
);
assert.match(state.reconciliation_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(state.chain_id, 2050);
assert.equal(state.network_identity, "mainnet0");
assert.equal(state.execution_epoch, 2);
assert.equal(
  state.void_token,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(state.void_token_decimals, 18);
assert.deepEqual(
  VOID_SHARED_MARKET_EXECUTION_BINDING_V2,
  {
    chain_id: 2050,
    network_identity: "mainnet0",
    execution_epoch: 2,
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    void_token_decimals: 18,
  },
);

assert.equal(
  state.total_planned_void_inventory_atoms,
  "30000000000000000000000000",
);
assert.equal(
  state.wc_opening_participant_allocated_void_atoms,
  "5000000000000000000000000",
);
assert.equal(
  state.wc_post_opening_retained_void_reserve_atoms,
  "5000000000000000000000000",
);
assert.equal(
  state.unopened_post_presale_planned_void_inventory_atoms,
  "20000000000000000000000000",
);
assert.equal(
  state.modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms,
  "25000000000000000000000000",
);

assert.equal(state.market_models.WC_VOID.phase, "coupled_presale_opening");
assert.equal(
  state.market_models.WC_VOID.launch_reference_kind,
  "coupled_launch_id",
);
assert.equal(state.market_models.WC_VOID.launch_reference_id, launchId);
assert.equal(
  state.market_models.WC_VOID.total_planned_void_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  state.market_models.WC_VOID.opening_participant_tranche_void_atoms,
  "5000000000000000000000000",
);
assert.equal(
  state.market_models.WC_VOID.post_opening_retained_void_reserve_atoms,
  "5000000000000000000000000",
);
assert.equal(
  state.market_models.WC_VOID.opening_participant_allocated_void_atoms,
  "5000000000000000000000000",
);
assert.equal(state.market_models.WC_VOID.protocol_quote_seed_units, "0");
assert.equal(state.market_models.WC_VOID.settled_quote_reserve_units, "1000");
assert.match(
  state.market_models.WC_VOID.opening_state_id,
  /^sha256:[0-9a-f]{64}$/,
);

for (const pair of ["BTC_VOID", "ETH_VOID"]) {
  assert.equal(state.market_models[pair].phase, "post_presale_unopened");
  assert.equal(
    state.market_models[pair].launch_reference_kind,
    "presale_closeout_required_before_opening",
  );
  assert.equal(state.market_models[pair].launch_reference_id, null);
  assert.equal(
    state.market_models[pair].total_planned_void_inventory_atoms,
    "10000000000000000000000000",
  );
  assert.equal(
    state.market_models[pair].opening_participant_tranche_void_atoms,
    "0",
  );
  assert.equal(
    state.market_models[pair].post_opening_retained_void_reserve_atoms,
    "0",
  );
  assert.equal(state.market_models[pair].market_opening_ready, false);
}

assert.equal(state.shared_post_discovery_model_reconciled, true);
assert.equal(state.legacy_v1_status, "historical_not_production_authority");
assert.equal(state.legacy_v1_six_decimal_void_atoms_authoritative, false);
assert.equal(state.all_markets_share_one_presale_closeout, false);
assert.equal(state.wc_void_uses_coupled_launch_id, true);
assert.equal(state.btc_void_remains_post_presale, true);
assert.equal(state.eth_void_remains_post_presale, true);
assert.equal(state.wc_void_5m_participant_tranche_5m_retained_reserve, true);
assert.equal(state.exact_30m_planned_inventory_conservation, true);
assert.equal(state.quote_reserve_custody_verified, false);
assert.equal(state.void_reserve_custody_verified, false);
assert.equal(state.market_activation_authority, false);
assert.equal(state.public_presale_activation_authority, false);
assert.equal(state.inventory_funding_authority, false);
assert.equal(state.funds_movement_authority, false);

assert.equal(OPENING_COMMITMENT_ASSERTION_SCHEMA,
  "void.one-sided-opening-commitment-assertion.v1");
assert.equal(
  LEGACY_V1_VOID_MARKET_ALLOCATION_ATOMS,
  10_000_000n * 1_000_000n,
);
assert.notEqual(
  LEGACY_V1_VOID_MARKET_ALLOCATION_ATOMS.toString(),
  state.market_models.WC_VOID.total_planned_void_inventory_atoms,
);

for (const [key, value] of Object.entries(
  VOID_SHARED_MARKET_POST_DISCOVERY_AUTHORITY_V2,
)) {
  assert.equal(
    key === "source_only" || key === "model_reconciliation_only"
      ? value
      : !value,
    true,
    key,
  );
}

{
  const bad = {
    coupled_launch_id: launchId,
    commitments: [first, second],
    ledger_debits: [firstDebit, secondDebit],
    activation: true,
  };
  rejects(
    () => reconcileSharedMarketPostDiscoveryStateV2(bad),
    "INVALID_SHARED_MARKET_POST_DISCOVERY_V2_REQUEST_SHAPE",
  );
}

{
  const badDebit = structuredClone(firstDebit);
  badDebit.coupled_launch_id = hash("b");
  badDebit.settlement_id = wcVoidOpeningSettlementIdV1(badDebit);
  rejects(
    () => reconcileSharedMarketPostDiscoveryStateV2({
      coupled_launch_id: launchId,
      commitments: [first, second],
      ledger_debits: [badDebit, secondDebit],
    }),
    "WC_VOID_OPENING_SETTLEMENT_LAUNCH_MISMATCH",
  );
}

const source = fs.readFileSync(
  "tools/void-shared-market-post-discovery-state-v2.mjs",
  "utf8",
);
assert.doesNotMatch(source, /appendFileSync|writeFileSync|renameSync/);
assert.doesNotMatch(
  source,
  /mnemonic|PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|new\s+Wallet\s*\(|fromPhrase\s*\(|fromMnemonic\s*\(/i,
);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/i);
assert.doesNotMatch(source, /100\s*WC\s*=\s*1\s*VOID/i);
assert.match(source, /void_token_decimals: 18/);
assert.match(source, /coupled_presale_opening/);
assert.match(source, /post_presale_unopened/);

console.log("VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2_GREEN");
console.log(`shared_post_discovery_reconciliation_id=${state.reconciliation_id}`);
console.log(`shared_post_discovery_opening_state_id=${state.wc_opening_state_id}`);
console.log("shared_post_discovery_model_reconciled=true");
console.log("void_token_decimals=18");
console.log("wc_void_total_planned_void=10000000");
console.log("wc_void_opening_participant_tranche_void=5000000");
console.log("wc_void_post_opening_retained_reserve_void=5000000");
console.log("btc_void_phase=post_presale_unopened");
console.log("eth_void_phase=post_presale_unopened");
console.log("all_markets_share_one_presale_closeout=false");
console.log("legacy_v1_six_decimal_void_atoms_authoritative=false");
console.log("market_activation=false");
console.log("funds_movement=false");
