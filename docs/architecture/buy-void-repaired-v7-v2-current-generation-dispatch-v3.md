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
compatibility field, derived from the exact reviewed `M/A/M` tuple, and the
established `frozen_v4_census_proof_preserved=true` V4-census contract.

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

- V3 candidate: `5301c32f53c2a82435152e38b36486507a73f906`
- V3 candidate SHA-256: `eb2be386ecf374bc75d6c10e4d5cfa3ea5fa309acbef5612f74991c6ba311aab`
- V3 lock: `e530390e505d447ca0ad9e2a098ec6a819ae3e6c`
- accepted enforcement set: `2bfc8455c09e8cbbaa56ac580ccc5f193b54f95c3e4bec1e2274a068303236ec`
- frozen current-inventory SHA-256: `65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589`
- frozen Dispatch V2 proof: `5f5e76a594c358639571a190dc48fc9e11fc8b01`

Dispatch V3 proof Git blob: `fd4dc893171a666b8abba83873a63261466d36fd`.

## Deliberate boundary

The repaired tool no longer matches the protected row frozen in V3. Therefore
V3 deployment planning must return HOLD with the exact tool-path inventory
mismatch. A separate V4 candidate and acceptance lock are required before any
new deployment receipt can be planned.

This change performs no service mutation, credential access, wallet access,
signing, transaction broadcast, chain-2050 mutation, presale activation, or
funds movement.

Current repaired-router reader composition inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`.

Current V3 candidate/lock proof blobs: `96ae15c0a76d4cc463ea64688fa2c5fd119b09fc` / `a3b2aad30e22ead3cc73bbd0def3d1fb4f934d01`.
