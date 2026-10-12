# VOID Agent Paid Work Credential-to-WC-Account Binding Lifecycle V1

Marker: `VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_LIFECYCLE_V1`

This lane adds the missing identity binding between one active paid-work
credential and one destination Work Credit account.

The binding registry is deliberately separate from the credential registry.
Credential review and issuance may authorize an agent to submit work, while
this registry determines where a later independently verified WC award may be
addressed. Neither registry alone grants a WC ledger write or WC-to-VOID
settlement.

## Commands

- `inspect` reads sanitized credential and binding metadata.
- `stage-bind` creates a content-addressed staged mutation.
- `apply` atomically applies one exact binding after the explicit confirmation
  token `apply-agent-paid-work-credential-wc-account-binding-v1`.

## Guards

- the credential must exist, be active, and match the requested `agent_id`;
- one credential may have only one active destination account;
- one destination account may have only one active credential;
- staging binds the exact credential-registry and binding-registry prestates;
- apply rejects stale prestates, symlinks, conflicts, and missing confirmation;
- exact replay is idempotent and performs no second registry write;
- registry writes use atomic replacement and mode `0600`;
- raw bearer tokens are never read or emitted.

## Authority boundary

A successful binding means only:

1. this credential identifies this agent; and
2. a later independently authorized WC award may name this destination account.

It does not submit paid work, authorize payment, select a provider, dispatch
work, write the WC ledger, execute WC-to-VOID settlement, access a wallet or
signer, restart a service, deploy runtime code, or modify Buy VOID fulfillment.
