# VOID V7 source-release full-history reseal V1

Status: **source/test/CI only**. No protected host mutation is authorized or performed.

## Host finding

Precision's active accepted V7 source release at
`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`
is a real one-commit shallow repository. Its `.git/shallow` contains exactly the
accepted head, and the accepted merge commit's parents
`5752b69a7253a44fd3fabe2964476174b3a80c40` and
`6b7fc90219676a96f5a2c34619e4cfdf3f002244` are absent from that release.

Removing the shallow marker would therefore create false provenance. Installer
V4 correctly HOLDs this generation.

The canonical Precision source checkout is non-shallow and contains the complete
accepted history. The accepted head has tree
`de12c9d2d5e475d435d21da3b047d7b63b69e2b7`, exactly two reviewed parents,
17,931 reachable commits, and roughly 42 MiB of reachable object storage.

## Candidate builder

`ops/precision/void_v7_source_release_full_history_reseal_v1.py` builds only a
disposable candidate beneath `/home/zoso/Downloads`.

It:

1. requires isolated, unoptimized Python;
2. requires a clean non-shallow canonical `main` checkout;
3. authenticates the accepted commit, tree and both parents;
4. requires exactly 17,931 reachable commits and no missing reachable objects;
5. creates a new physical in-tree `.git` repository with a closed core-only config;
6. streams exactly the accepted head's reachable closure through
   `git pack-objects --revs` into `git index-pack --stdin`;
7. creates symbolic `main` at the exact accepted head;
8. checks the exact tree/index/worktree, full-history status, parent set,
   object closure and strict fsck;
9. rejects shallow, graft, alternate, HTTP-alternate, commondir and
   config.worktree metadata.

The pack bytes themselves are not authority; the reconstructed Git object IDs,
connectivity and exact worktree are.

## Authority boundary

This lane does not mutate `/opt`, the active release, services/systemd,
credentials, keys, signers, transactions, payment state, presale/WC activation,
treasury/liquidity state or funds.

A GREEN candidate is only input to a future separately reviewed and separately
authorized protected release repair. The active release must not be edited
in-place by deleting `.git/shallow`.

PROTECT THE CORE.
