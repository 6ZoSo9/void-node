# Agent paid-work credential request PROXY-v2 source identity v1

Marker:

`VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1`

## Purpose

Issue #2400 exists because the public HTTP reverse proxy collapses external
credential-request callers onto one loopback upstream peer. The upstream
per-remote limiter therefore cannot provide multi-participant isolation.

This source contract defines one bounded future transport identity for that
public edge without modifying the current public gateway or runtime.

Tailscale's current Funnel CLI documents PROXY protocol v2 for TLS-terminated
TCP forwarding:

```text
tailscale funnel --proxy-protocol=2 --tls-terminated-tcp=443 \
  tcp://127.0.0.1:<local-adapter-port>
```

In that mode the backend receives the original source IP/port through PROXY
protocol v2.

References:

- https://tailscale.com/docs/reference/tailscale-cli/funnel
- https://tailscale.com/docs/features/tailscale-funnel

These URLs document the intended later transport. This source contract does not
inspect or mutate live Tailscale configuration.

## Strict PROXY-v2 boundary

The parser accepts only:

- the 12-byte PROXY protocol v2 signature;
- version 2;
- command `PROXY` (not `LOCAL`);
- TCP over IPv4 (`0x11`) or TCP over IPv6 (`0x21`);
- a complete declared header bounded to at most 512 bytes.

The fixed TCP4/TCP6 address block is parsed first. Additional PROXY-v2 bytes
must form a bounded sequence of structurally valid TLVs (type byte + uint16
length + exact value bytes). TLV values remain opaque and are not authority for
the limiter identity. Malformed/truncated TLV framing or more than 64 TLVs HOLD.

The limiter identity is content-addressed from:

```text
protocol generation + TCP family + raw source-address bytes
```

The ephemeral source port is deliberately excluded. Reconnecting from the same
source address with another source port therefore cannot rotate the bucket.

IPv6 identity uses the exact 16 raw address bytes rather than a textual
representation, avoiding equivalent-string normalization ambiguity.

## Forwarding-header boundary

The future adapter must discard caller-provided forms of:

- `Forwarded`;
- `X-Forwarded-For`;
- `X-Forwarded-Host`;
- `X-Forwarded-Proto`;
- `X-Real-IP`; and
- `X-Void-Trusted-Funnel-Source-V1`.

The source identity remains internal to the edge adapter. The sanitizer strips
all caller-provided forwarding/source hints, including
`x-void-trusted-funnel-source-v1`, and does **not** forward or replace them
with another identity header. The unchanged downstream gateway therefore does
not need to trust a new client-identity header.

Parser results carry an in-process, module-private brand. Header sanitization and
rate planning require that exact branded object and independently re-derive its
key from the raw family/address bytes. A serialized/cloned lookalike object is
rejected even when it contains the mathematically correct key. This prevents a
future caller from bypassing the parser by constructing a raw limiter identity.

Header values are bounded and reject CR/LF, NUL and other disallowed control
bytes before any future handoff, so the sanitizer cannot become a header
injection primitive.

Accordingly:

```text
local_transport_trust_proven=false
runtime_integration=false
```

remain authoritative.

## Rate-limit planner

The pure planner consumes:

- the complete parser result, not a caller-selected raw bucket key;
- server-selected `now_ms`;
- a bounded window;
- a bounded per-source allowance; and
- a bounded prior-event set.

Before planning, the contract re-derives the limiter key from the parser
result's raw family/address bytes and rejects a mismatched caller-selected key.
Expired events are pruned. Admission counts only events with the same source
key. Exhausting caller A therefore does not deny caller B, while changing only
A's TCP source port cannot reset A's bucket.

This planner does not replace the existing loopback upstream limiter. A later
composition must preserve that upstream limiter as an independent global safety
wall.

Per-source-address isolation is intentionally narrower than participant
fairness. Source addresses may be shared (for example NAT) or rotated (for
example IPv6 privacy addresses, VPNs or network changes). Therefore this
contract explicitly keeps:

```text
rotation_resistant_fairness_proven=false
nat_independent_participant_isolation_proven=false
source_address_stability_proven=false
```

It fixes the current all-callers-as-loopback collapse, but does not by itself
establish one durable human/agent fairness identity.

## Proof

```bash
node scripts/prove_agent_paid_work_credential_request_proxy_v2_source_v1.mjs
node --check tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs
node --check scripts/prove_agent_paid_work_credential_request_proxy_v2_source_v1.mjs
npm run typecheck
npm run build
git diff --check
```

The focused proof covers:

- valid TCP4 and TCP6 parsing;
- raw-address limiter identity;
- source-port rotation not changing the bucket;
- two source addresses producing independent buckets;
- bounded structurally valid TLV consumption and malformed TLV rejection;
- missing, malformed, wrong-version, `LOCAL`, UDP/unsupported family,
  truncated, undersized and oversized PROXY-v2 HOLDs;
- case-insensitive stripping of spoofable forwarding/trusted-source headers;
- control-character/header-injection rejection;
- no source-identity header forwarded to the downstream gateway;
- forged parser objects with caller-selected limiter keys rejected;
- exact cloned/unbranded parser-result lookalikes rejected;
- caller A exhaustion while caller B remains admitted;
- expired rate events being pruned; and
- every ungranted authority bit remaining false.

## Authority boundary

This lane is source/proof only. It does not:

- create a listener;
- configure Tailscale Funnel or Serve;
- change the existing HTTPS cutover;
- modify `ops/void-ai-agent-public-gateway-v1.mjs`;
- modify #2409;
- establish adapter-to-gateway local transport trust;
- issue credentials or mutate the credential registry;
- dispatch paid work or write Work Credits;
- access wallets, keys or signers;
- construct, sign or broadcast transactions;
- mutate Chain-2050;
- activate a market/presale; or
- move treasury, liquidity or any funds.

The next separate gate is a reviewed loopback edge adapter that consumes this
parser/rate contract **before** forwarding ordinary sanitized HTTP to the
unchanged #2409 gateway. That composition must preserve the existing 64-KiB
request-body, 15-second timeout and 4-MiB response ceilings plus the upstream
global limiter, prove the Funnel-to-adapter local transport assumption, and
leave live Funnel migration as a separately authorized operator ceremony.
