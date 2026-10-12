# Economic Epoch-2 raw transaction domain v1

Marker: `VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1`

Status: **source domain defined; Besu 26.8.1 validator implemented, source-tested, reproducibly content-addressed, and proven on a disposable pinned Besu runtime; production-validator enforcement still HOLD**.

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

The source validator now lives under
`besu-plugins/epoch2-raw-transaction-domain-v1/`. It implements Besu's
`TransactionValidatorService` contract, registers through Java
`ServiceLoader`, rejects non-2050/non-type-2/missing-marker/wrong-marker
transactions, and fails startup closed when Besu does not expose the required
validator service.

The module compiles and tests against
`org.hyperledger.besu:besu-plugin-api:26.8.1` with Java 25. Maven output
timestamps are pinned, two clean package builds are required to be byte-identical,
and the reviewed artifact manifest pins the JAR SHA-256:

`6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518`

This closes the source implementation/test and reproducible artifact
content-addressing gates only.

Pinned 26.8.1 source also shows this is a protocol validator rather than a
tx-pool-only filter: `RunnerBuilder` installs the plugin rules on the protocol
schedule, each protocol spec wraps its transaction validator, and
`MainnetTransactionProcessor` invokes the wrapped validator before execution.
Those exact upstream source blobs are recorded in the plugin evidence artifact.


The exact content-addressed JAR has now been rebuilt, rehashed, mounted
read-only into a disposable pinned Besu 26.8.1 runtime, and proven at the client
validation boundary. The hosted proof rejects legacy/type-0, missing-marker,
wrong-marker, and duplicate-marker Chain-2050 transactions through
`PLUGIN_TX_VALIDATOR`, leaves the rejected sender nonce unchanged, and accepts
and mines one correctly marked type-2 transaction.

The checked-in runtime receipt and import are independently hash-verified by
source CI. This closes the hosted runtime gate only. The exact plugin artifact
must still be installed and proven on every production validator identity
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
besu_transaction_validation_rule_implemented=true
besu_transaction_validation_rule_source_tested=true
plugin_artifact_content_addressed=true
plugin_artifact_runtime_identity_verified=true
besu_transaction_validation_rule_runtime_proven=true
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

No RPC call, wallet/private-key access, transaction submission/broadcast,
authoritative Chain-2050 write, token movement, migration, activation, or funds
movement occurs.
