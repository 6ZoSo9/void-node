# Buy VOID V4 compiled-artifact candidate — independent evidence audit

## Scope and authority

This source-only, unaccepted review package audits the current Draft PR #2633
candidate generation for the finalized V2 checkout verifier.

The reviewed source identities are:

- V2 verifier Git blob
  `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`;
- V6 source Git blob
  `7266c03d8874207ed3fda0f814d0a7a53d429c25`;
- V6 source-generation anchor
  `47cbb1d4c7fb667a7accdf1089edb11072f3e631`.

Historical V5 reviewed-source and V3 compiled manifests are NOT altered.

This review evidence is deliberately NOT a locked, accepted or deployed V4
compiled attestation. Compiled generation verified, deployed generation
verified, runtime mount authority, and production source-finality ready all
remain FALSE.

## Exact cross-Node candidate evidence

At exact PR #2633 head
`f2cc22051d6408299c82975af78756d147c45647`, GitHub Actions run
`37820150421` finished SUCCESS, including independent Node 22/24/26 builds
and the exact downstream cross-Node byte comparison.

Archived workflow artifacts:

- Node 22: artifact ID `11569338319`;
- Node 24: artifact ID `11569881052`;
- Node 26: artifact ID `11570175883`.

Each contains the same 4,032-byte candidate JSON. The exact raw candidate
identities are:

- SHA-256
  `27279497f9a3bc2b93da59facb6a44d01ba7ba74342d6db6b0521867f1aa8128`;
- Git blob SHA-1
  `4c95426572e6b019822f3ae6422aacad6287e562`;
- compiled artifact generation SHA-256
  `45bb17e864579bb59f3b31f63260ce43b1cf85b8e3143d1fa31760e7122f9a87`.

The reviewed-candidate evidence JSON in this branch is exactly the archived
Node-22 body. Current #2633 later gained only proof/ancestry reconciliation;
the candidate helper requires no reviewed runtime source or compiler-input
drift from the source-generation anchor, so this evidence package re-derives
the candidate on its own exact head and requires byte equality before passing.

## Closed six-artifact identities

The independently reviewed set contains exactly six compiled artifacts:

- V6 source-finality generation:
  15,937 bytes,
  `sha256:2f4af845031530ca3bad0fa3c17512cf659219b32aa0137f58c48d242bf84b5a`;
- authenticated composition V3:
  18,892 bytes,
  `sha256:0d023868f4a4ab95fe1276c8d1a7e891dd5c419844e0ed2aac8d3bce15b72f42`;
- source-finality authority V2:
  19,002 bytes,
  `sha256:239bfb3a8c0d2fa986986e961512660c6212818aa5769753d90f592490502c4b`;
- source-chain finality RPC adapter V1:
  19,804 bytes,
  `sha256:3c5bb3d9952d1b5a537e74ebb759320d1c134c6a9b49dd242edb41c23cab7fe2`;
- payment RPC observer V1:
  12,270 bytes,
  `sha256:d8ed50dc2f68947f2a9c0758e0f4fa2ab3b4bb368f4f5f851d3b0984c3012b89`;
- finalized V2 verified-payment verifier:
  12,161 bytes,
  `sha256:7d419bafa54c5a004416e224ee03131455a073600ca2c8d423d9fa40ab431ef2`.

The reviewed-source generation digest is
`95cf8959cfef04accc4715cb310f9b975f1011d27bf9ef0b0d7aefaaeb17a426`.

Four predecessor-common compiled artifacts remain exact against immutable V3.
The changed compiled artifacts are only V6 and V2.

## Independent verification

The evidence proof checks exact raw candidate bytes, SHA-256, Git blob SHA-1,
source and compiler inputs, Git ancestry, immutable V3 provenance, four
unchanged predecessor compiled artifacts, the closed six-file artifact set,
exact compiled lengths/hashes and an independently recomputed canonical
generation digest.

Source and artifact reads require `O_RDONLY | O_NOFOLLOW`, regular
single-link files, visible-path ↔ retained-descriptor identity before and after
the bounded read, and a pre-size + one-byte cap.

Negative tests corrupt candidate authority/evidence fields and all six compiled
buffers; every mutation must HOLD. Exact-head CI rebuilds with Node 22/24/26
and compares each fresh candidate byte-for-byte to the archived JSON. Node 24
also inspects the six files from a STOPPED production image via
`docker create` + `docker cp`; no container runtime is started.

## Independent acceptance remains separate

Even a green evidence audit does not accept the compiled generation. The
locked V4 successor must separately incorporate the reviewed checked-entry
repair that executes already authenticated candidate bytes rather than
reopening the script pathname.

Enforcement, packaged-image and deployed-artifact identities remain separate
successors. Original buyer/request chronology, real source payment finality,
protected high-water custody and exactly-once allocation recovery remain
unqualified. WC/VOID presale launch remains HOLD.

No operator host, service, customer record, wallet, signer, credential,
transaction, Chain-2050, Work Credit, market, inventory, treasury, liquidity
or funds movement is authorized here.

**PROTECT THE CORE.**
