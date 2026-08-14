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

The completed state, completion receipt, and CLI also report:

```text
private_temp_cleanup_completed=true|false
```

`false` does **not** revoke or rewrite a fully validated remote `accepted_for_review` result. It means the bridge could not prove deletion of its local private submission-temp directory after that remote result was already known. The canary preserves that cleanup truth without exposing the private temp path or token-file path, does not retry the submission, and does not claim the retained local artifact was cleaned up. Any later local cleanup/recovery is a separate operator action.

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

The harness writes `attempting` state before opening the submission-capable MCP session. The maximum submission attempt count is one. A timeout, transport failure, malformed response, or other ambiguous result moves the run to `held`; the same state directory cannot be retried automatically.

After a fully validated remote acceptance, a later private-temp cleanup failure does not change `accepted_for_review=true`. Instead the run completes once, records `private_temp_cleanup_completed=false` in its private state and completion receipt, prints the same bounded flag in the CLI result, and performs no automatic retry.

## Gateway boundary

`--base-url` must be the isolated AI-agent gateway. HTTPS is required except for loopback testing. Port `4100` is rejected because it is the general VOID node origin, not the agent gateway.

The preparation probe requires:

- `/.well-known/void-agent-discovery.json` to report `VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1`;
- `GET /__void/agents/paid-work/submissions/v1` to return `405`;
- no request body and no authorization header during the probe.

## Secret handling

The raw token is never an MCP argument. The token value is read only by the existing paid-work client from the owner-private file. The harness does not print or persist the token value or token-file path. State and receipts are mode `0600`; state directories are mode `0700`.

Cleanup evidence is boolean only. The canary does not print or persist the bridge private-temp path when cleanup fails.

## CI and proof

```bash
npm ci --ignore-scripts
npm --prefix integrations/mcp ci --ignore-scripts
npm --prefix integrations/mcp run build
node scripts/prove_void_agent_mcp_authenticated_submission_live_canary_v1.mjs
```

CI uses only a loopback fixture. It executes the real MCP stdio server, the official MCP client, the deterministic materializer, and the hardened paid-work client. It performs exactly one authenticated `POST` to the loopback fixture and no external network submission, credential mutation, payment, work execution, WC write, settlement, service restart, or deployment.

The proof also injects a synthetic already-accepted MCP result with `private_temp_cleanup_completed=false` and requires the canary to preserve that value through completed state and completion receipt, keep the submission attempt count at one, refuse a second execution from the completed state, and keep token/path material out of persisted evidence.
