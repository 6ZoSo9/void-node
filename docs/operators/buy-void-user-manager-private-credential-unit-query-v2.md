# Buy VOID authenticated credential-unit query v2

Marker: `VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V2`.

Status: **source/CI successor only; no protected installation or production
live-query authority is granted by this artifact**.

## Reason for the successor

The accepted V1 credential query is fail-closed but too narrow for the current
Precision service shape. A read-only production census observed:

- 37 effective systemd drop-ins;
- four effective `LoadCredential` entries;
- exactly one
  `97-buy-void-epoch2-fulfiller-credential-v1.conf`;
- exactly one `buy-void-epoch2-fulfiller-v1` credential ID;
- no duplicate effective credential IDs;
- canonical absolute credential source paths;
- `NeedDaemonReload=no`.

V1 caps the complete drop-in set at 32 and requires the whole service to have
exactly one `LoadCredential` pair. Both assumptions are incompatible with the
legitimate composed service. The failure occurred before credential-content
access.

V2 preserves V1 as historical evidence and changes only the bounded
credential-effective observation contract.

## V2 contract

V2 keeps the authenticated private systemd-manager transport, retained pidfds,
kernel-bound MainPID checks, exact Epoch-2 drop-in requirement, and
same-generation requery.

It changes the bounded property model to:

- at most 64 canonical absolute `DropInPaths`, with at most 64 KiB of
  canonical path bytes;
- exactly one Epoch-2 credential drop-in basename;
- at most 32 effective `LoadCredential` entries;
- canonical absolute source paths for every observed credential;
- unique credential IDs across the complete observed set;
- exactly one credential ID
  `buy-void-epoch2-fulfiller-v1`;
- retention of the complete bounded credential ID/source set for
  same-generation comparison;
- unrelated credentials are permitted and remain part of the stable
  observation rather than being ignored.

The primitive emits only the target Epoch-2 source path plus aggregate
credential-set counts/bytes. It does not open or read any credential source.

## Authority boundary

Still false:

- binary acceptance;
- protected installation or replacement;
- production live-query authority;
- credential-content access;
- private-key or signer access;
- service/systemd mutation;
- payment acceptance or presale/WC activation;
- transaction or funds movement.

A later candidate/lock generation must accept an exact reproducible V2 binary.
A separately reviewed protected replacement must preserve the installed V1
predecessor before any Precision mutation. Live execution remains separately
authorized.

PROTECT THE CORE.
