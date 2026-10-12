# Public First Official Release Rehearsal v1 — Threat Model

The wall is designed to fail closed before the first official release.

## Protected boundaries

- Release assets are bound by SHA-256 and byte length.
- The release is built twice with the same source timestamp and must produce identical `SHA256SUMS`.
- The expected official tag is bound to one source commit but is never created.
- Stage receipts form an ordered SHA-256 chain.
- Qualification requires all eight targets with unique run IDs.
- Approval is separated from the rehearsal runners.
- Freeze, revocation, rollback, and recovery are exercised in local rehearsal state only.
- Tampered packets, assets, summaries, or receipt order are rejected.
- Tracked Python bytecode is forbidden, and compilation caches are redirected outside the repository.
- GitHub remotes are normalized to non-interactive SSH to prevent credential prompts and accidental HTTPS password entry.

## Explicit non-goals

This wall does not publish a release, create or move a tag, upload assets, change a public stable channel, deploy software, restart a service, generate keys, mutate wallets or Work Credit ledgers, fulfill Buy VOID, admit validators, move treasury assets, or transfer authority.
