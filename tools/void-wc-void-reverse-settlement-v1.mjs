import { createHash } from "node:crypto";
import {
  Interface,
  getAddress,
  id,
} from "ethers";

import {
  VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1,
  verifyWcVoidPublicQuoteDisclosureV1,
} from "./void-wc-void-public-quote-disclosure-v1.mjs";

export const VOID_WC_VOID_REVERSE_SETTLEMENT_V1 =
  "VOID_WC_VOID_REVERSE_SETTLEMENT_V1";

export const VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1 =
  "void-wc-ledger-reverse-settlement-v1";

export const VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_SCHEMA_V1 =
  "void.wc-void-reverse-settlement-policy.v1";

const REVERSE_SETTLEMENT_POLICY_PAYLOAD = Object.freeze({
  schema: VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_SCHEMA_V1,
  version: 1,
  adapter_id: VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
  pair: "WC_VOID",
  direction: "void_to_wc",
  canonical_void_token_required: true,
  participant_transfer_method: "erc20_transfer",
  transfer_recipient: "market_vault",
  transfer_amount_basis: "gross_void_input",
  exact_one_transfer_log_required: true,
  credit_kind: "credit",
  credit_reason: "wc_void_reverse_settlement_v1",
  credit_amount_basis: "net_wc_output",
  source_domain: "void-work-credit-ledger",
  quote_asset_form: "ledger-credit",
  quote_unit: "wc",
  quote_decimals: 0,
  native_gas_model: "epoch2_metered_zero_gas_price_v1",
  participant_native_gas_balance_required: false,
  native_gas_economic_charge_atoms: "0",
  fixed_conversion: false,
  presale_price_authority: false,
  authenticated_quote_envelope_required: true,
  pricing_math_verified: false,
  quote_publisher_authenticity_verified: false,
  receipt_provenance_verified: false,
  market_vault_custody_verified: false,
  runtime_or_launch_evidence: false,
  source_only: true,
});

export const VOID_WC_VOID_REVERSE_SETTLEMENT_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    receipt_rpc_access: false,
    runtime_or_launch_evidence: false,
    receipt_provenance_verified: false,
    pricing_authority: false,
    quote_execution: false,
    ledger_write: false,
    wc_issuance: false,
    wc_balance_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const TOP_KEYS = Object.freeze([
  "quote",
  "market_vault",
  "wc_account",
  "transaction",
  "receipt",
  "credit",
]);

const TRANSACTION_KEYS = Object.freeze([
  "hash",
  "from",
  "to",
  "input",
  "chainId",
]);

const RECEIPT_KEYS = Object.freeze([
  "transactionHash",
  "status",
  "blockNumber",
  "blockHash",
  "logs",
]);

const LOG_KEYS = Object.freeze([
  "address",
  "topics",
  "data",
  "logIndex",
  "transactionHash",
]);

const CREDIT_KEYS = Object.freeze([
  "kind",
  "account",
  "delta",
  "ts_ms",
  "reason",
  "settlement_id",
  "quote_id",
  "coupled_launch_id",
  "market_state_id",
  "participant_address",
  "market_vault",
  "void_transfer_tx_hash",
  "void_transfer_log_index",
  "void_amount_atoms",
  "wc_amount",
  "market_meta",
]);

const CREDIT_META_KEYS = Object.freeze([
  "adapter_id",
  "pair",
  "direction",
  "source_domain",
  "quote_asset_form",
  "quote_unit",
  "quote_decimals",
  "fixed_price",
  "presale_price_authority",
  "native_gas_model",
  "native_gas_economic_charge_atoms",
]);

const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE_ACCOUNT = /^[A-Za-z0-9._:@-]{3,128}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const MAX_RECEIPT_LOGS = 1_024;
const MAX_SAFE_WC = BigInt(Number.MAX_SAFE_INTEGER);

const TRANSFER_TOPIC =
  id("Transfer(address,address,uint256)").toLowerCase();

const TOKEN_INTERFACE = new Interface([
  "function transfer(address to,uint256 amount) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotExpectedFields(value, keys, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== "string")) throw null;
    const actual = ownKeys.sort(compareText);
    const expected = [...keys].sort(compareText);
    if (
      actual.length !== expected.length ||
      actual.some((key, index) => key !== expected[index])
    ) {
      throw null;
    }

    const snapshot = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    fail(code);
  }
}

