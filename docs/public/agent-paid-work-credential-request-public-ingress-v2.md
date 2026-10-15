# Agent paid-work credential request public ingress V2

Marker: `VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V2`

Issue: #2400.

V2 removes the credential-request POST from the ordinary shared AI-agent
gateway listener and gives the same non-root gateway process a separately
configured IPv4-loopback credential listener. The existing inner credential
gateway remains a separate loopback service and preserves its global rate wall.

The dedicated listener is configured with
`VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_DOWNSTREAM_PORT`. The credential
upstream and dedicated port must be configured together. Production ports must
be nonprivileged and distinct from the shared gateway and inner gateway ports;
port zero exists only in proof mode.

The shared listener returns 404 for the credential path and cannot invoke the
credential upstream. Only the dedicated listener accepts the exact POST route.
The existing JSON/body/hash/timeout/response limits remain, and caller supplied
forwarding/source-identity headers are not sent to the inner gateway.

This source may report
`shared_gateway_credential_route_disabled=true` and
`source_downstream_split_integrated=true`. It must still report
`downstream_gateway_bypass_closed=false`,
`local_transport_trust_proven=false`, and `runtime_integration=false`
because installed adapter/gateway identities and nftables allow/drop policy are
not proven here.

A later #2400 slice must bind the real PROXY-v2 adapter stream to the merged
source parser, serialize per-source rate state, and forward only admitted
requests to this dedicated listener. Installed Funnel/listener/service/nftables
evidence remains a separate operator gate.

No service installation/restart, Funnel/nftables/systemd change, credential
issuance, registry mutation, paid-work dispatch, Work Credit write,
wallet/key/signer access, transaction, Chain-2050 write, presale/market
activation, treasury/liquidity or funds movement is authorized.
