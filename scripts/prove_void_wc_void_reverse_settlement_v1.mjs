#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  Interface,
  id,
} from "ethers";

import {
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1,
  VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1,
  wcVoidPublicQuoteDisclosureIdV1,
} from "../tools/void-wc-void-public-quote-disclosure-v1.mjs";

import {
  VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
  VOID_WC_VOID_REVERSE_SETTLEMENT_AUTHORITY_V1,
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1,
  VOID_WC_VOID_REVERSE_SETTLEMENT_V1,
  verifyWcVoidReverseSettlementV1,
  wcVoidReverseSettlementIdV1,
} from "../tools/void-wc-void-reverse-settlement-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const txHash = (digit) => "0x" + String(digit).repeat(64);
const address = (digit) => "0x" + String(digit).repeat(40);

const launchId = hash("a");
const marketStateId = hash("b");
const token = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const participant = address("1");
const vault = address("2");
const other = address("3");

const iface = new Interface([
  "function transfer(address to,uint256 amount) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

function finalizeQuote(value) {
  value.quote_id = wcVoidPublicQuoteDisclosureIdV1(value);
  return value;
}

function reverseQuote() {
  return finalizeQuote({
    schema: VOID_WC_VOID_PUBLIC_QUOTE_SCHEMA_V1,
    quote_id: hash("0"),
    coupled_launch_id: launchId,
    market_state_id: marketStateId,
    pair: "WC_VOID",
    direction: "void_to_wc",
    chain_id: 2050,
    network_identity: "mainnet0",
    execution_epoch: 2,
    void_token: token,
    pricing_source: "wc_void_market_state",
    presale_price_authority: false,
    fixed_conversion: false,
    input_asset: "VOID",
    input_unit: "void_token_atom",
    output_asset: "WC",
    output_unit: "wc",
    gross_input_amount: "1000000000000000000",
    trade_input_amount: "990000000000000000",
    input_fee_amount: "10000000000000000",
    gross_output_amount: "1000",
    output_fee_amount: "10",
    net_output_amount: "990",
    minimum_output_amount: "981",
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
        asset: "VOID",
        amount: "10000000000000000",
      },
      {
        code: "market_output",
        side: "output",
        asset: "WC",
        amount: "10",
      },
    ],
  });
}

function transferLog({
  from = participant,
  to = vault,
  amount = 1000000000000000000n,
  logIndex = "0x0",
  hashValue = txHash("a"),
} = {}) {
  const encoded = iface.encodeEventLog(
    iface.getEvent("Transfer"),
    [from, to, amount],
  );
  return {
    address: token,
    topics: encoded.topics,
    data: encoded.data,
    logIndex,
    transactionHash: hashValue,
  };
}

function fixture() {
  const quote = reverseQuote();
  const transaction = {
    hash: txHash("a"),
    from: participant,
    to: token,
    input: iface.encodeFunctionData(
      "transfer",
      [vault, BigInt(quote.gross_input_amount)],
    ),
    chainId: "0x802",
  };
  const receipt = {
    transactionHash: transaction.hash,
    status: "0x1",
    blockNumber: "0x64",
    blockHash: txHash("b"),
    logs: [transferLog()],
  };

  const base = {
    quote,
    market_vault: vault,
    wc_account: "wc-reverse-alpha",
    transaction,
    receipt,
    credit: null,
  };
  const settlementId = wcVoidReverseSettlementIdV1(base);
  const credit = {
    kind: "credit",
    account: base.wc_account,
    delta: 990,
    ts_ms: 1790360001000,
    reason: "wc_void_reverse_settlement_v1",
    settlement_id: settlementId,
    quote_id: quote.quote_id,
    coupled_launch_id: quote.coupled_launch_id,
    market_state_id: quote.market_state_id,
    participant_address: participant,
    market_vault: vault,
    void_transfer_tx_hash: transaction.hash,
    void_transfer_log_index: "0",
    void_amount_atoms: quote.gross_input_amount,
    wc_amount: quote.net_output_amount,
    market_meta: {
      adapter_id: VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
      pair: "WC_VOID",
      direction: "void_to_wc",
      source_domain: "void-work-credit-ledger",
      quote_asset_form: "ledger-credit",
      quote_unit: "wc",
      quote_decimals: 0,
      fixed_price: false,
      presale_price_authority: false,
      native_gas_model: "epoch2_metered_zero_gas_price_v1",
      native_gas_economic_charge_atoms: "0",
    },
  };

  return {
    ...base,
    credit,
  };
}

function clone(value) {
  return structuredClone(value);
}

