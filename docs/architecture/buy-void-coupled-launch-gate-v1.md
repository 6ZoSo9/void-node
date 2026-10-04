# Buy VOID coupled launch gate v1

Marker: `VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN`

## Purpose

Keep public Buy VOID request intake and the production WC/VOID opening behind
one fail-closed admission boundary.

The runtime must not treat any one of these as sufficient authority:

- the public Buy intake environment toggle;
- source-level coupled launch `SOURCE_READY`;
- the final coupled source-promotion artifact; or
- a caller-supplied boolean claiming that launch occurred.

`SOURCE_READY` grants no funding or activation authority.

## Canonical source inputs

The source half reads exactly:

- `ops/mainnet0/wc-void-production-candidate-v1.json`;
- `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`;
- `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`.

It delegates readiness to
`classifyVoidWcVoidCoupledLaunchReadinessV1(...)` and additionally binds the
reviewed coupled launch ID:

`sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`

Nested policy drift is therefore rejected by the canonical classifiers instead
of being reduced to a hand-picked set of top-level booleans.

A source-ready result records the canonical coupled composition ID, but it still
reports activation/funding/presale/market/funds authority false.

## Verified-payment capacity admission HOLD

Canonical WC/VOID `SOURCE_READY` is not yet sufficient to open Buy VOID
intake. The current manual payment verifier can recognize a successful USDC
payment and append `payment_verified`, while presale accounting treats that
event as reserved VOID. Unpaid requests intentionally reserve nothing, so
request-time remaining-inventory checks alone cannot prevent multiple
outstanding quotes from later becoming verified obligations beyond the finite
presale pool.

Production therefore hardcodes
`VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1=false`.
`classifyBuyLaunchGateV1(...)` returns
`buy_void_verified_payment_capacity_admission_not_ready` even when the
coupled WC/VOID source classifier is otherwise `SOURCE_READY`.

This implementation lane supplies the atomic verified-payment capacity
boundary described in
`src/economic/buy_void_verified_payment_capacity_admission_v1.ts`: it
serializes the finite-capacity transition, re-reads current verified
reservations while holding that lock, rejects obligations above remaining
inventory, and proves concurrent near-sellout verifications cannot both reserve
the same remaining VOID.

The stacked canonical payment-identity admission lane closes
`source_chain:transaction_hash:log_index` reuse at the same serialized
`payment_verified` boundary. The source-ready constant intentionally remains
false because the final append-only allocation/reservation contract is still a
separate required gate. Only after that last reservation record is reviewed and
proven may a later promotion consider setting capacity admission ready.

The focused proof has an explicitly test-only classifier helper so the deeper
generation/lease machinery can still be exercised synthetically. Production
`readBuyLaunchSourceGateV1()` uses only the frozen false capacity-admission
constant and has no runtime/environment override.

## Live activation evidence

Public intake additionally requires a separately authorized live coupled-launch
receipt. No such production receipt is committed by this source lane.

The runtime requires a cryptographically authorized receipt, a durable
generation journal, a separate external high-water mirror, and explicit
transport bindings.

The receipt must carry two EIP-712 signatures over the same activation
statement:

- launch-controller identity:
  `0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`;
