# Epoch-2 canonical three-validator QBFT extraData promotion v1

Marker:

`VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PROMOTION_V1`

Status: **verified hosted QBFT extraData promoted into canonical source;
production validator runtime remains HOLD**.

## Purpose

The canonical production topology is now exactly three Besu QBFT validators:

1. Precision;
2. Nimo; and
3. Xiphos.

PR #2054 selected that topology explicitly. No fourth validator is required for
launch.

The existing pinned-Besu extraData lane then produced and verified the exact
three-validator genesis `extraData` in hosted CI. This promotion lane copies
those already-proven bytes and the corresponding updated validator-binding
candidate into canonical `ops/mainnet0` source.

It does not regenerate or alter the encoded validator set.

## Hosted provenance

The promoted bundle is bound to:

```text
workflow_run_id=36572243857
source_head=0ddc47de7d332d56f6cb022133dc6eb9cb49e8c6
artifact_id=11034841633
artifact_name=void-economic-epoch2-qbft-production-extra-data-bind-v1-0ddc47de7d332d56f6cb022133dc6eb9cb49e8c6
artifact_zip_sha256=bd095f554f96a860b1a7af8a7ff6a8f6942c0a14889b86c7fd87ceb7a3308baf
```

The artifact contains exactly the promoted canonical files:

```text
ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json
ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json
```

with raw file SHA-256:

```text
evidence_file_sha256=347c35fadceb550afc952d213a9d34744247615620d9fdc23eb62c65ddf8d689
binding_file_sha256=d0b359d8c20330905ed879db8671e179e41d0fb4d4fb46a6c7b5d4b95e8066eb
```

The promotion provenance receipt is:

`ops/mainnet0/economic-epoch2-qbft-production-extra-data-promotion-v1.json`

## Exact QBFT bytes

The canonical three-validator `extraData` is 103 bytes with:

`sha256=89a70f0930a5899921c2eb7f65c1f6e5d1ea59d2044cd5b5bd08d635f9fb099a`

Validator order is exactly:

1. `0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863` — Precision
2. `0x95cd9f9b57a53e1fc86411d52092051611282904` — Nimo
3. `0x461bf06270d9d28962f7570182c061b828799b66` — Xiphos

The proof independently decodes the QBFT genesis RLP and requires:

- 32 zero vanity bytes;
- exactly those three validator addresses in order;
- empty vote;
- round zero;
- empty commit seals; and
- byte-for-byte equality with an independent RLP re-encoding.

## Topology truth

The promoted files remain bound to:

`ops/mainnet0/economic-epoch2-qbft-topology-v1.json`

which records:

```text
production_validator_count=3
required_validator_quorum=2
byzantine_fault_tolerance=0
one_byzantine_fault_tolerance_available=false
minimum_validator_count_for_one_byzantine_fault_tolerance=4
fourth_validator_required_for_launch=false
```

The three-validator fault-tolerance tradeoff remains explicit.

## Gate effect

This source promotion may set only:

`qbft_production_extra_data_built=true`

and bind the exact evidence path/hash into the canonical QBFT binding candidate.

It deliberately keeps false:

```text
production_validator_set_bound=false
all_production_validators_epoch_domain_enforced=false
offline_successor_equivalence_proven=false
cross_epoch_replay_protection_proven=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
```

The next gates require real production validator/runtime evidence. Canonical
source promotion is not validator activation.

## Authority boundary

This lane performs source/config/test/docs promotion only. It does not:

- start or restart Besu;
- mutate the validator set;
- read validator private keys;
- contact production RPC;
- construct, sign, submit, or broadcast a transaction;
- write Chain-2050;
- move VOID, WC, liquidity, treasury assets, or funds;
- authorize migration; or
- authorize public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_qbft_production_extra_data_promotion_v1.mjs
```
