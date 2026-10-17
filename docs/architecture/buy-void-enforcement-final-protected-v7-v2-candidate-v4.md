# Buy VOID protected V7/V2 candidate v4 — current range generation

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4`.

## Purpose

V4 is the current-range successor to the accepted V3 candidate. It does not
rewrite V3. It consumes the hosted V6 census for #3287's newer
`api_attach`/range-proof generation and carries the accepted V3 lock as
historical predecessor evidence.

## Hosted V6 census

Accepted source evidence for this candidate:

- workflow run: `38958734625`;
- Node 22 artifact: `12072032170`;
- Node 24 artifact: `12071083778`;
- Node 26 artifact: `12071523479`;
- census ID:
  `voidbefv7c6_45460e051bf0fd549be5842378a12e22875a0cb845a9bced564f9547e3099848`;
- JSON bytes: `25523`;
- JSON SHA-256:
  `d1fb5363396dd763cc76da3ba18cb15956e2e72b398d1de8aefc38a993bbc77f`;
- V6 workflow Git blob:
  `69f1ac0c77ac247ccafc0a30b2db9a48ac3022c3`;
- three-runtime byte identity: required.

The candidate also freshly re-runs V6 on its own exact HEAD and requires the
same economic/protected inventory identities.

## V3 historical predecessor

V4 requires accepted V3 lock head
`67ea723bd2abeb3894a0eb8f4b7a0044a141ed03` as an ancestor and pins:

- accepted V3 lock blob
  `92054f19fed9e8c243eb23321dbcf53fc9227a99`;
- accepted V3 enforcement set
  `bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d`;
- historical predecessor-preservation proof blob
  `d5474b8584aca62814357ce9a29017b933d96450`.

V1/V2/V4/V3 history remains frozen.

## Authority

The V4 candidate is derivation evidence only:
`candidate_enforcement_identity_accepted=false`,
`production_source_finality_authority_ready=false`,
`public_presale_activation=false`, and `funds_movement=false`.

A separately hosted, content-addressed V4 candidate must be accepted by a later
versioned lock before it can replace V3 as the current protected identity.
