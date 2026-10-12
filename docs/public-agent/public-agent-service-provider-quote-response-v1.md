# VOID Public Agent Service Provider Quote Response V1

Marker: `VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_V1`

Output marker:
`VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_PACKET_V1`

## Purpose

This adapter binds one existing provider-created quote envelope to one exact
Public Agent Service Submission Quote Handoff packet.

It gives requesters and later authentication lanes a deterministic response
packet containing the quote, provider identity claim, commercial terms, exact
handoff lineage, and a content-derived `voidawqr1_` response ID.

## Provider identity truth boundary

The existing quote envelope states that `provider_id` is declarative and that
authorship must be verified by a separately signed transport or later
signed-envelope lane.

The repository's existing Agent Paid Work Credential Registry grants exactly
the `agent_paid_work_submit` scope. It authenticates requester submissions; it
does not authenticate a provider quote response.

For that reason, provider authentication remains unverified in V1:

- `mode=unverified_declarative_provider`
- `provider_authentication_verified=false`
- `separately_authenticated_transport_required=true`

The response packet is not eligible for acceptance until a separate
provider-authentication lane verifies authorship and binds that authentication
to the exact provider ID, quote ID, response ID, and handoff ID.

## Input

The input contains:

- one existing quote-handoff input;
- one complete existing Agent Paid Work Quote Envelope V1;
- one response nonce.

The adapter reconstructs the quote-handoff packet and exact work order, then
verifies:

- quote ID canonical integrity;
- exact work-order and handoff binding;
- capability and quote-asset equality;
- total at or below the requester maximum;
- runtime and output-byte ceilings;
- exact output labels;
- false external-side-effect, wallet, and money-movement locks;
- quote and handoff time windows;
- separate acceptance;
- provider authentication still required;
- quote grants no execution authority;
- quote is not a payment instruction.

## Status

The checked-in fixture produces:

`status=example_only`

An externally sourced quote against a handoff with
`status=ready_for_provider_quote` produces:

`status=provider_authentication_required`

It does not produce an authenticated or acceptance-eligible result.

## Authority boundary

Materializing or verifying a response packet does not:

- select or authenticate a provider;
- generate or submit the provider's quote;
- accept a quote;
- authorize or execute payment;
- authorize or dispatch work;
- access a wallet or signer;
- sign or broadcast a transaction;
- submit HTTP;
- issue or change credentials;
- write Work Credits;
- mutate runtime;
- move money.

## CLI

Materialize:

```bash
npx tsx scripts/public_agent_service_provider_quote_response_v1.ts \
  materialize \
  examples/public-agent-service-provider-quote-response-v1.example.json \
  /tmp/public-agent-service-provider-quote-response-v1.json
```

Verify:

```bash
npx tsx scripts/public_agent_service_provider_quote_response_v1.ts \
  verify \
  examples/public-agent-service-provider-quote-response-v1.example.json \
  /tmp/public-agent-service-provider-quote-response-v1.json
```

The output file is created exclusively with mode `0600`.

## Verification

```bash
npx tsx scripts/prove_public_agent_service_provider_quote_response_v1.ts
```

The proof covers exact handoff, order, submission, request, receipt, quote, and
provider-claim bindings; canonical quote and response IDs; input key-order
stability; nonce sensitivity; quote ceilings; time windows; mismatch and
tamper rejection; explicit provider-authentication failure; acceptance
ineligibility; and the existing quote, credential-registry, and acceptance
authority boundaries.
