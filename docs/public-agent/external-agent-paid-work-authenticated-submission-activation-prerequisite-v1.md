# External-Agent Paid-Work Authenticated Submission Activation Prerequisite V1

Marker:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_V1
```

## Purpose

This lane adds the last **non-executing** gate before a future authenticated
paid-work submission lane.

It consumes the private request and handoff written by the merged prepare-only
adapter and verifies that the material is still suitable for a separate,
explicitly authorized live-execution workflow.

This gate does not perform that workflow.

## Default state

The gate is disabled unless its configuration contains:

```json
{
  "enabled": true
}
```

Even when enabled, the default command is a dry run:

```json
{
  "apply": false,
  "confirmation": ""
}
```

A dry run reads and validates the existing private handoff and request, derives
the replay key, and returns an activation plan in memory. It writes no files.

## Inputs

The command binds all of the following:

- the prepare-only handoff path;
- the prepared request path;
- the expected paid-work gateway origin;
- the canonical paid-work submission endpoint;
- the expected submission ID;
- the expected work-order ID;
- the expected payload SHA-256;
- an opaque credential-reference identifier;
- a SHA-256 of the credential source locator, without disclosing the locator;
- the expected credential scope;
- credential-registry identity and validity metadata, when registry mode is
  selected;
- a replay nonce and a supplied snapshot of already-known replay keys;
- a bounded activation expiry;
- explicit operator intent stating that live submission is **not** authorized.

Credential metadata is declarative. The gate never opens the referenced
credential source.

## Handoff integrity

The gate requires the merged prepare-only handoff contract:

```text
VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_V1
```

It verifies:

- the exact adapter ID;
- the exact `POST` method;
- the canonical endpoint
  `/__void/agents/paid-work/submissions/v1`;
- exact `application/json`;
- the payload digest header;
- request byte length;
- request-file binding;
- paid-work client validation status;
- the absence of a token file;
- the absence of Authorization;
- no authenticated submission;
- read-only MCP configuration;
- no submit tool registration;
- no listener;
- no callback route mount;
- all inherited authority fields remain false.

The request itself is then parsed using the existing
`tools/void-ai-agent-paid-work-client-v1.mjs` request reader.

## Freshness and replay

The gate checks:

- handoff age;
- allowed clock skew;
- work-order creation time;
- remaining work-order TTL;
- activation-plan TTL;
- activation expiry does not exceed work-order expiry;
- credential-registry metadata remains valid through the activation window;
- the derived replay key is absent from the supplied replay-key snapshot.

The replay key binds:

```text
base origin
endpoint path
submission ID
work-order ID
payload SHA-256
credential-reference ID
credential source-locator SHA-256
operator nonce
```

The gate does **not** reserve or consume the replay key. Atomic reservation
belongs to a separate future live-execution lane.

## Apply mode

Apply mode requires the exact confirmation:

```text
reviewExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1
```

Apply mode writes only two owner-private artifacts outside the repository:

1. An activation plan.
2. An operator decision that remains
   `hold_separate_live_execution_required`.

The output directory is mode `0700`; files are mode `0600`.

The activation plan contains credential-reference metadata, but no credential,
token, secret, filesystem locator, bearer value, or Authorization header.

## Explicit execution boundary

The following remain false in every result and artifact:

```text
credential_or_token_read
authorization_header_materialized
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

Apply mode grants only:

```text
local_private_plan_write
local_private_decision_write
```

These local writes do not authorize a live request.

## Repository boundary

This lane adds only:

```text
.github/workflows/external-agent-paid-work-authenticated-submission-activation-prerequisite-v1.yml
docs/public-agent/external-agent-paid-work-authenticated-submission-activation-prerequisite-v1.md
examples/external-agent-paid-work-authenticated-submission-activation-prerequisite-v1.example.json
schemas/external-agent-paid-work-authenticated-submission-activation-prerequisite-v1.schema.json
scripts/external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.ts
scripts/prove_external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.ts
```

It does not modify `src/index.ts`, MCP runtime registration, systemd units,
receiver configuration, credentials, wallets, ledgers, or deployment state.

## Next boundary

After this gate is merged and independently reviewed, a future lane may design
an atomic live-execution ceremony. That future lane must separately define:

- credential-source opening;
- exact Authorization construction;
- replay-key reservation;
- final current-state revalidation;
- one bounded network request;
- receipt verification;
- immediate credential and replay-state cleanup;
- fail-closed recovery.

None of those authorities are included here.
