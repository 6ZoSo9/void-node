# Public Earn PROXY-v2 edge contract v1

## Purpose

This is the bounded source-only design contract for #2968.

The current public Earn mutation path reaches
`ops/public/public-seed-adapter-v1.mjs` through loopback proxies, while that
adapter keys both claim and submit rate limits from
`req.socket.remoteAddress`. Distinct external callers can therefore collapse
into the same loopback bucket.

This contract does not change the running adapter. It defines the source
decision a later dedicated Earn mutation edge must make before forwarding either
reviewed mutation route.

## Marker

`VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1`

## Reused source boundary

The contract reuses the already-reviewed credential-request PROXY-v2 edge
composition. That parent contract:

- parses one strict TCP4/TCP6 PROXY-v2 source preface;
- binds the destination port to public TLS port 443;
- excludes ephemeral source port from limiter identity;
- strips `Forwarded`, every `X-Forwarded-*` header, `X-Real-IP`,
  `CF-Connecting-IP`, `True-Client-IP`, and the prior trusted-source hint;
- keeps the derived source identity edge-local; and
- still reports local connector trust, HTTP parser/stream binding, runtime
  integration, and durable rate-state custody as unproven.

No caller-supplied HTTP forwarding header becomes rate authority.

## Exact Earn mutation surface

The dedicated source contract accepts only these exact request lines:

- `POST /wc/public-earning-pilot-v1/claim-ticket`
- `POST /wc/public-earning-pilot-v1/submit-result`

Normalization aliases, query strings, wrong methods, and every other route are
held. The source contract therefore grants no generic mutation route.

It does not inspect or rewrite the request body. It preserves ordinary
`Authorization` and `Content-Type` headers after spoofable forwarding headers
are removed, so the existing adapter's claim-body checks, submit capability
check, ticket/body binding, body ceilings, upstream behavior, and response
handling remain downstream authority.

## Source buckets

The current adapter defaults are bound into the source contract:

- claim: 6 requests per source per 60 seconds;
- submit: 30 requests per source per 60 seconds.

Claim and submit keep separate buckets, matching the current adapter's
`:claim` and `:submit` separation.

The limiter key is the branded transport source identity derived from the
PROXY-v2 source address. It does not use:

- `executor_node_id`;
- the self-issued executor public key;
- a caller-selected account;
- ticket ID;
- Bearer capability shape; or
- source TCP port.

Therefore executor-key rotation and ephemeral source-port rotation do not reset
the transport-address bucket. A caller exhausting its bucket does not consume a
different source address's bucket.

## Secondary inner limiter

The existing loopback adapter limiter is intentionally unchanged and remains a
coarse/global secondary wall. This source contract does not relabel the inner
loopback limiter as participant isolation.

The focused proof statically binds the current adapter route names, default
limits, and the fact that its rate checks still occur before the claim
authorization rejection / submit capability-shape validation.

## Truth boundary

This source contract does **not** prove NAT-independent participant identity.
Two legitimate participants sharing one public NAT address can share one
transport bucket. One participant can also change public addresses.

Accordingly these remain false:

- `rotation_resistant_fairness_proven`;
- `nat_independent_participant_isolation_proven`;
- `source_address_stability_proven`.

A stronger fairness property requires a separately reviewed non-rotatable
enrollment/identity primitive. Self-issued executor keys are not sufficient.

## Runtime HOLDs

This change creates no listener and performs no host or economic mutation.

The following remain explicit HOLDs:

- actual Tailscale Funnel / connector configuration;
- connector process identity and exclusive reachability to the dedicated edge;
- nftables / socket-owner policy;
- systemd service installation or restart;
- HTTP parser and byte-stream binding to the source decision;
- durable and serialized rate-event state custody;
- installed listener ownership;
- Work Credit dispatch or write;
- credential issuance;
- wallet, key, signer, transaction, Chain-2050 write, presale/market activation,
  treasury/liquidity, or funds movement.

Those require separate designated-host evidence and review.

## Focused proof

Run:

```sh
node --check tools/void-public-earn-proxy-v2-edge-contract-v1.mjs
node --check scripts/prove_public_earn_proxy_v2_edge_contract_v1.mjs
node scripts/prove_public_earn_proxy_v2_edge_contract_v1.mjs
npm run typecheck
npm run build
git diff --check
```

The proof covers distinct source isolation, same-source ephemeral-port
stability, independent claim/submit buckets, spoofed forwarding-header
rejection, preservation of downstream Authorization semantics, exact-route-only
classification, normalization/query/method rejection, malformed/wrong-port
PROXY-v2 rejection, current adapter default binding, and all runtime/economic
authority remaining false.
