# Accepted protected V4 lock + canonical producer V5 composition V2

## Purpose

Restack existing Draft #3682 onto the exact accepted protected V4 lock in
Draft #3688 while preserving the prior composition in history and reusing the
exact seven reviewed canonical V5 source paths from Draft #3681.

Current parents:

- prior composition history: `5e6137c8b3e905e891d5571ec95cc413b8207334`;
- accepted V4 lock: `75927cae2c7ed0b4273e6218937dedf69824f64c` (#3688);
- canonical V5 source donor: `e7ad76967282b342118839cb507414de47051c69` (#3681).

The present tree is based on #3688. The superseded V1 composition evidence
files are absent from this tree and replaced by three V2 evidence files.

## Accepted V4 preservation

These identities remain byte-for-byte unchanged:

- V4 candidate: `5893e300a78dc4ca7729ef47f95a8e3eea2043cf`;
- V4 lock: `854b9e39772e1e930c63b71e1099509df0f2dbf8`;
- V4 lock proof: `040414e96906043e2a01995bf2cbd259a7dbd58f`;
- V4 lock document: `3f8774841ea347b817b1a232e85e1cb0751d0416`;
- V4 lock workflow: `231f5697c23e7f234e566877da9738093a091313`.

The accepted V4 lock still applies only to the exact V4 source generation.

## Canonical V5 transition

The range router remains `src/index.ts@7df1f21c730b554c414c88c550a4475234485370`. Canonical V5 changes
exactly one protected inventory row:

- V4 runner: `6fb040de128ce0df16e848d61ea5f4acb62794da`, mode `100755`;
- V5 runner: `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`, mode `100755`.

The V5 guard, proof, dispatcher, launcher, workflows, and custody document are
copied byte-for-byte from exact #3681 head `e7ad76967282b342118839cb507414de47051c69`.

A new protected candidate V5 and a separate V5 acceptance lock are required.
The accepted V4 lock is preserved rather than silently repinned.

## Lifecycle boundary

This composition creates no candidate V5, no V5 lock, no deployment receipt,
and no runtime cutover. The deployment receipt installed for V4 remains
evidence only for the installed V4 generation.

No service mutation, credential or signer access, provider RPC contact,
transaction/payment acceptance, presale/WC activation, treasury/liquidity
action, or funds movement occurs.

PROTECT THE CORE.
