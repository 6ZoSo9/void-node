# Epoch-2 Besu raw transaction validator plugin v1

Marker: `VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PLUGIN_V1`

The source implementation is under:

```text
besu-plugins/epoch2-raw-transaction-domain-v1/
```

It targets pinned Besu **26.8.1**, Java **25**, and the published plugin API
coordinate `org.hyperledger.besu:besu-plugin-api:26.8.1`.

## Rule

The plugin registers a `TransactionValidationRule` through
`TransactionValidatorService` before external services start. It accepts only
transactions that are:

- Chain ID 2050;
- EIP-1559/type-2;
- carrying exactly one Epoch-2 marker access-list entry; and
- carrying exactly the canonical marker storage key in that entry.

Additional non-marker access-list entries remain allowed.

The marker is:

```text
address=0x0000000000000000000000000000000000002050
storage_key=0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7
```

If Besu does not expose `TransactionValidatorService`, plugin startup fails
closed instead of silently running without the rule.

## Besu protocol-validation scope

The implementation is bound to the exact Besu 26.8.1 release commit
`d97cbd61976a52bb109e637196fef9a8ebf2b617`. Source review at that release
proves the registered rules are passed from `RunnerBuilder` into
`ProtocolSchedule.setAdditionalValidationRules`, applied to each protocol
spec's `TransactionValidatorFactory`, and wrapped by
`ExtendableTransactionValidator`.

`MainnetTransactionProcessor.processTransaction()` obtains that validator and
runs `validate(...)` before transaction execution. A plugin rejection becomes
`PLUGIN_TX_VALIDATOR`.

This establishes the protocol-validation integration path at source level.
The later disposable-Besu runtime proof is now green and bound by
`ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json`
plus its canonical import receipt. All-production-validator enforcement remains
a separate gate.

## Source proof

CI compiles and unit-tests the module with:

```bash
mvn -B -ntp -f besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml clean test package
```

The produced build artifact is expected at:

```text
besu-plugins/epoch2-raw-transaction-domain-v1/target/void-epoch2-raw-transaction-domain-plugin-v1.jar
```

The JAR is now reproducibly built and source-content-addressed by:

`ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-plugin-artifact-v1.json`

with SHA-256:

`6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518`

CI performs two clean package builds, requires byte-for-byte equality, and
requires the resulting SHA-256 to match that manifest.

Runtime identity is now proven on a disposable pinned Besu 26.8.1 instance.
The proof rechecks the installed JAR against the canonical SHA-256, requires the
plugin and validator-rule registration logs, proves four negative replay-domain
cases, and mines one correctly marked positive transaction.

This does not mean the plugin is installed on any production validator. That
deployment/enforcement step remains separate.

## Current gate

```text
besu_transaction_validation_rule_implemented=true
besu_transaction_validation_rule_source_tested=true
plugin_jar_reproducible_build_proven=true
plugin_artifact_content_addressed=true
plugin_artifact_runtime_identity_verified=true
besu_transaction_validation_rule_runtime_proven=true
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

No plugin is installed on an operator host by this source lane. No service is
started or restarted. No RPC call, wallet/private-key access, signing,
transaction submission/broadcast, Chain-2050 mutation, validator mutation,
token movement, activation, or funds movement occurs.
