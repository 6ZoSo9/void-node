# Public Earn loopback isolation policy v1

Marker: `VOID_PUBLIC_EARN_LOOPBACK_ISOLATION_POLICY_V1`.

Status: **source-policy qualification only**. This policy does not install a
service, select production ports or UIDs, load nftables, change Funnel routing,
or claim designated-host acceptance.

## Purpose

Ready #2993 supplies the missing source-side split between the ordinary Public
Earn listener and a dedicated claim/submit listener. That is necessary but not
sufficient: without local-origin isolation, any ordinary process on the host can
still connect directly to the PROXY-v2 Earn edge or to the dedicated mutation
listener and bypass the intended transport chain.

This policy defines the minimum later host topology for #2968:

```text
single public-443 dispatcher process
  -- only dispatcher UID may connect -->
Public Earn PROXY-v2 edge
  -- only Earn-edge UID may connect -->
Public Earn dedicated claim/submit listener
```

The existing shared Public Earn listener remains available for read/status and
download surfaces, but claim/submit must be disabled there.

Funnel/tailscaled -> dispatcher trust is intentionally **not** proven by this
policy and remains a separate #2984 designated-host gate.

## Service identity

The policy fixes the intended reviewed service-unit identities:

- `void-public-443-proxy-v2-dispatch-v1.service`;
- `void-public-earn-proxy-v2-edge-v1.service`;
- `void-public-earn-gateway-v1.service`.

Numeric UIDs/GIDs remain operator-selected and are not invented by this source
contract.

The dispatcher, Earn edge, and Public Earn gateway must:

- use the exact canonical service units above;
- use three distinct non-root effective UIDs;
- use non-root effective GIDs;
- have `NoNewPrivileges=true`; and
- have no `CAP_NET_ADMIN`.

The dedicated identities are required because the nftables policy uses
`meta skuid` to distinguish the process class allowed to originate each
loopback connection.

## Listener topology

The Earn edge must:

- listen only on `127.0.0.1:<edge-port>`;
- expose no IPv6 listener.

The Public Earn gateway must:

- keep its ordinary/read listener on
  `127.0.0.1:<shared-port>`;
- report shared mutation routes disabled;
- own one dedicated mutation listener at
  `127.0.0.1:<dedicated-port>`;
- expose no IPv6 or secondary dedicated listener.

All three modeled ports must be nonprivileged and distinct.

The policy intentionally does not assign numeric production ports. A later
installer/host plan must select and bind them, then a read-only collector must
prove the actual socket owners.

## Durable Earn-edge state

The existing Earn PROXY-v2 rate-state implementation requires same-UID private
custody. The host policy therefore requires:

- rate-state parent owner UID equals the Earn-edge effective UID;
- rate-state file owner UID equals the Earn-edge effective UID;
- group/other permission bits are zero on parent and state file; and
- one process owns admission/state mutation.

A reviewed multi-process lock would require a later policy generation; it is not
silently accepted here.

## nftables policy

One root-owned `inet` table is modeled:

```text
table  void_public_earn_edge_v1
chain  output
hook   output
type   filter
priority 0
policy accept
```

Its exact rule order is:

1. allow dispatcher UID to the Earn-edge loopback port;
2. drop every other local origin to the Earn-edge port;
3. allow Earn-edge UID to the dedicated Public Earn mutation port;
4. drop every other local origin to the dedicated mutation port.

All four rules require:

```text
oifname lo
ip daddr 127.0.0.1
l4proto tcp
```

Neither dispatcher, Earn edge, nor gateway may have authority to mutate this
firewall policy. Root/CAP_NET_ADMIN-equivalent compromise is outside this
specific threat model, matching the existing credential-edge policy.

The shared read listener is deliberately not restricted by this four-rule
policy. Its mutation routes are required to be source-disabled by #2993.

## Positive result

A valid object returns
`POLICY_SHAPE_QUALIFIED_NOT_LIVE` and may establish only:

- dispatcher -> Earn-edge UID isolation **policy shape**;
- Earn-edge -> dedicated-gateway UID isolation **policy shape**;
- shared mutation bypass closure **policy shape**;
- private single-process rate-state custody **policy shape**.

It must still report:

```text
funnel_to_dispatcher_trust_proven=false
live_host_evidence_verified=false
nftables_ruleset_live_verified=false
listener_ownership_live_verified=false
state_custody_live_verified=false
local_transport_trust_proven=false
runtime_integration=false
```

Those require designated-host evidence.

## Relationship to current publication

The historical cloudflared Public Earn overlay still routes
`status|claim-ticket|submit-result` directly to the shared gateway origin.
That publication path is a separate cutover concern. #2993 dedicated mode makes
old direct claim/submit publication fail closed; it does not automatically
reroute those requests through the new public-443 dispatcher and Earn edge.

Therefore a later activation must separately prove that the old external
mutation route is removed/replaced and that ordinary read/status paths remain
available.

## Verification

```bash
node --check tools/void-public-earn-loopback-isolation-policy-v1.mjs
node --check scripts/prove_public_earn_loopback_isolation_policy_v1.mjs
node scripts/prove_public_earn_loopback_isolation_policy_v1.mjs
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
git diff --check
```

The focused proof covers the canonical topology plus wrong/public listeners,
UID reuse, service-unit reuse, capability/hardening drift, rate-state custody
drift, port collision, mutable/non-root firewall state, missing rules, wrong
socket UIDs, and drop-rule removal.

## Authority boundary

Source/proof/CI only. No service installation/restart, Funnel/Serve, nftables,
network/DNS, credential/key/wallet/signer access, transaction/payment, Work
Credit write, Chain-2050 write, presale/market activation,
inventory/treasury/liquidity action, or funds movement.
