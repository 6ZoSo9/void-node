# External Agent Paid Work Submission Prerequisite Creation Gate V1

Marker: `VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_V1`

## Purpose

This lane closes the last bounded gap before an authenticated external-agent
paid-work submission. It combines three already established contracts without
creating a parallel submission API:

1. canonical DataNet field-object creation in an isolated operator staging root;
2. the trusted-requester acceptance-persistence HTTP route bootstrap callsite;
3. deterministic Agent Paid Work submission admission and request preparation.

The gate **never sends the submission**. It does not accept a bearer token,
does not read a credential registry, and does not import the live submission
receiver. Its final prepared artifact contains the exact request body and
`X-VOID-Payload-SHA256` value needed by the existing receiver, while explicitly
reporting `authorization_header_present=false`, `token_read=false`, and
`request_sent=false`.

## Two-phase flow

### Phase 1: `create_prerequisites`

Applied execution requires the exact confirmation:

```text
createExternalAgentPaidWorkSubmissionPrerequisitesV1
```

The gate executes the existing tracked tool:

```text
tools/datanet-field-object-create-v1.mjs
```

inside a new, private operation directory below a caller-selected staging root
that must remain outside the repository. It verifies the object bytes, SHA-256,
receipt, public URL, and path containment. It then invokes the existing
acceptance-persistence bootstrap callsite against a caller-supplied Express app
provider. The bootstrap stack owns route registration; this gate creates no
listener and adds no `src/index.ts` integration.

The result is `prerequisites_created` and includes the validated DataNet
receipt. A caller may then construct a work order that references exactly the
receipt URL, object ID, or public path.

### Phase 2: `prepare_submission`

This phase accepts the previously validated DataNet receipt, one work order,
one admission policy, one explicit UTC evaluation timestamp, and one submission
ID. It requires:

- capability `datanet.fetch_verify`;
- an input reference equal to the receipt URL, object ID, or public path;
- a deterministic admission decision of `accepted_for_review`;
- successful idempotent callback route mounting.

The result is `submission_prepared`. It contains the existing receiver request
shape:

```json
{
  "marker": "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  "version": 1,
  "submission_id": "...",
  "work_order": {}
}
```

and the fixed receiver path:

```text
/__void/agents/paid-work/submissions/v1
```

No HTTP client primitive exists in this module.

## Dry run

When `apply=false`, confirmation must be empty. The gate validates all supplied
contracts and can produce the prepared request artifact for an existing DataNet
receipt, but it invokes neither the DataNet creator nor the callback bootstrap.
All authority fields remain false.

## Callback boundary

The callback prerequisite reuses:

```text
src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts
```

The gate forwards the Express app provider, trusted-context provider, caller
environment, and exact confirmations published by that module. A successful
applied result must be `mounted` or `already_mounted`. The upstream stack
retains every independent enablement and persistence gate.

The route remains operator-local and creates no network listener. It is not
substituted for the external HTTPS callback URI required by the work-order
contract.

## Failure and retry behavior

The DataNet object is created before callback mounting. If later callback
mounting fails, the private DataNet evidence remains available for review and a
bounded retry. The gate does not delete evidence or attempt cross-resource
rollback.

## Authority boundary

The lane grants no authority for:

- token or credential access;
- authorization-header creation;
- authenticated submission POST;
- external HTTP submission;
- network listener creation;
- provider selection or quote creation;
- payment authorization or execution;
- work execution or dispatch;
- Work Credit writes or settlement;
- wallet or signer access;
- transaction broadcast;
- service restart or deployment;
- money movement.
