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
export const OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_SCHEMA =
  "void.one-sided-opening-quote-settlement-source-event.v1";
export const OPENING_QUOTE_SETTLEMENT_ADAPTER_QUERY_SCHEMA =
  "void.one-sided-opening-quote-settlement-adapter-query.v1";
export const VOID_MARKET_ALLOCATION_ATOMS = 10_000_000n * 1_000_000n;

export const APPROVED_MARKETS = Object.freeze({
  WC_VOID: Object.freeze({ quote_asset: "WC", base_asset: "VOID" }),
  BTC_VOID: Object.freeze({ quote_asset: "BTC", base_asset: "VOID" }),
  ETH_VOID: Object.freeze({ quote_asset: "ETH", base_asset: "VOID" }),
});
export const SETTLEMENT_SOURCE_REQUIREMENTS = Object.freeze({
  WC_VOID: Object.freeze({
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
  }),
  BTC_VOID: Object.freeze({
    source_domain: "bitcoin-mainnet",
    quote_asset_form: "native",
    quote_unit: "satoshi",
    quote_decimals: 8,
  }),
  ETH_VOID: Object.freeze({
    source_domain: "ethereum-mainnet",
    quote_asset_form: "native",
    quote_unit: "wei",
    quote_decimals: 18,
  }),
});
export const SETTLEMENT_SOURCE_ADAPTER_CONFIGURATION = Object.freeze(
  Object.fromEntries(Object.keys(APPROVED_MARKETS).map((pair) => [
    pair,
    Object.freeze({
      adapter_contract_id: null,
      response_verifier_implemented: false,
      independently_reviewed: false,
      configured: false,
    }),
  ])),
);

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
  "settlement_source_event_id",
  "pair",
  "quote_asset",
  "source_domain",
  "quote_asset_form",
  "quote_unit",
  "quote_decimals",
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
  "participant_quote_reserve_units",
  "protocol_quote_seed_units",
  "real_quote_reserve_units",
  "locked_void_reserve_atoms",
  "clearing_price_quote_numerator",
  "clearing_price_void_atoms_denominator",
];

function fail(code) {
  throw new Error(code);
}

function approvedMarket(pair) {
  if (typeof pair !== "string" || !Object.hasOwn(APPROVED_MARKETS, pair)) {
    fail("UNAPPROVED_MARKET");
  }
  return APPROVED_MARKETS[pair];
}

function settlementSourceRequirement(pair) {
  approvedMarket(pair);
  if (!Object.hasOwn(SETTLEMENT_SOURCE_REQUIREMENTS, pair)) {
    fail("SETTLEMENT_SOURCE_REQUIREMENT_MISSING");
  }
  return SETTLEMENT_SOURCE_REQUIREMENTS[pair];
}

function settlementSourceAdapterConfiguration(pair) {
  approvedMarket(pair);
  if (!Object.hasOwn(SETTLEMENT_SOURCE_ADAPTER_CONFIGURATION, pair)) {
    fail("SETTLEMENT_SOURCE_ADAPTER_CONFIGURATION_MISSING");
  }
  return SETTLEMENT_SOURCE_ADAPTER_CONFIGURATION[pair];
}

function exactObject(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = ownKeys.sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) {
    fail(code);
  }
  if (actual.some((key) => {
    const descriptor = descriptors[key];
    return descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value");
  })) {
    fail(code);
  }
}

function exactArraySnapshot(value, minLength, maxLength, code) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const lengthDescriptor = descriptors.length;
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value") ||
      lengthDescriptor.enumerable !== false ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < minLength ||
      lengthDescriptor.value > maxLength) {
    fail(code);
  }
  const length = lengthDescriptor.value;
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string") ||
      ownKeys.length !== length + 1) {
    fail(code);
  }
  const snapshot = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")) {
      fail(code);
    }
    snapshot[index] = descriptor.value;
  }
  return snapshot;
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
    participant_quote_reserve_units: receipt.participant_quote_reserve_units,
    protocol_quote_seed_units: receipt.protocol_quote_seed_units,
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
    settlement_source_event_id: settlement.settlement_source_event_id,
    pair: settlement.pair,
    quote_asset: settlement.quote_asset,
    source_domain: settlement.source_domain,
    quote_asset_form: settlement.quote_asset_form,
    quote_unit: settlement.quote_unit,
    quote_decimals: settlement.quote_decimals,
    commitment_id: settlement.commitment_id,
    quote_units: settlement.quote_units,
    settlement_reference: settlement.settlement_reference,
  };
}

