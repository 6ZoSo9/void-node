# Buy VOID protected V7/V2 enforcement lock V4

Status: **accepted source identity only; no deployment or economic authority**.

This successor is intentionally separate from the fail-closed reader-repair evidence lock.

## Exact candidate

Accepted candidate source generation:
`827b94aabbecb915ab2cf22bba8f178b7d0568bc`.

- candidate proof: `3a7401202fee374f2a7da3f5efc0d29976f9792a`
- candidate JSON: `ec00f0c552e600fff38e4998e4beb128c93b481d`
- candidate bytes: `17788`
- candidate SHA-256: `fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60`
- protected inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`
- enforcement-set SHA-256: `00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a`
- Dispatch V4 proof: `9de04b5340f904b8886562727d5f9006876b7ec5`
- Dispatch V4 receipt SHA-256: `f174c630b119f4083e7f4431f59ad50581a01be28cfdde5733174fe5994ea382`

Hosted candidate evidence is workflow run `40053691462`:
Node 22/24/26 artifacts `12544821142 / 12544756476 / 12545000635`,
candidate cross-node job `120752978070`, Dispatch V4 cross-node job
`120752773488`.

## Required fail-closed evidence predecessor

Before this successor may promote source identity acceptance, it consumes exact
#3683 evidence generation `df847b817b9e8a839ffe008bbfa6a87f10e2ccd9`.

- evidence-lock JSON blob:
  `c9e50cebb0735981f946a1afbc4de6d692ced347`
- evidence-lock JSON SHA-256:
  `8dda1fbde5414efd2bbc59f5bda5dc23551e81bca9e75e00ea1dcd2e56042abf`
- evidence proof blob:
  `025e2905e0a9d56cde7a2954f4c47ff4b33d0c37`

That predecessor deliberately records:
`candidate_identity_lock_evidence_verified=true`,
`candidate_enforcement_identity_accepted=false`,
`independent_review_complete=false`,
`candidate_acceptance_lifecycle_ready=false`, and
`downstream_candidate_v5_derivation_ready=false`.

This successor is therefore the **separate promotion boundary**. It does not
rewrite the evidence lock or silently reinterpret its false acceptance value.

## Protected transition

Historical V3 provenance remains immutable:

- V3 candidate `40c7d21e0f22bc2ffe079f80360af342f4d8a6aa`
- V3 accepted lock `f1b9d661eb3363e9bf18dbeb3610c659a54219bb`
- frozen V3 protected inventory
  `65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589`

The V4 protected inventory is
`c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`
with exactly one reviewed protected transition:
`ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
`3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0 -> e0a682ea4038ca22e3a3b97da2cac29874096c46`,
mode `100644`.

## Acceptance scope

Candidate-only Dispatch/census/provider jobs must run against exact candidate
head `827b94aabbecb915ab2cf22bba8f178b7d0568bc` rather than the later
acceptance head. The acceptance proof itself runs on the successor head and
requires the exact eight-path delta above #3683.

The accepted lock sets
`candidate_enforcement_identity_accepted=true` only for the exact V4 source
identity. It leaves all later authority false:

- `deployed_artifact_generation_verified=false`
- `runtime_mount_authority=false`
- `production_source_finality_authority_ready=false`
- `public_presale_activation=false`
- `funds_movement=false`

No deployment receipt is installed. No host/service mutation, credential or
wallet access, signer use, transaction broadcast, chain-2050 mutation, presale
activation, treasury/liquidity action, or funds movement occurs in this lane.

Accepted-lock JSON blob:
`4de9c2185a1359d2877b17958666f91497a91179`.

Accepted-lock proof blob:
`b16b4f45a77934e06efa09d56cb9b0750c34a6b4`.

PROTECT THE CORE.
