# Buy VOID source-chain finalized RPC adapter v1

Status: source-only candidate

Marker:

```text
VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1
```

## Purpose

Acquire the exact Base/Ethereum source-chain block evidence required by the
hash-bound #1470 V2 handoff while preserving zero wallet, signer, transaction,
inventory, runtime-mount, and funds authority.

The existing Buy VOID payment observer already performs bounded server-controlled
read-only RPC for an exact transaction receipt and latest block number. This lane
adds `eth_getBlockByNumber` to that same allowlisted transport and introduces an
unmounted finality adapter using the standard `"finalized"` block tag.

The checked-in proof is synthetic and uses an in-memory transport. It performs
no live Base/Ethereum RPC.

## Supported rails

Exactly:

```text
base     -> EVM chain id 8453
ethereum -> EVM chain id 1
```

The policy also binds:

- the exact RPC URL through its SHA-256 fingerprint;
- a server-controlled `rpc_identity`;
- a rail-specific `finality_adapter_id`;
- exact USDC contract and receive address; and
- a positive bounded minimum confirmation threshold.

## Acquisition sequence

For one payment candidate the adapter:

1. reuses the existing bounded payment RPC transport;
2. verifies exact source-chain `eth_chainId`;
3. reads and verifies the successful exact USDC Transfer through the existing
   Buy VOID payment verifier;
4. requires the observed RPC URL fingerprint to equal the configured fingerprint;
5. reads `eth_getBlockByNumber("finalized", false)`;
6. requires the receipt height to be at or below the finalized reference;
7. requires the finalized reference not to exceed `eth_blockNumber`;
8. re-reads the finalized block by exact number and requires the same hash;
9. reads the receipt block by exact number;
10. brackets those exact reads with a second `"finalized"` read;
11. rejects finalized-height regression or same-height hash changes;
12. re-reads both exact block numbers and requires stable hashes;
13. re-reads the transaction receipt and requires its `blockHash` to equal the
    exact receipt-block hash;
14. re-runs the exact USDC payment verifier and requires identical payment facts;
15. recomputes finalized-depth confirmations and enforces the configured minimum.

## V2 block evidence

Successful acquisition emits exactly the closed object expected by #1470:

```text
schema
marker
source_chain
evm_chain_id
receipt_block_number
receipt_block_hash
finalized_reference_block
finalized_reference_block_hash
finalized_tag
provider_consistency_verified
```

with:

```text
schema=void_buy_void_source_chain_finality_block_evidence_v1
marker=VOID_BUY_VOID_SOURCE_CHAIN_FINALITY_RPC_ADAPTER_V1
finalized_tag=finalized
provider_consistency_verified=true
```

`provider_consistency_verified=true` has a deliberately narrow meaning here:
the same configured RPC endpoint returned a stable, self-consistent view across
the bracketed finalized/exact-block/receipt re-reads.

## What this does not prove

This V1 does **not** prove ancestry from the finalized-reference hash back to the
receipt-block hash with a header walk, light client, or cryptographic proof.

It also does **not** prove provider quorum or independence. One configured
server-controlled RPC endpoint is consistency-checked; multiple independent
providers are not compared.

Therefore successful output always carries:

```text
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

This distinction is intentional. #1470 validates the exact hash-bearing handoff
shape, but caller-written or single-provider evidence is not automatically
production settlement authority.

A later reviewed production policy must decide and prove the required ancestry
and/or independent-provider property before public-presale money authority can
consume this evidence.

## #1463 compatibility

The adapter also emits the exact current observation shape consumed by #1463:

```text
source_chain
evm_chain_id
transaction_hash
log_index
receipt_block_number
observed_finalized_reference_block
confirmations_observed
finality_adapter_id
```

The current #1463 finality evaluator admits only u32 `log_index`, so this adapter
preserves that exact upstream subset even though later payment-key storage is
u64-capable.

## Authority boundary

This PR is source/proof/docs/CI only. It does not:

- execute live RPC during publication or CI;
- read production credentials;
- access a wallet or signer;
- construct, sign, or broadcast a transaction;
- reserve or mutate inventory;
- mutate Chain-2050;
- mount a runtime route;
- start a background loop;
- deploy or restart a service;
- activate the public presale; or
- move funds.

## Remaining gates

1. fresh independent exact-head review;
2. reviewed ancestry/provider-quorum policy and implementation if required;
3. authenticated adapter -> #1470 V2 handoff integration;
4. sensitive Chain-2050 reservation/fulfillment/inventory implementation;
5. source-backed Chain-2050 ancestry/finality verification; and
6. separate Ready, merge, live-RPC, deployment, signer, transaction,
   inventory-funding, legal, and public-presale authorization.

## Exact hash-bearing evidence language

The finalized source-chain evidence binds both of these exact pairs:

- receipt block number + hash
- finalized reference number + hash

Those phrases name the exact height/hash pairs carried into the V2 block-evidence
object. They do not add ancestry or provider-quorum authority.

## Exact proof-language contract

For the checked-in source-only proof, the architecture boundary is stated in
these exact plain-text terms:

- receipt block number + hash
- finalized reference number + hash
- same-provider consistency
- does not prove ancestry
- does not prove provider quorum
- production_source_finality_authority_ready=false

These phrases are documentation assertions only. They do not upgrade the
adapter's authority. The adapter still performs only same-provider consistency
checks, does not prove ancestry, does not prove provider quorum, and remains
unready for production source-finality authority.
