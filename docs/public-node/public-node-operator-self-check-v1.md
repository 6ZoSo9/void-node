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

The well-known discovery document may publish either root-relative paths or
absolute HTTP(S) URLs. Absolute links are normalized to their URL path before
contract comparison, so a reverse proxy or public adapter may advertise a
canonical base URL that differs from the local probe address. The canonical
well-known marker and read-only policy remain mandatory.

The route manifest and self-check snapshot must carry their canonical markers,
contain the required public routes, and avoid sensitive namespace
advertisements. The snapshot must explicitly expose
`public_post_endpoint: false`.

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
