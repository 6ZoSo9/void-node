import { createHash } from "node:crypto";

export const SHARED_MARKET_POST_DISCOVERY_SCHEMA =
  "void.shared-market-post-discovery-state.v1";
export const SHARED_MARKET_POST_DISCOVERY_PORTFOLIO_SCHEMA =
  "void.shared-market-post-discovery-portfolio.v1";
export const OPENING_DISCOVERY_RECEIPT_SCHEMA =
  "void.one-sided-opening-discovery-receipt.v1";
export const OPENING_COMMITMENT_ASSERTION_SCHEMA =
  "void.one-sided-opening-commitment-assertion.v1";
export const OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA =
  "void.one-sided-opening-quote-settlement-assertion.v1";
export const VOID_MARKET_ALLOCATION_ATOMS = 10_000_000n * 1_000_000n;

export const APPROVED_MARKETS = Object.freeze({
  WC_VOID: Object.freeze({ quote_asset: "WC", base_asset: "VOID" }),
  BTC_VOID: Object.freeze({ quote_asset: "BTC", base_asset: "VOID" }),
  ETH_VOID: Object.freeze({ quote_asset: "ETH", base_asset: "VOID" }),
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const UINT256_MAX = (1n << 256n) - 1n;
const REQUEST_KEYS = [
  "schema",
  "pair",
  "presale_closeout_id",
  "opening_discovery",
  "opening_commitments",
  "opening_quote_settlements",
];
const COMMITMENT_KEYS = [
  "schema",
  "commitment_id",
  "pair",
  "participant_id",
  "quote_units",
];
const SETTLEMENT_KEYS = [
  "schema",
  "settlement_id",
  "pair",
  "commitment_id",
  "quote_units",
  "settlement_reference",
];
const RECEIPT_KEYS = [
  "schema",
  "receipt_id",
  "pair",
  "commitment_set_root",
  "participant_commitment_count",
  "real_quote_reserve_units",
  "locked_void_reserve_atoms",
  "clearing_price_quote_numerator",
  "clearing_price_void_atoms_denominator",
];

function fail(code) {
  throw new Error(code);
}

function exactObject(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) {
    fail(code);
  }
}

function canonicalUint(value, code, { nonzero = false, max = UINT256_MAX } = {}) {
  if (typeof value !== "string" || value.length > 78 || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (nonzero && parsed === 0n) fail(code);
  if (parsed > max) fail(code);
  return parsed;
}

function canonicalPositiveCount(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000) {
    fail("INVALID_PARTICIPANT_COMMITMENT_COUNT");
  }
  return value;
}

function gcd(a, b) {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function canonicalDiscoveryPayload(receipt) {
  return {
    schema: receipt.schema,
    pair: receipt.pair,
    commitment_set_root: receipt.commitment_set_root,
    participant_commitment_count: receipt.participant_commitment_count,
    real_quote_reserve_units: receipt.real_quote_reserve_units,
    locked_void_reserve_atoms: receipt.locked_void_reserve_atoms,
    clearing_price_quote_numerator: receipt.clearing_price_quote_numerator,
    clearing_price_void_atoms_denominator: receipt.clearing_price_void_atoms_denominator,
  };
}

function canonicalCommitmentPayload(commitment) {
  return {
    schema: commitment.schema,
    pair: commitment.pair,
    participant_id: commitment.participant_id,
    quote_units: commitment.quote_units,
  };
}

function canonicalQuoteSettlementPayload(settlement) {
  return {
    schema: settlement.schema,
    pair: settlement.pair,
    commitment_id: settlement.commitment_id,
    quote_units: settlement.quote_units,
    settlement_reference: settlement.settlement_reference,
  };
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function openingDiscoveryReceiptId(receipt) {
  return digest(canonicalDiscoveryPayload(receipt));
}

export function openingCommitmentAssertionId(commitment) {
  return digest(canonicalCommitmentPayload(commitment));
}

export function openingQuoteSettlementAssertionId(settlement) {
  return digest(canonicalQuoteSettlementPayload(settlement));
}

export function aggregateOpeningCommitmentAssertions(pair, commitments) {
  if (!APPROVED_MARKETS[pair]) fail("UNAPPROVED_MARKET");
  if (!Array.isArray(commitments) || commitments.length < 1 ||
      commitments.length > 1_000_000) {
    fail("INVALID_OPENING_COMMITMENT_SET");
  }

  const seen = new Set();
  let quoteSum = 0n;
  const canonical = commitments.map((commitment) => {
    exactObject(commitment, COMMITMENT_KEYS, "INVALID_OPENING_COMMITMENT_SHAPE");
    if (commitment.schema !== OPENING_COMMITMENT_ASSERTION_SCHEMA) {
      fail("INVALID_OPENING_COMMITMENT_SCHEMA");
    }
    if (commitment.pair !== pair) fail("OPENING_COMMITMENT_PAIR_MISMATCH");
    if (!SHA256.test(commitment.commitment_id)) {
      fail("INVALID_OPENING_COMMITMENT_ID");
    }
    if (!SHA256.test(commitment.participant_id)) fail("INVALID_PARTICIPANT_ID");
    const quote = canonicalUint(commitment.quote_units,
      "INVALID_OPENING_COMMITMENT_QUOTE", { nonzero: true });
    if (openingCommitmentAssertionId(commitment) !== commitment.commitment_id) {
      fail("OPENING_COMMITMENT_DIGEST_MISMATCH");
    }
    if (seen.has(commitment.commitment_id)) {
      fail("DUPLICATE_OPENING_COMMITMENT_ID");
    }
    seen.add(commitment.commitment_id);
    quoteSum += quote;
    if (quoteSum > UINT256_MAX) fail("OPENING_COMMITMENT_SUM_OVERFLOW");
    return canonicalCommitmentPayload(commitment);
  });

  canonical.sort((a, b) => {
    const aId = openingCommitmentAssertionId(a);
    const bId = openingCommitmentAssertionId(b);
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });

  return Object.freeze({
    commitment_set_root: digest({
      schema: OPENING_COMMITMENT_ASSERTION_SCHEMA,
      pair,
      commitments: canonical,
    }),
    participant_commitment_count: canonical.length,
    claimed_quote_reserve_units: quoteSum.toString(),
    participant_provenance_verified: false,
    quote_reserve_custody_verified: false,
  });
}

export function aggregateOpeningQuoteSettlementAssertions(
  pair,
  commitments,
  settlements,
) {
  const commitmentAggregate = aggregateOpeningCommitmentAssertions(
    pair,
    commitments,
  );
  if (!Array.isArray(settlements) || settlements.length < 1 ||
      settlements.length > 1_000_000) {
    fail("INVALID_OPENING_QUOTE_SETTLEMENT_SET");
  }

  const commitmentQuotes = new Map(
    commitments.map((commitment) => [commitment.commitment_id, commitment.quote_units]),
  );
  const seenSettlementIds = new Set();
  const seenCommitmentIds = new Set();
  const seenSettlementReferences = new Set();
  let quoteSum = 0n;
  const canonical = settlements.map((settlement) => {
    exactObject(settlement, SETTLEMENT_KEYS,
      "INVALID_OPENING_QUOTE_SETTLEMENT_SHAPE");
    if (settlement.schema !== OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA) {
      fail("INVALID_OPENING_QUOTE_SETTLEMENT_SCHEMA");
    }
    if (settlement.pair !== pair) fail("OPENING_QUOTE_SETTLEMENT_PAIR_MISMATCH");
    if (!SHA256.test(settlement.settlement_id)) {
      fail("INVALID_OPENING_QUOTE_SETTLEMENT_ID");
    }
    if (!SHA256.test(settlement.commitment_id)) {
      fail("INVALID_SETTLED_COMMITMENT_ID");
    }
    if (!SHA256.test(settlement.settlement_reference)) {
      fail("INVALID_QUOTE_SETTLEMENT_REFERENCE");
    }
    const quote = canonicalUint(settlement.quote_units,
      "INVALID_OPENING_QUOTE_SETTLEMENT_QUOTE", { nonzero: true });
    if (openingQuoteSettlementAssertionId(settlement) !== settlement.settlement_id) {
      fail("OPENING_QUOTE_SETTLEMENT_DIGEST_MISMATCH");
    }
    if (seenSettlementIds.has(settlement.settlement_id)) {
      fail("DUPLICATE_OPENING_QUOTE_SETTLEMENT_ID");
    }
    if (seenCommitmentIds.has(settlement.commitment_id)) {
      fail("DUPLICATE_SETTLEMENT_FOR_COMMITMENT");
    }
    if (seenSettlementReferences.has(settlement.settlement_reference)) {
      fail("QUOTE_SETTLEMENT_REFERENCE_REUSED");
    }
    if (!commitmentQuotes.has(settlement.commitment_id)) {
      fail("UNKNOWN_SETTLED_COMMITMENT");
    }
    if (commitmentQuotes.get(settlement.commitment_id) !== settlement.quote_units) {
      fail("SETTLEMENT_COMMITMENT_QUOTE_MISMATCH");
    }
    seenSettlementIds.add(settlement.settlement_id);
    seenCommitmentIds.add(settlement.commitment_id);
    seenSettlementReferences.add(settlement.settlement_reference);
    quoteSum += quote;
    if (quoteSum > UINT256_MAX) fail("OPENING_QUOTE_SETTLEMENT_SUM_OVERFLOW");
    return canonicalQuoteSettlementPayload(settlement);
  });

  if (seenCommitmentIds.size !== commitmentQuotes.size) {
    fail("MISSING_COMMITMENT_SETTLEMENT");
  }
  if (quoteSum.toString() !== commitmentAggregate.claimed_quote_reserve_units) {
    fail("SETTLEMENT_QUOTE_SUM_MISMATCH");
  }

  canonical.sort((a, b) => {
    const aId = openingQuoteSettlementAssertionId(a);
    const bId = openingQuoteSettlementAssertionId(b);
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });

  return Object.freeze({
    quote_settlement_set_root: digest({
      schema: OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA,
      pair,
      settlements: canonical,
    }),
    quote_settlement_count: canonical.length,
    claimed_settled_quote_units: quoteSum.toString(),
    commitment_settlement_bijection_self_consistent: true,
    settlement_source_verified: false,
    quote_reserve_custody_verified: false,
  });
}

export function inspectPostDiscoveryMarketAssertion(request) {
  exactObject(request, REQUEST_KEYS, "INVALID_REQUEST_SHAPE");
  if (request.schema !== SHARED_MARKET_POST_DISCOVERY_SCHEMA) fail("INVALID_SCHEMA");
  const market = APPROVED_MARKETS[request.pair];
  if (!market) fail("UNAPPROVED_MARKET");
  if (!SHA256.test(request.presale_closeout_id)) fail("INVALID_PRESALE_CLOSEOUT_ID");

  const receipt = request.opening_discovery;
  exactObject(receipt, RECEIPT_KEYS, "INVALID_DISCOVERY_RECEIPT_SHAPE");
  if (receipt.schema !== OPENING_DISCOVERY_RECEIPT_SCHEMA) fail("INVALID_DISCOVERY_SCHEMA");
  if (receipt.pair !== request.pair) fail("DISCOVERY_PAIR_MISMATCH");
  const aggregate = aggregateOpeningCommitmentAssertions(
    request.pair,
    request.opening_commitments,
  );
  const settlementAggregate = aggregateOpeningQuoteSettlementAssertions(
    request.pair,
    request.opening_commitments,
    request.opening_quote_settlements,
  );
  if (!SHA256.test(receipt.receipt_id)) fail("INVALID_DISCOVERY_RECEIPT_ID");
  if (!SHA256.test(receipt.commitment_set_root)) fail("INVALID_COMMITMENT_SET_ROOT");
  canonicalPositiveCount(receipt.participant_commitment_count);

  const quote = canonicalUint(receipt.real_quote_reserve_units,
    "INVALID_REAL_QUOTE_RESERVE", { nonzero: true });
  const voidReserve = canonicalUint(receipt.locked_void_reserve_atoms,
    "INVALID_VOID_RESERVE", { nonzero: true });
  if (voidReserve !== VOID_MARKET_ALLOCATION_ATOMS) fail("VOID_ALLOCATION_MISMATCH");

  const numerator = canonicalUint(receipt.clearing_price_quote_numerator,
    "INVALID_CLEARING_PRICE_NUMERATOR", { nonzero: true });
  const denominator = canonicalUint(receipt.clearing_price_void_atoms_denominator,
    "INVALID_CLEARING_PRICE_DENOMINATOR", { nonzero: true });
  if (gcd(numerator, denominator) !== 1n) fail("NON_CANONICAL_CLEARING_PRICE");
  if (numerator * voidReserve !== denominator * quote) {
    fail("CLEARING_PRICE_RESERVE_RATIO_MISMATCH");
  }

  if (openingDiscoveryReceiptId(receipt) !== receipt.receipt_id) {
    fail("DISCOVERY_RECEIPT_DIGEST_MISMATCH");
  }
  if (receipt.commitment_set_root !== aggregate.commitment_set_root) {
    fail("COMMITMENT_SET_ROOT_MISMATCH");
  }
  if (receipt.participant_commitment_count !==
      aggregate.participant_commitment_count) {
    fail("COMMITMENT_COUNT_MISMATCH");
  }
  if (receipt.real_quote_reserve_units !==
      aggregate.claimed_quote_reserve_units) {
    fail("COMMITMENT_QUOTE_SUM_MISMATCH");
  }

  const statePayload = {
    schema: SHARED_MARKET_POST_DISCOVERY_SCHEMA,
    phase: "discovery_authority_hold",
    pair: request.pair,
    quote_asset: market.quote_asset,
    base_asset: market.base_asset,
    presale_closeout_reference_id: request.presale_closeout_id,
    opening_discovery_assertion_id: receipt.receipt_id,
    claimed_commitment_set_root: receipt.commitment_set_root,
    claimed_participant_commitment_count: receipt.participant_commitment_count,
    claimed_real_quote_reserve_units: receipt.real_quote_reserve_units,
    claimed_quote_settlement_set_root:
      settlementAggregate.quote_settlement_set_root,
    claimed_quote_settlement_count: settlementAggregate.quote_settlement_count,
    claimed_settled_quote_units: settlementAggregate.claimed_settled_quote_units,
    claimed_locked_void_reserve_atoms: receipt.locked_void_reserve_atoms,
    claimed_reserve_price_quote_numerator: receipt.clearing_price_quote_numerator,
    claimed_reserve_price_void_atoms_denominator:
      receipt.clearing_price_void_atoms_denominator,
    discovery_assertion_self_consistent: true,
    commitment_settlement_bijection_self_consistent: true,
    settlement_reference_reuse_rejected: true,
    participant_commitment_provenance_verified: false,
    quote_settlement_source_verified: false,
    quote_reserve_custody_verified: false,
    void_reserve_custody_verified: false,
    opening_price_source: "caller_supplied_unverified_assertion",
    opening_price_source_verified: false,
    fixed_opening_price: false,
    participant_quote_reserves_required: true,
    presale_closeout_reference_bound: true,
    presale_closeout_authority_verified: false,
    presale_closed: false,
    separate_activation_gate_required: true,
    activation_authority: false,
    inventory_funding_authority: false,
    liquidity_provision_authority: false,
    transaction_authority: false,
  };

  return Object.freeze({
    ...statePayload,
    state_id: digest(statePayload),
  });
}

export function admitPostDiscoveryMarketState(request) {
  inspectPostDiscoveryMarketAssertion(request);
  fail("DISCOVERY_AUTHORITY_UNVERIFIED");
}

export function inspectSharedPostDiscoveryMarketPortfolioAssertions(requests) {
  const approvedPairs = Object.keys(APPROVED_MARKETS).sort();
  if (!Array.isArray(requests) || requests.length !== approvedPairs.length) {
    fail("INVALID_SHARED_MARKET_PORTFOLIO_SIZE");
  }

  const seenPairs = new Set();
  const seenSettlementReferences = new Set();
  const inspected = requests.map((request) => {
    const state = inspectPostDiscoveryMarketAssertion(request);
    if (seenPairs.has(state.pair)) fail("DUPLICATE_SHARED_MARKET_PAIR");
    seenPairs.add(state.pair);
    for (const settlement of request.opening_quote_settlements) {
      if (seenSettlementReferences.has(settlement.settlement_reference)) {
        fail("CROSS_MARKET_QUOTE_SETTLEMENT_REFERENCE_REUSED");
      }
      seenSettlementReferences.add(settlement.settlement_reference);
    }
    return state;
  });

  if (approvedPairs.some((pair) => !seenPairs.has(pair))) {
    fail("MISSING_APPROVED_MARKET");
  }
  inspected.sort((a, b) => a.pair.localeCompare(b.pair));

  const claimedVoidReserveAtomsByPair = Object.fromEntries(
    inspected.map((state) => [state.pair, state.claimed_locked_void_reserve_atoms]),
  );
  const claimedQuoteReserveUnitsByPair = Object.fromEntries(
    inspected.map((state) => [state.pair, state.claimed_real_quote_reserve_units]),
  );
  const portfolioPayload = {
    schema: SHARED_MARKET_POST_DISCOVERY_PORTFOLIO_SCHEMA,
    phase: "discovery_authority_hold",
    approved_pairs: approvedPairs,
    market_state_ids: Object.fromEntries(
      inspected.map((state) => [state.pair, state.state_id]),
    ),
    claimed_void_reserve_atoms_by_pair: claimedVoidReserveAtomsByPair,
    claimed_total_void_reserve_atoms:
      (VOID_MARKET_ALLOCATION_ATOMS * BigInt(approvedPairs.length)).toString(),
    claimed_quote_reserve_units_by_pair: claimedQuoteReserveUnitsByPair,
    cross_market_settlement_reference_reuse_rejected: true,
    cross_market_void_inventory_backing: false,
    cross_market_quote_reserve_backing: false,
    settlement_source_verified: false,
    quote_reserve_custody_verified: false,
    void_reserve_custody_verified: false,
    presale_closeout_authority_verified: false,
    activation_authority: false,
    inventory_funding_authority: false,
    liquidity_provision_authority: false,
    transaction_authority: false,
  };

  return Object.freeze({
    ...portfolioPayload,
    portfolio_state_id: digest(portfolioPayload),
  });
}

export function admitSharedPostDiscoveryMarketPortfolioState(requests) {
  inspectSharedPostDiscoveryMarketPortfolioAssertions(requests);
  fail("SHARED_MARKET_PORTFOLIO_AUTHORITY_UNVERIFIED");
}
