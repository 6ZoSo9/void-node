# Mainnet-0 Public Node Route Manifest Contract v1

Marker: `VOID_MAINNET0_PUBLIC_NODE_ROUTE_MANIFEST_CONTRACT_V1`

This proof verifies that `/public-node/route-manifest.json` is remotely reachable, machine-readable, public-read-only, and free of sensitive namespace advertisements.

Required public remote path:

- `/public-node/route-manifest.json`

The manifest must use marker:

- `VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1`

The manifest must include:

- `/public-node`
- `/public-node/route-index.json`
- `/public-node/route-manifest.json`
- `/public-node/self-check-snapshot.json`
- `/public-node/share-link.json`
- `/public-node/tester-bundle.json`
- `/public-node/outside-tester-smoke.json`
- `/proofs`

The manifest must not advertise sensitive namespaces:

- `/__void/diag/`
- `/__void/dev/`
- `/__void/operator/`
- `/__void/admin/`
- `/__debug/`
- `/dev/`
- `/__void/participant/wallet/export`

Nested proofs:

- public node route index contract v1
- public route contract v1
- public live boundary v1
- canonical tx hotpath v1

Proof command:

```bash
HTTP_PORT=4100 ops/mainnet0/public-node-route-manifest-contract-v1-proof.sh

