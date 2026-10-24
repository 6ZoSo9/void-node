# Accepted protected V4 lock + canonical producer V5 composition V2

## Purpose

Compose the current accepted V4 source identity from #3688 with the exact
canonical-producer V5 source generation already merged through #3681. Historical
#3682 remains first-parent history; the repaired V4 acceptance generation is the
second parent.

Current intended parents:

- prior #3682 history: `94a07497a1583ec990ac0ca665604bebf570b5e7`;
- accepted V4 source identity: `2f214e81dc867c8dc526c9c883cfd4e85f34ca44` (#3688 repaired head);
- canonical V5 donor: `c6f31c19ef3def20902b2c2b735de0803b2a2ab0` (#3681 reviewed V5 source).

## Accepted V4 preservation

The composition preserves the exact current V4 generation:

- candidate: `ec00f0c552e600fff38e4998e4beb128c93b481d`;
- accepted lock: `4de9c2185a1359d2877b17958666f91497a91179`;
- accepted-lock proof: `15c33b8c88db7d31af96bbd50ed4940425ff7417`;
- accepted-lock document: `2ef2554fdc0cba8f194c74b2f7c53bf1377e3814`;
- acceptance workflow: `bf4d059202ed62449fbc6cfe62402aaa73b22682`.

The acceptance proof includes the fail-closed standalone-derive repair: accepted
bytes cannot be emitted without exact #3683 predecessor evidence.

## Canonical V5 transition

The range router remains
`src/index.ts@a09661797aa4295371c036be36d82995e5233269`.
The accepted V4 candidate's 49-row protected inventory is
`c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`.

Canonical V5 changes exactly one protected row:

- V4 runner: `6fb040de128ce0df16e848d61ea5f4acb62794da`, mode `100755`;
- V5 runner: `bc6a17ccdf389299fb139db37e742f0b1ad9dc4e`, mode `100755`.

The resulting current protected inventory SHA-256 is
`7b56a1e130f2a2caa7ca29c6319dbe8823bc2147931ee2d7c7ba6f077a2d18c3`.

All seven canonical-V5 source/workflow blobs are copied byte-for-byte from
`c6f31c19ef3def20902b2c2b735de0803b2a2ab0`.

## Lifecycle boundary

This composition does not create or accept candidate V5. A separately versioned
V5 candidate and acceptance lock remain required. It creates no deployment
receipt and grants no runtime cutover, service mutation, credential/signer,
payment/presale, transaction, treasury/liquidity, or funds authority.

Composition proof blob:
`666c5b97276d04707bd0dced317193f83a58f371`.

PROTECT THE CORE.
