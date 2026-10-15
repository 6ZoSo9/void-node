# Buy VOID authenticated user-manager kernel capability binding v3

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_KERNEL_CAPABILITY_BINDING_V3_GREEN`.

Status: **source/CI repair; new binary identity unaccepted**.

## Why this generation exists

Live Precision hardening established that the user-systemd runtime can safely
transition to `NoNewPrivileges=yes` while retaining its existing configured
`CapabilityBoundingSet`. Clearing that configured set in a per-user manager
changes the execution namespace and caused the earlier guarded restart to fail
and roll back.

The accepted V2 authenticated query pair predates that host result. Its native
query required systemd `CapabilityBoundingSet == 0`. It therefore cannot be
composed with the user-systemd-safe hardening policy.

This generation repairs the evidence contract instead of weakening the host
policy.

## Authenticated capability contract

The query continues to authenticate the private user-manager peer, reuse the
same retained private FD for the unit query, bind MainPID back to the kernel,
retain manager/service pidfds, and recheck both process generations.

For the authenticated MainPID it now requires:

- systemd `NoNewPrivileges=true`;
- systemd `AmbientCapabilities == 0`;
- kernel `NoNewPrivs == 1`;
- kernel `CapInh == 0`;
- kernel `CapPrm == 0`;
- kernel `CapEff == 0`;
- kernel `CapAmb == 0`;
- kernel `CapBnd` exactly equals the systemd `CapabilityBoundingSet` mask.

The configured/systemd bounding set may therefore be nonzero. It is not treated
as an effective capability grant. The exact systemd mask and all kernel masks
are emitted in the authenticated transcript.

The entire process capability state is reread after the unit query and must be
identical before the query can return GREEN.

## Historical V2 lock

The accepted V2 candidate/lock remain immutable historical evidence. The V2
lock workflow now rederives V2 only when the exact V2 query-source blob is
present. On later query generations it verifies the accepted candidate, lock
and proof blobs remain unchanged and emits the same committed V2 lock artifact
for cross-node historical equality.

It does not repin V2.

## Next generation

Because the native query source changed, the V2 binary lock, V2 installer and
V2 live qualifier are historical for their exact query generation.

The next source gate must derive and accept a V3 query binary identity before
any protected install or live execution.

## Authority

No host mutation, protected installation, live query, service restart,
credentials/keys/wallet/signers, payment acceptance, presale activation or
funds movement occurs in this source repair.
