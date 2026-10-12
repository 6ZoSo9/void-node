# Economic Epoch-2 QBFT validator binding v1

Status: source-only HOLD boundary.

This document separates the migrated economic-validator roster from the small
Besu QBFT block-producing set.

## Economic validator roster

The migrated Epoch-2 staking state contains 126 active VOID validator records
with an exact total power of 126,000 VOID. That roster preserves economic stake
and VOID validator identity. It is not a source of Besu QBFT node addresses.

Automatic conversion of legacy VOID consensus keys into Besu validator
addresses remains forbidden.

## Canonical production QBFT topology

The production Besu validator inventory is exactly:

- Precision
- Nimo
- Xiphos

Each entry binds a stable machine role, VOID node ID, Besu public key, derived
Besu validator address, and content-addressed public identity attestation.

The canonical topology is defined by:

`ops/mainnet0/economic-epoch2-qbft-topology-v1.json`

and records:

```text
production_validator_count=3
required_validator_quorum=2
byzantine_fault_tolerance=0
one_byzantine_fault_tolerance_available=false
minimum_validator_count_for_one_byzantine_fault_tolerance=4
fourth_validator_required_for_launch=false
```

Besu 26.8.1 computes validator quorum as `ceil(2N/3)`. With three
validators, quorum is two. The topology has no one-Byzantine-fault safety
margin and must not be described as if it did.

A fourth validator remains a possible future safety expansion, not a current
launch prerequisite.

## Proof-only placeholders

The four historical placeholder addresses in the client candidate remain
proof-only and must never ship to production:

- `0x1000000000000000000000000000000000000001`
- `0x2000000000000000000000000000000000000002`
- `0x3000000000000000000000000000000000000003`
- `0x4000000000000000000000000000000000000004`

## Current gate

The identity inventory is complete:

```text
attested_live_node_count=3
required_live_node_count=3
attested_identity_slots_remaining=0
```

This does not itself mean the production validator set is live.

Until exact QBFT `extraData`, production genesis, and real per-validator
runtime enforcement are proven, these stay false:

```text
production_validator_set_bound=false
offline_successor_equivalence_proven=false
migration_authorized=false
public_activation_authorized=false
```

No private Besu node key belongs in the repository. This source boundary
authorizes no service action, validator mutation, transaction, migration,
activation, or funds movement.
