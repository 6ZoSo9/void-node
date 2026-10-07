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

`sha256:39fce366d9c3a3dc5217e62da20958405ce576cc7f40965c744ec059a96d5519`

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

### `reserve` — default HOLD

The reviewed IPC envelope still accepts the exact reserve request schema, but
its source implementation **does not authorize reservations**. Caller-supplied
green flags and receipt/digest-shaped strings do not prove an accepted,
fsynced `payment_verified` event. A syntactically valid request receives
`allocation_custody_service_verified_payment_provenance_not_bound` with
`operation_performed=false`, and invokes no allocation planner, writer or
recovery operation.

A later independently reviewed integration must descriptor-bind the canonical
durable request and payment-event history, verify identity, amount, destination,
source chain, log index and launch generation, and serialize the resulting
allocation under the existing verified-payment capacity/duplicate boundary.
No request-controlled boolean or environment override can bypass this HOLD.
The pure planner and writer remain separately available for synthetic proof and
explicit recovery. This is containment, not live payment-provenance readiness.

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
- response/inactivity timeout: 5,000 ms;
- independent **absolute five-second framing deadline** measured from socket
  acceptance through peer write-side EOF; intermittent bytes cannot extend it;
- pre-EOF HOLDs force-close the connection after flushing the response so a
  half-open peer cannot retain the server socket indefinitely;
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
- forged caller-authority reserve HOLD with unchanged ledger/high-water/intent;
- repeat unverified reserve HOLD;
- clean recovery;
- forged reserve unable to trigger a pre-existing intent recovery;
- explicit recover method preserves durable-intent forward recovery;
- full UNIX-socket request/write-EOF round trips;
- a split second frame and duplicate-member JSON rejection before reservation;
- a slow-drip client that sends bytes every 250 ms but never half-closes,
  proving the five-second absolute deadline HOLDs without allocating;
- a missing newline rejection and a forged reserve/repeat HOLD over AF_UNIX;
- terminal explicit recovery with reserve still held;
- rejection of caller path injection;
- rejection of caller generation injection;
- preservation of no-runtime/no-payment/no-transaction/no-funds authority.

## Next gate

After exact-head hosted GREEN, the existing host-evidence collector may be
reconciled to current main and completed against this reviewed service
contract. Live systemd installation/start, mount/permission setup and
service-control authorization evidence remain separate operator gates.
