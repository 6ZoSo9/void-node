# Apollyon live-custody reviewed-root v2 upgrade v1

This is the installed-host source successor for Xiphos after either the initial
create-only custody deployment **or** the previously accepted reviewed-V2
upgrade.

The migration contract recognizes only three exact launcher generations:

- original reviewed-v1 launcher:
  `e18124d3109ed63ff50da9c467fb1b798c300460`;
- previously installed reviewed-v2 launcher:
  `b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7`;
- current retired-V1-lineage launcher:
  `820f7151c0f83280b7457f841cee14c3b0c274b6`.

The prior-V2 migration source is not inferred from the launcher alone. The
manifest carries the complete former reviewed-v2 closure verbatim, and the
executor requires the entire existing
`/opt/void-apollyon-live-custody-binding-v2-reviewed-v2` tree to match it
before migration is admitted.

## Original reviewed-v1 path

For a host that never completed the earlier V2 upgrade, the executor:

1. verifies every reviewed-v1 source blob and the original fixed launcher;
2. requires both custody and training services inactive;
3. stages and verifies the complete current reviewed-v2 source tree;
4. installs that tree at
   `/opt/void-apollyon-live-custody-binding-v2-reviewed-v2`;
5. atomically replaces only the fixed Python launcher; and
6. re-verifies the retained reviewed-v1 root and current reviewed-v2 root.

## Previously installed reviewed-v2 path

For a host that already has the former `b96f99d6...` launcher and exact former
reviewed-v2 tree, the executor performs a bounded dormant migration:

1. verifies the retained reviewed-v1 root, exact former reviewed-v2 tree, and
   exact former launcher;
2. verifies both custody and training services are inactive;
3. stages and fsyncs the complete current reviewed-v2 tree;
4. atomically replaces the fixed launcher with the current launcher **before**
   moving the old reviewed-v2 tree. During this interval the current launcher
   fail-closes against the still-old source tree instead of starting a session;
5. atomically renames the former reviewed-v2 tree to the fixed rollback root
   `/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1`;
6. atomically installs the staged current tree at the canonical reviewed-v2
   root;
7. re-verifies the rollback tree against the complete prior-V2 manifest and the
   canonical root against the complete current manifest; and
8. re-verifies both services remain inactive.

The rollback tree is preserved. It is not deleted or overwritten by this gate.

## Interrupted migration recovery

The executor recognizes only explicit exact states. In particular it can resume
after:

- the current launcher was installed but the former reviewed-v2 root has not
  yet moved;
- the former reviewed-v2 root was preserved at the rollback path but the
  current root has not yet been installed; or
- both the current root and preserved prior-V2 rollback root are exact.

Any mixed, partial, unexpected, or content-mismatched root/launcher combination
HOLDs.

The current staging root is fixed and root-custodied. A fully verified staged
tree can be reused after interruption; a partial fixed stage is removed and
rebuilt only after its root directory itself passes the fixed root-owned
metadata check.

## Retained boundaries

The native static pre-entry remains byte-identical. The custody systemd unit,
root-custodied Node runtime, public key, state root, accounts/groups, Polkit
rule and tmpfiles rule remain untouched.

The reviewed-v2 collector admits exactly Noble systemd
`255.4-1ubuntu8.11` and `255.4-1ubuntu8.18`. Other versions remain
fail-closed.

No service start/stop/restart, systemd mutation, training, durable attempt
claim, private-key access, signing, transaction, or funds movement is
authorized by this upgrade source. Hosted CI exercises source/self-test
evidence only; it performs no Xiphos migration.
