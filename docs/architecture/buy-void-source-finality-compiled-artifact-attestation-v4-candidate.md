# Buy VOID V6 compiled-artifact V4 candidate derivation

## Source-only purpose

The historical V3 compiled-artifact manifest is **immutable**. It binds the
reviewed source-finality V5 generation and the older V2 payment verifier. The
separate [V6 source candidate](https://github.com/6ZoSo9/void-node/pull/2630)
exists because the updated native-USDC verifier has new source bytes. That
change requires a newly derived, independently reviewed compiled successor,
not a V3 hash repin or a skipped failing workflow.

This candidate is stacked directly on PR #2630 source head
`4423740a1bbcc1f08bed7b3ce83d18d8b2b5c92c`.
It requires source-finality V6 source Git blob
`7266c03d8874207ed3fda0f814d0a7a53d429c25` and native-USDC V2
verifier blob `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`.
Build inputs include fixed compiler version TypeScript 5.9.3, the reviewed
`package.json`, `package-lock.json`, and `tsconfig.build.json` Git blobs.

## Descriptor trust and lineage refresh

The reviewed V6 source parent advanced after a source-read growth fix, and this
candidate has been reconciled to its new exact commit and blob; the preceding
cross-Node result, even if green, is **not** evidence for the new parent.
The candidate reader now pins a regular single-link file with
`O_RDONLY|O_NOFOLLOW`, verifies visible path ↔ descriptor identity before
and after a bounded positional read, and consumes **at most preflight
size+1 sentinel byte**. It rejects replaced same-size inodes, changed
timestamps/size and growth without unbounded allocation. The isolated
`--self-test` uses disposable OS-temp files, never repo files, to exercise
same-size before-open replacement, postread replacement, poststat 3 MiB growth,
and restored unchanged data.

No trust is inferred from the mere existence of an old generated manifest.
Source compatibility must be rebuilt and compared on **this** exact new head.

## Derivation boundaries

`scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v4_candidate.mjs --derive`
runs **only after** `npm run build` on an isolated source checkout.
It checks the six closed source files for drift relative to pinned source head,
the exact V6/verifier Git blobs, predecessor V3 manifest Git blob
`d6e97784c5d8be93713e733628c7d1ef746bb5c7` and predecessor
generation digest `0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add`.
It requires all four unchanged shared compiled artifacts to match V3
byte counts and SHA-256 exactly, and checks a closed six-artifact import graph.

A new Node 22/24/26 workflow obtains **three distinct output files** and
requires exact byte equality across all three independently built outputs.
Each output records the derived verifier and V6 compiled module identities.
This step establishes repeatable *candidate evidence*, not independent review
of the security semantics, original checkout/payment, or accepted deployment.

**Derivation-only authority:** No V4 compiled attestation manifest is accepted
or committed in this initial candidate. Invoking the script without
`--derive` always fails. All resulting objects explicitly report
`compiled_artifact_generation_verified=false`,
`deployed_artifact_generation_verified=false`,
`runtime_mount_authority=false` and
`production_source_finality_authority_ready=false`.

## Further gates

A separate independent reviewer must accept the exact V2/V6 sources and
compiled output digests, then publish a separate locked V4 manifest and
negative predecessor tests. Enforcement, packaged image, runtime deployment,
protected first-original request, verified payment, high-water anti-rollback
and exactly-once allocation recovery require their own reviewed successors.
The old V3 manifest, old V5 reviewed-source record and currently failing old
source checks must **never** be repinned simply to get green.

No real RPC, operator history, payment, credentials, wallet/signer, funds,
Chain-2050, Work Credit or service state is accessed by this CI candidate.
No Ready/merge/deployment or presale/market authority is granted.

**PROTECT THE CORE.**


The current reviewed-source parent is exact #2630 head
`4423740a1bbcc1f08bed7b3ce83d18d8b2b5c92c`. It contains both the reviewed V6 source and the final hardened V2
payment-verifier source blob `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`.
Candidate derivation requires that exact parent to be an ancestor and requires
zero reviewed-source/build-input drift from that source-stack head through
current HEAD.


## Current integration rollover — payment RPC deadline

The current integration source anchor is
`3533626d7167c98ba8d65d2c423b460b1a3199fc`.

Relative to historical compiled V3, this candidate now treats three reviewed
compiled artifacts as intentionally changed:

- `buy_void_source_finality_generation_provenance_v6.js`;
- `buy_void_payment_rpc_observer_v1.js`;
- `buy_void_verified_payment_v2.js`.

The payment observer source is exact Git blob
`0073818ad6f6418e895bf794024c9d678b3bef86`, retained through reviewed source
commit `9df9648f546eb9320259eae1d3930a7c132a6511`. V6 source manifest blob is
`e7ac4c296930587e7b7ec415e57bb18190c88962`; the resulting reviewed-source
digest is expected to derive as
`ecdcb0f86b2fb18fd035828c1cf7cbc5025b1014703a2307c10fc6722c7424f1`.

Candidate authority remains false until fresh cross-Node compiled bytes are
derived and separately locked. Historical V3 bytes are immutable evidence, not
repinned acceptance.
