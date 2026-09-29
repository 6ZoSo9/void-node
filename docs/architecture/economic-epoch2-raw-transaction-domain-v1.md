# Economic Epoch-2 raw transaction domain v1

Marker: `VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1`

Status: **source domain defined; Besu runtime validator not yet implemented**.

## Problem

Epoch 1 and Epoch 2 both use Chain ID 2050.

An ordinary legacy EIP-155 transaction contains no VOID execution-epoch field.
HTTP admission policy cannot change the bytes covered by an already-existing
signature, so a raw transaction that reaches the successor through another
ingress must be rejected below the HTTP gateway.

## Domain marker

Epoch-2 executable raw transactions use EIP-1559 transaction type 2 and carry
one canonical access-list marker entry:

```text
address =
  0x0000000000000000000000000000000000002050

storage_key =
  0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7
```

The storage key is SHA-256 of:

```text
VOID:EPOCH2:RAW_TX_DOMAIN:V1
|chain_id=2050
|execution_epoch=2
|source_final_block_hash=0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52
|migration_manifest_material_sha256=7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572
```

The marker is therefore selected from post-freeze Epoch-1 identity plus the
content-addressed migration material.

The access list is part of the typed transaction signing payload. An old raw
transaction cannot be modified to add this marker without invalidating its
signature.

Additional ordinary access-list entries are allowed. The marker address itself
must appear exactly once with exactly the one canonical storage key.

## Besu enforcement boundary

Pinned Besu 26.8.1 exposes transaction-validation plugin support through
`TransactionValidatorService` / `TransactionValidationRule`. The production
implementation must register the rule on every production validator and reject
any transaction that is not:

- Chain ID 2050;
- transaction type 2; and
- carrying the exact signed Epoch-2 access-list marker.

This must be a transaction-validation rule, not merely an HTTP filter or local
transaction-pool preference. Raw public RPC also remains disabled.

The eventual runtime artifact must be content-addressed, must fail startup
closed if absent or mismatched, and must be proven on every validator identity
before the complete cross-epoch replay gate can become true.

## Why this is separate from the EIP-712 gateway

The bounded signed-intent gateway protects its own HTTP admission and replay
store. It cannot retroactively add an epoch field to a legacy raw EVM
transaction.

The raw transaction domain instead makes the epoch marker part of the
transaction signature itself. Both layers can coexist:

1. the gateway authorizes a bounded economic action;
2. the wallet signs the resulting type-2 transaction carrying the Epoch-2
   marker;
3. Besu transaction validation independently rejects any raw transaction
   without that marker.

## Current gate

This source lane proves only:

```text
raw_transaction_epoch_domain_defined=true
raw_transaction_epoch_domain_source_proven=true
besu_transaction_validation_rule_implemented=false
besu_transaction_validation_rule_runtime_proven=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

No RPC call, wallet/private-key access, transaction submission/broadcast,
authoritative Chain-2050 write, token movement, migration, activation, or funds
movement occurs.
