# Credential-request PROXY-v2 edge runtime v1

Marker: `VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_RUNTIME_V1`.

Issue: #2400.

This source composes the merged strict PROXY-v2 source parser, route composition,
the durable per-source rate state, and #2878's dedicated credential gateway
listener into one loopback-only adapter implementation.

The adapter accepts one bounded request per TCP connection. It requires a valid
PROXY-v2 source record whose public destination port is 443, an exact canonical
credential POST, explicit content length, JSON body and exact payload SHA-256.
Transfer-Encoding, upgrade, pipelining/trailing bytes and normalization aliases
fail closed.

Before any downstream request is sent, the adapter persists the accepted source
rate event through the durable rate-state contract. Rate-limited sources receive
a local 429 and never contact the dedicated gateway. A crash after persistence
but before forwarding is a conservative debit, never an uncounted forwarded
request. The downstream HTTP request uses an exact header allowlist and does not
carry PROXY/source/Forwarded identity.

The source systemd example uses the reviewed service name, a distinct non-root
identity, private StateDirectory, NoNewPrivileges and empty capability sets. It
is an example only and is not installed by this PR.

Still unproven: that only tailscaled can reach the adapter listener, the actual
Funnel target, installed adapter/gateway UIDs, live nftables rules, exact
single-process runtime state custody, and live listener ownership. Therefore
`local_transport_trust_proven=false`,
`tailscale_funnel_configuration_verified=false`, and
`runtime_integration=false` remain authoritative until designated-host
evidence qualifies the merged #2513/#2528 topology.

No credential issuance, registry mutation, paid-work dispatch, Work Credit
write, wallet/key/signer, transaction, Chain-2050 write, activation or funds
authority is granted.
