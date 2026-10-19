# Installed Apollyon training bus-isolation activation retirement V2

Marker: `VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V2`.

Status: **source/test/CI fail-closed retirement gate; no reviewed Apollyon path currently starts or stops the training service**.

## Purpose

The reviewed Apollyon training unit can still be activated directly through
systemd by a path that does not participate in repository userspace locks.

That creates an ownership ambiguity for any userspace activator:

1. an owner checks that the unit is dormant;
2. a direct/manual `systemctl start` wins immediately afterward;
3. the owner calls its own `systemctl start`;
4. systemd reports success for an already-active unit;
5. the owner can adopt and later stop a generation it did not create.

A lifecycle flock cannot close that race because a direct systemd start does not
honor the flock. A closer pair of state snapshots cannot prove which caller
created the generation either.

This gate therefore removes activation authority instead of pretending the
remaining interval is owned.

## Current invariant

**There is no reviewed Apollyon training-service activator in this generation.**

Both previously mutation-capable entry points now fail closed before reaching
any service-lifecycle action:

- V2 `--live-qualify`;
- the lock-aware live-custody launcher live path.

V1 standalone activation remains retired in the accepted parent. V1
`--observe-live-pid <pid>` remains observation-only.

## Retired V2 standalone contract

V2 `--live-qualify`:

1. validates the target host and root execution;
2. emits and flushes a retired-mode authority receipt;
3. performs no lifecycle-lock acquisition;
4. performs no `systemctl start`;
5. performs no `systemctl stop`;
6. emits
   `HOLD=standalone_live_qualify_retired_use_lock_aware_launcher`.

The V2 authority receipt states:

```text
mode=live-qualify-retired
host_filesystem_mutation=false
git_mutation=false
git_fetch=false
service_process_action=false
service_start_stop=false
credential_access=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
chain_mutation=false
economic_activation=false
funds_movement=false
authority_receipt_before_retired_hold=true
```

The historical HOLD reason names the lock-aware launcher because that was the
intended successor when V2 was first retired. The launcher itself is now also
retired for live activation by this exact child generation.

There is no successful standalone V2 qualification receipt or qualification ID.

## Retired lock-aware launcher live contract

The reviewed launcher source is:

`ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py`

Exact Git blob:

`352bd36f2b07091140b990de4170f708eb11fee6`.

Its live `execute_live(...)` path now:

1. requires root;
2. requires the reviewed native-preentry environment marker;
3. emits and flushes a retired-mode authority receipt;
4. performs no installed-launcher identity read;
5. performs no lifecycle-lock acquisition;
6. performs no reviewed-closure materialization;
7. performs no Node/runtime open;
8. installs no runner signal handlers;
9. spawns no runner;
10. performs no systemd query/start/stop;
11. emits
    `HOLD=apollyon_live_session_launcher_activation_retired_atomic_ownership_required`.

The launcher authority receipt states:

```text
mode=live-retired
host_filesystem_mutation=false
private_closure_filesystem_mutation=false
git_mutation=false
git_fetch=false
service_process_action=false
service_start_stop=false
systemd_mutation=false
credential_access=false
operator_private_key_access=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
chain_mutation=false
economic_activation=false
funds_movement=false
authority_receipt_before_retired_hold=true
```

The CLI HOLD output repeats the negative filesystem/service/claim/training/key/
transaction/funds boundary.

Because no runner is spawned from the live path, there is no remaining
pre-spawn SIGTERM/SIGHUP interval that can cause the launcher to start the
training service after a termination request.

## Canonical deployment closure

The supported fixed-launcher deployment path is now bound by parent #3523.

Fresh create-only installation uses
`ops/xiphos/apollyon_live_custody_source_session_create_only_install_v1.py`
blob `87fa30d10d8d18716cd37ee2d375f0a1d094bdcf`. Its fixed-launcher source is
the retired successor above, blob
`352bd36f2b07091140b990de4170f708eb11fee6`.

Existing hosts are covered by
`ops/xiphos/apollyon_live_custody_reviewed_root_v2_upgrade_v1.py`
blob `95b2f64562e995611807aac7f9b8b044775f203b`. The upgrader recognizes
the formerly installed fixed launcher
`820f7151c0f83280b7457f841cee14c3b0c274b6` only as
`prior_current_exact` and migrates it to retired
`352bd36f2b07091140b990de4170f708eb11fee6`.

