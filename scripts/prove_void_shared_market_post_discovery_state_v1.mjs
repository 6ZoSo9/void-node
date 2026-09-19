import assert from "node:assert/strict";
import {
  APPROVED_MARKETS,
  OPENING_DISCOVERY_RECEIPT_SCHEMA,
  SHARED_MARKET_POST_DISCOVERY_SCHEMA,
  VOID_MARKET_ALLOCATION_ATOMS,
  admitPostDiscoveryMarketState,
  openingDiscoveryReceiptId,
} from "../tools/void-shared-market-post-discovery-state-v1.mjs";

const hash = (digit) => `sha256:${digit.repeat(64)}`;

function request(pair, quoteUnits) {
  const q = BigInt(quoteUnits);
  const g = (a, b) => {
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
  };
  const divisor = g(q, VOID_MARKET_ALLOCATION_ATOMS);
  const receipt = {
    schema: OPENING_DISCOVERY_RECEIPT_SCHEMA,
    receipt_id: hash("0"),
    pair,
    commitment_set_root: hash("a"),
    participant_commitment_count: 3,
    real_quote_reserve_units: q.toString(),
    locked_void_reserve_atoms: VOID_MARKET_ALLOCATION_ATOMS.toString(),
    clearing_price_quote_numerator: (q / divisor).toString(),
    clearing_price_void_atoms_denominator:
      (VOID_MARKET_ALLOCATION_ATOMS / divisor).toString(),
  };
  receipt.receipt_id = openingDiscoveryReceiptId(receipt);
  return {
    schema: SHARED_MARKET_POST_DISCOVERY_SCHEMA,
    pair,
    presale_closeout_id: hash("b"),
    opening_discovery: receipt,
  };
}

function rejects(candidate, code) {
  assert.throws(() => admitPostDiscoveryMarketState(candidate),
    (error) => error instanceof Error && error.message === code);
}

for (const [index, pair] of Object.keys(APPROVED_MARKETS).entries()) {
  const candidate = request(pair, (123_456_789n + BigInt(index)).toString());
  const first = admitPostDiscoveryMarketState(candidate);
  const second = admitPostDiscoveryMarketState(structuredClone(candidate));
  assert.deepEqual(second, first);
  assert.equal(first.phase, "post_discovery_closeout_hold");
  assert.equal(first.fixed_opening_price, false);
  assert.equal(first.participant_quote_reserves_required, true);
  assert.equal(first.presale_closeout_reference_bound, true);
  assert.equal(first.presale_closeout_authority_verified, false);
  assert.equal(first.presale_closed, false);
  assert.equal(first.separate_activation_gate_required, true);
  assert.equal(first.activation_authority, false);
  assert.equal(first.inventory_funding_authority, false);
  assert.equal(first.liquidity_provision_authority, false);
  assert.equal(first.transaction_authority, false);
}

rejects(request("USDC_VOID", "1"), "UNAPPROVED_MARKET");

{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_discovery.real_quote_reserve_units = "0";
  rejects(candidate, "INVALID_REAL_QUOTE_RESERVE");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_discovery.locked_void_reserve_atoms =
    (VOID_MARKET_ALLOCATION_ATOMS - 1n).toString();
  rejects(candidate, "VOID_ALLOCATION_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_discovery.clearing_price_quote_numerator = "3";
  rejects(candidate, "CLEARING_PRICE_RESERVE_RATIO_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "2");
  candidate.opening_discovery.clearing_price_quote_numerator = "2";
  candidate.opening_discovery.clearing_price_void_atoms_denominator =
    VOID_MARKET_ALLOCATION_ATOMS.toString();
  rejects(candidate, "NON_CANONICAL_CLEARING_PRICE");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_discovery.commitment_set_root = hash("c");
  rejects(candidate, "DISCOVERY_RECEIPT_DIGEST_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.pair = "ETH_VOID";
  rejects(candidate, "DISCOVERY_PAIR_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.presale_closeout_id = "local-closeout";
  rejects(candidate, "INVALID_PRESALE_CLOSEOUT_ID");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.activation = true;
  rejects(candidate, "INVALID_REQUEST_SHAPE");
}

console.log("VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V1_GREEN");
console.log("approved_markets=WC_VOID,BTC_VOID,ETH_VOID");
console.log("opening_price_source=participant_commitments");
console.log("post_discovery_phase=closeout_hold");
console.log("cases=12");
