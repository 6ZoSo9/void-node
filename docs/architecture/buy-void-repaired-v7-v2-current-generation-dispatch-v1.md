# Repaired V7/V2 current-generation dispatch v1

This successor is stacked on current-main reconciliation head
`af9646827b25e8103004f96525623ba248b41d2a`.

It changes no protected economic/runtime source and does not rewrite historical
evidence. The exact accepted V2 candidate, lock JSON and frozen lock proof remain
byte-identical.

The current integration differs from the original five-file acceptance-lock
branch, so rerunning the frozen lock proof's branch-scope assertion is expected
to fail. Current CI instead:
- rederives the exact V2 candidate bytes;
- requires byte identity with committed candidate evidence;
- verifies the exact accepted lock object and immutable frozen lock-proof blob;
- proves the accepted lock is consumable by the deployment planner;
- runs V4 protected census semantics for the repaired Ethereum V2 generation.

The historical V3 census and five-file lock proof remain valid only for their
historical source generations. They are not repinned or weakened.

The historical V1 final-protected candidate workflow is also generation-dispatched.
On current repaired V2 source it requires the frozen V1 candidate proof to fail
closed with `runtime_or_build_source_changed_after_hosted_census`, while the
current V2 integration-consumption proof must pass on Node 22/24/26. Frozen V1
candidate/lock JSON and proof blobs remain unchanged.

Two coupled-launch proof paths that overlapped newer main are pinned to the
current-main blobs:
- `59357584271c3effaaefb725d630593163b7a9e2`;
- `7bc37b4ffcc2d3071bfcedfbeccc734161033b08`.

No protected install, deployment receipt apply, service/RPC/provider mutation,
credentials/keys/wallet/signers, payment/transaction, WC/presale activation,
treasury/liquidity/inventory action or funds movement occurs.
