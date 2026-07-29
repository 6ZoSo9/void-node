# Fresh canary credential live stage commands V1

This module supplies the concrete credential lifecycle commands required by the hash-pinned live transport adapters.

## Stage authority

- **Request — Nimo:** Generates one submit-only raw credential token, stores it only in Nimo private mode-0600 storage, and returns only its SHA-256 plus a SHA-256 of the private path.
- **Review — Precision:** Approves the exact credential, agent, scope, and destination WC account once.
- **Activate — Precision:** Activates the reviewed submit-only credential once.
- **Bind — Precision:** Atomically creates one active credential-to-WC-account binding.
- **Duplicate probe — Precision:** Verifies the existing binding without creating another.

All stages are idempotent. Each stage writes private attempt state before mutation. `recover` reconstructs the exact sanitized stage result from persisted state without repeating a mutation.

## Canonical registries

The command preserves and requires:

- `VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1`
- `VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1`

The credential record includes both `token_hash` and `credential_token_hash` for compatibility, but never the raw token.

## Build boundary

The proof uses temporary registries, mock host identities, and a mock Nimo request transport. Build and CI do not create a live credential, modify live registries, post an authenticated submission, prepare the live canary, issue a ticket, or write WC.