- current source-backed Sovereign/closeout-controller co-signer:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`.

The second signature is required because historical control of the launch
controller candidate is not, by itself, current role authorization. Each live
lease therefore requires explicit Sovereign co-authorization.

The signed payload binds execution epoch 2, the launch-controller role ID, both
signer addresses, the exact coupled launch ID, the exact source composition ID,
a 32-byte activation nonce, a 32-byte activation generation, the exact
content-addressed generation-journal tip, activation and expiry times, the
content-addressed receipt ID, and every boolean that claims
the private Buy runtime / WC/VOID market / presale were activated in the same
ceremony. A different signer, missing co-signature, malformed signature,
changed signed field, expired lease, superseded generation, or future-dated
activation time fails closed.

Runtime state is bound through:

- `DATA_DIR` / `VOID_DATA_DIR`, locating the private append-only
  `economic/buy-void-coupled-live-generation-v1.jsonl` journal;
- the fixed OS-user authority path
  `~/.local/state/void-node-authority-v1/buy-void-coupled-live-generation-anchor-v1.jsonl`,
  which must contain byte-identical generation history and must resolve outside
  `DATA_DIR`;
- `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH`: exact absolute path to the
  current private receipt;
- `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256`: exact SHA-256 of those
  receipt bytes; and
- `VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM`: exact operator confirmation
  `activate-coupled-public-buy-v1:<generation>:<generation_tip>:<receipt_id>:<receipt_sha256>`.

Generation event timestamps are also bounded at publication: an event may be at
most 30 seconds ahead of the publisher's current wall clock. This allows small
clock skew without allowing an accidental far-future event to wedge later
append-only revocation through the monotonic timestamp rule.

The generation is not accepted from a mutable environment value. The current
generation and its content-addressed tip are accepted only when the runtime
journal and the fixed external high-water mirror are byte-identical and both
validate as the same contiguous event chain. An active generation must be
revoked before another generation can become active.

The external mirror is intentionally outside the ordinary runtime data rollback
domain and is not selected by an activation environment variable. If
`DATA_DIR`, the receipt, and the service environment are restored to an older
snapshot while the external mirror retains a later revocation/rotation, the
mismatch fails closed. Generation transition tooling must durably publish the
same complete append-only bytes to both locations before a lease relying on that
tip can become admissible.

Each live-gate evaluation reads and validates that generation/high-water pair
before receipt parsing and signature verification, then reads it again after
both signatures and the operator confirmation are verified. The generation,
tip, sequence, external-anchor identity, and active state must remain identical
across those two observations; a revocation or rotation completing during
receipt verification therefore fails closed before `ready=true`.

State mutation closes the remaining post-check race with the repository's
existing crash-recoverable filesystem bakery lock. The fixed generation
authority lock is a sibling of the external high-water mirror. New request
persistence and `payment_verified` persistence acquire that lock, rederive the
current request authority while holding it, and keep it held through the exact
append. After the gate derivation completes, mutation admission samples the
clock again and rechecks both the bound request expiry and the current receipt
expiry with that fresh time, so a lease that expires during receipt/signature
verification cannot authorize the append.

Generation publication now has one canonical reviewed writer:
`ops/precision/void-buy-coupled-live-generation-publish-v1.mjs`. That operator
entrypoint calls `publishBuyLaunchGenerationTransitionV1(...)`, the only
exported generation-publication operation. Its internal critical section takes
the same generation-authority lock used by request/payment mutation.

Publication is crash-recoverable across the two independent authority files.
Before either journal or external-anchor write, the publisher atomically stores
a private write-ahead intent at
`~/.local/state/void-node-authority-v1/buy-void-coupled-live-generation-publication-intent-v1.json`.
That intent binds the prior authority digest, the complete next append-only
journal bytes/digest, generation, state, sequence, tip, and event timestamp.
While holding the same generation-authority lock, a retry first examines any
pending intent. Each observed authority file must be either the recorded prior
state or the recorded next state (or absent only for a genesis transition).
Only the writer's exact forward order is recoverable: intent-only, journal
committed while the anchor remains prior, or both files committed to the next
bytes. Anchor-first, rollback-mixed, unknown, missing-required-prior, or
non-append-only states fail closed. The intent itself proves the final event's
generation/state/timestamp and the exact one-event append from its prior digest.
Generation-authority reads check the intent path both before and after the
journal/anchor snapshot. If an intent is present at either boundary, the read
HOLDS rather than accepting a pair written inside an unfinished publication. A
publication that completes entirely between those checks is accepted only
through the resulting byte-identical journal/anchor pair. Recovery requires the
caller to retry the exact state/generation/timestamp transition recorded by the
intent.
The intent is removed and its directory fsynced only after both authority files
are byte-identical and the next state has been revalidated.

The underlying bakery lock now provides
`withBuyVoidFilesystemBakeryLockAsyncV1(...)`: its queue claim remains present
until `await operation()` settles, and cleanup occurs only in the enclosing
`finally`.
 Each queue claim also binds the process PID to the Linux
`/proc/<pid>/stat` start-time ticks observed when the claim is created. On
persistent Docker authority volumes, a claim left by a crashed container is
therefore reclaimed when a later container reuses the same PID but has a
different process incarnation; PID liveness alone is not treated as ownership.
 The launch gate uses that async-aware lock for both generation
publication and request-authority mutation. A Promise-returning critical section
therefore cannot resume after its lock claim has been released. Its contention loop also yields with
an asynchronous timer rather than blocking the Node event loop, so a second
same-process contender cannot prevent an existing asynchronous holder from
resuming and releasing its claim. The canonical
publisher itself still performs the complete journal + external-anchor file
transition synchronously while that async-aware lock is held. A generation
transition and a payment/request mutation therefore cannot complete concurrently
through reviewed paths.

For the canonical Docker Compose path, the final image packages
`ops/precision/void-buy-coupled-live-generation-publish-v1.mjs` and runs with
an explicit root runtime identity. The image intentionally does not declare an
anonymous authority `VOLUME`; Compose owns persistence and mounts a distinct
named volume for each node at
`/root/.local/state/void-node-authority-v1`. Authorized generation publication
must execute inside the target service namespace so the publisher and node share
the same fixed `userInfo().homedir`-derived anchor and generation-lock files;
a host-side publisher is not equivalent to the container authority namespace.

The publisher is not run by this PR. No generation journal, external anchor,
activation receipt, request intake, market activation, presale activation, or
funds movement is created merely by merging this source.

The receipt is accepted only when it is a stable, direct, operator-owned private
regular file under no-follow descriptor traversal, with no group/other
permissions and no link aliases. File ownership, SHA-256, and the confirmation
string provide custody/integrity binding; they are not launch authority. The
launch-controller signature plus Sovereign co-signature are the live lease
authority proof.

Private authority/receipt reads are byte-bounded at the descriptor layer as well
as by the pre-open stat. The reader consumes at most `maxBytes + 1` bytes and
fails immediately on overflow, so a file that grows concurrently after the
initial size check cannot force an unbounded read before the existing
post-read inode/stat consistency checks reject it.

Its content must be content-addressed and bind:

- marker `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1`;
- status `COUPLED_PUBLIC_LAUNCH_ACTIVE`;
- the fixed launch-controller signer;
- the fixed Sovereign co-signer;
- valid signatures from both identities over the same typed payload;
- a unique bytes32 activation nonce;
- the exact active bytes32 activation generation and generation-journal tip;
- activation and expiry timestamps with a maximum five-minute lease;
- a valid launch-controller EIP-712 signature;
- the exact coupled launch ID;
- the exact current source composition ID;
- private Buy VOID runtime active;
- production WC/VOID market active;
- public presale active;
- the same launch ceremony;
- public Buy request intake explicitly authorized;
- `runtime_or_launch_evidence=true`; and
- `source_ready_only=false`.

A missing path, digest, generation journal, external high-water mirror,
journal/anchor mismatch, confirmation, insecure file, changed file, stale
composition ID, expired lease, revoked/superseded generation, mismatched
generation tip, malformed receipt, wrong/invalid signature, future-dated
activation, or any false launch fact holds
intake closed. The receipt is therefore a renewable activation lease rather than
permanent evidence of a past ceremony. A self-authored JSON fixture with
internally consistent hashes and environment confirmation cannot open production
intake.

The existing final coupled source-promotion lane is deliberately not accepted as
live evidence: that lane explicitly retains
`public_intake_enabled=false`,
`market_activation_authorized=false`, and
`public_presale_activation_authorized=false`.

## Runtime admission

The two public Buy VOID surfaces require both:

`VOID_BUY_REQUESTS_ENABLED=1`

and

`readBuyLaunchGateV1().ready === true`.

Thus the environment toggle alone cannot open intake, source readiness alone
cannot open intake, and live evidence for one side of the coupled opening cannot
open the other side independently. A later shutdown closes intake by appending
the matching generation revocation; a replacement ceremony must append a new
generation after that revocation. An unattended activation receipt self-closes
when its lease expires.

Every accepted public Buy request snapshots the exact current request authority:
coupled launch/composition, generation, durable generation-journal tip, activation
receipt ID/SHA-256, and its original lease expiry. The handler revalidates that
snapshot before persisting or returning payment instructions. Inside the shared
generation lock, mutation admission deliberately samples the clock again after
live-gate derivation; a request that was valid when the gate read began but has
expired by the final mutation check is rejected. The final request
append then runs under the shared generation-authority lock and rederives the
authority inside that critical section. Tx-hash binding and payment verification
both revalidate the request against a currently live gate on the same
generation/tip; the final `payment_verified` append likewise runs under that
same generation lock (and its request lock), with authority rederived while the
generation lock remains held through the write. A
same-generation receipt renewal may keep the launch live, but it never extends
the request's original payment deadline. An expired, revoked, rotated, or
otherwise superseded request therefore cannot accept a new payment or advance
into `payment_verified`.

That payment-admission lease does not erase obligations already accepted while
the lease was valid. Operator rejection/review and confirmed fulfillment of an
already verified payment remain available after intake closes; those are
resolution actions, not new payment admission.

Ethereum payment verification/finality remains a separate prerequisite; this
gate does not replace the Ethereum finality gate.

## Current state

The checked-in canonical economic candidates remain `HOLD`, and no production
live coupled-activation receipt is installed by this change. Merging this source
therefore does not open Buy VOID intake, activate WC/VOID, or activate the
presale.

## Authority

Source/package/proof only:

- no request-intake activation;
- no runtime/config mutation;
- no service restart;
- no wallet, signer, credential, or private-key access;
- no payment or transaction action;
- no inventory reservation or funding;
- no presale/WC market activation;
- no liquidity, treasury, token, or funds movement.

## Verification

```bash
node scripts/prove_void_wc_void_coupled_launch_readiness_v1.mjs
node scripts/prove_void_buy_coupled_launch_gate_v1.mjs
npx tsx scripts/prove_buy_void_filesystem_bakery_lock_async_v1.ts
node scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs
npx tsx scripts/prove_buy_void_request_tx_hash_binding_v1.ts
node ops/precision/void-buy-coupled-live-generation-publish-v1.mjs --help
```

The focused proof uses only temporary synthetic EIP-712 signers and a
live-receipt fixture. It proves the signature format plus
parser/custody/digest/confirmation behavior, durable generation
revocation/rotation, rejection of rolled-back runtime journal bytes against a
newer external high-water anchor, write-ahead recovery of interrupted dual-file
generation publication, rejection of unknown partial publication state, request
expiry, and explicitly proves that valid synthetic signatures cannot
satisfy either fixed production authority identity. CI never has either
production key, cannot mint production activation evidence, and carries no
runtime or economic authority.