function rejects(value, code) {
  assert.throws(
    () => verifyWcVoidReverseSettlementV1(value),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const first = fixture();
const verified = verifyWcVoidReverseSettlementV1(first);

assert.equal(
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.policy_id,
  "sha256:073d3754f5bcd2b91558c5c8abd00bf721c545a3cd045edcc690ed17bbab31df",
);
assert.equal(
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.transfer_amount_basis,
  "gross_void_input",
);
assert.equal(
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.credit_amount_basis,
  "net_wc_output",
);
assert.equal(
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.native_gas_model,
  "epoch2_metered_zero_gas_price_v1",
);
assert.equal(
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.runtime_or_launch_evidence,
  false,
);

assert.equal(verified.marker, VOID_WC_VOID_REVERSE_SETTLEMENT_V1);
assert.match(verified.settlement_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(verified.quote_id, first.quote.quote_id);
assert.equal(verified.coupled_launch_id, launchId);
assert.equal(verified.market_state_id, marketStateId);
assert.equal(verified.participant_address, participant);
assert.equal(verified.market_vault, vault);
assert.equal(verified.void_token, token);
assert.equal(verified.void_transfer_tx_hash, txHash("a"));
assert.equal(verified.void_transfer_log_index, "0");
assert.equal(verified.void_transfer_block_number, "100");
assert.equal(verified.gross_void_input_atoms, "1000000000000000000");
assert.equal(verified.trade_void_input_atoms, "990000000000000000");
assert.equal(verified.input_fee_void_atoms, "10000000000000000");
assert.equal(verified.gross_wc_output_units, "1000");
assert.equal(verified.output_fee_wc_units, "10");
assert.equal(verified.net_wc_credit_units, "990");
assert.equal(verified.wc_account, "wc-reverse-alpha");
assert.equal(verified.credit.kind, "credit");
assert.equal(verified.credit.delta, 990);
assert.equal(
  verified.credit.market_meta.adapter_id,
  VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
);
assert.equal(verified.reverse_void_to_wc_settlement_source_ready, true);
assert.equal(verified.exact_quote_transfer_credit_binding, true);
assert.equal(verified.transaction_transfer_calldata_verified, true);
assert.equal(verified.transaction_receipt_semantics_verified, true);
assert.equal(verified.exact_one_canonical_voidtoken_transfer_verified, true);
assert.equal(verified.canonical_wc_balance_credit_compatible, true);
assert.equal(verified.zero_native_gas_economic_charge_bound, true);
assert.equal(verified.pricing_math_verified, false);
assert.equal(verified.quote_publisher_authenticity_verified, false);
assert.equal(verified.authenticated_quote_envelope_required, true);
assert.equal(verified.market_vault_custody_verified, false);
assert.equal(verified.receipt_provenance_verified, false);
assert.equal(verified.runtime_or_launch_evidence, false);
assert.equal(verified.ledger_write_performed, false);
assert.equal(verified.wc_balance_mutation_performed, false);
assert.equal(verified.transaction_constructed, false);
assert.equal(verified.transaction_signed, false);
assert.equal(verified.transaction_broadcast, false);
assert.equal(verified.token_transfer_performed_by_this_verifier, false);
assert.equal(verified.market_activation_authority, false);
assert.equal(verified.public_presale_activation_authority, false);
assert.equal(verified.funds_movement_authority, false);

assert.equal(
  wcVoidReverseSettlementIdV1({
    ...first,
    credit: null,
  }),
  first.credit.settlement_id,
);

{
  const bad = clone(first);
  bad.transaction.input = iface.encodeFunctionData(
    "transfer",
    [vault, BigInt(first.quote.trade_input_amount)],
  );
  rejects(bad, "WC_VOID_REVERSE_TRANSFER_AMOUNT_MISMATCH");
}

{
  const bad = clone(first);
  bad.transaction.to = other;
  rejects(bad, "WC_VOID_REVERSE_TRANSACTION_TOKEN_MISMATCH");
}

{
  const bad = clone(first);
  bad.transaction.chainId = "0x1";
  rejects(bad, "WC_VOID_REVERSE_TRANSACTION_CHAIN_ID_MISMATCH");
}

{
  const bad = clone(first);
  bad.receipt.status = "0x0";
  rejects(bad, "WC_VOID_REVERSE_RECEIPT_NOT_SUCCESS");
}

{
  const bad = clone(first);
  bad.receipt.logs[0] = transferLog({ from: other });
  rejects(bad, "WC_VOID_REVERSE_TRANSFER_LOG_FROM_MISMATCH");
}

{
  const bad = clone(first);
  bad.receipt.logs[0] = transferLog({ to: other });
  rejects(bad, "WC_VOID_REVERSE_TRANSFER_LOG_TO_MISMATCH");
}

{
  const bad = clone(first);
  bad.receipt.logs[0] = transferLog({
    amount: BigInt(first.quote.trade_input_amount),
  });
  rejects(bad, "WC_VOID_REVERSE_TRANSFER_LOG_VALUE_MISMATCH");
}

{
  const bad = clone(first);
  bad.receipt.logs.push(transferLog({ logIndex: "0x1" }));
  rejects(bad, "WC_VOID_REVERSE_EXACT_ONE_TRANSFER_LOG_REQUIRED");
}

{
  const bad = clone(first);
  bad.credit.delta = 989;
  rejects(bad, "WC_VOID_REVERSE_CREDIT_DELTA_MISMATCH");
}

{
  const bad = clone(first);
  bad.credit.account = "wc-reverse-other";
  rejects(bad, "WC_VOID_REVERSE_CREDIT_ACCOUNT_MISMATCH");
}

{
  const bad = clone(first);
  bad.credit.settlement_id = hash("f");
  rejects(bad, "WC_VOID_REVERSE_SETTLEMENT_ID_MISMATCH");
}

{
  const bad = clone(first);
  bad.credit.void_amount_atoms = first.quote.trade_input_amount;
  rejects(
    bad,
    "WC_VOID_REVERSE_CREDIT_BINDING_MISMATCH:void_amount_atoms",
  );
}

{
  const bad = clone(first);
  bad.credit.wc_amount = first.quote.gross_output_amount;
  rejects(
    bad,
    "WC_VOID_REVERSE_CREDIT_BINDING_MISMATCH:wc_amount",
  );
}

{
  const bad = clone(first);
  bad.credit.market_meta.native_gas_model =
    "participant_pays_native_gas";
  rejects(
    bad,
    "WC_VOID_REVERSE_CREDIT_META_MISMATCH:native_gas_model",
  );
}

{
  const bad = clone(first);
  bad.quote.native_gas_economic_charge_atoms = "1";
  assert.throws(
    () => verifyWcVoidReverseSettlementV1(bad),
    (error) =>
      error instanceof Error &&
      error.message === "WC_VOID_PUBLIC_QUOTE_GAS_DISCLOSURE_MISMATCH",
  );
}

{
  const bad = clone(first);
  bad.transaction.input = "0x095ea7b3";
  rejects(bad, "WC_VOID_REVERSE_TRANSACTION_NOT_TRANSFER");
}

{
  const bad = clone(first);
  bad.receipt.logs = new Array(1025).fill(bad.receipt.logs[0]);
  rejects(bad, "INVALID_WC_VOID_REVERSE_RECEIPT_LOG_SET");
}

{
  let getterCalled = false;
  const bad = clone(first);
  Object.defineProperty(bad.transaction, "from", {
    enumerable: true,
    get() {
      getterCalled = true;
      return participant;
    },
  });
  rejects(bad, "INVALID_WC_VOID_REVERSE_TRANSACTION_SHAPE");
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_REVERSE_SETTLEMENT_AUTHORITY_V1,
)) {
  if (key === "source_only" || key === "explicit_input_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-reverse-settlement-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "appendFileSync",
  "writeFileSync",
  "renameSync",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.equal(
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1.native_gas_model,
  "epoch2_metered_zero_gas_price_v1",
);
assert.equal(
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1
    .participant_native_gas_balance_required,
  false,
);
assert.equal(
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1
    .native_gas_economic_charge_atoms,
  "0",
);
assert.match(
  source,
  /VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1/,
);
assert.match(source, /wc_void_reverse_settlement_v1/);
assert.match(source, /exact_quote_transfer_credit_binding/);

console.log("VOID_WC_VOID_REVERSE_SETTLEMENT_V1_GREEN");
console.log(
  "reverse_void_to_wc_settlement_policy_id=" +
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.policy_id,
);
console.log("reverse_void_to_wc_settlement_source_ready=true");
console.log("transfer_amount_basis=gross_void_input");
console.log("wc_credit_amount_basis=net_wc_output");
console.log("native_gas_model=epoch2_metered_zero_gas_price_v1");
console.log("native_gas_economic_charge_atoms=0");
console.log("canonical_wc_balance_credit_compatible=true");
console.log("pricing_math_verified=false");
console.log("quote_publisher_authenticity_verified=false");
console.log("receipt_provenance_verified=false");
console.log("runtime_or_launch_evidence=false");
console.log("ledger_write=false");
console.log("transaction_broadcast=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
