# Buy VOID stable custody-readable request root policy v1

Marker: `VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1`.

Status: **source policy only; not installed; production HOLD**.

## Why this policy exists

Precision currently runs `void-node-live.service` from an immutable release
directory. With no explicit `VOID_BUY_REQUEST_DIR`, request persistence falls
back below the process cwd. That location disappears or changes identity across
release swaps and cannot satisfy the future custody-readable `0750/0640`
profile.

The future request store therefore uses one fixed, root-parented path:

`/var/lib/void-buy-request-journal-v1`

It is intentionally disjoint from:
- `/var/lib/void-allocation-ledger-v1`;
- `/var/lib/void-allocation-custody-v1`; and
- every `/opt/void-node-live/releases/<commit>` generation.

## Ownership and modes

A future **root-authorized** host ceremony must pre-provision:

- request root: owner `zoso`, group `void-buy-custody-ipc`, mode `0750`;
- `requests.jsonl`: owner `zoso`, IPC group, mode `0640`;
- `operator-events.jsonl`: owner `zoso`, IPC group, mode `0640`.

The public runtime remains the owner/writer. Custody receives group-read access
only. Customer and operator sidecars remain `0600` and are not readable by
the custody group.

The runtime drop-in must bind both:

```ini
[Service]
Environment=VOID_BUY_REQUEST_DIR=/var/lib/void-buy-request-journal-v1
Environment=VOID_BUY_REQUEST_CUSTODY_READ_GID=<qualified IPC gid>
```

The numeric GID is host evidence, not hardcoded source authority.

## No silent migration

This policy does **not** authorize copying, truncating, rewriting or abandoning
an older request journal.

Before apply, the designated-host census must classify all bounded historical
request-root candidates and either prove there is no surviving request/operator
history or produce a separate reviewed migration plan that preserves every
durable obligation. An empty new directory is never proof that an old store is
irrelevant.

## Relationship to current source

This policy is stacked on the current custody-readable request-journal source generation
from #3003 exact head `8086b44724c2b84aea6c0d573f2079a8d82b0c24`. That source keeps the legacy private mode as default and enables the
shared profile only when `VOID_BUY_REQUEST_CUSTODY_READ_GID` is explicitly
present.

## Authority

No directory/file creation, chmod/chown, group mutation, systemd change,
service restart, request/payment-content read, custody mutation, wallet/signer,
RPC/transaction, presale/WC activation or funds movement occurs here.
