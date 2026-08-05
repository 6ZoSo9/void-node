# Authenticated paid-work replacement issuance closed input guard v1

Markers:

- `VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_GUARD_V1_PROOF_GREEN`
- `VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PROXY_REJECTION_V1_PROOF_GREEN`

## Purpose

The replacement issuance preparation builder validates the credential-rotation,
runtime-revalidation, and trusted-context records that it consumes, then emits a
sanitized content-addressed preparation packet.

Its lower-level JavaScript entrypoint historically accepted an ordinary object
and ignored unknown top-level fields. The first closed-input guard fixed that
root ambiguity, but it returned the original nested object graph. Downstream
validators could therefore encounter nested accessors, symbols, hidden fields,
custom prototypes, sparse arrays, cycles, aliases, non-JSON values, or mutation
of the caller-owned graph after validation.

A later deep-snapshot repair still admitted JavaScript `Proxy` objects. A proxy
can run `getPrototypeOf`, `ownKeys`, descriptor, property-read, or membership
traps during reflection and can report different evidence shapes across passes.
That violates the requirement that untrusted evidence be rejected or detached
before executable behavior can influence validation.

This guard defines the mandatory operator-facing and registry-facing builder
entrypoint for input that did not originate inside an already reviewed closed
data path. It creates one bounded descriptor-only deep snapshot before any
credential-rotation or runtime-evidence validator reads nested values and now
rejects every root or nested proxy before invoking a proxy trap.

## Exact root contract

`validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(...)` accepts
exactly six own enumerable data properties:

- `rotation_plan`;
- `rotation_runtime_binding`;
- `runtime_receipt`;
- `trusted_context_binding`;
- `proposed_not_before_utc`; and
- `proposed_expires_at_utc`.

The root check occurs before nested evidence traversal. It rejects:

- any root `Proxy`, including a revoked proxy, before reflection;
- any additional or missing string key;
- any symbol key;
- a custom or inherited prototype;
- a non-enumerable expected field; or
- a getter or setter in place of an expected data field.

Key ordering uses explicit ECMAScript UTF-16 code-unit comparison. It does not
use locale-sensitive collation.

## Descriptor-only deep snapshot

After the exact root shape passes, the guard traverses the complete input graph
using property descriptors. It never reads an accessor value. Every nested
record must use `Object.prototype` or a null prototype and every nested array
must use `Array.prototype`.

Before `Array.isArray`, prototype inspection, key enumeration, or descriptor
inspection, the Node.js 22 `node:util/types` `isProxy` primitive rejects the
current object. This check does not invoke proxy traps. It applies recursively
to ordinary proxies, array proxies, and revoked proxies.

The traversal permits only the JSON value domain:

- null;
- booleans;
- strings;
- finite numbers other than negative zero;
- dense arrays containing only indexed enumerable data properties; and
- records containing only enumerable string-keyed data properties.

It rejects proxies before traps, nested accessors without invoking them, symbol
keys, non-enumerable fields, custom or inherited prototypes, sparse or augmented
arrays, functions, `undefined`, symbols, bigint values, `NaN`, infinity,
negative zero, cycles, and shared object references. Rejecting aliases keeps the
accepted graph equivalent to a freshly decoded JSON tree rather than an
executable or identity-dependent JavaScript object graph.

The accepted graph is copied into detached objects with immutable data
properties and is deeply frozen. The underlying preparation builder receives
only this snapshot, so later mutation of the caller-owned input cannot alter the
validated evidence.

## Resource bounds

The deep snapshot fails closed at these exact limits:

- maximum depth: `64`;
- maximum keys in one record: `4096`;
- maximum UTF-8 bytes in one property name: `1024`;
- maximum array length: `10000`;
- maximum object or array nodes: `50000`;
- maximum total record keys and array elements: `100000`; and
- maximum aggregate UTF-8 string bytes: `8388608`.

These limits bound descriptor traversal and snapshot allocation before the
existing semantic validators run.

## Mandatory entrypoint

Untrusted, JSON-decoded, operator-supplied, registry-supplied, or cross-process
input must use:

```text
buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1
```

The wrapper closes and snapshots the complete input graph first and only then
delegates to the existing builder, which performs the full rotation, runtime
receipt, trusted-context, validity-window, packet-content, and authority
validation.

The existing builder remains a deterministic lower-level primitive only for
callers that already prove the same root and deep-data contract. Its acceptance
of a JavaScript object must not be interpreted as acceptance of undeclared,
hidden, executable, proxied, or mutable input.

## Proxy adversarial proof

The focused proxy proof supplies:

- a root object proxy;
- a nested evidence-record proxy;
- a nested array proxy; and
- a revoked nested proxy.

The live proxy handlers count property reads, prototype checks, key enumeration,
descriptor inspection, and membership tests. Every counter remains zero when
the guard rejects the input, proving rejection occurs before any trap can run.

## Security and authority boundary

The guard does not inspect, log, copy, or authorize credential material. It does
not create a credential, approve a review, write a registry, restart a receiver,
retire or create a Work Credit binding, authenticate, sign, acquire or accept a
quote, construct an execution plan, execute payment, dispatch work, write Work
Credits, access a wallet, broadcast a transaction, or move funds.

Unknown root fields fail before downstream evidence validation. Hidden,
executable, or proxied nested fields fail before downstream nested reads. The
decision remains `HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`, and
execution authority remains false.

## Verification

```bash
node --check \
  integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs
node --check \
  scripts/prove_authenticated_paid_work_replacement_issuance_closed_input_guard_v1.mjs
node --check \
  scripts/prove_authenticated_paid_work_replacement_issuance_proxy_rejection_v1.mjs
node \
  scripts/prove_authenticated_paid_work_replacement_issuance_closed_input_guard_v1.mjs
node \
  scripts/prove_authenticated_paid_work_replacement_issuance_proxy_rejection_v1.mjs
```

Expected markers:

```text
VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_GUARD_V1_PROOF_GREEN
VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PROXY_REJECTION_V1_PROOF_GREEN
```
