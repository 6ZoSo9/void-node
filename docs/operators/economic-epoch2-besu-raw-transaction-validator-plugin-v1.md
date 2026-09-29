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

This establishes the intended protocol-validation integration path at source
level. It does not substitute for the later disposable-Besu runtime proof or
all-production-validator enforcement proof.

## Source proof

CI compiles and unit-tests the module with:

```bash
mvn -B -ntp -f besu-plugins/epoch2-raw-transaction-domain-v1/pom.xml clean test package
```

The produced build artifact is expected at:

```text
besu-plugins/epoch2-raw-transaction-domain-v1/target/void-epoch2-raw-transaction-domain-plugin-v1.jar
```

This build artifact is **not** a production artifact yet. A later runtime proof
must content-address the exact JAR, place it into a disposable pinned Besu 26.8.1
plugin directory, boot Besu fail-closed, and prove both positive and negative
raw-transaction cases at the client validation boundary.

## Current gate

```text
besu_transaction_validation_rule_implemented=true
besu_transaction_validation_rule_source_tested=true
plugin_artifact_content_addressed=false
besu_transaction_validation_rule_runtime_proven=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

No plugin is installed on an operator host by this source lane. No service is
started or restarted. No RPC call, wallet/private-key access, signing,
transaction submission/broadcast, Chain-2050 mutation, validator mutation,
token movement, activation, or funds movement occurs.
