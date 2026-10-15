# Repaired V7/V2 current-generation dispatch v1

This reconciliation carries the historical #3115 V7/V2 stack onto current main
without treating the closed #3115 head as a required ancestor.

Historical reconciliation:
- base `be959daf147a25f594ba705c6bead1e2e622b00e`;
- head `af9646827b25e8103004f96525623ba248b41d2a`.

Accepted current restack generation:
- base `f894cc5cbdccab0265a9a2265df45efa07170c4a`;
- exact accepted PR head `a350ff8673c77c685bb024576ed1e887bfe42ac7`.

The historical reconciliation and the frozen accepted restack each have 106
PR-delta paths. Current repository HEAD is allowed to advance with unrelated
paths after that accepted restack; the 106-path topology is therefore verified
against the frozen restack head, while protected/economic/provider identities
below continue to be verified against current HEAD.

Two historical coupled-launch
proof paths are omitted from the current delta because the restack base already
contains their accepted blobs. The current dispatch proof and this architecture
note replace those two paths. Of the 104 paths shared with #3115, five workflow
paths are intentional current-generation dispatch successors; every other
shared path must remain byte- and mode-identical to #3115.

## Frozen evidence

The following accepted evidence is not repinned or regenerated:
- V2 candidate proof blob `5cb990d0ef680f80292bed5f6b28c11d4ee1ffed`;
- V2 candidate JSON blob `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- V2 lock proof blob `9428c0adb10d624593c7882a9e483f33baa9f292`;
- V2 lock JSON blob `589845615654da8b688764377b34296267ac0063`;
- V4 census proof blob `f0e1334da67309c1aeb98a2fa19e5ff77424955f`.

The current workflow does **not** execute those historical proofs as though the
restacked commit were their original source-generation descendant.

## Current protected identity

The accepted V2 candidate records 49 protected source rows. Current integration
must match every recorded Git blob and mode exactly, and the canonical 49-row
inventory digest must remain
`224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`.

Current main has exactly three economic-source differences from the protected
census parent:
- `src/economic/buy_void_public_request_under_launch_lock_v1.ts`;
- `src/economic/buy_void_request_custody_read_policy_v1.ts`;
- `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`.

All three are outside the protected 49-path inventory and must be byte-identical
to the current-main restack base. Any additional economic/build drift fails
closed.

After the normal build, the 28 V4 economic census artifacts and their 28 source
files must reproduce the accepted hosted and canonical inventory hashes from
the frozen V2 candidate. This proves that the three permitted nonprotected
changes do not alter the protected V4 build identity.

## Provider closure

The accepted provider candidate parent and evidence remain frozen. The current
integration proof requires all 16 provider source/build/proof inputs to be
unchanged and verifies the current compiled provider artifacts against the
accepted byte counts and SHA-256 identities.

The provider workflow therefore consumes the current integration receipt on V7
source instead of rerunning the historical provider-lock proof against unrelated
restack topology. Historical-mode behavior remains available for its original
generation.

## Workflow dispatch

The final V2 candidate, historical V1 refusal, V7 executable-delta, standalone
V4 census, and provider-closure workflows are all bound to the current
integration proof.

Current V2 CI consumes the exact frozen candidate and accepted lock after proving
current protected identity. It does not claim to have rederived the frozen
candidate on the current head. The historical V1 lane continues to require its
older candidate proof to fail closed on newer source.

Two coupled-launch proof paths are preserved from current main at:
- `59357584271c3effaaefb725d630593163b7a9e2`;
- `7bc37b4ffcc2d3071bfcedfbeccc734161033b08`.

No protected install, deployment receipt apply, service/RPC/provider mutation,
credential/key/wallet/signer access, payment or transaction execution,
WC/presale activation, treasury/liquidity/inventory action, or funds movement
occurs.
