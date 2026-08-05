# Buy VOID native-delivery canary admission request V1

Marker: `VOID_BUY_VOID_NATIVE_DELIVERY_CANARY_ADMISSION_REQUEST_V1`

## Purpose

The merged Buy VOID dependency-readiness probe proves only that the dedicated
systemd credential derives the policy-wallet fingerprint and that a loopback
JSON-RPC endpoint reports Chain ID 2050. It does not prove that one root-scoped
canonical paid candidate is selected, that the native-execution dry run matches
that candidate, that all evidence was collected together from live runtime
state, or that ZoSo authorized funding or execution.

This lane defines a deterministic, content-addressed, offline canary-admission
**request contract**. It does not grant admission or execute a canary.

## Semantic repair

The initial draft allowed `runtime_sanitized` merely by changing
`evidence_class`, one review boolean, and the decision string. Its own proof
promoted the committed synthetic fixture—while retaining dummy report hashes
and synthetic request and attempt IDs—and accepted it as established live
runtime evidence.

That was evidence laundering, not runtime proof.

V1 is now deliberately **synthetic-contract-only**:

- `evidence_class` must be exactly `synthetic_example`;
- root-scoped candidate evidence remains explicitly unestablished;
- a runtime evidence materializer remains explicitly unestablished;
- live runtime evidence remains explicitly unestablished; and
- `runtime_sanitized` is rejected.

A future runtime packet requires a separately reviewed V2 materializer. It must
consume root-scoped candidate evidence, bind the exact complete report bytes or
a closed canonical projection, establish freshness and one collection window,
and preserve all-false execution and money authority. V1 cannot be relabeled
into that future state.

## Exact source binding

The validator no longer accepts arbitrary forty-character source identifiers.
It requires the exact V1 source state:

```text
main_commit=b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e
candidate_readiness_schema_blob=2a0fc85b582ce59def204060c803f04c385a4094
candidate_readiness_source_blob=f0f2a49a019e32c961ee96b9823830bfdaf9fe40
dependency_readiness_source_blob=adc44589068b12644f7a01e37a3503d048ec23da
native_execution_runtime_source_blob=9a04e0a20da2a2eabf8b87713782179138136174
native_execution_idempotency_commit=ac3449d113012c0d37a8b5f099e41f9d081d0279
```

The candidate-readiness implementation is now bound in addition to its schema.
The open root-scope hardening draft is not represented as merged evidence.
Until root-scoped evidence exists through a reviewed merged path, the request
remains held.

## Bound synthetic contract

A valid V1 packet binds:

- one exact synthetic `observe_and_claim` candidate projection;
- zero candidate-readiness parse failures;
- matching candidate and dry-run request IDs;
- matching candidate and dry-run plan fingerprints;
- dependency readiness for credential
  `buy-void-native-fulfillment-wallet-v1`;
- exact Chain ID `2050`;
- matching dependency and dry-run wallet-address fingerprints;
- a native-execution result that remains `status=dry_run`;
- server-journal reconstruction of the exact attempt;
- one-request and one-attempt maximums;
- native-value, gas, maximum-fee, priority-fee, total-fee, and total-outlay
  ceilings;
- automatic retry disabled; and
- persistent dependency, delivery, execution, and receipt runtimes disabled.

The packet rejects mismatched request, plan, wallet, or chain identities;
multiple candidates; orphan-event-only evidence; parse failures; live
execution status; mutation claims; limit overruns; automatic retry; raw
addresses or URLs; secret-bearing fields; unknown fields; source-binding
substitution; and every enabled authority.

## Canary outlay ceiling

The contract now requires both:

```text
maximum_total_fee_wei = maximum_gas_limit * maximum_fee_per_gas_wei
maximum_total_outlay_wei = maximum_native_value_wei + maximum_total_fee_wei
```

The dry-run value plus its worst-case fee must remain within the total-outlay
ceiling. This is a deterministic request boundary only. It does not establish
or authorize wallet funding.

## Evidence state and decision

The only accepted evidence class is:

```text
synthetic_example
```

These review fields must remain false:

```text
root_scoped_candidate_evidence_established=false
runtime_evidence_materializer_established=false
live_runtime_evidence_established=false
dedicated_wallet_funding_boundary_established=false
dedicated_wallet_funding_authorized=false
candidate_selected_for_live_execution=false
zoso_canary_authorized=false
```

Decision:

```text
HOLD_PENDING_ROOT_SCOPED_RUNTIME_EVIDENCE_WALLET_FUNDING_BOUNDARY_AND_ZOSO_CANARY_AUTHORIZATION
```

## Content address

The request ID is the SHA-256 of canonical JSON for the complete request body,
excluding only `request_id`, with prefix `voidbvndcar1_`.

Committed synthetic example:

```text
voidbvndcar1_33bd53203c4535dd17f22c61d76bbf9edbe8b4527a59a6e5356dac6ca6b44016
```

Any changed source binding, evidence field, candidate, plan, wallet
fingerprint, limit, posture, review field, decision, or authority changes the
content address and must still pass the complete semantic validator.

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
write, live probe, credential read, RPC or network request, process execution,
service change, dependency assignment, runtime enablement, candidate claim,
inventory or attempt reservation, wallet funding or access, transaction
construction, signing, broadcast, receipt closeout, inventory decrement,
retry, deployment, or money movement.

A root-scoped runtime collector/materializer, live evidence collection,
dedicated-wallet funding boundary, ZoSo canary authorization, runtime
activation, transaction execution, receipt reconciliation, and all fund
movement remain separate explicit gates.
