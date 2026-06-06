# VOID Public Bootstrap Gateway v1

Marker: `VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1`

## Why this exists

VOID users should not need router configuration, Tailscale, Cloudflare, VPNs, NAT knowledge, or ISP-specific firewall changes just to discover the network.

A home node can be healthy and still not receive public inbound traffic because the ISP/router blocks unsolicited inbound packets before they ever reach the node.

The public bootstrap gateway exists to give users a simple public doorway:

- open one public VOID URL
- see network status
- fetch public bootstrap metadata
- discover peers
- open the participant/explorer surface

## Non-authority rule

The bootstrap gateway is discovery infrastructure only.

It is not:

- a validator authority
- an admin authority
- a custody service
- a treasury service
- a Buy VOID fulfillment service
- a wallet sender
- a WC-to-VOID swap executor
- a public JSON-RPC endpoint

## Required public surfaces

A gateway may serve:

- `/__void/ready.json`
- `/participant`
- `/datanet/materialized-status`
- `/__void/datanet/materialized-status.json`
- `/bootstrap/network.json`
- `/bootstrap/peers.json`

## Required blocked surfaces

A gateway must not expose:

- public 8545
- admin routes
- treasury routes
- validator mutation routes
- Buy VOID fulfillment routes
- wallet send routes
- WC-to-VOID execution routes

## Bootstrap metadata shape

`/bootstrap/network.json` should expose public discovery metadata only:

```json
{
  "ok": true,
  "marker": "VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1",
  "network": "void-mainnet0",
  "chain_id": 2050,
  "status": "public_mainnet0_live",
  "participant_url": "/participant",
  "ready_url": "/__void/ready.json",
  "datanet_status_url": "/datanet/materialized-status",
  "peers_url": "/bootstrap/peers.json",
  "public_active_validator_admission": false,
  "public_validator_registration": "candidate_waiting_only"
}

/bootstrap/peers.json should expose public seed peers only:

{
  "ok": true,
  "marker": "VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1",
  "network": "void-mainnet0",
  "peers": [
    {
      "id": "seed1",
      "role": "bootstrap_gateway",
      "http_base_url": "https://seed1.example",
      "peer_port": 4700
    }
  ]
}
User experience goal

A user should only need one public bootstrap URL in the explorer.

Example:

https://seed1.voidnetwork.example

The explorer can then discover:

readiness
participant page
DataNet status
public peer list
network metadata
Current home-router finding

The current Precision node is healthy and reachable on LAN/Tailscale, but public IPv4 inbound packets did not reach the machine even after NAT/Gaming was assigned to the Precision tower.

That proves home-router port forwarding is not enough as a default user path.

Deployment recommendation

First public deployment should be a VPS or hosted Linux seed:

public 4100 for HTTP participant/status/bootstrap surfaces
public 4700 for peer/seed traffic if needed
private/local-only 8545
no private keys
no validator mutation authority
no treasury authority
Safety invariants
buy_void_fulfillment=false
validator_mutation=false
wallet_send=false
wc_to_void_swap=false
public_rpc_8545=false
admin_authority=false
treasury_authority=false