function canonicalQuoteSettlementSourceEventPayload(settlement) {
  return {
    schema: OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_SCHEMA,
    pair: settlement.pair,
    quote_asset: settlement.quote_asset,
    source_domain: settlement.source_domain,
    quote_asset_form: settlement.quote_asset_form,
    quote_unit: settlement.quote_unit,
    quote_decimals: settlement.quote_decimals,
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

export function openingQuoteSettlementSourceEventId(settlement) {
  return digest(canonicalQuoteSettlementSourceEventPayload(settlement));
}

export function aggregateOpeningCommitmentAssertions(pair, commitments) {
  approvedMarket(pair);
  const commitmentValues = exactArraySnapshot(
    commitments,
    1,
    1_000_000,
    "INVALID_OPENING_COMMITMENT_SET",
  );

  const seen = new Set();
  let quoteSum = 0n;
  const canonical = commitmentValues.map((commitment) => {
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
  const market = approvedMarket(pair);
  const sourceRequirement = settlementSourceRequirement(pair);
  const commitmentValues = exactArraySnapshot(
    commitments,
    1,
    1_000_000,
    "INVALID_OPENING_COMMITMENT_SET",
  );
  const commitmentAggregate = aggregateOpeningCommitmentAssertions(
    pair,
    commitmentValues,
  );
  const settlementValues = exactArraySnapshot(
    settlements,
    1,
    1_000_000,
    "INVALID_OPENING_QUOTE_SETTLEMENT_SET",
  );

  const commitmentQuotes = new Map(
    commitmentValues.map((commitment) =>
      [commitment.commitment_id, commitment.quote_units]),
  );
  const seenSettlementIds = new Set();
  const seenSettlementSourceEventIds = new Set();
  const seenCommitmentIds = new Set();
  const seenSettlementReferences = new Set();
  let quoteSum = 0n;
  const canonical = settlementValues.map((settlement) => {
    exactObject(settlement, SETTLEMENT_KEYS,
      "INVALID_OPENING_QUOTE_SETTLEMENT_SHAPE");
    if (settlement.schema !== OPENING_QUOTE_SETTLEMENT_ASSERTION_SCHEMA) {
      fail("INVALID_OPENING_QUOTE_SETTLEMENT_SCHEMA");
    }
    if (settlement.pair !== pair) fail("OPENING_QUOTE_SETTLEMENT_PAIR_MISMATCH");
    if (settlement.quote_asset !== market.quote_asset) {
      fail("OPENING_QUOTE_SETTLEMENT_ASSET_MISMATCH");
    }
    if (settlement.source_domain !== sourceRequirement.source_domain) {
      fail("OPENING_QUOTE_SETTLEMENT_SOURCE_DOMAIN_MISMATCH");
    }
    if (settlement.quote_asset_form !== sourceRequirement.quote_asset_form) {
      fail("OPENING_QUOTE_SETTLEMENT_ASSET_FORM_MISMATCH");
    }
    if (settlement.quote_unit !== sourceRequirement.quote_unit) {
      fail("OPENING_QUOTE_SETTLEMENT_UNIT_MISMATCH");
    }
    if (settlement.quote_decimals !== sourceRequirement.quote_decimals) {
      fail("OPENING_QUOTE_SETTLEMENT_DECIMALS_MISMATCH");
    }
    if (!SHA256.test(settlement.settlement_id)) {
      fail("INVALID_OPENING_QUOTE_SETTLEMENT_ID");
    }
    if (!SHA256.test(settlement.settlement_source_event_id)) {
      fail("INVALID_OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_ID");
    }
    if (!SHA256.test(settlement.commitment_id)) {
      fail("INVALID_SETTLED_COMMITMENT_ID");
    }
    if (!SHA256.test(settlement.settlement_reference)) {
      fail("INVALID_QUOTE_SETTLEMENT_REFERENCE");
    }
    const quote = canonicalUint(settlement.quote_units,
      "INVALID_OPENING_QUOTE_SETTLEMENT_QUOTE", { nonzero: true });
    if (openingQuoteSettlementSourceEventId(settlement) !==
        settlement.settlement_source_event_id) {
      fail("OPENING_QUOTE_SETTLEMENT_SOURCE_EVENT_ID_MISMATCH");
    }
    if (openingQuoteSettlementAssertionId(settlement) !== settlement.settlement_id) {
      fail("OPENING_QUOTE_SETTLEMENT_DIGEST_MISMATCH");
    }
    if (seenSettlementIds.has(settlement.settlement_id)) {
      fail("DUPLICATE_OPENING_QUOTE_SETTLEMENT_ID");
    }
    if (seenSettlementSourceEventIds.has(settlement.settlement_source_event_id)) {
      fail("QUOTE_SETTLEMENT_SOURCE_EVENT_REUSED");
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
    seenSettlementSourceEventIds.add(settlement.settlement_source_event_id);
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
    quote_settlement_source_event_count: seenSettlementSourceEventIds.size,
    claimed_settled_quote_units: quoteSum.toString(),
    commitment_settlement_bijection_self_consistent: true,
    settlement_source_verified: false,
    quote_reserve_custody_verified: false,
  });
}

export function buildOpeningQuoteSettlementAdapterQueries(
  pair,
  commitments,
  settlements,
) {
  const commitmentValues = exactArraySnapshot(
    commitments,
    1,
    1_000_000,
    "INVALID_OPENING_COMMITMENT_SET",
  );
  const settlementValues = exactArraySnapshot(
    settlements,
    1,
    1_000_000,
    "INVALID_OPENING_QUOTE_SETTLEMENT_SET",
  );
  const settlementAggregate = aggregateOpeningQuoteSettlementAssertions(
    pair,
    commitmentValues,
    settlementValues,
  );
  const adapterQueries = settlementValues.map((settlement) => Object.freeze({
    schema: OPENING_QUOTE_SETTLEMENT_ADAPTER_QUERY_SCHEMA,
    pair: settlement.pair,
    settlement_source_event_id: settlement.settlement_source_event_id,
    quote_asset: settlement.quote_asset,
    source_domain: settlement.source_domain,
    quote_asset_form: settlement.quote_asset_form,
    quote_unit: settlement.quote_unit,
    quote_decimals: settlement.quote_decimals,
    commitment_id: settlement.commitment_id,
    quote_units: settlement.quote_units,
    settlement_reference: settlement.settlement_reference,
  }));
  adapterQueries.sort((a, b) =>
    a.settlement_source_event_id.localeCompare(b.settlement_source_event_id));
  Object.freeze(adapterQueries);

  return Object.freeze({
    ...settlementAggregate,
    adapter_query_set_root: digest({
      schema: OPENING_QUOTE_SETTLEMENT_ADAPTER_QUERY_SCHEMA,
      pair,
      adapter_queries: adapterQueries,
    }),
    adapter_query_count: adapterQueries.length,
    adapter_queries: adapterQueries,
    adapter_query_contract_closed: true,
    adapter_response_accepted: false,
    settlement_source_verified: false,
    quote_reserve_custody_verified: false,
  });
}

export function inspectOpeningQuoteSettlementAdapterConfiguration(pair) {
  approvedMarket(pair);
  const sourceRequirement = settlementSourceRequirement(pair);
  const configuration = settlementSourceAdapterConfiguration(pair);
  return Object.freeze({
    pair,
    source_domain: sourceRequirement.source_domain,
    quote_asset_form: sourceRequirement.quote_asset_form,
    quote_unit: sourceRequirement.quote_unit,
    quote_decimals: sourceRequirement.quote_decimals,
    adapter_contract_id: configuration.adapter_contract_id,
    response_verifier_implemented: configuration.response_verifier_implemented,
    independently_reviewed: configuration.independently_reviewed,
    configured: configuration.configured,
  });
}

export function admitOpeningQuoteSettlementAdapterResponses(pair, _responses) {
  const configuration = inspectOpeningQuoteSettlementAdapterConfiguration(pair);
  if (!configuration.configured) {
    fail("OPENING_QUOTE_SETTLEMENT_ADAPTER_UNCONFIGURED");
  }
  fail("OPENING_QUOTE_SETTLEMENT_ADAPTER_RESPONSE_UNVERIFIED");
}

export function inspectPostDiscoveryMarketAssertion(request) {
  exactObject(request, REQUEST_KEYS, "INVALID_REQUEST_SHAPE");
  if (request.schema !== SHARED_MARKET_POST_DISCOVERY_SCHEMA) fail("INVALID_SCHEMA");
  const market = approvedMarket(request.pair);
  if (!SHA256.test(request.presale_closeout_id)) fail("INVALID_PRESALE_CLOSEOUT_ID");

  const receipt = request.opening_discovery;
  exactObject(receipt, RECEIPT_KEYS, "INVALID_DISCOVERY_RECEIPT_SHAPE");
  if (receipt.schema !== OPENING_DISCOVERY_RECEIPT_SCHEMA) fail("INVALID_DISCOVERY_SCHEMA");
  if (receipt.pair !== request.pair) fail("DISCOVERY_PAIR_MISMATCH");
  const aggregate = aggregateOpeningCommitmentAssertions(
    request.pair,
    request.opening_commitments,
  );
  const settlementAggregate = buildOpeningQuoteSettlementAdapterQueries(
    request.pair,
    request.opening_commitments,
    request.opening_quote_settlements,
  );
  const adapterConfiguration =
    inspectOpeningQuoteSettlementAdapterConfiguration(request.pair);
  if (!SHA256.test(receipt.receipt_id)) fail("INVALID_DISCOVERY_RECEIPT_ID");
  if (!SHA256.test(receipt.commitment_set_root)) fail("INVALID_COMMITMENT_SET_ROOT");
  canonicalPositiveCount(receipt.participant_commitment_count);

  const quote = canonicalUint(receipt.real_quote_reserve_units,
    "INVALID_REAL_QUOTE_RESERVE", { nonzero: true });
  const participantQuote = canonicalUint(receipt.participant_quote_reserve_units,
    "INVALID_PARTICIPANT_QUOTE_RESERVE", { nonzero: true });
  const protocolQuoteSeed = canonicalUint(receipt.protocol_quote_seed_units,
    "INVALID_PROTOCOL_QUOTE_SEED");
  if (protocolQuoteSeed !== 0n) fail("PROTOCOL_QUOTE_SEED_FORBIDDEN");
  if (participantQuote !== quote) fail("PARTICIPANT_QUOTE_RESERVE_MISMATCH");
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
    claimed_participant_quote_reserve_units:
      receipt.participant_quote_reserve_units,
    claimed_protocol_quote_seed_units: receipt.protocol_quote_seed_units,
    claimed_real_quote_reserve_units: receipt.real_quote_reserve_units,
    claimed_quote_settlement_set_root:
      settlementAggregate.quote_settlement_set_root,
    claimed_quote_settlement_count: settlementAggregate.quote_settlement_count,
    claimed_quote_settlement_source_event_count:
      settlementAggregate.quote_settlement_source_event_count,
    claimed_quote_settlement_adapter_query_set_root:
      settlementAggregate.adapter_query_set_root,
    claimed_quote_settlement_adapter_query_count:
      settlementAggregate.adapter_query_count,
    quote_settlement_source_adapter_contract_id:
      adapterConfiguration.adapter_contract_id,
    claimed_settled_quote_units: settlementAggregate.claimed_settled_quote_units,
    claimed_quote_settlement_asset: market.quote_asset,
    claimed_quote_settlement_source_domain:
      adapterConfiguration.source_domain,
    claimed_quote_settlement_asset_form:
      adapterConfiguration.quote_asset_form,
    claimed_quote_unit:
      adapterConfiguration.quote_unit,
    claimed_quote_decimals:
      adapterConfiguration.quote_decimals,
    claimed_locked_void_reserve_atoms: receipt.locked_void_reserve_atoms,
    claimed_reserve_price_quote_numerator: receipt.clearing_price_quote_numerator,
    claimed_reserve_price_void_atoms_denominator:
      receipt.clearing_price_void_atoms_denominator,
    discovery_assertion_self_consistent: true,
    commitment_settlement_bijection_self_consistent: true,
    settlement_reference_reuse_rejected: true,
    settlement_source_event_binding_self_consistent: true,
    settlement_source_event_reuse_rejected: true,
    adapter_query_contract_closed: true,
    adapter_response_accepted: false,
    quote_settlement_source_adapter_configuration_complete:
      adapterConfiguration.configured,
    quote_settlement_source_adapter_independently_reviewed:
      adapterConfiguration.independently_reviewed,
    quote_settlement_asset_consistent: true,
    quote_settlement_source_profile_consistent: true,
    quote_unit_profile_consistent: true,
    quote_units_are_atomic: true,
    quote_settlement_source_adapter_implemented: false,
    participant_commitment_provenance_verified: false,
    quote_settlement_source_verified: false,
    quote_reserve_custody_verified: false,
    void_reserve_custody_verified: false,
    opening_price_source: "caller_supplied_unverified_assertion",
    opening_price_source_verified: false,
    fixed_opening_price: false,
    zero_protocol_quote_seed_required: true,
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
  const requestValues = exactArraySnapshot(
    requests,
    approvedPairs.length,
    approvedPairs.length,
    "INVALID_SHARED_MARKET_PORTFOLIO_SIZE",
  );

  const seenPairs = new Set();
  const seenSettlementReferences = new Set();
  const inspected = requestValues.map((request) => {
    const state = inspectPostDiscoveryMarketAssertion(request);
    if (seenPairs.has(state.pair)) fail("DUPLICATE_SHARED_MARKET_PAIR");
    seenPairs.add(state.pair);
    const settlementValues = exactArraySnapshot(
      request.opening_quote_settlements,
      1,
      1_000_000,
      "INVALID_OPENING_QUOTE_SETTLEMENT_SET",
    );
    for (const settlement of settlementValues) {
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
    unconfigured_settlement_source_adapter_pairs: approvedPairs,
    settlement_source_adapter_configuration_complete: false,
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
