# Buy VOID Precision atomic activation staging v1

Marker: `VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1`

Status: inactive host-private byte staging. The Precision wrapper requires a
fresh GREEN atomic activation preflight immediately before staging, but the
standalone stage manifest is deliberately **not** authority that the preflight
executed. This lane does **not** install an active systemd drop-in,
daemon-reload systemd, restart the node, enable any Buy VOID runtime gate, sign
or broadcast a transaction, activate the public presale, or move funds.

## Purpose

The atomic activation preflight derives exact live and dormant rollback
generations and exact drop-in SHA-256 values. Before any separately authorized
activation transaction, both byte streams must exist outside the active systemd
drop-in tree so rollback does not need to invent policy during an incident.

This lane closes that staging requirement without crossing the activation
boundary.

## Fresh preflight input

The Precision wrapper first executes:

```text
ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh
```

and requires:

```text
status=ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED
activation_ready=true
activation_authorized=false
unreviewed_gate_source_count=0
runtime_gate_mutation_performed=false
service_mutation_performed=false
transaction_broadcast_performed=false
funds_movement_performed=false
```

The staging tool structurally validates the supplied preflight text and binds
its exact SHA-256, repository head/tree, remote main, reviewed source-slice
manifest, wrapper/tool Git blobs, and both configuration generations and
drop-in hashes.

That structural validation does **not** prove the preflight command actually
ran. Accordingly every standalone manifest records:

```text
structural_validation_only=true
fresh_execution_proven=false
manifest_is_preflight_authority=false
```

Operationally, the Precision wrapper runs the reviewed preflight itself, hashes
the exact captured log, requires the stage tool to report that same log hash,
and emits:

```text
stage_binds_exact_fresh_preflight_log=true
wrapper_fresh_preflight_execution_proven=true
stage_manifest_preflight_authority=false
```

Any later activation transaction must revalidate the operational preflight
boundary; it must not treat the stage manifest by itself as fresh-preflight
authority.

## Canonical byte derivation

The staging tool reuses the exact renderer exported by:

```text
tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs
```

For operational Precision staging, the wrapper does **not** execute the stage
tool from its mutable worktree pathname after the fresh preflight. It captures
the exact clean repository HEAD/tree before preflight, requires the fresh
preflight receipt to bind that same generation, rechecks HEAD/tree/worktree
after preflight, then materializes the stage tool and renderer from those exact
captured Git-object bytes into a private read-only temporary source directory.
Only that immutable private stage tool is executed. Git reads use absolute
`/usr/bin/git --no-replace-objects` with repository/config/object-selection
overrides stripped, and the child Node execution strips ambient Node/dynamic
loader overrides.

The wrapper emits the exact stage-tool and renderer Git blobs so later evidence
can bind the execution generation.

It does not trust the renderer's reported digest by itself: it independently
SHA-256 hashes the rendered live and rollback bytes and requires those hashes
to equal both the renderer result and the fresh preflight receipt. The Precision
wrapper then independently SHA-256 hashes the staged files again and requires
those actual file hashes to equal the exact live/rollback hashes captured from
the fresh preflight log.

The known generation currently derives:

```text
live_configuration_sha256=
88513c7982057b95380b9029157df9414203033d463aba9534d96bfc2854c14f

live_dropin_sha256=
2772e133833575e1ed9042ff3a4f114eccfb378c6a5655dcfaeb16823c068bb9

dormant_configuration_sha256=
f5366e8f24d664b7dbfebba5d39b04d2ee7ac9e1a98064190a1e133b6c2a5e87

dormant_dropin_sha256=
13e1571f1278809527a629812631e4c0413a1066ff000dc4befa341c7b17ebf7
```

A fresh preflight remains authoritative; these documented values are regression
anchors, not permission to activate.

## Host-private staging layout

The wrapper stages under:

```text
~/.config/void/buy-void-atomic-activation-staging-v1/<live-configuration-sha256>/
```

with:

```text
live/96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf
rollback/96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf
manifest.json
```

The wrapper rejects symlink/alias staging directories before any
permission-changing `chmod`; it does not follow an existing staging symlink
and mutate the target's mode.

The stage root, stage directory, and both `live/` and `rollback/`
intermediate directories are direct, realpath-exact, current-owner directories
with mode `0700`. Staged files and the manifest are direct, current-owner,
single-link regular files with mode `0600`.

Initial publication fsyncs every staged file, both intermediate directories and
the temporary stage directory before the final rename, then fsyncs the staging
parent after rename before success. Exact-stage reuse revalidates the complete
custody tree and fsyncs it again before success. This lets a later invocation
safely re-durabilize a stage that survived a process interruption after rename
but before the parent-directory fsync.

The tool fails closed if the requested staging path overlaps the active systemd
drop-in tree. Existing exact staging is accepted idempotently only after the
full custody check; byte, manifest, ownership, link, directory-alias or mode
drift HOLDs.

## Precision execution

After this source lane is merged and Precision is aligned to the reviewed
`main`, run:

```bash
bash ops/precision/void_precision_buy_void_atomic_activation_stage_v1.sh
```

The wrapper re-runs the complete atomic preflight, including the reviewed
read-only PostgreSQL TLS/schema requalification. Credential contents are not
printed. The staging step itself does not access credentials.

It records the service PID and invocation ID before staging and requires both to
remain unchanged afterward, then rechecks node health and readiness.

## Authority boundary

```text
inactive_staging_only=true
wrapper_fresh_preflight_execution_proven=true
stage_manifest_preflight_authority=false
immutable_stage_source_execution=true
reviewed_git_source_boundary=true
durable_fsync_publication_required=true
private_stage_custody_required=true
active_dropin_write=false
daemon_reload=false
service_stop=false
service_start=false
service_restart=false
runtime_gate_mutation=false
wallet_or_signer_access=false
transaction_signing=false
transaction_broadcast=false
public_activation=false
funds_movement=false
```

A standalone stage-tool GREEN result means only that the exact live and
rollback bytes have been durably materialized under the private custody
contract and are ready for review. It does not establish preflight freshness.

A Precision-wrapper GREEN result additionally means that wrapper invocation
executed the fresh preflight immediately before staging and bound the stage to
the exact captured preflight-log SHA-256.

Neither result is **activation authority**. Installing the live file into the
active drop-in tree, daemon-reloading, crossing the controlled restart boundary
and enabling money-capable execution remain a later separately reviewed
operation.
