# Public participant no-node handoff wall v1

## Incident

The public composition gateway proxied `/participant` from the local node. That
HTML contained a real local account, local account management, admin links,
runner controls, proof-generation POSTs, Wallet/Buy/Stake controls, and
validator live-submit code. The gateway blocked many backend calls, but the
public document itself was still the wrong trust surface.

The same gateway also blocked the merged no-node client's required status,
claim, submit, and dataset routes.

## Resolution

- `/participant` becomes a static public-safe no-node handoff.
- The local operator participant dashboard is never proxied publicly.
- Exact no-node routes are exposed:
  - GET/HEAD `/health`
  - GET/HEAD `/__void/public-earn-gateway-v1/status.json`
  - GET/HEAD `/wc/public-earning-pilot-v1/status` with no query
  - POST `/wc/public-earning-pilot-v1/claim-ticket`
  - POST `/wc/public-earning-pilot-v1/submit-result`
  - GET/HEAD `/download/void-public-earn-no-node-client-v1.mjs`
  - bounded DataNet fetch-by-ID
- `/wc/redeemable?account=...` remains private.
- The no-node client verifies canonical accounting from the capability-bound
  submit response using the current fixed-point authority:
  `before_exact`/`before_quanta`, `after_local_exact`/`after_local_quanta`,
  `delta=3`, `acceptance_local_delta=true`, and
  `numeric_authority=nano_wc_fixed_point_v1`. It also accepts the two exact
  recovery shapes where the 3 WC credit already committed but the participant
  is receiving a duplicate/idempotent terminal response.

## Deployment boundary

Merging does not update the live frozen 8080 gateway or restart the composition
gateway. A later exact-source deployment is required.
