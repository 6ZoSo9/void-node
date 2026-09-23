# VOID node public-origin binding v1

Marker: `VOID_NODE_PUBLIC_ORIGIN_BINDING_V1`

This source-only contract defines the signed node-identity credential required by
the remaining Stage B work in #1612. It authenticates one exact HTTP or HTTPS
origin to one canonical VOID node identity without treating a directory result
or `/health` response as a trust root.

It is deliberately separate from `VOID_NODE_ONION_BINDING_V1`. The Tor binding
remains Tor-specific and is not reinterpreted as a clearweb or generic public
origin credential.

## Signed identity

The binding covers:

- VOID Mainnet-0 and Chain `2050`;
- one exact canonical HTTP or HTTPS origin;
- one 32-lowercase-hex VOID node ID;
- the node's Ed25519 public key and SPKI-DER SHA-256 fingerprint;
- issuance and expiry;
- the fixed binding publication aliases;
- exact `GET /health` and
  `GET /wc/public-earning-pilot-v1/status` scope;
- same-origin-only resolution and redirect refusal; and
- the complete read-only authority boundary.

Signature bytes are domain-separated as:

```text
VOID_NODE_PUBLIC_ORIGIN_BINDING_V1\0<void-canonical-json-v1>
```

## Independent trust requirement

A valid self-signature is not sufficient. Verification requires an
**independently supplied, reviewed Ed25519 fingerprint pin** in addition to the
signed public key.

The verifier also requires:

```text
signed origin == selected coordinator origin
signed node_id == live /health.nodeId
signed key fingerprint == independent trust pin
```

That makes the directory and health response selection/freshness evidence only.
Neither can nominate a new trusted key.

The follow-up #1612 integration must obtain the fingerprint pin from a fixed
reviewed/content-addressed current-main trust source. Caller-controlled trust
roots are not acceptable.

## Publication paths

The signed document may be served byte-identically at:

```text
/.well-known/void-node-public-origin-binding-v1.json
/public-node/identity/public-origin-binding-v1.json
```

This patch does **not** publish either route and does not sign a production
binding.

## Authority boundary

The binding grants read-only identity verification only. It grants no
transaction submission, payment authority, wallet/signer access, Work Credit
write, validator mutation, governance mutation, treasury/liquidity action, VOID
settlement, node runtime mutation, or operator control.

No production private key is accessed by this source lane. The focused proof
uses a temporary Ed25519 key generated in-process and performs no network
request.

## Proof

```bash
node --check tools/lib/void-node-public-origin-binding-v1.mjs
node --check scripts/prove_void_node_public_origin_binding_v1.mjs
python3 -m json.tool schemas/void-node-public-origin-binding-v1.schema.json >/dev/null
node scripts/prove_void_node_public_origin_binding_v1.mjs
```

Expected marker:

```text
VOID_NODE_PUBLIC_ORIGIN_BINDING_V1_PROOF_GREEN
```

The proof covers HTTPS, loopback HTTP and IPv6-loopback HTTP binding,
independent-fingerprint enforcement, origin and health-node equality, network
identity, route/method scope, expiry, authority tampering, signature-domain
separation, signature tampering, and rejection of transport-specific fields.

## Next gate

Wire this verifier into `tools/wc-public-opportunity-handoff-v1.mjs` with a
fixed reviewed/content-addressed node-ID → Ed25519-fingerprint trust source.
The handoff must fetch a binding from the selected origin, verify it, then
require its node ID to match the live `/health.nodeId` before emitting the
canonical no-node client commands.
