#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_PUBLIC_QUOTE_AUTHORITY_V1,
  VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1,
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1,
  VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1,
  verifyWcVoidPublicQuoteDisclosureV1,
  wcVoidPublicQuoteDisclosureIdV1,
} from "../tools/void-wc-void-public-quote-disclosure-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("a");
const marketStateId = hash("b");

function finalizeId(value) {
  value.quote_id = wcVoidPublicQuoteDisclosureIdV1(value);
  return value;
}

function wcToVoidQuote() {
  return finalizeId({
    schema: VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1,
    quote_id: hash("0"),
    coupled_launch_id: launchId,
    market_state_id: marketStateId,
    pair: "WC_VOID",
    direction: "wc_to_void",
    chain_id: 2050,
    network_identity: "mainnet0",
    execution_epoch: 2,
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    pricing_source: "wc_void_market_state",
    presale_price_authority: false,
    fixed_conversion: false,
    input_asset: "WC",
    input_unit: "wc",
    output_asset: "VOID",
    output_unit: "void_token_atom",
    gross_input_amount: "105",
    trade_input_amount: "100",
    input_fee_amount: "5",
    gross_output_amount: "1000000000000000000000",
    output_fee_amount: "10000000000000000000",
    net_output_amount: "990000000000000000000",
    minimum_output_amount: "980100000000000000000",
    slippage_bps: 100,
    issued_at_ms: 1790360000000,
    expires_at_ms: 1790360060000,
    native_gas_model: "epoch2_metered_zero_gas_price_v1",
    gas_metering_required: true,
    participant_native_gas_balance_required: false,
    native_gas_economic_charge_atoms: "0",
    fee_components: [
      {
        code: "service_input",
        side: "input",
        asset: "WC",
        amount: "5",
      },
      {
        code: "market_output",
        side: "output",
        asset: "VOID",
        amount: "10000000000000000000",
      },
    ],
  });
}

