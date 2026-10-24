# VOID Public Node Connect Pack v1

Marker: `VOID_PUBLIC_NODE_CONNECT_PACK_V1`

## Purpose

This pack gives a public operator the shortest safe path to connect a VOID node to a bootstrap peer and verify basic peer reachability.

## What this is

This is public-safe node connection guidance.

It helps an operator:

- read public bootstrap metadata
- identify a bootstrap peer
- ask a local node you administer to dial a peer with `/p2p/dial`
- verify `/health`
- verify `/p2p/peers`
- understand what evidence to share if the connection worked

## What this is not

This is not validator admission.

This is not staking.

This is not Work Credit earning.

The manual `/p2p/dial` POST starts an outgoing connection attempt and may update local peer state. This is not wallet send, token movement, buy VOID fulfillment, WC settlement, or authority for any other mutation.

This is not a public internet mesh claim.

## Current public bootstrap routes

- `/__void/public-bootstrap.json`
- `/bootstrap/network.json`
- `/bootstrap/peers.json`

## Minimal operator flow

1. Fetch bootstrap peers:

       curl -fsS http://<BOOTSTRAP_HOST>:4100/bootstrap/peers.json | jq .

2. Pick a peer address from the returned peer list.

3. Dial the peer from the local node:

       curl --fail-with-body --silent --show-error -X POST -H 'content-type: application/json' --data '{"addr":"<PEER_HOST>:<PEER_P2P_PORT>"}' http://127.0.0.1:4100/p2p/dial | jq .

   Run this only against a local node you administer. `{"ok":true,"dialing":"..."}` means the node accepted the request; it does not prove that the peer connected. `{"ok":false,"error":"..."}` explains a rejection. Correct the address or local node problem before retrying; do not retry blindly.

4. Verify local health:

       curl -fsS http://127.0.0.1:4100/health | jq .

5. Verify local peers:

       curl -fsS http://127.0.0.1:4100/p2p/peers | jq .

## Evidence to share

If an operator connects successfully, useful public-safe evidence is:

- local `/health`
- local `/p2p/peers`
- bootstrap route used
- peer address dialed
- timestamp
- node id

Do not share private keys, seed phrases, wallet secrets, machine secrets, `.env` files, private IPs that should remain private, or private logs containing secrets.

## Boundary

This pack is public-safe operator guidance. Its manual dial step uses the existing local peer-state mutation route; the pack does not itself enable automatic dialing.

It does not enable wallet send, money movement, buy VOID fulfillment, WC settlement, validator mutation/admission, public WC self-serve earning, or a public internet mesh claim.

Expected green marker: `VOID_PUBLIC_NODE_CONNECT_PACK_V1_GREEN`
