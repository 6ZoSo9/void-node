#!/usr/bin/env node

import crypto from "node:crypto";

export const VOID_BTC_VOID_BITCOIN_HTLC_V1 =
  "VOID_BTC_VOID_BITCOIN_HTLC_V1";

export const VOID_BTC_VOID_BITCOIN_HTLC_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    deterministic_script_construction: true,
    deterministic_script_parsing: true,
    bitcoin_rpc_call: false,
    bitcoin_mainnet_contact: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    sighash_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_rpc_call: false,
    inventory_reservation: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SCHEMA = "void.btc_void.bitcoin_htlc_script.v1";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const HEX = /^[0-9a-f]*$/u;
const LOCKTIME_THRESHOLD = 500_000_000;
const MAX_LOCKTIME = 0xffff_ffff;
const MAX_STDIN_BYTES = 64 * 1024;

const OP_0 = 0x00;
const OP_1 = 0x51;
const OP_16 = 0x60;
const OP_IF = 0x63;
const OP_ELSE = 0x67;
const OP_ENDIF = 0x68;
const OP_DROP = 0x75;
const OP_DUP = 0x76;
const OP_SIZE = 0x82;
const OP_EQUALVERIFY = 0x88;
const OP_SHA256 = 0xa8;
const OP_HASH160 = 0xa9;
const OP_CHECKSIG = 0xac;
const OP_CHECKLOCKTIMEVERIFY = 0xb1;

function fail(code) {
  throw new Error(code);
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("htlc_canonical_integer_required");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("htlc_canonical_value_unsupported");
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function contentId(prefix, value) {
  return (
    prefix +
    crypto
      .createHash("sha256")
      .update(Buffer.from(canonicalJson(value), "utf8"))
      .digest("hex")
  );
}

function fixedHex(value, pattern, code) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code);
  return value;
}

function pushData(bytes) {
  if (!Buffer.isBuffer(bytes)) fail("htlc_pushdata_buffer_required");
  if (bytes.length < 1 || bytes.length > 75) {
    fail("htlc_pushdata_length_unsupported");
  }
  return Buffer.concat([Buffer.from([bytes.length]), bytes]);
}

function encodeScriptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_LOCKTIME) {
    fail("htlc_script_number_invalid");
  }
  if (value === 0) return Buffer.alloc(0);
  let remaining = BigInt(value);
  const out = [];
  while (remaining > 0n) {
    out.push(Number(remaining & 0xffn));
    remaining >>= 8n;
  }
  if ((out[out.length - 1] & 0x80) !== 0) out.push(0x00);
  return Buffer.from(out);
}

function pushScriptInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_LOCKTIME) {
    fail("htlc_script_integer_invalid");
  }
  if (value === 0) return Buffer.from([OP_0]);
  if (value >= 1 && value <= 16) {
    return Buffer.from([OP_1 + value - 1]);
  }
  return pushData(encodeScriptNumber(value));
}

function decodeScriptNumber(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 5) {
    fail("htlc_script_number_bytes_invalid");
  }
  if ((bytes[bytes.length - 1] & 0x80) !== 0) {
    fail("htlc_negative_script_number_forbidden");
  }
  let value = 0n;
  for (let index = 0; index < bytes.length; index += 1) {
    value |= BigInt(bytes[index]) << BigInt(8 * index);
  }
  if (value > BigInt(MAX_LOCKTIME)) fail("htlc_script_number_overflow");
  const number = Number(value);
  if (!encodeScriptNumber(number).equals(bytes)) {
    fail("htlc_nonminimal_script_number");
  }
  return number;
}

function locktimeType(value) {
  return value < LOCKTIME_THRESHOLD ? "block_height" : "unix_timestamp";
}

function buildWitnessScript({
  hashlock_hex,
  redeem_pubkey_hash160,
  refund_pubkey_hash160,
  refund_locktime,
}) {
  const hashlock = Buffer.from(
    fixedHex(hashlock_hex, HEX64, "htlc_hashlock_invalid"),
    "hex",
  );
  const redeem = Buffer.from(
    fixedHex(
      redeem_pubkey_hash160,
      HEX40,
      "htlc_redeem_pubkey_hash160_invalid",
    ),
    "hex",
  );
  const refund = Buffer.from(
    fixedHex(
      refund_pubkey_hash160,
      HEX40,
      "htlc_refund_pubkey_hash160_invalid",
    ),
    "hex",
  );
  if (
    !Number.isSafeInteger(refund_locktime) ||
    refund_locktime < 1 ||
    refund_locktime > MAX_LOCKTIME
  ) {
    fail("htlc_refund_locktime_invalid");
  }
  if (redeem.equals(refund)) fail("htlc_redeem_refund_roles_must_differ");

  return Buffer.concat([
    Buffer.from([OP_IF, OP_SIZE]),
    pushScriptInteger(32),
    Buffer.from([OP_EQUALVERIFY, OP_SHA256]),
    pushData(hashlock),
    Buffer.from([OP_EQUALVERIFY, OP_DUP, OP_HASH160]),
    pushData(redeem),
    Buffer.from([OP_EQUALVERIFY, OP_CHECKSIG, OP_ELSE]),
    pushScriptInteger(refund_locktime),
    Buffer.from([
      OP_CHECKLOCKTIMEVERIFY,
      OP_DROP,
      OP_DUP,
      OP_HASH160,
    ]),
    pushData(refund),
    Buffer.from([OP_EQUALVERIFY, OP_CHECKSIG, OP_ENDIF]),
  ]);
}

