# Buy VOID allocation-custody observer nonblocking V2

## Purpose

This source-only successor closes the transitive FIFO-open availability HOLD found while reviewing Draft #3515. Historical V1 observer files remain unchanged.

V2 adds `O_NONBLOCK` only to the retained-descriptor, read-only regular-file opens in:

- `tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs`;
- `tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs`.

Directory traversal continues to require `O_DIRECTORY|O_NOFOLLOW`. The regular-file readers retain their file-type, owner/group, link-count, mode, bounded-size and before/open/after generation checks.

The rollback-policy V2 observer imports the installation-evidence V2 observer, so its storage observation is nonblocking transitively.

## Proof

`scripts/prove_buy_void_allocation_custody_observer_nonblocking_v2.mjs`:

- content-binds the immutable V1 observer blobs;
- statically requires the V2 regular-file opens to include `O_NONBLOCK`;
- runs the actual V2 installation reader against a regular-file-to-FIFO swap;
- runs the actual V2 root-owned policy reader against the same swap;
- executes both FIFO cases in child processes with a 3-second timeout, so loss of `O_NONBLOCK` fails rather than hanging CI.

The policy FIFO fixture runs as root only inside GitHub Actions and uses a temporary root-owned directory under `/root`. It does not touch the production policy path.

## Authority

Source/proof/CI only. No live Precision observation, storage bootstrap, journal/high-water write, rollback, service mutation, credentials, signing, payment acceptance, presale/WC activation, treasury/liquidity action or funds movement.

This PR does not rebind #3515. That is a separate successor step after exact-head V2 source/CI/review acceptance.

PROTECT THE CORE.
