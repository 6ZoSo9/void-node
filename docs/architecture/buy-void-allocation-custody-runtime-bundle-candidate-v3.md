# Buy VOID custody runtime bundle candidate V3 — complete FIFO reader closure

Status: **source/CI-only, unaccepted candidate**. No protected host install,
systemd service, socket, account/group change, request migration or payment.

## Why a V3 generation is required

On Precision, the protected custody data roots exist under UID 994, but the
dedicated custody service and Unix socket have not been installed. The fixed
`/opt/void-buy-allocation-custody-runtime-v1` target is a **nonempty legacy
generation**, not an accepted ten-file runtime. The future stable request
journal `/var/lib/void-buy-request-journal-v1` is absent. The current
`zoso` node process (UID 1000) lacks the custody IPC GID 980.

More importantly, V2 bundle source from Draft #3684 includes exactly one
FIFO-safe transition (the cross-UID claim reader, #3671) while still retaining
the blocking retained-leaf read generations in both custody observers:

| Package source | V2 Git blob | V3 Git blob |
| --- | --- | --- |
| Cross-UID capacity lock | `94f0a0dd8997e1e2c0fab54044f19d70d983d441` | **unchanged** |
| Allocation journal/high-water observer | `1bf88a403b1012ac00edaf634c5ed237a898043c` | `0bfc2e09ee26cbaefb18d3be1a5a65a4afa9dbcb` |
| Payment request/operator-history observer | `79eb8c39529583fffdb083173fb37b1f32075a14` | `e6fbd5b54891ee25daaeb8ae4e6f26073ed71420` |

These two later source generations come from independent FIFO repair Draft
#3685. Both bind retained `O_NOFOLLOW|O_NONBLOCK` opens and reject
non-regular file substitution without waiting for a FIFO writer.

## What this branch implements

- Parent `#3684` exact commit `9b6ff6892805cf9d7269d146e308970523c6cffe`,
  tree `78926fd8db4f6dde314909f6608a9a404329c968`.
- Preserves the complete V2 source generator, proof, document and workflow
  byte identities, plus its hosted V2 candidate ID and SHA-256, as frozen
  predecessor evidence. Reads and hashes those four predecessor sources
  before generating any V3 candidate.
- Reuses the exact **same ten-file package-free custody runtime closure**
  (four tracked source files and six compiled TypeScript outputs).
- Preserves all 17 remaining source blob pins and compiler/input closure.
  Requires exactly the two observer-reader Git blob transitions above.
- Creates `voidbuycustodybundle3_<sha256>` candidate bytes and
  compares independent Node 22/24/26 builds for byte equality.
- Executes a disposable real kernel regular-to-FIFO source-open regression
  plus adversarial recomputed candidate ID tests. Those adversaries require
  the nested authority, predecessor and source pins to remain immutable.

## Important acceptance distinction

The source generator's internal consistency check is **not** an externally
authenticated release. The V3 hosted ID and hosted SHA-256 constants remain
explicit placeholders:

```text
UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_ID
UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_SHA256
```

A fresh cross-node CI artifact and independent reviewed acceptance generation
must bind the exact runtime file bytes before any archive is declared installable.
Previously accepted V1/V2 candidates, V1 install-archive locks, and protected
source inventories must **not** be silently rewritten or passed off as V3
authority. The eventual replacement of the 906-entry legacy target requires
a separately qualified durable rollback installer. No archive/install is
produced by this source candidate.

## Preserved HOLD boundaries

```text
source_candidate_only=true
hosted_identity_authenticated=false
candidate_accepted=false
runtime_integration=false
service_unit_installed=false
service_started=false
reserve_method_enabled=false
recover_method_enabled=false
cross_uid_service_authenticated=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

Do not add GID 980 to `zoso` or restart `user@1000.service` as part of this
source lane; the reviewed group-refresh policy acknowledges that doing so
restarts the entire user-manager generation and needs independent host
prestate/recovery qualification.

**PROTECT THE CORE.**
