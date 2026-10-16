# Buy VOID user-manager kernel capability projection v6

Marker: `VOID_BUY_VOID_USER_MANAGER_CAP_LAST_CAP_PROJECTION_V6`.

Status: **source/CI repair only; no protected install or live-query authority**.

## Precision finding

V5 repaired the authenticated `ControlGroup` property binding and progressed
past D-Bus collection. The next live diagnostic showed every security check
green except one representation mismatch:

- authenticated systemd `CapabilityBoundingSet=ffffffffffffffff`;
- kernel process `CapBnd=000001ffffffffff`;
- NoNewPrivileges true in systemd and kernel;
- PrivateUsers false;
- CapInh/CapPrm/CapEff/CapAmb all zero;
- manager/service PID, GID, cgroup and executable bindings all exact.

Linux exposes the highest capability supported by the running kernel through
`/proc/sys/kernel/cap_last_cap`. Bits above that value are not valid kernel
capabilities.

## V6 rule

V6 reads `/proc/sys/kernel/cap_last_cap`, constructs the valid kernel
capability mask, and requires:

`KernelCapBnd == SystemdCapabilityBoundingSet & KernelSupportedCapabilityMask`

The transcript continues to emit `CapabilityBoundingSet`, but now emits the
kernel-supported projection so it is compared like-for-like with `KernelCapBnd`.
The authenticated raw systemd mask remains the source of that projection.

The projection helper fails closed for malformed values or `cap_last_cap > 63`.

## Preserved boundaries

Unchanged:
- authenticated private systemd-manager peer and retained connection;
- Service.ControlGroup binding;
- manager/service pidfds and generation checks;
- exact MainPID direct-parent/cgroup/executable checks;
- systemd + kernel NoNewPrivileges;
- PrivateUsers=false;
- configured ambient capabilities zero;
- kernel CapInh/CapPrm/CapEff/CapAmb zero;
- post-query security-state revalidation.

V5 hosted candidate/lock evidence is historical only and is not installable.

No host/service/systemd mutation, request/payment content read, credentials,
keys, wallets/signers, payment acceptance, presale/WC activation, transaction
or funds movement.

PROTECT THE CORE.
