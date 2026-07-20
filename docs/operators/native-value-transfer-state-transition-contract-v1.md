# Native Value Transfer State Transition Contract v1

Marker: `VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1`

## Purpose

This contract defines the missing deterministic state transition required
before a chain-2050 JSON-RPC bridge can submit native VOID transfers.

It is source-only and unmounted. It does not create an RPC endpoint, install a
state store, inject a signer, change the running node, or enable Buy VOID
automatic fulfillment.

## Accepted transaction

The prepare function accepts a signed EIP-1559 type-2 transaction and requires:

- chain ID exactly `2050`
- transaction type exactly `2`
- gas limit and gas used exactly `21000`
- a recovered nonzero sender and recipient
- empty calldata (`0x`)
- no access list entries
- positive value within policy
- sender included in the configured sender allowlist
- transaction nonce equal to the authoritative sender nonce
- effective gas price no greater than the signed maximum fee
- sufficient sender balance for value plus the complete fee debit

Contract creation and data-bearing calls are refused.

## State transition

The prepared plan is deterministic and contains:

- sender debit: native value plus fee debit
- recipient credit: native value
- bounded allowlisted fee credits
- explicit burned-fee remainder
- sender nonce increment by exactly one
- sorted account changes
- prestate and poststate SHA-256 fingerprints
- transaction idempotency key
- complete plan binding hash

Duplicate addresses are aggregated before the poststate is produced. This
covers sender/recipient/fee-recipient overlap without double application.

## Apply boundary

Mutation is delegated to an injected atomic store method:

`apply_native_value_transfer_once`

The store receives no raw signed transaction. It receives only the bound
transaction hash, fingerprints, account changes, fee burn amount, and the exact
confirmation:

`applyNativeValueTransferStateTransitionV1`

The store must compare the expected prestate, apply all changes atomically,
persist the idempotency key, and refuse duplicate application.

A thrown or ambiguous store outcome is classified as
`submission_may_have_occurred=true` with automatic retry disabled.

## Authority exclusions

The module has no direct authority for:

- private keys or mnemonics
- wallet access or transaction signing
- RPC or network calls
- environment reads
- filesystem reads or writes
- runtime route mounting
- dependency injection
- automatic retry
- receipt polling
- raw signed transaction persistence or output

Money movement is possible only in a future runtime that deliberately injects
an authoritative state store and invokes the apply function with exact
confirmation.

## Current deployment state

- module mounted: false
- production state store injected: false
- chain-2050 RPC endpoint active: false
- Buy VOID automatic fulfillment enabled: false
- live signing performed by this lane: false
- live broadcast performed by this lane: false
- live money movement performed by this lane: false
