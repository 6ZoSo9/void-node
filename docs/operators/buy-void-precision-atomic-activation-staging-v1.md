# Buy VOID Precision atomic activation staging v1

Marker: `VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_STAGE_V1`

Status: inactive host-private staging after a fresh GREEN atomic activation
preflight. This lane does **not** install an active systemd drop-in, daemon-reload
systemd, restart the node, enable any Buy VOID runtime gate, sign or broadcast a
transaction, activate the public presale, or move funds.

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

The staging tool also requires the receipt to bind the repository head/tree,
remote main, reviewed source-slice manifest, wrapper/tool Git blobs, and both
configuration generations and drop-in hashes.

## Canonical byte derivation

The staging tool reuses the exact renderer exported by:

```text
tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs
```

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

The stage directory is mode `0700`; staged files and the manifest are mode
`0600`.

The tool fails closed if the requested staging path overlaps the active systemd
drop-in tree. Existing exact staging is accepted idempotently; any existing
byte, hash, manifest or mode mismatch HOLDs.

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

A GREEN staging result means only that the exact live and rollback bytes have
been materialized privately outside the active systemd tree and are ready for
review.

It is **not activation authority**. Installing the live file into the active
drop-in tree, daemon-reloading, crossing the controlled restart boundary and
enabling money-capable execution remain a later separately reviewed operation.
