# VOID Agent Paid Work Credential Registry V1

Marker: `VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1`

## Purpose

The registry replaces a single shared paid-work bearer secret with bounded,
attributable credentials for independent external AI agents.

The registry is an operator-controlled mode-0600 JSON file. It contains
SHA-256 token digests only. Raw bearer tokens are issued and delivered through
a separate private channel and never appear in the registry, repository,
receipt, command arguments, stdout, or logs.

## Credential contract

Each credential contains:

- deterministic `voidapwc1_` credential ID;
- bounded `agent_id`;
- `token_sha256`;
- exactly one scope: `agent_paid_work_submit`;
- `issued_at_utc`;
- required expiration through `expires_at_utc`;
- optional revocation through nullable `revoked_at_utc`.

The registry has a deterministic `voidapwcr1_` ID and a maximum of 1,024
credentials. Duplicate credential IDs and duplicate token digests are
rejected.

## Receiver selection

The receiver reads the registry only when
`VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE` is explicitly configured.

When the variable is absent, the existing
`VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE` path remains the single-token compatibility
fallback. When the registry is configured, registry authentication takes
precedence and the fallback token file is not read.

Unknown, malformed, future, expired, revoked, and out-of-scope credentials are
externally indistinguishable: all return `401 unauthorized` and write no
receipt.

## Receipt attribution

A new registry-authenticated intake receipt records:

- authentication mode `credential_registry`;
- registry ID;
- credential ID;
- agent ID;
- scope `agent_paid_work_submit`.

This attribution proves which bounded credential submitted the work order. It
does not select a provider, create a quote, authorize payment, authorize
execution, dispatch work, authorize or write Work Credits, access a wallet or
signer, broadcast a transaction, or fulfill Buy VOID.

## Source-only boundary

This lane adds and proves source only. It does not:

- create or issue a live credential;
- read the live fallback credential;
- install a registry file;
- change the live receiver environment;
- restart or deploy any service;
- submit a live work order;
- write a live receipt;
- mutate payment, Work Credit, wallet, or Buy VOID state.
