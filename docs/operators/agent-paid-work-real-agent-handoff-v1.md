# Agent Paid-Work Real-Agent Handoff V1

This operator lane prepares a private, machine-verifiable credential handoff for an external AI agent without applying the candidate registry or restarting the paid-work receiver.

## Prepare a handoff

```bash
npx tsx scripts/agent_paid_work_real_agent_handoff_v1.ts prepare \
  --registry /private/credential-registry-v1.json \
  --lifecycle-cli scripts/agent_paid_work_credential_lifecycle_cli_v1.ts \
  --tsx node_modules/.bin/tsx \
  --output-dir /private/handoffs/agent-alpha \
  --agent-id void.agent.alpha \
  --expires-at-utc 2027-07-27T00:00:00Z \
  --endpoint https://example.invalid:8443/__void/agents/paid-work/submissions/v1 \
  --order-module scripts/agent_paid_work_order_envelope_v1.ts \
  --request-fixture fixtures/agent-paid-work/agent-paid-work-submission-request-v1.example.json
```

The output contains:

```text
operator-handoff-manifest-v1.json
stage/
packet/
```

The `stage/` directory is created by the merged credential lifecycle CLI and contains the candidate registry, lifecycle plan, source-registry snapshot, and private generated credential.

The `packet/` directory contains the external agent’s private credential, onboarding manifest, fresh sample request, HTTPS submission client, verifier, README, and checksums.

## Verify a handoff

```bash
npx tsx scripts/agent_paid_work_real_agent_handoff_v1.ts verify \
  --handoff-dir /private/handoffs/agent-alpha
```

## Activation boundary

Preparation does not make the credential live.

The operator must separately:

1. Review the lifecycle plan and candidate registry.
2. Apply the staged plan through `agent_paid_work_credential_lifecycle_cli_v1.ts apply` using the exact source-registry SHA-256 and confirmation token.
3. Verify that the receiver still reports the prior registry before restart.
4. Restart only `void-agent-paid-work-submission-receiver-v1.service`.
5. Verify the new registry ID and credential count.
6. Transfer the private packet to the intended agent.
7. Require a single authenticated canary before broader use.

## Security properties

- The agent ID is supplied by the operator and validated.
- The endpoint must be HTTPS and must use the exact paid-work submission path.
- The existing lifecycle CLI generates and stages the credential.
- The credential registry and generated handoff artifacts remain owner-private.
- Tracked source scripts, fixtures, and tool executables are validated as readable regular files and are not incorrectly required to use secret-file permissions.
- The source registry is byte-for-byte unchanged during preparation.
- The credential is stored only in private mode-`0600` files.
- The raw credential is never printed or placed in process arguments.
- Packet state is explicitly `staged_not_live`.
- The handoff grants no payment, execution, dispatch, Work Credit, wallet, signer, or Buy VOID authority.
