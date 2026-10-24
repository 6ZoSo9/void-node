# VOID P2P dial route validation v1

Marker: `VOID_P2P_DIAL_ROUTE_VALIDATION_V1`

## Problem

The manual `GET /p2p/dial` and `POST /p2p/dial` handlers previously
accepted any `host:digits` string. They returned
`{"ok":true,"dialing":"..."}` immediately after calling
`node.connect(...)`, even when the node's canonical parser rejected the
address and opened no socket. For example, `seed.example:99999` therefore
looked accepted although no outgoing attempt began.

## Contract

The HTTP boundary now reuses the existing canonical
`parsePeerAddress(...)` implementation before invoking `node.connect(...)`.

- malformed, noncanonical, out-of-range, or non-string inputs return
  `{"ok":false,"error":"bad addr"}`;
- malformed inputs never reach `node.connect(...)`;
- accepted DNS and IPv6 inputs are passed to the node in canonical form;
- a missing `node.connect` capability and a synchronous thrown error remain
  explicit machine-readable failures;
- `{"ok":true,"dialing":"..."}` means the handler accepted a canonical
  address and invoked the node capability. It still does not prove that a
  connection completed.

The repair does not change `src/node_core.ts`, retry policy, peer identity,
bootstrap or seed configuration, chain identity, consensus, or canonical
history.

## Verification

`scripts/prove_void_p2p_dial_route_validation_v1.ts` registers the real
route against inert fake Express and node objects. It covers valid canonicalized
DNS and bracketed IPv6 addresses, out-of-range ports, malformed syntax,
resolver-ambiguous IPv4 spellings, non-string coercion attempts, query fallback,
missing capability, and synchronous error handling.

The existing `VOID P2P multipath address v1` workflow runs the proof with
Node.js 22, 24, and 26 after repository typecheck and build, alongside the
canonical peer-address and bounded discovery proof.

No proof opens a live socket, contacts a node, changes networking, deploys,
restarts a service, accesses credentials or wallets, signs or constructs a
transaction, mutates validator or Work Credit state, or moves funds.

Expected marker: `VOID_P2P_DIAL_ROUTE_VALIDATION_V1_PROOF_GREEN`
