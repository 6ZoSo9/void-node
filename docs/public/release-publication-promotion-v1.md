# VOID Public Release Publication and Promotion v1

`VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1`

This wall turns a verified release build into an official, immutable VOID
release and then moves it through explicit candidate and stable promotion.
Publication and promotion are separate operations.

## Public lifecycle

```text
clean main commit
  -> deterministic release assets
  -> SHA-256 + SPDX SBOM
  -> GitHub build and SBOM attestations
  -> immutable GitHub Release
  -> publication receipt
  -> isolated canary receipt
  -> candidate channel PR
  -> stable channel PR
```

The canonical stable pointer is the reviewed file on `main`:

```text
https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/public-node/void-network/channels/stable-v1.json
```

An installed node can inspect it without mutating state:

```bash
void-node update check \
  --channel https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/public-node/void-network/channels/stable-v1.json
```

Candidate manifests are inspectable, but candidate application is refused by
default. An operator must deliberately pass `--allow-candidate`.

## Immutable publication

A publication requires all of the following:

- exact package version, `release-v<version>` tag, and 40-character source commit;
- a clean source tree at the exact `main` commit;
- repository release immutability enabled before tag creation;
- deterministic release assets and both checksum manifests;
- build provenance and SBOM attestations;
- an annotated tag that did not already exist;
- a release name that did not already exist;
- successful `gh release verify` and per-asset verification;
- an immutable publication receipt bound to the publication packet.

Tag replacement, asset replacement, `--clobber`, and release deletion are not
part of this lane.

## Candidate and stable promotion

Candidate promotion requires an immutable publication receipt. Stable promotion
also requires a canary receipt proving release verification, checksums,
attestations, user-scoped installation, update checking, health gating, and
rollback behavior.

Every transition is appended to a hash-chained promotion ledger. The public
candidate/stable manifests, release history, freeze status, revocation registry,
and promotion receipts are regenerated from that ledger and published through a
normal exact-head pull request.

## Freeze, revocation, and rollback

- **Freeze** blocks candidate and stable promotion.
- **Emergency rollback** remains available while frozen.
- **Revocation** records a permanent reason and blocks future use of that tag.
- Revoking the current stable release requires an atomic rollback to a
  previously stable, non-revoked release.
- The updater rejects a channel that explicitly marks its release revoked.

## Safety boundary

Publication and promotion do not deploy a node, start or restart a service,
generate keys, change wallet state, write Work Credit ledgers, fulfill Buy VOID,
admit validators, move treasury assets, or transfer authority.

## Qualification gate

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1`

Stable promotion additionally requires a green qualification receipt covering
the full target matrix and an approval from a reviewer identity that did not
run those targets.
