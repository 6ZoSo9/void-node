# Buy VOID V6 compiled-artifact V4 candidate derivation

## Purpose

Historical compiled V3 is immutable predecessor evidence. The current V6
reviewed-source generation changes reviewed runtime source bytes and therefore
requires a fresh compiled successor. This lane derives deterministic candidate
evidence only; it does not repin V3 and it does not grant runtime authority.

The current source-stack anchor is exact integration commit
`3533626d7167c98ba8d65d2c423b460b1a3199fc`. Candidate derivation requires
that commit to be an ancestor of the checkout and requires zero drift in the
closed reviewed-source/build-input set from that anchor through current HEAD.

## Current reviewed source identities

The six candidate-reviewed source files are:

- source-finality generation V6 itself — blob
  `e7ac4c296930587e7b7ec415e57bb18190c88962`;
- authenticated composition V3;
- source-finality authority V2;
- source-chain RPC adapter V1;
- payment RPC observer V1 — blob
  `0073818ad6f6418e895bf794024c9d678b3bef86`;
- verified-payment V2 — blob
  `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`.

Inside the V6 five-record runtime-source manifest, the canonical reviewed-source
digest is
`ecdcb0f86b2fb18fd035828c1cf7cbc5025b1014703a2307c10fc6722c7424f1`.

The payment observer lineage is retained through reviewed source commit
`9df9648f546eb9320259eae1d3930a7c132a6511`. Its total deadline is enforced
both by transport teardown and by monotonic success admission, so an already
buffered response cannot become successful after the deadline merely because
an overdue timer callback has not yet executed.

Build inputs remain pinned to TypeScript 5.9.3 and exact reviewed
`package.json`, `package-lock.json`, and `tsconfig.build.json` Git blobs.

## Descriptor trust

The candidate reader opens pinned source/artifact inputs with
`O_RDONLY|O_NOFOLLOW`, requires regular single-link files, binds visible path
identity to the retained descriptor before and after reading, and caps reads to
the preflight size plus one sentinel byte. Same-size inode replacement,
post-read path replacement, timestamp/size drift and concurrent growth HOLD.

The isolated self-test uses only disposable OS-temp files and does not mutate
repository source.

## Predecessor and changed-artifact boundary

The historical V3 manifest remains fixed at Git blob
`d6e97784c5d8be93713e733628c7d1ef746bb5c7` with compiled-generation digest
`0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add`.

Relative to that predecessor, exactly three common compiled artifacts are
required to remain byte-identical:

- authenticated composition V3;
- source-finality authority V2;
- source-chain RPC adapter V1.

Exactly three reviewed compiled artifacts are intentional successors:

- `dist/economic/buy_void_source_finality_generation_provenance_v6.js`;
- `dist/economic/buy_void_payment_rpc_observer_v1.js`;
- `dist/economic/buy_void_verified_payment_v2.js`.

The candidate computes the closed six-artifact generation digest from the exact
source-stack anchor, compiler version, reviewed-source digest and emitted
artifact byte identities.

## Cross-Node evidence

The candidate workflow builds independently on Node 22, 24 and 26. Each job
runs the descriptor/path/growth adversary and derives a candidate JSON file.
The comparison job requires the three outputs to be byte-identical.

Fresh exact-head candidate output is required after this payment-observer source
rollover. No previous V4 candidate digest or locked V4 manifest transfers to
this generation.

## Authority boundary

This is derive-only evidence. Candidate output must retain:

- `compiled_artifact_generation_verified=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`.

After the candidate is exact-green, a separate locked V4 manifest/proof must
accept the reviewed compiled bytes. Enforcement, packaged/final-image, deployed
runtime identity, first-original request provenance, real payment finality,
protected high-water antirollback and exactly-once allocation recovery remain
later independent gates.

No live RPC/customer history, credential, wallet/private key/signer,
transaction, Chain-2050/WC mutation, service deployment, presale/market
activation, treasury/liquidity or funds movement occurs in this lane.

**PROTECT THE CORE.**