That current-root migration is launcher-only: the reviewed root is verified
byte-identical and no root stage/rename/migration occurs. After launcher
replacement, the upgrader requires a two-pass UID-0 process census with no
reviewed native preentry, fixed-launcher Python process, or private Node runner
generation still in flight. Exact service dormancy is then re-attested. The
same process-quiescence barrier and dormancy check repeat before success.

If an old `820f7151...` launcher loaded before pathname replacement, the
retired pathname prevents new old generations from loading while the census
HOLDs until the already-loaded generation disappears. A retry that observes the
retired launcher still must pass the same quiescence barrier.

The reviewed root intentionally retains historical `launcher_v2.py` source
blob `820f7151...` as immutable evidence. It is not the supported installed
fixed launcher. Its fixed-path identity check prevents supported execution from
the reviewed-root pathname.

Therefore the accepted installer/upgrade closure does not leave a reviewed
deployment path that installs the runner-spawning historical launcher as the
fixed live launcher.

## Preserved observer contract

V1 source remains:

`1fdb495aafa136119d50f41410b015930d9fc90d`.

V1 `--observe-live-pid <pid>` remains the same-process observation interface.
This child does not modify the V1 observer receipt or qualification-ID
derivation.

Observation does not authorize activation or cleanup.

## Preserved inert helper primitives

The launcher still carries reviewed helper primitives for future source work,
including:

- replacement-stable root-only lifecycle flock;
- exact service-state observation;
- reverse lifecycle dependency inspection;
- exact dormancy checks;
- stop-and-dormancy attestation;
- runner termination-latch helpers;
- reviewed closure materialization;
- retained Node runner provenance.

Hosted proof continues to exercise these helpers as isolated/adversarial source
primitives where useful. Their presence does **not** grant a live call path:
`execute_live(...)` returns the retirement HOLD before any helper capable of
host mutation or runner launch is called.

The accepted Node runner remains content-bound at:

`8c2c92055ab05c074653cee971e095934b5cb85c`.

It is not invoked by the retired launcher live path.

## Hosted proof

Hosted proof is inert and performs no Xiphos service action.

The exact proof requires:

- public and private V2 standalone paths HOLD with no lock/systemd action;
- V2 CLI reports service/process action false;
- launcher live path HOLDs with the exact atomic-ownership retirement reason;
- any launcher live-path attempt to acquire the lifecycle lock, open Node,
  materialize the private closure, install runner termination handlers, inspect
  installed launcher identity, or call `subprocess.run` fails the test;
- launcher CLI reports filesystem/service action false;
- launcher live section contains no systemd call or runner spawn;
- the pre-spawn termination window is absent because there is no spawn;
- canonical fresh install selects retired fixed-launcher blob `352bd36f...`;
- canonical existing-host upgrade migrates `820f7151...` to `352bd36f...` without rewriting the current reviewed root;
- canonical existing-host upgrade proves no root-owned old preentry/launcher/runner generation remains after the swap or on retry;
- V1 observer provenance remains pinned;
- retained helper primitives preserve their fail-closed source contracts;
- training, claim, signing, transaction and funds authority remain false.

## Future activation gate

A future training-service activator must be a separate reviewed gate that
provides **atomic activation ownership** at the systemd/service protocol
boundary.

The future design must ensure that a non-review-aware direct start cannot be
mistaken for the reviewed caller's generation and later stopped by it.

Userspace preflight snapshots, a userspace flock, or a post-start PID check are
not sufficient on their own.

Until that gate is accepted, no reviewed Apollyon source path may start or stop
the training service.

## Authority

This source gate grants no:

- merge;
- Xiphos installation or host mutation;
- lifecycle-lock acquisition in a live path;
- systemd or service action;
- runner spawn in a live path;
- durable attempt claim;
- trainer release or training/model execution;
- candidate-weight mutation;
- credential/private-key/signing/wallet access;
- transaction construction/signing/broadcast;
- chain/economic activation;
- funds movement.

No live action follows from source acceptance.

PROTECT THE CORE.

## October 19 canonical installer/upgrade interpreter-isolation rebind

The current parent #3523 `ce471b9ca32f340bca61107c18bbc6b09346b81d`
requires Python isolated-mode flags before checkout-resolved imports in both
root-capable deployment entrypoints. Their source identities are pinned above.
This retired V2 qualifier remains byte-identical and still cannot activate
training. These pre-import guards are **not** proof that privileged Python
interpreter startup was trusted: reviewed root-owned launcher provenance,
`-I -B`, and sanitized startup remain separate host gates.

No Xiphos deployment, service/systemd operation, credential, training,
transaction, or funds authority is added by this source-only rebind.
