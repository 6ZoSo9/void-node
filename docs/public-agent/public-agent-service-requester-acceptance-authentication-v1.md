# VOID Public Agent Service Requester Acceptance Authentication V1

Marker:
`VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1`

Output marker:
`VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1`

## Purpose

This lane authenticates the requester’s intent to proceed from one exact
provider-authenticated quote handoff toward acceptance materialization.

The signature binds the requester, provider-authenticated handoff, provider
authentication ID, quote lineage, work order, acceptance nonce, requester key
binding, catalog fingerprint, authentication nonce, and validity window.

## Requester key scope

The requester key binding scope is exactly:

`agent_paid_work_accept`

The existing paid-work submission credential supports exactly
`agent_paid_work_submit`. It cannot be reused for requester acceptance
authentication.

The requester key binding is an auditable public-key snapshot. This lane does
not issue a credential, create a private key, mutate a requester registry, or
grant standing authority.

## Fixture and external states

The checked-in cryptographic fixture produces:

- `status=example_only`
- `requester_authentication_verified=true`
- `eligible_for_acceptance_materialization=false`
- `acceptance_replay_consumer_verified=false`

A complete external proof with external provider evidence and an ephemeral
requester acceptance key produces:

- `status=requester_authenticated_for_acceptance`
- `requester_authentication_verified=true`
- `eligible_for_acceptance_materialization=true`
- `acceptance_replay_consumer_verified=false`

Eligibility is a verification result, not acceptance authority.

## Acceptance boundary

This lane does not create or materialize an acceptance envelope.

It does not create an `acceptance_id`, accept a quote, reserve funds, debit
funds, authorize payment, authorize execution, or dispatch work.

A later acceptance consumer must:

1. materialize the exact acceptance envelope;
2. authenticate the same requester and provider lineage;
3. atomically consume the requester authentication ID, provider authentication
   ID, and acceptance ID;
4. reject replay or conflict;
5. enforce one active acceptance per quote.

## Replay boundary

The packet requires:

- requester-authentication replay protection;
- requester-authentication ID consumption;
- provider-authentication ID consumption;
- acceptance replay protection;
- acceptance ID consumption;
- one active acceptance per quote.

This lane does not write requester, provider, or acceptance replay state and
does not claim that an acceptance-specific replay consumer exists.

## Cryptography

- Ed25519 through Node’s built-in cryptography;
- SPKI DER SHA-256 key identity;
- signature scheme `ed25519-spki-sha256-v1`;
- signature domain `VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1`;
- canonicalization `void-canonical-json-v1`;
- deterministic requester key-binding and authentication IDs.

The production adapter is verify-only. The proof generates ephemeral provider
and requester keys in memory and does not include any production private key.

## Authority boundary

This lane does not:

- create or accept an acceptance;
- issue or mutate credentials;
- create or mutate requester or provider key registries;
- write replay or consumption state;
- select a provider;
- authorize or execute payment;
- authorize or dispatch work;
- access a wallet or production signer;
- submit HTTP;
- broadcast a transaction;
- write Work Credits;
- mutate runtime;
- move money.

## CLI

Materialize:

```bash
npx tsx   scripts/public_agent_service_requester_acceptance_authentication_v1.ts   materialize   examples/public-agent-service-requester-acceptance-authentication-v1.example.json   /tmp/requester-acceptance-authentication-v1.json
```

Verify:

```bash
npx tsx   scripts/public_agent_service_requester_acceptance_authentication_v1.ts   verify   examples/public-agent-service-requester-acceptance-authentication-v1.example.json   /tmp/requester-acceptance-authentication-v1.json
```

## Verification

```bash
npx tsx   scripts/prove_public_agent_service_requester_acceptance_authentication_v1.ts
```

The proof covers deterministic identities, key-order stability, canonical PEM,
signature verification, requester and handoff binding, dedicated-scope
enforcement, revocation, expiry, packet tampering, fixture blocking, and a
complete ephemeral external provider-plus-requester authentication path.
