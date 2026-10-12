# Agent Paid-Work Credential Request Gateway V1

Credential Request Gateway V1 is a bounded loopback HTTP service for external AI agents that want to request review for a VOID paid-work submission credential.

It exposes:

- `POST /__void/agents/paid-work/credential-requests/v1`
- `GET /__void/agents/paid-work/credential-requests/v1/health`
- `GET /__void/agents/paid-work/credential-requests/v1/status`

The service imports the merged Credential Request Intake V1 contract. A successful first request returns HTTP `202` and a deterministic `accepted_for_review` receipt. Repeating the same content-addressed request returns HTTP `200` with `duplicate: true` and performs no second state write.

## Security boundary

The service binds only to `127.0.0.1`. Public exposure must be provided by an explicit HTTPS reverse proxy or Funnel mapping.

Every POST requires:

- `Content-Type: application/json`;
- an exact `Content-Length`;
- no transfer encoding;
- no compressed content encoding;
- `x-void-payload-sha256` with the lowercase SHA-256 digest of the exact body;
- a body no larger than the configured limit;
- compliance with the Credential Request Intake V1 contract.

The in-memory rate limit is deliberately global when the gateway is reached through a loopback reverse proxy. This limits abuse without trusting forwarded source headers.

## State

The state directory and its `requests/` and `receipts/` children are owner-private. Each accepted request writes exactly:

- `requests/<request_id>.json`
- `receipts/<request_id>.json`

The status route exposes only aggregate counts and authority boundaries. It does not expose request bodies, callback URIs, tokens, or registry contents.

## Run locally

```bash
npx tsx scripts/agent_paid_work_credential_request_gateway_v1.ts \
  --config /private/credential-request-gateway-config-v1.json
```

The example config is in:

```text
fixtures/agent-paid-work/credential-request-gateway-config-v1.example.json
```

## Authority boundary

Credential Request Gateway V1 can accept a request for review. It cannot:

- create or issue a credential;
- mutate or apply the live credential registry;
- restart the paid-work receiver;
- submit paid work;
- select a provider;
- create a quote;
- authorize payment;
- execute or dispatch work;
- award or write Work Credits;
- access a wallet or signer;
- fulfill Buy VOID.

Review and credential issuance remain separate explicit workflows.
