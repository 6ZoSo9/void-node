import { createHash } from "node:crypto";

export const SHARED_MARKET_POST_DISCOVERY_SCHEMA =
  "void.shared-market-post-discovery-state.v1";
export const OPENING_DISCOVERY_RECEIPT_SCHEMA =
  "void.one-sided-opening-discovery-receipt.v1";
export const VOID_MARKET_ALLOCATION_ATOMS = 10_000_000n * 1_000_000n;

export const APPROVED_MARKETS = Object.freeze({
  WC_VOID: Object.freeze({ quote_asset: "WC", base_asset: "VOID" }),
  BTC_VOID: Object.freeze({ quote_asset: "BTC", base_asset: "VOID" }),
  ETH_VOID: Object.freeze({ quote_asset: "ETH", base_asset: "VOID" }),
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const REQUEST_KEYS = ["schema", "pair", "presale_closeout_id", "opening_discovery"];
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

function canonicalUint(value, code, { nonzero = false } = {}) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (nonzero && parsed === 0n) fail(code);
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

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function openingDiscoveryReceiptId(receipt) {
  return digest(canonicalDiscoveryPayload(receipt));
}

export function admitPostDiscoveryMarketState(request) {
  exactObject(request, REQUEST_KEYS, "INVALID_REQUEST_SHAPE");
  if (request.schema !== SHARED_MARKET_POST_DISCOVERY_SCHEMA) fail("INVALID_SCHEMA");
  const market = APPROVED_MARKETS[request.pair];
  if (!market) fail("UNAPPROVED_MARKET");
  if (!SHA256.test(request.presale_closeout_id)) fail("INVALID_PRESALE_CLOSEOUT_ID");

  const receipt = request.opening_discovery;
  exactObject(receipt, RECEIPT_KEYS, "INVALID_DISCOVERY_RECEIPT_SHAPE");
  if (receipt.schema !== OPENING_DISCOVERY_RECEIPT_SCHEMA) fail("INVALID_DISCOVERY_SCHEMA");
  if (receipt.pair !== request.pair) fail("DISCOVERY_PAIR_MISMATCH");
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

  const statePayload = {
    schema: SHARED_MARKET_POST_DISCOVERY_SCHEMA,
    phase: "post_discovery_inactive",
    pair: request.pair,
    quote_asset: market.quote_asset,
    base_asset: market.base_asset,
    presale_closeout_id: request.presale_closeout_id,
    opening_discovery_receipt_id: receipt.receipt_id,
    commitment_set_root: receipt.commitment_set_root,
    participant_commitment_count: receipt.participant_commitment_count,
    real_quote_reserve_units: receipt.real_quote_reserve_units,
    locked_void_reserve_atoms: receipt.locked_void_reserve_atoms,
    reserve_price_quote_numerator: receipt.clearing_price_quote_numerator,
    reserve_price_void_atoms_denominator: receipt.clearing_price_void_atoms_denominator,
    fixed_opening_price: false,
    participant_quote_reserves_required: true,
    presale_closed: true,
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

