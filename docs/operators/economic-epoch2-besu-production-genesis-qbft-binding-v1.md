# Epoch-2 Besu production genesis QBFT binding v1

Marker: `VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1`

Status: **production-shaped three-validator genesis proof; live validator runtime HOLD**.

## Purpose

The Besu genesis builder keeps the historical proof-placeholder mode and also
accepts verified production QBFT `extraData`.

The canonical production evidence now contains exactly three validator
addresses: Precision, Nimo, and Xiphos.

Before using production `extraData`, the builder independently verifies the
pinned Besu identity, three unique non-placeholder validator records, encoded
byte SHA-256, exact QBFT RLP structure, exact validator order, and independent
RLP re-encoding.

## Hosted proof

CI builds the production-shaped three-validator genesis and boots pinned Besu
26.8.1 as a non-validator observer. It verifies:

- Chain ID 2050;
- block-0 `extraData` equals the exact bound production bytes; and
- `qbft_getValidatorsByBlockNumber("0x0")` returns the same three-validator
  set.

Besu may sort the RPC result; canonical order is proven by exact block-0
`extraData` equality.

## Deliberate HOLD

Genesis binding is not live validator-runtime proof. These remain false:

```text
production_validator_set_bound=false
client_specific_state_equivalence_proven=false
offline_successor_equivalence_proven=false
migration_authorized=false
public_activation_authorized=false
```

The topology risk remains explicit:

```text
required_validator_quorum=2
byzantine_fault_tolerance=0
one_byzantine_fault_tolerance_available=false
```

No production validator private key is used by this proof.
