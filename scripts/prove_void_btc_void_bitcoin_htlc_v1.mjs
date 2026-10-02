#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BTC_VOID_BITCOIN_HTLC_AUTHORITY_V1,
  VOID_BTC_VOID_BITCOIN_HTLC_V1,
  buildVoidBtcVoidBitcoinHtlcV1,
  parseVoidBtcVoidBitcoinHtlcV1,
} from "../tools/void-btc-void-bitcoin-htlc-v1.mjs";

const VECTOR = Object.freeze({
  hashlock_hex: "00".repeat(32),
  redeem_pubkey_hash160: "11".repeat(20),
  refund_pubkey_hash160: "22".repeat(20),
  refund_locktime: 500,
});

const EXPECTED_SCRIPT =
  "6382012088a820" +
  "00".repeat(32) +
  "8876a914" +
  "11".repeat(20) +
  "88ac6702f401b17576a914" +
  "22".repeat(20) +
  "88ac68";

const EXPECTED_WITNESS_SHA256 =
  "332df199c5e46d14e7680bc0d188ab99ff8cff7fad1b7a95aae3bb58e5181d4f";
const EXPECTED_P2WSH_SCRIPT_PUBKEY =
  "0020332df199c5e46d14e7680bc0d188ab99ff8cff7fad1b7a95aae3bb58e5181d4f";

const built = buildVoidBtcVoidBitcoinHtlcV1(VECTOR);

assert.equal(built.marker, VOID_BTC_VOID_BITCOIN_HTLC_V1);
assert.equal(built.schema, "void.btc_void.bitcoin_htlc_script.v1");
assert.equal(built.version, 1);
assert.equal(built.hash_function, "SHA256");
assert.equal(built.required_preimage_bytes, 32);
assert.equal(built.refund_locktime, 500);
assert.equal(built.refund_locktime_type, "block_height");
assert.equal(built.witness_script_hex, EXPECTED_SCRIPT);
assert.equal(built.witness_script_bytes, 97);
assert.equal(built.witness_script_sha256, EXPECTED_WITNESS_SHA256);
assert.equal(built.p2wsh_version, 0);
assert.equal(built.p2wsh_witness_program_hex, EXPECTED_WITNESS_SHA256);
assert.equal(built.p2wsh_script_pubkey_hex, EXPECTED_P2WSH_SCRIPT_PUBKEY);
assert.equal(built.p2wsh_script_pubkey_bytes, 34);
assert.match(built.htlc_id, /^voidbtchtlc1_[0-9a-f]{64}$/u);
assert.deepEqual(
  built.redeem_witness_items,
  ["signature", "compressed_pubkey", "32_byte_preimage", "01", "witness_script"],
);
assert.deepEqual(
  built.refund_witness_items,
  ["signature", "compressed_pubkey", "", "witness_script"],
);
assert.equal(
  built.redeem_spend_requirements
    .compressed_pubkey_required_for_standard_segwit_v0_relay,
  true,
);
assert.equal(
  built.redeem_spend_requirements.minimal_if_selector_must_be_01,
  true,
);
assert.equal(
  built.refund_spend_requirements
    .transaction_nlocktime_at_least_refund_locktime,
  true,
);
assert.equal(
  built.refund_spend_requirements
    .transaction_locktime_type_must_match_refund_locktime_type,
  true,
);
assert.equal(
  built.refund_spend_requirements
    .spending_input_sequence_must_not_equal_uint32_max,
  true,
);
assert.equal(
  built.refund_spend_requirements
    .compressed_pubkey_required_for_standard_segwit_v0_relay,
  true,
);
assert.equal(
  built.refund_spend_requirements.minimal_if_selector_must_be_empty_vector,
  true,
);
assert.deepEqual(
  built.authority,
  VOID_BTC_VOID_BITCOIN_HTLC_AUTHORITY_V1,
);

const parsed = parseVoidBtcVoidBitcoinHtlcV1({
  witness_script_hex: EXPECTED_SCRIPT,
});
assert.deepEqual(parsed, built);

const timestampLock = buildVoidBtcVoidBitcoinHtlcV1({
  ...VECTOR,
  refund_locktime: 500_000_000,
});
assert.equal(timestampLock.refund_locktime_type, "unix_timestamp");
assert.equal(
  parseVoidBtcVoidBitcoinHtlcV1({
    witness_script_hex: timestampLock.witness_script_hex,
  }).refund_locktime,
  500_000_000,
);

