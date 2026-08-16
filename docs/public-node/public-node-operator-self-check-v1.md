# Public Node Operator Self-Check v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1`

## Purpose

This tool converts the existing Mainnet-0 operator readiness and public-node
discovery contracts into one executable, machine-readable check.

It is a **GET-only**, read-only diagnostic. It does not register a node, admit a
validator, connect a wallet, stake, claim work, issue tickets, write a ledger,
change peers, fulfill a VOID purchase, or mutate network state.

## Command

```bash
node tools/public-node-operator-self-check-v1.mjs \
  --base http://127.0.0.1:4100 \
  --expected-peer-count 1 \
  --output ./void-public-node-operator-self-check-v1.json
```

Nimo's local follower endpoint normally uses:

```bash
node tools/public-node-operator-self-check-v1.mjs \
  --base http://127.0.0.1:4101 \
  --expected-peer-count 2 \
  --output /tmp/void-nimo-public-node-operator-self-check-v1.json
```

The output file is written with mode `0600`. The receipt deliberately records a
host classification rather than the raw target hostname or address.

Public origins require HTTPS. Plain HTTP is admitted only for loopback,
private, or overlay targets so an operator cannot obtain a green receipt from
unauthenticated public cleartext evidence. Bracketed IPv6 loopback remains a
valid local target.

Each response body is bounded to 2 MiB before full buffering. Oversized declared
or streamed responses, malformed content lengths, request timeouts, and invalid
JSON fail closed into evidence HOLDs without changing network state.

## Checks

The tool verifies:

1. `/health`
2. `/__void/ready.json`
3. `/blocks/latest/number2.json`
4. `/p2p/peers`, with read-only fallback to `/peers`
5. `/.well-known/void-public-node.json`
6. `/public-node/route-index.json`
7. `/public-node/route-manifest.json`
8. `/public-node/self-check-snapshot.json`
9. alignment of the public discovery surfaces

The well-known discovery document may publish absolute HTTP(S) links. Their
paths must resolve to exact canonical public routes without query, fragment,
whitespace, protocol-relative, foreign-path, or dot-segment aliases. The
canonical well-known marker and its read-only/no-mutation policy remain
mandatory.

The route index must carry its exact purpose, object-row shape, required public
routes, and the complete reviewed read-only/no-authority policy. The route
manifest must carry its exact purpose/status/effective base, internally exact
route count, object-row metadata and required canonical markers, contain no
sensitive namespace, and carry the same complete safety policy. Additional
future public-read-only manifest rows remain admissible when those invariants
hold.

The self-check snapshot must carry its exact purpose/status/effective base,
canonical six checks and six links, exact reviewed `expected_routes` set and
`expected_route_count`, and the complete read-only/no-authority policy. If
`public_post_endpoint` is present it must be `false`.

Readiness, chain-head, and peer evidence is type-strict. Numeric strings,
booleans standing in for numeric fields, unsafe/fractional numbers, malformed
canonical peer envelopes, and contradictory `ok` status fail closed rather
than being coerced into green evidence.

## Exit codes

- `0`: all checks green
- `1`: invocation, validation, or unexpected execution error
- exit code `2`: a valid receipt was produced, but one or more checks are on hold

A hold is evidence, not a mutation. The receipt includes failed check IDs and
safe summarized observations without embedding response bodies, credentials,
peer identities, or the raw target address.

## Proof

```bash
npx tsx scripts/prove_public_node_operator_self_check_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1_PROOF_GREEN
```

The canonical proof delegates its runtime/adversarial fixture exercise to
`scripts/prove_public_node_operator_self_check_response_bound_v1.mjs`, keeping
the documented self-check proof aligned with the bounded-response and strict
contract proof used by CI.

## Authority boundary

The following remain false:

- registration performed
- validator activation performed
- staking performed
- wallet connection performed
- ledger write performed
- peer-state write performed
- validator-set write performed
- ticket claim performed
- Buy VOID fulfillment performed
- any other mutation performed
