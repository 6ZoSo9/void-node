# Single public-443 PROXY-v2 dispatch v1

## Purpose

Issue #2984 exists because the repository had three independent public-ingress
assumptions for one host:

- existing public Funnel HTTPS 443 -> HTTP frontdoor;
- credential source policy requiring TLS-terminated TCP 443 + PROXY-v2;
- public Earn source runtime requiring strict PROXY-v2 before source metering.

These cannot be treated as three independent live owners of the same public
socket. This source contract defines one source-authenticated ingress dispatcher
without changing any live Funnel, service, firewall, or route configuration.

## Proposed source topology

```text
public TLS 443
  -> Tailscale TLS-terminated-TCP + PROXY-v2
  -> one loopback dispatcher
       exact credential POST -> credential edge
       exact Earn claim POST -> Earn edge
       exact Earn submit POST -> Earn edge
       everything else -> existing HTTP frontdoor
```

The dispatcher is not a credential or Earn implementation. It owns only source
transport framing and route selection.

## Source identity

Every admitted connection must begin with one strict PROXY protocol v2 TCP4/TCP6
preface accepted by the existing reviewed parser. The encoded public destination
port must be 443.

The dispatcher reads only the following application information for routing:

- method;
- raw origin-form request target;
- HTTP/1.0 or HTTP/1.1 request-line boundary.

HTTP forwarding/source headers do not influence dispatch.

The source-address-derived key is available only as proof metadata. It is never
converted into an HTTP authority header by the dispatcher.

## Sensitive routes

Only these exact canonical targets reach sensitive edges:

- `POST /__void/agents/paid-work/credential-requests/v1`;
- `POST /wc/public-earning-pilot-v1/claim-ticket`;
- `POST /wc/public-earning-pilot-v1/submit-result`.

For a request whose normalized pathname is a sensitive path, the raw target must
equal that pathname exactly and the method must be POST. Query aliases, dot
normalization aliases, trailing-slash aliases and wrong methods fail closed
before any downstream connection.

The original PROXY-v2 preface is preserved byte-for-byte for sensitive
downstreams. #2878 and #2982 therefore remain the authorities that independently
parse and consume the authenticated transport source.

## Ordinary public traffic

All non-sensitive request targets are routed to the existing frontdoor.

For that path only, the dispatcher removes exactly the parser-reported PROXY-v2
preface and forwards the original HTTP bytes beginning at the request line.

It does not add `Forwarded`, `X-Forwarded-For`, `X-Real-IP`, or another
source identity header.

The ordinary frontdoor also has a second, per-request deny wall for the exact
credential and Earn sensitive paths, including normalized/query/trailing aliases.
That wall is required because HTTP/1.1 keep-alive or pipelining can carry a
second request after the connection-level dispatcher has already selected the
frontdoor. A sensitive request reaching the frontdoor is answered 404 with
`Connection: close` and is never proxied to the composition gateway.

This is intentional: normal public traffic keeps the existing frontdoor HTTP
shape and proxy behavior, while sensitive request handling remains exclusive to
the reviewed PROXY-v2 edges.

## Runtime source

`ops/public/void-public-443-proxy-v2-dispatcher-v1.mjs` is a loopback-only
source runtime. Its downstream hosts are fixed to `127.0.0.1`; only the three
operator-supplied local ports vary.

It buffers only until strict PROXY-v2 plus one bounded request line can be
classified, pauses the client stream, connects to the fixed route target, writes
the already-buffered bytes in the correct framing mode, and then relays the
remaining byte stream without application rewriting.

The relay closes **both** socket descriptors when either side has no network
activity for 60 seconds (1.5 seconds in disposable proof mode). A successful
TCP connect does not disable idle protection. This bounds fully classified but
incomplete requests and unresponsive backends; normal client half-close still
allows the downstream response. Client disconnects and downstream errors also
release the paired socket. The focused proof checks descriptor cleanup and
subsequent healthy routing. This is an idle timeout, **not** an absolute maximum
connection lifetime; periodic traffic can keep a connection active.

The runtime does not authorize any concrete production port values.

## Focused proof

The proof uses three disposable loopback TCP backends and proves:

- exact credential route reaches only the credential backend;
- exact Earn claim/submit routes reach only the Earn backend;
- sensitive backends receive the original PROXY-v2 + HTTP byte stream;
- ordinary GET and existing POST shapes reach only the frontdoor;
- frontdoor receives exact HTTP bytes with the PROXY-v2 preface removed;
- the real frontdoor preserves root/proxy/POST behavior while rejecting
  sensitive direct and pipelined bypass attempts before its upstream;
- same source with a changed ephemeral port derives the same source key;
- query, dot-segment, trailing-slash, wrong-method, wrong-destination-port and
  direct-non-PROXY sensitive requests fail before any backend;
- caller forwarding headers do not choose dispatch;
- no generic sensitive mutation route is created.

## Host policy still required

This source contract does not prove production isolation.

A later designated-host gate must prove:

- exactly one Funnel 443 configuration points to the dispatcher;
- `tailscaled.service` is the only process authorized to reach the dispatcher;
- the dispatcher UID/process is the only principal authorized to reach the
  credential and Earn sensitive edge listeners;
- ordinary untrusted local processes cannot submit forged PROXY-v2 bytes to
  those edges;
- the frontdoor remains reachable only in the intended local topology;
- exact installed source/process/listener ownership;
- nftables or an equivalent kernel-enforced allow/drop policy;
- rollback to the prior public frontdoor configuration;
- external public-site, credential-request and Earn acceptance.

Until that evidence exists, all runtime/Funnel/firewall acceptance flags remain
false.

## Tailscale mode boundary

This design intentionally uses one TLS-terminated TCP Funnel handoff because
PROXY protocol source metadata belongs to the TCP forwarding contract. HTTPS
path mounts are not treated as an authenticated source-address handoff.

Using public ports 8443 or 10000 for one of the sensitive APIs remains a possible
alternative product design, but it would change public API URLs and is not
authorized by this source contract.

## Authority boundary

Source/test/CI only.

No Funnel/Serve mutation, service installation/restart, nftables/network/DNS
change, credential issuance, paid-work dispatch, Work Credit write,
wallet/key/signer access, payment/transaction, validator action,
market/presale activation, treasury/liquidity, or funds movement.
