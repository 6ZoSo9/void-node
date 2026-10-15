# Apollyon custody deployment manifest v1

Marker: `VOID_APOLLYON_CUSTODY_DEPLOYMENT_MANIFEST_V1`

Status: **source-only deployment contract; no Xiphos mutation**.

The Xiphos custody census proved the deployment is absent: only the existing
`voidapollyontrain` identity and dormant training-isolation materials exist.
There is no custody account/group, IPC group, custody unit, or custody source
tree to preserve.

## Canonical identities

The create-only installer shall create:

- custody user/group: `voidapollyoncustody`;
- shared IPC group: `voidapollyonipc`; and
- additive `voidapollyontrain -> voidapollyonipc` membership.

Training and custody retain distinct primary groups. Both receive exactly the
shared IPC group needed for the AF_UNIX socket.

## Filesystem policy

```text
/var/lib/void-apollyon-custody-v1
  custody:custody 0700

/var/lib/void-apollyon-custody-v1/consumed
  custody:custody 0700

/run/void-apollyon-custody-v1
  custody:ipc 0750

/run/void-apollyon-custody-v1/custody.sock
  custody:ipc 0660 (created by the reviewed custody service)
```

The socket/state roots are intentionally disjoint.

Because `/run` is ephemeral, the deployment also installs:

`/usr/lib/tmpfiles.d/void-apollyon-custody-v1.conf`

with the exact rule:

```text
d /run/void-apollyon-custody-v1 0750 voidapollyoncustody voidapollyonipc - -
```

The installer invokes `systemd-tmpfiles --create` only after the custody and
IPC identities exist.

## Service activation model

`void-apollyon-authorization-custody-v1.service` carries
`RefuseManualStart=yes` and `RefuseManualStop=yes`, as required by current
V2 evidence. The create-only installer therefore does not start or enable it.

A separate
`void-apollyon-authorization-custody-v1.target` may be activated by a later
explicit gate. Dependency activation can start the custody service without
weakening its manual-control refusal.

## Polkit boundary

The exact lexically-first rule is installed only by the later privileged
installer:

`/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules`

It denies the training user the four reviewed systemd action IDs and has
SHA-256:

`492bbe168680fc81b27ac811f8b9c8900751e09c861523f1ab845e017acaea22`

## Operator key boundary

Custody requires only the operator **public** Ed25519 key. The two existing
public identity records independently agree on the accepted raw-key SHA-256:

`c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134`

The create-only installer must receive a public PEM source path, verify that
exact fingerprint, and install a public copy at:

`/etc/void/apollyon-custody-v1/operator-public-key.pem`

No private-key access is part of deployment.

## Reviewed source roots

The manifest pins both:

- the custody service closure under
  `/opt/void-apollyon-custody-service-v2-reviewed-v1`; and
- the complete current-V2 live-session closure under
  `/opt/void-apollyon-live-custody-binding-v2-reviewed-v1`.

The locked 16,912-byte native pre-entry is installed separately beneath
`/opt/void-apollyon-live-custody-binding-v2-preentry-v1`.

## Authority

This PR performs no account/group mutation, filesystem installation, Polkit or
systemd mutation, service enable/start, durable attempt claim, training,
candidate-weight mutation, private-key access, wallet/signing, transaction, or
funds action.

Next gate:
`apollyon_live_custody_source_session_create_only_install_v1`.
