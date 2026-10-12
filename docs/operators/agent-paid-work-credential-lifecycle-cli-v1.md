# Agent Paid-Work Credential Lifecycle CLI V1

The lifecycle CLI stages and applies per-agent credential registry mutations without placing raw credentials in the registry, terminal output, or process arguments.

## Commands

```bash
tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts inspect \
  --registry /path/to/credential-registry-v1.json
```

```bash
tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts stage-issue \
  --registry /path/to/credential-registry-v1.json \
  --stage-dir /private/stage/issue-agent-alpha \
  --agent-id void.agent.alpha \
  --expires-at-utc 2027-07-27T00:00:00Z
```

```bash
tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts stage-rotate \
  --registry /path/to/credential-registry-v1.json \
  --stage-dir /private/stage/rotate-agent-alpha \
  --credential-id voidapwc1_<64-lowercase-hex> \
  --expires-at-utc 2027-07-27T00:00:00Z
```

```bash
tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts stage-revoke \
  --registry /path/to/credential-registry-v1.json \
  --stage-dir /private/stage/revoke-agent-alpha \
  --credential-id voidapwc1_<64-lowercase-hex>
```

Apply a staged issue or rotation:

```bash
tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts apply \
  --registry /path/to/credential-registry-v1.json \
  --stage-dir /private/stage/issue-agent-alpha \
  --token-dir /private/credentials \
  --expected-source-sha256 <current-registry-file-sha256> \
  --confirm apply-agent-paid-work-credential-lifecycle-v1
```

Apply a staged revocation:

```bash
tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts apply \
  --registry /path/to/credential-registry-v1.json \
  --stage-dir /private/stage/revoke-agent-alpha \
  --token-dir - \
  --expected-source-sha256 <current-registry-file-sha256> \
  --confirm apply-agent-paid-work-credential-lifecycle-v1
```

## Safety model

- Staging never mutates the source registry.
- Issue and rotation generate a 32-byte base64url credential and write it only to a mode-`0600` stage file.
- The registry stores only the SHA-256 digest.
- Apply requires the exact current registry file SHA-256, preventing stale or repeated mutations.
- The original registry is copied into the private stage directory before replacement.
- The candidate registry is parsed and its canonical `registry_id` is verified before and after replacement.
- The token is installed before the registry. A crash at that boundary can leave an unauthorized orphan token, but cannot authorize a missing token.
- An apply failure restores the original registry and removes a newly installed token.
- Raw credentials are never printed.
- The receiver is not restarted by this CLI.

## Receiver activation boundary

`void-agent-paid-work-submission-receiver-v1` reads and parses the credential registry once during process startup. It does not watch the file and does not implement a reload signal.

Every successful apply therefore reports:

```text
receiver_restart_required=true
live_effect=false
```

The updated registry becomes live only after a separately authorized receiver restart and post-restart health verification.

## Rotation semantics

Rotation:

1. Sets `revoked_at_utc` on the selected credential.
2. Preserves its canonical `credential_id`, because revocation is excluded from the credential-ID draft.
3. Generates and appends a new credential for the same `agent_id`.
4. Re-materializes the complete registry and therefore produces a new `registry_id`.

## Authority boundary

This CLI does not select providers, create quotes, authorize payments, execute or dispatch work, write Work Credits, access wallets or signers, or fulfill Buy VOID.
