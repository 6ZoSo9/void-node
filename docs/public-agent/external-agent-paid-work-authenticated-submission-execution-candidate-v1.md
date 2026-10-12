# External-Agent Paid-Work Authenticated Submission Execution Candidate V1

Marker:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_V1
```

## Purpose

This lane defines and proves a disabled-by-default **single-shot execution
candidate** for a later authenticated paid-work submission.

It consumes the private activation plan and operator hold decision written by
the merged activation-prerequisite gate. It validates that those artifacts, the
prepared request, the credential-reference metadata, the replay key, and the
one-shot HTTP policy remain mutually consistent.

It does not execute the submission.

## Default state

The gate remains disabled unless configuration explicitly sets:

```json
{
  "enabled": true
}
```

The default command remains a dry run:

```json
{
  "apply": false,
  "confirmation": ""
}
```

A dry run validates everything in memory and derives the execution-candidate
ID. It writes no files.

## Required source artifacts

The command binds:

- the private activation plan;
- the private activation operator decision;
- the prepared request;
- the activation operation ID;
- gateway origin and canonical paid-work submission path;
- submission ID, work-order ID, request SHA-256, and replay key;
- credential-reference ID, source-locator SHA-256, and expected scope;
- an operator candidate nonce;
- supplied snapshots of known replay keys and known execution-candidate IDs;
- a bounded candidate expiry;
- the complete one-shot HTTP and outcome policy.

The activation operator decision must still be:

```text
hold_separate_live_execution_required
```

The candidate does not weaken or consume that hold.

## Credential provider boundary

The command describes only a future credential-provider contract:

```text
open_once_only_after_live_confirmation_then_zeroize
```

The dependency surface contains no credential provider. Therefore the proof,
CI, dry run, and apply mode cannot open a credential source.

The following remain false:

```text
credential_provider_invoked
credential_or_token_read
authorization_header_materialized
```

Credential source locators are represented only by SHA-256 and opaque IDs.

## Replay and one-shot boundary

The candidate validates that the activation replay key:

- matches the activation plan and hold decision;
- matches the operator expectation;
- is absent from the supplied replay snapshot.

It defines a future reservation strategy of:

```text
exclusive_create
```

but writes no reservation and consumes no replay state.

The one-shot lease contract requires:

```text
maximum_attempt_count = 1
automatic_retry = false
lease_strategy = exclusive_create
```

No lease is written in this lane.

## HTTP contract

The candidate fixes the later request policy to:

- HTTPS or loopback HTTP only;
- canonical path `/__void/agents/paid-work/submissions/v1`;
- `POST`;
- exact `application/json`;
- exact `X-VOID-Payload-SHA256` value;
- redirect mode `manual`;
- credentials mode `omit` until a separate live lane explicitly constructs
  Authorization;
- cache mode `no-store`;
- no cookies;
- no redirects;
- no automatic retry;
- one maximum attempt;
- bounded timeout and response size.

Response interpretation is planned as:

- HTTP `202`: accepted as a new submission;
- HTTP `200`: accepted duplicate;
- HTTP `409`: conflicting duplicate and hold;
- timeout, connection loss, or other ambiguous outcome:
  `hold_manual_reconciliation_no_retry`.

The future receipt must bind the submission ID, work-order ID, and request
SHA-256, and must confirm authentication and `accepted_for_review`.

## Apply mode

Apply mode requires the exact confirmation:

```text
reviewExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1
```

It also requires the exact derived execution-candidate ID.

Apply writes only two owner-private artifacts outside the repository:

1. An execution-candidate plan.
2. An operator decision that remains
   `hold_separate_operator_live_canary_required`.

The output directory is mode `0700`; files are mode `0600`.

Apply does not read credentials, reserve replay state, write a one-shot lease,
or send a request.

## Explicit authority boundary

The following remain false in every result and artifact:

```text
credential_provider_invocation
credential_or_token_read
authorization_header_materialized
replay_key_reservation_or_consumption
one_shot_lease_write
network_listener_creation
runtime_mount
external_http_submission
authenticated_submission_post
provider_selection
quote_creation
payment_authorization
payment_execution
work_execution_authorization
work_dispatch
live_ticket_issuance
work_credit_write
wallet_or_signer_access
signing
transaction_broadcast
service_restart
deployment
money_movement
```

Apply grants only private plan and private decision writes.

## Repository boundary

This lane adds exactly:

```text
.github/workflows/external-agent-paid-work-authenticated-submission-execution-candidate-v1.yml
docs/public-agent/external-agent-paid-work-authenticated-submission-execution-candidate-v1.md
examples/external-agent-paid-work-authenticated-submission-execution-candidate-v1.example.json
schemas/external-agent-paid-work-authenticated-submission-execution-candidate-v1.schema.json
scripts/external_agent_paid_work_authenticated_submission_execution_candidate_v1.ts
scripts/prove_external_agent_paid_work_authenticated_submission_execution_candidate_v1.ts
```

It does not modify `src/index.ts`, MCP registration, receiver configuration,
systemd units, credentials, replay state, wallets, ledgers, or deployment
state.

## Next boundary

After independent review and merge, a separate operator-controlled live-canary
lane may implement:

- a private credential-provider implementation;
- atomic replay-key reservation;
- an exclusive one-shot lease;
- final current-state revalidation;
- exact Authorization construction;
- one bounded request;
- sanitized receipt verification;
- terminal replay-state transition;
- credential zeroization and fail-closed ambiguous-outcome recovery.

None of those live authorities are included here.