for (const value of [1, 16, 17, 127, 128, 255, 256, 0xffff_ffff]) {
  const result = buildVoidBtcVoidBitcoinHtlcV1({
    ...VECTOR,
    refund_locktime: value,
  });
  const roundTrip = parseVoidBtcVoidBitcoinHtlcV1({
    witness_script_hex: result.witness_script_hex,
  });
  assert.equal(roundTrip.refund_locktime, value);
  assert.equal(roundTrip.witness_script_hex, result.witness_script_hex);
}

assert.throws(
  () =>
    buildVoidBtcVoidBitcoinHtlcV1({
      ...VECTOR,
      hashlock_hex: "00".repeat(31),
    }),
  /htlc_hashlock_invalid/u,
);

assert.throws(
  () =>
    buildVoidBtcVoidBitcoinHtlcV1({
      ...VECTOR,
      redeem_pubkey_hash160: "11".repeat(19),
    }),
  /htlc_redeem_pubkey_hash160_invalid/u,
);

assert.throws(
  () =>
    buildVoidBtcVoidBitcoinHtlcV1({
      ...VECTOR,
      refund_pubkey_hash160: VECTOR.redeem_pubkey_hash160,
    }),
  /htlc_redeem_refund_roles_must_differ/u,
);

assert.throws(
  () =>
    buildVoidBtcVoidBitcoinHtlcV1({
      ...VECTOR,
      refund_locktime: 0,
    }),
  /htlc_refund_locktime_invalid/u,
);

assert.throws(
  () =>
    buildVoidBtcVoidBitcoinHtlcV1({
      ...VECTOR,
      refund_locktime: 0x1_0000_0000,
    }),
  /htlc_refund_locktime_invalid/u,
);

assert.throws(
  () =>
    parseVoidBtcVoidBitcoinHtlcV1({
      witness_script_hex:
        EXPECTED_SCRIPT.slice(0, 10) +
        "aa" +
        EXPECTED_SCRIPT.slice(12),
    }),
  /htlc_opcode_sha256_missing/u,
);

assert.throws(
  () =>
    parseVoidBtcVoidBitcoinHtlcV1({
      witness_script_hex:
        EXPECTED_SCRIPT.replace("6702f401b1", "6703f40100b1"),
    }),
  /htlc_nonminimal_script_number/u,
);

assert.throws(
  () =>
    parseVoidBtcVoidBitcoinHtlcV1({
      witness_script_hex: EXPECTED_SCRIPT + "00",
    }),
  /htlc_trailing_script_bytes/u,
);

assert.throws(
  () =>
    parseVoidBtcVoidBitcoinHtlcV1({
      witness_script_hex: EXPECTED_SCRIPT.toUpperCase(),
    }),
  /htlc_witness_script_hex_invalid/u,
);

const source = fs.readFileSync(
  "tools/void-btc-void-bitcoin-htlc-v1.mjs",
  "utf8",
);

for (const required of [
  "OP_CHECKLOCKTIMEVERIFY",
  "OP_SHA256",
  "OP_SIZE",
  "required_preimage_bytes: 32",
  "p2wsh_version: 0",
  "transaction_nlocktime_at_least_refund_locktime: true",
  "compressed_pubkey_required_for_standard_segwit_v0_relay: true",
  "minimal_if_selector_must_be_01: true",
  "transaction_locktime_type_must_match_refund_locktime_type: true",
  "spending_input_sequence_must_not_equal_uint32_max: true",
  "minimal_if_selector_must_be_empty_vector: true",
  "bitcoin_mainnet_contact: false",
  "transaction_construction: false",
  "transaction_signing: false",
  "transaction_broadcast: false",
]) {
  assert.equal(source.includes(required), true, required);
}

for (const forbidden of [
  "bitcoin-cli",
  "sendrawtransaction",
  "signrawtransaction",
  "new Wallet(",
  "eth_send",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_BTC_VOID_BITCOIN_HTLC_V1_PROOF_GREEN");
console.log("witness_script_bytes=97");
console.log("p2wsh_script_pubkey_bytes=34");
console.log("exact_32_byte_preimage_guard=true");
console.log("sha256_hashlock_bound=true");
console.log("redeem_refund_roles_distinct=true");
console.log("cltv_minimal_script_number_roundtrip=true");
console.log("p2wsh_witness_program_sha256_bound=true");
console.log("transaction_construction=false");
console.log("signing=false");
console.log("bitcoin_rpc=false");
console.log("bitcoin_mainnet=false");
