# Buy VOID original V1 Nimo witness provenance collision — immutable historical proof

## What changed, and why this is launch-critical

The original Git V1 witness classifier at source commit
`f627cad6bc07a6ad3ebe7cbd946723316fcd0567`
is Git blob `d2e84643c9f4d76c642c7e07d4ea2bf1634035e4`.
It declares manifest ID
`voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7`,
manifest digest
`sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2`,
**source commit** `e390424c1d31cd87dcf3551cc0d2d610a24e12f8`,
and compiled auto-fulfillment SHA-256
`ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6`.

The current main-integration
[#2675](https://github.com/6ZoSo9/void-node/pull/2675)
originally reviewed at `884edc6e82bd505a83e51a44b38f7e318431f314`
(and still unchanged in current #2675 head `8384105508a96ff84ffe9143422191764f750ad7`)
retains the **same V1 manifest ID and SHA** but its V1 classifier now has
Git blob `d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56`,
source commit `f627cad6bc07a6ad3ebe7cbd946723316fcd0567`,
and compiled auto-fulfillment SHA-256
`119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.

Those source classifiers differ in precisely **two lines: 13 and 57**.
Seven executable rows match. The eighth is a materially distinct compiled
file, supported by different source Git blobs:
`1ac1ad6213be83f1aa8261a554caa91544fe5e09` (e390)
vs `b7c963b1d55f000d82ad82289b31107b432503de` (f627/current).

The [#2728 V1 compatibility proof](https://github.com/6ZoSo9/void-node/pull/2728)
used the *amended* classifier for the frozen baseline.
Its Node22/24/26 test success is internally consistent for that amended
tuple but **must not** be used as proof that the original V1 ID represents
identical executable bytes. The original V1 receipt must not be transferred
to Nimo/current source without independent new-generation qualification.

## Exact fail-closed read-only proof

This Draft is a direct child of #2675 at reviewed exact head `8384105508a96ff84ffe9143422191764f750ad7` and adds only:

- `scripts/prove_buy_void_original_witness_v1_collision_audit_v1.mjs`
- `.github/workflows/buy-void-original-witness-v1-collision-audit-v1.yml`
- `docs/architecture/buy-void-original-witness-v1-collision-audit-v1.md`

The script uses only Node builtins and the allowlisted, read-only
`/usr/bin/git cat-file blob <immutable-commit>:<path>` interface.
It independently recomputes each Git blob SHA-1 from original historical
Git bytes, checks the original classifier against the integrated classifier,
and rejects any departure from the exact two-line, one-executable collision.
Seven synthetic string mutations must HOLD, including forged record ID,
forged old digest, replaced current hash, altered source generation,
a changed other executable and hidden manifest-ID collision.

All three independently checked out Node 22/24/26 workflows report one
read-only deterministic evidence JSON, then compare **every byte** across
Node versions. No npm install, build, Docker, real Nimo host, operator
private record, payment ledger, SSH, credentials or chain is accessed.

## Trust truth and subsequent gates

This proof does NOT edit, overwrite or repin either V1 source contract.
It documents a **historical V1 manifest ID collision** so the old V1
receipt cannot be silently reauthorized for a newer executable.
A separately reviewed, unaccepted V2 source+compiled witness bundle
must use a distinct generation identity, then actual Nimo installed bytes,
principal, socket/authorized command and rollback behavior must be witnessed.
The checked-entry P2 in #2728 and custody private UID/high-water/witness
serialization are separate qualifications.

Strictly false:
`historical_v1_receipt_current_generation_equivalence=false`,
`historical_v1_source_generation_accepted=false`,
`existing_v1_manifest_reinterpretation_authorized=false`,
`installed_nimo_witness_verified=false`,
`source_v2_accepted=false`,
`production_allocation_mutation_ready=false`,
`presale_activation=false`, `funds_moved=false`.

No Ready, merge, deployment, customer ledgers, keys, signer, transaction,
Chain-2050/WC, treasury/inventory/liquidity, presale/market or funds action.

**PROTECT THE CORE.**
