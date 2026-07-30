# VOID signed node-to-onion binding v1

`VOID_NODE_ONION_BINDING_V1` binds a Tor v3 transport endpoint to the Ed25519 identity key already used by the running VOID node. It does not generate a second identity key.

The signed document preserves the live `nodeId` exactly as VOID already publishes it, and includes the canonical Ed25519 public key, public-key fingerprint, onion hostname and URI, validity interval, public binding routes, and the complete read-only authority boundary. Signature bytes are domain-separated with `VOID_NODE_ONION_BINDING_V1\0` and deterministic `void-canonical-json-v1` serialization.

## Public routes

- `/.well-known/void-node-onion-binding-v1.json`
- `/public-node/transports/tor-v1-binding.json`

A valid binding upgrades the Tor descriptor identity state to `signed-node-to-onion-v1`. An absent binding leaves the descriptor honestly unbound. A malformed, expired, tampered, or onion-mismatched binding fails closed with HTTP 503 for both the binding and descriptor routes.

## Activation

After this source lane is merged, the operator runs:

```bash
VOID_NODE_KEY_PATH=/path/to/the/existing/node-key \
  bash ops/tor/void-node-onion-binding-v1.sh create
```

The helper reads the live loopback `/health` node ID without case-folding or re-deriving it, loads the same key through `src/crypto/keypair.js`, requires exact node-ID equality, signs once, writes the document mode `0600` under the managed Tor data root, and performs local plus onion verification. The server reads the binding per request, so no node or Tor restart is required.

`remove` deletes only the public binding document. It preserves the VOID node key and Tor onion identity and immediately returns the descriptor to the unbound state.

## Authority boundary

This lane does not expose or enable transaction submission, the P2P listener, MCP, wallet or signer access, Work Credit writes, VOID settlement, node runtime mutation, validator mutation, treasury movement, or operator control. The public key and signature are publishable. The node private key is never printed, copied into a receipt, committed, or served.

## Node identity semantics

VOID's canonical node ID is an existing network identity value, not a format invented by this Tor lane. V1 accepts a bounded printable ASCII node ID and preserves it byte-for-byte. The binding's Ed25519 signature proves that the existing node key attests to that exact node ID and onion endpoint. Live creation separately requires the same exact node ID from `/health`; public-key derivation of the node ID is not required. Invalid signatures, changed node IDs, key mismatches, and health/key disagreement fail closed.
