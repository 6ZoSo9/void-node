# Public Agent Service Order Status Read-Only Disabled Deployment V1

## Purpose

This contract converts a sealed, read-only deployment-mechanism receipt into a
deterministic deployment packet.

The packet is deliberately non-executable. It records the exact commit,
service identity, runtime entry, restart command, preconditions, and required
post-restart checks. It grants no runtime authority.

## Valid decision

```text
ready_for_disabled_deployment=true
ready_for_activation=false
```

The only contemplated runtime action after this packet is merged is one
separately confirmed restart of the existing user service:

```text
systemctl --user restart void-node-live.service
```

That later executor must prove all three order-status environment variables
remain absent, `/health` and `/__void/ready.json` return HTTP 200, the
order-status probe remains HTTP 404 without the VOID marker, and the new
process loads the exact repository-local `src/index.ts` bytes.

## Input requirements

The evaluator requires a normalized V7 mechanism receipt proving:

- canonical `main` and `origin/main` were frozen to the same commit;
- the deployment lane contained no unique commits;
- PR #878 readiness closeout and V4 superseded provenance were verified;
- the service remained loaded, active, and running;
- the existing process started before the target commit;
- all order-status configuration variables were absent;
- health and readiness returned HTTP 200;
- the order-status probe returned HTTP 404 without the VOID marker;
- the true runtime entry is repository-local `src/index.ts`;
- runner dependencies under `node_modules` were excluded;
- live and exact-main rehearsal entry bytes match;
- the disposable build and both proofs were green;
- no configuration, restart, deployment, runtime mutation, or activation
  occurred.

## CLI

```bash
node tools/void-public-agent-service-order-status-readonly-disabled-deployment-v1.mjs \
  evaluate --input /path/to/mechanism-v7-receipt.json
```

## Authority boundary

The evaluator can only read the supplied receipt and emit canonical JSON. It
cannot build canonical `main`, restart a service, write configuration, mount a
route, create a listener, read or write order-status source data, submit work,
read token bytes, select or authenticate a provider, accept a quote, execute
payment, dispatch work, write Work Credits, deploy, or activate the
integration.
