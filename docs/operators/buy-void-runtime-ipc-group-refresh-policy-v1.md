# Buy VOID runtime IPC-group refresh policy v1

Marker: `VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1`.

Status: **source policy only; not applied**.

## Live Precision fact

The public node currently runs as runtime user `zoso` (UID/GID 1000), while
the accepted custody socket design uses `void-buy-custody-ipc` (GID 980).
The live account does not yet inherit GID 980. The existing IPC group currently
contains the custody identity and staged `void-buy-runtime` identity.

The current launch plan intentionally preserves UID 1000. This policy therefore
does not migrate the public node to `void-buy-runtime`.

## Selected future transition

A separately reviewed root apply may use exactly:

```text
/usr/sbin/usermod --append --groups void-buy-custody-ipc zoso
/usr/bin/systemctl restart user@1000.service
```

The manager refresh is required because changing `/etc/group` does not add a
new supplementary GID to an already-running user manager or its children.

A `SupplementaryGroups=` line in the unprivileged user unit is **not** a
substitute: the running user manager does not gain authority to manufacture a
group it did not inherit. Setuid/newgrp/sg launch wrappers are also outside this
policy.

## Required prestate evidence

Before a future apply:
- exact account/group numeric identities must match 1000/1000 and GID 980;
- `zoso` must not already be a member unless the operation is treated as
  no-op qualification rather than mutation;
- the complete active user-service set must be captured;
- the `void-node-live.service` PID/start ticks/cgroup/source commit/tree,
  immutable release path, readiness and sockets must be captured;
- accepted #3005 hardening bytes and accepted socket RuntimeDirectory policy
  must be bound;
- no payment/presale authority may be live.

## Required post-refresh evidence

A future apply must prove:
- a new user-manager generation;
- manager `Groups:` includes GID 980;
- live Node process `Groups:` includes GID 980;
- exact user-service hardening is effective: NoNewPrivileges + empty
  bounding/ambient capability sets and zero kernel capability masks;
- the prestate active user-service set recovers;
- the node returns with the same reviewed immutable source generation and
  expected runtime duties/readiness;
- no custody-root write authority is granted to UID 1000.

## Rollback

If and only if the ceremony itself added the membership and later qualification
fails, rollback is:

```text
/usr/bin/gpasswd --delete zoso void-buy-custody-ipc
/usr/bin/systemctl restart user@1000.service
```

Rollback must then prove the prestate user-service set/source/runtime health
again. It must never alter custody data roots, payment history, credentials,
keys, wallets, transactions or funds.

This document is sequencing, not apply authorization.
