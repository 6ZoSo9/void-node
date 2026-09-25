# WC/VOID vault deployer gas pre-sign revalidation v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1`

Status: source-ready read-only pre-sign gate.

This gate runs after the exact gas-funding request has been authorized for
source selection and unsigned transaction construction, but before any private
key is accessed or any signing/broadcast authorization is considered.

## Exact authorized transaction

The gate is bound to:

```text
authorization_id=voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392
funding_request_id=voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148
source=0xc884f631c3881b8b672bfcbf019c856146cd7f73
destination=0x907ea7d0d57f5631219674BDF666A7e929613074
nonce=1
value_wei=6669126000000000
gas_limit=21000
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
maximum_source_liability_wei=6732126000000000
unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9
unsigned_serialized_sha256=5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd
```

The committed unsigned serialized transaction is reparsed locally with
`ethers.Transaction`; any field, hash, signature, or serialization mismatch
fails closed.

## Read-only live checks

Only loopback HTTP RPC is accepted.

Allowed RPC methods:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getCode
eth_getTransactionCount
eth_getBalance
eth_maxPriorityFeePerGas
```

The gate requires:

- Chain ID exactly 2050;
- source and destination are still EOAs with no code;
- source latest nonce exactly 1;
- source pending nonce exactly 1;
- source balance covers the full maximum liability;
- destination balance exactly zero;
- destination latest and pending nonce exactly zero;
- current priority fee does not exceed the authorized priority cap;
- `2 * baseFee + priorityFee` does not exceed the authorized max fee;
- source pending nonce is re-read and unchanged; and
- the observation block hash/base fee are re-read and unchanged.

A source nonce change catches any competing/pending transaction from the
fulfillment wallet before signing. A nonzero destination balance or nonce
catches prior funding/use of the dedicated deployer.

## GREEN decision

A successful run returns:

```text
GREEN_FRESH_PRE_SIGN_REVALIDATION_READY_FOR_SEPARATE_EXACT_SIGNING_AND_BROADCAST_AUTHORIZATION
```

That is not a signing authorization.

## Authority boundary

This gate performs no:

- credential or private-key access;
- wallet/signer use;
- transaction signing;
- transaction broadcast;
- Chain-2050 write;
- deployer funding;
- inventory funding;
- market/presale activation; or
- funds movement.

All corresponding authority flags remain false.

## Next gate

After a fresh GREEN Precision observation is committed and independently bound
to the exact unsigned hash, the next gate may prepare an **exact signing
request**. A separate explicit authorization is still required before private
key access, signing, or broadcast.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployer_gas_pre_sign_revalidation_v1.mjs
```
