# Buy VOID Epoch-2 dormant first-entry protected bootstrap atomic upgrade V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_V1`.

Status: **source/test/CI only; no Precision protected-root mutation is authorized by this document or PR**.

## Purpose

The repaired bootstrap V6 generation accepted by #3483 cannot be executed from an
alternate pathname. The bootstrap authenticates `/proc/self/exe` against the fixed
protected path:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`.

Precision currently retains the predecessor generation at that fixed root. This
upgrade lane replaces the complete fixed root atomically while retaining the exact
predecessor as rollback evidence.

## Bound generations

Predecessor V6 generation:

- accepted lock:
  `voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`;
- bootstrap bytes: `874608`;
- bootstrap SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- bootstrap Git blob: `a91707c3e5803071fc73c3451c9bcb3b774f8b48`;
- manifest SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- manifest Git blob: `6e0630af72111bd9976dcc38cdcdada1904dd067`.

Repaired V6 generation:

- accepted lock:
  `voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`;
- candidate:
  `voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`;
- bootstrap bytes: `874608`;
- bootstrap SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- bootstrap Git blob: `b577d70666f98ac59a75b84b3dab741fe7b93a4b`;
- manifest SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- manifest Git blob: `de56bacb30bea0adc418e240cf3fb8d900b061ef`.

The upgrader authenticates and executes the already-reviewed outer V6 installer
source blob `438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84` only as a source of
hardened checkout, Git-tool, Python-tool, file-verification, and rename primitives.

## Plan boundary

A real plan:

1. verifies the repaired bootstrap and manifest candidate inputs;
2. authenticates the canonical checkout at an explicit expected HEAD through the
   V6 private Git observer;
3. binds the exact accepted repaired lock, Python generation, Git generation and
   generated host policy;
4. verifies the current fixed root is exactly the predecessor generation;
5. requires both the upgrade staging path and retained-predecessor path to be absent;
6. emits a content-addressed `voidbuye2bootstrapupgrade1_<sha256>` plan.

Plan mode may create temporary private Git metadata through the already-reviewed
V6 observer. It must clean that metadata before returning. It performs no protected
root mutation.

## Apply transition

Apply requires all of:

- root execution;
- Python isolated mode;
- the exact confirmation token
  `ATOMIC_EXCHANGE_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_PREDECESSOR_TO_REPAIRED`;
- the exact expected plan ID;
- unchanged candidate-file metadata;
- unchanged checkout/Python/Git/accepted-lock bindings;
- the exact predecessor root still present.

The production transition is:

1. create a private root-owned staging directory under `/opt`;
2. populate and fsync the complete repaired generation;
3. reverify predecessor, repaired stage, candidates and plan bindings;
4. atomically `RENAME_EXCHANGE` the staging root with the fixed V6 root;
5. fsync and verify repaired fixed root plus displaced predecessor;
6. revalidate plan bindings;
7. publish the displaced predecessor with `RENAME_NOREPLACE` at
   `.void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6.predecessor-lock3-5958d8e7`;
8. fsync and verify both roots again.

The repaired fixed root and predecessor are never created by in-place overwrite.

## Rollback

Any failure after the first successful root exchange is publication-aware.
Each forward rename handoff is marked attempted before entering the syscall. SIGINT
delivery is deferred across the syscall boundary, and after every successful,
failed, or interrupted rename the upgrader classifies the exact old/new root inode
layout at the fixed, staging, and predecessor pathnames. Publication and
predecessor-retention truth are derived from that observed layout rather than from
a Boolean assignment that may not have executed after kernel success.

The upgrader attempts to exchange the exact predecessor generation back into the
fixed root, move the repaired generation back to the staging pathname, and remove
only the staging inode created by the current invocation. Rollback rename outcomes
are also reconciled by exact layout; an interrupt after kernel success may continue
only when the expected next layout is already proven.

Cleanup refuses unknown entries or a substituted staging inode. A proven rollback
reports `publication_state=published_rolled_back_green`; an ambiguous rollback
reports `published_needs_inspection`. If post-rename layout observation itself fails,
the prior SIGINT mask is restored in `finally` and the operation immediately reports
publication-aware inspection-required state without attempting another destructive
transition. Automatic retry is always false.

A normally returned kernel rename is itself retained as monotonic publication
evidence before any post-syscall layout interpretation. If the first
`RENAME_EXCHANGE` returns success but the subsequent observed layout has already
been restored to READY, the upgrader does **not** reinterpret that as
prepublication state. It reports `published_needs_inspection`, performs no
prepublication cleanup, and keeps automatic retry false. The successful syscall
fact is also written to caller-owned outcome state while SIGINT remains masked.
If a fresh interrupt lands after the helper returns but before its tuple is
assigned, fallback reconciliation therefore cannot discard the successful
exchange fact even when another actor has already restored the READY layout.

The successful terminal retains the predecessor and reports
`rollback_available=true`.

## Proof coverage

The focused proof:

- authenticates the production upgrader source blob;
- runs the production self-test;
- exercises a complete atomic exchange in a temporary directory;
- verifies repaired fixed root plus retained predecessor;
- injects a post-exchange binding failure and requires a green automatic rollback;
- delivers a real pending SIGINT with `os.kill` immediately after the first exchange
  succeeds in the kernel, requiring layout capture before signal unmask and green rollback;
- injects an interruption after `observed_rename()` has returned the proven
  `LAYOUT_EXCHANGED` result but before the caller can assign its publication Boolean,
  requiring the fallback observer to infer publication from layout and perform the same
  green automatic rollback;
- delivers a real pending SIGINT immediately after predecessor retention succeeds,
  requiring the retained layout to select the correct rollback path;
- forces post-rename layout inspection to remain unavailable after a successful exchange
  and requires publication-aware `published_needs_inspection`, no automatic retry,
  and restoration of the caller's original signal mask;
- performs a successful first exchange, restores the READY layout before the
  observation returns, and requires the successful syscall itself to preserve
  `publication=true` with `published_needs_inspection` and no prepublication cleanup;
- restores READY after the helper returns, delivers a fresh SIGINT before tuple
  assignment, and requires the caller-owned successful-syscall fact to preserve
  the same inspection-required outcome without cleanup;
- verifies publication truth remains monotonic across every rollback;
- inserts a foreign staging entry and requires cleanup refusal;
- rejects subprocess/systemctl/exec-based live execution paths in the upgrader source.

No proof fixture accesses the real `/opt` protected root.

## Authority boundary

This lane does not authorize or perform:

- bootstrap normal execution;
- inner installer execution or apply;
- live service/systemd mutation;
- credential or private-key access;
- signing;
- transaction construction/submission/broadcast;
- RPC calls;
- customer payment acceptance;
- public presale activation;
- WC/VOID market activation;
- treasury/liquidity action;
- funds movement.

After this source lane is merged, Precision must first run a separately bounded
non-executing upgrade plan. The atomic host mutation remains a separate explicit
authorization boundary.

PROTECT THE CORE.
