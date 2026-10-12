# Buy VOID production canary candidate recovery v1

Marker:

`VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1`

Tracks #1124. Follows merged #1120 and hands off to merged #1118.

## Purpose

Recover the exact production canary execution-attempt ID after the successful
candidate-reservation receipt is unavailable, without creating a second attempt,
changing saga state, entering transaction preparation, or invoking production
preflight automatically.

Merged #1120 intentionally stops after `reserve_execution_attempt`. Its successful
receipt contains `candidate_attempt_id`. A later reservation invocation does not
repeat the mutation and instead tells the operator to use the prior receipt. This
operator supplies the missing crash/restart/lost-terminal-output recovery path by
reading the already-durable execution-attempt journal.

## Closed selector

The only CLI business selector is:

```text
--request-id <request-id>
```

Example:

```bash
npx tsx scripts/buy_void_production_canary_candidate_recovery_v1.ts \
  --request-id <request-id>
```

There is no `--runtime-root`, wallet, RPC URL, signer, credential, transaction,
status override, or apply flag.

## Runtime-root authority

The recovery operator imports the same
`buyVoidNativeExecutionRuntimePolicyStateV1()` parser used by the native execution
runtime and the production preflight operator.

That parser supplies the server-owned runtime root. Recovery does not implement a
second `DATA_DIR`/`VOID_DATA_DIR`/`VOID_BUY_VOID_RUNTIME_DIR` precedence rule and
therefore does not reopen the runtime-root split-brain defect repaired by #1123.

The canonical native execution runtime must remain disabled. The canonical
execution policy must still require:

- execution-attempt journaling enabled;
- one attempt per payment;
- chain ID 2050; and
- one fulfillment-wallet allowlist entry.

The raw runtime root is never returned. The receipt contains only a SHA-256
fingerprint of that root and the canonical runtime-policy fingerprint.

## Journal recovery contract

Recovery calls only `listBuyVoidExecutionAttemptsV1(...)` against the canonical
runtime root and filters by exact persisted `reservation.request_id`.

A candidate is returned only when all of these are true:

1. exactly one attempt matches the requested request ID;
2. its attempt ID, payment key, request key, and intent fingerprint are valid
   lowercase SHA-256 values;
3. its instruction ID is bounded and canonical;
4. `attempt_number=1`;
5. `max_attempts_per_payment=1`;
6. status is exactly `reserved` or `prepared`; and
7. no broadcast, pre-broadcast failure, post-broadcast failure, or confirmation
   record exists.

Zero matches fail closed. Multiple matches fail closed rather than choosing one.
Broadcast, failed, confirmed, malformed, widened-policy, or later-attempt state
fails closed.

## Sanitized recovery receipt

A successful result returns:

```text
status=candidate_recovered
request_id=<exact request id>
candidate_attempt_id=<exact lowercase 64-hex attempt id>
attempt_status=reserved|prepared
candidate_handoff=production_live_canary_preflight
runtime_policy_fingerprint_sha256=<sha256>
runtime_root_fingerprint_sha256=<sha256>
candidate_binding_fingerprint_sha256=<sha256>
recovery_evidence_id_sha256=<sha256>
matching_attempt_count=1
```

The candidate-binding fingerprint binds the request, attempt, attempt number,
payment key, request key, instruction ID, and intent fingerprint without exposing
those internal journal values in the output.

The recovery-evidence ID additionally binds the candidate status and canonical
runtime-policy/root fingerprints.

## Handoff to production preflight

Recovery does not call preflight. The recovered `candidate_attempt_id` is the
explicit handoff value for merged #1118:

```bash
npx tsx scripts/buy_void_production_preflight_operator_v1.ts \
  --attempt-id <candidate_attempt_id>
```

That next operator still performs its own deterministic planning. A later real
inspection still requires its separate exact confirmation and exact plan-ID
echoes. Recovery grants none of those authorities.

## Authority boundary

This operator performs one bounded filesystem/journal read. It does not:

- write or repair any execution-attempt journal;
- create or reserve an attempt;
- mutate the Buy VOID saga;
- reserve, release, or decrement inventory;
- invoke transaction preparation;
- call Chain-2050 RPC;
- read a credential or wallet secret;
- sign a transaction;
- submit or broadcast a transaction;
- start or restart a private service;
- invoke production preflight;
- emit a public fulfilled closeout; or
- move funds.

## Verification

Focused proof:

```bash
npx --no-install tsx \
  scripts/prove_buy_void_production_canary_candidate_recovery_v1.ts
```

Expected marker:

```text
VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1_PROOF_GREEN
```

Hosted CI runs Node.js 22, 24, and 26 and preserves the execution-attempt journal,
production candidate-reservation operator, production preflight operator,
repository typecheck/build, and committed-range diff hygiene.

Refs #1124, #1120, #1118, #1123.
