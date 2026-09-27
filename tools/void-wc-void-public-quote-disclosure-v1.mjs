import { createHash } from "node:crypto";

export const VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1 =
  "VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1";

export const VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1 =
  "void.wc-void-public-quote.v1";

export const VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1 =
  Object.freeze({
    chain_id: 2050,
    network_identity: "mainnet0",
    execution_epoch: 2,
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    native_gas_model: "epoch2_metered_zero_gas_price_v1",
    gas_metering_required: true,
    participant_native_gas_balance_required: false,
    native_gas_economic_charge_atoms: "0",
  });

export const VOID_WC_VOID_PUBLIC_QUOTE_AUTHORITY_V1 = Object.freeze({
  source_only: true,
  disclosure_only: true,
  quote_execution: false,
  pricing_authority: false,
  reserve_custody_authority: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  wc_ledger_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const SAFE_CODE = /^[a-z][a-z0-9._-]{0,63}$/u;
const MAX_FEE_COMPONENTS = 64;

const QUOTE_KEYS = Object.freeze([
  "schema",
  "quote_id",
  "coupled_launch_id",
  "market_state_id",
  "pair",
  "direction",
  "chain_id",
  "network_identity",
  "execution_epoch",
  "void_token",
  "pricing_source",
  "presale_price_authority",
  "fixed_conversion",
  "input_asset",
  "input_unit",
  "output_asset",
  "output_unit",
  "gross_input_amount",
  "trade_input_amount",
  "input_fee_amount",
  "gross_output_amount",
  "output_fee_amount",
  "net_output_amount",
  "minimum_output_amount",
  "slippage_bps",
  "issued_at_ms",
  "expires_at_ms",
  "native_gas_model",
  "gas_metering_required",
  "participant_native_gas_balance_required",
  "native_gas_economic_charge_atoms",
  "fee_components",
]);

const FEE_KEYS = Object.freeze([
  "code",
  "side",
  "asset",
  "amount",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = ownKeys.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const snapshot = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function exactArray(value, min, max, code) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const lengthDescriptor = descriptors.length;
  if (
    !lengthDescriptor ||
    !Object.hasOwn(lengthDescriptor, "value") ||
    lengthDescriptor.enumerable !== false ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < min ||
    lengthDescriptor.value > max
  ) {
    fail(code);
  }
  const length = lengthDescriptor.value;
  if (Reflect.ownKeys(descriptors).length !== length + 1) fail(code);
  const out = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out.push(descriptor.value);
  }
  return out;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function uintString(value, code, { positive = false } = {}) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function safeMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function normalizeFeeComponents(value, inputAsset, outputAsset) {
  const values = exactArray(
    value,
    0,
    MAX_FEE_COMPONENTS,
    "INVALID_WC_VOID_PUBLIC_QUOTE_FEE_COMPONENT_SET",
  );
  const seenCodes = new Set();
  let inputFees = 0n;
  let outputFees = 0n;

  const canonical = values.map((raw) => {
    const fee = exactObject(
      raw,
      FEE_KEYS,
      "INVALID_WC_VOID_PUBLIC_QUOTE_FEE_COMPONENT_SHAPE",
    );
    if (typeof fee.code !== "string" || !SAFE_CODE.test(fee.code)) {
      fail("INVALID_WC_VOID_PUBLIC_QUOTE_FEE_CODE");
    }
    if (seenCodes.has(fee.code)) {
      fail("DUPLICATE_WC_VOID_PUBLIC_QUOTE_FEE_CODE");
    }
    seenCodes.add(fee.code);

    if (fee.side !== "input" && fee.side !== "output") {
      fail("INVALID_WC_VOID_PUBLIC_QUOTE_FEE_SIDE");
    }
    const expectedAsset = fee.side === "input" ? inputAsset : outputAsset;
    if (fee.asset !== expectedAsset) {
      fail("WC_VOID_PUBLIC_QUOTE_FEE_ASSET_MISMATCH");
    }
    const amount = uintString(
      fee.amount,
      "INVALID_WC_VOID_PUBLIC_QUOTE_FEE_AMOUNT",
      { positive: true },
    );
    if (fee.side === "input") inputFees += amount;
    else outputFees += amount;

    return Object.freeze({
      code: fee.code,
      side: fee.side,
      asset: fee.asset,
      amount: amount.toString(),
    });
  });

  canonical.sort((left, right) => compareText(left.code, right.code));
  Object.freeze(canonical);

  return Object.freeze({
    fee_components: canonical,
    input_fee_amount: inputFees.toString(),
    output_fee_amount: outputFees.toString(),
  });
}

function normalizeQuote(raw) {
  const quote = exactObject(
    raw,
    QUOTE_KEYS,
    "INVALID_WC_VOID_PUBLIC_QUOTE_SHAPE",
  );
  if (quote.schema !== VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1) {
    fail("INVALID_WC_VOID_PUBLIC_QUOTE_SCHEMA");
  }
  canonicalSha(quote.quote_id, "INVALID_WC_VOID_PUBLIC_QUOTE_ID");
  canonicalSha(quote.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalSha(quote.market_state_id, "INVALID_WC_VOID_MARKET_STATE_ID");

  if (quote.pair !== "WC_VOID") fail("INVALID_WC_VOID_PUBLIC_QUOTE_PAIR");
  if (quote.direction !== "wc_to_void" && quote.direction !== "void_to_wc") {
    fail("INVALID_WC_VOID_PUBLIC_QUOTE_DIRECTION");
  }

  const binding = VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1;
  if (
    quote.chain_id !== binding.chain_id ||
    quote.network_identity !== binding.network_identity ||
    quote.execution_epoch !== binding.execution_epoch ||
    quote.void_token !== binding.void_token
  ) {
    fail("WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_MISMATCH");
  }
  if (
    quote.native_gas_model !== binding.native_gas_model ||
    quote.gas_metering_required !== binding.gas_metering_required ||
    quote.participant_native_gas_balance_required !==
      binding.participant_native_gas_balance_required ||
    quote.native_gas_economic_charge_atoms !==
      binding.native_gas_economic_charge_atoms
  ) {
    fail("WC_VOID_PUBLIC_QUOTE_GAS_DISCLOSURE_MISMATCH");
  }

  if (
    quote.pricing_source !== "wc_void_market_state" ||
    quote.presale_price_authority !== false ||
    quote.fixed_conversion !== false
  ) {
    fail("WC_VOID_PUBLIC_QUOTE_PRICING_AUTHORITY_MISMATCH");
  }

  const expected = quote.direction === "wc_to_void"
    ? Object.freeze({
        input_asset: "WC",
        input_unit: "wc",
        output_asset: "VOID",
        output_unit: "void_token_atom",
      })
    : Object.freeze({
        input_asset: "VOID",
        input_unit: "void_token_atom",
        output_asset: "WC",
        output_unit: "wc",
      });

  for (const key of [
    "input_asset",
    "input_unit",
    "output_asset",
    "output_unit",
  ]) {
    if (quote[key] !== expected[key]) {
      fail("WC_VOID_PUBLIC_QUOTE_ASSET_UNIT_MISMATCH");
    }
  }

  const grossInput = uintString(
    quote.gross_input_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_GROSS_INPUT",
    { positive: true },
  );
  const tradeInput = uintString(
    quote.trade_input_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_TRADE_INPUT",
    { positive: true },
  );
  const inputFee = uintString(
    quote.input_fee_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_INPUT_FEE",
  );
  const grossOutput = uintString(
    quote.gross_output_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_GROSS_OUTPUT",
    { positive: true },
  );
  const outputFee = uintString(
    quote.output_fee_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_OUTPUT_FEE",
  );
  const netOutput = uintString(
    quote.net_output_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_NET_OUTPUT",
    { positive: true },
  );
  const minimumOutput = uintString(
    quote.minimum_output_amount,
    "INVALID_WC_VOID_PUBLIC_QUOTE_MINIMUM_OUTPUT",
    { positive: true },
  );

  const fees = normalizeFeeComponents(
    quote.fee_components,
    quote.input_asset,
    quote.output_asset,
  );
  if (
    fees.input_fee_amount !== inputFee.toString() ||
    fees.output_fee_amount !== outputFee.toString()
  ) {
    fail("WC_VOID_PUBLIC_QUOTE_FEE_COMPONENT_SUM_MISMATCH");
  }
  if (grossInput !== tradeInput + inputFee) {
    fail("WC_VOID_PUBLIC_QUOTE_INPUT_ACCOUNTING_MISMATCH");
  }
  if (grossOutput !== netOutput + outputFee) {
    fail("WC_VOID_PUBLIC_QUOTE_OUTPUT_ACCOUNTING_MISMATCH");
  }

  if (
    !Number.isSafeInteger(quote.slippage_bps) ||
    quote.slippage_bps < 0 ||
    quote.slippage_bps >= 10_000
  ) {
    fail("INVALID_WC_VOID_PUBLIC_QUOTE_SLIPPAGE_BPS");
  }
  const expectedMinimum =
    (netOutput * BigInt(10_000 - quote.slippage_bps)) / 10_000n;
  if (expectedMinimum <= 0n || minimumOutput !== expectedMinimum) {
    fail("WC_VOID_PUBLIC_QUOTE_MINIMUM_OUTPUT_MISMATCH");
  }

  const issuedAt = safeMs(
    quote.issued_at_ms,
    "INVALID_WC_VOID_PUBLIC_QUOTE_ISSUED_AT_MS",
  );
  const expiresAt = safeMs(
    quote.expires_at_ms,
    "INVALID_WC_VOID_PUBLIC_QUOTE_EXPIRES_AT_MS",
  );
  if (expiresAt <= issuedAt) {
    fail("WC_VOID_PUBLIC_QUOTE_EXPIRY_INVALID");
  }

  return Object.freeze({
    schema: quote.schema,
    quote_id: quote.quote_id,
    coupled_launch_id: quote.coupled_launch_id,
    market_state_id: quote.market_state_id,
    pair: quote.pair,
    direction: quote.direction,
    chain_id: quote.chain_id,
    network_identity: quote.network_identity,
    execution_epoch: quote.execution_epoch,
    void_token: quote.void_token,
    pricing_source: quote.pricing_source,
    presale_price_authority: quote.presale_price_authority,
    fixed_conversion: quote.fixed_conversion,
    input_asset: quote.input_asset,
    input_unit: quote.input_unit,
    output_asset: quote.output_asset,
    output_unit: quote.output_unit,
    gross_input_amount: grossInput.toString(),
    trade_input_amount: tradeInput.toString(),
    input_fee_amount: inputFee.toString(),
    gross_output_amount: grossOutput.toString(),
    output_fee_amount: outputFee.toString(),
    net_output_amount: netOutput.toString(),
    minimum_output_amount: minimumOutput.toString(),
    slippage_bps: quote.slippage_bps,
    issued_at_ms: issuedAt,
    expires_at_ms: expiresAt,
    native_gas_model: quote.native_gas_model,
    gas_metering_required: quote.gas_metering_required,
    participant_native_gas_balance_required:
      quote.participant_native_gas_balance_required,
    native_gas_economic_charge_atoms:
      quote.native_gas_economic_charge_atoms,
    fee_components: fees.fee_components,
  });
}

function quotePayload(normalized) {
  const {
    quote_id: _quoteId,
    ...payload
  } = normalized;
  return payload;
}

export function wcVoidPublicQuoteDisclosureIdV1(value) {
  const normalized = normalizeQuote(value);
  return digest(quotePayload(normalized));
}

export function verifyWcVoidPublicQuoteDisclosureV1(value) {
  const normalized = normalizeQuote(value);
  const expectedId = digest(quotePayload(normalized));
  if (normalized.quote_id !== expectedId) {
    fail("WC_VOID_PUBLIC_QUOTE_DIGEST_MISMATCH");
  }

  return Object.freeze({
    marker: VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1,
    ...normalized,
    public_quote_disclosure_ready: true,
    every_fee_component_disclosed: true,
    gross_net_accounting_verified: true,
    gas_model_disclosed: true,
    slippage_and_minimum_output_disclosed: true,
    expiry_disclosed: true,
    presale_price_authority_rejected: true,
    fixed_conversion_rejected: true,
    pricing_math_verified: false,
    reserve_custody_verified: false,
    runtime_publication_verified: false,
    quote_execution_authority: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority: VOID_WC_VOID_PUBLIC_QUOTE_AUTHORITY_V1,
  });
}
