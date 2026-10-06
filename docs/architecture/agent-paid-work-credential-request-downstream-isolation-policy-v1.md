# Credential-request downstream isolation policy v1

## Scope

`VOID_AGENT_CREDENTIAL_REQUEST_DOWNSTREAM_ISOLATION_POLICY_V1` is a
source-only policy contract for the remaining downstream-bypass boundary in
#2400.

Merged #2513 already defines the protected Funnel -> PROXY-v2 adapter loopback
shape. That is necessary but not sufficient while the ordinary public gateway
listener on `127.0.0.1:4112` still exposes the credential-request route.

This contract defines the topology a later runtime/host collector must prove.
It does not modify the gateway, create a listener, install nftables rules, or
change Tailscale/systemd.

## Required topology

The classifier first reuses the exact merged #2513 loopback connector policy.
A positive source-policy result then additionally requires:

1. the ordinary public gateway remains on exact `127.0.0.1:4112`;
2. the credential-request route is **not** exposed on that shared listener;
3. ordinary noncredential gateway routes remain available there;
4. the same reviewed public-gateway service owns a separate IPv4-loopback-only
   credential downstream listener on a distinct nonprivileged port;
5. that listener serves only
   `POST /__void/agents/paid-work/credential-requests/v1`;
6. only the #2513 adapter UID is trusted to connect to that downstream port;
7. source identity is not forwarded as a downstream header or authority;
8. a separate root-owned nftables OUTPUT policy allows that adapter UID to the
   dedicated port and then drops every non-adapter local origin to the same
   port.

The downstream port must differ from both the shared gateway port `4112` and
the Funnel-facing adapter port.

## Why this boundary exists

Current source still mounts the credential POST on the general public-gateway
listener. That means a local process can address the route directly and bypass
the future PROXY-v2 source-address metering path.

Therefore the focused proof explicitly models current source topology with
`credential_route_exposed=true` and requires HOLD:

`downstream_isolation_shared_gateway_bypass_not_closed`.

A later runtime repair may use a second listener in the existing gateway
process, another reviewed equivalent topology, or a stronger authenticated
handoff. This contract selects the separate-listener policy shape for this
source generation; it does not claim that shape is deployed.

## Positive result semantics

A valid policy returns:

`POLICY_SHAPE_QUALIFIED_NOT_LIVE`.

It may truthfully report:

- `source_topology_policy_qualified=true`;
- `downstream_gateway_bypass_policy_shape_qualified=true`;
- `shared_gateway_credential_route_disabled=true`;
- `ordinary_shared_gateway_routes_preserved=true`;
- `dedicated_credential_downstream_required=true`.

It must still report:

- `downstream_gateway_bypass_closed=false`;
- `live_host_evidence_verified=false`;
- `local_transport_trust_proven=false`;
- `tailscale_funnel_configuration_verified=false`;
- `gateway_runtime_configuration_verified=false`;
- `runtime_integration=false`.

Those facts require later source integration and designated-host evidence.

## Adversarial proof

The focused proof rejects:

- the credential route remaining exposed on shared `4112`;
- removal of ordinary shared routes;
- dedicated listener reuse of `4112`;
- dedicated listener reuse of the Funnel-facing adapter port;
- wildcard or IPv6 listener drift;
- wrong credential route or non-exclusive routing;
- wrong trusted connector UID;
- forwarding source identity downstream;
- firewall allow under the gateway UID instead of adapter UID;
- missing non-adapter drop;
- missing firewall rule;
- adapter/gateway firewall mutation authority;
- invalid parent #2513 loopback policy; and
- extra top-level policy fields.

## Relationship to #2409 / #2400

This does not make Draft #2409 merge-ready and does not close #2400.

Self-generated applicant keys remain rotatable. The PROXY-v2/Funnel path also
still requires live connector/process/listener/ruleset evidence and actual
runtime integration. A later designated-host collector must prove the installed
topology and must HOLD if the shared gateway credential bypass is still
reachable.

## Verification

```bash
node --check tools/void-agent-paid-work-credential-request-downstream-isolation-policy-v1.mjs
node --check scripts/prove_agent_paid_work_credential_request-downstream-isolation-policy-v1.mjs
node scripts/prove_agent_paid_work_credential_request_loopback_connector_policy_v1.mjs
node scripts/prove_agent_paid_work_credential_request_downstream_isolation_policy_v1.mjs
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
git diff --check
```

## Authority boundary

Source/proof only. No Funnel/Serve configuration, nftables/systemd mutation,
listener creation, gateway/runtime mutation, credential issuance, registry
write, paid-work dispatch, Work Credit write, wallet/key/signer access,
transaction, Chain-2050 write, market/presale activation, treasury/liquidity
action, or funds movement.