function voidToWcQuote() {
  return finalizeId({
    schema: VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1,
    quote_id: hash("0"),
    coupled_launch_id: launchId,
    market_state_id: marketStateId,
    pair: "WC_VOID",
    direction: "void_to_wc",
    chain_id: 2050,
    network_identity: "mainnet0",
    execution_epoch: 2,
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    pricing_source: "wc_void_market_state",
    presale_price_authority: false,
    fixed_conversion: false,
    input_asset: "VOID",
    input_unit: "void_token_atom",
    output_asset: "WC",
    output_unit: "wc",
    gross_input_amount: "100000000000000000000",
    trade_input_amount: "100000000000000000000",
    input_fee_amount: "0",
    gross_output_amount: "20",
    output_fee_amount: "0",
    net_output_amount: "20",
    minimum_output_amount: "19",
    slippage_bps: 500,
    issued_at_ms: 1790360000000,
    expires_at_ms: 1790360060000,
    native_gas_model: "epoch2_metered_zero_gas_price_v1",
    gas_metering_required: true,
    participant_native_gas_balance_required: false,
    native_gas_economic_charge_atoms: "0",
    fee_components: [],
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rejects(value, code) {
  assert.throws(
    () => verifyWcVoidPublicQuoteDisclosureV1(value),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.deepEqual(
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1,
  {
    chain_id: 2050,
    network_identity: "mainnet0",
    execution_epoch: 2,
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    native_gas_model: "epoch2_metered_zero_gas_price_v1",
    gas_metering_required: true,
    participant_native_gas_balance_required: false,
    native_gas_economic_charge_atoms: "0",
  },
);

for (const quote of [wcToVoidQuote(), voidToWcQuote()]) {
  const verified = verifyWcVoidPublicQuoteDisclosureV1(quote);
  assert.equal(verified.marker, VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1);
  assert.match(verified.quote_id, /^sha256:[0-9a-f]{64}$/);
  assert.equal(verified.public_quote_disclosure_ready, true);
  assert.equal(verified.every_fee_component_disclosed, true);
  assert.equal(verified.gross_net_accounting_verified, true);
  assert.equal(verified.gas_model_disclosed, true);
  assert.equal(verified.slippage_and_minimum_output_disclosed, true);
  assert.equal(verified.expiry_disclosed, true);
  assert.equal(verified.presale_price_authority_rejected, true);
  assert.equal(verified.fixed_conversion_rejected, true);
  assert.equal(verified.pricing_math_verified, false);
  assert.equal(verified.reserve_custody_verified, false);
  assert.equal(verified.runtime_publication_verified, false);
  assert.equal(verified.quote_execution_authority, false);
  assert.equal(verified.market_activation_authority, false);
  assert.equal(verified.public_presale_activation_authority, false);
  assert.equal(verified.funds_movement_authority, false);
}

const first = wcToVoidQuote();
const reordered = clone(first);
reordered.fee_components.reverse();
reordered.quote_id = wcVoidPublicQuoteDisclosureIdV1(reordered);
assert.equal(reordered.quote_id, first.quote_id);
assert.deepEqual(
  verifyWcVoidPublicQuoteDisclosureV1(reordered).fee_components,
  verifyWcVoidPublicQuoteDisclosureV1(first).fee_components,
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_PUBLIC_QUOTE_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" || key === "disclosure_only"
      ? value
      : !value,
    true,
    key,
  );
}

{
  const bad = clone(first);
  bad.input_fee_amount = "4";
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_FEE_COMPONENT_SUM_MISMATCH");
}

{
  const bad = clone(first);
  bad.trade_input_amount = "99";
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_INPUT_ACCOUNTING_MISMATCH");
}

{
  const bad = clone(first);
  bad.net_output_amount = "989000000000000000000";
  bad.minimum_output_amount = "979110000000000000000";
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_OUTPUT_ACCOUNTING_MISMATCH");
}

{
  const bad = clone(first);
  bad.minimum_output_amount = "1";
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_MINIMUM_OUTPUT_MISMATCH");
}

{
  const bad = clone(first);
  bad.expires_at_ms = bad.issued_at_ms;
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_EXPIRY_INVALID");
}

{
  const bad = clone(first);
  bad.native_gas_model = "participant_pays_native_gas";
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_GAS_DISCLOSURE_MISMATCH");
}

{
  const bad = clone(first);
  bad.native_gas_economic_charge_atoms = "1";
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_GAS_DISCLOSURE_MISMATCH");
}

{
  const bad = clone(first);
  bad.presale_price_authority = true;
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_PRICING_AUTHORITY_MISMATCH");
}

{
  const bad = clone(first);
  bad.fixed_conversion = true;
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_PRICING_AUTHORITY_MISMATCH");
}

{
  const bad = clone(first);
  bad.fee_components[0].asset = "VOID";
  assert.throws(
    () => wcVoidPublicQuoteDisclosureIdV1(bad),
    (error) => error instanceof Error &&
      error.message === "WC_VOID_PUBLIC_QUOTE_FEE_ASSET_MISMATCH",
  );
}

{
  const bad = clone(first);
  bad.fee_components.push(clone(bad.fee_components[0]));
  assert.throws(
    () => wcVoidPublicQuoteDisclosureIdV1(bad),
    (error) => error instanceof Error &&
      error.message === "DUPLICATE_WC_VOID_PUBLIC_QUOTE_FEE_CODE",
  );
}

{
  const bad = clone(first);
  bad.chain_id = 1;
  bad.quote_id = hash("0");
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_MISMATCH");
}

{
  const bad = clone(first);
  bad.quote_id = hash("f");
  rejects(bad, "WC_VOID_PUBLIC_QUOTE_DIGEST_MISMATCH");
}

const source = fs.readFileSync(
  "tools/void-wc-void-public-quote-disclosure-v1.mjs",
  "utf8",
);
assert.doesNotMatch(
  source,
  /mnemonic|PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|new\s+Wallet\s*\(|fromPhrase\s*\(|fromMnemonic\s*\(/i,
);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/i);
assert.doesNotMatch(source, /appendFileSync|writeFileSync|renameSync/);
assert.doesNotMatch(source, /100\s*WC\s*=\s*1\s*VOID/i);
assert.match(source, /epoch2_metered_zero_gas_price_v1/);
assert.match(source, /presale_price_authority/);
assert.match(source, /minimum_output_amount/);

console.log("VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1_GREEN");
console.log("public_quote_disclosure_ready=true");
console.log("every_fee_component_disclosed=true");
console.log("gross_net_accounting_verified=true");
console.log("gas_model=epoch2_metered_zero_gas_price_v1");
console.log("participant_native_gas_balance_required=false");
console.log("native_gas_economic_charge_atoms=0");
console.log("slippage_and_minimum_output_disclosed=true");
console.log("expiry_disclosed=true");
console.log("presale_price_authority=false");
console.log("fixed_conversion=false");
console.log("pricing_math_verified=false");
console.log("quote_execution_authority=false");
console.log("market_activation=false");
console.log("funds_movement=false");
