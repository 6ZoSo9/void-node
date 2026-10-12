# Public participant no-node handoff wall v1

## Incident

The public composition gateway proxied `/participant` from the local node. That
HTML contained a real local account, local account management, admin links,
runner controls, proof-generation POSTs, Wallet/Buy/Stake controls, and
validator live-submit code. The gateway blocked many backend calls, but the
public document itself was still the wrong trust surface.

The same gateway also blocked the merged no-node client's required status,
claim, submit, and dataset routes.

A later source version removed the local dashboard but still rendered literal
coordinator placeholders and described the health-reported node ID as trusted.
That conflated Public Earn availability with coordinator identity trust.

## Resolution

- `/participant` is server-rendered from a public-safe status object and never
  proxies the local operator participant dashboard.
- Public Earn availability remains a separate fact from copy-readiness.
- Exact no-node routes are exposed:
  - GET/HEAD `/health`
  - GET/HEAD `/__void/public-earn-gateway-v1/status.json`
  - GET/HEAD `/wc/public-earning-pilot-v1/status` with no query
  - POST `/wc/public-earning-pilot-v1/claim-ticket`
  - POST `/wc/public-earning-pilot-v1/submit-result`
  - GET/HEAD `/download/void-public-earn-no-node-client-v1.mjs`
  - bounded DataNet fetch-by-ID
  - exact signed public-origin binding GET/HEAD path
- `/wc/redeemable?account=...` remains private.
- The live health node ID is labeled self-report unless a reviewed signed
  public-origin binding verifies the canonical public origin and the same node
  ID.
- The page emits coordinator commands only when
  `public_copy_ready=true`.
- If the binding is absent, invalid, expired, or identity-mismatched, the page
  renders Identity HOLD, emits no coordinator CLI flags, and forbids manual
  coordinator-origin/node-ID substitution.
- The no-node client verifies canonical accounting from the capability-bound
  submit response using the current fixed-point authority:
  `before_exact`/`before_quanta`, `after_local_exact`/`after_local_quanta`,
  `delta=3`, `acceptance_local_delta=true`, and
  `numeric_authority=nano_wc_fixed_point_v1`. It also accepts the two exact
  recovery shapes where the 3 WC credit already committed but the participant
  is receiving a duplicate/idempotent terminal response.

## Trust boundary

A public HTTPS handoff is copy-ready only when:

1. bounded public health/status evidence is available;
2. the health node ID is canonical 32-lowercase-hex;
3. the exact canonical `VOID_NODE_PUBLIC_ORIGIN_BINDING_V1` route returns a
   bounded document;
4. the reviewed Ed25519 trust registry verifies the binding;
5. signed origin is `https://seed.nullfeed.org`;
6. signed node ID equals the live health node ID; and
7. the binding remains unexpired.

The request Host header, page origin inference, and operator-entered coordinator
values are not trust roots.

## Deployment boundary

Merging does not install a signed production binding, alter service
configuration, or restart the composition/public-seed gateways. A separately
authorized signed-origin publication/activation step is still required before
the live page can become copy-ready.