function snapshotArray(value, max, code) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const lengthDescriptor = descriptors.length;
    if (
      !lengthDescriptor ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      lengthDescriptor.enumerable !== false ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      lengthDescriptor.value > max ||
      Reflect.ownKeys(descriptors).length !== lengthDescriptor.value + 1
    ) {
      throw null;
    }
    const out = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out.push(descriptor.value);
    }
    return out;
  } catch {
    fail(code);
  }
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

export const VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1 =
  Object.freeze({
    ...REVERSE_SETTLEMENT_POLICY_PAYLOAD,
    policy_id: digest(REVERSE_SETTLEMENT_POLICY_PAYLOAD),
  });

function normalizeAddress(value, code) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) {
    fail(code);
  }
  try {
    const normalized = getAddress(value).toLowerCase();
    if (!ADDRESS.test(normalized) ||
        normalized === "0x0000000000000000000000000000000000000000") {
      fail(code);
    }
    return normalized;
  } catch {
    fail(code);
  }
}

function normalizeHash(value, code) {
  if (typeof value !== "string") fail(code);
  const normalized = value.toLowerCase();
  if (!HASH.test(normalized)) fail(code);
  return normalized;
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalUint(value, code, { positive = false } = {}) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function quantity(value, code, { positive = false } = {}) {
  let parsed;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) fail(code);
    parsed = BigInt(value);
  } else if (
    typeof value === "string" &&
    HEX_QUANTITY.test(value)
  ) {
    parsed = BigInt(value);
  } else if (
    typeof value === "string" &&
    UINT.test(value)
  ) {
    parsed = BigInt(value);
  } else {
    fail(code);
  }
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function safeMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function normalizeWcAccount(value) {
  if (typeof value !== "string" || !SAFE_ACCOUNT.test(value)) {
    fail("INVALID_WC_VOID_REVERSE_WC_ACCOUNT");
  }
  return value;
}

function parseTransferTransaction(raw, quote, marketVault) {
  const tx = snapshotExpectedFields(
    raw,
    TRANSACTION_KEYS,
    "INVALID_WC_VOID_REVERSE_TRANSACTION_SHAPE",
  );

  const transactionHash = normalizeHash(
    tx.hash,
    "INVALID_WC_VOID_REVERSE_TRANSACTION_HASH",
  );
  const participant = normalizeAddress(
    tx.from,
    "INVALID_WC_VOID_REVERSE_PARTICIPANT_ADDRESS",
  );
  const token = normalizeAddress(
    tx.to,
    "INVALID_WC_VOID_REVERSE_TRANSACTION_TO",
  );
  if (token !== quote.void_token.toLowerCase()) {
    fail("WC_VOID_REVERSE_TRANSACTION_TOKEN_MISMATCH");
  }
  if (
    quantity(tx.chainId, "INVALID_WC_VOID_REVERSE_TRANSACTION_CHAIN_ID") !==
    BigInt(quote.chain_id)
  ) {
    fail("WC_VOID_REVERSE_TRANSACTION_CHAIN_ID_MISMATCH");
  }
  if (typeof tx.input !== "string") {
    fail("INVALID_WC_VOID_REVERSE_TRANSACTION_INPUT");
  }

  let decoded;
  try {
    decoded = TOKEN_INTERFACE.decodeFunctionData("transfer", tx.input);
  } catch {
    fail("WC_VOID_REVERSE_TRANSACTION_NOT_TRANSFER");
  }

  const transferTo = normalizeAddress(
    String(decoded[0]),
    "INVALID_WC_VOID_REVERSE_TRANSFER_TO",
  );
  const transferAmount = BigInt(decoded[1]);
  if (transferTo !== marketVault) {
    fail("WC_VOID_REVERSE_TRANSFER_VAULT_MISMATCH");
  }
  if (transferAmount !== BigInt(quote.gross_input_amount)) {
    fail("WC_VOID_REVERSE_TRANSFER_AMOUNT_MISMATCH");
  }

  return Object.freeze({
    transaction_hash: transactionHash,
    participant_address: participant,
    void_token: token,
    market_vault: marketVault,
    transfer_amount_atoms: transferAmount.toString(),
  });
}

