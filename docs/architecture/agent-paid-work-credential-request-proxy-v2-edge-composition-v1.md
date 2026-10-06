# Credential-request PROXY-v2 edge composition v1

## Purpose

This source-only contract composes the merged credential-request PROXY-v2 source primitive with the existing public HTTP gateway semantics without mounting a listener or changing the gateway.

It closes one narrow source gap in #2400: given raw bytes that begin with one valid PROXY protocol v2 TCP4/TCP6 preface, derive the edge-local source bucket, strip spoofable forwarding/source headers, and decide whether the exact public credential-request POST should consume the per-source rate plan.

It does not prove that an admitted local connector is Tailscale Funnel. PROXY metadata is trusted only after a later host/runtime gate establishes the Funnel -> loopback adapter boundary.

## Marker

VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1

## Dependency

The contract reuses the branded source result produced internally by VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1 from:

tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs

Callers cannot supply a cloned source object. The composition accepts raw connection-prefix bytes and invokes the reviewed parser itself.

## Connection binding

The input buffer must contain, in order:

1. one PROXY-v2 preface;
2. one HTTP request line ending in CRLF; and
3. any following HTTP bytes.

The composition requires one valid PROXY-v2 TCP4/TCP6 preface, consumes exactly the parser-reported preface bytes, parses a bounded ASCII HTTP/1.0 or HTTP/1.1 origin-form request line immediately after that preface, rejects absent/malformed/doubled prefaces before route classification, and preserves the exact method and request target for downstream forwarding.

This is request-line/source composition only. A later runtime adapter must bind these decisions to the actual HTTP parser and stream.

## Header boundary

Every forwarded request passes through the merged source primitive's header sanitizer.

The edge strips Forwarded, every normalized x-forwarded-* header, X-Real-IP, CF-Connecting-IP, True-Client-IP, and X-Void-Trusted-Funnel-Source-V1.

The verified source identity remains edge-local and is never forwarded to the existing gateway as an HTTP authority header.

## Credential route

Only this exact request target is source-metered:

POST /__void/agents/paid-work/credential-requests/v1

It delegates accounting to planVoidAgentCredentialRequestProxyV2RateLimitV1(...) using the parser-branded source result.

A source exhausting its allowance cannot consume another source's per-source bucket. The source port is excluded from limiter identity by the parent contract.

A noncanonical credential target such as the same path with a query string is not reclassified by this source-only adapter contract; it is forwarded with sanitized headers and remains subject to the existing gateway's query rejection. This preserves current downstream HTTP semantics rather than inventing a second request validator.

## Other public routes

All nonmatching requests are classified as FORWARD_SANITIZED_NOT_TRUSTED.

Their method and target are preserved and no credential source-rate event is created. This is required because Funnel TLS-terminated TCP is a port-level handoff: a later adapter would front all public HTTP routes, not only the credential endpoint.

## Bound credential limits

The contract pins the reviewed current gateway defaults:

- request body: 65,536 bytes;
- upstream timeout: 15,000 ms;
- response body: 4,194,304 bytes.

The focused proof statically verifies those values and the canonical credential path in ops/void-ai-agent-public-gateway-v1.mjs. Changes to either dependency are in the focused workflow path set.

## Authority boundary

The authority object intentionally reports:

- source_identity_forwarded_to_gateway=false;
- upstream_loopback_limiter_modified=false;
- rotation_resistant_fairness_proven=false;
- nat_independent_participant_isolation_proven=false;
- source_address_stability_proven=false;
- local_transport_trust_proven=false;
- tailscale_funnel_configuration_verified=false;
- listener_created=false;
- public_gateway_modified=false;
- runtime_integration=false;
- funds_movement=false.

Source-address isolation is not durable participant identity. Multiple participants behind one NAT can share one address, one participant can change addresses, and another admitted local process can forge PROXY-v2 bytes unless a later host policy excludes that connector.

## Focused proof

Run:

- node scripts/prove_agent_paid_work_credential_request_proxy_v2_edge_composition_v1.mjs
- node --check tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs
- node --check scripts/prove_agent_paid_work_credential_request_proxy_v2_edge_composition_v1.mjs
- npm run typecheck
- npm run build
- git diff --check

The proof covers valid PROXY-v2 credential POST composition, same source with a different ephemeral source port mapping to the same bucket, source A exhausted while source B remains admitted, spoofed forwarding/source headers stripped, non-credential public routes preserved without credential rate-state mutation, a noncanonical credential query target preserved for downstream rejection, missing and doubled PROXY-v2 prefaces rejected before HTTP forwarding, exact gateway limit binding, and all runtime/local-trust/durable-fairness/economic authority remaining false.

## Later gate

This contract is not a listener and does not close #2400. A separate reviewed runtime/host gate must prove that only the trusted Funnel forwarding domain can reach the loopback adapter, bind the real HTTP parser/stream to this source decision, preserve the existing upstream global limiter, and perform a separate live cutover ceremony.
