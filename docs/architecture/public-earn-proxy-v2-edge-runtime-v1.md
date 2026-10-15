# Public Earn PROXY-v2 edge runtime v1

## Purpose

This is the source-runtime successor to #2973 for issue #2968.

The current production topology still sends public Earn mutation requests through
the ordinary public frontdoor/composition path to the public seed adapter, where
the adapter sees loopback as the transport peer. This source candidate does not
change that deployed topology.

Instead, it defines and proves a dedicated IPv4-loopback edge runtime that can
consume strict PROXY-v2 source identity, durably meter the two exact public Earn
mutation routes, and forward only admitted requests to the existing public seed
adapter.

## Exact routes

Only these canonical request targets are accepted:

- `POST /wc/public-earning-pilot-v1/claim-ticket`
- `POST /wc/public-earning-pilot-v1/submit-result`

The #2973 edge contract remains the route and source-identity authority.
Normalization aliases, queries, wrong methods, generic mutation routes, malformed
PROXY-v2 input, and caller-selected forwarding/source headers fail closed.

## Durable rate state

`tools/void-public-earn-proxy-v2-rate-state-v1.mjs` stores only:

- branded transport source key;
- route class: `claim` or `submit`;
- event timestamp.

It does not store request bodies, account identifiers, executor public keys,
Bearer capabilities, or Work Credit data.

The state store:

- serializes admissions within one process;
- retains one canonical private parent descriptor across read -> plan -> write;
- requires same-UID private parent/file custody;
- reads with `O_NOFOLLOW`;
- writes a private exclusive temporary generation;
- fsyncs the file;
- atomically renames within the retained parent;
- fsyncs that retained parent;
- rereads the installed state before returning;
- persists the admitted event before downstream forwarding.

A crash after durable debit and before forwarding is intentionally conservative:
the source may lose one allowance, but it cannot forward an unaccounted admitted
request.

Multi-process serialization and installed state-directory custody remain
unproven.

## Runtime stream boundary

`ops/public/void-public-earn-proxy-v2-edge-v1.mjs` binds one real TCP byte
stream to the #2973 contract.

The runtime:

- listens only on IPv4 loopback;
- requires strict PROXY-v2 framing whose destination port is public TLS 443;
- bounds PROXY and HTTP header bytes;
- rejects transfer encoding, upgrades, duplicate headers and obsolete folding;
- pauses the socket once headers are classified so body bytes cannot race the
  header-to-body handoff;
- durably debits the source bucket before forwarding;
- enforces the existing 64 KiB claim and 512 KiB submit request-body ceilings;
- bounds downstream response bytes to 1 MiB and timeout to 30 seconds;
- strips spoofable forwarding/source headers;
- forwards no source-identity authority downstream;
- preserves ordinary Authorization and Content-Type so the existing adapter
  remains the claim-body / submit-capability authority;
- keeps the existing adapter rate limiter unchanged as the coarse secondary
  wall.

The edge does not validate executor identity, account identity, ticket identity,
or Bearer capability as rate authority.

## Focused proof

The runtime proof uses only disposable loopback sockets and a mock adapter. It
proves:

- split header/body TCP delivery cannot lose body bytes;
- six claim requests from one source are admitted and the seventh is 429;
- changing ephemeral source port does not reset that bucket;
- a distinct source remains admitted;
- claim and submit buckets are independent;
- caller Forwarded / X-Forwarded / X-Real-IP hints do not reach downstream;
- claim Authorization survives to the downstream rejection path;
- submit Authorization survives to downstream;
- thirty unauthenticated submit requests consume the outer submit bucket and
  the next one is rejected before downstream;
- generic mutation routes and direct non-PROXY HTTP are not forwarded;
- oversized claim admission remains bounded;
- persisted source debit survives edge restart.

The durable-state proof separately covers concurrent serialized admissions,
restart replay, expiry compaction, private file metadata, corrupt-state HOLD,
and parent namespace substitution.

## Remaining HOLDs

This source candidate is not production integration.

Still false and separately required before public activation:

- actual Funnel/connector -> edge transport configuration;
- connector process identity;
- exclusive local reachability / nftables policy;
- installed service UID/GID;
- installed listener ownership;
- installed state-directory ownership/mode;
- one-process state ownership or a reviewed multi-process lock;
- removal/bypass prevention for the current ordinary shared Earn mutation path;
- designated-host startup/restart/rollback evidence;
- public external acceptance.

PROXY-v2 source-address accounting also remains **not** NAT-independent
participant identity. Multiple legitimate participants behind one public address
can share a bucket, and one participant may change addresses.

## Authority boundary

Source/test/CI only.

No service installation or restart, Funnel/nftables/network mutation, credential
issuance, paid-work dispatch, Work Credit write, wallet/key/signer access,
transaction, Chain-2050 write, payment, market/presale activation,
validator action, treasury/liquidity, or funds movement is authorized or
performed by this source lane.
