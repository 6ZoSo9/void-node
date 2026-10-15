# Cloudflare origin source to PROXY-v2 contract v1

Marker: `VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1`

Issue: #2984.

## Purpose

VOID's signed no-node public origin is `https://seed.nullfeed.org`.
The reviewed public dispatcher and the credential/Public Earn sensitive edges
consume strict PROXY protocol v2 source metadata, but the existing public
hostname is served through Cloudflare Tunnel rather than the Tailscale
TLS-terminated-TCP shape originally assumed by #2985.

This source-only contract defines the narrow translation boundary needed to
preserve the signed public origin without treating ordinary HTTP forwarding
headers as participant identity.

It does **not** install or run an adapter.

## Exact sensitive paths

Only exact `POST` requests for these three already-reviewed sensitive paths
may be translated:

- `/__void/agents/paid-work/credential-requests/v1`;
- `/wc/public-earning-pilot-v1/claim-ticket`;
- `/wc/public-earning-pilot-v1/submit-result`.

Queries, trailing-path aliases, other methods and ordinary public routes HOLD.
Ordinary site/read traffic remains the existing frontdoor's responsibility.

The input Host must be exactly:

`seed.nullfeed.org`

## Visitor source input

The contract consumes the HTTP parser's raw header list so case-variant
duplicates remain observable. It requires exactly one `CF-Connecting-IP`
field and validates its value as IPv4 or IPv6.

Cloudflare documents `CF-Connecting-IP` as the visitor-address header sent
from the Cloudflare edge to an origin:

- https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip
- https://developers.cloudflare.com/support/troubleshooting/restoring-visitor-ips/restoring-original-visitor-ips/

The presence of this header is **not** enough to make it trusted. A future live
adapter must prove that its loopback listener is reachable only by the
designated cloudflared service identity and that current Cloudflare routing
cannot replace or synthesize the source through an unreviewed Worker path.

### Pseudo IPv4

This V1 contract refuses `CF-Connecting-IPv6` and `CF-Pseudo-IPv4`.
That fail-closed rule prevents silently treating a Pseudo-IPv4 overwrite as the
original IPv6 participant identity.

A later host acceptance must still independently prove the relevant Cloudflare
Pseudo IPv4 / Worker configuration; absence of an auxiliary header is not
configuration evidence by itself.

## PROXY-v2 output

The output is one strict TCP4 or TCP6 PROXY-v2 preface compatible with the
existing VOID parser.

- source address = validated `CF-Connecting-IP` address bytes;
- source port = 0 because Cloudflare HTTP origin delivery does not preserve a
  trustworthy original client source port and VOID never uses source port as
  participant/rate identity;
- destination port = 443, bound to the reviewed public HTTPS origin;
- destination address = all-zero placeholder because the original public
  destination address is not established by this translation boundary.

The contract therefore explicitly keeps
`destination_address_original_proven=false`.

The existing VOID PROXY-v2 parser derives limiter identity only from source
family + source-address bytes, not source port. The existing sensitive-edge
header sanitizer removes `CF-Connecting-IP`, `Forwarded`,
`X-Forwarded-*`, `X-Real-IP`, `True-Client-IP` and related spoofable
source hints before downstream application handling.

## Required future host/runtime boundary

Before translated bytes can become source-rate or participant authority, a
separate reviewed implementation and designated-host acceptance must prove all
of:

1. one dedicated IPv4-loopback adapter listener;
2. only the authenticated cloudflared service UID can reach that listener;
3. non-cloudflared local UIDs are dropped before adapter admission;
4. the Tunnel public-hostname/path mapping sends only the exact sensitive paths
   to the adapter while ordinary traffic keeps the existing frontdoor path;
5. no active Worker/subrequest rule can rewrite the visitor source identity;
6. Pseudo IPv4 overwrite behavior is disabled or separately reviewed;
7. the adapter preserves existing body/response/timeout ceilings;
8. the adapter sends the generated PROXY-v2 preface to the reviewed dispatcher
   and does not convert source identity into a caller-trusted HTTP header;
9. direct local access to dispatcher/sensitive edge remains blocked by the
   host firewall/service-UID policy; and
10. two independent external sources demonstrate the expected rate-isolation
    behavior end to end.

## Authority

This contract is deliberately non-live:

- `cloudflare_header_transport_trusted=false`;
- `cloudflared_uid_isolation_proven=false`;
- `cloudflare_worker_route_absence_proven=false`;
- `pseudo_ipv4_overwrite_disabled_proven=false`;
- `downstream_exclusive_reachability_proven=false`;
- `runtime_integration=false`;
- no DNS/Tunnel/systemd/nftables mutation;
- no credential issuance or Work Credit write;
- no wallet/signer/transaction/payment authority;
- no presale/market/treasury/funds authority.

**PROTECT THE CORE.**
