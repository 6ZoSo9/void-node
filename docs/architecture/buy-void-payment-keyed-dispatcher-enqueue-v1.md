# Buy VOID payment-keyed dispatcher enqueue v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1`

Status: **source-only prepared-attempt enqueue composition**. This gate connects already-durable payment-keyed preparation custody to dispatcher submission only. It does not claim a worker lease, execute work, sign, broadcast, mount a runtime route, or move funds.

## Identity

The dispatcher job key and immutable payload identity are reused directly from the existing durable preparation custody projection:

```text
attempt_id                    -> dispatcher attempt_id
request_fingerprint_sha256    -> dispatcher request_fingerprint_sha256
```

No new hash domain or caller-supplied request fingerprint is introduced. The caller selects only the canonical `attempt_id`; the request fingerprint comes from the validated custody record.

The custody reader already revalidates the exact custodian request, deterministic signing evidence, custody fingerprint, signed transaction hash, raw signed transaction SHA-256, and the no-broadcast/no-money authority flags before returning the public projection.

## Enqueue lifecycle

`enqueueBuyVoidPaymentKeyedPreparedAttemptV1(...)`:

1. requires an absolute non-root server-controlled custody root;
2. validates the canonical 64-hex attempt ID;
3. reads the durable preparation custody record using the existing custody reader;
4. requires the returned custody `attempt_id` to equal the selected attempt;
5. requires the custody request fingerprint and custody fingerprint to be canonical SHA-256 values;
6. rechecks that custody does not authorize raw signed transaction persistence/output, transaction broadcast, or money movement;
7. submits only `attempt_id + request_fingerprint_sha256 + client_id` to the qualified dispatcher store;
8. returns `submitted`, `idempotent`, or an explicit dispatcher fingerprint conflict.

A missing or invalid custody record is held before any dispatcher submission attempt.

## Idempotency and conflict behavior

First enqueue creates the dispatcher job. Repeating the exact custody identity is idempotent and retains the same canonical job. If a dispatcher row already exists for the attempt with a different request fingerprint, the dispatcher records its normal `PAYLOAD_CONFLICT` audit and this composition returns a conflict without replacing canonical identity.

## Authority boundary

```text
source_only_contract=true
durable_preparation_custody_required=true
request_fingerprint_from_custody_only=true
caller_request_fingerprint_authority=false
dispatcher_submit_only=true
dispatcher_claim=false
dispatcher_renew=false
dispatcher_publish=false
lease_capability_issue=false
worker_execution=false
runtime_route_mount=false
production_connection_factory=false
wallet_access=false
credential_access=false
signing=false
transaction_broadcast=false
money_movement=false
```

This module accepts the dispatcher store through dependency injection. It does not create a PostgreSQL connection or choose production database credentials.

## Acceptance proof

`scripts/prove_buy_void_payment_keyed_dispatcher_enqueue_v1.ts` proves:

- missing custody holds before dispatcher mutation;
- custody attempt mismatch holds before dispatcher mutation;
- unsafe custody authority flags hold before dispatcher mutation;
- first durable-custody enqueue submits exactly once;
- a caller-provided extra fingerprint field has no authority over custody identity;
- repeat enqueue is idempotent;
- pre-existing different dispatcher fingerprint fails closed and preserves the old canonical row;
- audit event sequence remains `SUBMIT` / `SUBMIT_REPLAY` or `SUBMIT` / `PAYLOAD_CONFLICT` as appropriate;
- the module imports dispatcher submission but not claim, renew, or publish;
- no runtime route, wallet, signing, broadcast, or money authority is introduced.

## Next gate

After enqueue-only composition is accepted, the next gate should be **claim-only worker admission**: a bounded worker may claim an already-enqueued attempt and receive a lease capability, but must still stop before signing or broadcasting. That gate should bind worker identity, lease TTL policy, secure token generation, and the exact prepared-custody reconstruction path before any execution authority is added.
