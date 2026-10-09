# Buy VOID operator verified-allocation dispatcher — unmounted source contract

## Production wiring HOLD

The payment→allocation source stack merged through [#2674](https://github.com/6ZoSo9/void-node/pull/2674),
commit `39466f055896d5213f19876a00ede4e54313ac9f`, with 39/39
source/CI checks successful. However the real operator route still calls
`writeBuyVoidOperatorEventWithCapacityAdmissionV1`, a legacy payment-only
path which can durably append `payment_verified` without the new canonical
`allocation_reserved` publication. The independently reviewed
`writeBuyVoidVerifiedPaymentAllocationHandoffV1` is not yet mounted;
see the [P1 source review](https://github.com/6ZoSo9/void-node/pull/2674#issuecomment-6070441315).

This Draft is stacked on the current V6 source-finality and hardened
bearer-authenticated, POST-only operator integration
[#2675](https://github.com/6ZoSo9/void-node/pull/2675). Unlike the
old mainline route, that parent includes the reviewed private operator
capability and native-USDC payment-instruction guards. The source-only
helper here changes none of those routes or authentication rules.

## Source-only dispatch contract

`src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts`
implements an **unmounted** router-callable dispatch. Before any full JSON
serialization, it walks the event and caller request through a closed
plain-data snapshot boundary: only JSON primitives, dense arrays and plain
objects are accepted; Node-detectable Proxy objects, accessors, symbol keys,
functions, `toJSON` callbacks, non-plain prototypes and unsupported values
HOLD before caller traps/callbacks are invoked. The walk
enforces depth, node/key, array, key-text and value-text limits and an exact
encoded JSON budget capped at 256 KiB. Only after that preflight does it
serialize the detached clone, verify the computed byte budget, parse it back,
deep-freeze it, and require matching nonempty request IDs.

Before validation it also captures the request root, both allocation roots and
both server callbacks exactly once. The frozen plan retains those exact values,
and dispatch consumes only the plan; it never re-reads callbacks or roots from
the original input object after validation. This closes stateful-getter
substitution between admission and writer selection.

Before selecting a writer, the planner requires an exact closed operator-status
vocabulary: `payment_verified`, `reviewed`, `fulfilled`, or `rejected`.
It does not trim, lowercase, or canonicalize malformed input. Whitespace-
padded, case-folded, unknown, empty, and non-string statuses HOLD before
either writer. This prevents a value such as `"payment_verified "` from
taking the legacy path and later being reclassified as verified by a
trim-based ledger reader.

For exact `operator_status="payment_verified"`, it refuses to call
*either* writer unless distinct absolute normalized private allocation-ledger
and high-water paths are supplied; neither path may equal the filesystem
root or be nested beneath the other. A qualified server, never an HTTP
buyer, must supply these roots. On valid planner input, the dispatch calls
only `writeBuyVoidVerifiedPaymentAllocationHandoffV1`. It has no
payment-only fallback for a verified payment.

Only exact `reviewed`, `fulfilled`, and `rejected` events remain routed
to `writeBuyVoidOperatorEventWithCapacityAdmissionV1`. This preserves their
separate review/fulfillment semantics pending independent router tests.

The `AUTHORITY` object truthfully reports mount/authentication/independent
custody/deployment/production readiness/funds movement as FALSE. It also states
`custody_service_composed=false` and
`direct_web_process_private_root_write_authority=false`. The existing
allocation-custody Unix-socket service intentionally keeps reserve disabled
until verified-payment provenance can be bound inside that service boundary.
Therefore this unmounted helper must not be used as justification to grant the
web process direct write access to the protected custody roots. Input-path
syntax checks cannot prove installed custodian identity, root permissions,
first-original buyer history, provider quorum or external high-water witness.

## Deterministic tests

`scripts/prove_buy_void_operator_verified_allocation_dispatch_v1.ts`
uses **inert, in-memory JSON** only: immutable snapshots, caller `toJSON`
and property-accessor rejection without invocation, Proxy rejection without
executing `ownKeys`/descriptor traps, a 4 MiB text adversary
that must HOLD before full `JSON.stringify`, deep nesting that must HOLD at
the structural depth gate, a 5,000-key object that must stop at the key-count
gate without constructing a complete descriptor table or JSON string, a sparse
array that must not fall through to inherited index lookup, stateful
root/callback getters that must each be read exactly once, exact nonpayment
preservation, rejection of
`payment_verified` whitespace/case aliases and every unknown status,
invalid/missing/relative/aliased roots, request-ID mismatch and invalid
callback negatives. The same malformed-status cases are passed through the
dispatcher entry point and must reject before either writer can be selected. A TypeScript AST proof verifies
the new function invokes the canonical allocation writer only in its
verified-payment branch, with the legacy writer separately reachable only
for nonpayment statuses.

The proof also pins the **existing composed operator router's**
`src/index.ts` exact Git blob
`f0c1292f26cbe3f9c6bc64dfc824cd616a9a7048`, confirms its
POST-only verification/mark mutation routes and operator intent helper,
and explicitly verifies the mounted event writer still calls the old
payment-only API. Therefore
`mounted_verified_allocation_dispatch=false` is intentional truth,
not a failure hidden by CI. The verified-payment allocation source API
is pinned to Git blob `496715e7ae2941663908976a4a3f4efd7c6199cf`.

The scoped GitHub workflow separately typechecks/builds this composed
checkout on Node 22/24/26 **without starting a server**, runs the inert
proof, and requires byte-equal reports from all three versions. The
pre-serialization budget is a source-level resource boundary only; the
dispatcher remains unmounted and does not claim that a later HTTP/router
integration has supplied the same already-bounded DTO contract or qualified
live customer history.

## Remaining release gates

Future reviewed work must first qualify the custody-service reserve path (or
an equivalently reviewed privilege-separated writer) with independently bound
verified-payment provenance. Only then may the **actual authenticated** mounted
operator route delegate verified-payment allocation through that protected
boundary. Direct web-process write access to the custody roots remains HOLD.
The composed route must then test real crash and replay behavior
only on disposable private filesystem fixtures; prove no successful
operator `payment_verified` acknowledgment without canonical durable
allocation or explicit crash-repair HOLD. Qualified live high-water
witnesses, runtime identity, original buyer provenance, provider finality,
signer/treasury and coupled WC/VOID presale remain separate gates.

This PR does NOT edit `src/index.ts`, any installed host, real customer
ledger, wallet/key/signer, transaction, Chain-2050/WC, treasury/liquidity,
presale/market or funds. No Ready, merge, runtime deployment or sale
activation is authorized.

**PROTECT THE CORE.**

## Canonical custody roots

The verified-payment branch does not merely require absolute, separated paths.
It requires the exact reviewed production custody roots:

- `/var/lib/void-allocation-ledger-v1`
- `/var/lib/void-allocation-custody-v1`

Any other absolute path, swapped root, nested root, relative path, or filesystem
root remains HOLD. This is a source-level anti-miswiring constraint only; it
does not prove the installed service owns those roots or grant the web process
direct write authority.

