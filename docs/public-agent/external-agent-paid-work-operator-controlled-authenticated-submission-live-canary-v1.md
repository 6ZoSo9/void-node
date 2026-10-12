# External Agent Paid-Work Operator-Controlled Authenticated Submission Live Canary V1

## Purpose

This lane implements the disabled-by-default orchestration core for one authenticated paid-work submission canary. It consumes the private prerequisite plan and `hold_live_canary_not_executed` decision produced by the merged prerequisite gate, validates every binding again, and exposes narrow injected interfaces for the only operations that can carry live authority:

- atomically reserve the replay key and create the one-shot lease;
- open the credential exactly once without exposing secret material to the runner;
- perform one authenticated POST with no redirect and no retry;
- finalize replay and lease state with a terminal outcome;
- close and zeroize the credential session.

The repository implementation does not provide live adapters for those interfaces. Its default dependencies fail closed. CI uses temporary fakes and cannot read a real credential or contact an endpoint.

## Double gate

A live attempt requires all of the following:

1. `config.enabled=true`;
2. `config.live_execution_enabled=true`;
3. `command.execute=true`;
4. `command.allow_live_submit=true`;
5. the exact confirmation `confirmVoidAgentMcpAuthenticatedSubmissionLiveCanaryV1`;
6. an unexpired confirmation and execution window;
7. the exact derived `live_canary_id` supplied back by the operator;
8. a private, intact prerequisite plan and hold decision;
9. unchanged request, credential metadata, replay target, and lease target.

Validation-only mode requires `execute=false`, an empty confirmation, and `allow_live_submit=false`. It invokes none of the live dependency interfaces and writes nothing.

## Input bindings

The runner revalidates:

- prerequisite plan and operator-decision SHA-256 bindings;
- prerequisite, execution-candidate, submission, work-order, replay, lease, and credential-reference identities;
- HTTPS or loopback origin and the fixed paid-work submission path;
- request bytes, request SHA-256, submission ID, and work-order ID through the existing paid-work request reader;
- credential path hash, UID, mode `0600`, size, regular-file status, and non-symlink status without reading the file;
- private replay and lease directories and absent exclusive-create targets;
- one attempt, no automatic retry, manual reconciliation after an ambiguous outcome;
- receiver response status, route header, authentication, admission decision, receipt identities, and all-false business authority.

## Live dependency boundary

`ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryDependenciesV1` is intentionally injected. The runner never receives token bytes. `openCredentialOnce` returns an opaque handle ID and metadata; `submitOnce` accepts that handle ID. A future private adapter may own the secret mapping, but the core runner cannot inspect it.

`beginAttempt` must transactionally establish both the replay reservation and one-shot lease by exclusive create. The runner verifies that both private state files exist after the receipt is returned. `finalizeAttempt` must place both state records in a terminal state. A failure to finalize converts the result to `held_ambiguous` and forbids retry.

## Outcomes

The terminal receipt is owner-private and sanitized:

- `accepted_new`: HTTP 202 and a bound `accepted_for_review` receipt;
- `accepted_duplicate`: supported by the response contract, although the canary command requires `expect_new=true`;
- `rejected_conflicting_duplicate`: HTTP 409;
- `rejected_unauthorized`: HTTP 401;
- `rejected_http`: another definite response or invalid response contract;
- `held_pre_submit_failure`: failure before the transport is invoked;
- `held_ambiguous_manual_reconciliation`: transport or state-finalization uncertainty after the attempt begins.

There is no retry path. The receipt records at most one submission attempt and keeps payment, work execution, WC, VOID settlement, wallet, signing, broadcast, runtime mutation, and deployment authority false.

## Repository proof

The focused proof covers:

- disabled behavior;
- validation-only behavior with zero live-dependency calls;
- one synthetic accepted-new submission;
- conflicting duplicate rejection;
- ambiguous timeout hold with no retry;
- credential-provider failure before submit;
- unchanged synthetic credential-file bytes;
- no credential-path disclosure in the terminal receipt;
- replay collision rejection;
- exact confirmation enforcement;
- independent live-execution configuration enforcement.

The synthetic credential, state coordinator, and transport are temporary fakes. The proof performs no network access and reads no real credential.

## Operational boundary

Merging this lane does not execute a live canary. A genuine attempt still requires a separately reviewed private adapter and an exact operator-controlled run. That run must preserve the one-shot state and sanitized evidence contracts defined here.
