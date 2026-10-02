# BTC/VOID Bitcoin HTLC script contract v1

Marker:

`VOID_BTC_VOID_BITCOIN_HTLC_V1`

Status: deterministic source-only Bitcoin witness-script contract.

## Purpose

The BTC/VOID architecture requires a real native-Bitcoin hash-timelock primitive
before Phase-1 regtest can execute. This source lane defines only the script
contract. It does not construct, sign, fund, or broadcast a transaction.

The output is a native SegWit v0 P2WSH script commitment. The witness program is
the SHA-256 of the complete witness script.

## Script template

The exact witness script is:

```text
OP_IF
  OP_SIZE 32 OP_EQUALVERIFY
  OP_SHA256 <32-byte-hashlock> OP_EQUALVERIFY
  OP_DUP OP_HASH160 <redeem-pubkey-hash160> OP_EQUALVERIFY OP_CHECKSIG
OP_ELSE
  <refund-locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP
  OP_DUP OP_HASH160 <refund-pubkey-hash160> OP_EQUALVERIFY OP_CHECKSIG
OP_ENDIF
```

The redeem and refund pubkey hashes must be distinct 20-byte HASH160 values.

The hashlock is exactly 32 bytes and is checked with `OP_SHA256`.

The redeem branch first requires the supplied preimage itself to be exactly
32 bytes. This prevents a different-length byte string with the same script
stack shape from becoming an accepted preimage representation.

## P2WSH commitment

The builder computes:

```text
witness_program = SHA256(witness_script)
scriptPubKey    = OP_0 PUSH32 witness_program
```

The resulting scriptPubKey is exactly 34 bytes.

No Bech32 address is produced in this version. The script contract is
network-neutral; later regtest/mainnet address presentation is a separate
surface.

## Refund locktime

`refund_locktime` is a positive unsigned 32-bit Bitcoin locktime.

The builder uses canonical Bitcoin Script integer encoding:

- 1..16 use `OP_1`..`OP_16`;
- larger values use minimal little-endian signed-magnitude Script-number bytes;
- a high sign bit receives the required trailing zero byte;
- non-minimal encodings are rejected by the parser.

The contract classifies locktimes below 500,000,000 as block heights and values
at/above that threshold as Unix timestamps.

The refund branch uses BIP65 `OP_CHECKLOCKTIMEVERIFY`. A later transaction
builder must additionally bind:

```text
transaction.nLockTime >= refund_locktime
transaction nLockTime type (height vs timestamp) matches refund_locktime
spending input nSequence != 0xffffffff
```

The source result records both requirements but does not build a transaction.

## Witness item shapes

Redeem path, serialized witness item order:

```text
signature
compressed_pubkey
32_byte_preimage
01
witness_script
```

The `01` item selects the `OP_IF` redeem branch and is the exact
minimal-IF true selector used by this contract. Later spend construction must
supply a compressed 33-byte public key for standard SegWit v0 relay/mining
policy.

Refund path:

```text
signature
compressed_pubkey
<empty vector>
witness_script
```

The empty vector selects the `OP_ELSE` refund branch and is the exact
minimal-IF false selector. The refund signature path likewise requires a
compressed 33-byte public key for standard SegWit v0 relay/mining policy.

This source lane does not create or validate signatures.

## Parser boundary

`parseVoidBtcVoidBitcoinHtlcV1(...)` recognizes only the exact V1 template.

It rejects:

- missing or substituted opcodes;
- non-direct hash/pubkey-hash pushes;
- non-minimal CLTV Script-number encoding;
- zero/invalid locktime;
- trailing script bytes;
- non-lowercase or malformed script hex;
- role equality; and
- any script that does not rebuild byte-for-byte through the canonical builder.

This is deliberately not a general Bitcoin Script parser.

## Content identity

The result binds:

- exact input identities;
- exact witness-script hex and byte count;
- witness-script SHA-256;
- exact P2WSH witness program and scriptPubKey;
- refund locktime type;
- witness-stack shape;
- BIP65 transaction requirements; and
- authority posture.

The content-addressed ID is:

```text
voidbtchtlc1_<sha256>
```

## Fixed proof vector

The focused proof includes a fixed independent vector:

```text
hashlock       = 00 * 32
redeem HASH160 = 11 * 20
refund HASH160 = 22 * 20
refund locktime= 500

witness script bytes = 97
witness SHA256 =
332df199c5e46d14e7680bc0d188ab99ff8cff7fad1b7a95aae3bb58e5181d4f

P2WSH scriptPubKey =
0020332df199c5e46d14e7680bc0d188ab99ff8cff7fad1b7a95aae3bb58e5181d4f
```

Additional proof covers locktime encodings at 1, 16, 17, 127, 128, 255, 256,
500,000,000 and 4,294,967,295.

A deliberately non-minimal encoding of locktime 500 is rejected.

## CLI

Build:

```bash
node tools/void-btc-void-bitcoin-htlc-v1.mjs build < input.json
```

Input:

```json
{
  "hashlock_hex": "<64 lowercase hex>",
  "redeem_pubkey_hash160": "<40 lowercase hex>",
  "refund_pubkey_hash160": "<40 lowercase hex>",
  "refund_locktime": 500
}
```

Parse:

```bash
node tools/void-btc-void-bitcoin-htlc-v1.mjs parse < script.json
```

with:

```json
{
  "witness_script_hex": "<lowercase hex>"
}
```

## Authority boundary

This lane performs no:

- Bitcoin RPC;
- Bitcoin mainnet contact;
- wallet or private-key access;
- transaction construction;
- sighash construction;
- transaction signing;
- transaction broadcast;
- Chain-2050 RPC;
- inventory reservation;
- liquidity movement;
- market/presale activation; or
- funds movement.

The next #2332 slice is the separate Chain-2050 hashlock settlement contract.
Only after both primitives are reviewed should #2330 build the real regtest /
isolated-2050 execution harness.