function parseTransferReceipt(raw, tx, quote) {
  const receipt = snapshotExpectedFields(
    raw,
    RECEIPT_KEYS,
    "INVALID_WC_VOID_REVERSE_RECEIPT_SHAPE",
  );

  if (
    normalizeHash(
      receipt.transactionHash,
      "INVALID_WC_VOID_REVERSE_RECEIPT_TRANSACTION_HASH",
    ) !== tx.transaction_hash
  ) {
    fail("WC_VOID_REVERSE_RECEIPT_TRANSACTION_MISMATCH");
  }
  if (
    quantity(receipt.status, "INVALID_WC_VOID_REVERSE_RECEIPT_STATUS") !== 1n
  ) {
    fail("WC_VOID_REVERSE_RECEIPT_NOT_SUCCESS");
  }

  const blockNumber = quantity(
    receipt.blockNumber,
    "INVALID_WC_VOID_REVERSE_RECEIPT_BLOCK_NUMBER",
    { positive: true },
  );
  const blockHash = normalizeHash(
    receipt.blockHash,
    "INVALID_WC_VOID_REVERSE_RECEIPT_BLOCK_HASH",
  );

  const logs = snapshotArray(
    receipt.logs,
    MAX_RECEIPT_LOGS,
    "INVALID_WC_VOID_REVERSE_RECEIPT_LOG_SET",
  );

  const matches = [];
  for (const rawLog of logs) {
    const log = snapshotExpectedFields(
      rawLog,
      LOG_KEYS,
      "INVALID_WC_VOID_REVERSE_RECEIPT_LOG_SHAPE",
    );
    const logAddress = normalizeAddress(
      log.address,
      "INVALID_WC_VOID_REVERSE_RECEIPT_LOG_ADDRESS",
    );
    if (logAddress !== quote.void_token.toLowerCase()) continue;

    const topics = snapshotArray(
      log.topics,
      4,
      "INVALID_WC_VOID_REVERSE_RECEIPT_TOPIC_SET",
    );
    if (
      topics.length === 0 ||
      typeof topics[0] !== "string" ||
      topics[0].toLowerCase() !== TRANSFER_TOPIC
    ) {
      continue;
    }

    if (
      normalizeHash(
        log.transactionHash,
        "INVALID_WC_VOID_REVERSE_RECEIPT_LOG_TRANSACTION_HASH",
      ) !== tx.transaction_hash
    ) {
      fail("WC_VOID_REVERSE_RECEIPT_LOG_TRANSACTION_MISMATCH");
    }

    let parsed;
    try {
      parsed = TOKEN_INTERFACE.parseLog({
        topics,
        data: log.data,
      });
    } catch {
      fail("WC_VOID_REVERSE_TRANSFER_LOG_DECODE_FAILED");
    }
    if (!parsed || parsed.name !== "Transfer") {
      fail("WC_VOID_REVERSE_TRANSFER_LOG_DECODE_FAILED");
    }

    matches.push(Object.freeze({
      from: normalizeAddress(
        String(parsed.args[0]),
        "INVALID_WC_VOID_REVERSE_TRANSFER_LOG_FROM",
      ),
      to: normalizeAddress(
        String(parsed.args[1]),
        "INVALID_WC_VOID_REVERSE_TRANSFER_LOG_TO",
      ),
      value: BigInt(parsed.args[2]).toString(),
      log_index: quantity(
        log.logIndex,
        "INVALID_WC_VOID_REVERSE_TRANSFER_LOG_INDEX",
      ).toString(),
    }));
  }

  if (matches.length !== 1) {
    fail("WC_VOID_REVERSE_EXACT_ONE_TRANSFER_LOG_REQUIRED");
  }

  const transfer = matches[0];
  if (transfer.from !== tx.participant_address) {
    fail("WC_VOID_REVERSE_TRANSFER_LOG_FROM_MISMATCH");
  }
  if (transfer.to !== tx.market_vault) {
    fail("WC_VOID_REVERSE_TRANSFER_LOG_TO_MISMATCH");
  }
  if (transfer.value !== quote.gross_input_amount) {
    fail("WC_VOID_REVERSE_TRANSFER_LOG_VALUE_MISMATCH");
  }

  return Object.freeze({
    block_number: blockNumber.toString(),
    block_hash: blockHash,
    transfer_log_index: transfer.log_index,
  });
}

