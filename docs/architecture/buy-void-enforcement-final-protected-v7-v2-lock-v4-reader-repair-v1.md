# Buy VOID protected V7/V2 lock V4 reader-repair V1

Status: **source/CI evidence lock; candidate acceptance remains HOLD**.

This lock binds only #3680 exact candidate `827b94aabbecb915ab2cf22bba8f178b7d0568bc`:

- candidate blob `ec00f0c552e600fff38e4998e4beb128c93b481d`;
- 17,788 bytes;
- SHA-256 `fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60`;
- enforcement-set SHA-256 `00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a`;
- protected inventory SHA-256 `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`;
- derivation proof blob `3a7401202fee374f2a7da3f5efc0d29976f9792a`;
- current Dispatch V4 proof blob `9de04b5340f904b8886562727d5f9006876b7ec5`.

Hosted exact-head evidence is workflow run `40053691462`:
Node 22/24/26 candidate artifacts `12544821142 / 12544756476 / 12545000635`,
cross-node job `120752978070`;
Dispatch V4 artifacts `12545050015 / 12543609325 / 12545025023`,
cross-node job `120752773488`;
historical V3 lock source-proof job `120756509483`.

Historical V3 provenance remains immutable:
candidate `40c7d21e0f22bc2ffe079f80360af342f4d8a6aa`,
accepted lock `f1b9d661eb3363e9bf18dbeb3610c659a54219bb`.
The reviewed protected transition remains exactly the descriptor-bound deployment-receipt reader
`3de6e4bd... -> e0a682ea...`, mode `100644`.

The evidence lock deliberately keeps:
- `candidate_identity_lock_evidence_verified=true`;
- `candidate_enforcement_identity_accepted=false`;
- `independent_review_complete=false`;
- `candidate_acceptance_lifecycle_ready=false`;
- `downstream_candidate_v5_derivation_ready=false`;
- deployment/runtime/source-finality/presale/funds authority false.

A separately reviewed successor is required before any acceptance promotion or V5 derivation.
No host apply, service mutation, credentials/signing, transaction/payment, treasury/liquidity or funds authority.

Lock blob: `c9e50cebb0735981f946a1afbc4de6d692ced347`.
Proof blob: `025e2905e0a9d56cde7a2954f4c47ff4b33d0c37`.

PROTECT THE CORE.
