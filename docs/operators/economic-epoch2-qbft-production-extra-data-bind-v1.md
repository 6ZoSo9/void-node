# Epoch-2 QBFT production extraData bind v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1`

Status: **three-validator production identity set complete; runtime binding HOLD**.

## Input

The canonical QBFT binding contains Precision, Nimo, and Xiphos:

```text
attested_live_node_count=3
required_live_node_count=3
attested_identity_slots_remaining=0
required_validator_quorum=2
byzantine_fault_tolerance=0
status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING
```

The exact ordered three-address array is supplied to pinned Besu 26.8.1:

```text
rlp encode --from=/work/validators.json --type=QBFT_EXTRA_DATA
```

## Exact verification

The binder requires:

1. 32 zero vanity bytes;
2. the exact three validator addresses in canonical binding order;
3. empty vote;
4. round zero;
5. empty commit seals; and
6. byte-for-byte equality with an independent canonical RLP re-encoding.

The evidence remains tied to the exact Besu 26.8.1 release and codec source
blobs.

## Output

The bundle writes:

```text
economic-epoch2-qbft-validator-binding-candidate-v1.json
economic-epoch2-qbft-production-extra-data-v1.json
```

The output may promote:

```text
qbft_live_identity_manifest_ready=true
qbft_minimum_live_nodes_attested=true
qbft_public_key_address_derivations_verified=true
qbft_production_extra_data_built=true
```

It must retain:

```text
production_validator_set_bound=false
offline_successor_equivalence_proven=false
all_production_validators_epoch_domain_enforced=false
migration_authorized=false
public_activation_authorized=false
funds_movement=false
```

A fourth validator is not required for this production bundle. Adding one
later is a separate topology change.

## Authority

Offline encoding/output generation only. No validator private-key read, Besu
node startup, service action, validator mutation, production RPC, transaction
construction/signing/submission/broadcast, Chain-2050 write, token/funds
movement, migration, or activation.