function materialFor(input) {
  const witnessScript = buildWitnessScript(input);
  if (witnessScript.length > 10_000) fail("htlc_witness_script_too_large");
  const witnessProgram = sha256Hex(witnessScript);
  const scriptPubKey = Buffer.concat([
    Buffer.from([OP_0, 0x20]),
    Buffer.from(witnessProgram, "hex"),
  ]);
  return Object.freeze({
    schema: SCHEMA,
    marker: VOID_BTC_VOID_BITCOIN_HTLC_V1,
    version: 1,
    hashlock_hex: input.hashlock_hex,
    hash_function: "SHA256",
    required_preimage_bytes: 32,
    redeem_pubkey_hash160: input.redeem_pubkey_hash160,
    refund_pubkey_hash160: input.refund_pubkey_hash160,
    refund_locktime: input.refund_locktime,
    refund_locktime_type: locktimeType(input.refund_locktime),
    witness_script_hex: witnessScript.toString("hex"),
    witness_script_bytes: witnessScript.length,
    witness_script_sha256: witnessProgram,
    p2wsh_version: 0,
    p2wsh_witness_program_hex: witnessProgram,
    p2wsh_script_pubkey_hex: scriptPubKey.toString("hex"),
    p2wsh_script_pubkey_bytes: scriptPubKey.length,
    redeem_witness_items: Object.freeze([
      "signature",
      "compressed_pubkey",
      "32_byte_preimage",
      "01",
      "witness_script",
    ]),
    refund_witness_items: Object.freeze([
      "signature",
      "compressed_pubkey",
      "",
      "witness_script",
    ]),
    redeem_spend_requirements: Object.freeze({
      compressed_pubkey_required_for_standard_segwit_v0_relay: true,
      minimal_if_selector_must_be_01: true,
      redeem_pubkey_hash160_signature_required: true,
    }),
    refund_spend_requirements: Object.freeze({
      transaction_nlocktime_at_least_refund_locktime: true,
      transaction_locktime_type_must_match_refund_locktime_type: true,
      spending_input_sequence_must_not_equal_uint32_max: true,
      compressed_pubkey_required_for_standard_segwit_v0_relay: true,
      minimal_if_selector_must_be_empty_vector: true,
      refund_pubkey_hash160_signature_required: true,
    }),
    script_network_neutral: true,
    transaction_construction_included: false,
    signing_included: false,
    authority: VOID_BTC_VOID_BITCOIN_HTLC_AUTHORITY_V1,
  });
}

export function buildVoidBtcVoidBitcoinHtlcV1(raw) {
  const input = exactObject(
    structuredClone(raw),
    [
      "hashlock_hex",
      "redeem_pubkey_hash160",
      "refund_pubkey_hash160",
      "refund_locktime",
    ],
    "htlc_input_shape_invalid",
  );
  const material = materialFor(input);
  return Object.freeze({
    ...material,
    htlc_id: contentId("voidbtchtlc1_", material),
  });
}

function readDirectPush(bytes, cursor, expectedLength, code) {
  if (cursor.offset >= bytes.length) fail(code);
  const opcode = bytes[cursor.offset];
  cursor.offset += 1;
  if (opcode !== expectedLength) fail(code);
  if (cursor.offset + expectedLength > bytes.length) fail(code);
  const value = bytes.subarray(cursor.offset, cursor.offset + expectedLength);
  cursor.offset += expectedLength;
  return Buffer.from(value);
}

function readScriptInteger(bytes, cursor) {
  if (cursor.offset >= bytes.length) fail("htlc_script_integer_missing");
  const opcode = bytes[cursor.offset];
  cursor.offset += 1;
  if (opcode === OP_0) return 0;
  if (opcode >= OP_1 && opcode <= OP_16) {
    return opcode - OP_1 + 1;
  }
  if (opcode < 1 || opcode > 5) fail("htlc_script_integer_push_invalid");
  if (cursor.offset + opcode > bytes.length) {
    fail("htlc_script_integer_truncated");
  }
  const value = Buffer.from(
    bytes.subarray(cursor.offset, cursor.offset + opcode),
  );
  cursor.offset += opcode;
  return decodeScriptNumber(value);
}

function expectOpcode(bytes, cursor, opcode, code) {
  if (cursor.offset >= bytes.length || bytes[cursor.offset] !== opcode) {
    fail(code);
  }
  cursor.offset += 1;
}

