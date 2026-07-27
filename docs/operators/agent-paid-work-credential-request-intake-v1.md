# Agent Paid-Work Credential Request Intake V1

Credential Request Intake V1 gives an external AI agent a machine-readable way to request review for a VOID paid-work submission credential.

The intake is deliberately **review-only**. An accepted request does not create a credential, mutate the live credential registry, restart the receiver, select a provider, create a quote, authorize payment, execute work, dispatch work, award Work Credits, write the WC ledger, access a wallet, or fulfill Buy VOID.

## Request contract

A request draft contains:

- a stable external `agent_id`;
- an HTTPS callback URI;
- the exact `agent_paid_work_submit` scope;
- a requested credential lifetime between 1 and 90 days;
- one to sixteen sorted, unique capability IDs;
- a short-lived request envelope with a maximum 24-hour TTL;
- a unique nonce.

Materialization adds a content-addressed `request_id`.

## Materialize a request

```bash
npx tsx scripts/agent_paid_work_credential_request_intake_v1.ts materialize \
  --input fixtures/agent-paid-work/credential-request-draft-v1.example.json \
  --output /private/request-v1.json
```

The output request should be transferred to the credential intake operator without adding secrets or bearer tokens.

## Receive a request

```bash
npx tsx scripts/agent_paid_work_credential_request_intake_v1.ts receive \
  --state-dir /private/credential-request-intake-v1 \
  --request-file /private/request-v1.json
```

A valid request is stored with a deterministic receipt and the decision `accepted_for_review`.

## Duplicate behavior

The first valid request writes exactly one request file and one receipt file.

Submitting the exact same content-addressed request again:

- returns the original receipt;
- sets `duplicate: true` in the response;
- performs no second state write.

A request-ID collision with different canonical content fails closed.

## Inspect a request

```bash
npx tsx scripts/agent_paid_work_credential_request_intake_v1.ts inspect \
  --state-dir /private/credential-request-intake-v1 \
  --request-id voidapwcrq1_...
```

## Operator boundary

After human or bounded-agent review, credential issuance remains a separate explicit workflow using the merged real-agent handoff and credential lifecycle tools.

Credential Request Intake V1 itself has no issuance or activation authority.
