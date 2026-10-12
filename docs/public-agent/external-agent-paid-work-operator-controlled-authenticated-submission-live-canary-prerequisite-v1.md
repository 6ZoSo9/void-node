# External-Agent Paid-Work Operator-Controlled Authenticated Submission Live-Canary Prerequisite V1

Marker:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_V1
```

## Purpose

This lane adds the final **non-executing** operator-controlled prerequisite
gate before a possible single-shot authenticated paid-work submission canary.

It consumes the private execution-candidate plan and operator hold decision
merged after PR #840. It proves that the prepared request, credential-source
metadata, supplied endpoint-preflight evidence, replay target, lease target,
one-shot policy, and live-canary contract remain mutually consistent.

It does not perform the live canary.

## Default state

The gate is disabled unless configuration explicitly sets:

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

Dry run validates all inputs in memory, inspects credential-file metadata
without opening the file, and derives the prerequisite ID. It writes nothing.

## Required private source artifacts

The command binds:

- the execution-candidate plan;
- the execution-candidate operator decision;
- the prepared paid-work request;
- the credential source path and its expected opaque path hash;
- private replay and one-shot lease state directories;
- supplied no-POST endpoint-preflight evidence;
- exact candidate, submission, work-order, payload, replay, credential, and
  endpoint identities.

All private source artifacts and state directories must remain outside the
repository.

## Execution-candidate hold

The execution-candidate decision must remain:

```text
hold_separate_operator_live_canary_required
```

The prerequisite gate does not weaken, consume, or replace that hold.

The prerequisite gate's own terminal decision is:

```text
hold_live_canary_not_executed
```

## Credential-source inspection boundary

The gate uses filesystem metadata only. It validates that the credential source:

- is a regular non-symlink file;
- is owner-private;
- has exact mode `0600`;
- has the expected owner UID;
- falls within configured size bounds;
- has a resolved path whose SHA-256 equals the source locator bound by the
  execution candidate;
- has the expected reference ID and scope.

The implementation contains no credential-provider dependency and does not call
a token reader. The credential source is not opened by this gate.

The plan records:

```text
opened=false
bytes_read=0
```

## Endpoint-preflight evidence

The gate validates a supplied non-secret receipt with marker:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_ENDPOINT_PREFLIGHT_RECEIPT_V1
```

The receipt must bind:

- the exact gateway origin and hostname;
- DNS resolution;
- TLS requirement and TLS verification for HTTPS;
- discovery path
  `/.well-known/void-agent-discovery.json`;
- discovery marker `VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1`;
- the canonical submission path;
- a credential-free `GET` probe returning `405`;
- no Authorization header;
- no request body;
- no submission `POST`;
- a nonce and canonical evidence SHA-256;
- a timestamp inside the configured preflight-age window.

The prerequisite gate itself performs no DNS, TLS, HTTP, or other network
operation. It validates the receipt only.

## Replay staging

The replay key must match the execution candidate and supplied operator
expectation. It must not appear in the supplied replay snapshot.

The replay state directory must already exist and be owner-private. The exact
reservation target must not exist.

The future strategy remains:

```text
exclusive_create
```

The prerequisite gate does not reserve or consume the replay key.

## One-shot lease staging

The lease ID must be unique in the supplied lease snapshot. The lease state
directory must already exist and be owner-private. The exact lease target must
not exist.

The live canary remains constrained to:

```text
maximum_attempt_count = 1
automatic_retry = false
lease_strategy = exclusive_create
```

The prerequisite gate writes no lease and records an attempt count of zero.

## Live-canary contract

The gate pins the existing harness:

```text
tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs
```

A later execution would still require both:

```text
--allow-live-submit
--confirm confirmVoidAgentMcpAuthenticatedSubmissionLiveCanaryV1
```

The prerequisite gate does not pass either authority to the harness and does
not invoke the harness.

A timeout, connection loss, or other ambiguous outcome remains:

```text
hold_manual_reconciliation_no_retry
```

## Apply mode

Apply requires the exact confirmation:

```text
reviewExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1
```

It also requires the exact derived prerequisite ID and an unexpired operator
confirmation window.

Apply writes only two owner-private artifacts outside the repository:

1. A live-canary prerequisite plan.
2. An operator decision equal to `hold_live_canary_not_executed`.

The output directory is mode `0700`; files are mode `0600`.

Apply does not open the credential, reserve replay state, write a lease, perform
endpoint preflight, construct Authorization, or send a request.

## Explicit authority boundary

The following remain false in every result and artifact:

```text
credential_source_open
credential_or_token_read
authorization_header_materialized
replay_key_reservation_or_consumption
one_shot_lease_write
network_listener_creation
runtime_mount
endpoint_preflight_network_access
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

Apply grants only local private prerequisite-plan and hold-decision writes.

## Repository boundary

This lane adds exactly:

```text
.github/workflows/external-agent-paid-work-operator-controlled-authenticated-submission-live-canary-prerequisite-v1.yml
docs/public-agent/external-agent-paid-work-operator-controlled-authenticated-submission-live-canary-prerequisite-v1.md
examples/external-agent-paid-work-operator-controlled-authenticated-submission-live-canary-prerequisite-v1.example.json
schemas/external-agent-paid-work-operator-controlled-authenticated-submission-live-canary-prerequisite-v1.schema.json
scripts/external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_prerequisite_v1.ts
scripts/prove_external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_prerequisite_v1.ts
```

It does not modify `src/index.ts`, MCP registration, receiver configuration,
systemd units, runtime configuration, or deployment state.

## Verification

The focused proof covers:

- disabled default;
- in-memory dry run;
- private apply;
- credential metadata inspection without credential open;
- endpoint-preflight evidence binding and freshness;
- replay-key snapshot collision;
- replay reservation target collision;
- lease-ID collision;
- credential permission rejection;
- operator confirmation rejection;
- live-authority rejection;
- tampered execution decision rejection;
- private artifact modes;
- unchanged credential bytes;
- absent replay and lease writes.

CI additionally runs:

- exact JSON parsing;
- a forbidden live-authority primitive scan;
- focused strict TypeScript no-new-errors comparison;
- the full repository build;
- `git diff --check`.

## Next boundary

Merging this prerequisite gate still does not authorize the live canary.

Any actual credential read, replay reservation, lease write, Authorization
construction, or authenticated `POST` remains a separate operator-controlled
lane with fresh private evidence and explicit one-shot confirmation.
