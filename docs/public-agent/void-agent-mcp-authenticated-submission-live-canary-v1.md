# VOID Agent MCP authenticated submission live canary V1

This lane supplies the missing operator harness between the merged bounded MCP bridge and an already-created, already-reviewed, active `submit` credential. It proves one MCP client can prepare a deterministic request and perform at most one authenticated submission to the isolated AI-agent gateway.

It does **not** request, review, activate, rotate, or bind a credential. Those operations remain in the separate fresh-canary credential lane. The canary consumes only an owner-private token file supplied by the operator after that lane is exact-green.

The `requester_agent_id` in the canary input must match the agent identity approved by that credential lane. The harness cannot repair an identity mismatch after submission.

## Result boundary

A successful live result means only:

```text
accepted_for_review=true
```

It does not mean payment, provider selection, quote acceptance, work dispatch, work execution, Work Credit issuance, WC ledger mutation, WC-to-VOID settlement, wallet or signer access, transaction broadcast, runtime mutation, deployment, or Buy VOID fulfillment occurred.

The completed state and CLI report:

```text
private_temp_cleanup_completed=true|false
completion_state_persisted=true|false
completion_receipt_published=true|false
```

`private_temp_cleanup_completed=false` does **not** revoke or rewrite a fully validated remote `accepted_for_review` result. It means the bridge could not prove deletion of its local private submission-temp directory after that remote result was already known. The canary preserves that cleanup truth without exposing the private temp path or token-file path, does not retry the submission, and does not claim the retained local artifact was cleaned up. Any later local cleanup/recovery is a separate operator action.

`completion_state_persisted` describes whether the exact terminal state snapshot returned to the caller is durably readable from `state-v1.json`. Remote acceptance becomes terminal before this local write is attempted. If the first completed-state publication fails before commit, the canary returns `accepted_for_review=true`, `completion_state_persisted=false`, and `completion_receipt_published=false`; the already-durable `attempting` state still prevents a second automatic submission. If an atomic state write throws after its rename committed, exact readback recognizes the matching state as persisted instead of inventing a failure.

`completion_receipt_published=false` likewise does **not** rewrite a fully validated remote acceptance into `held`. The canary attempts the create-only completion receipt only after accepted/completed state has been durably recorded. If receipt publication fails, accepted state remains durable with `completion_state_persisted=true` and `completion_receipt_published=false`. Recovery of that local evidence artifact is a separate operator action.

If the completion receipt is durably created but the later state synchronization fails, caller-visible truth is `completion_receipt_published=true` and `completion_state_persisted=false`. The durable receipt is never contradicted as unpublished, and the previously persisted completed state still prevents another submit. A completion receipt that exists records `completion_receipt_published=true`.

## Two-stage state machine

The canary requires a fresh private state directory and has two explicit stages.

### 1. Prepare

Preparation starts the MCP bridge with submission disabled, verifies the isolated gateway with a credential-free probe, confirms the submit tool is absent, and materializes the same request twice. It stores the deterministic work-order ID, submission ID, request SHA-256, exact Git commit, input binding, package-lock bindings, MCP source hashes, built MCP runtime hashes, and canary-runner hash in mode-`0600` state.

No `POST` occurs during preparation.

```bash
cd "$HOME/dev/void-node" || return

npm ci --ignore-scripts
npm --prefix integrations/mcp ci --ignore-scripts
npm --prefix integrations/mcp run build

node tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs prepare \
  --repo-root "$PWD" \
  --base-url "http://127.0.0.1:4112" \
  --input "$HOME/.local/share/void-mcp-canary/input-v1.json" \
  --state-dir "$HOME/.local/state/void-mcp-canary/run-v1"
```

The input file must be owner-private and should be created from:

```text
examples/void-agent-mcp-authenticated-submission-live-canary-v1.example.json
```

Replace both timestamps and both nonces immediately before preparation. The expiry must remain at least 60 seconds in the future and no more than 24 hours in the future.

