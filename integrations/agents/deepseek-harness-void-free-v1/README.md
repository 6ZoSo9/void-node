# DeepSeek Harness × VOID free worker v1

Marker: `VOID_DEEPSEEK_HARNESS_VOID_FREE_V1`

This integration makes DeepSeek Harness (`dsh`) a read-only VOID agent through
the existing VOID MCP bridge. It does **not** fork or vendor DeepSeek Harness,
and it does not add a second VOID protocol client.

## Cost and license boundary

This lane is deliberately **free-only**:

- DeepSeek Harness is pinned for compatibility to `@deepseek-ai/dsh@0.1.1-rc.2`,
  upstream commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`.
- The upstream Harness repository is MIT licensed.
- The intended local model is `DeepSeek-R1-Distill-Qwen-7B` (commonly served
  locally as `deepseek-r1:7b`); DeepSeek publishes the R1 code/model weights
  under MIT and notes that the Qwen-derived distills originate from Apache-2.0
  Qwen 2.5 bases.
- No DeepSeek Platform API key is used.
- No OpenAI, Anthropic, Google, xAI, Groq, OpenRouter, AWS/Bedrock, Azure, or
  other paid model credential is required or admitted by the launcher.
- The model endpoint must be an unauthenticated **loopback** OpenAI-compatible
  server. A public/cloud model base URL is rejected before `dsh` starts.
- DeepSeek search is disabled.
- Harness telemetry is disabled and every run uses a fresh temporary `DSH_HOME`
  so stored provider credentials cannot silently enter the run.

“Free” here means no metered model/search/API service is required or invoked by
this integration. It does not mean electricity, bandwidth, storage, or local
hardware have zero real-world cost.

## Architecture

```text
local DeepSeek-compatible model server (loopback only)
                 |
                 v
       DeepSeek Harness headless agent
                 |
        @deepseek-ai/dsh-mcp-client
                 |
                 v
       VOID Agent MCP Bridge V1 (stdio)
                 |
                 v
      fixed VOID public agent gateway
```

Harness already ships the generic MCP client. VOID already ships
`integrations/mcp/dist/src/stdio.js`. The Cordis overlay only composes those two
existing surfaces.

The MCP server stays read-only. The overlay hard-binds
`VOID_MCP_ALLOW_SUBMIT=0` and does not provide `VOID_MCP_TOKEN_FILE`, so
`void_submit_paid_work` cannot be registered.

## Free-only launch

The launcher defaults to:

```text
model base: http://127.0.0.1:11434/v1
model id:   deepseek-r1:7b
VOID base:  https://zoso-alienware-aurora-r7.taila47fd.ts.net
```

Every value is preflighted. The local model origin must remain loopback-only,
and the VOID base must serve the canonical agent discovery marker before the
agent starts.

From the VOID repository root, first build the existing MCP bridge if needed:

```bash
npm --prefix integrations/mcp ci --ignore-scripts
npm --prefix integrations/mcp run build
```

Then run:

```bash
integrations/agents/deepseek-harness-void-free-v1/run-free-readonly.sh
```

Or provide one task:

```bash
integrations/agents/deepseek-harness-void-free-v1/run-free-readonly.sh \
  "Inspect current VOID agent capabilities and paid-work availability."
```

Environment overrides:

```text
VOID_DSH_LOCAL_MODEL_BASE_URL   loopback OpenAI-compatible `/v1` base
VOID_DSH_LOCAL_MODEL_ID         local model id
VOID_DSH_VOID_BASE_URL          fixed VOID public agent gateway origin
```

## Deliberate worker boundary

This v1 worker is an observer/analyst, not an operator. The overlay disables
Harness cloud model/search routes, telemetry, web tooling, shell tooling,
filesystem tooling, background jobs, subagents, workflows, and source-editing
tools. The only added external capability is the read-only VOID MCP server.

The worker may:

- bootstrap VOID Mainnet-0 discovery;
- inspect the public service catalog and capability status;
- probe paid-work availability;
- deterministically prepare a paid-work submission envelope without sending it;
- report observed network/agent truth.

The worker may not:

- submit paid work;
- write Work Credits;
- connect or unlock a wallet;
- sign or broadcast a transaction;
- mutate validators, peers, nodes, services, or deployments;
- move treasury, liquidity, or user funds;
- call a metered model/search API through this profile.

## Upstream compatibility

DeepSeek Harness labels itself a developer preview and warns that compatibility
may break. This integration therefore pins one reviewed Harness release and
keeps all DeepSeek-specific composition in this isolated directory. An upstream
upgrade is a separate reviewed change, not an automatic floating dependency.

## Lifecycle

This source lane does not install Harness, download model weights, install a
local model server, start a model, deploy a worker, restart VOID, or mutate any
live service. Those are separate local-runtime gates after source review.
