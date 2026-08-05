# Buy VOID native-delivery canary admission request V1

Marker: `VOID_BUY_VOID_NATIVE_DELIVERY_CANARY_ADMISSION_REQUEST_V1`

## Purpose

The merged Buy VOID dependency-readiness probe proves only that the dedicated
systemd credential derives the policy wallet fingerprint and that a loopback
JSON-RPC endpoint reports Chain ID 2050. It intentionally does not prove that a
live candidate is selected, that the native-execution dry run matches that
candidate, that the proposed amount and fee ceilings fit one bounded canary, or
that ZoSo authorized funding or execution.

This lane closes that review gap with a deterministic, content-addressed,
offline admission **request**. It does not grant admission or execute a canary.

## Bound evidence

A valid request binds all of the following sanitized evidence:

- exactly one canonical `observe_and_claim` candidate;
- zero candidate-readiness parse failures;
- a matching request ID and plan fingerprint;
- dependency readiness for the dedicated credential and Chain ID 2050;
- matching wallet-address fingerprints across dependency and dry-run evidence;
- a native-execution result that remains `status=dry_run`;
- server-journal reconstruction of the exact attempt;
- one-request and one-attempt limits;
- exact native-value, gas, fee, priority-fee, and total-fee ceilings; and
- a persistent runtime posture in which every apply and enablement gate remains
  disabled.

The packet rejects mismatched request, plan, wallet, or chain identities;
multiple candidates; orphan-event-only evidence; parse failures; live execution
status; any mutation; limit overruns; automatic retry; raw addresses or URLs;
secret-bearing fields; and any enabled authority.

## Evidence classes

`synthetic_example` is the committed fixture. It demonstrates the contract but
sets `live_runtime_evidence_established=false` and retains this decision:

```text
HOLD_PENDING_LIVE_RUNTIME_EVIDENCE_WALLET_FUNDING_BOUNDARY_AND_ZOSO_CANARY_AUTHORIZATION
```

A future separately collected and reviewed `runtime_sanitized` packet may set
only `live_runtime_evidence_established=true`. It still retains:

```text
HOLD_PENDING_WALLET_FUNDING_BOUNDARY_AND_ZOSO_CANARY_AUTHORIZATION
```

Neither evidence class can set wallet funding, live candidate selection, ZoSo
canary authorization, apply, signing, broadcast, or money authority.

## Content address

The request ID is the SHA-256 of canonical JSON for the complete request body,
excluding `request_id`, with prefix `voidbvndcar1_`.

Committed synthetic example:

```text
voidbvndcar1_1cff15d4dd49d548510faf8e0f068f665f76c226c85f34f188ad718dec1acd00
```

Any changed source binding, report hash, candidate, plan, wallet fingerprint,
limit, posture, review field, decision, or authority changes the content
address and must still pass the complete semantic validator.

## Source bindings

The V1 example binds current `main`
`b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e`, the merged candidate-readiness
schema, the dependency-readiness implementation, the native-execution runtime,
and the merged native-execution idempotency repair.

The open root-scope hardening draft is not treated as merged evidence and is
not imported or modified by this lane.

## Verification

```bash
node --check tools/buy-void-native-delivery-canary-admission-request-v1.mjs
node --check scripts/prove_buy_void_native_delivery_canary_admission_request_v1.mjs
node scripts/prove_buy_void_native_delivery_canary_admission_request_v1.mjs
```

Expected marker:

```text
VOID_BUY_VOID_NATIVE_DELIVERY_CANARY_ADMISSION_REQUEST_V1_PROOF_GREEN
```

## Authority boundary

This is source, schema, synthetic fixture, documentation, and CI only. The tool
imports only Node's cryptographic hashing library. It performs no filesystem
write, credential read, RPC or network request, process execution, service
change, dependency assignment, runtime enablement, candidate claim, inventory
or attempt reservation, wallet funding or access, transaction construction,
signing, broadcast, receipt closeout, inventory decrement, retry, or money
movement.

A future live evidence collection, dedicated-wallet funding boundary, ZoSo
canary authorization, runtime activation, transaction execution, and all fund
movement remain separate explicit gates.
