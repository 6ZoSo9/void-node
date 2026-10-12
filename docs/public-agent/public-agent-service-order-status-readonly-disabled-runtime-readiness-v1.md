# Public Agent Service Order Status Read-Only Disabled Runtime Readiness V1

This contract turns a read-only live-service baseline into a deterministic
decision about whether the merged order-status HTTP integration may be loaded
while remaining disabled.

A valid baseline requires:

- `void-node-live.service` loaded, active, and running;
- stable PID, restart count, and invocation ID;
- HTTP `200` from `/health` and `/__void/ready.json`;
- the integration enable variable absent;
- the source-root and max-byte variables absent;
- HTTP `404` for the order-status probe;
- no VOID order-status marker in that response;
- unchanged canonical and readiness worktrees;
- every configuration, route, listener, payment, provider, dispatch,
  Work Credit, runtime, restart, and deployment authority false.

A valid decision says:

```text
ready_for_disabled_deployment=true
ready_for_activation=false
```

This authorizes no action. It only proves that a separate deployment lane may
load the merged code under the same disabled configuration and must then
re-prove route absence and runtime stability.

CLI:

```bash
node tools/void-public-agent-service-order-status-readonly-disabled-runtime-readiness-v1.mjs \
  evaluate --input /path/to/baseline-receipt.json
```