function settlementPayload(core) {
  return Object.freeze({
    schema: "void.wc-void-reverse-settlement.v1",
    quote_id: core.quote.quote_id,
    coupled_launch_id: core.quote.coupled_launch_id,
    market_state_id: core.quote.market_state_id,
    chain_id: core.quote.chain_id,
    execution_epoch: core.quote.execution_epoch,
    void_token: core.quote.void_token,
    participant_address: core.tx.participant_address,
    market_vault: core.tx.market_vault,
    void_transfer_tx_hash: core.tx.transaction_hash,
    void_transfer_log_index: core.receipt.transfer_log_index,
    void_transfer_block_number: core.receipt.block_number,
    void_transfer_block_hash: core.receipt.block_hash,
    gross_void_input_atoms: core.quote.gross_input_amount,
    trade_void_input_atoms: core.quote.trade_input_amount,
    input_fee_void_atoms: core.quote.input_fee_amount,
    gross_wc_output_units: core.quote.gross_output_amount,
    output_fee_wc_units: core.quote.output_fee_amount,
    net_wc_credit_units: core.quote.net_output_amount,
    native_gas_model: core.quote.native_gas_model,
    native_gas_economic_charge_atoms:
      core.quote.native_gas_economic_charge_atoms,
  });
}

function normalizeCore(raw) {
  const input = snapshotExpectedFields(
    raw,
    TOP_KEYS,
    "INVALID_WC_VOID_REVERSE_SETTLEMENT_SHAPE",
  );

  const quote = verifyWcVoidPublicQuoteDisclosureV1(input.quote);
  if (
    quote.direction !== "void_to_wc" ||
    quote.input_asset !== "VOID" ||
    quote.input_unit !== "void_token_atom" ||
    quote.output_asset !== "WC" ||
    quote.output_unit !== "wc"
  ) {
    fail("WC_VOID_REVERSE_SETTLEMENT_DIRECTION_MISMATCH");
  }

  const binding = VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1;
  if (
    quote.native_gas_model !== binding.native_gas_model ||
    quote.gas_metering_required !== true ||
    quote.participant_native_gas_balance_required !== false ||
    quote.native_gas_economic_charge_atoms !== "0"
  ) {
    fail("WC_VOID_REVERSE_SETTLEMENT_GAS_MODEL_MISMATCH");
  }

  const wcAccount = normalizeWcAccount(input.wc_account);
  const marketVault = normalizeAddress(
    input.market_vault,
    "INVALID_WC_VOID_REVERSE_MARKET_VAULT",
  );
  const tx = parseTransferTransaction(input.transaction, quote, marketVault);
  const receipt = parseTransferReceipt(input.receipt, tx, quote);

  return Object.freeze({
    input,
    quote,
    wc_account: wcAccount,
    tx,
    receipt,
  });
}

export function wcVoidReverseSettlementIdV1(value) {
  const core = normalizeCore(value);
  return digest(settlementPayload(core));
}

