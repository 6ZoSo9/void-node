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

`sha256:4aca3df7af7d34759151cc902b26776a8198ecca245be8abca4eb638aeda9c18`

## Authority split

The service is created with server-controlled configuration:

- Unix socket path;
- durable Buy VOID request/payment-history root;
- canonical allocation-ledger root;
- protected high-water/intent custody root; and
- Unix socket group GID.

None of those paths or identities are accepted from an IPC request.

The service uses the merged #2433 ledger classifier and #2442
ledger/high-water binding **for read-only inspection**. On `reserve`, it also
uses the server-configured request root with the descriptor-bound custody
payment-ledger observer and canonical verified-payment/allocation replay
classifier. The caller's green flags and receipt-shaped fields are not payment
authority: the service must independently observe the durable request and
`payment_verified` bytes and bind the caller's event digest to that exact
durable replay result.

The #2446 publication state machine and #2451 crash-recoverable writer remain
separate dependencies; neither is imported or called by this IPC service.
This lane closes the source-level durable-payment provenance read seam only.
It does **not** establish cross-UID permissions, a shared payment-capacity
serialization lease, signed launch-authority planning inside custody, or
allocation mutation authority.

The public caller cannot submit an arbitrary file path, arbitrary high-water
generation, arbitrary next-ledger byte string, or arbitrary bytes-to-file
operation.

## IPC methods

The request envelope is exact-schema and accepts only three methods.

### `reserve` — provenance-bound, mutation HOLD

The reviewed IPC envelope still accepts the exact reserve request schema, but
its source implementation **does not authorize reservations**. The
server-configured request root is descriptor-read on each reserve attempt and
the exact durable request/payment history is replayed against the protected
allocation ledger. A caller event digest must identify the exact replay-bound
`payment_verified` line. Caller-supplied green flags, amount fields, launch
fields and receipt-shaped strings remain non-authoritative.

If durable payment provenance is absent or malformed, the request HOLDs before
the capacity boundary. If the provenance is valid but the caller digest does
not identify that exact event, the request HOLDs with
`allocation_custody_service_caller_payment_event_digest_mismatch`. If the
durable provenance is valid and the digest matches, the request advances only
to `allocation_custody_service_payment_capacity_lock_not_bound`, still with
`operation_performed=false` and no allocation writer/recovery call.

That final HOLD is intentional. The existing verified-payment capacity bakery
queue is private to the ordinary runtime UID and exposes no cross-UID
verifiable lease to the custody UID. A later reviewed integration must place
payment append and custody allocation in one independently verifiable
serialization domain, bind signed launch authority inside custody, then reuse
the canonical planner and protected writer. No caller-controlled boolean can
bypass this boundary.
### `recover`

The request object must be empty.

The method now always returns
`allocation_custody_service_verified_payment_recovery_not_bound` with
`operation_performed=false`. A legacy publication intent could have been
created from untrusted caller flags before the reserve HOLD; its canonical
shape, checksums and existing high-water binding are **not** proof that the
corresponding payment was verified. In particular, merely connecting to the
AF_UNIX socket must not permit completing such an intent. Pending intents
remain untouched for later independently authorized, provenance-verified
recovery under the shared serialized admission domain.

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

On explicit service start, the already-existing socket parent and both private
allocation/custody roots must be direct directories owned by the service UID
with the reviewed modes. The request-history root is separately
server-configured and descriptor-walked read-only; this source lane does not
claim its live cross-UID permissions are qualified. The service does not
bootstrap any of these directories.

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
- forged/no-durable-payment reserve HOLD with unchanged ledger/high-water/intent;
- repeat unverified reserve HOLD;
- descriptor-bound durable `payment_verified` replay reaching only the
  `payment_capacity_lock_not_bound` HOLD;
- caller digest mismatch HOLD after otherwise valid durable payment provenance;
- clean `recover` method HOLD without writes;
- forged reserve and explicit recovery both unable to commit a pre-existing,
  syntactically valid but unverified publication intent;
- full UNIX-socket request/write-EOF round trips;
- a split second frame and duplicate-member JSON rejection before reservation;
- a slow-drip client that sends bytes every 250 ms but never half-closes,
  proving the five-second absolute deadline HOLDs without allocating;
- a missing newline rejection and a forged reserve/repeat HOLD over AF_UNIX;
- direct and AF_UNIX explicit recovery HOLD with reserve still held;
- rejection of caller path injection;
- rejection of caller generation injection;
- preservation of no-runtime/no-payment/no-transaction/no-funds authority.

## Next gate

After exact-head hosted GREEN, the next source gate is the shared cross-UID
payment-capacity serialization protocol plus signed launch/planner composition
inside custody. Only after that source boundary is reviewed should reserve or
recover import the protected publication writer.

Live systemd installation/start, cross-UID read permissions, authenticated
operator/custody principals, mount/permission setup and service-control
authorization evidence remain separate operator gates.