Preparation and execution must run from the same clean Git commit with no tracked-file modifications. Use a dedicated clean worktree when other development lanes are active. Any commit change, tracked-source change, package-lock change, or built MCP runtime change after preparation causes execution to hold before opening a submission-capable MCP session.

### 2. Execute exactly once

Do not execute until the separate credential lifecycle lane has produced an active `submit` credential and its token exists in an owner-private regular file.

```bash
chmod 600 "$HOME/.config/void/private/mcp-submit-canary.token"

node tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs execute \
  --repo-root "$PWD" \
  --base-url "http://127.0.0.1:4112" \
  --input "$HOME/.local/share/void-mcp-canary/input-v1.json" \
  --state-dir "$HOME/.local/state/void-mcp-canary/run-v1" \
  --token-file "$HOME/.config/void/private/mcp-submit-canary.token" \
  --allow-live-submit \
  --confirm confirmVoidAgentMcpAuthenticatedSubmissionLiveCanaryV1
```

The harness writes `attempting` state before opening the submission-capable MCP session. The maximum submission attempt count is one. A timeout, transport failure, malformed response, or other ambiguous result before validated acceptance moves the run to `held`; the same state directory cannot be retried automatically.

After a fully validated remote acceptance, `accepted_for_review=true` is terminal before any later local persistence attempt. A private-temp cleanup failure records `private_temp_cleanup_completed=false`. A completed-state publication failure records `completion_state_persisted=false` without rewriting acceptance to `held`. A completion-receipt publication failure records `completion_receipt_published=false`. A later state-sync failure after a durable receipt records receipt publication as true while state persistence is false. None of those post-accept local conditions causes an automatic submission retry.

## Gateway boundary

`--base-url` must be the isolated AI-agent gateway. HTTPS is required except for loopback testing. Port `4100` is rejected because it is the general VOID node origin, not the agent gateway.

The preparation probe requires:

- `/.well-known/void-agent-discovery.json` to report `VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1`;
- `GET /__void/agents/paid-work/submissions/v1` to return `405`;
- no request body and no authorization header during the probe.

## Secret handling

The raw token is never an MCP argument. The token value is read only by the existing paid-work client from the owner-private file. The harness does not print or persist the token value or token-file path. State and receipts are mode `0600`; state directories are mode `0700`.

Cleanup, state-persistence, and completion-receipt publication evidence are bounded booleans only. The canary does not print or persist the bridge private-temp path when cleanup fails.

## CI and proof

```bash
npm ci --ignore-scripts
npm --prefix integrations/mcp ci --ignore-scripts
npm --prefix integrations/mcp run build
node scripts/prove_void_agent_mcp_authenticated_submission_live_canary_v1.mjs
```

CI uses only loopback and synthetic fixtures. It executes the real MCP stdio server, the official MCP client, the deterministic materializer, and the hardened paid-work client. It performs no external network submission, credential mutation, payment, work execution, WC write, settlement, service restart, or deployment.

The proof injects a synthetic already-accepted MCP result with `private_temp_cleanup_completed=false` and requires the canary to preserve that value through completed state and completion receipt, keep the submission attempt count at one, refuse a second execution from the completed state, and keep token/path material out of persisted evidence. The real CLI cleanup-false path must print the same bounded false value.

The proof pre-creates `completion-receipt-v1.json`, performs exactly one accepted loopback submission, and requires the canary to remain durably `completed` with `accepted_for_review=true`, `completion_state_persisted=true`, and `completion_receipt_published=false`. The pre-existing receipt file must remain unchanged, the CLI must report the false publication fact, a second execution must be rejected before another submit, and no token or private-temp path may be disclosed.

The proof also injects three post-accept state-persistence failures: a failure before the first completed-state write, a throw after an atomic rename whose exact readback proves the completed state is durable, and a failure of the final publication-state write after the completion receipt has been created. Those cases must preserve one accepted submit, zero retry, exact accepted/receipt truth, and no secret/path disclosure.
