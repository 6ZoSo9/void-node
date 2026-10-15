# Buy VOID user-runtime custody hardening installer v1

Marker: `VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_INSTALLER_V1`.

Status: **source-only guarded installer; no live apply authorized**.

## Purpose

Merged #3005 defines the exact minimum user-service hardening required before
the public Buy runtime can participate in the allocation-custody boundary:

```ini
[Service]
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=
```

This successor adds the missing guarded install/restart/rollback mechanism for
`void-node-live.service` without changing ExecStart, environment, identity,
storage or networking.

## Modes

`--source-plan` is CI-safe and performs no host reads.

`--plan` is read-only on Precision. It requires:

- host `zoso-Precision-Tower-7810`;
- ordinary user `zoso`, never sudo/root;
- the user-systemd service active/running;
- the exact merged #3005 source blob;
- the existing service process to have zero CapInh/CapPrm/CapEff/CapAmb;
- a non-empty listener set owned by the current MainPID;
- target drop-in absent, or exact and already live-qualified.

A differing pre-existing target always HOLDS. An exact pre-existing target that
is not already reflected in the live hardened service also HOLDS rather than
silently taking ownership of an earlier installation.

`--apply` additionally requires the exact confirmation:

```text
install-and-restart-void-node-live-custody-hardening-v1
```

No apply is authorized merely because this source exists or merges.

## Apply transaction

A newly installed generation:

1. creates only the exact service drop-in directory if absent;
2. creates the target drop-in exclusively at mode 0600;
3. fsyncs the file and directory;
4. executes one user-manager daemon-reload;
5. executes exactly one success-path restart;
6. waits for a new process generation;
7. requires:
   - `NoNewPrivileges=yes`;
   - empty CapabilityBoundingSet;
   - empty AmbientCapabilities;
   - live kernel `NoNewPrivs: 1`;
   - zero CapInh/CapPrm/CapEff/CapAmb;
   - exact equality of the pre/post TCP listener endpoint set;
8. creates a private installation receipt enabling deliberate rollback.

Before any mutation, the installer requires the existing
`~/.local/state/void` ancestry to be direct, owned by `zoso`, and not
group/world writable. It creates only the final installer-specific state
directory if absent. A pre-existing receipt is never overwritten, and a stale
receipt with no installed target is a PLAN HOLD.

The listener equality check preserves the already-running HTTP/P2P surface
without hardcoding ports into this installer.

## Failure rollback

If a failure occurs after this installer created the target, it removes only the
same inode with the same expected SHA-256, daemon-reloads the user manager, and
performs at most one recovery restart. It then requires the pre-apply listener
endpoint set to return.

A foreign/substituted target inode is never unlinked. Receipt removal during
deliberate rollback is likewise conditioned on the exact previously observed
receipt inode and SHA-256.

## Deliberate rollback

A later separately authorized `--rollback` requires the private installation
receipt and exact confirmation:

```text
rollback-void-node-live-custody-hardening-v1
```

It removes only the recorded exact target generation, reloads, restarts once,
and requires the listener set to remain preserved.

## Authority boundary

Source/test/CI only.

No live service restart or systemd mutation is authorized now. This does not
select the #3003 request root, install the custody service/socket, verify Polkit
effective denial, enable reserve/recover, mount the payment-to-allocation path,
accept payment, activate the presale/WC market, or move funds.
