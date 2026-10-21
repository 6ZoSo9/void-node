# Repaired V7/V2 current-generation dispatch v3

Status: **source/CI-only protected-reader successor; no deployment or economic authority**.

## Purpose

Dispatch V3 preserves the accepted V3 candidate and lock byte-for-byte while
classifying one reviewed protected transition:

- `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- predecessor Git blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- repaired Git blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`

The production reader now opens with `O_NOFOLLOW|O_NONBLOCK`, binds the pre-open path to
the opened descriptor with `fstat`, reads at most `maxBytes + 1`, and verifies
both descriptor and visible-path identity after the read. The same bounded
helper is used for the 49-file current-enforcement inventory.

The executable production proof `scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts` is pinned to
`e634e666d3a190368ddb031f936ebbb6347b7196` and exercises regular replacement, direct symlink,
open-time symlink swap, regular-to-FIFO replacement without blocking, and
post-open growth against the exported production reader.

The five workflow consumers are bound by explicit contracts: four receipt
lanes assert the descriptor-bound reader fields, while the historical-refusal
lane runs Dispatch V3 self-test only and does not pretend to emit a receipt.
The receipt also preserves the established `nonprotected_economic_drift_count=3`
compatibility field, derived from the exact reviewed `M/A/M` tuple.

The provider source boundary is bound directly to the 12 exact Git blobs and
modes under evidence tree `7e21075ccd632ea11f4d424424b348217a013dfe`. Dispatch V3 does not
require the historical commit object `bc510343c5c418a75154bedcc445cbf1251dc037` to exist in
the local object database.

The post-census economic-drift boundary is independently bound to the complete
recursive blob/mode manifest derived from protected-parent commit
`16563121f8d6c2a1fa7cd2f99ca4be2f88aa3cca` and tree `45db2286497ca9f6f0c0753bdba7cbed962385ce`. Its exact reviewed
status tuple is `M/A/M`: two source modifications and the intentional addition
of `src/economic/buy_void_request_custody_read_policy_v1.ts`. Dispatch V3
therefore also does not require that unrelated historical commit object in the
local Git object database.

## Frozen evidence

- V3 candidate: `79998af4763b6afca84ffe4e8d14d9a6ff535dfd`
- V3 candidate SHA-256: `df3b5b74e0d1cd0f3198d8f0a5190d392518480804155ad848cd43b6eae6cbf6`
- V3 lock: `245ce93ebfb53478211fab765489e88d8fa23c4a`
- accepted enforcement set: `95a11602e5f2639d33b378293b92863ea7f9f37020ad18dec49d3d4ac6289fd4`
- frozen current-inventory SHA-256: `c0a56b378215feafacc089e9f59a9f966d57f11e5582e4a13afcd6351d2447bb`
- frozen Dispatch V2 proof: `81a4f189b2c3a1ff988e44ece93ed1ee983898f8`

Dispatch V3 proof Git blob: `3c710609632f9568ff93b26047df5d4c0a0f9711`.

## Deliberate boundary

The repaired tool no longer matches the protected row frozen in V3. Therefore
V3 deployment planning must return HOLD with the exact tool-path inventory
mismatch. A separate V4 candidate and acceptance lock are required before any
new deployment receipt can be planned.

This change performs no service mutation, credential access, wallet access,
signing, transaction broadcast, chain-2050 mutation, presale activation, or
funds movement.
