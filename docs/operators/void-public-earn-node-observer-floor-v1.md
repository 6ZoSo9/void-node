# VOID Public Earn node-observer peer floor v1

Marker: `VOID_PUBLIC_EARN_NODE_OBSERVER_FLOOR_V1`

Decision: `GREEN_MINIMUM_PEER_FLOOR_SATISFIED`

## Purpose

This lane prevents a healthy local VOID node from being rejected merely because
it has more peers than the configured requirement.

A Precision promotion survey observed a healthy `/p2p/peers` response with an
`ok=true` object, a `connected` array containing two connected peers, and a
configured requirement of one peer. An ad hoc one-shot assertion rejected that
response even though the maintained onboarding observer correctly treats the
configured number as a minimum, not an exact cardinality.

This lane makes the maintained semantics independently reviewable and provides
a canonical read-only wrapper for later Public Earn promotion gates.

## Contract

The validator consumes the JSON emitted by:

```text
void-participant.sh node-check
```

It accepts the maintained marker
`VOID_PARTICIPANT_NODE_OBSERVER_CHECK_V1` only when health, readiness, latest
block alignment, peer visibility, and the complete observer verdict are green.

Peer evidence may use any maintained response shape:

- a top-level array;
- `peers` array;
- `connected` array;
- `items` array;
- `nodes` array; or
- a maintained non-negative count field.

The observed peer count must equal the count reconstructed from the raw peer
evidence. It must be greater than or equal to the requested floor. More healthy
peers are accepted; exact equality is never required.

## Real-shape regression

The focused proof reproduces the observed structure:

```json
{
  "ok": true,
  "connected": [
    { "id": "...", "addr": "100.122.79.39:4700", "outbound": true },
    { "id": "...", "addr": "100.122.79.40:4700", "outbound": true }
  ],
  "knownAddrs": ["..."]
}
```

With `expected_peer_count=1`, two connected peers must produce:

```text
peer_count=2
expected_peer_count=1
excess_peer_count=1
peer_floor_met=true
observer_validation_ready=true
```

A floor of two also passes. A floor of three fails closed.

## Canonical wrapper

```bash
VOID_NODE_BASE=http://127.0.0.1:4100 \
VOID_PARTICIPANT_EXPECTED_PEER_COUNT=1 \
bash ops/public/verify-void-public-earn-node-observer-floor-v1.sh
```

The wrapper runs the maintained `node-check` command, stores the intermediate
report only in a private temporary directory, and validates it with the
content-addressed floor tool. An optional mode-600 output may be selected with:

```text
VOID_PUBLIC_EARN_NODE_OBSERVER_FLOOR_OUTPUT=/private/path/report.json
```

## Authority boundary

This lane performs read-only HTTP `GET` observations through the maintained
node observer. It does not enable a Public Earn coordinator or gateway, issue a
ticket, write or settle Work Credits, access credentials or wallets, register
or activate a validator, install or restart a service, construct/sign/broadcast
a transaction, deploy a contract, or move funds.

Every authority field in the validation packet is explicitly `false`.

## Next gate

A green node-observer floor packet proves only local node readiness. Public Earn
coordinator availability, bounded work inventory, gateway installation or
enablement, and ticket issuance remain separate gates with separate authority.
