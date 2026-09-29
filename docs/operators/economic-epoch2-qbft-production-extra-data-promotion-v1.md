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

After the Nimo QBFT identity rotation in PR #2057, the pinned-Besu extraData
lane reran against the rotated three-validator binding and produced a fresh
hosted artifact. This promotion lane copies those post-rotation proven bytes
and the corresponding updated validator-binding candidate into canonical
`ops/mainnet0` source.

It does not regenerate or alter the encoded validator set. Draft PR #2055
was closed as superseded because it contained Nimo's retired validator address.

## Hosted provenance

The promoted bundle is bound to:

```text
workflow_run_id=36581398340
source_head=36f8a2edc9cabc6ae6547a3b7e24c5cbf2f7c2ef
artifact_id=11039748413
artifact_name=void-economic-epoch2-qbft-production-extra-data-bind-v1-36f8a2edc9cabc6ae6547a3b7e24c5cbf2f7c2ef
artifact_zip_sha256=cfd8be43b926a09ee12680ce9540c9012abf6a2edaf257d4ad903067b9fc2dc4
```

The artifact contains exactly the promoted canonical files:

```text
ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json
ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json
```

with raw file SHA-256:

```text
evidence_file_sha256=c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee
binding_file_sha256=32b4bac996c952286e7005bac27dbccbaa81f4adc9c6072bff7f9485122e1143
```

The promotion provenance receipt is:

`ops/mainnet0/economic-epoch2-qbft-production-extra-data-promotion-v1.json`

## Exact QBFT bytes

The canonical three-validator `extraData` is 103 bytes with:

`sha256=3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181`

Validator order is exactly:

1. `0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863` — Precision
2. `0x02f967953386188397b992c208239d3a25180db6` — Nimo
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
