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

## Configuration-file custody

Systemd reads the custody `EnvironmentFile` before the service sandbox is
entered, so this file is part of the pre-exec trust boundary.

The deployment contract therefore requires:

- `/etc/void/apollyon-custody-v1`: real root-owned `0755` directory,
  symlinks and group/world-writable parents forbidden;
- `custody.env`: root-owned `0600`, regular single-link nonsymlink at its
  canonical path, revalidated at deployment acceptance;
- the environment file contains exactly the five reviewed
  `VOID_APOLLYON_CUSTODY_*` keys from the source template and no extras;
- `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD`, and `LD_LIBRARY_PATH`
  are explicitly forbidden keys;
- `operator-public-key.pem`: root-owned `0644`, regular single-link
  nonsymlink at its canonical path, not writable by custody/training users; and
- the installed public-key bytes must rederive the separately accepted raw
  Ed25519 SHA-256 before deployment acceptance.

These checks are source-contract requirements only in this PR; the installer and
installed-host attestation must enforce and revalidate them separately.

## Root-custodied Node runtime

The Xiphos Node 24.21.0 distribution currently resolves through a user-owned
binary and is not directly admitted as custody runtime authority.

The custody service and live-session process-identity checks are fixed instead
to:

`/opt/void-apollyon-node-runtime-v1/node`

with exact identity:

```text
version=v24.21.0
bytes=126595440
sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c
owner=root:root
mode=0755
```

The separate Node custody lane verifies the user-owned source only by stable
open generation plus exact content hash, then creates a root-custodied copy.
No package manager is involved.

## Service activation model

`void-apollyon-authorization-custody-v1.service` carries
`RefuseManualStart=yes` and `RefuseManualStop=yes`, as required by current
V2 evidence. The create-only installer therefore does not start or enable it.

A separate
`void-apollyon-authorization-custody-v1.target` may be activated by a later
explicit gate. Before activation, the reviewed host boundary requires the target
to be loaded/inactive with `UnitFileState=disabled` exactly and the custody
service to be loaded/inactive with `UnitFileState=static` exactly. Other
unit-file states fail closed. Dependency activation can start the custody service
without weakening its manual-control refusal.

The target also declares:

`PropagatesStopTo=void-apollyon-authorization-custody-v1.service`

so an explicit stop of the activation target queues an indirect stop of the
custody service. This is intentionally stop-only; target restart propagation is
not part of the contract. Direct service start/stop remains refused.

## Restart-safe socket lifecycle

The source custody service deliberately does not unlink its advertised AF_UNIX
socket pathname when it stops. Host lifecycle authority therefore installs the
root-owned reviewed helper:

`/opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py`

and the custody service runs it through exactly one `ExecStopPost=`.

The helper runs as `voidapollyoncustody` under the existing service sandbox.
It accepts only the fixed custody socket path, exact custody/IPC
ownership/modes, and a non-listening `ECONNREFUSED` socket. It revalidates the
same inode before unlink. Before any stale-path deletion it also enumerates
numeric `/proc/<pid>/status` records and counts a process whenever any
real/effective/saved/filesystem UID slot equals `voidapollyoncustody`. The
observed custody-UID set must be exactly the cleanup helper PID. The exclusivity
gate is repeated immediately before hidden-link unlink and again immediately
before advertised-socket unlink; unreadable or unclassifiable live process
status holds closed. This removes a second same-UID process as a pathname-race
competitor inside the custody-writable socket directory.

If an abrupt process death leaves the private `.vNNNN` hard-link, the helper
removes it only when it is the unique same-inode sibling. A live listener,
ambiguous liveness result, foreign socket, unexpected link count, identity
drift, or second custody-UID process holds closed.

This makes target start -> target stop -> target start repeatable without
weakening the custody service's direct manual start/stop refusal.

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
  `/opt/void-apollyon-live-custody-binding-v2-reviewed-v2`.

The accepted 798,736-byte loader-independent native pre-entry is installed separately beneath
`/opt/void-apollyon-live-custody-binding-v2-preentry-v1`.

The deployment contract binds the exact repository lock
`ops/security/apollyon-live-custody-source-session-preentry-binary-lock-v1.json`
(Git blob `aaa4d3265fcd3471fb433928df1cf9f9b4ef42a6`, lock ID
`apollyon_live_custody_source_session_preentry_binary_lock_v1:7009aab71636ae4a06d880160e60b7131887f0ab7199b8da19ef65f399534439`). The lock accepts SHA-256
`2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d`, requires static/no-`PT_INTERP` execution and the hostile
`LD_PRELOAD` positive-control proof, while keeping installed identity and live
execution false. The lock verifier/workflow blobs and hosted verification run
`38684203856` are also bound so copied hash values cannot substitute for the
reviewed lock evidence.

## Authority

This PR performs no account/group mutation, filesystem installation, Polkit or
systemd mutation, service enable/start, durable attempt claim, training,
candidate-weight mutation, private-key access, wallet/signing, transaction, or
funds action.

Next gate:
`apollyon_live_custody_source_session_create_only_install_v1`.


## Current Noble systemd package review

The designated-host collector uses an exact allowlist. The reviewed set is now:

- `255.4-1ubuntu8.11` (original reviewed baseline)
- `255.4-1ubuntu8.18` (current Xiphos Noble-security package)

Other package versions remain fail-closed, and the running PID1 manager version
must still equal the installed package version.
