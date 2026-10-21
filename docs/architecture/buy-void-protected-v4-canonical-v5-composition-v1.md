# Protected V4 + canonical producer V5 composition V1

## Purpose

Compose two reviewed source generations without mutating either history:

- current-main/range/canonical V5 source parent: `e7ad76967282b342118839cb507414de47051c69` (#3681);
- protected V4 deployment-reader candidate parent: `895c2bf320defbbca5fba6792e2a75126b2c4d76` (#3680).

The parents already agree on reviewed range router `src/index.ts` blob
`7df1f21c730b554c414c88c550a4475234485370`.

## Closed path union

The composition keeps the complete #3681 tree as its first-parent source state and
overlays exactly the 17 repaired deployment-reader / protected-candidate / Dispatch
files from #3680. Three ADD-only composition evidence files are added.

This is deliberate merge resolution, not a claim that the two branch trees are
otherwise identical.

## Protected inventory result

Candidate V4 remains immutable and unaccepted. Comparing its 49 protected rows
against the composed tree yields exactly one mismatch:

`ops/run-void-node-live-v1.sh`

- candidate V4: `6fb040de128ce0df16e848d61ea5f4acb62794da`, mode 100755;
- canonical V5: `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`, mode 100755.

The repaired deployment-reader row remains
`e0a682ea4038ca22e3a3b97da2cac29874096c46` and therefore does not regress.

A later protected candidate V5 must rederive the exact 49-row inventory and may
accept only this reviewed runner transition. Historical V4 candidate/lock evidence
must not be repinned in place.

## Authority

Composition/proof/CI only. Candidate V5 is required but not created or accepted
here. No merge, protected-host apply, runtime/service mutation, credential/signer
access, transaction/payment acceptance, presale/WC activation, treasury/liquidity
action or funds movement.

PROTECT THE CORE.
