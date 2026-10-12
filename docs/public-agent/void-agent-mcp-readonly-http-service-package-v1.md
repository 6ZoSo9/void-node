# VOID Agent MCP read-only HTTP service package V1

This lane packages the already-merged read-only MCP Streamable HTTP transport as a reproducible **source-and-CI only** user-service package. Merging this lane does not deploy or restart a service.

## Contract

The service is user-scoped, loopback-only, and defaults to `http://127.0.0.1:4114/mcp`. It reads from the isolated AI-agent public gateway at `http://127.0.0.1:4112`; port `4100` is not a gateway example.

The package exposes exactly three read-only tools and three resources across protocol eras `2025-11-25` and `2026-07-28`. `void_submit_paid_work` remains absent unless the separate operator gate, token file, and exact confirmation are supplied outside this service package.

## Files

- `ops/systemd/void-agent-mcp-readonly-http-v1.service.in` is the user-service template.
- `ops/systemd/void-agent-mcp-readonly-http-v1.env.example` is the non-secret read-only environment contract.
- `ops/deploy_void_agent_mcp_readonly_http_service_v1.py` builds a detached release, installs the user service only after an exact confirmation, verifies readiness with `/proc/net/tcp` plus direct TCP, and rolls back fail-closed.
- The example, schema, proof, and workflow bind the package surface.

## Systemd compatibility and hardening

`PrivateDevices` is intentionally omitted. On the proven Ubuntu per-user systemd manager, enabling it implicitly attempted a capability-bounding operation and failed with `218/CAPABILITIES`. The package retains `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome=read-only`, restricted address families, and `UMask=0077`.

The deployment proof does not trust `ss` as an authority signal. Listener ownership is bound through `/proc/net/tcp` and `/proc/<MainPID>/fd`, then checked with a direct TCP connection.

## Self-test

```bash
python3 ops/deploy_void_agent_mcp_readonly_http_service_v1.py   --self-test   --repo-root "$PWD"

node scripts/prove_void_agent_mcp_readonly_http_service_package_v1.mjs
```

Self-test and CI perform no deployment, no service restart, no live credential access, no paid-work submission, no payment, no work execution, no WC ledger write, and no VOID settlement.

## Operator deployment

Deployment is explicit and mutating:

```bash
python3 ops/deploy_void_agent_mcp_readonly_http_service_v1.py   --repo-root "$PWD"   --gateway-origin http://127.0.0.1:4112   --port 4114   --confirm deployVoidAgentMcpReadonlyHttpServiceV1
```

The deployer requires a clean Git worktree, validates the loopback gateway, builds a detached release, runs the MCP checks and shared authority proof, writes mode-restricted user configuration, activates the new service, and verifies both MCP protocol eras. It does not configure a reverse proxy or external listener.

No live credential or token is accepted by this read-only service package. Public exposure requires a separate authenticated TLS reverse-proxy lane and must not change this loopback boundary.
