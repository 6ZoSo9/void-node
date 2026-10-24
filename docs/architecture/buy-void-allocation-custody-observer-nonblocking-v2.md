# Buy VOID allocation-custody observer nonblocking source V2

## Purpose

This is a code-only security successor for the two observer implementations blocking Draft #3515. Historical V1 files remain immutable, and the V2 source files deliberately preserve the exact V1 emitted evidence contracts.

## Compatibility contract

The V2 files keep the V1 evidence schemas, markers, versions and `voidwlrie1_...` qualification domain. This is intentional: the security change is only how regular files are opened. The immutable rollback-independence V1 classifier and current #3515 evidence validators therefore continue to authenticate the same evidence format.

The rollback-policy V2 source imports the installation-evidence **source V2** file but calls the same V1 evidence function/contract.

## Security repair

Only retained-descriptor regular-file opens change to `O_RDONLY|O_NOFOLLOW|O_NONBLOCK`. Directory traversal remains `O_DIRECTORY|O_NOFOLLOW`. Existing type, ownership, link-count, mode, size, and before/open/after generation checks remain unchanged.

## Proof

`scripts/prove_buy_void_allocation_custody_observer_nonblocking_v2.mjs`:

- content-binds both immutable V1 source blobs;
- requires the V2 source implementations to carry `O_NONBLOCK` on their sole regular-file opens;
- proves a canonical V1 installation + rollback-policy positive classification remains accepted through the V2 source implementation;
- runs the actual V2 installation and root-owned policy readers against regular-file→FIFO swaps in child processes with a three-second timeout.

The root-only policy fixture uses a temporary directory under `/root`; it never touches the production policy path.

## Downstream

#3515 remains Draft/HOLD and is not rebound by this PR. After exact-head V2 source/CI/review acceptance, a separate #3515 rebind may change only the pinned observer source paths/blobs while preserving its V1 evidence validation semantics.

## Authority

Source/proof/CI only. No live host observation, storage mutation, rollback, service change, credential/signing, payment acceptance, presale/WC activation, treasury/liquidity action or funds movement.

PROTECT THE CORE.
