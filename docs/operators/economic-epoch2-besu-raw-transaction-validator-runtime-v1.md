# Epoch-2 Besu raw transaction validator runtime v1

Marker: `VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_RUNTIME_V1`

This lane proves the merged Epoch-2 raw-transaction validator plugin on a
**disposable hosted Besu 26.8.1 instance**. It does not install the plugin on
Precision, Nimo, Xiphos, or any production validator.

## Runtime

The proof uses the pinned Besu image:

```text
hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042
```

The plugin is built twice from the same source with Java 25 and a fixed Maven
output timestamp. Both clean builds must produce the same JAR SHA-256.

The exact JAR is mounted read-only into a disposable container plugin directory.
Besu is started with:

```text
BESU_OPTS=-Dbesu.plugins.dir=/plugins
--Xplugins-external-enabled=true
--plugins=VoidEpoch2RawTransactionDomainPlugin
```

Requesting the plugin by exact simple class name makes plugin absence a startup
failure. The proof also requires the Besu logs to show both plugin registration
and transaction-validator-rule registration.

## Transaction cases

All signing keys are fresh ephemeral test keys generated inside the hosted job.
No user ceremony key, wallet, or production signer is read.

The disposable Chain-2050 runtime must reject through Besu's
`PLUGIN_TX_VALIDATOR` error class:

1. a legacy/type-0 Chain-2050 transaction;
2. a type-2 transaction with no marker;
3. a type-2 transaction with the wrong marker storage key; and
4. a type-2 transaction with the marker duplicated.

Those rejected transactions must not consume the ephemeral sender nonce.

The same runtime must then accept and mine one EIP-1559/type-2 transaction
carrying exactly:

```text
address=0x0000000000000000000000000000000000002050
storage_key=0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7
```

The mined transaction is read back and the exact signed access-list marker is
reverified.

## Evidence

A green job emits and uploads:

- the content-addressed plugin JAR;
- the generated disposable genesis;
- the QBFT extra-data value;
- the Besu log; and
- `void-economic-epoch2-besu-raw-transaction-validator-runtime-v1.json`.

The runtime evidence binds the JAR SHA-256, pinned Besu image digest, genesis
SHA-256, log SHA-256, GitHub run identity, positive/negative transaction results,
and the authority boundary.

## Gate boundary

A green hosted run may support:

```text
plugin_artifact_content_addressed=true
besu_transaction_validation_rule_runtime_proven=true
```

It does **not** by itself support:

```text
all_production_validators_epoch_domain_enforced=true
cross_epoch_replay_protection_proven=true
migration_authorized=true
public_activation_authorized=true
```

Those later gates require exact deployment/configuration evidence on the
production validator set.

## Authority

The hosted proof:

- does not contact production RPC;
- does not use user keys or wallets;
- does not install a plugin on an operator host;
- does not restart an operator service;
- does not write authoritative Chain-2050;
- does not mutate production validators;
- does not move VOID, WC, liquidity, treasury assets, or funds; and
- does not authorize migration or public activation.
