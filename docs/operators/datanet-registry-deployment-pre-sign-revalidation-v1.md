# DataNet registry deployment pre-sign read-only revalidation v1

Marker: `VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1`

Status: fresh read-only revalidation. No signable transaction construction.

## Purpose

Immediately before any source lane is allowed to consider constructing a
signable registry-deployment transaction, repeat the live gas/fee/funding
observation independently and prove that the critical deployment facts remain
stable.

This gate consumes:

- the private Epoch-2 activation plan and receipt;
- the activation-bound deployer-resolution packet;
- the source-only registry deployment-input plan; and
- one prior green Precision fee/funding result.

The prior fee/funding packet is rebuilt and validated before any fresh RPC call.

## Second independent live observation

The revalidation performs the same exact eleven read-only calls as the reviewed
fee/funding gate:

1. `eth_chainId`
2. `eth_blockNumber`
3. `eth_getBlockByNumber`
4. `eth_getTransactionCount` — deployer pending
5. `eth_getBalance`
6. `eth_getTransactionCount` — predicted CREATE address
7. `eth_getCode`
8. `eth_estimateGas` — exact creation bytes, zero value
9. `eth_maxPriorityFeePerGas`
10. `eth_getTransactionCount` — deployer pending revalidation
11. `eth_getBlockByNumber` — block/hash/base-fee revalidation

The exact method sequence is included in the content-addressed pre-sign receipt.

## Required continuity

A green revalidation requires:

- the fresh observation block is not older than the prior green fee observation;
- the deployer pending nonce is unchanged;
- the predicted CREATE address is unchanged and still vacant;
- the exact creation-data identity is unchanged;
- activation-height continuity remains true;
- fee caps remain sufficient;
- deployer gas balance remains sufficient; and
- additional funding required remains exactly zero.

A newer gas estimate or fee observation may differ from the prior packet as long
as it still satisfies the reviewed bounded policy. No stale gas/fee number is
silently reused.

## Short validity

The green receipt is valid for 120 seconds.

A later transaction-construction gate must reject it after
`valid_until_utc` and must separately bind the detailed fresh fee/funding
packet by its exact packet ID.

## Artifact separation

The operator runner writes two distinct mode-0600 files:

1. the short pre-sign revalidation receipt; and
2. the detailed fresh fee/funding packet.

The receipt contains only the fresh packet ID and continuity facts. It does not
embed the detailed gas/fee packet.

This separation avoids turning the revalidation receipt itself into a de facto
transaction envelope.

## Authority boundary

This lane does not:

- read a deployer credential, wallet, or private key;
- fund the deployer;
- materialize a signable transaction;
- construct a transaction;
- sign, submit, or broadcast;
- deploy a contract;
- mutate Chain-2050 or validators;
- move tokens or funds;
- retry automatically;
- authorize migration; or
- authorize public activation.

## Next gate

A green, unexpired receipt permits only a separate source gate to construct the
exact signable EIP-1559 transaction candidate from:

- the reviewed deployment-input plan;
- the separately stored fresh fee/funding packet; and
- this revalidation receipt.

That later construction gate still must not access a signer or authorize
signing/broadcast.
