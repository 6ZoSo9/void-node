# VOID Agent MCP Bridge V1

A bounded compatibility edge between Model Context Protocol (MCP) hosts and
VOID Network's existing public-agent surfaces.

The bridge does not reimplement VOID protocol logic. It invokes the
repository's existing hardened clients and deterministic order materializer as
subprocesses with `shell: false`, bounded output, bounded runtime, private
temporary files, and no automatic retries.

## Authority boundary

The default server is read-only. It exposes:

- `void://mainnet0/discovery`
- `void://agent/service-catalog`
- `void://agent/capability-status`
- `void_bootstrap_network`
- `void_probe_paid_work`
- `void_prepare_paid_work_submission`

`void_submit_paid_work` is absent unless the local operator sets
`VOID_MCP_ALLOW_SUBMIT=1`. Enabling it also requires an owner-private token file
and every call must contain:

```json
{
  "confirm": "submit-paid-work"
}
```

A successful submission means **accepted for review only**. It does not mean:

- payment was made;
- work was selected, dispatched, or executed;
- Work Credits were awarded or written;
- VOID was settled;
- wallet, signer, transaction, runtime, service, or Buy VOID authority exists.

## Requirements

- Node.js 22
- the VOID repository root
- root dependencies installed (`node_modules/.bin/tsx` must exist)
- HTTPS isolated AI-agent public gateway origin, or that gateway's loopback
  HTTP origin for local testing

## Install and verify

From the repository root:

```bash
npm ci --ignore-scripts

npm --prefix integrations/mcp ci --ignore-scripts
npm --prefix integrations/mcp run check

npx --no-install tsx \
  scripts/prove_void_agent_mcp_bridge_v1.ts
```

The nested package pins the stable split MCP TypeScript SDK packages at
`2.0.0`. Its tests cover the established 2025 protocol era and the
`2026-07-28` era.

## Build

```bash
npm --prefix integrations/mcp run build
```

## Run read-only

```bash
export VOID_MCP_REPO_ROOT="$HOME/dev/void-node"
export VOID_MCP_BASE_URL="https://YOUR_VOID_AGENT_GATEWAY_ORIGIN"

node integrations/mcp/dist/src/stdio.js
```

`VOID_MCP_BASE_URL` must identify the isolated AI-agent public gateway. It must
serve `/.well-known/void-agent-discovery.json` and reserve
`/__void/agents/paid-work/submissions/v1` for `POST`.
Do not use the general VOID node HTTP origin.

`stdout` is reserved for MCP protocol traffic. Diagnostics go to `stderr`.

## MCP host configuration

Use absolute paths:

```json
{
  "mcpServers": {
    "void-network": {
      "command": "node",
      "args": [
        "/absolute/path/to/void-node/integrations/mcp/dist/src/stdio.js"
      ],
      "env": {
        "VOID_MCP_REPO_ROOT": "/absolute/path/to/void-node",
        "VOID_MCP_BASE_URL": "https://YOUR_VOID_AGENT_GATEWAY_ORIGIN",
        "VOID_MCP_ALLOW_SUBMIT": "0"
      }
    }
  }
}
```

The agent cannot supply or override the base URL. It is fixed by the local
operator environment.

## Enable authenticated submission

Create or select the existing paid-work bearer token file. It must be a regular
non-symlink file, contain 1 through 8193 bytes, and grant no group or other
permissions:

```bash
chmod 600 /owner/private/path/paid-work.token

export VOID_MCP_ALLOW_SUBMIT=1
export VOID_MCP_TOKEN_FILE=/owner/private/path/paid-work.token
```

The token value is read only by the existing VOID paid-work client. The MCP
bridge does not read it, expose it in a tool schema, return it, log it, or place
the token value in process arguments. The fixed local token-file path is
redacted from bridge errors and results.

Submission has two independent gates:

1. server startup with exact `VOID_MCP_ALLOW_SUBMIT=1`;
2. exact per-call `confirm="submit-paid-work"`.

There is no retry loop. Duplicate and conflicting-duplicate results retain the
existing VOID intake semantics.

## Environment

| Variable | Required | Meaning |
|---|---:|---|
| `VOID_MCP_BASE_URL` | yes | Fixed isolated AI-agent gateway HTTPS origin or loopback gateway origin |
| `VOID_MCP_REPO_ROOT` | recommended | Exact VOID worktree root |
| `VOID_MCP_ALLOW_SUBMIT` | no | Exact `1` registers the submit tool |
| `VOID_MCP_TOKEN_FILE` | with submit | Owner-private paid-work token file |
| `VOID_MCP_TIMEOUT_MS` | no | `1..60000`, default `10000` |
| `VOID_MCP_MAX_RESPONSE_BYTES` | no | `1..4194304`, default `1048576` |

Any value other than exact `1` keeps submission disabled.

## Inspector

After building:

```bash
# Replace 4112 with the verified loopback port of your isolated agent gateway.
VOID_MCP_REPO_ROOT="$PWD" \
VOID_MCP_BASE_URL="http://127.0.0.1:4112" \
npx @modelcontextprotocol/inspector \
  node integrations/mcp/dist/src/stdio.js
```

Before starting Inspector, verify the selected origin:

```bash
GATEWAY="http://127.0.0.1:4112"

curl -fsS \
  "$GATEWAY/.well-known/void-agent-discovery.json"

curl -sS -o /dev/null -D - \
  "$GATEWAY/__void/agents/paid-work/submissions/v1"
```

The discovery request must return HTTP `200` with marker
`VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1`. The submission-route `GET` must return
HTTP `405` with `Allow: POST`. A `404` indicates the wrong origin.

Inspector use does not enable submission unless the local operator separately
sets both submission environment variables.

## Deterministic preparation

`void_prepare_paid_work_submission` accepts only the currently catalog-bound
service:

```text
void.datanet.fetch-verify.v1
```

It invokes:

```text
scripts/public_agent_service_order_submission_v1.ts
```

The bridge independently canonicalizes the emitted request and verifies:

- catalog fingerprint;
- service and capability identity;
- work-order and submission identifiers;
- request SHA-256;
- all materializer no-authority declarations;
- the 65,536-byte authenticated-client request limit.

No HTTP request is sent during preparation.

## Process containment

The subprocess adapter:

- never uses a shell;
- uses fixed repository executables and scripts;
- fixes the network origin from operator configuration;
- bounds runtime, stdout, and stderr;
- removes MCP mutation and token-file environment variables from children;
- uses mode-`0700` temporary directories;
- uses mode-`0600` request files;
- deletes temporary files after each call;
- preserves the existing client's redirect, same-origin, token-file, request
  size, response size, duplicate, and no-retry checks.

The bridge has no imports from the VOID node runtime and no access to wallets,
signers, ledgers, treasuries, deployment controls, systemd, provider selection,
quote acceptance, settlement, or Buy VOID fulfillment.
