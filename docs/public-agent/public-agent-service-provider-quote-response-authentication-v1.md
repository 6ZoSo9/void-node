# VOID Public Agent Service Provider Quote Response Authentication V1

Marker:
`VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1`

Output marker:
`VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_PACKET_V1`

## Purpose

This lane verifies cryptographic authorship of one exact provider quote-response
packet. It binds an Ed25519 signature to the response, quote, handoff, work
order, submission, request, receipt, provider identity claim, catalog
fingerprint, provider key binding, nonce, and time window.

## Selected scheme

V1 uses:

- Ed25519 signatures through Node's built-in cryptography;
- a key ID equal to `ed25519:` plus SHA-256 of DER-encoded SPKI;
- canonical JSON;
- the signature domain
  `VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1`;
- explicit creation and expiry timestamps;
- an authentication nonce;
- a content-derived provider key binding ID;
- a content-derived authentication ID.

These primitives match existing VOID signing conventions without coupling
provider authentication to P2P policy authority, validator authority, wallet
signers, or Ethereum transaction signing.

## Trust-anchor boundary

The provider key binding is a caller-supplied trust anchor. The adapter verifies
that:

- its public key is Ed25519;
- its key ID matches the SPKI public key;
- its binding ID matches canonical content;
- its scope is exactly `provider_quote_response_authenticate`;
- its provider ID matches the quote-response provider claim;
- the authentication occurs inside the binding validity window;
- the binding was not revoked before authentication.

The adapter does not create a provider registry, discover keys, approve a
provider, rotate keys, revoke keys, or write identity state.

## Signature binding

The signed body includes:

- `response_id`
- `quote_id`
- `handoff_id`
- `work_order_id`
- `submission_id`
- `request_sha256`
- `receipt_id`
- `provider_id`
- `catalog_fingerprint_sha256`
- `provider_key_binding_id`
- `authentication_nonce`
- `created_at_utc`
- `expires_at_utc`
- signature scheme, domain, and canonicalization markers

The signature preimage is the UTF-8 domain string, one newline, and canonical
JSON for that body.

## Fixture and external truth

The checked-in example is a cryptographically valid example fixture:

- `provider_authentication_verified=true`
- `status=example_only`
- `eligible_for_acceptance=false`

The example fixture remains ineligible because its provider key binding is not
a live approved trust record.

An externally sourced response can produce:

- `status=provider_authenticated_for_acceptance`
- `provider_authentication_verified=true`
- `eligible_for_acceptance=true`

only when the response is external, the signature verifies, and the caller
supplies an `operator_approved_snapshot` key binding.

Eligibility means only that a separate acceptance lane may evaluate the quote.
It does not accept the quote.

## Replay boundary

This adapter is stateless. It requires:

- an authentication nonce;
- a content-derived authentication ID;
- `authentication_replay_protection_required=true`;
- `authentication_id_consumption_required=true`;
- `single_active_acceptance_per_quote_required=true`.

The later acceptance consumer must atomically consume authentication and
acceptance IDs. This lane does not write replay state.

## Authority boundary

This lane does not:

- select a provider;
- create or write a provider key binding;
- create a provider registry;
- generate or submit a quote;
- accept a quote;
- authorize or execute payment;
- authorize or dispatch work;
- access a wallet;
- sign production data;
- broadcast a transaction;
- submit HTTP;
- issue or change requester credentials;
- write Work Credits;
- mutate runtime;
- move money.

The CLI is verify-only with respect to signatures. It materializes or verifies
packets from already signed evidence.

## CLI

Materialize:

```bash
npx tsx \
  scripts/public_agent_service_provider_quote_response_authentication_v1.ts \
  materialize \
  examples/public-agent-service-provider-quote-response-authentication-v1.example.json \
  /tmp/provider-quote-response-authentication-v1.json
```

Verify:

```bash
npx tsx \
  scripts/public_agent_service_provider_quote_response_authentication_v1.ts \
  verify \
  examples/public-agent-service-provider-quote-response-authentication-v1.example.json \
  /tmp/provider-quote-response-authentication-v1.json
```

The output file is created exclusively with mode `0600`.

## Verification

```bash
npx tsx \
  scripts/prove_public_agent_service_provider_quote_response_authentication_v1.ts
```

The proof covers the static fixture, SPKI key derivation, binding ID,
authentication ID, signature verification, exact response lineage, canonical
key-order stability, signature and key tampering, revocation, expiry, packet
tampering, and an external ephemeral-key path that becomes eligible for a
separate acceptance evaluation. The ephemeral proof signing key is generated
only in memory and is not a production signer.
