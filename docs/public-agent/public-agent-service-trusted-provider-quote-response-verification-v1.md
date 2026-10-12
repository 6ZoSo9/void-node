# Public Agent Service Trusted Provider Quote-Response Verification V1

## Purpose

This contract composes two independently verified evidence layers:

1. an operator-signed provider trust-registry snapshot rooted in a separately pinned trust-root ID; and
2. a provider-signed quote-response authentication envelope.

The composition resolves the exact active provider binding from the verified
snapshot at the authentication creation time. It then requires the complete
resolved binding to be canonically identical to the binding used to verify the
provider quote response.

This closes the gap where a provider signature could be cryptographically valid
against a caller-supplied binding that was not the binding authorized by the
trusted registry snapshot.

## Inputs

The materializer accepts one exact object containing:

- `expected_trust_root_id`;
- `provider_trust_registry_snapshot_input`;
- `provider_quote_response_authentication_input`; and
- the catalog object used by the existing quote-response verifier.

The committed example is an `example_fixture`. Its trust root, snapshot,
provider binding, and provider authentication are cryptographically coherent,
but the resulting packet remains `example_only`.

## Live verification

A live result requires all of the following:

- an `operator_pinned_trust_root`;
- an `operator_approved_snapshot`;
- an `operator_approved_snapshot` provider binding;
- a snapshot signature that verifies under the pinned root;
- an external provider quote response;
- a provider authentication signature that verifies under its claimed binding;
- resolution of exactly one active provider binding at the authentication
  creation time; and
- canonical equality between the resolved binding and the authentication
  binding.

The output status is
`trusted_provider_quote_response_verified`. That status means only that the
provider response is bound to trusted registry material.

## Downstream boundary

A green packet can be eligible for a later, separate requester authentication
and acceptance process. It does not authenticate the requester, does not
consume the provider authentication ID, and does not accept a quote.

The packet explicitly requires:

- separate requester authentication;
- replay protection;
- provider authentication ID consumption; and
- single-active-acceptance enforcement per quote.

## Authority boundary

This adapter has no payment authority, no work dispatch authority, and no Work
Credit authority.

It also grants no authority for provider selection, trust-root creation or
rotation, provider approval, key rotation or revocation, quote publication,
quote acceptance, payment-rail resolution, payment-destination resolution,
payment authorization, payment execution, work execution authorization,
WC-to-VOID settlement, wallet or signer access, transaction broadcast, HTTP
submission, credential changes, deployment, service restart, runtime mutation,
or money movement.

## Verification

Run:

```bash
npx tsx scripts/prove_public_agent_service_trusted_provider_quote_response_verification_v1.ts
```

Expected terminal marker:

```text
VOID_PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_V1_EXACT_GREEN
```

The proof verifies the committed non-live fixture, generates an ephemeral live
trust chain, and demonstrates that an authentication binding may be valid on
its own while still being rejected because it is not the exact binding resolved
from the signed snapshot.
