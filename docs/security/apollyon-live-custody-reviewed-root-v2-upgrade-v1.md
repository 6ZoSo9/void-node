# Apollyon live-custody reviewed-root v2 upgrade v1

This is the installed-host source successor for Xiphos after either the initial
create-only custody deployment **or** the previously accepted reviewed-V2
upgrade.

The migration contract recognizes four exact fixed-launcher generations:

- original reviewed-v1 launcher:
  `e18124d3109ed63ff50da9c467fb1b798c300460`;
- previously installed reviewed-v2 launcher:
  `b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7`;
- previously installed current-root launcher:
  `820f7151c0f83280b7457f841cee14c3b0c274b6`;
- current **retired** fixed launcher:
  `352bd36f2b07091140b990de4170f708eb11fee6`.

The retired fixed launcher is sourced from
`ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py`
but is installed at the unchanged fixed launcher pathname. Its live path emits
negative authority and HOLDs before Node open, reviewed-root materialization,
runner spawn, lifecycle-lock acquisition, or systemd/service action.

The prior-V2 migration source is not inferred from the launcher alone. The
manifest carries the complete former reviewed-v2 closure verbatim, and the
executor requires the entire existing
`/opt/void-apollyon-live-custody-binding-v2-reviewed-v2` tree to match it
before migration is admitted.

## Original reviewed-v1 path

For a host that never completed the earlier V2 upgrade, the executor:

1. verifies every reviewed-v1 source blob and the original fixed launcher;
2. requires successful systemd observations proving both custody and training units are exactly `LoadState=loaded`, `ActiveState=inactive`, `SubState=dead`, `MainPID=0`;
3. stages and verifies the complete current reviewed-v2 source tree;
4. installs that tree at
   `/opt/void-apollyon-live-custody-binding-v2-reviewed-v2`;
5. atomically replaces only the fixed Python launcher; and
6. re-verifies the retained reviewed-v1 root and current reviewed-v2 root.

## Previously installed reviewed-v2 path

For a host that already has the former `b96f99d6...` launcher and exact former
reviewed-v2 tree, the executor performs a bounded dormant migration. A canonical
create-only prior-V2 install is valid even when the unrelated historical
reviewed-v1 root is absent. If that old root is present, it must still match the
exact reviewed-v1 closure; any collision HOLDs.

1. verifies the exact former reviewed-v2 tree and exact former launcher, and
   validates the reviewed-v1 root if present;
2. verifies both custody and training units with the same exact `loaded/inactive/dead/MainPID=0` contract;
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
8. re-verifies both units still satisfy the exact `loaded/inactive/dead/MainPID=0` contract.

The rollback tree is preserved. It is not deleted or overwritten by this gate.

The old reviewed-v1 root is mandatory only when the launcher/root state is a
legacy-v1 migration source. For prior-V2 and already-current states, its absence
is accepted; if present it is content-verified and its presence/absence state
must remain unchanged across apply. This admits the canonical direct prior-V2
installer layout without weakening collision handling or the legacy-v1 path.

A service-state query failure, unknown/not-found unit, nonzero MainPID, or any
`active`, `activating`, `reloading`, `deactivating`, or `failed` state HOLDs.
No root rename is permitted on a merely "not active" observation.

## Current-root fixed-launcher retirement path

A host may already have the exact current reviewed-v2 source root while its
fixed launcher is still the formerly supported `820f7151...` generation.
That state is admitted only when the reviewed root is exact and any preserved
prior-V2 backup root is either absent or exact.

For this state the executor:

1. proves both custody and training services are exactly
   `LoadState=loaded`, `ActiveState=inactive`, `SubState=dead`,
   `MainPID=0`;
2. verifies the current reviewed root without modifying it;
3. atomically replaces only the fixed launcher, from
   `820f7151...` to retired `352bd36f...`;
4. performs a two-pass `/proc` quiescence census after the swap and requires
   no root-owned native live-session preentry, fixed-launcher Python process,
   or private reviewed Node runner generation to remain in flight;
5. re-attests both services are still exactly dormant;
6. re-verifies the current reviewed root is byte-identical;
7. repeats the process quiescence barrier and exact service dormancy before
   reporting the migration complete.

If an old launcher generation loaded before the pathname replacement, the
retired pathname prevents any new old generation from loading, but the already
loaded process can still exist. The post-swap census therefore HOLDs while any
such reviewed root-owned generation remains. A retry that observes the retired
`new_exact` launcher must pass the same two-pass process census before it can
report `UPGRADE_ALREADY_EXACT`. Pathname replacement plus service dormancy
alone is not accepted as proof of retirement.

The process census is restricted to UID 0 because the reviewed native preentry
and historical fixed launcher both require root. This prevents an unprivileged
process from indefinitely blocking the gate merely by spoofing matching argv
strings.

This path does **not** build a stage, rename the reviewed root, or rewrite any
reviewed-root file. The reviewed root intentionally still contains historical
`apollyon_live_custody_source_session_launcher_v2.py` blob
`820f7151...` as a root-custodied reviewed source file. That file is not the
installed fixed launcher. Its own fixed-path identity check prevents it from
being used as the supported launcher from the reviewed-root pathname.

Fresh create-only installation likewise installs the retired successor as the
fixed launcher while retaining the unchanged reviewed source closure.

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

## Privileged Python interpreter startup HOLD (October 19, 2026)

Both root-capable operator entrypoints in this Draft—the create-only custody
installer and reviewed-root upgrader—now reject any Python process that does
not have `isolated`, `ignore_environment`, `no_user_site`, `dont_write_bytecode`
and `safe_path` enabled **before any standard-library or checkout-resolved
imports**. The accepted script invocation is explicitly `python3 -I -B`.
The new disposable proofs copy each source into a directory containing a
hostile `json.py` and require `python3 -B` or `python3 -I` (without `-B`) to
HOLD before that module executes. Normal isolated source self-tests still pass.

**This early script guard does not authenticate interpreter startup.** A hostile
`sitecustomize`, `.pth` startup hook, poisoned interpreter binary, or other code
that runs *before* script entry cannot be undone or prevented by the guard.
Any future privileged host installation therefore still requires separately
reviewed, root-custodied launch provenance for a pinned trusted Python
interpreter invoked with `-I -B` and a sanitized environment. These source
checks do not qualify that launcher or permit `--apply` on Xiphos.
The ordinary lifecycle and all negative training, key, service-activation,
transaction and funds authority remain unchanged.

**PROTECT THE CORE.**
