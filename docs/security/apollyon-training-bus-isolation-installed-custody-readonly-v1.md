# Apollyon training bus-isolation installed custody read-only v1

Marker: `VOID_APOLLYON_TRAINING_BUS_ISOLATION_INSTALLED_CUSTODY_READONLY_V1`

Status: **source-only read-only installed-material observer; not the canonical live qualification**.

## Purpose

Merged #2918 defines the canonical later gate
`installed_apollyon_training_bus_isolation_qualification_v1`. Merged #2930
derived one reproducible native pre-entry ELF identity, and merged #2932 locked
that identity as repository evidence.

This successor closes only the first observable host question:

> Are the reviewed #2918 unit bytes and the exact locked #2932 pre-entry ELF
> present at their fixed Xiphos installation paths under a strict filesystem
> custody policy?

It does **not** start, stop, restart, enable or reload a service. CI never
contacts Xiphos.

## Fixed installed paths

The observer accepts no caller-selected paths in live mode:

```text
/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service
/opt/void-apollyon-training-bus-isolation-v1/apollyon_training_bus_isolation_preentry_v1
```

The unit must be a direct root:root single-link mode-`0644` regular file.
The pre-entry must be a direct root:root single-link mode-`0755` regular
file. Every retained ancestor from `/` through the immediate parent must be a
direct root:root directory with no group/world write bits.

Both files are opened with `O_NOFOLLOW`; path and descriptor identities are
checked before, during and after the bounded read.

## Exact reviewed identities

Unit Git blob:

```text
62fbabe1cf7ae0d940f5d96e19b06282f841267b
```

Locked candidate:

```text
candidate_id=
apollyon_training_preentry_binary_candidate_v1:128eb2363781cacbaf9603be185af613e444cef7a40b8894cd491aa6bf8f8a56

candidate_lock_id=
apollyon_training_preentry_binary_candidate_lock_v1:d5acb7184059f2690120374f990968f0a041872e8119c555d3da21671c6d49a5

preentry_sha256=
6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47

preentry_bytes=17352
```

The focused proof reads the merged candidate-lock fixture, compiles the exact
reviewed #2918 C source with the exact #2930 recipe, reproduces those 17,352
bytes, and exercises the real observer against disposable installed-path
fixtures.

Negative proofs cover unit-byte drift, ELF-byte drift, permission drift and
symlinked-ancestor substitution.

## Truth boundary

A successful observation may state:

```text
installed_unit_identity_observed=true
installed_preentry_binary_identity_observed=true
```

It deliberately **cannot** promote those observations to production proof yet:

```text
trusted_observer_proven=false
installed_unit_identity_proven=false
installed_preentry_binary_identity_proven=false
dynamic_runtime_closure_proven=false
training_entrypoint_identity_proven=false
live_systemd_enforcement_proven=false
inherited_system_bus_descriptor_absence_proven=false
absolute_runtime_service_control_denial_proven=false
canonical_installed_qualification_complete=false
```

The distinction matters. A repository copy of this Python observer is not by
itself a trusted Xiphos execution root. The final canonical qualification must
bind a trusted observer/launcher before consuming live evidence.

## Current hard blocker after installed-material observation

The #2918 native pre-entry executes only this fixed target:

```text
/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1
```

No reviewed source or accepted binary identity for that target currently exists
in `void-node`. Therefore this observer does not try to infer live service
enforcement from the pre-entry bytes alone.

A future canonical qualification must additionally bind:

- trusted live-observer execution;
- reviewed training-entrypoint identity;
- pre-entry dynamic loader/library custody;
- exact PID-1 systemd generation;
- the dedicated training account and cgroup;
- the loaded unit/runtime properties; and
- live descriptor-isolation enforcement.

Only after those are proven may a composition set:

```text
installed_preentry_binary_identity_proven=true
live_systemd_enforcement_proven=true
inherited_system_bus_descriptor_absence_proven=true
absolute_runtime_service_control_denial_proven=true
```

## Live operator mode

Source authoring and CI do not run this command. A later separately authorized
Xiphos observation may use the fixed-path observer after its own execution
provenance has been reviewed:

```bash
python3 -I -B ops/xiphos/apollyon_training_bus_isolation_installed_custody_readonly_v1.py --observe
```

Until trusted-observer provenance is separately closed, that output remains
operator evidence rather than production authority.

No filesystem mutation, systemd action, training, attempt claim, credential/key
access, signing, transaction, activation, wallet access or funds movement is
performed by this observer.
