# Economic Epoch-2 QBFT production extraData preflight v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1`

Status: canonical three-validator input ready; production runtime still HOLD.

## Purpose

Validate the real production QBFT identity set before pinned Besu encodes the
genesis `extraData`.

The canonical production topology is:

- Precision
- Nimo
- Xiphos

with:

```text
production_validator_count=3
required_validator_quorum=2
byzantine_fault_tolerance=0
one_byzantine_fault_tolerance_available=false
```

## Canonical behavior

The current binding contains exactly three independently attested identities,
so the preflight returns:

```text
READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING
attested_live_node_count=3
required_live_node_count=3
attested_identity_slots_remaining=0
```

It emits the ordered JSON array of those three Besu validator addresses for:

```text
rlp encode --from=/work/validators.json --type=QBFT_EXTRA_DATA
```

A fourth validator is not required for launch. Four remains the minimum count
for a one-Byzantine-fault margin and is a future topology expansion, not a
current HOLD.

## Validation

The preflight requires:

- pinned Besu 26.8.1 identity;
- exactly three canonical production entries;
- unique machine roles, VOID node IDs, public keys, validator addresses, and
  attestation hashes;
- exact public-key/address derivation;
- rejection of proof-only placeholder addresses; and
- all service, validator mutation, Chain-2050 write, transaction, funds,
  migration, and activation authority remaining false.

## Authority

Generating the ordered address array is not validator activation. The preflight
performs no service action, validator mutation, wallet/private-key access,
transaction construction/signing/submission/broadcast, authoritative
Chain-2050 write, funds movement, migration, or public activation.
