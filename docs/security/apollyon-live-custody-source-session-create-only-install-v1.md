# Apollyon live custody source/session create-only install v1

Marker: `VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1`

Status: **source-only installer; CI executes only `--self-test`**.

## Purpose

This is the installer successor to the current #3059 deployment contract at
`6c92eefc05dae77fbc59070e8c3e56f5b146ba6c`.

A separately authorized `--apply` on Xiphos creates only the missing custody
deployment:

- `voidapollyonipc` shared group;
- `voidapollyoncustody` primary group and system user;
- additive IPC membership for existing `voidapollyontrain` and the new custody
  identity;
- custody state root and `consumed/` directory;
- persistent tmpfiles rule for the runtime socket directory;
- the exact reviewed custody-service closure;
- the exact reviewed current-V2 live-session closure;
- the locked 798,736-byte static/no-`PT_INTERP` native pre-entry ELF, SHA-256 `2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d`;
- the fixed Python live-session launcher;
- the cross-attested operator public key only;
- exact environment, systemd service/activation target and Polkit rule.

The installer runs `systemd-tmpfiles --create` and `systemctl daemon-reload`
after installing exact bytes. Post-reload acceptance is exact: the custody
service must be loaded, inactive, `MainPID=0`, and `UnitFileState=static`;
the activation target must be loaded, inactive, and
`UnitFileState=disabled`. Masked, linked, enabled-runtime, active, failed
probe, or other noncanonical states HOLD rather than being reported as a
successful installation.

## Root-custodied Node prerequisite

Before `--plan` or `--apply`, the installer requires:

```text
/opt/void-apollyon-node-runtime-v1/node
owner=root:root
mode=0755
version=v24.21.0
bytes=126595440
sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c
```

It reopens and hashes that runtime, verifies stable path/descriptor identity,
executes the exact installed binary for version and built-in crypto probes, and
HOLDS before any custody mutation if the prerequisite is absent or mismatched.

The custody installer does not install or repair Node itself.

## Public-key boundary

The installer accepts only an Ed25519 PUBLIC PEM whose raw-key SHA-256 is:

`c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134`

It rejects PEM containing `PRIVATE KEY` and never opens an operator private
key.

The input public-key pathname is opened once with `O_NOFOLLOW`. The installer
binds the retained descriptor generation, reads the exact bytes, passes those
bytes to OpenSSL over stdin (never reopening the pathname for parsing), then
revalidates both the retained descriptor and the visible pathname generation.
Only those authenticated retained-generation bytes may be installed. The
self-test includes a read-A / swap-visible-to-approved-B adversary and requires
HOLD.

## Idempotence / fail-closed behavior

Existing identities and paths are accepted only when their expected contract
matches. Existing files must match exact bytes, owner/group and mode; otherwise
the installer HOLDS rather than overwriting them.

The reviewed source trees reject unexpected extra regular files.

## Hard authority boundary

The installer does **not** start, restart or enable the custody service or its
activation target. It does not start the training service.

A successful apply still reports:

```text
service_start=false
service_enable=false
activation_target_start=false
activation_target_enable=false
training_execution=false
durable_attempt_claim=false
candidate_weight_mutation=false
operator_private_key_access=false
funds_movement=false
```

Next gate:
`INSTALLED_CUSTODY_AND_LIVE_SESSION_ATTESTATION`.


## Current systemd review

The installed live-session source closure now contains the exact V2 collector
reviewed for Noble systemd `255.4-1ubuntu8.18`, while preserving the original
`255.4-1ubuntu8.11` baseline in its exact allowlist.
