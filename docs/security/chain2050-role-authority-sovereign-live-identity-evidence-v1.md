# Chain-2050 SOVEREIGN live identity evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_LIVE_IDENTITY_EVIDENCE_V1`

This evidence freezes the successful read-only Precision observation that the
running main VOID node is still using the exact Ed25519 identity already
published and independently verified for Precision.

## Exact identity

- identity: `sovereign.zoso`
- live service: `void-node-live.service`
- live key path: `/home/zoso/dev/void-node/.secrets/nodeA.key`
- node ID: `9d89483769e469e0473b489dc50dba96`
- public-key DER SHA-256:
  `2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b`
- subject binding:
  `7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e`

The observer used the same Node `crypto.createPrivateKey() -> createPublicKey()`
derivation path as the production VOID key loader and printed no private-key
contents.

## Process source observation

The running service reported:

- source commit:
  `aa0492e60868dd1fcd8115f154b05ab48de07f85`
- source tree:
  `a64791018335fe53f6c534dd08fda684a64605cb`
- source branch: `main`

This evidence binds the live identity only. It does not claim the currently
running node process includes later role-authority source changes.

## Evidence identity

`voidcraslie1_88246d9a99f8a677e851e126ad860e6f57871f35275e1ca4eb9166c71e6536b2`

Parent genesis preparation:

`voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee`

## Authority boundary

This record performs and authorizes no signature, transaction broadcast,
Chain-2050 write, role-authority registry append, wallet/signer access, or funds
action.

The next gate is a read-only genesis append preflight against the deployed
registry.
