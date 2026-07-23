# VOID Public Release Qualification v1

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1`

An immutable release is not automatically a stable release. Before stable
promotion, VOID requires a release-bound qualification matrix and a distinct reviewer approval.

## Required matrix

Every release must provide one green, hash-bound result for:

- Ubuntu 22.04 x64 fresh install;
- Ubuntu 24.04 x64 fresh install;
- Debian 12 x64 fresh install;
- Windows WSL2 with Ubuntu 24.04 x64;
- upgrade from the current stable release;
- forced health-failure rollback;
- two-node synchronization and restart persistence;
- participant UI safety and read-only-default smoke.

Each result is bound to the publication packet, immutable publication receipt,
canary receipt, exact release tag, and source commit. Missing, duplicate,
tampered, or failed results block qualification.

## Independent approval

The reviewer who approves the qualification receipt must not be one of the
runner identities in that receipt. Approval uses the exact phrase:

```text
APPROVE RELEASE QUALIFICATION release-vX.Y.Z
```

Stable promotion then requires both the qualification receipt and the
qualification approval. Candidate promotion remains possible without them so
qualification can be performed against the candidate release.

## Safety boundary

Qualification does not publish a tag, create an official release, deploy a live
node, start a service implicitly, generate keys, move money, fulfill Buy VOID,
write Work Credits, admit validators, move treasury assets, or transfer
authority.