export function parseVoidBtcVoidBitcoinHtlcV1(raw) {
  const input = exactObject(
    structuredClone(raw),
    ["witness_script_hex"],
    "htlc_parse_input_shape_invalid",
  );
  if (
    typeof input.witness_script_hex !== "string" ||
    input.witness_script_hex.length < 2 ||
    input.witness_script_hex.length % 2 !== 0 ||
    !HEX.test(input.witness_script_hex)
  ) {
    fail("htlc_witness_script_hex_invalid");
  }
  const bytes = Buffer.from(input.witness_script_hex, "hex");
  if (bytes.length > 10_000) fail("htlc_witness_script_too_large");
  const cursor = { offset: 0 };

  expectOpcode(bytes, cursor, OP_IF, "htlc_opcode_if_missing");
  expectOpcode(bytes, cursor, OP_SIZE, "htlc_opcode_size_missing");
  if (readScriptInteger(bytes, cursor) !== 32) {
    fail("htlc_preimage_size_guard_invalid");
  }
  expectOpcode(
    bytes,
    cursor,
    OP_EQUALVERIFY,
    "htlc_preimage_size_equalverify_missing",
  );
  expectOpcode(bytes, cursor, OP_SHA256, "htlc_opcode_sha256_missing");
  const hashlock = readDirectPush(
    bytes,
    cursor,
    32,
    "htlc_hashlock_push_invalid",
  );
  expectOpcode(
    bytes,
    cursor,
    OP_EQUALVERIFY,
    "htlc_hashlock_equalverify_missing",
  );
  expectOpcode(bytes, cursor, OP_DUP, "htlc_redeem_dup_missing");
  expectOpcode(bytes, cursor, OP_HASH160, "htlc_redeem_hash160_missing");
  const redeem = readDirectPush(
    bytes,
    cursor,
    20,
    "htlc_redeem_pubkey_hash_push_invalid",
  );
  expectOpcode(
    bytes,
    cursor,
    OP_EQUALVERIFY,
    "htlc_redeem_equalverify_missing",
  );
  expectOpcode(bytes, cursor, OP_CHECKSIG, "htlc_redeem_checksig_missing");
  expectOpcode(bytes, cursor, OP_ELSE, "htlc_opcode_else_missing");

  const refundLocktime = readScriptInteger(bytes, cursor);
  if (refundLocktime < 1 || refundLocktime > MAX_LOCKTIME) {
    fail("htlc_refund_locktime_invalid");
  }
  expectOpcode(
    bytes,
    cursor,
    OP_CHECKLOCKTIMEVERIFY,
    "htlc_cltv_missing",
  );
  expectOpcode(bytes, cursor, OP_DROP, "htlc_cltv_drop_missing");
  expectOpcode(bytes, cursor, OP_DUP, "htlc_refund_dup_missing");
  expectOpcode(bytes, cursor, OP_HASH160, "htlc_refund_hash160_missing");
  const refund = readDirectPush(
    bytes,
    cursor,
    20,
    "htlc_refund_pubkey_hash_push_invalid",
  );
  expectOpcode(
    bytes,
    cursor,
    OP_EQUALVERIFY,
    "htlc_refund_equalverify_missing",
  );
  expectOpcode(bytes, cursor, OP_CHECKSIG, "htlc_refund_checksig_missing");
  expectOpcode(bytes, cursor, OP_ENDIF, "htlc_opcode_endif_missing");
  if (cursor.offset !== bytes.length) fail("htlc_trailing_script_bytes");

  const rebuilt = buildVoidBtcVoidBitcoinHtlcV1({
    hashlock_hex: hashlock.toString("hex"),
    redeem_pubkey_hash160: redeem.toString("hex"),
    refund_pubkey_hash160: refund.toString("hex"),
    refund_locktime: refundLocktime,
  });
  if (rebuilt.witness_script_hex !== input.witness_script_hex) {
    fail("htlc_noncanonical_script_encoding");
  }
  return rebuilt;
}

async function readBoundedStdin() {
  process.stdin.setEncoding("utf8");
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk;
    if (Buffer.byteLength(text, "utf8") > MAX_STDIN_BYTES) {
      fail("htlc_stdin_too_large");
    }
  }
  if (!text.trim()) fail("htlc_stdin_empty");
  return text;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!["build", "parse"].includes(command) || rest.length > 0) {
    fail(
      "usage: void-btc-void-bitcoin-htlc-v1.mjs <build|parse> < input.json",
    );
  }
  const text = await readBoundedStdin();
  let input;
  try {
    input = JSON.parse(text);
  } catch {
    fail("htlc_stdin_json_invalid");
  }
  const result =
    command === "build"
      ? buildVoidBtcVoidBitcoinHtlcV1(input)
      : parseVoidBtcVoidBitcoinHtlcV1(input);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(String(error?.message || error) + "\n");
    process.exitCode = 1;
  });
}
