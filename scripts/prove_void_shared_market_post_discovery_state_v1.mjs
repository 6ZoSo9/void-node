import assert from "node:assert/strict";
import {
  APPROVED_MARKETS,
  OPENING_COMMITMENT_ASSERTION_SCHEMA,
  OPENING_DISCOVERY_RECEIPT_SCHEMA,
  OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA,
  OPENING_QUOTE_SETTLEMENT_ADAPTER_QUERY_SCHEMA,
  OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_SCHEMA,
  SETTLEMENT_SOURCE_REQUIREMENTS,
  SETTLEMENT_SOURCE_ADAPTER_CONFIGURATION,
  SHARED_MARKET_POST_DISCOVERY_SCHEMA,
  VOID_MARKET_ALLOCATION_ATOMS,
  admitSharedPostDiscoveryMarketPortfolioState,
  admitPostDiscoveryMarketState,
  admitOpeningQuoteSettlementAdapterResponses,
  aggregateOpeningCommitmentAssertions,
  aggregateOpeningQuoteSettlementAssertions,
  buildOpeningQuoteSettlementAdapterQueries,
  inspectPostDiscoveryMarketAssertion,
  inspectOpeningQuoteSettlementAdapterConfiguration,
  inspectSharedPostDiscoveryMarketPortfolioAssertions,
  openingCommitmentAssertionId,
  openingDiscoveryReceiptId,
  openingQuoteSettlementAssertionId,
  openingQuoteSettlementSourceEventId,
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
  const settlementReferenceDigits = {
    WC_VOID: ["4", "5", "6"],
    BTC_VOID: ["7", "8", "9"],
    ETH_VOID: ["a", "b", "c"],
  }[pair];
  const settlements = commitments.map((commitment, index) => {
    const settlement = {
      schema: OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA,
      settlement_id: hash("0"),
      settlement_source_event_id: hash("0"),
      pair,
      quote_asset: APPROVED_MARKETS[pair].quote_asset,
      source_domain: SETTLEMENT_SOURCE_REQUIREMENTS[pair].source_domain,
      quote_asset_form: SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_asset_form,
      quote_unit: SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_unit,
      quote_decimals: SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_decimals,
      commitment_id: commitment.commitment_id,
      quote_units: commitment.quote_units,
      settlement_reference: hash(settlementReferenceDigits[index]),
    };
    settlement.settlement_source_event_id =
      openingQuoteSettlementSourceEventId(settlement);
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
    participant_quote_reserve_units: aggregate.claimed_quote_reserve_units,
    protocol_quote_seed_units: "0",
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

function portfolio() {
  return Object.keys(APPROVED_MARKETS).map((pair, index) =>
    request(pair, (123_456_789n + BigInt(index)).toString()));
}

function rejects(candidate, code) {
  assert.throws(() => admitPostDiscoveryMarketState(candidate),
    (error) => error instanceof Error && error.message === code);
}

function replaceWithThrowingGetter(object, key) {
  let touched = false;
  Object.defineProperty(object, key, {
    enumerable: true,
    get() {
      touched = true;
      throw new Error("UNTRUSTED_ACCESSOR_EXECUTED");
    },
  });
  return () => touched;
}

function replaceArrayIndexWithThrowingGetter(array, index = 0) {
  let touched = false;
  Object.defineProperty(array, String(index), {
    enumerable: true,
    get() {
      touched = true;
      throw new Error("UNTRUSTED_ARRAY_ACCESSOR_EXECUTED");
    },
  });
  return () => touched;
}

{
  const originalLocaleCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = function localeCompareForbidden() {
    throw new Error("LOCALE_DEPENDENT_ORDERING_EXECUTED");
  };
  try {
    const candidate = request("BTC_VOID", "11");
    const queries = buildOpeningQuoteSettlementAdapterQueries(
      candidate.pair,
      candidate.presale_closeout_id,
      candidate.opening_commitments,
      candidate.opening_quote_settlements,
    );
    assert.equal(queries.adapter_query_count, 3);
    const inspected = inspectSharedPostDiscoveryMarketPortfolioAssertions(
      portfolio().reverse(),
    );
    assert.deepEqual(inspected.approved_pairs,
      ["BTC_VOID", "ETH_VOID", "WC_VOID"]);
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
}

for (const inheritedPair of ["toString", "constructor", "__proto__"]) {
  assert.throws(
    () => inspectOpeningQuoteSettlementAdapterConfiguration(inheritedPair),
    (error) => error instanceof Error && error.message === "UNAPPROVED_MARKET",
  );
  assert.throws(
    () => aggregateOpeningCommitmentAssertions(inheritedPair, []),
    (error) => error instanceof Error && error.message === "UNAPPROVED_MARKET",
  );
  const candidate = request("BTC_VOID", "1");
  candidate.pair = inheritedPair;
  rejects(candidate, "UNAPPROVED_MARKET");
}

{
  const candidate = request("BTC_VOID", "1");
  const touched = replaceWithThrowingGetter(candidate, "schema");
  rejects(candidate, "INVALID_REQUEST_SHAPE");
  assert.equal(touched(), false);
}
{
  const candidate = request("BTC_VOID", "1");
  const touched = replaceWithThrowingGetter(
    candidate.opening_discovery,
    "schema",
  );
  rejects(candidate, "INVALID_DISCOVERY_RECEIPT_SHAPE");
  assert.equal(touched(), false);
}
{
  const candidate = request("BTC_VOID", "1");
  const touched = replaceWithThrowingGetter(
    candidate.opening_commitments[0],
    "schema",
  );
  rejects(candidate, "INVALID_OPENING_COMMITMENT_SHAPE");
  assert.equal(touched(), false);
}
{
  const candidate = request("BTC_VOID", "1");
  const touched = replaceWithThrowingGetter(
    candidate.opening_quote_settlements[0],
    "schema",
  );
  rejects(candidate, "INVALID_OPENING_QUOTE_SETTLEMENT_SHAPE");
  assert.equal(touched(), false);
}
{
  const candidate = request("BTC_VOID", "1");
  Object.setPrototypeOf(candidate, { inherited_authority: true });
  rejects(candidate, "INVALID_REQUEST_SHAPE");
}
{
  const candidate = request("BTC_VOID", "1");
  const touched = replaceArrayIndexWithThrowingGetter(
    candidate.opening_commitments,
  );
  rejects(candidate, "INVALID_OPENING_COMMITMENT_SET");
  assert.equal(touched(), false);
}
{
  const candidate = request("BTC_VOID", "1");
  const touched = replaceArrayIndexWithThrowingGetter(
    candidate.opening_quote_settlements,
  );
  rejects(candidate, "INVALID_OPENING_QUOTE_SETTLEMENT_SET");
  assert.equal(touched(), false);
}
{
  const candidates = portfolio();
  const touched = replaceArrayIndexWithThrowingGetter(candidates);
  assert.throws(
    () => inspectSharedPostDiscoveryMarketPortfolioAssertions(candidates),
    (error) => error instanceof Error &&
      error.message === "INVALID_SHARED_MARKET_PORTFOLIO_SIZE",
  );
  assert.equal(touched(), false);
}
{
  const candidate = request("BTC_VOID", "1");
  Object.setPrototypeOf(candidate.opening_commitments, {});
  rejects(candidate, "INVALID_OPENING_COMMITMENT_SET");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_commitments = new Array(1);
  rejects(candidate, "INVALID_OPENING_COMMITMENT_SET");
}
{
  const candidate = request("BTC_VOID", "1");
  candidate.opening_commitments[Symbol("extra")] = true;
  rejects(candidate, "INVALID_OPENING_COMMITMENT_SET");
}

function rehashSettlement(settlement) {
  settlement.settlement_source_event_id =
    openingQuoteSettlementSourceEventId(settlement);
  settlement.settlement_id = openingQuoteSettlementAssertionId(settlement);
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
  assert.equal(first.settlement_source_event_binding_self_consistent, true);
  assert.equal(first.settlement_source_event_reuse_rejected, true);
  assert.equal(first.claimed_quote_settlement_source_event_count,
    candidate.opening_quote_settlements.length);
  const queries = buildOpeningQuoteSettlementAdapterQueries(
    pair,
    candidate.presale_closeout_id,
    candidate.opening_commitments,
    candidate.opening_quote_settlements,
  );
  const reorderedQueries = buildOpeningQuoteSettlementAdapterQueries(
    pair,
    candidate.presale_closeout_id,
    [...candidate.opening_commitments].reverse(),
    [...candidate.opening_quote_settlements].reverse(),
  );
  assert.equal(queries.adapter_query_set_root,
    reorderedQueries.adapter_query_set_root);
  assert.equal(queries.adapter_query_count,
    candidate.opening_quote_settlements.length);
  assert.equal(queries.presale_closeout_reference_id,
    candidate.presale_closeout_id);
  assert.equal(queries.adapter_query_closeout_reference_bound, true);
  assert.equal(queries.adapter_queries.every((query) =>
    query.presale_closeout_reference_id === candidate.presale_closeout_id), true);
  const alternateCloseoutQueries = buildOpeningQuoteSettlementAdapterQueries(
    pair,
    hash("d"),
    candidate.opening_commitments,
    candidate.opening_quote_settlements,
  );
  assert.notEqual(queries.adapter_query_set_root,
    alternateCloseoutQueries.adapter_query_set_root);
  assert.equal(queries.adapter_query_contract_closed, true);
  assert.equal(queries.adapter_response_accepted, false);
  assert.equal(queries.settlement_source_verified, false);
  assert.equal(Object.isFrozen(queries.adapter_queries), true);
  assert.equal(queries.adapter_queries.every((query) =>
    query.schema === OPENING_QUOTE_SETTLEMENT_ADAPTER_QUERY_SCHEMA &&
    Object.isFrozen(query)), true);
  assert.equal(first.claimed_quote_settlement_adapter_query_set_root,
    queries.adapter_query_set_root);
  assert.equal(first.claimed_quote_settlement_adapter_query_count,
    queries.adapter_query_count);
  assert.equal(first.adapter_query_contract_closed, true);
  assert.equal(first.adapter_query_closeout_reference_bound, true);
  assert.equal(first.adapter_response_accepted, false);
  assert.equal(first.quote_settlement_source_adapter_contract_id, null);
  assert.equal(
    first.quote_settlement_source_adapter_configuration_complete,
    false,
  );
  assert.equal(
    first.quote_settlement_source_adapter_independently_reviewed,
    false,
  );
  const configuration =
    inspectOpeningQuoteSettlementAdapterConfiguration(pair);
  assert.deepEqual(configuration, {
    pair,
    source_domain: SETTLEMENT_SOURCE_REQUIREMENTS[pair].source_domain,
    quote_asset_form: SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_asset_form,
    quote_unit: SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_unit,
    quote_decimals: SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_decimals,
    adapter_contract_id: null,
    response_verifier_implemented: false,
    independently_reviewed: false,
    configured: false,
  });
  assert.equal(Object.isFrozen(configuration), true);
  assert.equal(SETTLEMENT_SOURCE_ADAPTER_CONFIGURATION[pair].configured, false);
  let forgedResponseTouched = false;
  const forgedResponse = new Proxy({}, {
    get() {
      forgedResponseTouched = true;
      throw new Error("FORGED_ADAPTER_RESPONSE_EXECUTED");
    },
    ownKeys() {
      forgedResponseTouched = true;
      throw new Error("FORGED_ADAPTER_RESPONSE_ENUMERATED");
    },
  });
  assert.throws(
    () => admitOpeningQuoteSettlementAdapterResponses(pair, forgedResponse),
    (error) => error instanceof Error &&
      error.message === "OPENING_QUOTE_SETTLEMENT_ADAPTER_UNCONFIGURED",
  );
  assert.equal(forgedResponseTouched, false);
  assert.equal(OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_SCHEMA,
    "void.one-sided-opening-quote-settlement-source-event.v1");
  assert.equal(first.quote_settlement_asset_consistent, true);
  assert.equal(first.claimed_quote_settlement_asset,
    APPROVED_MARKETS[pair].quote_asset);
  assert.equal(first.claimed_quote_settlement_source_domain,
    SETTLEMENT_SOURCE_REQUIREMENTS[pair].source_domain);
  assert.equal(first.claimed_quote_settlement_asset_form,
    SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_asset_form);
  assert.equal(first.claimed_quote_unit,
    SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_unit);
  assert.equal(first.claimed_quote_decimals,
    SETTLEMENT_SOURCE_REQUIREMENTS[pair].quote_decimals);
  assert.equal(first.quote_settlement_source_profile_consistent, true);
  assert.equal(first.quote_unit_profile_consistent, true);
  assert.equal(first.quote_units_are_atomic, true);
  assert.equal(first.quote_settlement_source_adapter_implemented, false);
  assert.equal(first.quote_settlement_source_verified, false);
  assert.equal(first.participant_commitment_provenance_verified, false);
  assert.equal(first.quote_reserve_custody_verified, false);
  assert.equal(first.void_reserve_custody_verified, false);
  assert.equal(first.opening_price_source, "caller_supplied_unverified_assertion");
  assert.equal(first.opening_price_source_verified, false);
  assert.equal(first.fixed_opening_price, false);
  assert.equal(first.claimed_protocol_quote_seed_units, "0");
  assert.equal(first.claimed_participant_quote_reserve_units,
    first.claimed_real_quote_reserve_units);
  assert.equal(first.zero_protocol_quote_seed_required, true);
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
  const candidate = request("BTC_VOID", "1");
  assert.throws(() => buildOpeningQuoteSettlementAdapterQueries(
    candidate.pair,
    "local-closeout",
    candidate.opening_commitments,
    candidate.opening_quote_settlements,
  ), (error) => error instanceof Error &&
    error.message === "INVALID_PRESALE_CLOSEOUT_ID");
}
{
  const candidates = portfolio();
  const first = inspectSharedPostDiscoveryMarketPortfolioAssertions(candidates);
  const reordered = inspectSharedPostDiscoveryMarketPortfolioAssertions(
    structuredClone(candidates).reverse(),
  );
  assert.deepEqual(reordered, first);
  assert.equal(first.phase, "discovery_authority_hold");
  assert.equal(first.approved_pairs.length, 3);
  assert.equal(first.claimed_total_void_reserve_atoms,
    (VOID_MARKET_ALLOCATION_ATOMS * 3n).toString());
  assert.equal(first.claimed_shared_presale_closeout_reference_id, hash("b"));
  assert.equal(first.shared_presale_closeout_reference_consistent, true);
  assert.equal(first.cross_market_settlement_reference_reuse_rejected, true);
  assert.deepEqual(first.unconfigured_settlement_source_adapter_pairs,
    ["BTC_VOID", "ETH_VOID", "WC_VOID"]);
  assert.equal(first.settlement_source_adapter_configuration_complete, false);
  assert.equal(first.cross_market_void_inventory_backing, false);
  assert.equal(first.cross_market_quote_reserve_backing, false);
  assert.equal(first.settlement_source_verified, false);
  assert.equal(first.activation_authority, false);
  assert.throws(() => admitSharedPostDiscoveryMarketPortfolioState(candidates),
    (error) => error instanceof Error &&
      error.message === "SHARED_MARKET_PORTFOLIO_AUTHORITY_UNVERIFIED");
}
{
  const candidates = portfolio();
  candidates[1].presale_closeout_id = hash("d");
  assert.throws(() => inspectSharedPostDiscoveryMarketPortfolioAssertions(candidates),
    (error) => error instanceof Error &&
      error.message === "SHARED_MARKET_PRESALE_CLOSEOUT_MISMATCH");
}
{
  const candidates = portfolio();
  candidates.pop();
  assert.throws(() => inspectSharedPostDiscoveryMarketPortfolioAssertions(candidates),
    (error) => error instanceof Error &&
      error.message === "INVALID_SHARED_MARKET_PORTFOLIO_SIZE");
}
{
  const candidates = portfolio();
  candidates[2] = structuredClone(candidates[1]);
  assert.throws(() => inspectSharedPostDiscoveryMarketPortfolioAssertions(candidates),
    (error) => error instanceof Error &&
      error.message === "DUPLICATE_SHARED_MARKET_PAIR");
}
{
  const candidates = portfolio();
  const reused = candidates[0].opening_quote_settlements[0].settlement_reference;
  candidates[1].opening_quote_settlements[0].settlement_reference = reused;
  rehashSettlement(candidates[1].opening_quote_settlements[0]);
  assert.throws(() => inspectSharedPostDiscoveryMarketPortfolioAssertions(candidates),
    (error) => error instanceof Error &&
      error.message === "CROSS_MARKET_QUOTE_SETTLEMENT_REFERENCE_REUSED");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].adapter_response = {
    settlement_source_verified: true,
  };
  rejects(candidate, "INVALID_OPENING_QUOTE_SETTLEMENT_SHAPE");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].settlement_reference = hash("d");
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_ID_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].quote_asset = "ETH";
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_ASSET_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].source_domain = "bitcoin-testnet";
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_SOURCE_DOMAIN_MISMATCH");
}
{
  const candidate = request("ETH_VOID", "11");
  candidate.opening_quote_settlements[0].quote_asset_form = "erc20";
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_ASSET_FORM_MISMATCH");
}
{
  const candidate = request("WC_VOID", "11");
  candidate.opening_quote_settlements[0].quote_asset_form = "native";
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_ASSET_FORM_MISMATCH");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].quote_unit = "wei";
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_UNIT_MISMATCH");
}
{
  const candidate = request("ETH_VOID", "11");
  candidate.opening_quote_settlements[0].quote_decimals = 8;
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_DECIMALS_MISMATCH");
}
{
  const candidate = request("WC_VOID", "11");
  candidate.opening_quote_settlements[0].quote_decimals = 18;
  candidate.opening_quote_settlements[0].settlement_id =
    openingQuoteSettlementAssertionId(candidate.opening_quote_settlements[0]);
  rejects(candidate, "OPENING_QUOTE_SETTLEMENT_DECIMALS_MISMATCH");
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
  rehashSettlement(candidate.opening_quote_settlements[1]);
  rejects(candidate, "QUOTE_SETTLEMENT_REFERENCE_REUSED");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[1].commitment_id =
    candidate.opening_quote_settlements[0].commitment_id;
  candidate.opening_quote_settlements[1].quote_units =
    candidate.opening_quote_settlements[0].quote_units;
  rehashSettlement(candidate.opening_quote_settlements[1]);
  rejects(candidate, "DUPLICATE_SETTLEMENT_FOR_COMMITMENT");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_quote_settlements[0].quote_units = "10";
  rehashSettlement(candidate.opening_quote_settlements[0]);
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
  rehashSettlement(candidate.opening_quote_settlements[0]);
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
  candidate.opening_discovery.protocol_quote_seed_units = "1";
  candidate.opening_discovery.receipt_id =
    openingDiscoveryReceiptId(candidate.opening_discovery);
  rejects(candidate, "PROTOCOL_QUOTE_SEED_FORBIDDEN");
}
{
  const candidate = request("BTC_VOID", "11");
  candidate.opening_discovery.participant_quote_reserve_units = "10";
  candidate.opening_discovery.receipt_id =
    openingDiscoveryReceiptId(candidate.opening_discovery);
  rejects(candidate, "PARTICIPANT_QUOTE_RESERVE_MISMATCH");
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
  candidate.opening_discovery.participant_quote_reserve_units = "12";
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
console.log("portfolio_accounting=three_market_no_cross_backing");
console.log("portfolio_closeout_reference=one_shared_unverified_id");
console.log("protocol_quote_seed_units=0");
console.log("settlement_asset_binding=WC,BTC,ETH");
console.log("settlement_source_profiles=wc-ledger,bitcoin-mainnet,ethereum-mainnet");
console.log("quote_units=wc:0,satoshi:8,wei:18");
console.log("settlement_source_event_join=content_addressed_unverified");
console.log("adapter_query_contract=closed_no_response_admission");
console.log("adapter_query_closeout_binding=content_addressed_unverified");
console.log("adapter_configuration=all_pairs_unconfigured_fail_closed");
console.log("market_allowlist=owned_keys_only");
console.log("request_envelopes=plain_data_properties_only");
console.log("array_envelopes=dense_data_indices_only");
console.log("canonical_ordering=locale_independent_code_units");
console.log("cases=58");
