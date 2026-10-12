# Mainnet-0 Public Node Route Index Contract v1

Marker: `VOID_MAINNET0_PUBLIC_NODE_ROUTE_INDEX_CONTRACT_V1`

This proof verifies that the public-node dashboard and machine-readable route index remain discoverable after the public route contract merge.

Required public remote paths:

- `/public-node`
- `/public-node/route-index.json`

The route index must use marker:

- `VOID_PUBLIC_NODE_ROUTE_INDEX_V1`

The route index must not advertise sensitive namespaces:

- `/__void/diag/`
- `/__void/dev/`
- `/__void/operator/`
- `/__void/admin/`
- `/__debug/`
- `/dev/`
- `/__void/participant/wallet/export`

Nested proofs:

- public route contract v1
- public live boundary v1
- canonical tx hotpath v1

Proof command:

```bash
HTTP_PORT=4100 ops/mainnet0/public-node-route-index-contract-v1-proof.sh

