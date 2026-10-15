# Apollyon live custody source/session create-only install v1

Marker: `VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1`

Status: **source-only installer; CI executes only `--self-test`**.

## Purpose

This is the installer successor to the green #3059 deployment contract.

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
- the locked 16,912-byte native pre-entry ELF;
- the fixed Python live-session launcher;
- the cross-attested operator public key only;
- exact environment, systemd service/activation target and Polkit rule.

The installer runs `systemd-tmpfiles --create` and `systemctl daemon-reload`
after installing exact bytes.

## Public-key boundary

The installer accepts only an Ed25519 PUBLIC PEM whose raw-key SHA-256 is:

`c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134`

It rejects PEM containing `PRIVATE KEY` and never opens an operator private
key.

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
