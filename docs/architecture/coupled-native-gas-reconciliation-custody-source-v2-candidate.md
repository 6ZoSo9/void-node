# Native-gas reconciliation custody — source generation V2 review candidate

## Why V1 correctly HOLDS on the integrated Buy VOID branch

The 21-source historical V1 attestation is immutable. Its original verified
source list and manifest remain at
`tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs`
(Git blob `44e185ba85b7bfb65514f40358c75e64e6af418c`).
Its independent Node22/24/26 run
[37930919318](https://github.com/6ZoSo9/void-node/actions/runs/37930919318)
failed the expected `live.ok` assertion; the old checker requires every
reviewed source Git blob to be identical to its V1 generation. It must not
be repinned or skipped.

I independently compared all 21 V1 path Git blobs to the exact consolidated
Buy VOID integration [Draft #2675](https://github.com/6ZoSo9/void-node/pull/2675)
head `884edc6e82bd505a83e51a44b38f7e318431f314`:
**20 sources and build inputs are exactly identical**. The **sole delta** is

```text
src/economic/buy_void_auto_fulfillment_v1.ts
  historical V1 blob: 1ac1ad6213be83f1aa8261a554caa91544fe5e09
  current source blob: b7c963b1d55f000d82ad82289b31107b432503de
```

The new auto-fulfillment code may be legitimate hardening, but this single
source change invalidates V1. It is not proof the live native-gas collector,
deployed runtime, anti-rollback, current host or payment execution is safe.

## This successor does NOT accept V2

This direct stacked source-only Draft creates three new files, with **zero
edits to historical V1 tool, runtime sources, ledger or deployment scripts**.
Its independent `--derive` census pins the original V1 tool Git blob,
V1 manifest hash and exact 21 source paths; it permits precisely the single
current auto-fulfillment source replacement, checks the exact corresponding
Git-object and retained-FD worktree bytes, original reviewed base ancestry,
current source-parent ancestry and full clean tracked worktree state using
the preexisting fail-closed V1 helper.

The `--self-test` rejects forged old/new blobs, missing or extra sources,
unreviewed extra deltas and a changed delta path without accessing live gas,
custody or customer state. Exact-head Node 22/24/26 workflows emit separate
unaccepted JSON candidates and require complete byte identity; no npm
dependencies, build/compile, network endpoint, service, signing or fund work
is performed by the candidate itself. The workflow's GitHub checkout uses
the normal read-only checkout action to retrieve already public repository
source; the proof makes no external fetch.

The resulting candidate reports:
```text
source_identity_candidate_verified=true
source_generation_v2_accepted=false
deployed_artifact_generation_verified=false
trusted_collector_proven=false
bootstrap_receipt_external_trust_proven=false
evidence_generation_monotonicity_proven=false
verification_clock_authority_proven=false
live_host_qualification_performed=false
storage_bootstrap=false
runtime_integration=false
production_gate_ready=false
presale_activation=false
funds_movement=false
```

A **separately reviewed locked V2 source-generation successor**, downstream
native-gas custody/collector binding, deployed image and independent host
qualification would be required for gas accounting authority. The V1 source
attestation is not supposed to turn green for changed files and remains
preserved as historical evidence. The actual Buy VOID purchase flow still
needs authenticated original payment, protected allocation custody, atomic
payment→reservation serialization and exactly-once recovery; this candidate
does not unlock presale.

Keep Draft/unmerged. Do not activate Chain2050/WC, tokens, inventory, real
payment, signers, keys, liquidity, host services or funds.

**PROTECT THE CORE.**
