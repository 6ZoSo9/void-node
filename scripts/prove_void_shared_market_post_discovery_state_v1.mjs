import assert from "node:assert/strict";
import {
  APPROVED_MARKETS,
  OPENING_COMMITMENT_ASSERTION_SCHEMA,
  OPENING_DISCOVERY_RECEIPT_SCHEMA,
  OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA,
  SHARED_MARKET_POST_DISCOVERY_SCHEMA,
  VOID_MARKET_ALLOCATION_ATOMS,
  admitPostDiscoveryMarketState,
  aggregateOpeningCommitmentAssertions,
  aggregateOpeningQuoteSettlementAssertions,
  inspectPostDiscoveryMarketAssertion,
  openingCommitmentAssertionId,
  openingDiscoveryReceiptId,
  openingQuoteSettlementAssertionId,
} from "../tools/void-shared-market-post-discovery-state-v1.mjs";

const hash = (digit) => `sha256:${digit.repeat(64)}`;

function request(pair, quoteUnits) {
  const q = BigInt(quoteUnits);
  const shares = q >= 3n ? [q - 2n, 1n, 1n] : [q];
  const commitments = shares.map((quote, index) => {
    const commitment = {
      schema: OPENING_COMMITMENT_ASSERTION_SCHEMA,
      commitment_id: hash("0"),
      pair,
      participant_id: hash(String(index + 1)),
      quote_units: quote.toString(),
    };
    commitment.commitment_id = openingCommitmentAssertionId(commitment);
    return commitment;
  });
  const aggregate = aggregateOpeningCommitmentAssertions(pair, commitments);
  const settlements = commitments.map((commitment, index) => {
    const settlement = {
      schema: OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA,
      settlement_id: hash("0"),
      pair,
      commitment_id: commitment.commitment_id,
      quote_units: commitment.quote_units,
      settlement_reference: hash(String(index + 4)),
    };
    settlement.settlement_id = openingQuoteSettlementAssertionId(settlement);
    return settlement;
  });
  aggregateOpeningQuoteSettlementAssertions(pair, commitments, settlements);
  const g = (a, b) => {
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
  };
  const divisor = g(q, VOID_MARKET_ALLOCATION_ATOMS);
  const receipt = {
    schema: OPENING_DISCOVERY_RECEIPT_SCHEMA,
    receipt_id: hash("0"),
    pair,
    commitment_set_root: aggregate.commitment_set_root,
    participant_commitment_count: aggregate.participant_commitment_count,
    real_quote_reserve_units: aggregate.claimed_quote_reserve_units,
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
    opening_commitments: commitments,
    opening_quote_settlements: settlements,
  };
}

function rejects(candidate, code) {
  assert.throws(() => admitPostDiscoveryMarketState(candidate),
    (error) => error instanceof Error && error.message === code);
}

for (const [index, pair] of Object.keys(APPROVED_MARKETS).entries()) {
  const candidate = request(pair, (123_456_789n + BigInt(index)).toString());
  const first = inspectPostDiscoveryMarketAssertion(candidate);
  const second = inspectPostDiscoveryMarketAssertion(structuredClone(candidate));
  assert.deepEqual(second, first);
  const reordered = structuredClone(candidate);
  reordered.opening_commitments.reverse();
  reordered.opening_quote_settlements.reverse();
  assert.deepEqual(inspectPostDiscoveryMarketAssertion(reordered), first);
  assert.equal(first.phase, "discovery_authority_hold");
  assert.equal(first.discovery_assertion_self_consistent, true);
  assert.equal(first.commitment_settlement_bijection_self_consistent, true);
  assert.equal(first.settlement_reference_reuse_rejected, true);
  assert.equal(first.quote_settlement_source_verified, false);
  assert.equal(first.participant_commitment_provenance_verified, false);
  assert.equal(first.quote_reserve_custody_verified, false);
  assert.equal(first.void_reserve_custody_verified, false);
  assert.equal(first.opening_price_source, "caller_supplied_unverified_assertion");
  assert.equal(first.opening_price_source_verified, false);
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
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[1] =
    structuredClone(candidate.opening_quote_settlements[0]);
  rejects(candidate, "DUPLICATE_OPENING_QUOTE_SETTLEMENT_ID");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[1].settlement_reference =
    candidate.opening_quote_settlements[0].settlement_reference;
  candidate.opening_quote_settlements[1].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[1]);
  rejects(candidate, "QUOTE_SETTLEMENT_REFERENCE_REUSED");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[1].commitment_id =
    candidate.opening_quote_settlements[0].commitment_id;
  candidate.opening_quote_settlements[1].quote_units =
    candidate.opening_quote_settlements[0].quote_units;
  candidate.opening_quote_settlements[1].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[1]);
  rejects(candidate, "DUPLICATE_SETTLEMENT_FOR_COMMITMENT");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].quote_units = "10";
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "SETTLEMENT_COMMITMENT_QUOTE_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements.pop();
  rejects(candidate, "MISSING_COMMITMENT_SETTLEMENT");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].commitment_id = hash("f");
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "UNKNOWN_SETTLED_COMMITMENT");
}

{
  const candidate = request("BTC_VOID", "1");
  candidate.pair = "USDC_VOID";
  rejects(candidate, "UNAPPROVED_MARKET");
}
rejects(request("BTC_VOID", "1"), "DISCOVERY_AUTHORITY_UNVERIFIED");

{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_discovery.real_quote_reserve_units = "0";
  rejects(candidate, "INVALID_REAL_QUOTE_RESERVE");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_commitments[0].quote_units = "10";
  rejects(candidate, "OPENING_COMMITMENT_DIGEST_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_commitments[1] =
    structuredClone(candidate.opening_commitments[0]);
  rejects(candidate, "DUPLICATE_OPENING_COMMITMENT_ID");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_discovery.participant_commitment_count = 4;
  candidate.opening_discovery.receipt_id =
    openingDiscoveryReceiptId(candidate.opening_discovery);
  rejects(candidate, "COMMITMENT_COUNT_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_discovery.real_quote_reserve_units = "12";
  candidate.opening_discovery.clearing_price_quote_numerator = "3";
  candidate.opening_discovery.clearing_price_void_atoms_denominator =
    "2500000000000";
  candidate.opening_discovery.receipt_id =
    openingDiscoveryReceiptId(candidate.opening_discovery);
  rejects(candidate, "COMMITMENT_QUOTE_SUM_MISMATCH");
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
console.log("opening_price_source=caller_supplied_unverified_assertion");
console.log("post_discovery_phase=discovery_authority_hold");
console.log("commitment_accounting=deterministic_sum_and_membership");
console.log("settlement_accounting=one_to_one_claimed_quote_conservation");
console.log("cases=23");
