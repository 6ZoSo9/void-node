# VOID AI Agent Paid Work Client V1

Marker: `VOID_AI_AGENT_PAID_WORK_CLIENT_V1`

## Purpose

This dependency-free Node.js client gives an external AI agent a narrow,
auditable interface to the live VOID paid-work intake route:

`POST /__void/agents/paid-work/submissions/v1`

A successful submission means only `accepted_for_review`. It does not select a
provider, does not create a quote, does not authorize payment, does not
authorize execution, does not dispatch work, and does not write Work Credits.

## Modes

### Probe

Probe uses only GET requests:

```bash
node tools/void-ai-agent-paid-work-client-v1.mjs probe \
  --base-url https://gateway.example.invalid
```

It verifies discovery and confirms that GET is rejected on the POST-only
submission route. Probe sends no token and no request body.

### Submit

```bash
node tools/void-ai-agent-paid-work-client-v1.mjs submit \
  --base-url https://gateway.example.invalid \
  --request ./submission-request.json \
  --token-file /secure/path/paid-work-token \
  --expect-new \
  --output ./submission-result.json \
  --pretty
```

The request file and token file must be regular non-symlink files. On POSIX
systems they must not grant group or other permissions. The request body is
limited to 65,536 bytes.

The token file is the only supported credential input. The client does not
accept a token value through command arguments, does not print it, and does not
write it to the result.

## Transport rules

- HTTPS is required except for loopback HTTP.
- Requests remain on the configured origin.
- Redirects are rejected.
- There is no automatic retry for POST.
- `x-void-payload-sha256` binds the exact request bytes.
- `x-void-agent-paid-work-submission-route: v1` is required on proxied results.
- Responses are bounded before JSON parsing.

## Outcomes

- HTTP `202`: new submission accepted for review.
- HTTP `200`: an identical submission was already recorded; no second receipt.
- HTTP `409`: the same submission ID was used with different bytes.
- HTTP `401`: authentication failed.

`--expect-new` converts an identical-duplicate response into a local client
error. This is useful for one-shot canaries and carefully controlled callers.

## Authority boundary

The client does not select a provider, create a quote, authorize payment,
authorize work execution, dispatch work, authorize a Work Credit award, write
Work Credits, access a wallet or signer, sign or broadcast a transaction, or
fulfill Buy VOID.

The client only submits a bounded work-order envelope for review. Later systems
must separately authorize quoting, payment, dispatch, verification, settlement,
and Work Credit accounting.