function verifyCredit(core, settlementId) {
  const credit = snapshotExpectedFields(
    core.input.credit,
    CREDIT_KEYS,
    "INVALID_WC_VOID_REVERSE_CREDIT_SHAPE",
  );
  const meta = snapshotExpectedFields(
    credit.market_meta,
    CREDIT_META_KEYS,
    "INVALID_WC_VOID_REVERSE_CREDIT_META_SHAPE",
  );

  if (credit.kind !== "credit") {
    fail("WC_VOID_REVERSE_CREDIT_KIND_MISMATCH");
  }
  if (credit.account !== core.wc_account) {
    fail("WC_VOID_REVERSE_CREDIT_ACCOUNT_MISMATCH");
  }

  const wc = canonicalUint(
    core.quote.net_output_amount,
    "INVALID_WC_VOID_REVERSE_NET_WC",
    { positive: true },
  );
  if (wc > MAX_SAFE_WC) {
    fail("WC_VOID_REVERSE_NET_WC_EXCEEDS_SAFE_LEDGER_DELTA");
  }
  if (
    !Number.isSafeInteger(credit.delta) ||
    credit.delta <= 0 ||
    BigInt(credit.delta) !== wc
  ) {
    fail("WC_VOID_REVERSE_CREDIT_DELTA_MISMATCH");
  }
  safeMs(credit.ts_ms, "INVALID_WC_VOID_REVERSE_CREDIT_TS_MS");

  if (credit.reason !== "wc_void_reverse_settlement_v1") {
    fail("WC_VOID_REVERSE_CREDIT_REASON_MISMATCH");
  }
  canonicalSha(
    credit.settlement_id,
    "INVALID_WC_VOID_REVERSE_SETTLEMENT_ID",
  );
  if (credit.settlement_id !== settlementId) {
    fail("WC_VOID_REVERSE_SETTLEMENT_ID_MISMATCH");
  }

  const exactPairs = [
    ["quote_id", core.quote.quote_id],
    ["coupled_launch_id", core.quote.coupled_launch_id],
    ["market_state_id", core.quote.market_state_id],
    ["participant_address", core.tx.participant_address],
    ["market_vault", core.tx.market_vault],
    ["void_transfer_tx_hash", core.tx.transaction_hash],
    ["void_transfer_log_index", core.receipt.transfer_log_index],
    ["void_amount_atoms", core.quote.gross_input_amount],
    ["wc_amount", core.quote.net_output_amount],
  ];
  for (const [key, expected] of exactPairs) {
    if (credit[key] !== expected) {
      fail("WC_VOID_REVERSE_CREDIT_BINDING_MISMATCH:" + key);
    }
  }

  const expectedMeta = Object.freeze({
    adapter_id: VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
    pair: "WC_VOID",
    direction: "void_to_wc",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    fixed_price: false,
    presale_price_authority: false,
    native_gas_model:
      VOID_WC_VOID_PUBLIC_QUOTE_EXECUTION_BINDING_V1.native_gas_model,
    native_gas_economic_charge_atoms: "0",
  });
  for (const key of CREDIT_META_KEYS) {
    if (meta[key] !== expectedMeta[key]) {
      fail("WC_VOID_REVERSE_CREDIT_META_MISMATCH:" + key);
    }
  }

  return Object.freeze({
    kind: "credit",
    account: credit.account,
    delta: credit.delta,
    ts_ms: credit.ts_ms,
    reason: credit.reason,
    settlement_id: credit.settlement_id,
    quote_id: credit.quote_id,
    coupled_launch_id: credit.coupled_launch_id,
    market_state_id: credit.market_state_id,
    participant_address: credit.participant_address,
    market_vault: credit.market_vault,
    void_transfer_tx_hash: credit.void_transfer_tx_hash,
    void_transfer_log_index: credit.void_transfer_log_index,
    void_amount_atoms: credit.void_amount_atoms,
    wc_amount: credit.wc_amount,
    market_meta: Object.freeze({ ...meta }),
  });
}

export function verifyWcVoidReverseSettlementV1(value) {
  const core = normalizeCore(value);
  const settlementId = digest(settlementPayload(core));
  const credit = verifyCredit(core, settlementId);

  return Object.freeze({
    marker: VOID_WC_VOID_REVERSE_SETTLEMENT_V1,
    settlement_id: settlementId,
    quote_id: core.quote.quote_id,
    coupled_launch_id: core.quote.coupled_launch_id,
    market_state_id: core.quote.market_state_id,
    participant_address: core.tx.participant_address,
    market_vault: core.tx.market_vault,
    void_token: core.quote.void_token,
    void_transfer_tx_hash: core.tx.transaction_hash,
    void_transfer_log_index: core.receipt.transfer_log_index,
    void_transfer_block_number: core.receipt.block_number,
    gross_void_input_atoms: core.quote.gross_input_amount,
    trade_void_input_atoms: core.quote.trade_input_amount,
    input_fee_void_atoms: core.quote.input_fee_amount,
    gross_wc_output_units: core.quote.gross_output_amount,
    output_fee_wc_units: core.quote.output_fee_amount,
    net_wc_credit_units: core.quote.net_output_amount,
    wc_account: core.wc_account,
    credit,
    reverse_void_to_wc_settlement_source_ready: true,
    exact_quote_transfer_credit_binding: true,
    transaction_transfer_calldata_verified: true,
    transaction_receipt_semantics_verified: true,
    exact_one_canonical_voidtoken_transfer_verified: true,
    canonical_wc_balance_credit_compatible: true,
    zero_native_gas_economic_charge_bound: true,
    pricing_math_verified: core.quote.pricing_math_verified,
    quote_publisher_authenticity_verified:
      core.quote.publisher_authenticity_verified,
    authenticated_quote_envelope_required:
      core.quote.authenticated_quote_envelope_required,
    market_vault_custody_verified: false,
    receipt_provenance_verified: false,
    runtime_or_launch_evidence: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    transaction_constructed: false,
    transaction_signed: false,
    transaction_broadcast: false,
    token_transfer_performed_by_this_verifier: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority: VOID_WC_VOID_REVERSE_SETTLEMENT_AUTHORITY_V1,
  });
}
