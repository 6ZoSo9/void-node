# Buy VOID allocation custody service v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1` is the narrow source contract
between an ordinary Buy VOID runtime and the protected allocation publication
writer.

This lane defines source only. It does not install or start a live service,
create production roots or sockets, change ownership or permissions, mutate
mounts, accept a live payment, access a wallet or signer, construct or broadcast
a transaction, activate the presale/market, or move funds.

The service source is:

`tools/void-buy-allocation-custody-service-v1.mjs`

The machine-readable reviewed contract is:

`docs/architecture/buy-void-allocation-custody-service-contract-v1.json`

The contract binds the exact service source SHA-256:

`sha256:da54d33e325df76a1b14dce00c6ecddc40e70d4c0a1a26f4547f7d9e152add4a`

## Authority split

The service is created with server-controlled configuration:

- Unix socket path;
- canonical allocation-ledger root;
- protected high-water/intent custody root; and
- Unix socket group GID.

None of those paths or identities are accepted from an IPC request.

The service reuses the merged canonical contracts:

1. #2433 allocation planner/ledger classifier;
2. #2442 current ledger/high-water binding;
3. #2446 publication/recovery state machine; and
4. #2451 descriptor-bound crash-recoverable publication writer.

The public caller cannot submit an arbitrary file path, arbitrary high-water
generation, arbitrary next-ledger byte string, or arbitrary bytes-to-file
operation.

## IPC methods

The request envelope is exact-schema and accepts only three methods.

### `reserve`

The caller supplies the canonical allocation candidate fields that are already
required by `planBuyVoidAllocationReservationV1(...)`.

The service:

1. first runs writer recovery;
2. if recovery changed durable state, returns
   `recovered_retry_required` and performs no new allocation in that
   invocation;
3. reads the server-controlled canonical ledger/high-water pair;
4. requires exact #2442 binding;
5. re-plans the candidate through #2433;
6. gives only that planner-produced exact next ledger to #2451;
7. re-reads and requires the final record count/tip to equal the planner result.

A normal successful transition returns `reserved`. Exact replay returns
`duplicate`. A concurrent stale plan cannot silently win because #2451
revalidates the exact current state under its serialization boundary.

### `recover`

The request object must be empty.

The service delegates only to #2451 recovery and then requires the final
canonical ledger/high-water binding. The caller cannot select a recovery
generation or state.

### `inspect`

The request object must be empty.

This is read-only. The service reads the canonical pair and returns only record
count/tip summary after #2433/#2442 validation. It does not expose ledger bytes,
high-water bytes, or a path handle.

## Request/response bounds

The reviewed contract fixes:

- maximum request bytes: 65,536;
- maximum response bytes: 65,536;
- response timeout: 5,000 ms;
- exactly one **canonical JSON** request line per connection, terminated by
  a single newline and the peer's write-side EOF (half-close);
- no reservation or other custody operation before write-side EOF;
- any trailing bytes, second frame, missing newline, or duplicate JSON member
  HOLDs without an allocation write;
- AF_UNIX transport only.

The service uses a half-open-capable UNIX socket to send its one response
*after* the client finishes writing. A client must send the canonical
sorted-key JSON envelope plus `\\n`, call `socket.end()` on its write side,
and then read the single response line. A client that waits for a response
without closing its write side receives a bounded timeout/HOLD instead.
This is a source-only framing rule; no public runtime or IPC client has been
activated by the change.

Responses contain no wallet/private key/signer material, raw transactions,
arbitrary filesystem content, or funds authority.

## Source start boundary

Importing the module never starts a listener.

The source includes an explicit operator service entrypoint because the later
systemd qualification in #2452 must bind the exact executable service source.
That entrypoint requires a server-controlled
`VOID_ALLOCATION_CUSTODY_SERVICE_CONFIG_JSON` environment value.

Committing or importing this file is not service installation/start authority.
A live unit, service identity, roots, socket group, mounts, permissions and
effective systemd policy remain separately reviewed operator gates.

## Socket ownership

On explicit service start, the already-existing socket parent and both custody
roots must be direct, private directories owned by the service UID. The service
does not bootstrap those directories.

After bind, the service sets the socket to mode `0660` and to the reviewed IPC
group GID supplied by server configuration. The designated-host collector must
independently prove the parent/socket ownership, group membership, modes and
runtime replacement denial required by #2456.

## Contract non-claims

The service contract explicitly keeps all of these false:

- caller-selected path;
- caller-selected generation;
- arbitrary path write;
- arbitrary bytes write;
- automatic retry;
- service installation;
- systemd mutation;
- mount mutation;
- permission-policy mutation;
- runtime integration;
- payment acceptance;
- wallet/signer/private-key access;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- inventory funding;
- market/presale activation;
- treasury/liquidity movement;
- funds movement.

## Relationship to the host-evidence collector

The existing
`ren/buy-void-allocation-custody-host-evidence-v1-20261004`
collector intentionally refused to fabricate a service contract.

After this lane is reviewed, that collector can bind:

- exact service source SHA-256;
- exact contract SHA-256;
- effective `ExecStart`;
- effective systemd hardening;
- socket/parent ownership and mode;
- exact ledger/custody roots.

One collector issue remains separate: merged #2456 requires
`runtime_can_control_service=false`. That must be established by actual
read-only authorization evidence or deferred to a dedicated trusted
service-control gate. It must not be hardcoded merely because this service
contract exists.

## Focused proof

After a repository build:

```bash
node --check tools/void-buy-allocation-custody-service-v1.mjs
node scripts/prove_void_buy_allocation_custody_service_v1.mjs
npm run typecheck
npm run build
git diff --check
```

The proof uses temporary private roots only. It covers:

- exact service-source SHA-256 binding;
- exact contract shape;
- clean inspection;
- one canonical allocation publication;
- exact replay idempotence;
- clean recovery;
- a pre-existing durable publication intent recovered before a new reservation;
- full UNIX-socket request/write-EOF round trips;
- a split second frame and duplicate-member JSON rejection before reservation;
- a missing newline rejection and a valid reserve/duplicate round trip;
- terminal `recovered_retry_required` behavior;
- rejection of caller path injection;
- rejection of caller generation injection;
- preservation of no-runtime/no-payment/no-transaction/no-funds authority.

## Next gate

After exact-head hosted GREEN, the existing host-evidence collector may be
reconciled to current main and completed against this reviewed service
contract. Live systemd installation/start, mount/permission setup and
service-control authorization evidence remain separate operator gates.
